import type { StatusSaudeFonte } from '../dominio/fonte-de-audio.ts';
import { CONFIGURACAO_ESTRUTURAS } from './configuracao-estruturas.ts';

/**
 * Avalia se as estruturas de que o adaptador depende existem na conversa aberta.
 * Sem conversa aberta não há o que conferir: o WhatsApp Web sempre carrega assim, e isso não é
 * degradação (EC-10).
 */
export function avaliarSaudeDasEstruturas(raiz: Document | HTMLElement = document): StatusSaudeFonte {
  const ausentes: string[] = [];

  const conversa = raiz.querySelector(CONFIGURACAO_ESTRUTURAS.seletores.containerConversa);
  if (conversa && !conversa.querySelector(CONFIGURACAO_ESTRUTURAS.seletores.containerMensagens)) {
    ausentes.push('containerMensagens');
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
