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
  StatusSaudeFonte
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

  async verificar(): Promise<EstadoDoMotor> {
    return this.estadoAtual;
  }

  async transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao> {
    this.chamadasTranscrever.push({ audio, tipoDeMidia });
    if (this.atrasoTranscreverMs > 0) {
      await new Promise((r) => setTimeout(r, this.atrasoTranscreverMs));
    }
    return this.respostaPadrao;
  }
}

class FakeExibicaoDeTranscricao implements ExibicaoDeTranscricao {
  janelasAbertas = new Set<string>();
  estados = new Map<string, EstadoExibicao>();
  destaques: string[] = [];
  cbFechar: ((id: string) => void)[] = [];
  cbReexecutar: ((id: string) => void)[] = [];

  abrir(idAudio: string): void {
    this.janelasAbertas.add(idAudio);
  }

  definirEstado(idAudio: string, estado: EstadoExibicao): void {
    this.estados.set(idAudio, estado);
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
    assert.deepEqual(estadoA2, { tipo: 'fila', posicaoNaFila: 1 });

    const estadoA3 = exibicao.estados.get('audio-3');
    assert.deepEqual(estadoA3, { tipo: 'fila', posicaoNaFila: 2 });

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
