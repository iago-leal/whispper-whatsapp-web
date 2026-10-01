import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ControladorOnboarding } from '../src/onboarding/onboarding.ts';
import { VerificadorCompatibilidade } from '../src/dominio/compatibilidade.ts';

function criarDOMMock() {
  const elementos = new Map<string, any>();
  
  const getElementById = (id: string) => {
    if (!elementos.has(id)) {
      elementos.set(id, {
        id,
        style: {},
        className: '',
        innerHTML: '',
        textContent: '',
        href: '',
        removeAttribute: function(attr: string) {
          delete this[attr];
        },
        addEventListener: function() {},
      });
    }
    return elementos.get(id);
  };
  
  return { getElementById, elementos };
}

test('ControladorOnboarding - Link de download gera URL 404', async () => {
  const dom = criarDOMMock();
  (global as any).document = {
    getElementById: dom.getElementById,
    createElement: (tag: string) => ({ className: '', innerHTML: '' }),
  };
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      platform: 'MacIntel',
      deviceMemory: 8,
    },
    writable: true,
    configurable: true
  });
  (global as any).chrome = {
    storage: { local: { get: (keys: any, cb: any) => cb({}), set: () => {} } },
    runtime: { getURL: (caminho: string) => `chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/${caminho}` },
  };

  const app = new ControladorOnboarding();
  await app.iniciar();

  // Executar a verificação
  // O método executarVerificacaoInicial é privado, mas podemos acioná-lo indo para a etapa 2.
  // ControladorOnboarding possui um método irParaEtapa privado. 
  // No DOM, o evento é ligado no btn-aceitar-privacidade
  const btn = dom.getElementById('btn-aceitar-privacidade');
  // Precisamos chamar a verificação. Como a classe é complexa e os eventos são amarrados no iniciar(),
  // o mais simples é forçar a etapaAtual chamando o callback do click (se tivéssemos mockado addEventListener completo).
  // Vamos usar um cast para acessar métodos privados e testar a reprodução do bug:
  (app as any).irParaEtapa(2);
  
  // irParaEtapa(2) chama executarVerificacaoInicial que tem um setTimeout de 600ms.
  await new Promise(resolve => setTimeout(resolve, 700));

  const link = dom.getElementById('link-download-instalador');
  
  // O comportamento correto para dev/onboarding sem OQ-03 é NÃO usar a URL de release ausente,
  // e sim um mock local ou tratamento no listener.
  // Se ainda estiver no github.com releases latest, o teste deve falhar.
  assert.ok(!link.href.includes('github.com/whispper-bot/whispper-whatsapp-web/releases/latest/download/'), 
    'A URL de download não deve apontar para a release ausente no GitHub (404).');
});
