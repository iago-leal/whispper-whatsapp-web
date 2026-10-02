// CHG-005 (data-repair) do BUG-20261002-XDL5: apaga do cache de mídia do WhatsApp Web as cópias de 0 bytes que a
// ponte antiga deixou (ela transferia o buffer que a página ainda ia gravar). Roda no mundo da página, numa aba de
// web.whatsapp.com, pela ferramenta de JavaScript da automação, com a extensão corrigida já carregada (senão uma
// transcrição nova voltaria a esvaziar entradas).
//
// MODO 'dry-run': só lê e conta. MODO 'executar': apaga cada cópia vazia pelo próprio LruMediaStore da página (que
// apaga o buffer e os metadados), apaga direto no Cache Storage a que sobrar, e confere. Nada além das entradas de
// 0 bytes é tocado. Saída: só contagens e a impressão digital (SHA-256, 16 primeiros dígitos) da lista ordenada das
// chaves vazias; nenhum conteúdo de mensagem nem hash de mídia sai da página.
//
// Backup: o conteúdo de cada entrada apagada é, por definição, 0 bytes; o que se guarda é a contagem e a impressão
// digital da lista, que o dry-run e a execução devem reproduzir iguais. Rollback: não há dado a restaurar; a mídia
// íntegra continua no servidor do WhatsApp, que a página baixa de novo no próximo acesso. Recriar as entradas vazias
// (cache.put(url, new Response(new ArrayBuffer(0))) com as mesmas chaves) só traria o defeito de volta.

const MODO = 'dry-run';
const NOME_DO_CACHE = 'lru-media-array-buffer-cache';
const PREFIXO = 'https://_media_cache_v2_.whatsapp.com/';

const loja = window.require('WAWebMediaStore').LruMediaStore;
const cache = await caches.open(NOME_DO_CACHE);
async function impressaoDigital(chaves) {
  const resumo = await crypto.subtle.digest('SHA-256', new TextEncoder().encode([...chaves].sort().join('\n')));
  return [...new Uint8Array(resumo)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const tamanho = async (req) => (await (await cache.match(req)).arrayBuffer()).byteLength;

async function vaziasDoCache() {
  const vazias = [];
  let total = 0;
  for (const req of await cache.keys()) {
    total++;
    if ((await tamanho(req)) !== 0) continue;
    // Chave do WAWebMediaArrayBufferCacheStore: PREFIXO + encode(nome) + '_' + encode(filehash)
    const resto = req.url.startsWith(PREFIXO) ? req.url.slice(PREFIXO.length) : '';
    const corte = resto.indexOf('_');
    vazias.push({ req, filehash: corte < 0 ? null : decodeURIComponent(resto.slice(corte + 1)) });
  }
  return { total, vazias };
}

const antes = await vaziasDoCache();
const reconhecidas = [];
for (const v of antes.vazias) if (v.filehash && (await loja.has(v.filehash))) reconhecidas.push(v);

let apagadasPeloLru = 0;
let apagadasDireto = 0;
if (MODO === 'executar') {
  for (const v of reconhecidas) {
    await loja.del(v.filehash);
    apagadasPeloLru++;
  }
  for (const v of (await vaziasDoCache()).vazias) {
    await cache.delete(v.req);
    apagadasDireto++;
  }
}
const depois = await vaziasDoCache();

({
  modo: MODO,
  entradasAntes: antes.total,
  vaziasAntes: antes.vazias.length,
  reconhecidasPeloLru: reconhecidas.length,
  semFilehash: antes.vazias.filter((v) => !v.filehash).length,
  apagadasPeloLru,
  apagadasDireto,
  entradasDepois: depois.total,
  vaziasDepois: depois.vazias.length,
  impressaoDigitalDasVazias: await impressaoDigital(antes.vazias.map((v) => v.req.url))
});
