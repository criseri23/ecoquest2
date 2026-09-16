namespace EcoQuest.Logica.DTOs;

public sealed record LoginRequest(
    string Email,
    string Contraseña);