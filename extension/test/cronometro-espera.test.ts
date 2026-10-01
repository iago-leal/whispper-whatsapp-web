// Cronômetro único dos contadores visíveis (feature 006, D-03): um temporizador para todos os nós,
// tempo calculado do instante do clique, e não da soma de tiques, para não derivar com a aba oculta.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CronometroDeEspera, type AgendadorCronometro } from '../src/content/cronometro-espera.ts';

class AgendadorFalso implements AgendadorCronometro {
  instante = 0;
  repeticoes = new Map<number, () => void>();
  criados = 0;
  private proximoId = 1;

  agora(): number {
    return this.instante;
  }

  repetir(acao: () => void, _ms: number): unknown {
    const id = this.proximoId++;
    this.criados += 1;
    this.repeticoes.set(id, acao);
    return id;
  }

  parar(id: unknown): void {
    this.repeticoes.delete(id as number);
  }

  // Avança o relógio e dispara um tique, como o navegador faria.
  passar(ms: number): void {
    this.instante += ms;
    for (const acao of [...this.repeticoes.values()]) acao();
  }
}

class NoFalso {
  isConnected = true;
  escritas = 0;
  private texto: string | null = '';

  get textContent(): string | null {
    return this.texto;
  }

  set textContent(valor: string | null) {
    this.escritas += 1;
    this.texto = valor;
  }
}

class AlvoVisibilidadeFalso {
  ouvintes: Array<() => void> = [];
  addEventListener(_tipo: string, ouvinte: () => void): void {
    this.ouvintes.push(ouvinte);
  }
  disparar(): void {
    for (const o of this.ouvintes) o();
  }
}

function montar() {
  const agendador = new AgendadorFalso();
  const alvo = new AlvoVisibilidadeFalso();
  const cronometro = new CronometroDeEspera(agendador, alvo);
  return { agendador, alvo, cronometro };
}

test('registrar escreve o tempo de imediato, a partir do instante do clique', () => {
  const { agendador, cronometro } = montar();
  agendador.instante = 10_000;
  const no = new NoFalso();
  cronometro.registrar(no, 2_600);
  assert.equal(no.textContent, '7 s');
});

test('um único temporizador serve vários nós', () => {
  const { agendador, cronometro } = montar();
  const icone = new NoFalso();
  const janela = new NoFalso();
  cronometro.registrar(icone, 0);
  cronometro.registrar(janela, 0);
  cronometro.registrar(new NoFalso(), 500);
  assert.equal(agendador.criados, 1);
  assert.equal(agendador.repeticoes.size, 1);

  agendador.passar(3_000);
  assert.equal(icone.textContent, '3 s');
  assert.equal(janela.textContent, '3 s');
});

test('o texto só é reescrito quando muda', () => {
  const { agendador, cronometro } = montar();
  const no = new NoFalso();
  cronometro.registrar(no, 0);
  const iniciais = no.escritas;
  agendador.passar(400);
  agendador.passar(400);
  assert.equal(no.escritas, iniciais, 'em 0,8 s o texto continua "0 s"');
  agendador.passar(400);
  assert.equal(no.textContent, '1 s');
  assert.equal(no.escritas, iniciais + 1);
});

test('o tempo vem do relógio, não da contagem de tiques: um intervalo longo sem tique não deriva', () => {
  const { agendador, alvo, cronometro } = montar();
  const no = new NoFalso();
  cronometro.registrar(no, 0);
  agendador.instante = 300_000; // 5 min com a aba oculta, sem tique
  alvo.disparar(); // a aba volta a ficar visível
  assert.equal(no.textContent, '5 min 00 s');
});

test('remover o último nó para o temporizador', () => {
  const { agendador, cronometro } = montar();
  const a = new NoFalso();
  const b = new NoFalso();
  cronometro.registrar(a, 0);
  cronometro.registrar(b, 0);
  cronometro.remover(a);
  assert.equal(agendador.repeticoes.size, 1);
  cronometro.remover(b);
  assert.equal(agendador.repeticoes.size, 0);
  assert.equal(cronometro.quantidade, 0);
});

test('nó desconectado da página sai do registro no tique seguinte', () => {
  const { agendador, cronometro } = montar();
  const no = new NoFalso();
  cronometro.registrar(no, 0);
  no.isConnected = false;
  agendador.passar(1_000);
  assert.equal(cronometro.quantidade, 0);
  assert.equal(agendador.repeticoes.size, 0);
});

test('registrar de novo o mesmo nó troca o instante de início, sem duplicar', () => {
  const { agendador, cronometro } = montar();
  agendador.instante = 10_000;
  const no = new NoFalso();
  cronometro.registrar(no, 0);
  cronometro.registrar(no, 9_000);
  assert.equal(cronometro.quantidade, 1);
  assert.equal(no.textContent, '1 s');
});

test('volta a criar o temporizador quando um nó chega depois de ele parar', () => {
  const { agendador, cronometro } = montar();
  const no = new NoFalso();
  cronometro.registrar(no, 0);
  cronometro.remover(no);
  cronometro.registrar(new NoFalso(), 0);
  assert.equal(agendador.criados, 2);
  assert.equal(agendador.repeticoes.size, 1);
});
