using EcoQuest.Datos.Entities;

namespace EcoQuest.Datos.Repositories;

public interface IUsuarioRepository
{
    Task<Usuario?> ObtenerPorEmailAsync(
        string email,
        CancellationToken cancellationToken);

    Task AgregarAsync(
        Usuario usuario,
        CancellationToken cancellationToken);
}