using EcoQuest.Datos.Entities;
using EcoQuest.Datos.Repositories;
using EcoQuest.Logica.DTOs;
using EcoQuest.Logica.Interfaces;

namespace EcoQuest.Logica.Services;

public sealed class RecyclingPointService : IRecyclingPointService
{
    private readonly IRecyclingPointRepository recyclingPointRepository;

    public RecyclingPointService(IRecyclingPointRepository recyclingPointRepository)
    {
        this.recyclingPointRepository = recyclingPointRepository;
    }

    public async Task<IReadOnlyCollection<RecyclingPointResponse>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var points = await recyclingPointRepository.GetAllAsync(cancellationToken);
        return points.Select(ToResponse).ToArray();
    }

    private static RecyclingPointResponse ToResponse(EcoMapPoint point) =>
        point switch
        {
            SpecialGreenPoint specialPoint => new RecyclingPointResponse(
                specialPoint.Id,
                specialPoint.Name,
                specialPoint.Address,
                specialPoint.Lat,
                specialPoint.Lng,
                specialPoint.AcceptedContainers,
                nameof(SpecialGreenPoint),
                specialPoint.Specialty,
                null),
            StreetContainerPoint streetContainer => new RecyclingPointResponse(
                streetContainer.Id,
                streetContainer.Name,
                streetContainer.Address,
                streetContainer.Lat,
                streetContainer.Lng,
                streetContainer.AcceptedContainers,
                nameof(StreetContainerPoint),
                null,
                streetContainer.ContainerColor),
            _ => new RecyclingPointResponse(
                point.Id,
                point.Name,
                point.Address,
                point.Lat,
                point.Lng,
                point.AcceptedContainers,
                point.GetType().Name,
                null,
                null),
        };
}
