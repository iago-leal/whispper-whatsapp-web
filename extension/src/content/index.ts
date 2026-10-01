import { AdaptadorWhatsAppWeb } from '../adaptadores/adaptador-whatsapp-web.ts';
import { GerenciadorDeJanelas } from './gerenciador-janelas.ts';
import { MotorClienteContent } from '../adaptadores/motor-cliente-content.ts';
import { ArmazenamentoChrome } from '../adaptadores/armazenamento-chrome.ts';
import { NucleoDeTranscricao } from '../dominio/nucleo.ts';
import { CONFIGURACAO_ESTRUTURAS } from './configuracao-estruturas.ts';
import { observarMensagensDeAudio, injetarBotaoNaMensagem, type MensagemDetectada } from './detector-mensagens.ts';
import { atualizarEstadoBotao } from './botao-transcricao.ts';

export const adaptador = new AdaptadorWhatsAppWeb();
export const janelas = new GerenciadorDeJanelas();
export const motor = new MotorClienteContent();
export const armazenamento = new ArmazenamentoChrome();

export const nucleo = new NucleoDeTranscricao(adaptador, motor, janelas, armazenamento);

// Conecta o rastreador de âncoras ao reposicionamento dinâmico das janelas
adaptador.aoMudarAncora((ancora) => {
  janelas.atualizarAncora(ancora);
});

function aoDetectarMensagem(mensagem: MensagemDetectada): void {
  adaptador.registrarMensagem(mensagem);

  // Escuta reprodução nativa para alimentar os contadores anônimos de qualidade/adoção (RF-12, RF-13)
  const audioEl = mensagem.elementoBalao.querySelector<HTMLAudioElement>('audio');
  if (audioEl) {
    audioEl.addEventListener('play', () => {
      adaptador.notificarReproducao(mensagem.idAudio);
    });
  }

  const botao = injetarBotaoNaMensagem(mensagem, (idAudio) => {
    adaptador.solicitarTranscricaoManual(idAudio);
  });
}

// O WhatsApp Web carrega sem conversa aberta e recria o painel a cada conversa escolhida: a observação
// das mensagens acompanha o painel da vez, e a saúde é reavaliada a cada painel novo (RF-11).
let painelObservado: HTMLElement | null | undefined;
let observadorDoPainel: MutationObserver | null = null;
let avisouDegradacao = false;

function acompanharConversaAberta(): void {
  const painel = document.querySelector<HTMLElement>(CONFIGURACAO_ESTRUTURAS.seletores.containerConversa);
  // Painel já observado não pede nada; painel degradado é reavaliado a cada mutação, porque a página
  // pode montá-lo aos poucos.
  if (painel === painelObservado && (observadorDoPainel || !painel)) return;

  observadorDoPainel?.disconnect();
  observadorDoPainel = null;
  painelObservado = painel;

  const saude = adaptador.verificarSaude();
  if (saude.status === 'degradada') {
    if (!avisouDegradacao) {
      console.warn('[Whispper] Adaptador em estado degradado. Estruturas ausentes:', saude.estruturasAusentes.join(', '));
      avisouDegradacao = true;
    }
    return;
  }
  avisouDegradacao = false;

  if (painel) {
    observadorDoPainel = observarMensagensDeAudio(painel, aoDetectarMensagem);
  }
}

function inicializar(): void {
  nucleo.inicializar().catch((err) => {
    console.warn('[Whispper] Falha ao inicializar o núcleo de transcrição:', err);
  });

  acompanharConversaAberta();
  new MutationObserver(acompanharConversaAberta).observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }
}
