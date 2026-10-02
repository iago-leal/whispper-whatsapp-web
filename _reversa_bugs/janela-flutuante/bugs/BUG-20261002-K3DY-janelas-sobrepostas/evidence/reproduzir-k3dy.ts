// Reprodução isolada (BUG-20261002-K3DY): o gerenciador de janelas, montado do código-fonte, roda no
// Chrome for Testing com a folha de estilos real, numa página sem o WhatsApp. As âncoras simulam
// balões de voz consecutivos de 62 px, a 70 px um do outro, na área da conversa do print do A4MZ
// (x de 488 a 1316). Mede a altura desenhada de cada janela e as sobreposições entre elas.
//
// Cenário 1 (critério 1 e RF-05): cinco áudios recebidos, todos concluídos com textos de tamanhos
// diferentes, um deles no limite de 240 px (RF-07).
// Cenário 2 (critério 2): duas janelas em espera, e a de cima conclui com texto longo.
// Cenário 3 (nota do A4MZ): um recebido e um enviado de lados opostos.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import esbuild from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/node_modules/esbuild/lib/main.js";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";

const EXT = "/Users/iagoleal/dev/whispper-whatsapp-web/extension";

const pacote = await esbuild.build({
  stdin: {
    contents: `export { GerenciadorDeJanelas } from "./src/content/gerenciador-janelas.ts";
               export { CronometroDeEspera } from "./src/content/cronometro-espera.ts";`,
    resolveDir: EXT, loader: "ts",
  },
  bundle: true, format: "iife", globalName: "W", write: false, logLevel: "warning",
});
const css = readFileSync(join(EXT, "src/content/janela-flutuante.css"), "utf8");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${css}</style></head>` +
  `<body><script>${pacote.outputFiles[0]!.text}</script></body></html>`;

// Extensão vazia: o Navegador exige uma, e a página de teste não é a do WhatsApp
const raiz = mkdtempSync(join(tmpdir(), "whispper-k3dy-"));
const ext = join(raiz, "extensao");
mkdirSync(ext, { recursive: true });
writeFileSync(join(ext, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "vazia", version: "1" }));

const FRASE = "Oi, tudo bem? Passei aqui para avisar que chego um pouco mais tarde hoje.";
const TEXTOS = {
  curto: "Pode deixar.",
  medio: `${FRASE} ${FRASE}`,
  longo: Array.from({ length: 12 }, () => FRASE).join(" "),
};

const cenarios = `(() => {
  const AREA = { esquerda: 488, direita: 1316 };
  const ancora = (id, i, x = 550) => ({ idAudio: id, x, y: 66 + 70 * i, largura: 336, altura: 62, visivel: true });
  const concluido = (texto) => ({ tipo: "concluido", texto, idioma: "pt", tempos: { esperaTotalMs: 9700, esperaFilaMs: 0, duracaoAudioSeg: 13 } });
  const T = ${JSON.stringify(TEXTOS)};

  // Retângulo-alvo de cada janela: a posição do transform aplicado e o tamanho desenhado. Não depende
  // da transição, que só anima o caminho até o alvo.
  const alvo = (el) => {
    const m = /translate3d\\((-?[\\d.]+)px, (-?[\\d.]+)px/.exec(el.style.transform);
    return { id: el.getAttribute("aria-label").replace("Transcrição do áudio ", ""),
             x: Number(m[1]), y: Number(m[2]), largura: el.offsetWidth, altura: el.offsetHeight };
  };
  const sobreposicoes = (rets) => {
    const achadas = [];
    for (let i = 0; i < rets.length; i++) for (let j = i + 1; j < rets.length; j++) {
      const a = rets[i], b = rets[j];
      const dx = Math.min(a.x + a.largura, b.x + b.largura) - Math.max(a.x, b.x);
      const dy = Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y);
      if (dx > 0 && dy > 0) achadas.push({ entre: a.id + " e " + b.id, dx, dy });
    }
    return achadas;
  };
  const medir = (container) => {
    const rets = [...container.querySelectorAll(".whispper-janela")].map(alvo);
    return { janelas: rets, sobreposicoes: sobreposicoes(rets) };
  };
  const limpar = () => document.getElementById("whispper-janelas-container")?.replaceChildren();

  const saida = {};

  // Cenário 1
  limpar();
  const ids1 = ["A1", "A2", "A3", "A4", "A5"];
  const g1 = new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), (id) => ancora(id, ids1.indexOf(id)), () => AREA);
  for (const id of ids1) g1.abrir(id);
  const textos1 = [T.medio, T.curto, T.longo, T.medio, T.curto];
  ids1.forEach((id, i) => g1.definirEstado(id, concluido(textos1[i])));
  saida.cenario1_cinco_concluidos = medir(document.getElementById("whispper-janelas-container"));
  for (const id of ids1) g1.fechar(id);

  // Cenário 2
  limpar();
  const ids2 = ["B1", "B2"];
  const g2 = new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), (id) => ancora(id, ids2.indexOf(id)), () => AREA);
  for (const id of ids2) g2.abrir(id);
  const container = document.getElementById("whispper-janelas-container");
  saida.cenario2_antes_em_espera = medir(container);
  g2.definirEstado("B1", concluido(T.longo));
  saida.cenario2_depois_de_B1_concluir = medir(container);
  for (const id of ids2) g2.fechar(id);

  // Cenário 3: enviado à esquerda do balão colado à direita, recebido abaixo, à direita do seu balão
  limpar();
  const g3 = new W.GerenciadorDeJanelas(new W.CronometroDeEspera(),
    (id) => id === "E" ? ancora("E", 0, 919) : ancora("R", 1, 550), () => AREA);
  g3.abrir("E", "enviado");
  g3.abrir("R", "recebido");
  g3.definirEstado("E", concluido(T.medio));
  g3.definirEstado("R", concluido(T.medio));
  const m3 = medir(container);
  saida.cenario3_lados_opostos = { ...m3, R_deslocada_de: ancora("R", 1).y };
  return saida;
})()`;

const navegador = await Navegador.abrir(localizarNavegador()!, join(raiz, "perfil"), ext);
try {
  const p = await navegador.abrirPagina("about:blank");
  await p.definirTamanho(1316, 806);
  await p.navegarSimulado("https://exemplo.test/", html);
  await p.aguardar("typeof W !== 'undefined'", 10_000, "o pacote do gerenciador carregar");
  await p.trazerParaFrente();
  await esperar(100);
  console.log(JSON.stringify(await p.avaliar(cenarios), null, 1));
} finally {
  await navegador.fechar();
  rmSync(raiz, { recursive: true, force: true });
}
