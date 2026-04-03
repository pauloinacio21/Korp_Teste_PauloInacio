namespace Faturamento.API.Services;

public class EstoqueService
{
    private readonly HttpClient _http;
    private readonly ILogger<EstoqueService> _logger;

    public EstoqueService(HttpClient http, ILogger<EstoqueService> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<(bool sucesso, string mensagem)> AtualizarSaldo(int produtoId, int quantidade)
    {
        try
        {
            var response = await _http.PatchAsJsonAsync(
                $"/api/produtos/{produtoId}/saldo",
                new { Quantidade = quantidade });

            if (response.IsSuccessStatusCode)
                return (true, "OK");

            try
            {
                var json = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                var msg = json.GetProperty("mensagem").GetString() ?? "Erro desconhecido.";
                return (false, msg);
            }
            catch
            {
                return (false, "Saldo insuficiente.");
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Falha ao comunicar com Estoque.API");
            // Simula falha de microsserviço - retorna erro amigável
            return (false, "Serviço de estoque indisponível. Tente novamente em instantes.");
        }
        catch (TaskCanceledException)
        {
            return (false, "Tempo de resposta excedido no serviço de estoque.");
        }
    }

    public async Task<ProdutoDto?> BuscarProduto(int produtoId)
    {
        try
        {
            return await _http.GetFromJsonAsync<ProdutoDto>($"/api/produtos/{produtoId}");
        }
        catch
        {
            return null;
        }
    }
}

public record ProdutoDto(int Id, string Codigo, string Descricao, decimal Saldo);
