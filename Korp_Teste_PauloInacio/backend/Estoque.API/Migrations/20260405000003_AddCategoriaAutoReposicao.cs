using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Estoque.API.Migrations
{
    public partial class AddCategoriaAutoReposicao : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NuncaPodeZerar",
                table: "Categorias",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "QuantidadeReposicao",
                table: "Categorias",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "NuncaPodeZerar", table: "Categorias");
            migrationBuilder.DropColumn(name: "QuantidadeReposicao", table: "Categorias");
        }
    }
}
