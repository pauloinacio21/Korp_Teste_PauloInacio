import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { ProdutoService } from '../../../core/services/produto.service';
import { CategoriaService } from '../../../core/services/categoria.service';
import { Produto } from '../../../core/models/produto.model';

@Component({
  selector: 'app-produto-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ editando ? 'Editar Produto' : 'Novo Produto' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>Código *</mat-label>
          <input matInput formControlName="codigo" placeholder="Ex: PROD-001" />
          <mat-error *ngIf="form.get('codigo')?.hasError('required')">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Descrição *</mat-label>
          <input matInput formControlName="descricao" placeholder="Nome do produto" />
          <mat-error *ngIf="form.get('descricao')?.hasError('required')">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Saldo *</mat-label>
          <input matInput type="number" formControlName="saldo" min="0" />
          <mat-error *ngIf="form.get('saldo')?.hasError('required')">Obrigatório</mat-error>
          <mat-error *ngIf="form.get('saldo')?.hasError('min')">Deve ser >= 0</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Categoria</mat-label>
          <mat-select formControlName="categoria">
            <mat-option [value]="null">— Não informada —</mat-option>
            <mat-option *ngFor="let c of categorias" [value]="c">{{ c }}</mat-option>
          </mat-select>
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
    .form { display: flex; flex-direction: column; gap: 4px; width: 100%; min-width: 0; padding-top: 8px; }
    mat-form-field { width: 100%; }
    .btn-spinner { display: inline-block; margin-right: 8px; }
  `]
})
export class ProdutoDialogComponent implements OnInit {
  form = this.fb.group({
    codigo: ['', Validators.required],
    descricao: ['', Validators.required],
    saldo: [0, [Validators.required, Validators.min(0)]],
    categoria: [null as string | null]
  });

  salvando = false;
  editando = false;
  categorias: string[] = [];

  constructor(
    private fb: FormBuilder,
    private service: ProdutoService,
    private categoriaService: CategoriaService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<ProdutoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Produto | null
  ) {}

  ngOnInit(): void {
    this.categoriaService.getAll().subscribe({
      next: cats => this.categorias = cats.map(c => c.nome)
    });
    if (this.data) {
      this.editando = true;
      this.form.patchValue(this.data);
      this.form.get('codigo')?.disable(); // código imutável ao editar
    }
  }

  salvar(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    this.salvando = true;

    const dto = { codigo: val.codigo!, descricao: val.descricao!, saldo: val.saldo!, categoria: val.categoria };
    const op = this.editando
      ? this.service.atualizar(this.data!.id, dto)
      : this.service.criar(dto);


    op.pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.snack.open(this.editando ? 'Produto atualizado!' : 'Produto criado!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      }
    });
  }
}
