// Reprodução isolada do BUG-20261001-2MOY: balão de voz com a estrutura do WhatsApp real
// (botão "Reproduzir mensagem de voz", nenhum <audio> antes da reprodução).
import { extrairAudioDeElemento } from '../../../../../extension/src/content/extrator-audio.ts';

const consultas: string[] = [];
const balaoReal = {
  querySelector: (sel: string) => {
    consultas.push(sel);
    // Só o botão de reprodução existe; nenhum seletor de <audio> casa.
    return sel.includes('Reproduzir') ? { tagName: 'BUTTON' } : null;
  }
} as unknown as HTMLElement;

let fetchChamado = false;
globalThis.fetch = (async () => { fetchChamado = true; throw new Error('fetch inesperado'); }) as typeof fetch;

try {
  const r = await extrairAudioDeElemento(balaoReal, 'id-mascarado');
  console.log('RESULTADO: bytes entregues', r.bytes.length);
  process.exitCode = 0;
} catch (e) {
  console.log('consultas ao balão:', consultas);
  console.log('fetch chamado:', fetchChamado);
  console.log('ERRO:', (e as Error).message);
  process.exitCode = 1;
}
