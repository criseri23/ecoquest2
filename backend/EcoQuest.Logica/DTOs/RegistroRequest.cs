namespace EcoQuest.Logica.DTOs;

public sealed record RegistroRequest(
    string Nombre,
    string Email,
    string Contraseña);