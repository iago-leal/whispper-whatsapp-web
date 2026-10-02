// Experimento (BUG-20261002-OW7G, planejamento): o traçado de um <path> SVG, escrito pela propriedade CSS d,
// segue uma transição de 120 ms como o transform da janela? Comando, a partir de extension/: node <este arquivo>
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";
const raiz = mkdtempSync(join(tmpdir(), "exp-d-"));
const ext = join(raiz, "extensao"); mkdirSync(ext, { recursive: true });
writeFileSync(join(ext, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "vazia", version: "1" }));
const html = `<!doctype html><html><head><style>path{transition:d .12s ease-out}</style></head><body>
<svg width="400" height="400"><path id="p" stroke="green" fill="none"/></svg></body></html>`;
const nav = await Navegador.abrir(localizarNavegador()!, join(raiz, "perfil"), ext);
try {
  const p = await nav.abrirPagina("about:blank");
  await p.navegarSimulado("https://exemplo.test/", html);
  await p.trazerParaFrente();
  await esperar(100);
  console.log(await p.avaliar(`(() => {
    const el = document.getElementById("p");
    el.style.setProperty("d", 'path("M 10 10 H 20 V 50 H 5")');
    getComputedStyle(el).d;
    el.style.setProperty("d", 'path("M 10 100 H 20 V 150 H 5")');
    return JSON.stringify({ alvo: el.style.d, anims: el.getAnimations().length, agora: getComputedStyle(el).d });
  })()`));
  await esperar(300);
  console.log(await p.avaliar(`JSON.stringify({ anims: document.getElementById("p").getAnimations().length, fim: getComputedStyle(document.getElementById("p")).d, bbox: document.getElementById("p").getBBox().y })`));
} finally { await nav.fechar(); rmSync(raiz, { recursive: true, force: true }); }
