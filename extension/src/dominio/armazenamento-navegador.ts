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
  esperaAcumuladaMs: number; // soma das esperas sem fila das transcrições contadas
  audioAcumuladoMs: number; // soma das durações dos mesmos áudios
}

export interface MetricasContadores {
  lidos: number;
  ouvidos: number;
  lidosETocados: number;
  inicioContagem: string;
  taxaAdocaoPercentual: number | null; // null se denominador for zero
  taxaQualidadePercentual: number | null; // null se lidos for zero
  esperaMediaSegPorMinuto: number | null; // null sem áudio acumulado
}

type TotaisDeEspera = 'esperaAcumuladaMs' | 'audioAcumuladoMs';

const totalValido = (valor: unknown): number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? Math.round(valor) : 0;

/**
 * Completa com 0 os totais de espera ausentes ou inválidos, como num registro gravado antes deles.
 */
export function completarContadores(
  salvos: Omit<ContadoresPersistidos, TotaisDeEspera> & Partial<Pick<ContadoresPersistidos, TotaisDeEspera>>
): ContadoresPersistidos {
  return {
    ...salvos,
    esperaAcumuladaMs: totalValido(salvos.esperaAcumuladaMs),
    audioAcumuladoMs: totalValido(salvos.audioAcumuladoMs)
  };
}

export interface ArmazenamentoNavegador {
  carregarContadores(): Promise<ContadoresPersistidos>;
  salvarContadores(contadores: ContadoresPersistidos): Promise<void>;
  zerarContadores(): Promise<ContadoresPersistidos>;
}
