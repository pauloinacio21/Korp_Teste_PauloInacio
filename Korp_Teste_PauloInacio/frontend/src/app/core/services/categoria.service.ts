import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Categoria } from '../models/categoria.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly url = `${environment.estoqueApiUrl}/api/categorias`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.url).pipe(
      catchError(err => throwError(() => err))
    );
  }

  criar(categoria: Omit<Categoria, 'id'>): Observable<Categoria> {
    return this.http.post<Categoria>(this.url, categoria).pipe(
      catchError(err => throwError(() => err))
    );
  }

  atualizar(id: number, categoria: Omit<Categoria, 'id'>): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.url}/${id}`, { id, ...categoria }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
