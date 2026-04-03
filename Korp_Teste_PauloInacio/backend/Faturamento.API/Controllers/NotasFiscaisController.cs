using Faturamento.API.Data;
using Faturamento.API.Models;
using Faturamento.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Faturamento.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotasFiscaisController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly EstoqueService _estoque;

    public NotasFiscaisController(AppDbContext db, EstoqueService estoque)
    {
        _db = db;
        _estoque = estoque;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.NotasFiscais.Include(n => n.Itens).OrderByDescending(n => n.Numero).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var nota = await _db.NotasFiscais.Include(n => n.Itens).FirstOrDefaultAsync(n => n.Id == id);
        return nota is null ? NotFound() : Ok(nota);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CriarNotaRequest req)
    {
        // Numeração sequencial automática
        var proximoNumero = await _db.NotasFiscais.AnyAsync()
            ? await _db.NotasFiscais.MaxAsync(n => n.Numero) + 1
            : 1;

        var nota = new NotaFiscal
        {
            Numero = proximoNumero,
            Status = StatusNota.Aberta,
            Itens = req.Itens.Select(i => new ItemNota
            {
                ProdutoId = i.ProdutoId,
                ProdutoDescricao = i.ProdutoDescricao,
                ProdutoCodigo = i.ProdutoCodigo,
                Quantidade = i.Quantidade
            }).ToList()
        };

        _db.NotasFiscais.Add(nota);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = nota.Id }, nota);
    }

    [HttpPost("{id}/imprimir")]
    public async Task<IActionResult> Imprimir(int id)
    {
        var nota = await _db.NotasFiscais.Include(n => n.Itens).FirstOrDefaultAsync(n => n.Id == id);
        if (nota is null) return NotFound();
        if (nota.Status == StatusNota.Fechada)
            return BadRequest(new { mensagem = "Nota já foi impressa e está fechada." });

        // Agrupa itens pelo mesmo produto e soma as quantidades
        var itensPorProduto = nota.Itens
            .GroupBy(i => i.ProdutoId)
            .Select(g => new {
                ProdutoId = g.Key,
                Descricao = g.First().ProdutoDescricao,
                Codigo = g.First().ProdutoCodigo,
                Quantidade = g.Sum(i => i.Quantidade)
            })
            .ToList();

        // Valida saldo disponível ANTES de deduzir qualquer coisa
        var errosValidacao = new List<string>();
        foreach (var item in itensPorProduto)
        {
            var produto = await _estoque.BuscarProduto(item.ProdutoId);
            if (produto is null)
            {
                errosValidacao.Add($"{item.Descricao} [{item.Codigo}]: Produto não encontrado no estoque.");
                continue;
            }
            if (produto.Saldo < item.Quantidade)
                errosValidacao.Add($"{item.Descricao} [{item.Codigo}]: Saldo insuficiente. Disponível: {produto.Saldo}, necessário: {item.Quantidade}");
        }

        if (errosValidacao.Any())
        {
            bool temNaoEncontrado = errosValidacao.Any(e => e.Contains("não encontrado"));
            bool temSaldoInsuf   = errosValidacao.Any(e => e.Contains("Saldo insuficiente"));
            string msgValidacao  = (temNaoEncontrado && !temSaldoInsuf)
                ? "Produto(s) não encontrado(s) no serviço de estoque. Verifique a sincronização dos dados."
                : temNaoEncontrado
                ? "Problemas ao validar o estoque: produto(s) não encontrado(s) e/ou saldo insuficiente."
                : "Saldo insuficiente para um ou mais produtos.";
            return UnprocessableEntity(new { mensagem = msgValidacao, erros = errosValidacao });
        }

        // Tudo validado — agora deduz
        var erros = new List<string>();
        foreach (var item in itensPorProduto)
        {
            var (sucesso, mensagem) = await _estoque.AtualizarSaldo(item.ProdutoId, item.Quantidade);
            if (!sucesso) erros.Add($"{item.Descricao} [{item.Codigo}]: {mensagem}");
        }

        if (erros.Any())
        {
            bool temNaoEncontradoPos = erros.Any(e => e.Contains("não encontrado"));
            string msgDeducao = temNaoEncontradoPos
                ? "Falha ao deduzir estoque: produto(s) não encontrado(s) no serviço."
                : "Saldo insuficiente para um ou mais produtos.";
            return UnprocessableEntity(new { mensagem = msgDeducao, erros });
        }

        nota.Status = StatusNota.Fechada;
        nota.FechadaEm = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(nota);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var nota = await _db.NotasFiscais.FindAsync(id);
        if (nota is null) return NotFound();
        if (nota.Status == StatusNota.Fechada)
            return BadRequest(new { mensagem = "Não é possível excluir nota fechada." });

        _db.NotasFiscais.Remove(nota);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record ItemNotaRequest(int ProdutoId, string ProdutoDescricao, string ProdutoCodigo, int Quantidade);
public record CriarNotaRequest(List<ItemNotaRequest> Itens);
