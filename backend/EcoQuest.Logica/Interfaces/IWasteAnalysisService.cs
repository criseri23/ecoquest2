using EcoQuest.Logica.DTOs;

namespace EcoQuest.Logica.Interfaces;

public interface IWasteAnalysisService
{
    Task<WasteAnalysisResult> AnalyzeAsync(
        WasteAnalysisRequest request,
        CancellationToken cancellationToken);
}
