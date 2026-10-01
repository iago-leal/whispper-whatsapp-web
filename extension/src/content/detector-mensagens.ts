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
 * Inicializa a observação contínua de mutações no container da conversa.
 */
export function observarMensagensDeAudio(
  container: HTMLElement,
  aoDetectar: (mensagem: MensagemDetectada) => void
): MutationObserver {
  const processarNos = (nos: NodeList) => {
    for (let i = 0; i < nos.length; i++) {
      const no = nos[i];
      if (!(no instanceof HTMLElement)) continue;

      if (no.matches(CONFIGURACAO_ESTRUTURAS.seletores.balaoMensagem)) {
        const detectada = identificarMensagemDeAudio(no);
        if (detectada) aoDetectar(detectada);
      } else {
        const baloes = no.querySelectorAll<HTMLElement>(CONFIGURACAO_ESTRUTURAS.seletores.balaoMensagem);
        for (let j = 0; j < baloes.length; j++) {
          const balao = baloes[j];
          if (balao) {
            const detectada = identificarMensagemDeAudio(balao);
            if (detectada) aoDetectar(detectada);
          }
        }
      }
    }
  };

  // Processa nós iniciais já presentes
  const baloesIniciais = container.querySelectorAll<HTMLElement>(CONFIGURACAO_ESTRUTURAS.seletores.balaoMensagem);
  for (let k = 0; k < baloesIniciais.length; k++) {
    const balao = baloesIniciais[k];
    if (balao) {
      const detectada = identificarMensagemDeAudio(balao);
      if (detectada) aoDetectar(detectada);
    }
  }

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
