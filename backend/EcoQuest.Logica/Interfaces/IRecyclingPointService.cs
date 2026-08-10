using EcoQuest.Logica.DTOs;

namespace EcoQuest.Logica.Interfaces;

public interface IRecyclingPointService
{
    Task<IReadOnlyCollection<RecyclingPointResponse>> GetAllAsync(CancellationToken cancellationToken);
}
