import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { NotaFiscalService } from '../../core/services/nota-fiscal.service';
import { NotaFiscal } from '../../core/models/nota-fiscal.model';
import { ImpressaoDialogComponent } from './impressao-dialog/impressao-dialog.component';
import { NotaDetalhesDialogComponent } from './nota-detalhes-dialog/nota-detalhes-dialog.component';

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatButtonToggleModule, MatIconModule, MatChipsModule,
    MatCardModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule, MatDialogModule
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">
        <mat-icon>receipt_long</mat-icon>
        Notas Fiscais
      </h1>
      <button mat-raised-button color="primary" routerLink="/notas-fiscais/nova">
        <mat-icon>add</mat-icon> Nova Nota
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <div class="toolbar-filtro">
          <mat-button-toggle-group [(ngModel)]="filtroStatus" (change)="aplicarFiltro()" aria-label="Filtro de status">
            <mat-button-toggle value="Todos">
              <mat-icon>list</mat-icon> Todos
            </mat-button-toggle>
            <mat-button-toggle value="Aberta">
              <mat-icon>lock_open</mat-icon> Abertas
            </mat-button-toggle>
            <mat-button-toggle value="Fechada">
              <mat-icon>lock</mat-icon> Fechadas
            </mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <div class="table-container">
          <div *ngIf="carregando" class="spinner-overlay">
            <mat-spinner diameter="48"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="full-width">
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nº</th>
              <td mat-cell *matCellDef="let n"><strong>#{{ n.numero }}</strong></td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let n">
                <mat-chip [color]="n.status === 'Aberta' ? 'primary' : 'accent'" highlighted>
                  {{ n.status }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="totalItens">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Produtos</th>
              <td mat-cell *matCellDef="let n">{{ n.itens.length }}</td>
            </ng-container>

            <ng-container matColumnDef="qtdTotal">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Qtd. Total</th>
              <td mat-cell *matCellDef="let n">{{ qtdTotal(n) }}</td>
            </ng-container>

            <ng-container matColumnDef="criadaEm">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Criada em</th>
              <td mat-cell *matCellDef="let n">{{ n.criadaEm | date:'dd/MM/yyyy HH:mm' }}</td>
            </ng-container>

            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef>Ações</th>
              <td mat-cell *matCellDef="let n">
                <button mat-icon-button matTooltip="Ver detalhes" (click)="verDetalhes(n)">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button color="primary"
                  [disabled]="n.status !== 'Aberta'"
                  [matTooltip]="n.status !== 'Aberta' ? 'Nota já fechada' : 'Imprimir nota'"
                  (click)="imprimir(n)">
                  <mat-icon>print</mat-icon>
                </button>
                <button mat-icon-button color="warn"
                  [disabled]="n.status === 'Fechada'"
                  matTooltip="Excluir"
                  (click)="deletar(n)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas;" class="table-row"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" colspan="5">
                {{ carregando ? '' : 'Nenhuma nota fiscal encontrada.' }}
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
    .toolbar-filtro { display: flex; align-items: center; margin-bottom: 16px; }
    .full-width { width: 100%; }
    .table-container { position: relative; min-height: 200px; }
    .spinner-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); z-index: 10; }
    .table-row:hover { background: rgba(0,0,0,0.03); }
    .no-data { text-align: center; padding: 24px; color: #999; }
    .item-resumo { font-size: 0.85rem; }
  `]
})
export class NotasFiscaisComponent implements OnInit {
  colunas = ['numero', 'status', 'totalItens', 'qtdTotal', 'criadaEm', 'acoes'];
  dataSource = new MatTableDataSource<NotaFiscal>();
  carregando = false;
  filtroStatus: 'Todos' | 'Aberta' | 'Fechada' = 'Todos';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private service: NotaFiscalService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void { this.carregar(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (nota, filtro) =>
      !filtro || nota.status === filtro;
    this.dataSource.sortingDataAccessor = (nota, col) => {
      switch (col) {
        case 'totalItens': return nota.itens.length;
        case 'qtdTotal': return this.qtdTotal(nota);
        case 'status': return nota.status;
        case 'criadaEm': return nota.criadaEm;
        default: return (nota as any)[col];
      }
    };
  }

  qtdTotal(nota: NotaFiscal): number {
    return nota.itens.reduce((acc, i) => acc + i.quantidade, 0);
  }

  aplicarFiltro(): void {
    this.dataSource.filter = this.filtroStatus === 'Todos' ? '' : this.filtroStatus;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  carregar(): void {
    this.carregando = true;
    this.service.getAll()
      .pipe(finalize(() => this.carregando = false))
      .subscribe({ next: data => this.dataSource.data = data });
  }

  verDetalhes(nota: NotaFiscal): void {
    const ref = this.dialog.open(NotaDetalhesDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: nota
    });
    ref.afterClosed().subscribe(emitiu => {
      if (emitiu) this.carregar();
    });
  }

  imprimir(nota: NotaFiscal): void {
    const ref = this.dialog.open(ImpressaoDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      disableClose: true,
      data: nota
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.carregar();
    });
  }

  deletar(nota: NotaFiscal): void {
    if (!confirm(`Excluir nota fiscal #${nota.numero}?`)) return;
    this.service.deletar(nota.id).subscribe({
      next: () => {
        this.snack.open('Nota excluída.', 'OK', { duration: 3000 });
        this.carregar();
      }
    });
  }
}
