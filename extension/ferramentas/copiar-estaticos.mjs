// Copia para dist/ o que a compilação não gera: a amostra do diagnóstico, as folhas de estilo e as
// páginas do popup e da instalação guiada. Em Node, e não com `mkdir -p` e `cp`, para que
// `npm run build` rode também no cmd.exe do Windows.

import { copyFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const EXTENSAO = fileURLToPath(new URL("..", import.meta.url));
const COPIAS = [
  ["../amostras/sinteticas/fala-pt.ogg", "dist/diagnostico"],
  ["src/content/estilos.css", "dist/content"],
  ["src/content/janela-flutuante.css", "dist/content"],
  ["popup/index.html", "dist/popup"],
  ["popup/popup.css", "dist/popup"],
  ["onboarding/index.html", "dist/onboarding"],
  ["onboarding/onboarding.css", "dist/onboarding"],
];

for (const [origem, pasta] of COPIAS) {
  mkdirSync(join(EXTENSAO, pasta), { recursive: true });
  copyFileSync(join(EXTENSAO, origem), join(EXTENSAO, pasta, basename(origem)));
}
