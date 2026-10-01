import type { Relogio } from "../../src/adaptadores/motor-local/adaptador-motor-local.ts";

type Agendado = { id: number; quando: number; acao: () => void };

export class RelogioFalso implements Relogio {
  private agora = 0;
  private proximoId = 1;
  private agendados: Agendado[] = [];

  definir(acao: () => void, ms: number): number {
    const id = this.proximoId++;
    this.agendados.push({ id, quando: this.agora + ms, acao });
    return id;
  }

  cancelar(id: unknown): void {
    this.agendados = this.agendados.filter((a) => a.id !== id);
  }

  avancar(ms: number): void {
    const alvo = this.agora + ms;
    for (;;) {
      const vencidos = this.agendados.filter((a) => a.quando <= alvo).sort((a, b) => a.quando - b.quando);
      const proximo = vencidos[0];
      if (!proximo) break;
      this.agendados = this.agendados.filter((a) => a !== proximo);
      this.agora = proximo.quando;
      proximo.acao();
    }
    this.agora = alvo;
  }

  get pendentes(): number {
    return this.agendados.length;
  }
}
