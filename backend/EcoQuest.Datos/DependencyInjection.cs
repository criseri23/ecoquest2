using EcoQuest.Datos.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EcoQuest.Datos;

public static class DependencyInjection
{
    public static IServiceCollection AddEcoQuestData(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("EcoQuestDb")
            ?? throw new InvalidOperationException("Falta configurar la conexión a MySQL.");

        services.AddScoped<IUsuarioRepository>(_ => new UsuarioRepository(connectionString));
        services.AddSingleton<IRecyclingPointRepository, OfficialRecyclingPointRepository>();

        return services;
    }
}
