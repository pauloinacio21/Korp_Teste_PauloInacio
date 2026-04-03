using Estoque.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Estoque.API.Controllers;

[ApiController]
[Route("api/analise")]
public class AnaliseController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;

    public AnaliseController(AppDbContext db, IConfiguration config, IHttpClientFactory httpFactory)
    {
        _db = db;
        _config = config;
        _httpFactory = httpFactory;
    }

    [HttpGet("consumo")]
    public async Task<IActionResult> AnaliseConsumo()
    {
        var apiKey = _config["Claude_API"];
        if (string.IsNullOrEmpty(apiKey))
            return StatusCode(503, new { mensagem = "API key da Anthropic não configurada." });

        // 1. Busca histórico de notas do Faturamento.API
        var httpFaturamento = _httpFactory.CreateClient("faturamento");
        List<NotaFiscalAnaliseDto> notas;
        try
        {
            notas = await httpFaturamento.GetFromJsonAsync<List<NotaFiscalAnaliseDto>>(
                "/api/notasfiscais",
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { mensagem = $"Não foi possível obter histórico de notas: {ex.Message}" });
        }

        var notasFechadas = notas.Where(n => n.Status == "Fechada" && n.FechadaEm.HasValue).ToList();
        if (!notasFechadas.Any())
            return Ok(new { analise = "Sem histórico de notas emitidas para análise.", tendencias = Array.Empty<object>(), anomalias = Array.Empty<object>() });

        // 2. Computa consumo em 8 janelas de 7 dias (índice 0 = mais recente)
        var amanha = DateTime.UtcNow.Date.AddDays(1);
        var janelas = Enumerable.Range(0, 8).Select(i => (
            Inicio: amanha.AddDays(-7 * (i + 1)),
            Fim: amanha.AddDays(-7 * i)
        )).ToArray();

        var todosItens = notasFechadas.SelectMany(n =>
            n.Itens.Select(i => new
            {
                i.ProdutoId, i.ProdutoCodigo, i.ProdutoDescricao, i.Quantidade,
                Data = n.FechadaEm!.Value.Date
            })).ToList();

        var porProduto = todosItens
            .GroupBy(i => new { i.ProdutoId, i.ProdutoCodigo, i.ProdutoDescricao })
            .Select(g => new
            {
                g.Key.ProdutoId,
                g.Key.ProdutoCodigo,
                g.Key.ProdutoDescricao,
                Janelas = janelas.Select(j => g.Where(i => i.Data >= j.Inicio && i.Data < j.Fim).Sum(i => i.Quantidade)).ToArray()
            })
            .Where(p => p.Janelas.Any(v => v > 0))
            .ToList();

        if (!porProduto.Any())
            return Ok(new { analise = "Histórico insuficiente para análise (nenhum consumo registrado).", tendencias = Array.Empty<object>(), anomalias = Array.Empty<object>() });

        // 3. Enriquece com dados do banco
        var produtos = await _db.Produtos.ToListAsync();
        var categorias = await _db.Categorias.ToDictionaryAsync(c => c.Nome, c => new { c.EstoqueAlvo, c.EstoqueMinimo });

        // 4. Monta prompt
        var linhasProdutos = porProduto.Select(p =>
        {
            var prod = produtos.FirstOrDefault(x => x.Id == p.ProdutoId);
            var alvo = prod?.Categoria != null && categorias.TryGetValue(prod.Categoria, out var cat) ? cat.EstoqueAlvo : 30;
            var historico = string.Join(", ", p.Janelas); // mais recente primeiro
            return $"- [{p.ProdutoCodigo}] {p.ProdutoDescricao} | Categoria: {prod?.Categoria ?? "N/A"} | Saldo: {prod?.Saldo ?? 0} | EstoqueAlvo: {alvo}\n  Consumo por semana (semana 1=mais recente → semana 8=mais antiga): {historico}";
        });

        var dadosConsumo = string.Join("\n", linhasProdutos);
        var prompt = $$"""
            Você é um especialista em gestão de estoque. Analise os dados de consumo abaixo e forneça diagnóstico de tendências e anomalias.

            DADOS DE CONSUMO (últimas 8 semanas de 7 dias):
            {{dadosConsumo}}

            INSTRUÇÕES:
            1. TENDÊNCIAS: Para cada produto com histórico suficiente (pelo menos 3 semanas com dados), avalie se o consumo está crescente, decrescente ou estável. Uma tendência é clara quando há progressão consistente. Sugira revisão do EstoqueAlvo se ele estiver significativamente desalinhado com o ritmo atual.

            2. ANOMALIAS: A semana 1 (mais recente) está fora do padrão histórico (semanas 2-8)? Se o consumo da semana 1 for mais que 2x a média histórica, é anomalia "alta". Se for menos que 30% da média, é anomalia "baixa". Explique o que pode significar na prática.

            Escreva uma análise objetiva em português. Seja direto e prático.

            Ao final, inclua obrigatoriamente estas duas linhas exatas (sem markdown, sem quebra de linha interna):
            TENDENCIAS_JSON:[{"codigo":"COD","tendencia":"crescente","sugestaoAlvo":0,"motivo":"..."}]
            ANOMALIAS_JSON:[{"codigo":"COD","tipo":"alta","fator":2.5,"motivo":"..."}]

            Para TENDENCIAS_JSON: inclua apenas produtos com tendência clara. sugestaoAlvo=0 se não precisar mudar.
            Para ANOMALIAS_JSON: inclua apenas anomalias genuínas na semana 1 vs histórico. fator = semana1 / média_histórica.
            Se não houver tendências ou anomalias, use listas vazias: []
            """;

        // 5. Chama Claude
        using var httpClaude = new HttpClient { Timeout = TimeSpan.FromSeconds(45) };
        httpClaude.DefaultRequestHeaders.Add("x-api-key", apiKey);
        httpClaude.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var body = new
        {
            model = "claude-haiku-4-5-20251001",
            max_tokens = 1500,
            messages = new[] { new { role = "user", content = prompt } }
        };

        HttpResponseMessage claudeResp;
        try
        {
            claudeResp = await httpClaude.PostAsync(
                "https://api.anthropic.com/v1/messages",
                new StringContent(JsonSerializer.Serialize(body), System.Text.Encoding.UTF8, "application/json"));
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { mensagem = $"Erro ao conectar com a IA: {ex.Message}" });
        }

        if (!claudeResp.IsSuccessStatusCode)
        {
            var erro = await claudeResp.Content.ReadAsStringAsync();
            return StatusCode(503, new { mensagem = $"Erro na IA ({(int)claudeResp.StatusCode}): {erro}" });
        }

        var resultJson = await claudeResp.Content.ReadFromJsonAsync<JsonElement>();
        var textoCompleto = resultJson.GetProperty("content")[0].GetProperty("text").GetString() ?? "";

        // 6. Extrai JSONs estruturados
        var tendencias = ExtrairJson<TendenciaItemDto>(textoCompleto, "TENDENCIAS_JSON:");
        var anomalias = ExtrairJson<AnomaliaItemDto>(textoCompleto, "ANOMALIAS_JSON:");

        // Enriquece com descrição
        var tendenciasOut = tendencias.Select(t =>
        {
            var p = porProduto.FirstOrDefault(x => x.ProdutoCodigo == t.Codigo);
            return new { t.Codigo, descricao = p?.ProdutoDescricao ?? t.Codigo, t.Tendencia, t.SugestaoAlvo, t.Motivo };
        }).ToList();

        var anomaliasOut = anomalias.Select(a =>
        {
            var p = porProduto.FirstOrDefault(x => x.ProdutoCodigo == a.Codigo);
            return new { a.Codigo, descricao = p?.ProdutoDescricao ?? a.Codigo, a.Tipo, a.Fator, a.Motivo };
        }).ToList();

        // Remove marcadores do texto final
        var texto = textoCompleto;
        var idxT = texto.LastIndexOf("TENDENCIAS_JSON:");
        if (idxT >= 0) texto = texto[..idxT].TrimEnd();
        var idxA = texto.LastIndexOf("ANOMALIAS_JSON:");
        if (idxA >= 0) texto = texto[..idxA].TrimEnd();

        return Ok(new { analise = texto, tendencias = tendenciasOut, anomalias = anomaliasOut });
    }

    private static List<T> ExtrairJson<T>(string texto, string marcador)
    {
        var idx = texto.LastIndexOf(marcador);
        if (idx < 0) return [];
        var jsonStr = texto[(idx + marcador.Length)..].Split('\n')[0].Trim();
        try
        {
            return JsonSerializer.Deserialize<List<T>>(jsonStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch { return []; }
    }
}

// DTOs internos
record NotaFiscalAnaliseDto(int Id, string Status, DateTime? FechadaEm, List<ItemNotaAnaliseDto> Itens);
record ItemNotaAnaliseDto(int ProdutoId, string ProdutoCodigo, string ProdutoDescricao, int Quantidade);
record TendenciaItemDto(string Codigo, string Tendencia, int SugestaoAlvo, string Motivo);
record AnomaliaItemDto(string Codigo, string Tipo, double Fator, string Motivo);
