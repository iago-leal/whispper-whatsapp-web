// Reprodução isolada (BUG-20261002-HVT4 e BUG-20261002-OW7G): o gerenciador de janelas, montado do
// código-fonte, roda no Chrome for Testing com a folha de estilos real, numa página sem o WhatsApp. A
// geometria copia as medidas do WhatsApp real nas aceitações do A4MZ e do K3DY: tela de 1624 × 907, área
// da conversa de x = 551 a 1624, área das mensagens até y = 844 (abaixo dela, a caixa de escrita), balões
// de voz recebidos de 336 × 68 px em x = 613.
//
// Cenário 1 (HVT4): o último áudio da conversa, no pé da área das mensagens (balão em y = 739, como na
// aceitação do A4MZ), concluído com texto longo e, à parte, com erro.
// Cenário 2 (HVT4, EC-05): cinco áudios consecutivos, a 95 px um do outro, empilhados pela colisão.
// Cenário 3 (OW7G): quatro áudios consecutivos com os estados da aceitação do K3DY (erro, texto longo,
// erro, erro): quanto cada janela fica abaixo do seu balão e se alguma coisa a liga a ele.
//
// O script mede e não faz asserção. Comando, a partir de extension/:
//   node ../_reversa_bugs/janela-flutuante/bugs/BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/reproduzir-hvt4-ow7g.ts
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
               export { CronometroDeEspera } from "./src/content/cronometro-espera.ts";
               export { calcularPosicoesJanelas } from "./src/content/posicionador-colisoes.ts";`,
    resolveDir: EXT, loader: "ts",
  },
  bundle: true, format: "iife", globalName: "W", write: false, logLevel: "warning",
});
const css = readFileSync(join(EXT, "src/content/janela-flutuante.css"), "utf8");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${css}</style></head>` +
  `<body><script>${pacote.outputFiles[0]!.text}</script></body></html>`;

// Extensão vazia: o Navegador exige uma, e a página de teste não é a do WhatsApp
const raiz = mkdtempSync(join(tmpdir(), "whispper-hvt4-"));
const ext = join(raiz, "extensao");
mkdirSync(ext, { recursive: true });
writeFileSync(join(ext, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "vazia", version: "1" }));

const FRASE = "Oi, tudo bem? Passei aqui para avisar que chego um pouco mais tarde hoje.";
const TEXTOS = {
  medio: `${FRASE} ${FRASE}`,
  longo: Array.from({ length: 12 }, () => FRASE).join(" "),
};

const cenarios = `(() => {
  const TELA = { largura: innerWidth, altura: innerHeight };
  const AREA = { esquerda: 551, direita: 1624 };
  const FUNDO_DAS_MENSAGENS = 844;
  const ancora = (id, y) => ({ idAudio: id, x: 613, y, largura: 336, altura: 68, visivel: true });
  const T = ${JSON.stringify(TEXTOS)};
  const concluido = (texto) => ({ tipo: "concluido", texto, idioma: "pt", tempos: { esperaTotalMs: 3100, esperaFilaMs: 0, duracaoAudioSeg: 13 } });
  const erro = { tipo: "erro", mensagem: "O motor não conseguiu transcrever este áudio.", motivo: "FALHA_NA_TRANSCRICAO", falhouAposMs: 0 };

  const janela = (id) => document.querySelector('.whispper-janela[aria-label="Transcrição do áudio ' + id + '"]');
  // Retângulo-alvo: a posição do transform aplicado e o tamanho desenhado (não depende da transição)
  const alvo = (id) => {
    const el = janela(id);
    const m = /translate3d\\((-?[\\d.]+)px, (-?[\\d.]+)px/.exec(el.style.transform);
    return { id, x: Number(m[1]), y: Number(m[2]), largura: el.offsetWidth, altura: el.offsetHeight };
  };
  const contraBordas = (r) => ({
    ...r,
    fim: r.y + r.altura,
    alemDoFimDasMensagens: Math.max(0, r.y + r.altura - FUNDO_DAS_MENSAGENS),
    alemDaTela: Math.max(0, r.y + r.altura - TELA.altura),
  });
  // Tudo o que, na página, poderia ligar a janela ao balão: elemento irmão no container, filho com
  // "seta" na classe, ou pseudoelemento ::before/::after com conteúdo
  const ligacoes = (id) => {
    const el = janela(id);
    const pseudo = ["::before", "::after"].filter((p) => {
      const c = getComputedStyle(el, p).content;
      return c && c !== "none" && c !== "normal";
    });
    return {
      filhosComSeta: el.querySelectorAll('[class*="seta"]').length,
      pseudoelementosComConteudo: pseudo,
    };
  };
  const container = () => document.getElementById("whispper-janelas-container");
  const limpar = () => container()?.replaceChildren();
  const saida = { tela: TELA, area: AREA, fundoDasMensagens: FUNDO_DAS_MENSAGENS };

  // Cenário 1
  for (const [nome, estado] of [["texto_longo", concluido(T.longo)], ["erro", erro]]) {
    limpar();
    const g = new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), (id) => ancora(id, 739), () => AREA);
    g.abrir("P");
    g.definirEstado("P", estado);
    saida["cenario1_pe_da_conversa_" + nome] = { balao: ancora("P", 739), janela: contraBordas(alvo("P")) };
    g.fechar("P");
  }

  // Cenário 2
  limpar();
  const ids2 = ["C1", "C2", "C3", "C4", "C5"];
  const ys2 = [149, 244, 339, 434, 529];
  const g2 = new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), (id) => ancora(id, ys2[ids2.indexOf(id)]), () => AREA);
  for (const id of ids2) g2.abrir(id);
  [erro, concluido(T.longo), erro, erro, concluido(T.medio)].forEach((e, i) => g2.definirEstado(ids2[i], e));
  saida.cenario2_cadeia_de_cinco = ids2.map((id) => contraBordas(alvo(id)));
  for (const id of ids2) g2.fechar(id);

  // Cenário 3
  limpar();
  const ids3 = ["S1", "S2", "S3", "S4"];
  const ys3 = [149, 244, 339, 434];
  const g3 = new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), (id) => ancora(id, ys3[ids3.indexOf(id)]), () => AREA);
  for (const id of ids3) g3.abrir(id);
  [erro, concluido(T.longo), erro, erro].forEach((e, i) => g3.definirEstado(ids3[i], e));
  const rets3 = ids3.map(alvo);
  // O que o posicionador calcula para as mesmas alturas: o campo deslocadaPorColisao existe
  const calculadas = W.calcularPosicoesJanelas(
    rets3.map((r, i) => ({ idAudio: r.id, direcao: "recebido", largura: 320, altura: r.altura, ancora: ancora(r.id, ys3[i]) })),
    AREA.direita, AREA.esquerda);
  saida.cenario3_quatro_como_no_k3dy = {
    janelas: rets3.map((r, i) => ({
      ...r,
      balaoY: ys3[i],
      abaixoDoBalao: r.y - ys3[i],
      centroDoBalaoDentroDaJanela: ys3[i] + 34 >= r.y && ys3[i] + 34 <= r.y + r.altura,
      deslocadaPorColisao: calculadas.find((c) => c.idAudio === r.id).deslocadaPorColisao,
      ...ligacoes(r.id),
    })),
    elementosNoContainerAlemDasJanelas: [...container().children].filter((c) => !c.classList.contains("whispper-janela")).length,
  };
  return saida;
})()`;

const navegador = await Navegador.abrir(localizarNavegador()!, join(raiz, "perfil"), ext);
try {
  const p = await navegador.abrirPagina("about:blank");
  await p.definirTamanho(1624, 907);
  await p.navegarSimulado("https://exemplo.test/", html);
  await p.aguardar("typeof W !== 'undefined'", 10_000, "o pacote do gerenciador carregar");
  await p.trazerParaFrente();
  await esperar(100);
  console.log(JSON.stringify(await p.avaliar(cenarios), null, 1));
} finally {
  await navegador.fechar();
  rmSync(raiz, { recursive: true, force: true });
}
