import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ControladorOnboarding } from '../src/onboarding/onboarding.ts';
import { VerificadorCompatibilidade } from '../src/dominio/compatibilidade.ts';

// BUG-20261001-MAC1: o botão "Baixar Instalador" salvava a própria página de boas-vindas como .pkg.
// BUG-20261001-404B: sem o instalador, o download falhava em silêncio, sem "Tentar de novo".

const ID_DA_EXTENSAO = 'femjlfnijaboogbcdionddnjcjpfmieg';
const MAC = {
  platform: 'MacIntel',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  deviceMemory: 8
};
const WINDOWS = {
  platform: 'Win32',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  deviceMemory: 8
};

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

// O recurso do instalador responde como no Chrome: 200 quando o arquivo vai embutido na extensão,
// TypeError ("Failed to fetch") quando falta.
function servirInstaladores(disponiveis: string[]): string[] {
  const pedidos: string[] = [];
  (globalThis as any).fetch = async (url: string) => {
    pedidos.push(url);
    if (disponiveis.some((arquivo) => url.endsWith(`/${arquivo}`))) return { ok: true, status: 200 };
    throw new TypeError('Failed to fetch');
  };
  return pedidos;
}

function montarPagina(): Map<string, any> {
  const elementos = new Map<string, any>();
  (globalThis as any).document = {
    getElementById: (id: string) => {
      if (!elementos.has(id)) {
        // Como num <a>, os atributos href e download refletem as propriedades.
        elementos.set(id, {
          id, href: '', download: '', onclick: null, textContent: '', style: {}, ouvintes: {},
          setAttribute(nome: string, valor: string) { this[nome] = valor; },
          removeAttribute(nome: string) { this[nome] = ''; },
          addEventListener(tipo: string, ouvinte: () => void) { this.ouvintes[tipo] = ouvinte; }
        });
      }
      return elementos.get(id);
    }
  };
  (globalThis as any).chrome = {
    runtime: { getURL: (caminho: string) => `chrome-extension://${ID_DA_EXTENSAO}/${caminho}` }
  };
  return elementos;
}

const verificar = (navegador: typeof MAC) =>
  new VerificadorCompatibilidade().avaliar(VerificadorCompatibilidade.extrairInfoDoNavegador(navegador));
const conferenciaConcluida = () => new Promise((resolver) => setImmediate(resolver));
const aviso = (elementos: Map<string, any>) => elementos.get('erro-download-instalador')?.style.display;

describe('Instalação Guiada — download do instalador', () => {
  it('o botão oferece o .pkg embutido na extensão, e não a própria página (BUG-20261001-MAC1)', () => {
    servirInstaladores(['whispper-macos-apple-silicon.pkg']);
    const elementos = montarPagina();
    const resultado = verificar(MAC);
    assert.equal(resultado.instaladorSugerido?.arquivo, 'whispper-macos-apple-silicon.pkg');

    (new ControladorOnboarding() as any).configurarDownload(resultado);

    const link = elementos.get('link-download-instalador');
    assert.equal(
      link.href,
      `chrome-extension://${ID_DA_EXTENSAO}/dist/instaladores/whispper-macos-apple-silicon.pkg`
    );
    assert.equal(link.download, 'whispper-macos-apple-silicon.pkg');
    assert.equal(link.onclick, null, 'o clique não pode ser interceptado');
  });

  it('com o instalador disponível, o botão segue visível e a página não acusa falha (BUG-20261001-404B)', async () => {
    const pedidos = servirInstaladores(['whispper-macos-apple-silicon.pkg']);
    const elementos = montarPagina();

    (new ControladorOnboarding() as any).configurarDownload(verificar(MAC));
    await conferenciaConcluida();

    const link = elementos.get('link-download-instalador');
    assert.notEqual(link.style.display, 'none', 'o botão de download sumiu com o instalador disponível');
    assert.notEqual(aviso(elementos), 'block', 'a página acusou falha com o instalador disponível');
    assert.equal(link.onclick, null, 'o clique não pode ser interceptado');
    assert.ok(pedidos.every((url) => url === link.href), 'a conferência consultou outro endereço');
  });

  it('sem o instalador, a etapa 3 informa a falha e esconde o botão (BUG-20261001-404B)', async () => {
    servirInstaladores(['whispper-macos-apple-silicon.pkg']);
    const elementos = montarPagina();
    const resultado = verificar(WINDOWS);
    assert.equal(resultado.instaladorSugerido?.arquivo, 'whispper-windows-x64.exe');

    (new ControladorOnboarding() as any).configurarDownload(resultado);
    await conferenciaConcluida();

    assert.equal(aviso(elementos), 'block', 'a falha de download não foi informada (seção 10 da spec)');
    assert.equal(
      elementos.get('link-download-instalador').style.display, 'none',
      'o botão continua oferecendo um instalador que não existe'
    );
  });

  it('"Tentar de novo" refaz a conferência e devolve o botão quando o instalador aparece (BUG-20261001-404B)', async () => {
    servirInstaladores([]);
    const elementos = montarPagina();
    const app = new ControladorOnboarding() as any;
    app.configurarBotoes();
    app.resultadoVerificacao = verificar(MAC);
    app.configurarDownload(app.resultadoVerificacao);
    await conferenciaConcluida();
    assert.equal(aviso(elementos), 'block');

    servirInstaladores(['whispper-macos-apple-silicon.pkg']);
    const tentarDeNovo = elementos.get('btn-tentar-download')?.ouvintes.click;
    assert.equal(typeof tentarDeNovo, 'function', 'a etapa 3 não oferece "Tentar de novo"');
    tentarDeNovo();
    await conferenciaConcluida();

    assert.equal(aviso(elementos), 'none', 'o aviso de falha continuou depois do instalador aparecer');
    assert.notEqual(elementos.get('link-download-instalador').style.display, 'none');
  });
});
