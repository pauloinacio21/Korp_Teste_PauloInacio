import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { NotaFiscalService } from '../../../core/services/nota-fiscal.service';
import { NotaFiscal } from '../../../core/models/nota-fiscal.model';

type Estado = 'confirmando' | 'processando' | 'sucesso' | 'erro';
type TipoErro = 'negocio' | 'infra';

@Component({
  selector: 'app-impressao-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Impressão de Nota Fiscal</h2>

    <mat-dialog-content class="content">
      <!-- Confirmação -->
      <ng-container *ngIf="estado === 'confirmando'">
        <p>Deseja imprimir a <strong>Nota Fiscal #{{ nota.numero }}</strong>?</p>
        <p class="aviso">
          <mat-icon color="warn" class="icon-sm">warning</mat-icon>
          Esta ação irá fechar a nota e deduzir o saldo dos produtos.
        </p>
      </ng-container>

      <!-- Processando -->
      <ng-container *ngIf="estado === 'processando'">
        <div class="center">
          <mat-spinner diameter="56"></mat-spinner>
          <p>Processando impressão...</p>
        </div>
      </ng-container>

      <!-- Sucesso -->
      <ng-container *ngIf="estado === 'sucesso'">
        <div class="center sucesso">
          <mat-icon class="icon-lg">check_circle</mat-icon>
          <p>Nota fiscal impressa com sucesso!</p>
          <p class="sub">Status atualizado para <strong>Fechada</strong>.</p>
        </div>
      </ng-container>

      <!-- Erro -->
      <ng-container *ngIf="estado === 'erro'">
        <div class="center erro">
          <!-- Falha de infraestrutura / serviço indisponível -->
          <ng-container *ngIf="tipoErro === 'infra'">
            <mat-icon class="icon-lg infra">cloud_off</mat-icon>
            <p class="erro-titulo">Falha de comunicação com o serviço de estoque</p>
            <p class="sub">O serviço não respondeu ou retornou um erro inesperado. Verifique se os serviços estão no ar e tente novamente.</p>
            <p class="sub codigo-erro">Código: {{ codigoHttp }}</p>
          </ng-container>

          <!-- Erro de negócio (saldo, produto não encontrado, etc.) -->
          <ng-container *ngIf="tipoErro === 'negocio'">
            <mat-icon class="icon-lg">error</mat-icon>
            <p class="erro-titulo">{{ mensagemErro }}</p>
            <ul *ngIf="errosDetalhe.length" class="erros-lista">
              <li *ngFor="let e of errosDetalhe">{{ e }}</li>
            </ul>
          </ng-container>
        </div>
      </ng-container>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <ng-container *ngIf="estado === 'confirmando'">
        <button mat-button (click)="fechar()">Cancelar</button>
        <button mat-raised-button color="primary" (click)="confirmar()">
          <mat-icon>print</mat-icon> Confirmar Impressão
        </button>
      </ng-container>

      <ng-container *ngIf="estado === 'sucesso' || estado === 'erro'">
        <button mat-raised-button [color]="estado === 'sucesso' ? 'primary' : 'warn'" (click)="fechar(estado === 'sucesso')">
          Fechar
        </button>
      </ng-container>
    </mat-dialog-actions>
  `,
  styles: [`
    .content { min-width: 320px; min-height: 120px; }
    .center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px 0; }
    .aviso { display: flex; align-items: center; gap: 6px; color: #e65100; font-size: 0.9rem; }
    .icon-sm { font-size: 18px; height: 18px; width: 18px; }
    .icon-lg { font-size: 56px; height: 56px; width: 56px; }
    .sucesso .icon-lg { color: #2e7d32; }
    .erro .icon-lg { color: #c62828; }
    .erro .icon-lg.infra { color: #e65100; }
    .erro-titulo { font-size: 1rem; font-weight: 600; text-align: center; color: #333; margin: 0; }
    .sub { color: #666; font-size: 0.88rem; text-align: center; margin: 0; }
    .codigo-erro { font-family: monospace; color: #999; font-size: 0.8rem; }
    .erros-lista { text-align: left; color: #c62828; font-size: 0.85rem; margin: 4px 0 0; padding-left: 20px; width: 100%; }
    .erros-lista li { margin-bottom: 4px; }
  `]
})
export class ImpressaoDialogComponent {
  estado: Estado = 'confirmando';
  tipoErro: TipoErro = 'negocio';
  mensagemErro = '';
  errosDetalhe: string[] = [];
  codigoHttp = 0;

  constructor(
    private service: NotaFiscalService,
    private dialogRef: MatDialogRef<ImpressaoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public nota: NotaFiscal
  ) {}

  confirmar(): void {
    this.estado = 'processando';
    this.service.imprimir(this.nota.id).subscribe({
      next: () => this.estado = 'sucesso',
      error: (err) => {
        this.estado = 'erro';
        this.codigoHttp = err.status ?? 0;
        this.tipoErro = (err.status === 0 || err.status >= 500) ? 'infra' : 'negocio';
        this.mensagemErro = err.error?.mensagem ?? 'Erro de comunicação com o servidor.';
        this.errosDetalhe = err.error?.erros ?? [];
      }
    });
  }

  fechar(sucesso = false): void {
    this.dialogRef.close(sucesso);
  }
}
