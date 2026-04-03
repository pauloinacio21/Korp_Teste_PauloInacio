import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { CategoriaService } from '../../../core/services/categoria.service';
import { Categoria } from '../../../core/models/categoria.model';

@Component({
  selector: 'app-categoria-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatInputModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ editando ? 'Editar Categoria' : 'Nova Categoria' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>Nome *</mat-label>
          <input matInput formControlName="nome" placeholder="Ex: Alta Rotatividade" />
          <mat-error *ngIf="form.get('nome')?.hasError('required')">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Estoque alvo *</mat-label>
          <input matInput type="number" formControlName="estoqueAlvo" min="1" />
          <mat-hint>Abaixo desse valor a IA sugere reposição</mat-hint>
          <mat-error *ngIf="form.get('estoqueAlvo')?.hasError('required')">Obrigatório</mat-error>
          <mat-error *ngIf="form.get('estoqueAlvo')?.hasError('min')">Deve ser >= 1</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Estoque mínimo</mat-label>
          <input matInput type="number" formControlName="estoqueMinimo" min="0" />
          <mat-hint>Se o saldo cair abaixo disso, repõe automaticamente até esse valor. 0 = desabilitado.</mat-hint>
          <mat-error *ngIf="form.get('estoqueMinimo')?.hasError('min')">Deve ser >= 0</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" (click)="salvar()" [disabled]="salvando || form.invalid">
        <mat-spinner *ngIf="salvando" diameter="20" class="btn-spinner"></mat-spinner>
        {{ salvando ? 'Salvando...' : 'Salvar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 20px; width: 100%; min-width: 0; padding-top: 8px; }
    mat-form-field { width: 100%; }
    .btn-spinner { display: inline-block; margin-right: 8px; }
  `]
})
export class CategoriaDialogComponent implements OnInit {
  form = this.fb.group({
    nome: ['', Validators.required],
    estoqueAlvo: [1, [Validators.required, Validators.min(1)]],
    estoqueMinimo: [0, Validators.min(0)]
  });

  salvando = false;
  editando = false;

  constructor(
    private fb: FormBuilder,
    private service: CategoriaService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<CategoriaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Categoria | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.editando = true;
      this.form.patchValue(this.data);
    }
  }

  salvar(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    this.salvando = true;

    const dto = {
      nome: val.nome!,
      estoqueAlvo: val.estoqueAlvo!,
      estoqueMinimo: val.estoqueMinimo ?? 0
    };
    const op = this.editando
      ? this.service.atualizar(this.data!.id, dto)
      : this.service.criar(dto);

    op.pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.snack.open(this.editando ? 'Categoria atualizada!' : 'Categoria criada!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      }
    });
  }
}
