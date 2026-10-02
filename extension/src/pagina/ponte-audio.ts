/**
 * Ponte de áudio no mundo da página do WhatsApp Web (BUG-20261001-2MOY).
 *
 * O WhatsApp só cria o <audio> de uma mensagem de voz ao reproduzi-la, e a página não guarda cópia
 * decifrada de um áudio nunca tocado. Este script roda no mundo principal da página, o único que
 * enxerga o carregador de módulos do WhatsApp, e obtém o áudio pelo mecanismo de download e
 * decifração da própria página (EC-01), sem tocá-lo nem alterar a mensagem (RF-06, RF-07). Só bytes,
 * tipo de mídia e duração atravessam a porta; as chaves da mídia não saem deste mundo.
 */

import { CONFIGURACAO_ESTRUTURAS } from '../content/configuracao-estruturas.ts';
import {
  CANAL_DA_PONTE,
  type FalhaDaPonte,
  type PedidoDeAudio,
  type RespostaDaPonte
} from './protocolo-ponte.ts';

interface PaginaComModulos {
  require?: (nome: string) => unknown;
}

// Campos do modelo de uma mensagem de voz, conferidos na prova de conceito de 2026-10-01
interface ModeloDeMensagem {
  id?: { id?: string };
  type: string;
  mimetype: string;
  duration?: string | number;
  directPath: string;
  encFilehash: string;
  filehash: string;
  mediaKey: string;
  mediaKeyTimestamp: number;
}

interface GerenciadorDeDownload {
  downloadAndMaybeDecrypt(pedido: Record<string, unknown>): Promise<ArrayBuffer>;
}

interface CacheDeMidiaDaPagina {
  LruMediaStore?: { del(chave: string): Promise<unknown> };
}

interface AudioDaPagina {
  bytes: ArrayBuffer;
  tipoDeMidia: string;
  duracaoSeg: number;
}

class FalhaNaPagina extends Error {
  readonly falha: FalhaDaPonte;

  constructor(falha: FalhaDaPonte, detalhe: string) {
    super(detalhe);
    this.falha = falha;
  }
}

// O download da página anota pontos de desempenho num objeto de telemetria; este não anota nada.
const TELEMETRIA_INERTE = {
  addAnnotations() { return this; },
  addPoint() { return this; }
};

function modulo<T>(pagina: PaginaComModulos, nome: string): T {
  try {
    const encontrado = pagina.require?.(nome);
    if (encontrado) return encontrado as T;
  } catch {
    // Módulo ausente nesta versão da página
  }
  throw new FalhaNaPagina('estrutura-ausente', `módulo ${nome} indisponível`);
}

/**
 * Obtém o áudio decifrado da mensagem pelo download da própria página, sem reproduzi-lo.
 */
export async function obterAudioDaPagina(pagina: PaginaComModulos, idMensagem: string): Promise<AudioDaPagina> {
  const { colecoes, gerenciadorDeDownload } = CONFIGURACAO_ESTRUTURAS.modulosDaPagina;
  const mensagens = modulo<{ Msg?: { getModelsArray(): ModeloDeMensagem[] } }>(pagina, colecoes).Msg;
  const download = modulo<{ downloadManager?: GerenciadorDeDownload }>(pagina, gerenciadorDeDownload).downloadManager;
  if (!mensagens || typeof download?.downloadAndMaybeDecrypt !== 'function') {
    throw new FalhaNaPagina('estrutura-ausente', 'coleção de mensagens ou gerenciador de download indisponível');
  }

  const mensagem = mensagens.getModelsArray().find((modelo) => modelo.id?.id === idMensagem);
  if (!mensagem) {
    throw new FalhaNaPagina('mensagem-ausente', `mensagem ${idMensagem} fora das mensagens carregadas`);
  }

  const baixar = async (): Promise<ArrayBuffer> => {
    try {
      return await download.downloadAndMaybeDecrypt({
        directPath: mensagem.directPath,
        encFilehash: mensagem.encFilehash,
        filehash: mensagem.filehash,
        mediaKey: mensagem.mediaKey,
        mediaKeyTimestamp: mensagem.mediaKeyTimestamp,
        type: mensagem.type,
        // Sem o mimetype, a página recusa o pedido com InvalidMediaFileType
        mimetype: mensagem.mimetype,
        signal: new AbortController().signal,
        downloadQpl: TELEMETRIA_INERTE
      });
    } catch (erro) {
      throw new FalhaNaPagina('download', erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro));
    }
  };

  // A página devolve do seu cache de mídia a cópia que achar lá, mesmo vazia, sem baixar de novo; apagar só a entrada
  // vazia a faz baixar o áudio outra vez (BUG-20261002-XDL5).
  let bytes = await baixar();
  if (bytes.byteLength === 0 && (await apagarCopiaVazia(pagina, mensagem.filehash))) bytes = await baixar();
  if (bytes.byteLength === 0) throw new FalhaNaPagina('download', 'o WhatsApp Web entregou o áudio vazio');

  return { bytes, tipoDeMidia: mensagem.mimetype, duracaoSeg: Number(mensagem.duration) || 0 };
}

async function apagarCopiaVazia(pagina: PaginaComModulos, filehash: string): Promise<boolean> {
  try {
    const cache = (pagina.require?.(CONFIGURACAO_ESTRUTURAS.modulosDaPagina.cacheDeMidia) as CacheDeMidiaDaPagina | undefined)
      ?.LruMediaStore;
    if (typeof cache?.del !== 'function') return false;
    await cache.del(filehash);
    return true;
  } catch {
    // Módulo ausente ou mudado nesta versão da página: sem cura, a obtenção termina em falha legível
    return false;
  }
}

async function atender(pagina: PaginaComModulos, porta: MessagePort, { pedido, idMensagem }: PedidoDeAudio): Promise<void> {
  try {
    const audio = await obterAudioDaPagina(pagina, idMensagem);
    // Só uma cópia atravessa a porta: a página grava no cache de mídia o buffer que devolveu, depois de devolvê-lo, e
    // transferi-lo o esvaziaria antes disso (BUG-20261002-XDL5).
    const bytes = audio.bytes.slice(0);
    porta.postMessage({ tipo: 'audio', pedido, ...audio, bytes } satisfies RespostaDaPonte, [bytes]);
  } catch (erro) {
    const falha = erro instanceof FalhaNaPagina ? erro.falha : 'download';
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    porta.postMessage({ tipo: 'falha', pedido, falha, detalhe } satisfies RespostaDaPonte);
  }
}

/**
 * Aceita a porta que o script de conteúdo envia pela janela e passa a atender os pedidos por ela.
 */
export function instalarPonte(janela: Window): void {
  janela.addEventListener('message', (evento: MessageEvent) => {
    if (evento.source !== janela || evento.data?.canal !== CANAL_DA_PONTE || evento.data.tipo !== 'conectar') return;
    const porta = evento.ports[0];
    if (!porta) return;
    porta.onmessage = ({ data }: MessageEvent<PedidoDeAudio>) => {
      void atender(janela as unknown as PaginaComModulos, porta, data);
    };
    porta.postMessage({ tipo: 'pronta' } satisfies RespostaDaPonte);
  });
}

if (typeof window !== 'undefined') {
  instalarPonte(window);
}
