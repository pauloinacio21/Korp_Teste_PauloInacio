import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnaliseService, AnaliseConsumo, Tendencia, Anomalia } from '../../../core/services/analise.service';

type Estado = 'carregando' | 'resultado' | 'erro';

@Component({
  selector: 'app-analise-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTableModule, MatChipsModule,
    MatDividerModule, MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
      <mat-icon>insights</mat-icon>
      Análise de Consumo
    </h2>

    <mat-dialog-content class="content">

      <!-- Carregando -->
      <div *ngIf="estado === 'carregando'" class="centro">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Analisando histórico de consumo...</p>
      </div>

      <!-- Erro -->
      <div *ngIf="estado === 'erro'" class="centro erro">
        <mat-icon>error_outline</mat-icon>
        <p>{{ mensagemErro }}</p>
      </div>

      <!-- Resultado -->
      <div *ngIf="estado === 'resultado' && resultado">

        <!-- Análise textual -->
        <div class="analise-texto">{{ resultado.analise }}</div>

        <!-- Tendências -->
        <ng-container *ngIf="resultado.tendencias.length > 0">
          <mat-divider style="margin: 16px 0"></mat-divider>
          <h3 class="secao-titulo">
            <mat-icon>trending_up</mat-icon>
            Tendências identificadas
          </h3>
          <table mat-table [dataSource]="resultado.tendencias" class="tabela-analise">
            <ng-container matColumnDef="produto">
              <th mat-header-cell *matHeaderCellDef>Produto</th>
              <td mat-cell *matCellDef="let t">
                <span class="cod">{{ t.codigo }}</span> {{ t.descricao }}
              </td>
            </ng-container>

            <ng-container matColumnDef="tendencia">
              <th mat-header-cell *matHeaderCellDef>Tendência</th>
              <td mat-cell *matCellDef="let t">
                <mat-chip [color]="corTendencia(t.tendencia)" highlighted style="font-size:0.78rem">
                  <mat-icon style="font-size:14px;height:14px;width:14px;margin-right:4px">{{ iconeTendencia(t.tendencia) }}</mat-icon>
                  {{ t.tendencia }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="sugestao">
              <th mat-header-cell *matHeaderCellDef>Alvo sugerido</th>
              <td mat-cell *matCellDef="let t">
                <span *ngIf="t.sugestaoAlvo > 0" class="sugestao-alvo">{{ t.sugestaoAlvo }} un.</span>
                <span *ngIf="t.sugestaoAlvo === 0" style="color:#bbb">—</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="motivo">
              <th mat-header-cell *matHeaderCellDef>Observação</th>
              <td mat-cell *matCellDef="let t" class="motivo-cel">{{ t.motivo }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="colunasTendencia"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasTendencia;" class="table-row"></tr>
          </table>
        </ng-container>

        <!-- Anomalias -->
        <ng-container *ngIf="resultado.anomalias.length > 0">
          <mat-divider style="margin: 16px 0"></mat-divider>
          <h3 class="secao-titulo">
            <mat-icon color="warn">warning_amber</mat-icon>
            Anomalias detectadas
          </h3>
          <table mat-table [dataSource]="resultado.anomalias" class="tabela-analise">
            <ng-container matColumnDef="produto">
              <th mat-header-cell *matHeaderCellDef>Produto</th>
              <td mat-cell *matCellDef="let a">
                <span class="cod">{{ a.codigo }}</span> {{ a.descricao }}
              </td>
            </ng-container>

            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let a">
                <mat-chip [color]="a.tipo === 'alta' ? 'warn' : 'accent'" highlighted style="font-size:0.78rem">
                  <mat-icon style="font-size:14px;height:14px;width:14px;margin-right:4px">
                    {{ a.tipo === 'alta' ? 'arrow_upward' : 'arrow_downward' }}
                  </mat-icon>
                  {{ a.tipo === 'alta' ? 'Consumo alto' : 'Consumo baixo' }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="fator">
              <th mat-header-cell *matHeaderCellDef>Variação</th>
              <td mat-cell *matCellDef="let a">
                <span class="fator" [style.color]="a.tipo === 'alta' ? '#b71c1c' : '#1565c0'">
                  {{ a.fator | number:'1.1-1' }}x
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="motivo">
              <th mat-header-cell *matHeaderCellDef>Interpretação</th>
              <td mat-cell *matCellDef="let a" class="motivo-cel">{{ a.motivo }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="colunasAnomalia"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasAnomalia;" class="table-row"></tr>
          </table>
        </ng-container>

        <div *ngIf="resultado.tendencias.length === 0 && resultado.anomalias.length === 0" class="tudo-ok">
          <mat-icon color="primary">check_circle</mat-icon>
          <span>Nenhuma tendência ou anomalia relevante identificada no período.</span>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .titulo { display: flex; align-items: center; gap: 8px; }
    .content { width: 100%; min-height: 120px; box-sizing: border-box; }
    .centro { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; gap: 12px; color: #666; }
    .erro { color: #c62828; }
    .analise-texto { white-space: pre-wrap; font-size: 0.93rem; line-height: 1.6; color: #333; background: #f9f9f9; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #1976d2; }
    .secao-titulo { display: flex; align-items: center; gap: 6px; margin: 0 0 8px 0; font-size: 0.95rem; color: #444; }
    .tabela-analise { width: 100%; }
    .table-row:hover { background: rgba(0,0,0,0.02); }
    .cod { font-family: monospace; font-size: 0.8rem; background: #eee; padding: 1px 5px; border-radius: 4px; margin-right: 4px; }
    .motivo-cel { font-size: 0.85rem; color: #555; max-width: 280px; }
    .sugestao-alvo { background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .fator { font-weight: 700; font-size: 1rem; }
    .tudo-ok { display: flex; align-items: center; gap: 8px; padding: 16px 0; color: #555; }
  `]
})
export class AnaliseDialogComponent implements OnInit {
  estado: Estado = 'carregando';
  resultado: AnaliseConsumo | null = null;
  mensagemErro = '';

  colunasTendencia = ['produto', 'tendencia', 'sugestao', 'motivo'];
  colunasAnomalia = ['produto', 'tipo', 'fator', 'motivo'];

  constructor(
    private service: AnaliseService,
    private dialogRef: MatDialogRef<AnaliseDialogComponent>
  ) {}

  ngOnInit(): void {
    this.service.analiseConsumo().subscribe({
      next: res => { this.resultado = res; this.estado = 'resultado'; },
      error: err => {
        this.mensagemErro = err?.error?.mensagem ?? 'Erro ao carregar análise.';
        this.estado = 'erro';
      }
    });
  }

  iconeTendencia(t: string): string {
    return t === 'crescente' ? 'trending_up' : t === 'decrescente' ? 'trending_down' : 'trending_flat';
  }

  corTendencia(t: string): string {
    return t === 'crescente' ? 'warn' : t === 'decrescente' ? 'accent' : 'primary';
  }
}
