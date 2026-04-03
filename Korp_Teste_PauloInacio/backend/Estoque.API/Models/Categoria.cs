namespace Estoque.API.Models;

public class Categoria
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int EstoqueAlvo { get; set; }
    public int EstoqueMinimo { get; set; }
}
