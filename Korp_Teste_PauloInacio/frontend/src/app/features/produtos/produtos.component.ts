import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { ProdutoService } from '../../core/services/produto.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { Produto } from '../../core/models/produto.model';
import { ProdutoDialogComponent } from './produto-dialog/produto-dialog.component';
import { SugestaoDialogComponent } from './sugestao-dialog/sugestao-dialog.component';
import { AnaliseDialogComponent } from './analise-dialog/analise-dialog.component';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatDialogModule, MatProgressSpinnerModule,
    MatCardModule, MatSnackBarModule, MatTooltipModule
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">
        <mat-icon>inventory_2</mat-icon>
        Produtos
      </h1>
      <div class="header-actions">
        <button mat-stroked-button (click)="abrirAnalise()" matTooltip="IA analisa tendências de consumo e detecta anomalias">
          <mat-icon>insights</mat-icon> Análise de Consumo
        </button>
        <button mat-stroked-button color="accent" (click)="abrirSugestaoIA()" matTooltip="Usar IA para sugerir reposição de produtos com saldo baixo">
          <mat-icon>psychology</mat-icon> Sugerir Reposição
        </button>
        <button mat-raised-button color="primary" (click)="abrirDialog()">
          <mat-icon>add</mat-icon> Novo Produto
        </button>
      </div>
    </div>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar produto</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput (keyup)="filtrar($event)" placeholder="Código ou descrição..." />
        </mat-form-field>

        <div class="table-container" [class.loading]="carregando">
          <div *ngIf="carregando" class="spinner-overlay">
            <mat-spinner diameter="48"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="full-width">
            <ng-container matColumnDef="codigo">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Código</th>
              <td mat-cell *matCellDef="let p">{{ p.codigo }}</td>
            </ng-container>

            <ng-container matColumnDef="descricao">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Descrição</th>
              <td mat-cell *matCellDef="let p">{{ p.descricao }}</td>
            </ng-container>

            <ng-container matColumnDef="categoria">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Categoria</th>
              <td mat-cell *matCellDef="let p">
                <span *ngIf="p.categoria" class="chip-categoria"
                  [style.background]="chipEstilo(p.categoria).bg"
                  [style.color]="chipEstilo(p.categoria).fg">{{ p.categoria }}</span>
                <span *ngIf="!p.categoria" class="sem-categoria">—</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="saldo">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Saldo</th>
              <td mat-cell *matCellDef="let p">
                <span [class.saldo-baixo]="p.saldo > 0 && p.saldo < limiarCategoria(p)"
                      [class.saldo-zero]="p.saldo <= 0">
                  {{ p.saldo }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef>Ações</th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="abrirDialog(p)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Excluir" (click)="deletar(p)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas;" class="table-row"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" colspan="4">
                {{ carregando ? '' : 'Nenhum produto encontrado.' }}
              </td>
            </tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.5rem; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-field { width: 100%; margin-bottom: 8px; }
    .full-width { width: 100%; }
    .table-container { position: relative; min-height: 200px; }
    .spinner-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); z-index: 10; }
    .table-row:hover { background: rgba(0,0,0,0.03); }
    .no-data { text-align: center; padding: 24px; color: #999; }
    .saldo-baixo { color: orange; font-weight: 500; }
    .saldo-zero { color: red; font-weight: 700; }
    .chip-categoria { padding: 2px 8px; border-radius: 12px; font-size: 0.78rem; font-weight: 500; white-space: nowrap; }
    .sem-categoria { color: #bbb; }
  `]
})
export class ProdutosComponent implements OnInit {
  colunas = ['codigo', 'descricao', 'categoria', 'saldo', 'acoes'];
  dataSource = new MatTableDataSource<Produto>();
  carregando = false;
  private categoriasAlvo: Record<string, number> = {};

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private service: ProdutoService,
    private categoriaService: CategoriaService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.categoriaService.getAll().subscribe({
      next: cats => {
        this.categoriasAlvo = Object.fromEntries(cats.map(c => [c.nome, c.estoqueAlvo]));
      }
    });
    this.carregar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  carregar(): void {
    this.carregando = true;
    this.service.getAll()
      .pipe(finalize(() => this.carregando = false))
      .subscribe({ next: data => this.dataSource.data = data });
  }

  filtrar(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  abrirDialog(produto?: Produto): void {
    const ref = this.dialog.open(ProdutoDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: produto ?? null
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.carregar();
    });
  }

  abrirAnalise(): void {
    this.dialog.open(AnaliseDialogComponent, { width: '900px', maxWidth: '95vw', disableClose: true });
  }

  abrirSugestaoIA(): void {
    const ref = this.dialog.open(SugestaoDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      disableClose: true
    });
    ref.afterClosed().subscribe(reabasteceu => {
      if (reabasteceu) this.carregar();
    });
  }

  private readonly _paleta = [
    { bg: '#e3f2fd', fg: '#1565c0' }, { bg: '#f3e5f5', fg: '#6a1b9a' },
    { bg: '#fff8e1', fg: '#e65100' }, { bg: '#ffebee', fg: '#b71c1c' },
    { bg: '#e8f5e9', fg: '#2e7d32' }, { bg: '#fce4ec', fg: '#880e4f' },
    { bg: '#e0f7fa', fg: '#006064' }, { bg: '#ede7f6', fg: '#4527a0' },
  ];

  chipEstilo(nome: string): { bg: string; fg: string } {
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) & 0x7fffffff;
    return this._paleta[hash % this._paleta.length];
  }

  limiarCategoria(p: Produto): number {
    if (p.categoria && this.categoriasAlvo[p.categoria] !== undefined) {
      return this.categoriasAlvo[p.categoria];
    }
    return 30;
  }

  deletar(produto: Produto): void {
    if (!confirm(`Excluir o produto "${produto.descricao}"?`)) return;
    this.service.deletar(produto.id).subscribe({
      next: () => {
        this.snack.open('Produto excluído.', 'OK', { duration: 3000 });
        this.carregar();
      }
    });
  }
}
