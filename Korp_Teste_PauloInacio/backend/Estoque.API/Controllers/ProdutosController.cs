using Estoque.API.Data;
using Estoque.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Estoque.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProdutosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public ProdutosController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Produtos.OrderBy(p => p.Descricao).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var produto = await _db.Produtos.FindAsync(id);
        return produto is null ? NotFound() : Ok(produto);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Produto produto)
    {
        if (await _db.Produtos.AnyAsync(p => p.Codigo == produto.Codigo))
            return BadRequest(new { mensagem = "Código já cadastrado." });

        _db.Produtos.Add(produto);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = produto.Id }, produto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Produto produto)
    {
        var existente = await _db.Produtos.FindAsync(id);
        if (existente is null) return NotFound();

        existente.Codigo = produto.Codigo;
        existente.Descricao = produto.Descricao;
        existente.Saldo = produto.Saldo;
        existente.Categoria = produto.Categoria;
        await _db.SaveChangesAsync();
        return Ok(existente);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var produto = await _db.Produtos.FindAsync(id);
        if (produto is null) return NotFound();

        _db.Produtos.Remove(produto);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Endpoint interno usado pelo Faturamento.API
    [HttpPatch("{id}/saldo")]
    public async Task<IActionResult> AtualizarSaldo(int id, [FromBody] AtualizarSaldoRequest req)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        // SELECT FOR UPDATE: bloqueia a linha no PostgreSQL, evitando race condition em impressões simultâneas
        var produto = await _db.Produtos
            .FromSqlRaw(@"SELECT * FROM ""Produtos"" WHERE ""Id"" = {0} FOR UPDATE", id)
            .FirstOrDefaultAsync();

        if (produto is null)
        {
            await tx.RollbackAsync();
            return NotFound();
        }

        if (produto.Saldo < req.Quantidade)
        {
            await tx.RollbackAsync();
            return BadRequest(new { mensagem = $"Saldo insuficiente. Disponível: {produto.Saldo}, solicitado: {req.Quantidade}" });
        }

        produto.Saldo -= req.Quantidade;

        // Auto-reposição: se saldo caiu abaixo do mínimo da categoria, repõe até o mínimo
        if (!string.IsNullOrEmpty(produto.Categoria))
        {
            var categoria = await _db.Categorias.FirstOrDefaultAsync(c => c.Nome == produto.Categoria);
            if (categoria is { EstoqueMinimo: > 0 } && produto.Saldo < categoria.EstoqueMinimo)
                produto.Saldo = categoria.EstoqueMinimo;
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(produto);
    }

    // Endpoint de IA: sugestão de reposição via Claude
    [HttpGet("sugestao-reposicao")]
    public async Task<IActionResult> SugestaoReposicao()
    {
        // Carrega categorias do banco para usar os alvos configurados
        var categorias = await _db.Categorias.ToDictionaryAsync(c => c.Nome, c => c.EstoqueAlvo);

        int EstoqueAlvo(string? categoria) =>
            categoria != null && categorias.TryGetValue(categoria, out var alvo) ? alvo : 30;

        // Busca todos os produtos e filtra pelos abaixo do alvo da sua categoria
        var todosProdutos = await _db.Produtos.OrderBy(p => p.Saldo).ToListAsync();
        var produtosBaixoSaldo = todosProdutos
            .Where(p => p.Saldo < EstoqueAlvo(p.Categoria))
            .ToList();

        if (!produtosBaixoSaldo.Any())
            return Ok(new { sugestao = "Todos os produtos estão com saldo adequado para suas respectivas categorias. Nenhuma reposição necessária no momento." });

        var apiKey = _config["Claude_API"];
        if (string.IsNullOrEmpty(apiKey))
            return StatusCode(503, new { mensagem = "API key da Anthropic não configurada." });

        var listaProdutos = string.Join("\n", produtosBaixoSaldo.Select(p =>
        {
            var alvo = EstoqueAlvo(p.Categoria);
            var necessario = Math.Max(0, alvo - (int)p.Saldo);
            return $"- Código: {p.Codigo} | Descrição: {p.Descricao} | Categoria: {p.Categoria ?? "Não informada"} | Saldo atual: {p.Saldo} | Estoque alvo: {alvo} | Quantidade a repor: {necessario}";
        }));

        var codigosProdutos = string.Join(", ", produtosBaixoSaldo.Select(p => $"\"{p.Codigo}\""));

        var regrasCategoria = string.Join("\n", categorias.Select(kv => $"- \"{kv.Key}\": alvo {kv.Value} un."));

        var prompt = $$"""
            Você é um assistente especializado em gestão de estoque.
            Os produtos abaixo já têm a quantidade a repor calculada com base na categoria e saldo atual.
            Seu papel é confirmar as quantidades e explicar brevemente o raciocínio de cada uma, considerando a categoria do produto.

            Produtos:
            {{listaProdutos}}

            Regras por categoria (para embasar sua explicação):
            {{regrasCategoria}}
            - "Não informada": alvo 30 un. — critério padrão

            Escreva uma análise objetiva em português. Use a quantidade calculada no campo "Quantidade a repor" — não invente outros valores.

            Ao final da resposta, inclua obrigatoriamente uma linha com o seguinte formato exato (sem markdown, sem quebra de linha dentro):
            REPOSICOES_JSON:[{"codigo":"CODIGO","quantidade":N}]

            Use apenas os códigos: {{codigosProdutos}}
            Exemplo: REPOSICOES_JSON:[{"codigo":"P001","quantidade":49},{"codigo":"P002","quantidade":18}]
            """;

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.Add("x-api-key", apiKey);
        http.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var body = new
        {
            model = "claude-haiku-4-5-20251001",
            max_tokens = 1024,
            messages = new[] { new { role = "user", content = prompt } }
        };

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await http.PostAsync(
                "https://api.anthropic.com/v1/messages",
                new StringContent(JsonSerializer.Serialize(body), System.Text.Encoding.UTF8, "application/json")
            );
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { mensagem = $"Erro ao conectar com a API da Anthropic: {ex.Message}" });
        }

        if (!httpResponse.IsSuccessStatusCode)
        {
            var erro = await httpResponse.Content.ReadAsStringAsync();
            return StatusCode(503, new { mensagem = $"Erro na API da Anthropic ({(int)httpResponse.StatusCode}): {erro}" });
        }

        var result = await httpResponse.Content.ReadFromJsonAsync<JsonElement>();
        var textoCompleto = result.GetProperty("content")[0].GetProperty("text").GetString() ?? "";

        // Extrai o JSON estruturado e limpa o texto da sugestão
        var reposicoes = new List<object>();
        var textoSugestao = textoCompleto;
        var marcador = "REPOSICOES_JSON:";
        var idxJson = textoCompleto.LastIndexOf(marcador);
        if (idxJson >= 0)
        {
            textoSugestao = textoCompleto[..idxJson].TrimEnd();
            var jsonStr = textoCompleto[(idxJson + marcador.Length)..].Trim();
            try
            {
                var jsonArray = JsonSerializer.Deserialize<List<ReposicaoItem>>(jsonStr,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (jsonArray != null)
                {
                    reposicoes = jsonArray.Select(r =>
                    {
                        var produto = produtosBaixoSaldo.FirstOrDefault(p => p.Codigo == r.Codigo);
                        return (object)new
                        {
                            produtoId = produto?.Id ?? 0,
                            codigo = r.Codigo,
                            descricao = produto?.Descricao ?? r.Codigo,
                            saldoAtual = produto?.Saldo ?? 0,
                            quantidadeSugerida = r.Quantidade
                        };
                    }).ToList();
                }
            }
            catch { /* ignora erro de parse, reposicoes fica vazio */ }
        }

        return Ok(new { sugestao = textoSugestao, reposicoes });
    }

    [HttpPatch("{id}/repor")]
    public async Task<IActionResult> ReporSaldo(int id, [FromBody] ReporSaldoRequest req)
    {
        var produto = await _db.Produtos.FindAsync(id);
        if (produto is null) return NotFound();
        produto.Saldo += req.Quantidade;
        await _db.SaveChangesAsync();
        return Ok(produto);
    }
}

public record AtualizarSaldoRequest(int Quantidade);
public record ReporSaldoRequest(int Quantidade);
public record ReposicaoItem(string Codigo, int Quantidade);
