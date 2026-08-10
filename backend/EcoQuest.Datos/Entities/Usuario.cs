namespace EcoQuest.Datos.Entities;

public class Usuario
{
    public int Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public int Nivel { get; set; } = 1;

    public int Experiencia { get; set; }

    public int Monedas { get; set; }
}
