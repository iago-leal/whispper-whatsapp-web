/**
 * Módulo de Configuração de Estruturas do WhatsApp Web.
 *
 * Isola 100% dos seletores de DOM, classes e atributos utilizados pela extensão
 * para interagir com a interface web.whatsapp.com.
 *
 * Em caso de mudanças no WhatsApp Web, este é o único arquivo a ser atualizado.
 */

export interface RegrasDeEstrutura {
  versao: string;
  verificadoEm: string; // ISO 8601
  seletores: {
    // Painel principal de conversa ativa
    containerConversa: string;
    // Lista de mensagens / bolhas de conversa
    containerMensagens: string;
    // Balão individual de mensagem
    balaoMensagem: string;
    // Elemento que caracteriza uma mensagem como sendo de voz/áudio
    elementoMensagemVoz: string;
    // Elemento HTML nativo <audio> embutido no player
    tagAudio: string;
    // Botão nativo de play/pause do player de voz
    botaoPlayNativo: string;
    // Elemento de texto contendo a duração do áudio
    duracaoTexto: string;
    // Marcador de mensagem de visualização única (deve ser ignorada)
    marcadorVisualizacaoUnica: string;
    // Ponto de injeção preferencial para o botão do Whispper dentro do balão
    pontoDeInjecaoBotao: string;
  };
  atributos: {
    // Atributo nativo que identifica unicamente a mensagem (ex: data-id)
    idMensagem: string;
    // Atributo customizado que marca que o botão já foi injetado nesta mensagem
    marcadorInjetado: string;
    // Atributo da direção da mensagem (recebido ou enviado)
    marcadorDirecao: string;
  };
}

export const CONFIGURACAO_ESTRUTURAS: RegrasDeEstrutura = {
  versao: '1.0.0',
  verificadoEm: '2026-10-01',
  seletores: {
    containerConversa: '#main',
    containerMensagens: '[role="application"], div[data-tab="8"]',
    balaoMensagem: '[data-id], div[role="row"]',
    // Mensagens de áudio no WhatsApp Web contêm tags <audio> ou botões com controles de áudio
    elementoMensagemVoz: 'audio, [data-testid="audio-player"], button[aria-label*="Reproduzir"], button[aria-label*="Play"]',
    tagAudio: 'audio',
    botaoPlayNativo: 'button[aria-label*="Reproduzir"], button[aria-label*="Play"], button[aria-label*="Pausar"], button[aria-label*="Pause"]',
    duracaoTexto: 'span[dir="auto"], div[aria-hidden="true"]',
    marcadorVisualizacaoUnica: '[data-testid="view-once"], [aria-label*="Visualização única"]',
    pontoDeInjecaoBotao: '[data-testid="audio-player"], div:has(> audio), div[role="button"]'
  },
  atributos: {
    idMensagem: 'data-id',
    marcadorInjetado: 'data-whispper-injetado',
    marcadorDirecao: 'data-whispper-direcao'
  }
};
