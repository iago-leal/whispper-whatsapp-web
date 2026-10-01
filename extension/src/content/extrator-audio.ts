import type { DadosDoAudio } from '../dominio/fonte-de-audio.ts';
import { CONFIGURACAO_ESTRUTURAS } from './configuracao-estruturas.ts';

/**
 * Extrai os bytes de áudio descriptografados de um elemento de mensagem de voz no WhatsApp Web.
 * Lê diretamente do blob em cache na aba sem executar play() audível.
 */
export async function extrairAudioDeElemento(
  elementoBalao: HTMLElement,
  idAudio: string
): Promise<DadosDoAudio> {
  const elementoAudio = elementoBalao.querySelector<HTMLAudioElement>(
    CONFIGURACAO_ESTRUTURAS.seletores.tagAudio
  );

  if (!elementoAudio || !elementoAudio.src) {
    throw new Error(`AUDIO_INDISPONIVEL: elemento de áudio ausente ou sem fonte para a mensagem ${idAudio}`);
  }

  const url = elementoAudio.src;
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      throw new Error(`AUDIO_INDISPONIVEL: resposta HTTP ${resposta.status} ao carregar o blob`);
    }

    const buffer = await resposta.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const tipoDeMidia = resposta.headers.get('Content-Type') || 'audio/ogg; codecs=opus';
    const duracaoSeg = Number.isFinite(elementoAudio.duration) && elementoAudio.duration > 0
      ? elementoAudio.duration
      : 0;

    return {
      idAudio,
      bytes,
      tipoDeMidia,
      duracaoSeg
    };
  } catch (erro) {
    if (erro instanceof Error && erro.message.startsWith('AUDIO_INDISPONIVEL')) {
      throw erro;
    }
    throw new Error(`AUDIO_INDISPONIVEL: falha ao extrair bytes do áudio (${erro instanceof Error ? erro.message : String(erro)})`);
  }
}
