// O instalador .pkg do aplicativo auxiliar só se gera no macOS; nas outras plataformas, o build
// segue sem ele. No Windows, o aplicativo auxiliar se instala por auxiliar\motor.cmd.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform === "darwin") {
  const gerador = fileURLToPath(new URL("../../auxiliar/ferramentas/gerar_pkg.sh", import.meta.url));
  execFileSync("bash", [gerador], { stdio: "inherit" });
}
