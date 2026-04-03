export interface Produto {
  id: number;
  codigo: string;
  descricao: string;
  saldo: number;
  categoria?: string | null;
  criadoEm: string;
}

export interface CriarProdutoDto {
  codigo: string;
  descricao: string;
  saldo: number;
  categoria?: string | null;
}

export interface AtualizarProdutoDto {
  codigo: string;
  descricao: string;
  saldo: number;
  categoria?: string | null;
}
