using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Estoque.API.Migrations
{
    public partial class RefatorarCategoriaMinimo : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "NuncaPodeZerar", table: "Categorias");

            migrationBuilder.RenameColumn(
                name: "QuantidadeReposicao",
                table: "Categorias",
                newName: "EstoqueMinimo");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EstoqueMinimo",
                table: "Categorias",
                newName: "QuantidadeReposicao");

            migrationBuilder.AddColumn<bool>(
                name: "NuncaPodeZerar",
                table: "Categorias",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
