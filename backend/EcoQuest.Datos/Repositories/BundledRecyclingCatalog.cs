using System.Text.Json;
using EcoQuest.Datos.Entities;

namespace EcoQuest.Datos.Repositories;

internal static class BundledRecyclingCatalog
{
    public static IReadOnlyList<EcoMapPoint> All { get; } = Load();

    private static IReadOnlyList<EcoMapPoint> Load()
    {
        using var stream = typeof(BundledRecyclingCatalog).Assembly
            .GetManifestResourceStream("EcoQuest.RecyclingCatalog.json")
            ?? throw new InvalidOperationException("Falta el catálogo oficial incluido en EcoQuest.");
        using var document = JsonDocument.Parse(stream);
        return document.RootElement.GetProperty("points").EnumerateArray().Select(point =>
        {
            string Text(string name) => point.GetProperty(name).GetString()!;
            var containers = point.GetProperty("acceptedContainers").EnumerateArray().Select(x => x.GetString()!).ToArray();
            var lat = point.GetProperty("lat").GetDouble();
            var lng = point.GetProperty("lng").GetDouble();
            return Text("type") == "SpecialGreenPoint"
                ? (EcoMapPoint)new SpecialGreenPoint(Text("id"), Text("name"), Text("address"), lat, lng, Text("specialty"), containers)
                : new StreetContainerPoint(Text("id"), Text("name"), Text("address"), lat, lng, Text("containerColor"), containers);
        }).ToArray();
    }
}
