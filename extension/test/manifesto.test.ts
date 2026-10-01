// Arquivos que o Chrome carrega pelo manifesto e pelas páginas da extensão (BUG-20261001-RMLU).
//
// O manifesto declarava popup/index.html, a página-fonte, cujo ./popup.js só existe ao lado da
// cópia que o build põe em dist/popup/. O teste dispensa o build: sob dist/, um .js vem do
// src/**/*.ts de mesmo caminho e os demais arquivos vêm das cópias do script "build"; fora de
// dist/, o arquivo é servido como está no repositório.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const lerDaRaiz = (caminho: string) => readFileSync(RAIZ + caminho, "utf8");
const manifesto = JSON.parse(lerDaRaiz("manifest.json"));
const build: string = JSON.parse(lerDaRaiz("package.json")).scripts.build;

// "cp popup/index.html dist/popup/" serve popup/index.html em dist/popup/index.html.
const copias = new Map<string, string>();
for (const [, origem, destino] of build.matchAll(/cp (\S+) (dist\/\S*?)\/?(?= |$)/g)) {
  copias.set(posix.join(destino!, posix.basename(origem!)), origem!);
}

/** O arquivo do repositório que a extensão serve no caminho dado, ou null se nada o produz. */
function origemNoRepositorio(caminho: string): string | null {
  const copiado = copias.get(caminho);
  if (copiado) return copiado;
  if (!caminho.startsWith("dist/")) return existsSync(RAIZ + caminho) ? caminho : null;
  if (!caminho.endsWith(".js")) return null;
  const fonte = `src/${caminho.slice("dist/".length, -".js".length)}.ts`;
  return existsSync(RAIZ + fonte) ? fonte : null;
}

/** Os caminhos que faltam na extensão entre os scripts e estilos que a página carrega. */
function recursosAusentes(pagina: string): string[] {
  const origem = origemNoRepositorio(pagina);
  if (!origem) return [pagina];
  const html = lerDaRaiz(origem);
  return [...html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="([^"]+)"/g)]
    .map(([, referencia]) => posix.join(posix.dirname(pagina), referencia!))
    .filter((caminho) => !origemNoRepositorio(caminho));
}

test("o popup declarado no manifesto carrega um script que a extensão contém (BUG-20261001-RMLU)", () => {
  assert.deepEqual(recursosAusentes(manifesto.action.default_popup), []);
});

test("todo arquivo do manifesto e toda página aberta pela extensão existem no pacote", () => {
  const declarados: string[] = [
    manifesto.background.service_worker,
    ...manifesto.content_scripts.flatMap((c: { js?: string[]; css?: string[] }) => [...(c.js ?? []), ...(c.css ?? [])]),
  ];
  assert.deepEqual(declarados.filter((caminho) => !origemNoRepositorio(caminho)), []);
  // background.ts (na instalação) e popup.ts ("Verificar compatibilidade") abrem a página de boas-vindas.
  for (const pagina of [manifesto.action.default_popup, "dist/onboarding/index.html"]) {
    assert.deepEqual(recursosAusentes(pagina), [], pagina);
  }
});

// O áudio de uma mensagem de voz só é alcançável pelo carregador de módulos da própria página, que o
// mundo isolado do script de conteúdo não enxerga (BUG-20261001-2MOY).
test("o script do mundo da página entra só no WhatsApp Web, antes da página, e sai do build num arquivo único (RNF-05, BUG-20261001-2MOY)", () => {
  const daPagina = manifesto.content_scripts.filter((c: { world?: string }) => c.world === "MAIN");
  assert.equal(daPagina.length, 1, "nenhum script declarado no mundo da página");
  const [script] = daPagina;
  assert.deepEqual(script.matches, ["https://web.whatsapp.com/*"]);
  assert.equal(script.run_at, "document_start");
  // "world" no manifesto só é aceito a partir do Chrome 111.
  assert.ok(Number(manifesto.minimum_chrome_version) >= 111, `minimum_chrome_version ${manifesto.minimum_chrome_version}`);
  // O mundo da página não carrega módulos: cada script sai do build empacotado num único IIFE.
  const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  for (const js of script.js as string[]) {
    const fonte = `src/${js.slice("dist/".length, -".js".length)}.ts`;
    assert.match(build, new RegExp(`esbuild ${escapar(fonte)} --bundle --format=iife --outfile=${escapar(js)}(?= |$)`));
  }
});
