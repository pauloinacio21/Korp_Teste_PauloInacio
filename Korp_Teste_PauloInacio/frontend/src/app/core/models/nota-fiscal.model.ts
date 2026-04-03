export type StatusNota = 'Aberta' | 'Fechada';

export interface ItemNota {
  id: number;
  produtoId: number;
  produtoDescricao: string;
  produtoCodigo: string;
  quantidade: number;
}

export interface NotaFiscal {
  id: number;
  numero: number;
  status: StatusNota;
  criadaEm: string;
  fechadaEm?: string;
  itens: ItemNota[];
}

export interface CriarNotaDto {
  itens: {
    produtoId: number;
    produtoDescricao: string;
    produtoCodigo: string;
    quantidade: number;
  }[];
}
