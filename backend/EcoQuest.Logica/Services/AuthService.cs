using EcoQuest.Datos.Entities;
using EcoQuest.Datos.Repositories;
using EcoQuest.Logica.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace EcoQuest.Logica.Services;

public sealed class AuthService : IAuthService
{
    private readonly IUsuarioRepository usuarioRepository;
    private readonly IPasswordHasher<Usuario> passwordHasher;

    public AuthService(
        IUsuarioRepository usuarioRepository,
        IPasswordHasher<Usuario> passwordHasher)
    {
        this.usuarioRepository = usuarioRepository;
        this.passwordHasher = passwordHasher;
    }

    public async Task<Usuario?> RegistrarAsync(
        string nombre,
        string email,
        string contraseña,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(nombre) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(contraseña) || contraseña.Length > 128)
        {
            return null;
        }

        email = email.Trim().ToLowerInvariant();
        if (email.Length > 254 || !System.Net.Mail.MailAddress.TryCreate(email, out var address) || address.Address != email)
            return null;

        var usuarioExistente =
            await usuarioRepository.ObtenerPorEmailAsync(
                email,
                cancellationToken);

        if (usuarioExistente is not null)
        {
            return null;
        }

        if (nombre.Trim().Length is < 3 or > 24 || contraseña.Length is < 8 or > 128) return null;

        var usuario = new Usuario
        {
            Nombre = nombre.Trim(),
            Email = email,
            Nivel = 1,
            Experiencia = 0,
            Monedas = 0
        };

        usuario.PasswordHash =
            passwordHasher.HashPassword(usuario, contraseña);

        await usuarioRepository.AgregarAsync(
            usuario,
            cancellationToken);

        return usuario;
    }

    public async Task<Usuario?> LoginAsync(
        string email,
        string contraseña,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(contraseña) || contraseña.Length > 128)
        {
            return null;
        }

        email = email.Trim().ToLowerInvariant();
        if (email.Length > 254 || !System.Net.Mail.MailAddress.TryCreate(email, out var address) || address.Address != email)
            return null;

        var usuario = await usuarioRepository.ObtenerPorEmailAsync(
            email,
            cancellationToken);

        if (usuario is null)
        {
            return null;
        }

        var resultado = passwordHasher.VerifyHashedPassword(
            usuario,
            usuario.PasswordHash,
            contraseña);

        return resultado != PasswordVerificationResult.Failed ? usuario : null;
    }
}