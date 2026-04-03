using Estoque.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Estoque.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Produto> Produtos => Set<Produto>();
    public DbSet<Categoria> Categorias => Set<Categoria>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Produto>()
            .HasIndex(p => p.Codigo)
            .IsUnique();

        modelBuilder.Entity<Categoria>()
            .HasIndex(c => c.Nome)
            .IsUnique();

        modelBuilder.Entity<Categoria>().HasData(
            new Categoria { Id = 1, Nome = "Alta Rotatividade", EstoqueAlvo = 100, EstoqueMinimo = 0 },
            new Categoria { Id = 2, Nome = "Baixa Rotatividade", EstoqueAlvo = 20, EstoqueMinimo = 0 },
            new Categoria { Id = 3, Nome = "Sazonal", EstoqueAlvo = 50, EstoqueMinimo = 0 },
            new Categoria { Id = 4, Nome = "Crítico", EstoqueAlvo = 50, EstoqueMinimo = 0 }
        );
    }
}
