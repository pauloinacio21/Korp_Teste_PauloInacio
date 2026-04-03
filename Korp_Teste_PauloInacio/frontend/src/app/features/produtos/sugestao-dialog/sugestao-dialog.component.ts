import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { ProdutoService, ReposicaoSugerida } from '../../../core/services/produto.service';

interface ItemReposicao extends ReposicaoSugerida {
  selecionado: boolean;
  quantidadeEditada: number;
}

@Component({
  selector: 'app-sugestao-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatProgressSpinnerModule, MatIconModule, MatDividerModule,
    MatCheckboxModule, MatInputModule, MatFormFieldModule,
    MatSnackBarModule, MatTableModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>psychology</mat-icon>
      Sugestão de Reposição (IA)
    </h2>

    <mat-dialog-content class="content">

      <!-- Carregando -->
      <div *ngIf="estado === 'carregando'" class="center">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Consultando a IA...</p>
      </div>

      <!-- Erro -->
      <div *ngIf="estado === 'erro'" class="erro">
        <mat-icon color="warn">error</mat-icon>
        <p>{{ erro }}</p>
      </div>

      <!-- Resultado -->
      <ng-container *ngIf="estado === 'resultado'">

        <ng-container *ngIf="itens.length > 0">
          <mat-divider></mat-divider>
          <div class="reposicao-header">
            <h3 class="reposicao-titulo">Repor Estoque</h3>
            <button mat-stroked-button type="button" (click)="toggleTodos()">
              <mat-icon>{{ todosSelecionados ? 'deselect' : 'select_all' }}</mat-icon>
              {{ todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos' }}
            </button>
          </div>
          <p class="reposicao-subtitulo">Ajuste as quantidades antes de confirmar.</p>

          <p class="modelo-info">
            <mat-icon class="icon-sm">smart_toy</mat-icon>
            Sugestões geradas pelo Claude (Anthropic)
          </p>

          <table mat-table [dataSource]="itens" class="itens-table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let item">
                <mat-checkbox [(ngModel)]="item.selecionado"></mat-checkbox>
              </td>
            </ng-container>
            <ng-container matColumnDef="produto">
              <th mat-header-cell *matHeaderCellDef>Produto</th>
              <td mat-cell *matCellDef="let item">
                <span class="produto-nome">{{ item.descricao }}</span>
                <span class="produto-codigo"> [{{ item.codigo }}]</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="saldo">
              <th mat-header-cell *matHeaderCellDef>Saldo atual</th>
              <td mat-cell *matCellDef="let item">{{ item.saldoAtual }}</td>
            </ng-container>
            <ng-container matColumnDef="quantidade">
              <th mat-header-cell *matHeaderCellDef>Qtd. a repor</th>
              <td mat-cell *matCellDef="let item">
                <mat-form-field appearance="outline" class="field-qtd">
                  <input matInput type="number" [(ngModel)]="item.quantidadeEditada" min="1" step="1"
                    [disabled]="!item.selecionado" />
                </mat-form-field>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas;" [class.row-desabilitada]="!row.selecionado"></tr>
          </table>

          <button mat-button class="btn-entenda" (click)="mostrarExplicacao = !mostrarExplicacao">
            <mat-icon>{{ mostrarExplicacao ? 'expand_less' : 'expand_more' }}</mat-icon>
            {{ mostrarExplicacao ? 'Ocultar explicação' : 'Entenda mais' }}
          </button>
          <pre *ngIf="mostrarExplicacao" class="sugestao-texto">{{ sugestao }}</pre>
        </ng-container>

        <div *ngIf="itens.length === 0 && sugestao" class="sem-itens">
          <p>{{ sugestao }}</p>
        </div>
      </ng-container>

      <!-- Reporindo -->
      <div *ngIf="estado === 'reporindo'" class="center">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Atualizando estoque...</p>
      </div>

      <!-- Sucesso -->
      <div *ngIf="estado === 'sucesso'" class="center sucesso">
        <mat-icon class="icon-lg">check_circle</mat-icon>
        <p>Estoque atualizado com sucesso!</p>
      </div>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <ng-container *ngIf="estado === 'resultado'">
        <button mat-button mat-dialog-close>Fechar</button>
        <button mat-raised-button color="primary"
          [disabled]="selecionados.length === 0 || temQuantidadeInvalida"
          (click)="repor()">
          <mat-icon>inventory</mat-icon>
          Repor Selecionados ({{ selecionados.length }})
        </button>
      </ng-container>
      <button *ngIf="estado === 'erro' || estado === 'sucesso'" mat-raised-button
        [color]="estado === 'sucesso' ? 'primary' : 'warn'"
        [mat-dialog-close]="estado === 'sucesso'">
        Fechar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .content { width: 100%; min-height: 120px; box-sizing: border-box; }
    .center { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0; }
    .modelo-info { display: flex; align-items: center; gap: 6px; color: #666; font-size: 0.85rem; margin: 0; }
    .icon-sm { font-size: 18px; height: 18px; width: 18px; }
    .icon-lg { font-size: 56px; height: 56px; width: 56px; color: #2e7d32; }
    .sugestao-texto { white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; line-height: 1.6; margin: 8px 0; background: #f9f9f9; padding: 12px; border-radius: 6px; border-left: 4px solid #1976d2; max-height: 220px; overflow-y: auto; }
    .erro { display: flex; align-items: center; gap: 8px; color: #c62828; padding: 16px 0; }
    .reposicao-header { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
    .reposicao-titulo { margin: 0; font-size: 1rem; }
    .reposicao-subtitulo { margin: 4px 0 12px; font-size: 0.85rem; color: #666; }
    .itens-table { width: 100%; }
    .field-qtd { width: 90px; margin: 4px 0; }
    .produto-nome { font-weight: 500; }
    .produto-codigo { color: #888; font-size: 0.85rem; }
    .row-desabilitada { opacity: 0.5; }
    .sucesso p { font-size: 1.1rem; font-weight: 500; color: #2e7d32; }
    .btn-entenda { margin-top: 8px; color: #666; font-size: 0.85rem; }
    .sem-itens { padding: 16px 0; color: #555; font-size: 0.95rem; }
  `]
})
export class SugestaoDialogComponent implements OnInit {
  estado: 'carregando' | 'resultado' | 'reporindo' | 'sucesso' | 'erro' = 'carregando';
  sugestao = '';
  erro = '';
  itens: ItemReposicao[] = [];
  colunas = ['select', 'produto', 'saldo', 'quantidade'];
  mostrarExplicacao = false;

  get selecionados() { return this.itens.filter(i => i.selecionado); }
  get todosSelecionados() { return this.itens.length > 0 && this.itens.every(i => i.selecionado); }
  get temQuantidadeInvalida() { return this.selecionados.some(i => !i.quantidadeEditada || i.quantidadeEditada < 1); }

  toggleTodos(): void {
    const marcar = !this.todosSelecionados;
    this.itens.forEach(i => i.selecionado = marcar);
  }

  constructor(private service: ProdutoService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.service.sugestaoReposicao().subscribe({
      next: (res) => {
        this.sugestao = res.sugestao ?? '';
        this.itens = (res.reposicoes ?? []).map(r => ({
          ...r,
          selecionado: true,
          quantidadeEditada: r.quantidadeSugerida
        }));
        this.estado = 'resultado';
      },
      error: (err) => {
        this.erro = err.error?.mensagem ?? 'Erro ao obter sugestão da IA.';
        this.estado = 'erro';
      }
    });
  }

  repor(): void {
    const selecionados = this.selecionados;
    if (selecionados.length === 0) return;
    this.estado = 'reporindo';

    const chamadas = selecionados.map(i =>
      this.service.repor(i.produtoId, Math.trunc(i.quantidadeEditada))
    );

    forkJoin(chamadas).subscribe({
      next: () => this.estado = 'sucesso',
      error: () => {
        this.estado = 'resultado';
        this.snack.open('Erro ao atualizar estoque. Tente novamente.', 'OK', { duration: 4000 });
      }
    });
  }
}
