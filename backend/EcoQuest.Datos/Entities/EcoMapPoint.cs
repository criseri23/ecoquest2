namespace EcoQuest.Datos.Entities;

public abstract class EcoMapPoint
{
    protected EcoMapPoint(string id, string name, string address, double lat, double lng)
    {
        Id = id;
        Name = name;
        Address = address;
        Lat = lat;
        Lng = lng;
    }

    public string Id { get; }

    public string Name { get; }

    public string Address { get; }

    public double Lat { get; }

    public double Lng { get; }

    public abstract IReadOnlyCollection<string> AcceptedContainers { get; }

    public virtual bool Accepts(string container) =>
        AcceptedContainers.Any(accepted =>
            accepted.Equals(container, StringComparison.OrdinalIgnoreCase));
}

public class GreenPoint : EcoMapPoint
{
    private readonly string[] acceptedContainers;

    public GreenPoint(string id, string name, string address, double lat, double lng)
        : this(id, name, address, lat, lng, new[] { "Contenedor verde" })
    {
    }

    public GreenPoint(
        string id,
        string name,
        string address,
        double lat,
        double lng,
        IEnumerable<string> acceptedContainers)
        : base(id, name, address, lat, lng)
    {
        this.acceptedContainers = acceptedContainers.ToArray();
    }

    public override IReadOnlyCollection<string> AcceptedContainers => acceptedContainers;
}

public sealed class SpecialGreenPoint : GreenPoint
{
    public SpecialGreenPoint(
        string id,
        string name,
        string address,
        double lat,
        double lng,
        string specialty)
        : base(id, name, address, lat, lng, new[] { "Contenedor verde", specialty })
    {
        Specialty = specialty;
    }

    public string Specialty { get; }

    public override bool Accepts(string container) =>
        base.Accepts(container) ||
        container.Contains(Specialty, StringComparison.OrdinalIgnoreCase);
}

public sealed class StreetContainerPoint : EcoMapPoint
{
    private readonly string[] acceptedContainers;

    public StreetContainerPoint(string id, string name, string address, double lat, double lng, string containerColor)
        : this(id, name, address, lat, lng, containerColor, DefaultAcceptedContainers(containerColor))
    {
    }

    public StreetContainerPoint(
        string id,
        string name,
        string address,
        double lat,
        double lng,
        string containerColor,
        IEnumerable<string> acceptedContainers)
        : base(id, name, address, lat, lng)
    {
        ContainerColor = containerColor;
        this.acceptedContainers = acceptedContainers.ToArray();
    }

    public string ContainerColor { get; }

    public override IReadOnlyCollection<string> AcceptedContainers => acceptedContainers;

    public override bool Accepts(string container)
    {
        if (base.Accepts(container))
        {
            return true;
        }

        if (ContainerColor.Equals("negro", StringComparison.OrdinalIgnoreCase))
        {
            return container.Contains("basura", StringComparison.OrdinalIgnoreCase) ||
                container.Contains("comun", StringComparison.OrdinalIgnoreCase);
        }

        return container.Contains("verde", StringComparison.OrdinalIgnoreCase) ||
            container.Contains("vidrio", StringComparison.OrdinalIgnoreCase);
    }

    private static string[] DefaultAcceptedContainers(string containerColor) =>
        containerColor.Equals("negro", StringComparison.OrdinalIgnoreCase)
            ? new[] { "Basura comun" }
            : new[] { "Contenedor verde", "Vidrio" };
}
