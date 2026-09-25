using System.Text.Json;
using EcoQuest.Datos.Entities;

namespace EcoQuest.Datos.Repositories;

public sealed class OfficialRecyclingPointRepository : IRecyclingPointRepository
{
    private static readonly RecyclingLayer[] Layers =
    {
        new(
            "contenedores_verdes",
            "Contenedor verde",
            "verde",
            new[] { "Contenedor verde", "Vidrio" }),
        new(
            "contenedores_negros",
            "Contenedor negro",
            "negro",
            new[] { "Basura comun" }),
        new(
            "puntos_verdes",
            "Punto verde",
            "verde",
            new[] { "Contenedor verde", "Vidrio", "Punto especial", "Pilas/baterias", "RAEE/electronicos" }),
    };

    private readonly IHttpClientFactory httpClientFactory;
    private readonly SemaphoreSlim refreshLock = new(1, 1);
    private IReadOnlyList<EcoMapPoint>? cachedPoints;
    private DateTimeOffset cacheExpiresAt;

    public OfficialRecyclingPointRepository(IHttpClientFactory httpClientFactory)
    {
        this.httpClientFactory = httpClientFactory;
    }

    public async Task<IReadOnlyList<EcoMapPoint>> GetAllAsync(CancellationToken cancellationToken)
    {
        if (cachedPoints is not null && DateTimeOffset.UtcNow < cacheExpiresAt)
        {
            return cachedPoints;
        }

        await refreshLock.WaitAsync(cancellationToken);

        try
        {
            if (cachedPoints is not null && DateTimeOffset.UtcNow < cacheExpiresAt)
            {
                return cachedPoints;
            }

            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);

            var layerTasks = Layers.Select(layer => LoadAvailableLayerAsync(client, layer, cancellationToken));
            var layers = await Task.WhenAll(layerTasks);
            var officialPoints = layers.SelectMany(layer => layer).ToArray();

            if (officialPoints.Length == 0)
            {
                return BundledRecyclingCatalog.All;
            }

            cachedPoints = officialPoints;
            cacheExpiresAt = DateTimeOffset.UtcNow.AddHours(6);
            return cachedPoints;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        finally
        {
            refreshLock.Release();
        }
    }

    private static async Task<IReadOnlyList<EcoMapPoint>> LoadAvailableLayerAsync(
        HttpClient client, RecyclingLayer layer, CancellationToken cancellationToken)
    {
        var saved = BundledRecyclingCatalog.All.Where(point => layer.Category switch
        {
            "contenedores_verdes" => point is StreetContainerPoint { ContainerColor: "verde" },
            "contenedores_negros" => point is StreetContainerPoint { ContainerColor: "negro" },
            _ => point is SpecialGreenPoint
        }).ToArray();

        // EPOK recorta esta capa a 1.000 registros. BA Data contiene el archivo completo.
        // La copia se actualiza con scripts/update-recycling-catalog.py.
        if (layer.Category == "contenedores_verdes") return saved;
        try
        {
            var live = await LoadLayerAsync(client, layer, cancellationToken);
            return live.Count > 0 ? live : saved;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception error) when (error is HttpRequestException or OperationCanceledException or JsonException)
        {
            // Si falla una fuente, conservamos las otras y la última copia de esta capa.
            return saved;
        }
    }

    private static async Task<IReadOnlyList<EcoMapPoint>> LoadLayerAsync(
        HttpClient client,
        RecyclingLayer layer,
        CancellationToken cancellationToken)
    {
        var url = $"https://epok.buenosaires.gob.ar/getGeoLayer/?categoria={layer.Category}&formato=geojson&srid=4326";
        using var response = await client.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (!document.RootElement.TryGetProperty("features", out var features) ||
            features.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<EcoMapPoint>();
        }

        var points = new List<EcoMapPoint>();

        foreach (var feature in features.EnumerateArray())
        {
            var point = CreatePoint(feature, layer);

            if (point is not null)
            {
                points.Add(point);
            }
        }

        return points;
    }

    private static EcoMapPoint? CreatePoint(JsonElement feature, RecyclingLayer layer)
    {
        if (!feature.TryGetProperty("geometry", out var geometry) ||
            !geometry.TryGetProperty("coordinates", out var coordinates) ||
            coordinates.ValueKind != JsonValueKind.Array ||
            coordinates.GetArrayLength() < 2)
        {
            return null;
        }

        if (coordinates[0].ValueKind != JsonValueKind.Number || coordinates[1].ValueKind != JsonValueKind.Number ||
            !coordinates[0].TryGetDouble(out var lng) || !coordinates[1].TryGetDouble(out var lat) ||
            !double.IsFinite(lat) || !double.IsFinite(lng) || lat is < -90 or > 90 || lng is < -180 or > 180)
            return null;
        var id = ReadFeatureText(
            feature,
            "Id",
            feature.TryGetProperty("id", out var featureId) ? featureId.ToString() : Guid.NewGuid().ToString());
        var address = ReadFeatureText(feature, "Nombre", ReadFeatureText(feature, "DireccionNormalizada", layer.DisplayName));
        var name = $"{layer.DisplayName} - {address}";

        if (layer.Category == "puntos_verdes")
        {
            return new SpecialGreenPoint(id, name, address, lat, lng, "Punto especial", layer.AcceptedContainers);
        }

        return new StreetContainerPoint(
            id,
            name,
            address,
            lat,
            lng,
            layer.ContainerColor,
            layer.AcceptedContainers);
    }

    private static string ReadFeatureText(JsonElement feature, string propertyName, string fallback)
    {
        if (!feature.TryGetProperty("properties", out var properties) ||
            properties.ValueKind != JsonValueKind.Object ||
            !properties.TryGetProperty(propertyName, out var property) ||
            property.ValueKind != JsonValueKind.String)
        {
            return fallback;
        }

        var value = property.GetString();
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }

    private sealed record RecyclingLayer(
        string Category,
        string DisplayName,
        string ContainerColor,
        string[] AcceptedContainers);
}
