using EcoQuest.Datos.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcoQuest.Datos.Context;

public class EcoQuestDbContext : DbContext
{
    public EcoQuestDbContext(DbContextOptions<EcoQuestDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>().Property(usuario => usuario.Email).HasMaxLength(254);
        modelBuilder.Entity<Usuario>().HasIndex(usuario => usuario.Email).IsUnique();
    }

    public DbSet<Usuario> Usuarios { get; set; }

    public DbSet<Residuo> Residuos { get; set; }

    public DbSet<Mision> Misiones { get; set; }

    public DbSet<Insignia> Insignias { get; set; }

    public DbSet<Recompensa> Recompensas { get; set; }
}
