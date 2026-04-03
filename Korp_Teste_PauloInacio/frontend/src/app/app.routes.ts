import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'produtos', pathMatch: 'full' },
  {
    path: 'produtos',
    loadComponent: () =>
      import('./features/produtos/produtos.component').then(m => m.ProdutosComponent)
  },
  {
    path: 'notas-fiscais',
    loadComponent: () =>
      import('./features/notas-fiscais/notas-fiscais.component').then(m => m.NotasFiscaisComponent)
  },
  {
    path: 'notas-fiscais/nova',
    loadComponent: () =>
      import('./features/notas-fiscais/nova-nota/nova-nota.component').then(m => m.NovaNotaComponent)
  },
  {
    path: 'categorias',
    loadComponent: () =>
      import('./features/categorias/categorias.component').then(m => m.CategoriasComponent)
  }
];
