import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NucleoDeTranscricao } from '../src/dominio/nucleo.ts';
import { GerenciadorContadores } from '../src/dominio/contadores.ts';
import { FilaDeTranscricao } from '../src/dominio/fila-transcricao.ts';
import { CacheSessao } from '../src/dominio/cache-sessao.ts';
import { ArmazenamentoMemoria } from '../src/adaptadores/armazenamento-chrome.ts';
import type {
  FonteDeAudio,
  DadosDoAudio,
  EventoPedidoTranscricao,
  EventoReproducao,
  CoordenadasAncora,
  StatusSaudeFonte,
  EstadoPedidoIcone
} from '../src/dominio/fonte-de-audio.ts';
import type {
  MotorDeTranscricao,
  EstadoDoMotor,
  ResultadoDaTranscricao
} from '../src/dominio/motor-de-transcricao.ts';
import type {
  ExibicaoDeTranscricao,
  EstadoExibicao
} from '../src/dominio/exibicao-de-transcricao.ts';

// Fake implementations das portas hexagonais para testes
class FakeFonteDeAudio implements FonteDeAudio {
  private cbSolicitar: ((ev: EventoPedidoTranscricao) => void)[] = [];
  private cbReproduzir: ((ev: EventoReproducao) => void)[] = [];
  private cbRemover: ((id: string) => void)[] = [];
  private audios = new Map<string, DadosDoAudio>();
  icones = new Map<string, EstadoPedidoIcone>();
  historicoIcone: Array<[string, EstadoPedidoIcone]> = [];

  cadastrarAudio(idAudio: string, duracaoSeg = 5, bytes = new Uint8Array([1, 2, 3])) {
    this.audios.set(idAudio, {
      idAudio,
      bytes,
      tipoDeMidia: 'audio/ogg; codecs=opus',
      duracaoSeg
    });
  }

  simularClique(idAudio: string, direcao: 'recebido' | 'enviado' = 'recebido') {
    this.cbSolicitar.forEach((cb) => cb({ idAudio, direcao }));
  }

  simularReproducao(idAudio: string, direcao: 'recebido' | 'enviado' = 'recebido') {
    this.cbReproduzir.forEach((cb) => cb({ idAudio, direcao }));
  }

  simularRemocao(idAudio: string) {
    this.cbRemover.forEach((cb) => cb(idAudio));
  }

  async obterAudio(idAudio: string): Promise<DadosDoAudio> {
    const audio = this.audios.get(idAudio);
    if (!audio) throw new Error('AUDIO_INDISPONIVEL: mensagem não encontrada');
    return audio;
  }

  aoSolicitarTranscricao(callback: (evento: EventoPedidoTranscricao) => void): () => void {
    this.cbSolicitar.push(callback);
    return () => (this.cbSolicitar = this.cbSolicitar.filter((c) => c !== callback));
  }

  aoIniciarReproducao(callback: (evento: EventoReproducao) => void): () => void {
    this.cbReproduzir.push(callback);
    return () => (this.cbReproduzir = this.cbReproduzir.filter((c) => c !== callback));
  }

  aoRemoverMensagem(callback: (idAudio: string) => void): () => void {
    this.cbRemover.push(callback);
    return () => (this.cbRemover = this.cbRemover.filter((c) => c !== callback));
  }

  aoMudarAncora(_callback: (ancora: CoordenadasAncora) => void): () => void {
    return () => {};
  }

  verificarSaude(): StatusSaudeFonte {
    return { status: 'ativa', versaoEstruturas: '2026.09' };
  }

  refletirEstadoPedido(idAudio: string, estado: EstadoPedidoIcone): void {
    this.icones.set(idAudio, estado);
    this.historicoIcone.push([idAudio, estado]);
  }
}

class FakeMotorDeTranscricao implements MotorDeTranscricao {
  estadoAtual: EstadoDoMotor = {
    estado: 'pronto',
    modelo: 'mlx-whisper-small',
    versaoApp: '0.1.0',
    protocolo: 1
  };
  respostaPadrao: ResultadoDaTranscricao = {
    ok: true,
    texto: 'Texto transcrito com sucesso.',
    idioma: 'pt',
    duracaoAudioSeg: 5,
    processamentoMs: 150
  };
  chamadasTranscrever: Array<{ audio: Uint8Array; tipoDeMidia: string }> = [];
  atrasoTranscreverMs = 0;
  // Respostas por chamada, na ordem; esgotadas, vale a respostaPadrao.
  respostas: ResultadoDaTranscricao[] = [];
  // Executado dentro de transcrever, para avançar um relógio falso.
  aoTranscrever?: () => void;

  async verificar(): Promise<EstadoDoMotor> {
    return this.estadoAtual;
  }

  async transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao> {
    this.chamadasTranscrever.push({ audio, tipoDeMidia });
    if (this.atrasoTranscreverMs > 0) {
      await new Promise((r) => setTimeout(r, this.atrasoTranscreverMs));
    }
    this.aoTranscrever?.();
    return this.respostas.shift() ?? this.respostaPadrao;
  }
}

class FakeExibicaoDeTranscricao implements ExibicaoDeTranscricao {
  janelasAbertas = new Set<string>();
  estados = new Map<string, EstadoExibicao>();
  historico: Array<[string, EstadoExibicao]> = [];
  destaques: string[] = [];
  cbFechar: ((id: string) => void)[] = [];
  cbReexecutar: ((id: string) => void)[] = [];

  abrir(idAudio: string): void {
    this.janelasAbertas.add(idAudio);
  }

  definirEstado(idAudio: string, estado: EstadoExibicao): void {
    this.estados.set(idAudio, estado);
    this.historico.push([idAudio, estado]);
  }

  destacar(idAudio: string): void {
    this.destaques.push(idAudio);
  }

  fechar(idAudio: string): void {
    this.janelasAbertas.delete(idAudio);
  }

  simularFecharPeloUsuario(idAudio: string): void {
    this.fechar(idAudio);
    this.cbFechar.forEach((cb) => cb(idAudio));
  }

  simularReexecutar(idAudio: string): void {
    this.cbReexecutar.forEach((cb) => cb(idAudio));
  }

  aoFechar(callback: (idAudio: string) => void): () => void {
    this.cbFechar.push(callback);
    return () => (this.cbFechar = this.cbFechar.filter((c) => c !== callback));
  }

  aoReexecutar(callback: (idAudio: string) => void): () => void {
    this.cbReexecutar.push(callback);
    return () => (this.cbReexecutar = this.cbReexecutar.filter((c) => c !== callback));
  }
}

describe('Núcleo de Transcrição — Domínio e Hexagonal', () => {
  it('RF-01 e RF-02: Atende pedidos estritamente sequenciais (FIFO) em sequência fragmentada', async () => {
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();

    motor.atrasoTranscreverMs = 20;
    fonte.cadastrarAudio('audio-1', 4);
    fonte.cadastrarAudio('audio-2', 6);
    fonte.cadastrarAudio('audio-3', 5);

    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento);
    await nucleo.inicializar();

    // Cliques em sequência rápida nos três áudios
    fonte.simularClique('audio-1');
    fonte.simularClique('audio-2');
    fonte.simularClique('audio-3');

    // Inicialmente, audio-1 está transcrevendo, audio-2 na posição 1, audio-3 na posição 2
    assert.equal(exibicao.janelasAbertas.has('audio-1'), true);
    assert.equal(exibicao.janelasAbertas.has('audio-2'), true);
    assert.equal(exibicao.janelasAbertas.has('audio-3'), true);

    const estadoA2 = exibicao.estados.get('audio-2');
    assert.equal(estadoA2?.tipo, 'fila');
    assert.equal(estadoA2?.tipo === 'fila' && estadoA2.posicaoNaFila, 1);

    const estadoA3 = exibicao.estados.get('audio-3');
    assert.equal(estadoA3?.tipo, 'fila');
    assert.equal(estadoA3?.tipo === 'fila' && estadoA3.posicaoNaFila, 2);

    // Aguarda o término da fila inteira
    await new Promise((r) => setTimeout(r, 100));

    // Todos concluídos com texto
    assert.equal(exibicao.estados.get('audio-1')?.tipo, 'concluido');
    assert.equal(exibicao.estados.get('audio-2')?.tipo, 'concluido');
    assert.equal(exibicao.estados.get('audio-3')?.tipo, 'concluido');

    // Motor chamado exatamente 3 vezes
    assert.equal(motor.chamadasTranscrever.length, 3);
  });

  it('RF-06 e RF-07: Reabertura imediata a partir do cache sem chamar o motor', async () => {
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();

    fonte.cadastrarAudio('audio-cache');
    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento);
    await nucleo.inicializar();

    fonte.simularClique('audio-cache');
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(motor.chamadasTranscrever.length, 1);
    assert.equal(exibicao.estados.get('audio-cache')?.tipo, 'concluido');

    // Usuário fecha a janela concluída
    exibicao.simularFecharPeloUsuario('audio-cache');
    assert.equal(exibicao.janelasAbertas.has('audio-cache'), false);

    // Clica de novo no mesmo áudio
    fonte.simularClique('audio-cache');

    // Janela reabriu com o texto do cache e o motor NÃO foi chamado novamente
    assert.equal(exibicao.janelasAbertas.has('audio-cache'), true);
    assert.equal(exibicao.estados.get('audio-cache')?.tipo, 'concluido');
    assert.equal(motor.chamadasTranscrever.length, 1);
  });

  it('RF-08: Cliques repetidos em áudio com janela já aberta apenas a destacam', async () => {
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();

    motor.atrasoTranscreverMs = 50;
    fonte.cadastrarAudio('audio-repetido');
    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento);
    await nucleo.inicializar();

    fonte.simularClique('audio-repetido');
    fonte.simularClique('audio-repetido');
    fonte.simularClique('audio-repetido');

    // Janela aberta apenas 1 vez, destacada duas vezes
    assert.equal(exibicao.destaques.filter((id) => id === 'audio-repetido').length, 2);
    assert.equal(nucleo.fila.obterFilaPendente().length, 0);
  });

  it('RF-09: Tentar de novo recoloca pedido com erro no fim da fila', async () => {
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();

    motor.respostaPadrao = {
      ok: false,
      codigo: 'FALHA_NA_TRANSCRICAO',
      motivo: 'Erro interno simulado'
    };
    fonte.cadastrarAudio('audio-falha');
    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento);
    await nucleo.inicializar();

    fonte.simularClique('audio-falha');
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(exibicao.estados.get('audio-falha')?.tipo, 'erro');

    // Agora o motor volta a funcionar normalmente
    motor.respostaPadrao = {
      ok: true,
      texto: 'Agora deu certo!',
      idioma: 'pt',
      duracaoAudioSeg: 3,
      processamentoMs: 80
    };

    // Usuário clica em "Tentar de novo" na janela
    exibicao.simularReexecutar('audio-falha');
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(exibicao.estados.get('audio-falha')?.tipo, 'concluido');
    const concluido = exibicao.estados.get('audio-falha');
    if (concluido?.tipo === 'concluido') {
      assert.equal(concluido.texto, 'Agora deu certo!');
    }
  });

  it('RF-10: Fechar janela na fila cancela o pedido; fechar transcrevendo conclui em background', async () => {
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();

    motor.atrasoTranscreverMs = 30;
    fonte.cadastrarAudio('audio-transcrevendo');
    fonte.cadastrarAudio('audio-na-fila');

    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento);
    await nucleo.inicializar();

    fonte.simularClique('audio-transcrevendo');
    fonte.simularClique('audio-na-fila');

    // Fecha a janela do que está na fila antes dele começar
    exibicao.simularFecharPeloUsuario('audio-na-fila');
    assert.equal(nucleo.fila.buscar('audio-na-fila'), undefined);

    // Fecha a janela do que está transcrevendo
    exibicao.simularFecharPeloUsuario('audio-transcrevendo');

    await new Promise((r) => setTimeout(r, 50));

    // O áudio que estava transcrevendo foi concluído e guardado no cache da sessão
    assert.equal(nucleo.cache.tem('audio-transcrevendo'), true);
    // Mas a janela não foi reaberta
    assert.equal(exibicao.janelasAbertas.has('audio-transcrevendo'), false);
    // E o áudio que estava na fila nunca foi enviado ao motor
    assert.equal(motor.chamadasTranscrever.length, 1);
  });

  it('RF-19: Motor indisponível encerra pedido em curso e fila inteira imediatamente', async () => {
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();

    motor.estadoAtual = {
      estado: 'indisponivel',
      codigo: 'MOTOR_INDISPONIVEL',
      motivo: 'App auxiliar não instalado'
    };

    fonte.cadastrarAudio('audio-m1');
    fonte.cadastrarAudio('audio-m2');

    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento);
    await nucleo.inicializar();

    fonte.simularClique('audio-m1');
    fonte.simularClique('audio-m2');

    await new Promise((r) => setTimeout(r, 20));

    assert.equal(exibicao.estados.get('audio-m1')?.tipo, 'erro');
    assert.equal(exibicao.estados.get('audio-m2')?.tipo, 'erro');
  });

  it('EC-05: Mensagem removida limpa pedido, cache e fecha a janela', async () => {
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();

    fonte.cadastrarAudio('audio-removido');
    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento);
    await nucleo.inicializar();

    fonte.simularClique('audio-removido');
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(nucleo.cache.tem('audio-removido'), true);
    assert.equal(exibicao.janelasAbertas.has('audio-removido'), true);

    // Mensagem é apagada para todos
    fonte.simularRemocao('audio-removido');

    assert.equal(nucleo.cache.tem('audio-removido'), false);
    assert.equal(exibicao.janelasAbertas.has('audio-removido'), false);
  });

  it('RF-12 a RF-17: Contadores locais anônimos e cálculo exato de adoção e qualidade', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const contadores = new GerenciadorContadores(armazenamento);

    // 18 áudios transcritos e não tocados previamente -> 18 lidos
    for (let i = 1; i <= 18; i++) {
      await contadores.registrarTranscricaoConcluida(`lido-${i}`, 'recebido');
    }

    // 2 áudios tocados sem transcrever -> 2 ouvidos
    for (let i = 1; i <= 2; i++) {
      await contadores.registrarReproducao(`ouvido-${i}`, 'recebido');
    }

    // 1 áudio que já foi lido é tocado em seguida -> 1 lido e tocado
    await contadores.registrarReproducao('lido-1', 'recebido');
    // Tocar novamente não duplica contagem (RF-13)
    await contadores.registrarReproducao('lido-1', 'recebido');

    // Áudio enviado próprio do usuário é ignorado (RF-17)
    await contadores.registrarTranscricaoConcluida('audio-proprio', 'enviado');
    await contadores.registrarReproducao('audio-proprio', 'enviado');

    const metricas = await contadores.obterMetricas();

    assert.equal(metricas.lidos, 18);
    assert.equal(metricas.ouvidos, 2);
    assert.equal(metricas.lidosETocados, 1);

    // Adoção: 18 / (18 + 2) = 90%
    assert.equal(metricas.taxaAdocaoPercentual, 90);

    // Qualidade: (18 - 1) / 18 = 17 / 18 = 94.44% -> 94%
    assert.equal(metricas.taxaQualidadePercentual, 94);

    // RF-16: Zeramento dos contadores
    const metricasAposZerar = await contadores.zerar();
    assert.equal(metricasAposZerar.lidos, 0);
    assert.equal(metricasAposZerar.ouvidos, 0);
    assert.equal(metricasAposZerar.lidosETocados, 0);
    assert.equal(metricasAposZerar.taxaAdocaoPercentual, null);
    assert.equal(metricasAposZerar.taxaQualidadePercentual, null);
  });
});

// Feature 006: indicador de espera com cronômetro. O relógio é falso e só anda quando o teste manda,
// inclusive dentro do motor, para que os tempos do pedido saiam exatos.
describe('Núcleo de Transcrição — cronômetro de espera (feature 006)', () => {
  const resposta = (duracaoAudioSeg: number): ResultadoDaTranscricao => ({
    ok: true,
    texto: 'Texto.',
    idioma: 'pt',
    duracaoAudioSeg,
    processamentoMs: 100
  });
  const assentar = () => new Promise((r) => setTimeout(r, 20));

  async function montar() {
    const relogio = { t: 1_000 };
    const fonte = new FakeFonteDeAudio();
    const motor = new FakeMotorDeTranscricao();
    const exibicao = new FakeExibicaoDeTranscricao();
    const armazenamento = new ArmazenamentoMemoria();
    const nucleo = new NucleoDeTranscricao(fonte, motor, exibicao, armazenamento, { agora: () => relogio.t });
    await nucleo.inicializar();
    return { relogio, fonte, motor, exibicao, armazenamento, nucleo };
  }

  it('RN-01 e RN-03: o mesmo instante do clique vale na fila e na transcrição', async () => {
    const { relogio, fonte, motor, exibicao } = await montar();
    motor.atrasoTranscreverMs = 10;
    fonte.cadastrarAudio('a');
    fonte.cadastrarAudio('b');

    fonte.simularClique('a');
    relogio.t = 1_500;
    fonte.simularClique('b');

    assert.deepEqual(exibicao.estados.get('a'), { tipo: 'transcrevendo', inicioEsperaEm: 1_000 });
    assert.deepEqual(exibicao.estados.get('b'), { tipo: 'fila', posicaoNaFila: 1, inicioEsperaEm: 1_500 });

    await assentar();
    const transicoesDeB = exibicao.historico.filter(([id]) => id === 'b').map(([, e]) => e);
    assert.deepEqual(transicoesDeB.find((e) => e.tipo === 'transcrevendo'), { tipo: 'transcrevendo', inicioEsperaEm: 1_500 });
    for (const e of transicoesDeB) {
      if (e.tipo === 'fila' || e.tipo === 'transcrevendo') assert.equal(e.inicioEsperaEm, 1_500);
    }
  });

  it('RF-01 e RF-05: o ícone entra em espera no clique e passa a concluído no fim', async () => {
    const { fonte, motor } = await montar();
    motor.atrasoTranscreverMs = 10;
    fonte.cadastrarAudio('a');

    fonte.simularClique('a');
    assert.deepEqual(fonte.icones.get('a'), { tipo: 'espera', inicioEsperaEm: 1_000 });

    await assentar();
    assert.deepEqual(fonte.icones.get('a'), { tipo: 'concluido' });
  });

  it('RF-05 e RF-06: a conclusão leva os tempos, com a parte da fila separada', async () => {
    const { relogio, fonte, motor, exibicao } = await montar();
    const duracoes = [4_400, 9_700];
    motor.aoTranscrever = () => (relogio.t += duracoes.shift() ?? 0);
    motor.respostas = [resposta(5), resposta(13)];
    fonte.cadastrarAudio('a');
    fonte.cadastrarAudio('b');

    fonte.simularClique('a');
    fonte.simularClique('b');
    await assentar();

    assert.deepEqual(exibicao.estados.get('a'), {
      tipo: 'concluido',
      texto: 'Texto.',
      idioma: 'pt',
      tempos: { esperaTotalMs: 4_400, esperaFilaMs: 0, duracaoAudioSeg: 5 }
    });
    const b = exibicao.estados.get('b');
    assert.equal(b?.tipo, 'concluido');
    assert.deepEqual(b?.tipo === 'concluido' && b.tempos, { esperaTotalMs: 14_100, esperaFilaMs: 4_400, duracaoAudioSeg: 13 });
  });

  it('D-08: sem duração do motor, vale a da página', async () => {
    const { fonte, motor, exibicao } = await montar();
    motor.respostas = [resposta(0)];
    fonte.cadastrarAudio('a', 21);

    fonte.simularClique('a');
    await assentar();

    const a = exibicao.estados.get('a');
    assert.equal(a?.tipo === 'concluido' && a.tempos?.duracaoAudioSeg, 21);
  });

  it('RF-07: o erro para a contagem, informa o tempo até a falha e põe o ícone em erro', async () => {
    const { relogio, fonte, motor, exibicao } = await montar();
    motor.aoTranscrever = () => (relogio.t += 61_000);
    motor.respostaPadrao = { ok: false, codigo: 'FALHA_NA_TRANSCRICAO', motivo: 'simulado' };
    fonte.cadastrarAudio('a');

    fonte.simularClique('a');
    await assentar();

    const a = exibicao.estados.get('a');
    assert.equal(a?.tipo, 'erro');
    assert.equal(a?.tipo === 'erro' && a.falhouAposMs, 61_000);
    assert.deepEqual(fonte.icones.get('a'), { tipo: 'erro' });
  });

  it('RF-19 com RF-07: motor indisponível põe em erro o ícone de todos os pedidos', async () => {
    const { fonte, motor } = await montar();
    motor.estadoAtual = { estado: 'indisponivel', codigo: 'MOTOR_INDISPONIVEL', motivo: 'fora' };
    fonte.cadastrarAudio('a');
    fonte.cadastrarAudio('b');

    fonte.simularClique('a');
    fonte.simularClique('b');
    await assentar();

    assert.deepEqual(fonte.icones.get('a'), { tipo: 'erro' });
    assert.deepEqual(fonte.icones.get('b'), { tipo: 'erro' });
  });

  it('RF-09: a reabertura pelo cache traz os tempos originais e o ícone concluído, sem nova contagem', async () => {
    const { relogio, fonte, motor, exibicao } = await montar();
    motor.aoTranscrever = () => (relogio.t += 9_700);
    motor.respostas = [resposta(13)];
    fonte.cadastrarAudio('a');

    fonte.simularClique('a');
    await assentar();
    exibicao.simularFecharPeloUsuario('a');
    relogio.t = 90_000;
    fonte.historicoIcone = [];
    fonte.simularClique('a');

    const a = exibicao.estados.get('a');
    assert.deepEqual(a?.tipo === 'concluido' && a.tempos, { esperaTotalMs: 9_700, esperaFilaMs: 0, duracaoAudioSeg: 13 });
    assert.deepEqual(fonte.historicoIcone, [['a', { tipo: 'concluido' }]]);
    assert.equal(motor.chamadasTranscrever.length, 1);
  });

  it('RF-10: novo clique num pedido em espera não reinicia a contagem', async () => {
    const { relogio, fonte, motor, exibicao } = await montar();
    motor.atrasoTranscreverMs = 30;
    fonte.cadastrarAudio('a');

    fonte.simularClique('a');
    relogio.t = 7_000;
    fonte.simularClique('a');

    assert.deepEqual(fonte.icones.get('a'), { tipo: 'espera', inicioEsperaEm: 1_000 });
    assert.deepEqual(exibicao.estados.get('a'), { tipo: 'transcrevendo', inicioEsperaEm: 1_000 });
    assert.deepEqual(exibicao.destaques, ['a']);
    await new Promise((r) => setTimeout(r, 40));
  });

  it('RF-11 e D-13: "Tentar de novo" começa contagem nova e preserva a direção do pedido', async () => {
    const { relogio, fonte, motor, exibicao, nucleo } = await montar();
    motor.respostaPadrao = { ok: false, codigo: 'FALHA_NA_TRANSCRICAO', motivo: 'simulado' };
    fonte.cadastrarAudio('a');

    fonte.simularClique('a', 'enviado');
    await assentar();
    assert.deepEqual(fonte.icones.get('a'), { tipo: 'erro' });

    motor.respostaPadrao = resposta(13);
    relogio.t = 70_000;
    exibicao.simularReexecutar('a');
    assert.deepEqual(fonte.icones.get('a'), { tipo: 'espera', inicioEsperaEm: 70_000 });
    assert.equal(nucleo.fila.buscar('a')?.direcao, 'enviado');

    await assentar();
    const metricas = await nucleo.contadores.obterMetricas();
    assert.equal(metricas.esperaMediaSegPorMinuto, null, 'áudio próprio fica fora do acumulado');
  });

  it('RF-12: com a janela fechada na transcrição, o ícone segue em espera e conclui', async () => {
    const { fonte, motor, exibicao } = await montar();
    motor.atrasoTranscreverMs = 20;
    fonte.cadastrarAudio('a');

    fonte.simularClique('a');
    exibicao.simularFecharPeloUsuario('a');
    assert.deepEqual(fonte.icones.get('a'), { tipo: 'espera', inicioEsperaEm: 1_000 });

    await new Promise((r) => setTimeout(r, 40));
    assert.deepEqual(fonte.icones.get('a'), { tipo: 'concluido' });
    assert.equal(exibicao.janelasAbertas.has('a'), false);
  });

  it('D-12: novo clique num pedido em andamento cuja janela foi fechada reabre a janela com o mesmo cronômetro', async () => {
    const { relogio, fonte, motor, exibicao } = await montar();
    motor.atrasoTranscreverMs = 20;
    fonte.cadastrarAudio('a');

    fonte.simularClique('a');
    exibicao.simularFecharPeloUsuario('a');
    relogio.t = 4_000;
    fonte.simularClique('a');

    assert.equal(exibicao.janelasAbertas.has('a'), true);
    assert.deepEqual(exibicao.estados.get('a'), { tipo: 'transcrevendo', inicioEsperaEm: 1_000 });

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(exibicao.estados.get('a')?.tipo, 'concluido');
  });

  it('D-15: fechar a janela de um pedido na fila devolve o ícone ao estado ocioso', async () => {
    const { fonte, motor, exibicao, nucleo } = await montar();
    motor.atrasoTranscreverMs = 20;
    fonte.cadastrarAudio('a');
    fonte.cadastrarAudio('b');

    fonte.simularClique('a');
    fonte.simularClique('b');
    exibicao.simularFecharPeloUsuario('b');

    assert.equal(nucleo.fila.buscar('b'), undefined);
    assert.deepEqual(fonte.icones.get('b'), { tipo: 'ocioso' });
    await new Promise((r) => setTimeout(r, 40));
  });

  it('RN-07 e RF-14: o acumulado soma só recebidos concluídos, sem a fila', async () => {
    const { relogio, fonte, motor, nucleo } = await montar();
    const duracoes = [4_300, 9_700, 5_000];
    motor.aoTranscrever = () => (relogio.t += duracoes.shift() ?? 0);
    motor.respostas = [resposta(13), resposta(47), resposta(30)];
    fonte.cadastrarAudio('a');
    fonte.cadastrarAudio('b');
    fonte.cadastrarAudio('proprio');

    fonte.simularClique('a');
    fonte.simularClique('b'); // espera 4,3 s na fila, que não entra
    fonte.simularClique('proprio', 'enviado');
    await assentar();

    const metricas = await nucleo.contadores.obterMetricas();
    assert.equal(metricas.esperaMediaSegPorMinuto, 14);
  });

  it('RN-07: erro e reabertura pelo cache não entram no acumulado', async () => {
    const { relogio, fonte, motor, exibicao, nucleo } = await montar();
    motor.aoTranscrever = () => (relogio.t += 6_000);
    motor.respostas = [resposta(60), { ok: false, codigo: 'FALHA_NA_TRANSCRICAO', motivo: 'simulado' }];
    fonte.cadastrarAudio('a');
    fonte.cadastrarAudio('falha');

    fonte.simularClique('a');
    fonte.simularClique('falha');
    await assentar();
    exibicao.simularFecharPeloUsuario('a');
    fonte.simularClique('a');
    await assentar();

    const metricas = await nucleo.contadores.obterMetricas();
    assert.equal(metricas.esperaMediaSegPorMinuto, 6);
  });
});
