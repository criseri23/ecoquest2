namespace EcoQuest.Datos.Entities;

public class Mision
{
    public int Id { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public int Experiencia { get; set; }

    public bool Completada { get; set; }
}
