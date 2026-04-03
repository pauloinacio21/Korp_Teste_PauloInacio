using Estoque.API.Data;
using Estoque.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Estoque.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriasController : ControllerBase
{
    private readonly AppDbContext _db;

    public CategoriasController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Categorias.OrderBy(c => c.Nome).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(Categoria categoria)
    {
        if (await _db.Categorias.AnyAsync(c => c.Nome == categoria.Nome))
            return BadRequest(new { mensagem = "Já existe uma categoria com esse nome." });

        _db.Categorias.Add(categoria);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = categoria.Id }, categoria);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Categoria categoria)
    {
        var existente = await _db.Categorias.FindAsync(id);
        if (existente is null) return NotFound();

        if (existente.Nome != categoria.Nome &&
            await _db.Categorias.AnyAsync(c => c.Nome == categoria.Nome && c.Id != id))
            return BadRequest(new { mensagem = "Já existe uma categoria com esse nome." });

        existente.Nome = categoria.Nome;
        existente.EstoqueAlvo = categoria.EstoqueAlvo;
        await _db.SaveChangesAsync();
        return Ok(existente);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var categoria = await _db.Categorias.FindAsync(id);
        if (categoria is null) return NotFound();

        _db.Categorias.Remove(categoria);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
