// Obtenção do áudio pela própria página do WhatsApp Web (BUG-20261001-2MOY).
//
// No WhatsApp Web real não há <audio> no balão antes da reprodução, e a página não guarda cópia
// decifrada de um áudio nunca tocado. O que existe, conferido na prova de conceito de 2026-10-01
// (evidence/prova-de-conceito.md do bug), é o mecanismo de download da própria página:
// downloadManager.downloadAndMaybeDecrypt, alimentado pelos campos do modelo da mensagem na coleção
// Msg, cujo id.id é o data-id do balão. A página falsa abaixo imita esse mecanismo, inclusive a
// recusa sem mimetype, e recebe os scripts que o manifesto declara no mundo da página, como o
// Chrome faz. O script de conteúdo fala com ela pela mesma window, como no navegador.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { AdaptadorWhatsAppWeb } from '../src/adaptadores/adaptador-whatsapp-web.ts';

const ORIGEM = 'https://web.whatsapp.com';
const OGG = [0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]; // "OggS" e o começo de um cabeçalho de página
const TIPO = 'audio/ogg; codecs=opus';

type Pedido = Record<string, unknown>;

// O que a página viu: pedidos de download, métodos do modelo chamados, escritas no modelo e
// elementos criados no documento.
const registro = {
  downloads: [] as Pedido[],
  chamadasNoModelo: [] as string[],
  escritasNoModelo: [] as string[],
  elementosCriados: [] as string[],
};
let concluirDownload: (pedido: Pedido) => Promise<ArrayBuffer> = async () => new Uint8Array(OGG).buffer;
const modelos: object[] = [];

// Modelo de uma mensagem de voz recebida e nunca tocada, com os campos lidos na prova de conceito.
function mensagemDeVoz(id: string): object {
  const alvo: Record<string, unknown> = {
    id: { id, fromMe: false },
    type: 'ptt',
    mimetype: TIPO,
    duration: '6',
    ack: 1,
    directPath: `/v/t62.7117-24/${id}`,
    encFilehash: `enc-${id}`,
    filehash: `hash-${id}`,
    mediaKey: `chave-${id}`,
    mediaKeyTimestamp: 1759340000,
    mediaData: { mediaStage: 'RESOLVED' },
    downloadMedia: async () => {},
  };
  const modelo = new Proxy(alvo, {
    get(t, p, r) {
      const valor = Reflect.get(t, p, r);
      if (typeof valor !== 'function') return valor;
      return (...args: unknown[]) => {
        registro.chamadasNoModelo.push(String(p));
        return valor.apply(t, args);
      };
    },
    set(t, p, valor) {
      registro.escritasNoModelo.push(String(p));
      return Reflect.set(t, p, valor);
    },
  });
  modelos.push(modelo);
  return modelo;
}

const MODULOS: Record<string, unknown> = {
  WAWebCollections: { Msg: { getModelsArray: () => [...modelos] } },
  WAWebDownloadManager: {
    downloadManager: {
      async downloadAndMaybeDecrypt(pedido: Pedido): Promise<ArrayBuffer> {
        registro.downloads.push(pedido);
        if (pedido.mimetype === undefined) {
          const erro = new Error(`Unexpected mimetype application/octet-stream for media type ${String(pedido.type)}`);
          erro.name = 'InvalidMediaFileType';
          throw erro;
        }
        return concluirDownload(pedido);
      },
    },
  },
};

type Ouvinte = (evento: { data: unknown; origin: string; source: unknown; ports: MessagePort[] }) => void;
const ouvintes: Ouvinte[] = [];

const paginaFalsa = {
  location: { origin: ORIGEM },
  innerHeight: 800,
  addEventListener(tipo: string, ouvinte: Ouvinte) {
    if (tipo === 'message') ouvintes.push(ouvinte);
  },
  removeEventListener(tipo: string, ouvinte: Ouvinte) {
    if (tipo === 'message' && ouvintes.includes(ouvinte)) ouvintes.splice(ouvintes.indexOf(ouvinte), 1);
  },
  // Entrega assíncrona e só para a própria origem, como window.postMessage.
  postMessage(dados: unknown, destino: string | { targetOrigin?: string; transfer?: Transferable[] }, transferir: Transferable[] = []) {
    const opcoes = typeof destino === 'string' ? { targetOrigin: destino, transfer: transferir } : destino;
    if (opcoes.targetOrigin !== '*' && opcoes.targetOrigin !== ORIGEM) return;
    const ports = (opcoes.transfer ?? []).filter((t): t is MessagePort => t instanceof MessagePort);
    setImmediate(() => {
      for (const ouvinte of [...ouvintes]) ouvinte({ data: dados, origin: ORIGEM, source: paginaFalsa, ports });
    });
  },
  // O carregador de módulos da página, que só existe no mundo dela.
  require(nome: string): unknown {
    if (nome in MODULOS) return MODULOS[nome];
    throw new Error(`Requiring unknown module "${nome}"`);
  },
};

// Canais abertos pelos dois lados, fechados no fim para o processo poder sair.
const CanalNativo = globalThis.MessageChannel;
const canais: MessageChannel[] = [];
class CanalRegistrado extends CanalNativo {
  constructor() {
    super();
    canais.push(this);
  }
}

// Os scripts que o manifesto põe no mundo da página do WhatsApp, pelo fonte de cada um.
const manifesto = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const scriptsDaPagina: string[] = manifesto.content_scripts
  .filter((c: { world?: string; matches: string[] }) => c.world === 'MAIN' && c.matches.some((m) => m.startsWith(ORIGEM)))
  .flatMap((c: { js: string[] }) => c.js);

const globais = globalThis as unknown as Record<string, unknown>;

before(async () => {
  globais.window = paginaFalsa;
  globais.document = { createElement: (tag: string) => { registro.elementosCriados.push(tag); return {}; } };
  globais.MessageChannel = CanalRegistrado;
  for (const js of scriptsDaPagina) {
    await import(new URL(`../src/${js.slice('dist/'.length, -'.js'.length)}.ts`, import.meta.url).href);
  }
});

after(() => {
  for (const canal of canais) {
    canal.port1.close();
    canal.port2.close();
  }
  globais.MessageChannel = CanalNativo;
  delete globais.window;
  delete globais.document;
});

function limparRegistro(): void {
  registro.downloads.length = 0;
  registro.chamadasNoModelo.length = 0;
  registro.escritasNoModelo.length = 0;
  registro.elementosCriados.length = 0;
}

// Balão como no WhatsApp real antes da reprodução: só o botão do player, nenhum <audio>.
function adaptadorCom(idAudio: string): AdaptadorWhatsAppWeb {
  const adaptador = new AdaptadorWhatsAppWeb();
  const balaoSemAudio = {
    isConnected: true,
    querySelector: (seletor: string) => (seletor.includes('Reproduzir') ? { tagName: 'BUTTON' } : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 54, bottom: 54, right: 320 }),
  } as unknown as HTMLElement;
  adaptador.registrarMensagem({ idAudio, elementoBalao: balaoSemAudio, direcao: 'recebido' });
  return adaptador;
}

async function ateQue(condicao: () => boolean, limite = 2000): Promise<void> {
  for (let i = 0; i < limite && !condicao(); i++) await new Promise((r) => setImmediate(r));
}

const indisponivelCom = (motivo: string) => (erro: Error) =>
  erro.message.startsWith('AUDIO_INDISPONIVEL') && erro.message.includes(motivo);

test('reprodução: balão sem <audio>, como no WhatsApp real, entrega bytes, tipo e duração pelo download da própria página (RF-06, EC-01)', async () => {
  mensagemDeVoz('A');
  const audio = await adaptadorCom('A').obterAudio('A');
  assert.equal(audio.idAudio, 'A');
  assert.deepEqual([...audio.bytes], OGG);
  assert.equal(audio.tipoDeMidia, TIPO);
  assert.equal(audio.duracaoSeg, 6);
});

test('a obtenção não toca nem altera a mensagem: só o download decifrado é pedido à página (RF-05, RF-07)', async () => {
  mensagemDeVoz('B');
  limparRegistro();
  await adaptadorCom('B').obterAudio('B');
  assert.equal(registro.downloads.length, 1);
  assert.deepEqual(registro.chamadasNoModelo, [], 'nenhum método do modelo, como downloadMedia, pode ser chamado');
  assert.deepEqual(registro.escritasNoModelo, [], 'o modelo da mensagem não pode mudar');
  assert.deepEqual(registro.elementosCriados, [], 'nenhum elemento, como <audio>, pode ser criado');
});

test('o pedido à página leva o mimetype e os campos de mídia do próprio modelo (sem mimetype, a página recusa)', async () => {
  mensagemDeVoz('C');
  limparRegistro();
  await adaptadorCom('C').obterAudio('C');
  const [pedido] = registro.downloads;
  assert.ok(pedido, 'nenhum pedido de download chegou à página');
  assert.deepEqual(
    {
      directPath: pedido.directPath, encFilehash: pedido.encFilehash, filehash: pedido.filehash,
      mediaKey: pedido.mediaKey, mediaKeyTimestamp: pedido.mediaKeyTimestamp, type: pedido.type, mimetype: pedido.mimetype,
    },
    {
      directPath: '/v/t62.7117-24/C', encFilehash: 'enc-C', filehash: 'hash-C',
      mediaKey: 'chave-C', mediaKeyTimestamp: 1759340000, type: 'ptt', mimetype: TIPO,
    },
  );
});

test('mensagem que a página já descartou termina em AUDIO_INDISPONIVEL com "Abra a conversa e tente de novo" (EC-06)', async () => {
  await assert.rejects(adaptadorCom('descartada').obterAudio('descartada'), indisponivelCom('Abra a conversa e tente de novo'));
});

test('download sem conclusão em 30 s termina em AUDIO_INDISPONIVEL com "Falha ao baixar o áudio; verifique a conexão" (EC-03)', async (t) => {
  mensagemDeVoz('D');
  limparRegistro();
  concluirDownload = () => new Promise(() => {});
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const pedido = adaptadorCom('D').obterAudio('D');
    pedido.catch(() => {});
    await ateQue(() => registro.downloads.length > 0);
    t.mock.timers.tick(30_000);
    await assert.rejects(pedido, indisponivelCom('Falha ao baixar o áudio; verifique a conexão'));
  } finally {
    concluirDownload = async () => new Uint8Array(OGG).buffer;
  }
});
