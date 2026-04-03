using Faturamento.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Faturamento.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<NotaFiscal> NotasFiscais => Set<NotaFiscal>();
    public DbSet<ItemNota> Itens => Set<ItemNota>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NotaFiscal>()
            .HasIndex(n => n.Numero)
            .IsUnique();

        modelBuilder.Entity<NotaFiscal>()
            .HasMany(n => n.Itens)
            .WithOne(i => i.NotaFiscal)
            .HasForeignKey(i => i.NotaFiscalId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
