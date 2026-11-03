using EcoQuest.Logica.Services;
using EcoQuestAPI.Services;
using EcoQuest.Logica.DTOs;
using EcoQuest.Logica.Exceptions;
using EcoQuest.Logica.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EcoQuestAPI.Controllers;

[ApiController]
[Route("api/ia")]
public sealed class WasteAnalysisController : ControllerBase
{
    private readonly RewardRules rules;
    private readonly RankingStore ranking;
    private readonly IWasteAnalysisService wasteAnalysisService;

    public WasteAnalysisController(IWasteAnalysisService wasteAnalysisService, RankingStore ranking, RewardRules rules)
    {
        this.ranking = ranking;
        this.rules = rules;
        this.wasteAnalysisService = wasteAnalysisService;
    }

    [HttpPost("analizar")]
    public async Task<ActionResult<WasteAnalysisResult>> AnalyzeAsync(
        [FromBody] WasteAnalysisRequest request,
        CancellationToken cancellationToken)
    {
        if (Request.Headers.Authorization.Count > 0 && ranking.Authenticate(Request.Headers.Authorization.ToString()) is null) return Unauthorized();
        try
        {
            var result = await wasteAnalysisService.AnalyzeAsync(request, cancellationToken);
            result = result with { Points = result.IsWaste && result.Container != "No aplica" ? "+" + rules.RecyclingXp : "+0" };
            var user = ranking.Authenticate(Request.Headers.Authorization.ToString());
            if(user is not null && result.IsWaste && result.Container != "No aplica") {
                result=result with
                {
                    ScanId = ranking.SaveScan(user, result.Container, result.Title, result.Badge,
                        result.Text, result.CanUseGreenContainer, result.WasteType, result.Confidence)
                };
            }
            return Ok(result);
        }
        catch (InvalidWasteImageException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
        catch (MissingAiConfigurationException exception)
        {
            return Problem(
                title: "Falta configurar la IA",
                detail: exception.Message,
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
        catch (WasteAnalysisProviderException exception)
        {
            return Problem(
                title: "Gemini no pudo analizar la imagen",
                detail: exception.Message,
                statusCode: StatusCodes.Status502BadGateway);
        }
    }
}
