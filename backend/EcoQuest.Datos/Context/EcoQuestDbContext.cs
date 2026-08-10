using EcoQuest.Datos.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcoQuest.Datos.Context;

public class EcoQuestDbContext : DbContext
{
    public EcoQuestDbContext(DbContextOptions<EcoQuestDbContext> options)
        : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; }

    public DbSet<Residuo> Residuos { get; set; }

    public DbSet<Mision> Misiones { get; set; }

    public DbSet<Insignia> Insignias { get; set; }

    public DbSet<Recompensa> Recompensas { get; set; }
}
