using EcoQuest.Datos.Entities;
namespace EcoQuest.Logica.Interfaces;

public interface IAuthService
{
    Task<Usuario?> RegistrarAsync(
        string nombre,
        string email,
        string contraseña,
        CancellationToken cancellationToken);

    Task<Usuario?> LoginAsync(
        string email,
        string contraseña,
        CancellationToken cancellationToken);
}