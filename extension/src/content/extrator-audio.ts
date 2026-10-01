import type { DadosDoAudio } from '../dominio/fonte-de-audio.ts';
import {
  CANAL_DA_PONTE,
  type AvisoDeConexao,
  type FalhaDaPonte,
  type PedidoDeAudio,
  type RespostaDaPonte
} from '../pagina/protocolo-ponte.ts';

/** Prazo do download pela página (EC-03). */
const PRAZO_DO_DOWNLOAD_MS = 30_000;
/** Prazo para a ponte do mundo da página responder ao aperto de mão. */
const PRAZO_DA_CONEXAO_MS = 2_000;

// Motivos entregues ao núcleo junto com AUDIO_INDISPONIVEL (integracao-whatsapp-web.md, seção 11)
const MOTIVOS: Record<FalhaDaPonte | 'prazo' | 'sem-ponte', string> = {
  'mensagem-ausente': 'Abra a conversa e tente de novo',
  'prazo': 'Falha ao baixar o áudio; verifique a conexão',
  'download': 'Não foi possível baixar o áudio do WhatsApp Web',
  'estrutura-ausente': 'A integração com o WhatsApp Web mudou; atualize a extensão',
  'sem-ponte': 'Recarregue a página do WhatsApp Web e tente de novo'
};

const pendentes = new Map<number, (resposta: RespostaDaPonte) => void>();
let conexao: Promise<MessagePort> | null = null;
let ultimoPedido = 0;

function indisponivel(motivo: string): Error {
  return new Error(`AUDIO_INDISPONIVEL: ${motivo}`);
}

/**
 * Entrega uma porta à ponte do mundo da página, uma vez por aba, e espera que ela a aceite.
 */
function conectar(): Promise<MessagePort> {
  conexao ??= new Promise<MessagePort>((resolver, rejeitar) => {
    const { port1, port2 } = new MessageChannel();
    const prazo = setTimeout(() => {
      port1.close();
      rejeitar(indisponivel(MOTIVOS['sem-ponte']));
    }, PRAZO_DA_CONEXAO_MS);
    port1.onmessage = ({ data }: MessageEvent<RespostaDaPonte>) => {
      if (data.tipo === 'pronta') {
        clearTimeout(prazo);
        resolver(port1);
      } else {
        pendentes.get(data.pedido)?.(data);
      }
    };
    window.postMessage({ canal: CANAL_DA_PONTE, tipo: 'conectar' } satisfies AvisoDeConexao, window.location.origin, [port2]);
  }).catch((erro: unknown) => {
    conexao = null;
    throw erro;
  });
  return conexao;
}

/**
 * Obtém os bytes decifrados de uma mensagem de voz do WhatsApp Web pelo download da própria página,
 * sem reproduzi-la nem alterar o estado de reprodução (RF-06, RF-07, EC-01).
 */
export async function extrairAudio(idAudio: string): Promise<DadosDoAudio> {
  const porta = await conectar();
  const pedido = ++ultimoPedido;
  const resposta = await new Promise<RespostaDaPonte | null>((resolver) => {
    const prazo = setTimeout(() => {
      pendentes.delete(pedido);
      resolver(null);
    }, PRAZO_DO_DOWNLOAD_MS);
    pendentes.set(pedido, (recebida) => {
      clearTimeout(prazo);
      pendentes.delete(pedido);
      resolver(recebida);
    });
    porta.postMessage({ pedido, idMensagem: idAudio } satisfies PedidoDeAudio);
  });

  if (!resposta) {
    throw indisponivel(MOTIVOS.prazo);
  }
  if (resposta.tipo === 'falha') {
    throw indisponivel(`${MOTIVOS[resposta.falha]} (${resposta.detalhe})`);
  }
  if (resposta.tipo !== 'audio') {
    throw indisponivel(MOTIVOS.download);
  }

  return {
    idAudio,
    bytes: new Uint8Array(resposta.bytes),
    tipoDeMidia: resposta.tipoDeMidia,
    duracaoSeg: resposta.duracaoSeg
  };
}
