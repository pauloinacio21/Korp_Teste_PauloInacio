namespace Estoque.API.Models;

public class Produto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public decimal Saldo { get; set; }
    public string? Categoria { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
