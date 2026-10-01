import { CONFIGURACAO_ESTRUTURAS } from './configuracao-estruturas.ts';
import type { EstadoPedidoIcone } from '../dominio/fonte-de-audio.ts';
import type { CronometroDeEspera } from './cronometro-espera.ts';

export type EstadoBotao = 'idle' | 'transcrevendo' | 'concluido' | 'erro';

const CLASSE_CONTADOR = 'whispper-contador';

/**
 * Cria o elemento HTML do botão de transcrição do Whispper.
 */
export function criarBotaoTranscricao(
  idAudio: string,
  aoClicar: (idAudio: string) => void
): HTMLButtonElement {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'whispper-btn-transcrever';
  botao.setAttribute('aria-label', 'Transcrever áudio');
  botao.setAttribute('title', 'Transcrever áudio com Whispper');
  botao.setAttribute(CONFIGURACAO_ESTRUTURAS.atributos.marcadorInjetado, 'true');
  botao.setAttribute(CONFIGURACAO_ESTRUTURAS.atributos.idMensagem, idAudio);

  // SVG compacto com símbolo de texto / transcrição
  botao.innerHTML = `
    <svg class="whispper-icone" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <line x1="8" y1="9" x2="16" y2="9"></line>
      <line x1="8" y1="13" x2="14" y2="13"></line>
    </svg>
    <span class="${CLASSE_CONTADOR}" aria-hidden="true"></span>
  `;

  const disparar = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    aoClicar(idAudio);
  };

  botao.addEventListener('click', disparar);
  botao.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      disparar(e);
    }
  });

  return botao;
}

/**
 * Atualiza visualmente o estado do botão de transcrição.
 */
export function atualizarEstadoBotao(botao: HTMLElement, estado: EstadoBotao): void {
  botao.setAttribute('data-whispper-estado', estado);
  botao.classList.remove('whispper-animando', 'whispper-concluido', 'whispper-erro');
  if (estado === 'transcrevendo') {
    botao.setAttribute('aria-label', 'Transcrevendo áudio');
    botao.classList.add('whispper-animando');
  } else if (estado === 'concluido') {
    botao.setAttribute('aria-label', 'Áudio transcrito');
    botao.classList.add('whispper-concluido');
  } else if (estado === 'erro') {
    botao.setAttribute('aria-label', 'Erro na transcrição');
    botao.classList.add('whispper-erro');
  } else {
    botao.setAttribute('aria-label', 'Transcrever áudio');
  }
}

const ESTADO_DO_BOTAO: Record<EstadoPedidoIcone['tipo'], EstadoBotao> = {
  ocioso: 'idle',
  espera: 'transcrevendo',
  concluido: 'concluido',
  erro: 'erro'
};

/**
 * Reflete no botão o estado do pedido (RF-16 da integração): em espera, o ícone pulsa e o contador
 * ao lado conta o tempo desde o clique; nos demais estados, o contador some. O contador fica fora da
 * árvore acessível, e o rótulo do botão só muda na transição.
 */
export function aplicarEstadoIcone(botao: HTMLElement, estado: EstadoPedidoIcone, cronometro: CronometroDeEspera): void {
  atualizarEstadoBotao(botao, ESTADO_DO_BOTAO[estado.tipo]);
  const contador = botao.querySelector<HTMLElement>(`.${CLASSE_CONTADOR}`);
  if (!contador) return;
  if (estado.tipo === 'espera') {
    cronometro.registrar(contador, estado.inicioEsperaEm);
  } else {
    cronometro.remover(contador);
    contador.textContent = '';
  }
}
