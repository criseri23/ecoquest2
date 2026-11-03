using EcoQuest.Datos.Entities;
using System.Data.Common;
using MySql.Data.MySqlClient;

namespace EcoQuest.Datos.Repositories;

public sealed class UsuarioRepository : IUsuarioRepository
{
    private readonly string connectionString;

    public UsuarioRepository(string connectionString)
    {
        this.connectionString = connectionString;
        CrearTablaSiHaceFalta();
    }

    public async Task<Usuario?> ObtenerPorEmailAsync(
        string email,
        CancellationToken cancellationToken)
    {
        await using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new MySqlCommand(
            "SELECT Id, Nombre, Email, PasswordHash, Nivel, Experiencia, Monedas FROM Usuarios WHERE Email = @email LIMIT 1",
            connection);
        command.Parameters.AddWithValue("@email", email);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? LeerUsuario(reader) : null;
    }

    public async Task<List<Usuario>> ObtenerPorNombreAsync(
        string nombre,
        CancellationToken cancellationToken)
    {
        await using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new MySqlCommand(
            "SELECT Id, Nombre, Email, PasswordHash, Nivel, Experiencia, Monedas FROM Usuarios WHERE LOWER(Nombre) = @nombre",
            connection);
        command.Parameters.AddWithValue("@nombre", nombre.Trim().ToLowerInvariant());
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var usuarios = new List<Usuario>();
        while (await reader.ReadAsync(cancellationToken)) usuarios.Add(LeerUsuario(reader));
        return usuarios;
    }

    public async Task AgregarAsync(
        Usuario usuario,
        CancellationToken cancellationToken)
    {
        await using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new MySqlCommand(
            "INSERT INTO Usuarios (Nombre, Email, PasswordHash, Nivel, Experiencia, Monedas) VALUES (@nombre, @email, @passwordHash, @nivel, @experiencia, @monedas)",
            connection);
        command.Parameters.AddWithValue("@nombre", usuario.Nombre);
        command.Parameters.AddWithValue("@email", usuario.Email);
        command.Parameters.AddWithValue("@passwordHash", usuario.PasswordHash);
        command.Parameters.AddWithValue("@nivel", usuario.Nivel);
        command.Parameters.AddWithValue("@experiencia", usuario.Experiencia);
        command.Parameters.AddWithValue("@monedas", usuario.Monedas);
        await command.ExecuteNonQueryAsync(cancellationToken);
        usuario.Id = (int)command.LastInsertedId;
    }

    private static Usuario LeerUsuario(DbDataReader reader) => new()
    {
        Id = reader.GetInt32(reader.GetOrdinal("Id")),
        Nombre = reader.GetString(reader.GetOrdinal("Nombre")),
        Email = reader.GetString(reader.GetOrdinal("Email")),
        PasswordHash = reader.GetString(reader.GetOrdinal("PasswordHash")),
        Nivel = reader.GetInt32(reader.GetOrdinal("Nivel")),
        Experiencia = reader.GetInt32(reader.GetOrdinal("Experiencia")),
        Monedas = reader.GetInt32(reader.GetOrdinal("Monedas"))
    };

    private void CrearTablaSiHaceFalta()
    {
        using var connection = new MySqlConnection(connectionString);
        connection.Open();
        using var create = new MySqlCommand("""
            CREATE TABLE IF NOT EXISTS Usuarios (
                Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                Nombre VARCHAR(24) NOT NULL,
                Email VARCHAR(254) NOT NULL,
                PasswordHash VARCHAR(255) NOT NULL,
                Nivel INT NOT NULL DEFAULT 1,
                Experiencia INT NOT NULL DEFAULT 0,
                Monedas INT NOT NULL DEFAULT 0,
                UNIQUE KEY UX_Usuarios_Email (Email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """, connection);
        create.ExecuteNonQuery();

        using var passwordColumn = new MySqlCommand(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'PasswordHash'",
            connection);
        if (Convert.ToInt32(passwordColumn.ExecuteScalar()) == 0)
        {
            using var oldPasswordColumn = new MySqlCommand(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'Contraseña'",
                connection);
            if (Convert.ToInt32(oldPasswordColumn.ExecuteScalar()) > 0)
            {
                using var rename = new MySqlCommand(
                    "ALTER TABLE Usuarios CHANGE COLUMN `Contraseña` PasswordHash VARCHAR(255) NOT NULL",
                    connection);
                rename.ExecuteNonQuery();
            }
        }
    }
}
