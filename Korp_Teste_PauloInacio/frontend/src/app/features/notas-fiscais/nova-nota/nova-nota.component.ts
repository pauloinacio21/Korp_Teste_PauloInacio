import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { ProdutoService } from '../../../core/services/produto.service';
import { NotaFiscalService } from '../../../core/services/nota-fiscal.service';
import { Produto } from '../../../core/models/produto.model';

interface ItemAdicionado {
  produtoId: number;
  produtoDescricao: string;
  produtoCodigo: string;
  quantidade: number;
}

@Component({
  selector: 'app-nova-nota',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatTableModule,
    MatCardModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule, MatTooltipModule
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">
        <mat-icon>add_circle</mat-icon>
        Nova Nota Fiscal
      </h1>
      <button mat-button routerLink="/notas-fiscais">
        <mat-icon>arrow_back</mat-icon> Voltar
      </button>
    </div>

    <mat-card>
      <mat-card-content>

        <!-- Formulário de adição -->
        <h3 class="section-title">Adicionar Produto</h3>
        <div [formGroup]="itemForm" class="add-row">
          <mat-form-field appearance="outline" class="field-produto">
            <mat-label>Produto</mat-label>
            <mat-select formControlName="produtoId" (selectionChange)="onProdutoSelecionado($event.value)">
              <mat-option *ngFor="let p of produtos" [value]="p.id">
                [{{ p.codigo }}] {{ p.descricao }} — saldo: {{ p.saldo }}
              </mat-option>
            </mat-select>
            <mat-error>Obrigatório</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="field-qtd">
            <mat-label>Quantidade</mat-label>
            <input matInput type="number" formControlName="quantidade" min="1" step="1"
              (blur)="forcarInteiro()" />
            <mat-error>Mínimo 1</mat-error>
          </mat-form-field>

          <button mat-icon-button color="primary" type="button"
            [disabled]="itemForm.invalid"
            matTooltip="Adicionar à nota"
            (click)="adicionarItem()">
            <mat-icon>add_circle</mat-icon>
          </button>
        </div>

        <mat-divider></mat-divider>
        <br />

        <!-- Lista de itens adicionados -->
        <h3 class="section-title">Itens da Nota</h3>

        <div *ngIf="itensAdicionados.length === 0" class="empty-itens">
          <mat-icon>info</mat-icon>
          <p>Nenhum produto adicionado ainda.</p>
        </div>

        <table *ngIf="itensAdicionados.length > 0" mat-table [dataSource]="itensAdicionados" class="itens-table">
          <ng-container matColumnDef="codigo">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let item">{{ item.produtoCodigo }}</td>
          </ng-container>
          <ng-container matColumnDef="descricao">
            <th mat-header-cell *matHeaderCellDef>Produto</th>
            <td mat-cell *matCellDef="let item">{{ item.produtoDescricao }}</td>
          </ng-container>
          <ng-container matColumnDef="quantidade">
            <th mat-header-cell *matHeaderCellDef>Quantidade</th>
            <td mat-cell *matCellDef="let item">{{ item.quantidade }}</td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let item; let i = index">
              <button mat-icon-button color="warn" matTooltip="Remover" (click)="removerItem(i)">
                <mat-icon>remove_circle_outline</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunasItens"></tr>
          <tr mat-row *matRowDef="let row; columns: colunasItens;"></tr>
        </table>

        <mat-divider></mat-divider>
        <br />

        <div class="actions">
          <span class="total-itens">{{ itensAdicionados.length }} item(ns) | Qtd. total: {{ qtdTotal }}</span>
          <button mat-raised-button color="primary"
            [disabled]="salvando || itensAdicionados.length === 0"
            (click)="salvar()">
            <mat-spinner *ngIf="salvando" diameter="20" class="btn-spinner"></mat-spinner>
            <mat-icon *ngIf="!salvando">save</mat-icon>
            {{ salvando ? 'Salvando...' : 'Criar Nota Fiscal' }}
          </button>
        </div>

      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.5rem; }
    .section-title { margin: 0 0 12px 0; font-size: 1rem; color: #555; }
    .add-row { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .field-produto { flex: 1; }
    .field-qtd { width: 140px; }
    .itens-table { width: 100%; margin-bottom: 16px; }
    .empty-itens { display: flex; align-items: center; gap: 8px; color: #999; padding: 16px 0; }
    .actions { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; }
    .total-itens { color: #666; font-size: 0.9rem; }
    .btn-spinner { display: inline-block; margin-right: 8px; }
  `]
})
export class NovaNotaComponent implements OnInit {
  itemForm = this.fb.group({
    produtoId: [null as number | null, Validators.required],
    quantidade: [1, [Validators.required, Validators.min(1)]]
  });

  produtos: Produto[] = [];
  itensAdicionados: ItemAdicionado[] = [];
  colunasItens = ['codigo', 'descricao', 'quantidade', 'acoes'];
  salvando = false;

  private produtoSelecionado: Produto | null = null;

  get qtdTotal(): number {
    return this.itensAdicionados.reduce((acc, i) => acc + i.quantidade, 0);
  }

  constructor(
    private fb: FormBuilder,
    private produtoService: ProdutoService,
    private notaService: NotaFiscalService,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.produtoService.getAll().subscribe(p => this.produtos = p);
  }

  onProdutoSelecionado(id: number): void {
    this.produtoSelecionado = this.produtos.find(p => p.id === id) ?? null;
  }

  forcarInteiro(): void {
    const ctrl = this.itemForm.get('quantidade');
    if (ctrl) {
      const val = Math.max(1, Math.trunc(Number(ctrl.value) || 1));
      ctrl.setValue(val);
    }
  }

  adicionarItem(): void {
    if (this.itemForm.invalid || !this.produtoSelecionado) return;
    const { quantidade } = this.itemForm.getRawValue();
    this.itensAdicionados = [...this.itensAdicionados, {
      produtoId: this.produtoSelecionado.id,
      produtoDescricao: this.produtoSelecionado.descricao,
      produtoCodigo: this.produtoSelecionado.codigo,
      quantidade: quantidade!
    }];
    this.itemForm.reset({ produtoId: null, quantidade: 1 });
    this.produtoSelecionado = null;
  }

  removerItem(i: number): void {
    this.itensAdicionados = this.itensAdicionados.filter((_, idx) => idx !== i);
  }

  salvar(): void {
    if (this.itensAdicionados.length === 0) return;
    this.salvando = true;

    this.notaService.criar({ itens: this.itensAdicionados })
      .pipe(finalize(() => this.salvando = false))
      .subscribe({
        next: (nota) => {
          this.snack.open(`Nota Fiscal #${nota.numero} criada com sucesso!`, 'OK', { duration: 4000 });
          this.router.navigate(['/notas-fiscais']);
        }
      });
  }
}
