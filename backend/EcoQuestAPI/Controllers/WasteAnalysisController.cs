using EcoQuest.Logica.DTOs;
using EcoQuest.Logica.Exceptions;
using EcoQuest.Logica.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EcoQuestAPI.Controllers;

[ApiController]
[Route("api/ia")]
public sealed class WasteAnalysisController : ControllerBase
{
    private readonly IWasteAnalysisService wasteAnalysisService;

    public WasteAnalysisController(IWasteAnalysisService wasteAnalysisService)
    {
        this.wasteAnalysisService = wasteAnalysisService;
    }

    [HttpPost("analizar")]
    public async Task<ActionResult<WasteAnalysisResult>> AnalyzeAsync(
        [FromBody] WasteAnalysisRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await wasteAnalysisService.AnalyzeAsync(request, cancellationToken);
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
