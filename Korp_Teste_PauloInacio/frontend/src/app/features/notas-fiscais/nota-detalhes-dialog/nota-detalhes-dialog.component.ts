import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotaFiscal } from '../../../core/models/nota-fiscal.model';
import { NotaFiscalService } from '../../../core/services/nota-fiscal.service';

@Component({
  selector: 'app-nota-detalhes-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule,
    MatTableModule, MatIconModule, MatChipsModule, MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title class="titulo">
        <mat-icon>receipt_long</mat-icon>
        Nota Fiscal #{{ nota.numero }}
      </h2>
      <mat-chip [color]="nota.status === 'Aberta' ? 'primary' : 'accent'" highlighted class="chip-status">
        {{ nota.status }}
      </mat-chip>
    </div>

    <mat-dialog-content class="content">

      <!-- Processando -->
      <div *ngIf="estado === 'processando'" class="centro">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Emitindo nota fiscal...</p>
      </div>

      <!-- Sucesso -->
      <div *ngIf="estado === 'sucesso'" class="centro sucesso">
        <mat-icon class="icon-lg">check_circle</mat-icon>
        <p>Nota fiscal emitida com sucesso!</p>
      </div>

      <!-- Erro -->
      <div *ngIf="estado === 'erro'" class="centro erro">
        <mat-icon>error_outline</mat-icon>
        <p>{{ mensagemErro }}</p>
      </div>

      <!-- Visualização -->
      <ng-container *ngIf="estado === 'view'">
        <div class="meta">
          <span><strong>Criada em:</strong> {{ nota.criadaEm | date:'dd/MM/yyyy HH:mm' }}</span>
          <span *ngIf="nota.fechadaEm"><strong>Emitida em:</strong> {{ nota.fechadaEm | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>

        <mat-divider style="margin: 12px 0"></mat-divider>

        <table mat-table [dataSource]="nota.itens" class="itens-table">
          <ng-container matColumnDef="codigo">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let item">{{ item.produtoCodigo }}</td>
          </ng-container>

          <ng-container matColumnDef="descricao">
            <th mat-header-cell *matHeaderCellDef>Produto</th>
            <td mat-cell *matCellDef="let item">{{ item.produtoDescricao }}</td>
          </ng-container>

          <ng-container matColumnDef="quantidade">
            <th mat-header-cell *matHeaderCellDef style="text-align:right">Qtd.</th>
            <td mat-cell *matCellDef="let item" style="text-align:right"><strong>{{ item.quantidade }}</strong></td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas;" class="item-row"></tr>
        </table>

        <mat-divider style="margin: 12px 0"></mat-divider>

        <div class="totais">
          <span>{{ nota.itens.length }} produto(s)</span>
          <span><strong>Total de itens:</strong> {{ qtdTotal }}</span>
        </div>
      </ng-container>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <ng-container *ngIf="estado === 'view'">
        <button mat-button mat-dialog-close>Fechar</button>
        <button *ngIf="nota.status === 'Aberta'" mat-raised-button color="primary" (click)="emitir()">
          <mat-icon>send</mat-icon>
          Emitir Nota
        </button>
      </ng-container>
      <button *ngIf="estado === 'erro'" mat-raised-button color="warn" (click)="estado = 'view'">
        Tentar novamente
      </button>
      <button *ngIf="estado === 'sucesso'" mat-raised-button color="primary" (click)="dialogRef.close(true)">
        Fechar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px 0; }
    .titulo { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.2rem; }
    .chip-status { margin-top: 4px; }
    .content { min-height: 120px; box-sizing: border-box; }
    .meta { display: flex; gap: 24px; flex-wrap: wrap; color: #555; font-size: 0.9rem; }
    .itens-table { width: 100%; }
    .item-row:hover { background: rgba(0,0,0,0.03); }
    .totais { display: flex; justify-content: space-between; color: #555; font-size: 0.9rem; }
    .centro { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; gap: 12px; color: #666; }
    .sucesso p { font-size: 1.1rem; font-weight: 500; color: #2e7d32; }
    .icon-lg { font-size: 56px; height: 56px; width: 56px; color: #2e7d32; }
    .erro { color: #c62828; }
  `]
})
export class NotaDetalhesDialogComponent {
  colunas = ['codigo', 'descricao', 'quantidade'];
  estado: 'view' | 'processando' | 'sucesso' | 'erro' = 'view';
  mensagemErro = '';

  get qtdTotal(): number {
    return this.nota.itens.reduce((acc, i) => acc + i.quantidade, 0);
  }

  constructor(
    public dialogRef: MatDialogRef<NotaDetalhesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public nota: NotaFiscal,
    private service: NotaFiscalService
  ) {}

  emitir(): void {
    this.estado = 'processando';
    this.service.imprimir(this.nota.id).subscribe({
      next: () => this.estado = 'sucesso',
      error: err => {
        this.mensagemErro = err?.error?.mensagem ?? 'Erro ao emitir nota fiscal.';
        this.estado = 'erro';
      }
    });
  }
}
