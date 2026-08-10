using EcoQuest.Datos.Entities;

namespace EcoQuest.Datos.Repositories;

public interface IRecyclingPointRepository
{
    Task<IReadOnlyList<EcoMapPoint>> GetAllAsync(CancellationToken cancellationToken);
}
