namespace Faturamento.API.Models;

public enum StatusNota { Aberta, Fechada }

public class NotaFiscal
{
    public int Id { get; set; }
    public int Numero { get; set; }
    public StatusNota Status { get; set; } = StatusNota.Aberta;
    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
    public DateTime? FechadaEm { get; set; }
    public List<ItemNota> Itens { get; set; } = new();
}

public class ItemNota
{
    public int Id { get; set; }
    public int NotaFiscalId { get; set; }
    public NotaFiscal? NotaFiscal { get; set; }
    public int ProdutoId { get; set; }
    public string ProdutoDescricao { get; set; } = string.Empty;
    public string ProdutoCodigo { get; set; } = string.Empty;
    public int Quantidade { get; set; }
}
