using EcoQuest.Logica.DTOs;
using EcoQuest.Logica.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EcoQuestAPI.Controllers;

[ApiController]
public sealed class RecyclingPointsController : ControllerBase
{
    private readonly IRecyclingPointService recyclingPointService;

    public RecyclingPointsController(IRecyclingPointService recyclingPointService)
    {
        this.recyclingPointService = recyclingPointService;
    }

    [HttpGet("/api/contenedores")]
    [HttpGet("/api/puntos-verdes")]
    public async Task<ActionResult<IReadOnlyCollection<RecyclingPointResponse>>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var points = await recyclingPointService.GetAllAsync(cancellationToken);
        return Ok(points);
    }
}
