using EcoQuest.Datos.Context;
using EcoQuest.Datos.Repositories;
using Microsoft.EntityFrameworkCore;
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
            ?? "Data Source=ecoquest.db";

        services.AddDbContext<EcoQuestDbContext>(options =>
        {
            options.UseSqlite(connectionString);
        });

        services.AddSingleton<IRecyclingPointRepository, OfficialRecyclingPointRepository>();

        return services;
    }
}
