using EcoQuest.Datos.Context;
using EcoQuest.Datos.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcoQuest.Datos.Repositories;

public sealed class UsuarioRepository : IUsuarioRepository
{
    private readonly EcoQuestDbContext context;

    public UsuarioRepository(EcoQuestDbContext context)
    {
        this.context = context;
    }

    public async Task<Usuario?> ObtenerPorEmailAsync(
        string email,
        CancellationToken cancellationToken)
    {
        return await context.Usuarios
            .FirstOrDefaultAsync(
                usuario => usuario.Email == email,
                cancellationToken);
    }

    public async Task AgregarAsync(
        Usuario usuario,
        CancellationToken cancellationToken)
    {
        context.Usuarios.Add(usuario);
        await context.SaveChangesAsync(cancellationToken);
    }
}