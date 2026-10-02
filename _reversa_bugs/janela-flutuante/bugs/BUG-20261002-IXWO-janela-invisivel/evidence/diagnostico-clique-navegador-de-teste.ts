// Diagnóstico: clique no ícone na página falsa, onde a janela vai parar e se o player continua clicável.
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import esbuild from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/node_modules/esbuild/lib/main.js";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";

const EXT = "/Users/iagoleal/dev/whispper-whatsapp-web/extension";
const SAIDA = "/private/tmp/claude-501/-Users-iagoleal-dev-whispper-whatsapp-web/48338bab-33bd-45dc-a04f-b1690f19a3e2/scratchpad";

const raiz = mkdtempSync(join(tmpdir(), "whispper-diag-"));
const ext = join(raiz, "extensao");
mkdirSync(join(ext, "dist", "content"), { recursive: true });
copyFileSync(join(EXT, "manifest.json"), join(ext, "manifest.json"));
for (const [entrada, saida, formato] of [
  ["src/content/index.ts", "dist/content/index.js", "iife"],
  ["src/pagina/ponte-audio.ts", "dist/pagina/ponte-audio.js", "iife"],
  ["src/background.ts", "dist/background.js", "esm"],
] as const) {
  await esbuild.build({ entryPoints: [join(EXT, entrada)], bundle: true, format: formato, outfile: join(ext, saida), logLevel: "warning" });
}
for (const css of ["estilos.css", "janela-flutuante.css"]) copyFileSync(join(EXT, "src/content", css), join(ext, "dist/content", css));

const PLAYER = `<div style="display:flex;align-items:center;gap:8px"><button aria-label="Reproduzir mensagem de voz" style="width:34px;height:34px" onclick="window.__plays=(window.__plays||0)+1">▶</button><span>0:38</span></div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>WhatsApp</title></head><body style="margin:0">` +
  `<div id="app"><div id="side"></div><div id="painel" style="position:absolute;left:300px;top:0;width:450px;height:400px">` +
  `<div id="main"><div data-tab="8" role="application" style="padding-top:120px">` +
  `<div role="row"><div data-id="A" data-testid="conv-msg-A" style="width:360px;margin-left:40px;background:#fff">` +
  `<div data-virtualized="false"><div data-testid="msg-container">${PLAYER}</div></div></div></div>` +
  `</div></div></div></div></body></html>`;

const navegador = await Navegador.abrir(localizarNavegador()!, join(raiz, "perfil"), ext);
try {
  const p = await navegador.abrirPagina("about:blank");
  await p.navegarSimulado("https://web.whatsapp.com/", html);
  const limite = Date.now() + 10_000;
  while (!p.mundosIsolados.includes("whispper-whatsapp-web")) { if (Date.now() > limite) throw new Error("sem script"); await esperar(50); }
  await p.avaliar("0");
  await esperar(500);

  const sessao = (p as any).sessao as string;
  const clicarEm = async (x: number, y: number) => {
    for (const type of ["mousePressed", "mouseReleased"]) {
      await navegador.enviar("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }, sessao);
    }
  };
  const centro = (sel: string) => p.avaliar<{ x: number; y: number } | null>(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; })()`);
  const estado = () => p.avaliar(`(() => {
    const b = document.querySelector(".whispper-btn-transcrever");
    const play = document.querySelector('[aria-label="Reproduzir mensagem de voz"]');
    const r = play.getBoundingClientRect();
    const topo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      icone: b && { estado: b.getAttribute("data-whispper-estado"), classes: b.className, contador: b.querySelector(".whispper-contador")?.textContent, rect: b.getBoundingClientRect().toJSON(), pai: b.parentElement?.outerHTML.slice(0, 120) },
      plays: window.__plays || 0,
      topoNoPlay: topo && (topo.id || topo.className || topo.tagName),
      container: (() => { const c = document.getElementById("whispper-janelas-container"); return c && { rect: c.getBoundingClientRect().toJSON(), pe: getComputedStyle(c).pointerEvents, filhos: c.children.length }; })(),
      janelas: [...document.querySelectorAll(".whispper-janela")].map((j) => ({ classes: j.className, transform: j.style.transform, rect: j.getBoundingClientRect().toJSON(), visivel: getComputedStyle(j).display + "/" + getComputedStyle(j).visibility + "/" + getComputedStyle(j).opacity, texto: j.innerText.slice(0, 200) })),
    };
  })()`);

  console.log("INICIAL", JSON.stringify(await estado(), null, 1));
  const play = await centro('[aria-label="Reproduzir mensagem de voz"]');
  await clicarEm(play!.x, play!.y);
  console.log("PLAY ANTES DO CLIQUE NO ÍCONE, plays =", (await estado() as any).plays);
  const icone = await centro(".whispper-btn-transcrever");
  await clicarEm(icone!.x, icone!.y);
  await esperar(150);
  console.log("150 ms APÓS O CLIQUE", JSON.stringify(await estado(), null, 1));
  await esperar(3000);
  console.log("3 s APÓS O CLIQUE", JSON.stringify(await estado(), null, 1));
  await clicarEm(play!.x, play!.y);
  console.log("PLAY DEPOIS, plays =", (await estado() as any).plays);
  const { data } = await navegador.enviar("Page.captureScreenshot", { format: "png" }, sessao);
  writeFileSync(join(SAIDA, "diag.png"), Buffer.from(data, "base64"));
  console.log("CONSOLE", JSON.stringify(p.console, null, 1));
} finally {
  await navegador.fechar();
  rmSync(raiz, { recursive: true, force: true });
}
