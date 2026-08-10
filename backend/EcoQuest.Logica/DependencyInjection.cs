using EcoQuest.Datos;
using EcoQuest.Logica.Interfaces;
using EcoQuest.Logica.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EcoQuest.Logica;

public static class DependencyInjection
{
    public static IServiceCollection AddEcoQuestApplication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddHttpClient();
        services.AddEcoQuestData(configuration);
        services.AddScoped<IRecyclingPointService, RecyclingPointService>();
        services.AddScoped<IWasteAnalysisService, WasteAnalysisService>();

        return services;
    }
}
