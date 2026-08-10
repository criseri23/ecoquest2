namespace EcoQuest.Logica.DTOs;

public sealed record RecyclingPointResponse(
    string Id,
    string Name,
    string Address,
    double Lat,
    double Lng,
    IReadOnlyCollection<string> AcceptedContainers,
    string Type,
    string? Specialty,
    string? ContainerColor);
