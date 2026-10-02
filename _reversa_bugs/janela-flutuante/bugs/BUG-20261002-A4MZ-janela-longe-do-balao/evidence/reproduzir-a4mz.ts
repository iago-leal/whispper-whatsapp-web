// Reprodução isolada (BUG-20261002-A4MZ): página falsa de web.whatsapp.com com a geometria do print do
// usuário (tela de 1316 px, lista de conversas até x = 488, balões de voz estreitos dentro de linhas
// da largura do painel). Clica no ícone de um áudio recebido e de um enviado e mede onde a janela abre
// em relação ao balão visível (msg-container) e à lista de conversas (#side).
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import esbuild from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/node_modules/esbuild/lib/main.js";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";

const EXT = "/Users/iagoleal/dev/whispper-whatsapp-web/extension";
const LARGURA_TELA = Number(process.env.LARGURA_TELA ?? 1316);

const raiz = mkdtempSync(join(tmpdir(), "whispper-a4mz-"));
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

const PLAYER = `<div><button aria-label="Reproduzir mensagem de voz" style="width:34px;height:34px">▶</button></div>`;
// Linha > conv-msg[data-id] > conteúdo virtualizado > faixa da direção > balão (msg-container), como no
// DOM real; a linha e o conv-msg ocupam a largura do painel, e só o balão tem a largura do áudio.
const linha = (id: string, direcao: "in" | "out") =>
  `<div role="row"><div data-id="${id}" data-testid="conv-msg-${id}"><div data-virtualized="false">` +
  `<div class="message-${direcao}" style="display:flex;padding:6px 62px;justify-content:${direcao === "in" ? "flex-start" : "flex-end"}">` +
  `<div data-testid="msg-container" style="width:335px;height:62px;background:#fff">${PLAYER}</div></div></div></div></div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>WhatsApp</title></head><body style="margin:0">` +
  `<div id="app" style="display:flex;height:100vh"><div id="side" style="width:488px;flex:none;background:#eee"></div>` +
  `<div id="painel" style="flex:1"><div id="main"><div data-tab="8" role="application" style="padding-top:60px">` +
  linha("R", "in") + linha("E", "out") +
  `</div></div></div></div></body></html>`;

const navegador = await Navegador.abrir(localizarNavegador()!, join(raiz, "perfil"), ext);
try {
  const p = await navegador.abrirPagina("about:blank");
  const sessao = (p as any).sessao as string;
  await navegador.enviar("Emulation.setDeviceMetricsOverride", { width: LARGURA_TELA, height: 806, deviceScaleFactor: 1, mobile: false }, sessao);
  await p.navegarSimulado("https://web.whatsapp.com/", html);
  const limite = Date.now() + 10_000;
  while (!p.mundosIsolados.includes("whispper-whatsapp-web")) { if (Date.now() > limite) throw new Error("sem script"); await esperar(50); }
  await p.avaliar("0");
  await p.trazerParaFrente();
  await esperar(300);

  const medir = (id: string) => p.avaliar(`(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), direita: Math.round(b.right), y: Math.round(b.top), largura: Math.round(b.width) }; };
    const janela = document.querySelector('.whispper-janela[aria-label="Transcrição do áudio ${id}"]');
    const conv = document.querySelector('#main [data-id="${id}"]');
    const balao = conv.querySelector('[data-testid="msg-container"]');
    const side = document.querySelector('#side');
    const j = janela && janela.getBoundingClientRect();
    return {
      tela: innerWidth,
      side: r(side),
      convMsgDataId: r(conv),
      balaoVisivel: r(balao),
      janela: janela && { ...r(janela), oculta: janela.classList.contains('whispper-janela-oculta'), transform: janela.style.transform },
      janelaCobreListaDeConversas: !!j && j.left < side.getBoundingClientRect().right,
      folgaAteBalao: j && { aDireita: Math.round(j.left - balao.getBoundingClientRect().right), aEsquerda: Math.round(balao.getBoundingClientRect().left - j.right), topos: Math.round(j.top - balao.getBoundingClientRect().top) },
    };
  })()`);

  for (const id of ["R", "E"]) {
    await p.avaliar(`document.querySelector('#main .whispper-btn-transcrever[data-id="${id}"]').click()`);
    await esperar(200);
    console.log(`ÁUDIO ${id === "R" ? "RECEBIDO" : "ENVIADO"} (${id})`, JSON.stringify(await medir(id), null, 1));
  }
} finally {
  await navegador.fechar();
  rmSync(raiz, { recursive: true, force: true });
}
