import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Produto, CriarProdutoDto, AtualizarProdutoDto } from '../models/produto.model';
import { environment } from '../../../environments/environment';

export interface ReposicaoSugerida {
  produtoId: number;
  codigo: string;
  descricao: string;
  saldoAtual: number;
  quantidadeSugerida: number;
}

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly url = `${environment.estoqueApiUrl}/api/produtos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Produto[]> {
    return this.http.get<Produto[]>(this.url).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getById(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${this.url}/${id}`);
  }

  criar(dto: CriarProdutoDto): Observable<Produto> {
    return this.http.post<Produto>(this.url, dto).pipe(
      catchError(err => throwError(() => err))
    );
  }

  atualizar(id: number, dto: AtualizarProdutoDto): Observable<Produto> {
    return this.http.put<Produto>(`${this.url}/${id}`, dto).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  sugestaoReposicao(): Observable<{ sugestao: string; reposicoes: ReposicaoSugerida[] }> {
    return this.http.get<{ sugestao: string; reposicoes: ReposicaoSugerida[] }>(`${this.url}/sugestao-reposicao`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  repor(id: number, quantidade: number): Observable<Produto> {
    return this.http.patch<Produto>(`${this.url}/${id}/repor`, { quantidade }).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
