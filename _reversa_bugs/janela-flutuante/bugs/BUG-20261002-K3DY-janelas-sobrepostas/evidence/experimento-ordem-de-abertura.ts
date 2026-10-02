// Experimento (BUG-20261002-K3DY): a altura da janela só existe depois que ela entra na página. Mede
// se a ordem entre entrar, medir e receber a posição dispara a transição do transform de
// janela-flutuante.css, que faria a janela deslizar do canto da tela até o balão (lição do A4MZ).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";

const css = readFileSync("/Users/iagoleal/dev/whispper-whatsapp-web/extension/src/content/janela-flutuante.css", "utf8");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${css}</style></head>` +
  `<body><div id="whispper-janelas-container"></div></body></html>`;
const raiz = mkdtempSync(join(tmpdir(), "whispper-k3dy-ordem-"));
const ext = join(raiz, "extensao");
mkdirSync(ext, { recursive: true });
writeFileSync(join(ext, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "vazia", version: "1" }));

const experimento = `(() => {
  const container = document.getElementById("whispper-janelas-container");
  const nova = () => { const el = document.createElement("div"); el.className = "whispper-janela"; el.textContent = "texto"; return el; };
  const ler = (el) => ({ transicoes: el.getAnimations().length, topoNaTela: Math.round(el.getBoundingClientRect().top) });
  const r = {};

  // Entra, é medida e só então recebe a posição (correção ingênua)
  const a = nova(); container.appendChild(a); a.offsetHeight; a.style.transform = "translate3d(500px, 300px, 0)";
  r.entra_mede_posiciona = ler(a);

  // Entra e recebe a posição sem medida no meio (código atual)
  const b = nova(); container.appendChild(b); b.style.transform = "translate3d(500px, 300px, 0)";
  r.entra_posiciona_sem_medir = ler(b);

  // Recebe a posição fora da página, entra e só então é medida (plano)
  const c = nova(); c.style.transform = "translate3d(500px, 300px, 0)"; container.appendChild(c); c.offsetHeight;
  r.posiciona_entra_mede = ler(c);
  return r;
})()`;

const navegador = await Navegador.abrir(localizarNavegador()!, join(raiz, "perfil"), ext);
try {
  const p = await navegador.abrirPagina("about:blank");
  await p.definirTamanho(1316, 806);
  await p.navegarSimulado("https://exemplo.test/", html);
  await p.aguardar("!!document.getElementById('whispper-janelas-container')", 10_000, "a página carregar");
  await p.trazerParaFrente();
  console.log(JSON.stringify(await p.avaliar(experimento), null, 1));
} finally {
  await navegador.fechar();
  rmSync(raiz, { recursive: true, force: true });
}
