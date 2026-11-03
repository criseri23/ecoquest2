using EcoQuest.Datos.Context;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcoQuest.Datos.Migrations;

[DbContext(typeof(EcoQuestDbContext))]
[Migration("20261029120000_AddUniqueEmailIndex")]
public sealed class AddUniqueEmailIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "Email",
            table: "Usuarios",
            type: "varchar(254)",
            maxLength: 254,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "longtext");

        migrationBuilder.CreateIndex(
            name: "IX_Usuarios_Email",
            table: "Usuarios",
            column: "Email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Usuarios_Email", table: "Usuarios");

        migrationBuilder.AlterColumn<string>(
            name: "Email",
            table: "Usuarios",
            type: "longtext",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "varchar(254)",
            oldMaxLength: 254);
    }
}
