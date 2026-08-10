using System.Net.Http.Json;
using System.Text.Json;
using EcoQuest.Logica.DTOs;
using EcoQuest.Logica.Exceptions;
using EcoQuest.Logica.Interfaces;
using Microsoft.Extensions.Configuration;

namespace EcoQuest.Logica.Services;

public sealed class WasteAnalysisService : IWasteAnalysisService
{
    private readonly IHttpClientFactory httpClientFactory;
    private readonly IConfiguration configuration;

    public WasteAnalysisService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        this.httpClientFactory = httpClientFactory;
        this.configuration = configuration;
    }

    public async Task<WasteAnalysisResult> AnalyzeAsync(
        WasteAnalysisRequest request,
        CancellationToken cancellationToken)
    {
        if (!ImageDataUrlParser.TryParse(request.ImageDataUrl, out var imageInput))
        {
            throw new InvalidWasteImageException(
                "Imagen invalida. Envia una foto en base64 como data:image/jpeg;base64,...");
        }

        var apiKey = GetSecret("Gemini:ApiKey", "GEMINI_API_KEY", "GOOGLE_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new MissingAiConfigurationException(
                "Configura la variable de entorno GEMINI_API_KEY antes de usar el analisis real.");
        }

        var configuredModel = GetSecret("Gemini:Model", "GEMINI_MODEL");
        var model = string.IsNullOrWhiteSpace(configuredModel)
            ? "gemini-flash-latest"
            : configuredModel.Trim();

        var client = httpClientFactory.CreateClient();
        var payload = CreateGeminiPayload(imageInput);
        var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(apiKey)}";
        using var geminiRequest = new HttpRequestMessage(HttpMethod.Post, requestUrl);
        geminiRequest.Content = JsonContent.Create(payload);

        using var response = await client.SendAsync(geminiRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            return WasteAnalysisParser.Parse(responseBody);
        }

        throw new WasteAnalysisProviderException(
            $"Modelo {model}: {GeminiErrorParser.Parse(responseBody)}");
    }

    private object CreateGeminiPayload(GeminiImageInput imageInput) =>
        new
        {
            contents = new object[]
            {
                new
                {
                    role = "user",
                    parts = new object[]
                    {
                        new
                        {
                            text = """
                            Eres la IA de EcoQuest. Analiza la foto y determina si el objeto visible principal es un residuo real.

                            Devuelve un solo JSON valido y compacto, sin markdown ni explicaciones fuera del JSON, con estas claves:
                            {
                              "title": "nombre concreto del objeto",
                              "badge": "Reciclaje | No verde | Especial | No residuo | Incierto",
                              "points": "+5 | +3 | +1 | +0",
                              "container": "Contenedor verde | Vidrio | Organico/compost | Basura comun | Punto especial | RAEE/electronicos | Pilas/baterias | No aplica",
                              "text": "indicacion breve para el usuario",
                              "isWaste": true,
                              "canUseGreenContainer": true,
                              "wasteType": "tipo de residuo",
                              "confidence": "alta | media | baja"
                            }

                            Reglas:
                            - Responde siempre el JSON completo. No cortes el texto.
                            - Si aparece una persona, mano o cara pero no hay un residuo claro, usa isWaste=false, badge="No residuo", points="+0", container="No aplica".
                            - Si no parece residuo, usa isWaste=false, badge="No residuo", points="+0", container="No aplica".
                            - Si es plastico, metal, papel, carton, lata, botella o envase reciclable limpio y seco, puede ir al contenedor verde.
                            - Si es una bolsa, botella, frasco, lata o envase con comida, frutas, liquidos u otros restos visibles adentro, no suma puntos de reciclaje: indica que primero debe vaciarse, limpiarse y secarse. Si el contenido es organico, recomienda compost/organico para el contenido y reciclables para el envase limpio.
                            - Si esta sucio con comida o liquidos, no va al verde hasta limpiarlo.
                            - Vidrio: identifica que es vidrio y recomienda contenedor/punto de vidrio o reciclables segun la ciudad; si esta roto, envolverlo y no mezclarlo suelto.
                            - Pilas, baterias, celulares, cables, electronicos, medicamentos, aerosoles peligrosos o quimicos no van al verde; van a punto especial/RAEE/pilas.
                            - Organicos van a compost u organico si existe.
                            - Si no puedes verlo bien, usa badge="Incierto", confidence="baja" y pide otra foto con mejor luz.
                            - Escribe en espanol simple y corto para una app movil.
                            """,
                        },
                        new
                        {
                            inline_data = new
                            {
                                mime_type = imageInput.MimeType,
                                data = imageInput.Base64Data,
                            },
                        },
                    },
                },
            },
            generationConfig = new
            {
                temperature = 0.1,
                maxOutputTokens = 1024,
                responseMimeType = "application/json",
            },
        };

    private string? GetSecret(string configurationKey, params string[] environmentKeys)
    {
        var configuredValue = configuration[configurationKey];

        if (!string.IsNullOrWhiteSpace(configuredValue))
        {
            return configuredValue.Trim();
        }

        foreach (var key in environmentKeys)
        {
            var value = Environment.GetEnvironmentVariable(key) ??
                Environment.GetEnvironmentVariable(key, EnvironmentVariableTarget.User) ??
                Environment.GetEnvironmentVariable(key, EnvironmentVariableTarget.Machine);

            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private sealed record GeminiImageInput(string MimeType, string Base64Data);

    private static class WasteAnalysisParser
    {
        public static WasteAnalysisResult Parse(string responseBody)
        {
            using var responseJson = JsonDocument.Parse(responseBody);
            var outputText = ExtractOutputText(responseJson.RootElement);

            if (string.IsNullOrWhiteSpace(outputText))
            {
                return Fallback("No pude leer la respuesta de la IA.");
            }

            var jsonText = ExtractJsonObject(outputText);

            if (TryParseResult(jsonText, out var analysis))
            {
                return analysis;
            }

            var recoveredResult = RecoverPartialResult(outputText);

            if (recoveredResult is not null)
            {
                return recoveredResult;
            }

            return Fallback(outputText);
        }

        private static bool TryParseResult(string jsonText, out WasteAnalysisResult result)
        {
            result = Fallback("No pude interpretar el resultado.");

            try
            {
                using var json = JsonDocument.Parse(jsonText);
                var root = json.RootElement;

                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    root = root[0];
                }

                if (root.ValueKind != JsonValueKind.Object)
                {
                    return false;
                }

                var badge = ReadString(root, "badge", "Incierto");
                var container = ReadString(root, "container", InferContainer(badge));
                var canUseGreenContainer = ReadBool(root, "canUseGreenContainer", IsGreenResult(badge, container));
                var isWaste = ReadBool(root, "isWaste", !badge.Equals("No residuo", StringComparison.OrdinalIgnoreCase));

                result = new WasteAnalysisResult(
                    ReadString(root, "title", "Residuo no identificado"),
                    badge,
                    ReadPoints(root, badge, canUseGreenContainer),
                    container,
                    ReadString(root, "text", "Analisis completado. Segui la indicacion del contenedor recomendado."),
                    isWaste,
                    canUseGreenContainer,
                    ReadString(root, "wasteType", badge),
                    ReadString(root, "confidence", "media"));

                return true;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        private static WasteAnalysisResult? RecoverPartialResult(string text)
        {
            var title = FindJsonStringValue(text, "title");
            var badge = FindJsonStringValue(text, "badge");

            if (string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(badge))
            {
                return null;
            }

            badge = string.IsNullOrWhiteSpace(badge) ? "Incierto" : badge;
            var container = FindJsonStringValue(text, "container") ?? InferContainer(badge);
            var canUseGreenContainer = IsGreenResult(badge, container);
            var points = FindJsonStringValue(text, "points") ?? InferPoints(badge, canUseGreenContainer);
            var textValue = FindJsonStringValue(text, "text") ??
                "La IA alcanzo a identificar el objeto, pero la respuesta llego incompleta. Proba escanear otra vez con buena luz.";

            return new WasteAnalysisResult(
                string.IsNullOrWhiteSpace(title) ? "Residuo no identificado" : title,
                badge,
                NormalizePoints(points, badge, canUseGreenContainer),
                container,
                textValue,
                !badge.Equals("No residuo", StringComparison.OrdinalIgnoreCase),
                canUseGreenContainer,
                FindJsonStringValue(text, "wasteType") ?? badge,
                FindJsonStringValue(text, "confidence") ?? "media");
        }

        private static string ReadString(JsonElement root, string propertyName, string fallback)
        {
            if (!root.TryGetProperty(propertyName, out var property))
            {
                return fallback;
            }

            return property.ValueKind switch
            {
                JsonValueKind.String => string.IsNullOrWhiteSpace(property.GetString()) ? fallback : property.GetString()!,
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Number => property.ToString(),
                _ => fallback,
            };
        }

        private static bool ReadBool(JsonElement root, string propertyName, bool fallback)
        {
            if (!root.TryGetProperty(propertyName, out var property))
            {
                return fallback;
            }

            if (property.ValueKind == JsonValueKind.True)
            {
                return true;
            }

            if (property.ValueKind == JsonValueKind.False)
            {
                return false;
            }

            if (property.ValueKind == JsonValueKind.String)
            {
                var value = property.GetString();

                if (bool.TryParse(value, out var boolValue))
                {
                    return boolValue;
                }

                return value?.Equals("si", StringComparison.OrdinalIgnoreCase) == true;
            }

            return fallback;
        }

        private static string ReadPoints(JsonElement root, string badge, bool canUseGreenContainer) =>
            NormalizePoints(ReadString(root, "points", string.Empty), badge, canUseGreenContainer);

        private static string NormalizePoints(string points, string badge, bool canUseGreenContainer)
        {
            var cleanPoints = points.Trim();

            if (cleanPoints is "+5" or "+3" or "+1" or "+0")
            {
                return cleanPoints;
            }

            return InferPoints(badge, canUseGreenContainer);
        }

        private static string InferPoints(string badge, bool canUseGreenContainer)
        {
            if (canUseGreenContainer || badge.Equals("Reciclaje", StringComparison.OrdinalIgnoreCase))
            {
                return "+5";
            }

            if (badge.Equals("Especial", StringComparison.OrdinalIgnoreCase))
            {
                return "+3";
            }

            return badge.Equals("No residuo", StringComparison.OrdinalIgnoreCase) ? "+0" : "+1";
        }

        private static string InferContainer(string badge) =>
            badge.Equals("Reciclaje", StringComparison.OrdinalIgnoreCase)
                ? "Contenedor verde"
                : "No aplica";

        private static bool IsGreenResult(string badge, string container) =>
            badge.Equals("Reciclaje", StringComparison.OrdinalIgnoreCase) ||
            container.Contains("verde", StringComparison.OrdinalIgnoreCase);

        private static string? FindJsonStringValue(string text, string propertyName)
        {
            var marker = $"\"{propertyName}\"";
            var markerIndex = text.IndexOf(marker, StringComparison.OrdinalIgnoreCase);

            if (markerIndex < 0)
            {
                return null;
            }

            var colonIndex = text.IndexOf(':', markerIndex + marker.Length);

            if (colonIndex < 0)
            {
                return null;
            }

            var quoteIndex = text.IndexOf('"', colonIndex + 1);

            if (quoteIndex < 0)
            {
                return null;
            }

            for (var index = quoteIndex + 1; index < text.Length; index++)
            {
                if (text[index] == '"' && text[index - 1] != '\\')
                {
                    return text[(quoteIndex + 1)..index];
                }
            }

            return null;
        }

        private static string? ExtractOutputText(JsonElement root)
        {
            if (root.TryGetProperty("output_text", out var outputText) &&
                outputText.ValueKind == JsonValueKind.String)
            {
                return outputText.GetString();
            }

            var interactionText = ExtractInteractionOutputText(root);

            if (!string.IsNullOrWhiteSpace(interactionText))
            {
                return interactionText;
            }

            var generateContentText = ExtractGenerateContentText(root);

            if (!string.IsNullOrWhiteSpace(generateContentText))
            {
                return generateContentText;
            }

            return ExtractOpenAiStyleOutputText(root);
        }

        private static string? ExtractInteractionOutputText(JsonElement root)
        {
            if (!root.TryGetProperty("steps", out var steps) ||
                steps.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            foreach (var step in steps.EnumerateArray())
            {
                if (!step.TryGetProperty("content", out var content) ||
                    content.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var contentItem in content.EnumerateArray())
                {
                    if (contentItem.TryGetProperty("text", out var text) &&
                        text.ValueKind == JsonValueKind.String)
                    {
                        return text.GetString();
                    }
                }
            }

            return null;
        }

        private static string? ExtractGenerateContentText(JsonElement root)
        {
            if (!root.TryGetProperty("candidates", out var candidates) ||
                candidates.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            foreach (var candidate in candidates.EnumerateArray())
            {
                if (!candidate.TryGetProperty("content", out var content) ||
                    !content.TryGetProperty("parts", out var parts) ||
                    parts.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var text) &&
                        text.ValueKind == JsonValueKind.String)
                    {
                        return text.GetString();
                    }
                }
            }

            return null;
        }

        private static string? ExtractOpenAiStyleOutputText(JsonElement root)
        {
            if (!root.TryGetProperty("output", out var output) ||
                output.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            foreach (var item in output.EnumerateArray())
            {
                if (!item.TryGetProperty("content", out var content) ||
                    content.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var contentItem in content.EnumerateArray())
                {
                    if (contentItem.TryGetProperty("text", out var text) &&
                        text.ValueKind == JsonValueKind.String)
                    {
                        return text.GetString();
                    }
                }
            }

            return null;
        }

        private static string ExtractJsonObject(string text)
        {
            var start = text.IndexOf('{');
            var end = text.LastIndexOf('}');

            if (start >= 0 && end > start)
            {
                return text[start..(end + 1)];
            }

            return text;
        }

        private static WasteAnalysisResult Fallback(string text) =>
            new(
                "Residuo no identificado",
                "Incierto",
                "+0",
                "No aplica",
                text,
                false,
                false,
                "Incierto",
                "baja");
    }

    private static class ImageDataUrlParser
    {
        public static bool TryParse(string? imageDataUrl, out GeminiImageInput imageInput)
        {
            imageInput = new GeminiImageInput(string.Empty, string.Empty);

            if (string.IsNullOrWhiteSpace(imageDataUrl) ||
                !imageDataUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var commaIndex = imageDataUrl.IndexOf(',');

            if (commaIndex <= 5 || commaIndex >= imageDataUrl.Length - 1)
            {
                return false;
            }

            var metadata = imageDataUrl[5..commaIndex];
            var base64Data = imageDataUrl[(commaIndex + 1)..];
            var metadataParts = metadata.Split(
                ';',
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var mimeType = metadataParts.FirstOrDefault();
            var isBase64 = metadataParts.Any(part => part.Equals("base64", StringComparison.OrdinalIgnoreCase));

            if (string.IsNullOrWhiteSpace(mimeType) ||
                !mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ||
                !isBase64 ||
                string.IsNullOrWhiteSpace(base64Data))
            {
                return false;
            }

            try
            {
                Convert.FromBase64String(base64Data);
            }
            catch (FormatException)
            {
                return false;
            }

            imageInput = new GeminiImageInput(mimeType, base64Data);
            return true;
        }
    }

    private static class GeminiErrorParser
    {
        public static string Parse(string responseBody)
        {
            try
            {
                using var json = JsonDocument.Parse(responseBody);

                if (json.RootElement.TryGetProperty("error", out var error) &&
                    error.TryGetProperty("message", out var message) &&
                    message.ValueKind == JsonValueKind.String)
                {
                    return message.GetString() ?? "Error desconocido de Gemini.";
                }
            }
            catch (JsonException)
            {
                return responseBody;
            }

            return responseBody;
        }
    }
}
