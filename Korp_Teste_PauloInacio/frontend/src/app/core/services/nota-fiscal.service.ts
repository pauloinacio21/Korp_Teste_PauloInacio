import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { NotaFiscal, CriarNotaDto } from '../models/nota-fiscal.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotaFiscalService {
  private readonly url = `${environment.faturamentoApiUrl}/api/notasfiscais`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<NotaFiscal[]> {
    return this.http.get<NotaFiscal[]>(this.url).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getById(id: number): Observable<NotaFiscal> {
    return this.http.get<NotaFiscal>(`${this.url}/${id}`);
  }

  criar(dto: CriarNotaDto): Observable<NotaFiscal> {
    return this.http.post<NotaFiscal>(this.url, dto).pipe(
      catchError(err => throwError(() => err))
    );
  }

  imprimir(id: number): Observable<NotaFiscal> {
    return this.http.post<NotaFiscal>(`${this.url}/${id}/imprimir`, {}).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
