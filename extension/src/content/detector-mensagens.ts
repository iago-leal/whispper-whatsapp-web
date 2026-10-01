import { CONFIGURACAO_ESTRUTURAS } from './configuracao-estruturas.ts';
import { criarBotaoTranscricao } from './botao-transcricao.ts';

export interface MensagemDetectada {
  idAudio: string;
  elementoBalao: HTMLElement;
  direcao: 'recebido' | 'enviado';
}

/**
 * Avalia se o elemento do balão deve ser ignorado (ex: visualização única ou já injetado).
 */
export function deveIgnorarMensagem(elementoBalao: HTMLElement): boolean {
  if (elementoBalao.hasAttribute(CONFIGURACAO_ESTRUTURAS.atributos.marcadorInjetado)) {
    return true;
  }
  const marcadorUnico = elementoBalao.querySelector(
    CONFIGURACAO_ESTRUTURAS.seletores.marcadorVisualizacaoUnica
  );
  return marcadorUnico !== null;
}

/**
 * Identifica se um nó DOM corresponde a uma mensagem de voz válida.
 */
export function identificarMensagemDeAudio(elementoBalao: HTMLElement): MensagemDetectada | null {
  if (deveIgnorarMensagem(elementoBalao)) {
    return null;
  }

  const elementoVoz = elementoBalao.querySelector(
    CONFIGURACAO_ESTRUTURAS.seletores.elementoMensagemVoz
  );

  if (!elementoVoz) {
    return null;
  }

  const idBruto = elementoBalao.getAttribute(CONFIGURACAO_ESTRUTURAS.atributos.idMensagem);
  const idAudio = idBruto || `whispper_audio_${Math.random().toString(36).substring(2, 9)}`;

  // Detecta se a mensagem é enviada ou recebida pelas classes ou atributos nativos
  const classes = elementoBalao.className || '';
  const direcao: 'recebido' | 'enviado' = (classes.includes('message-out') || elementoBalao.querySelector('[data-icon="msg-dblcheck"]'))
    ? 'enviado'
    : 'recebido';

  return {
    idAudio,
    elementoBalao,
    direcao
  };
}

/**
 * Injeta o botão de transcrição na mensagem de áudio especificada.
 */
export function injetarBotaoNaMensagem(
  mensagem: MensagemDetectada,
  aoClicar: (idAudio: string) => void
): HTMLButtonElement | null {
  if (mensagem.elementoBalao.hasAttribute(CONFIGURACAO_ESTRUTURAS.atributos.marcadorInjetado)) {
    return null;
  }

  const pontoInjecao = mensagem.elementoBalao.querySelector(
    CONFIGURACAO_ESTRUTURAS.seletores.pontoDeInjecaoBotao
  ) || mensagem.elementoBalao;

  const botao = criarBotaoTranscricao(mensagem.idAudio, aoClicar);
  pontoInjecao.appendChild(botao);
  mensagem.elementoBalao.setAttribute(CONFIGURACAO_ESTRUTURAS.atributos.marcadorInjetado, 'true');

  return botao;
}

/**
 * Devolve, sem repetição, o balão de cada elemento de voz que está em `raiz` ou é a própria `raiz`.
 * O WhatsApp Web monta o player depois do balão, dentro dele, e aninha balões (a linha e a mensagem):
 * subir do elemento de voz ao balão mais próximo cobre os dois casos e chega ao balão que carrega o
 * identificador da mensagem (RF-04).
 */
function baloesComVoz(raiz: HTMLElement): HTMLElement[] {
  const { elementoMensagemVoz, balaoMensagem } = CONFIGURACAO_ESTRUTURAS.seletores;
  const vozes = raiz.matches(elementoMensagemVoz) ? [raiz] : Array.from(raiz.querySelectorAll(elementoMensagemVoz));
  const baloes = new Set<HTMLElement>();
  for (const voz of vozes) {
    const balao = voz.closest<HTMLElement>(balaoMensagem);
    if (balao) baloes.add(balao);
  }
  return [...baloes];
}

/**
 * Inicializa a observação contínua de mutações no container da conversa.
 */
export function observarMensagensDeAudio(
  container: HTMLElement,
  aoDetectar: (mensagem: MensagemDetectada) => void
): MutationObserver {
  const processar = (raiz: HTMLElement) => {
    for (const balao of baloesComVoz(raiz)) {
      const detectada = identificarMensagemDeAudio(balao);
      if (detectada) aoDetectar(detectada);
    }
  };

  const processarNos = (nos: NodeList) => {
    for (let i = 0; i < nos.length; i++) {
      const no = nos[i];
      if (no instanceof HTMLElement) processar(no);
    }
  };

  // Processa nós iniciais já presentes
  processar(container);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        processarNos(mutation.addedNodes);
      }
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });

  return observer;
}
