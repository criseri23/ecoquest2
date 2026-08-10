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
            client.Timeout = TimeSpan.FromSeconds(70);

            var layerTasks = Layers.Select(layer => LoadLayerAsync(client, layer, cancellationToken));
            var layers = await Task.WhenAll(layerTasks);
            var officialPoints = layers.SelectMany(layer => layer).ToArray();

            if (officialPoints.Length == 0)
            {
                return GreenPointCatalog.All;
            }

            cachedPoints = officialPoints;
            cacheExpiresAt = DateTimeOffset.UtcNow.AddHours(6);
            return cachedPoints;
        }
        catch
        {
            return GreenPointCatalog.All;
        }
        finally
        {
            refreshLock.Release();
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

        var lng = coordinates[0].GetDouble();
        var lat = coordinates[1].GetDouble();
        var id = ReadFeatureText(
            feature,
            "Id",
            feature.TryGetProperty("id", out var featureId) ? featureId.ToString() : Guid.NewGuid().ToString());
        var address = ReadFeatureText(feature, "Nombre", layer.DisplayName);
        var name = $"{layer.DisplayName} - {address}";

        if (layer.Category == "puntos_verdes")
        {
            return new SpecialGreenPoint(id, name, address, lat, lng, "Punto especial");
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

internal static class GreenPointCatalog
{
    public static IReadOnlyList<EcoMapPoint> All { get; } = new EcoMapPoint[]
    {
        new GreenPoint(
            "palermo-corrientes",
            "Punto verde - Palermo",
            "Av. Corrientes 2345",
            -34.5884,
            -58.4111,
            new[] { "Contenedor verde", "Vidrio", "Organico/compost" }),
        new GreenPoint(
            "plaza-italia",
            "Punto verde - Plaza Italia",
            "Av. Santa Fe 4100",
            -34.5807,
            -58.4214,
            new[] { "Contenedor verde", "Vidrio" }),
        new SpecialGreenPoint(
            "distrito-arcos",
            "Punto verde - Distrito Arcos",
            "Paraguay 4979",
            -34.5795,
            -58.4297,
            "Punto especial"),
        new SpecialGreenPoint(
            "botanico",
            "Punto verde - Botanico",
            "Av. Santa Fe 3951",
            -34.5812,
            -58.4176,
            "Pilas/baterias"),
        new GreenPoint(
            "palermo-hollywood",
            "Punto verde - Hollywood",
            "Costa Rica 5600",
            -34.5817,
            -58.4381,
            new[] { "Contenedor verde", "Vidrio" }),
        new StreetContainerPoint(
            "contenedor-verde-santa-fe-thames",
            "Contenedor verde - Palermo",
            "Av. Santa Fe y Thames",
            -34.5825,
            -58.4218,
            "verde"),
        new StreetContainerPoint(
            "contenedor-verde-cabrera-bulnes",
            "Contenedor verde - Palermo",
            "Cabrera y Bulnes",
            -34.5929,
            -58.4147,
            "verde"),
        new StreetContainerPoint(
            "contenedor-negro-honduras-fitz-roy",
            "Contenedor negro - Palermo",
            "Honduras y Fitz Roy",
            -34.5857,
            -58.4352,
            "negro"),
    };
}
