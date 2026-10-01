import type { StatusSaudeFonte } from '../dominio/fonte-de-audio.ts';
import { CONFIGURACAO_ESTRUTURAS } from './configuracao-estruturas.ts';

/**
 * Avalia se os seletores essenciais para a operação do adaptador estão disponíveis na página.
 */
export function avaliarSaudeDasEstruturas(raiz: Document | HTMLElement = document): StatusSaudeFonte {
  const ausentes: string[] = [];

  // Seletor crítico: painel de conversa principal
  const container = raiz.querySelector(CONFIGURACAO_ESTRUTURAS.seletores.containerConversa);
  if (!container) {
    ausentes.push('containerConversa');
  }

  if (ausentes.length > 0) {
    return {
      status: 'degradada',
      estruturasAusentes: ausentes,
      versaoEstruturas: CONFIGURACAO_ESTRUTURAS.versao
    };
  }

  return {
    status: 'ativa',
    versaoEstruturas: CONFIGURACAO_ESTRUTURAS.versao
  };
}
