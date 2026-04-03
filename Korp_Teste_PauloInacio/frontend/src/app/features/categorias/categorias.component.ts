import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { CategoriaService } from '../../core/services/categoria.service';
import { Categoria } from '../../core/models/categoria.model';
import { CategoriaDialogComponent } from './categoria-dialog/categoria-dialog.component';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatSortModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatCardModule,
    MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule,
    MatDialogModule, MatChipsModule
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">
        <mat-icon>category</mat-icon>
        Categorias
      </h1>
      <button mat-raised-button color="primary" (click)="abrirDialog()">
        <mat-icon>add</mat-icon> Nova Categoria
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <div class="table-container" [class.loading]="carregando">
          <div *ngIf="carregando" class="spinner-overlay">
            <mat-spinner diameter="48"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="full-width">
            <ng-container matColumnDef="nome">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nome</th>
              <td mat-cell *matCellDef="let c">{{ c.nome }}</td>
            </ng-container>

            <ng-container matColumnDef="estoqueAlvo">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Estoque alvo</th>
              <td mat-cell *matCellDef="let c">
                <span class="alvo-badge">{{ c.estoqueAlvo }} un.</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="autoReposicao">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Mínimo / Auto-reposição</th>
              <td mat-cell *matCellDef="let c">
                <ng-container *ngIf="c.estoqueMinimo > 0; else semAuto">
                  <mat-chip color="warn" highlighted style="font-size:0.78rem">
                    <mat-icon style="font-size:14px;height:14px;width:14px;margin-right:4px">bolt</mat-icon>
                    Mínimo {{ c.estoqueMinimo }} un.
                  </mat-chip>
                </ng-container>
                <ng-template #semAuto><span style="color:#bbb">—</span></ng-template>
              </td>
            </ng-container>

            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef>Ações</th>
              <td mat-cell *matCellDef="let c">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="abrirDialog(c)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Excluir" (click)="deletar(c)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas;" class="table-row"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" colspan="4">
                {{ carregando ? '' : 'Nenhuma categoria cadastrada.' }}
              </td>
            </tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.5rem; }
    .full-width { width: 100%; }
    .table-container { position: relative; min-height: 120px; }
    .spinner-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); z-index: 10; }
    .table-row:hover { background: rgba(0,0,0,0.03); }
    .no-data { text-align: center; padding: 24px; color: #999; }
    .alvo-badge { background: #e8f5e9; color: #2e7d32; padding: 2px 10px; border-radius: 12px; font-weight: 500; }
  `]
})
export class CategoriasComponent implements OnInit, AfterViewInit {
  colunas = ['nome', 'estoqueAlvo', 'autoReposicao', 'acoes'];
  dataSource = new MatTableDataSource<Categoria>();
  carregando = false;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private service: CategoriaService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, col) => {
      switch (col) {
        case 'autoReposicao': return item.estoqueMinimo;
        default: return (item as any)[col];
      }
    };
  }

  carregar(): void {
    this.carregando = true;
    this.service.getAll().subscribe({
      next: data => { this.dataSource.data = data; this.carregando = false; },
      error: () => this.carregando = false
    });
  }

  abrirDialog(categoria?: Categoria): void {
    const ref = this.dialog.open(CategoriaDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: categoria ?? null
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.carregar();
    });
  }

  deletar(categoria: Categoria): void {
    if (!confirm(`Excluir a categoria "${categoria.nome}"?\nProdutos com essa categoria não serão afetados.`)) return;
    this.service.deletar(categoria.id).subscribe({
      next: () => {
        this.snack.open('Categoria excluída.', 'OK', { duration: 3000 });
        this.carregar();
      }
    });
  }
}
