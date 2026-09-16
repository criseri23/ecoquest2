using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcoQuest.Datos.Migrations
{
    /// <inheritdoc />
    public partial class CambiarContraseñaPorPasswordHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Contraseña",
                table: "Usuarios",
                newName: "PasswordHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PasswordHash",
                table: "Usuarios",
                newName: "Contraseña");
        }
    }
}
