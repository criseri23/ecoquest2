using EcoQuest.Logica.DTOs;
using EcoQuest.Logica.Interfaces;
using EcoQuestAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EcoQuestAPI.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("accounts")]
public sealed class AuthController(IAuthService authService, RankingStore ranking) : ControllerBase
{
    [HttpPost("registro")]
    public async Task<IActionResult> Registrar(RegistroRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var usuario = await authService.RegistrarAsync(request.Nombre, request.Email, request.Contraseña, cancellationToken);
            if (usuario is null)
                return BadRequest(new { error = "Revisá los datos: nombre de 3 a 24 caracteres, email disponible y contraseña de 8 a 128 caracteres." });

            var id = ranking.LinkAccount(usuario.Email, usuario.Nombre, usuario.Experiencia);
            return Ok(new { mensaje = "Cuenta creada correctamente.", token = ranking.Session(id), profile = ranking.Profile(id) });
        }
        catch (DbUpdateException)
        {
            return Conflict(new { error = "No se pudo crear la cuenta. Revisá si ese email ya está registrado." });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var usuario = await authService.LoginAsync(request.Email, request.Contraseña, cancellationToken);
        if (usuario is null)
            return Unauthorized(new { error = "Email o contraseña incorrectos." });

        var id = ranking.LinkAccount(usuario.Email, usuario.Nombre, usuario.Experiencia);
        return Ok(new { mensaje = "Inicio de sesión correcto.", token = ranking.Session(id), profile = ranking.Profile(id) });
    }
}
