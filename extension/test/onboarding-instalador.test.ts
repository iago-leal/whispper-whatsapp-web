import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ControladorOnboarding } from '../src/onboarding/onboarding.ts';
import { VerificadorCompatibilidade } from '../src/dominio/compatibilidade.ts';

// BUG-20261001-MAC1: o botão "Baixar Instalador" salvava a própria página de boas-vindas como .pkg.

const ID_DA_EXTENSAO = 'femjlfnijaboogbcdionddnjcjpfmieg';

function montarPagina(): Map<string, any> {
  const elementos = new Map<string, any>();
  (globalThis as any).document = {
    getElementById: (id: string) => {
      if (!elementos.has(id)) {
        // Como num <a>, os atributos href e download refletem as propriedades.
        elementos.set(id, {
          id, href: '', download: '', onclick: null, textContent: '', style: {},
          setAttribute(nome: string, valor: string) { this[nome] = valor; },
          removeAttribute(nome: string) { this[nome] = ''; }
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

describe('Instalação Guiada — download do instalador', () => {
  it('o botão oferece o .pkg embutido na extensão, e não a própria página (BUG-20261001-MAC1)', () => {
    const elementos = montarPagina();
    const resultado = new VerificadorCompatibilidade().avaliar(
      VerificadorCompatibilidade.extrairInfoDoNavegador({
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        deviceMemory: 8
      })
    );
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
});
