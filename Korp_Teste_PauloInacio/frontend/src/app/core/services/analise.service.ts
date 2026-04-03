import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tendencia {
  codigo: string;
  descricao: string;
  tendencia: 'crescente' | 'decrescente' | 'estável';
  sugestaoAlvo: number;
  motivo: string;
}

export interface Anomalia {
  codigo: string;
  descricao: string;
  tipo: 'alta' | 'baixa';
  fator: number;
  motivo: string;
}

export interface AnaliseConsumo {
  analise: string;
  tendencias: Tendencia[];
  anomalias: Anomalia[];
}

@Injectable({ providedIn: 'root' })
export class AnaliseService {
  private readonly url = `${environment.estoqueApiUrl}/api/analise`;

  constructor(private http: HttpClient) {}

  analiseConsumo(): Observable<AnaliseConsumo> {
    return this.http.get<AnaliseConsumo>(`${this.url}/consumo`);
  }
}
