// Copia para dist/ o que a compilação não gera: a amostra do diagnóstico, as folhas de estilo e as
// páginas do popup e da instalação guiada, conforme estaticos.json, que o teste do manifesto também
// lê. Em Node, e não com `mkdir -p` e `cp`, para que `npm run build` rode também no cmd.exe do Windows.

import { copyFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import estaticos from "./estaticos.json" with { type: "json" };

const EXTENSAO = fileURLToPath(new URL("..", import.meta.url));

for (const [origem, pasta] of estaticos) {
  mkdirSync(join(EXTENSAO, pasta), { recursive: true });
  copyFileSync(join(EXTENSAO, origem), join(EXTENSAO, pasta, basename(origem)));
}
