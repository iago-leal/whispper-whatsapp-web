import { AdaptadorWhatsAppWeb } from '../adaptadores/adaptador-whatsapp-web.ts';
import { GerenciadorDeJanelas } from './gerenciador-janelas.ts';
import { MotorClienteContent } from '../adaptadores/motor-cliente-content.ts';
import { ArmazenamentoChrome } from '../adaptadores/armazenamento-chrome.ts';
import { NucleoDeTranscricao } from '../dominio/nucleo.ts';
import { CONFIGURACAO_ESTRUTURAS } from './configuracao-estruturas.ts';
import { observarMensagensDeAudio, injetarBotaoNaMensagem } from './detector-mensagens.ts';
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

function inicializar(): void {
  nucleo.inicializar().catch((err) => {
    console.warn('[Whispper] Falha ao inicializar o núcleo de transcrição:', err);
  });

  const saude = adaptador.verificarSaude();
  if (saude.status === 'degradada') {
    console.warn('[Whispper] Adaptador em estado degradado. Estruturas ausentes:', saude.estruturasAusentes);
    return;
  }

  const container = document.querySelector<HTMLElement>(CONFIGURACAO_ESTRUTURAS.seletores.containerConversa);
  if (!container) {
    setTimeout(inicializar, 1000);
    return;
  }

  observarMensagensDeAudio(container, (mensagem) => {
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
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }
}
