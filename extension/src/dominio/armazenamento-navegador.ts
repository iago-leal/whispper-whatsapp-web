/**
 * Porta hexagonal ArmazenamentoNavegador.
 *
 * Contrato puro de persistência dos contadores da extensão.
 * Nenhum código ou tipo específico de navegador (Chrome, WebExtensions)
 * pode vazar por esta interface.
 */

export interface ContadoresPersistidos {
  lidos: number;
  ouvidos: number;
  lidosETocados: number;
  inicioContagem: string; // Timestamp ISO 8601
}

export interface MetricasContadores {
  lidos: number;
  ouvidos: number;
  lidosETocados: number;
  inicioContagem: string;
  taxaAdocaoPercentual: number | null; // null se denominador for zero
  taxaQualidadePercentual: number | null; // null se lidos for zero
}

export interface ArmazenamentoNavegador {
  carregarContadores(): Promise<ContadoresPersistidos>;
  salvarContadores(contadores: ContadoresPersistidos): Promise<void>;
  zerarContadores(): Promise<ContadoresPersistidos>;
}
