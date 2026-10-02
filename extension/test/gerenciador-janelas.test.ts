import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GerenciadorDeJanelas } from '../src/content/gerenciador-janelas.ts';
import { CronometroDeEspera } from '../src/content/cronometro-espera.ts';
import type { CoordenadasAncora } from '../src/dominio/fonte-de-audio.ts';

test('GerenciadorDeJanelas abre janela e atualiza estados corretamente', () => {
  const gerenciador = new GerenciadorDeJanelas();

  gerenciador.abrir('audio-teste-1');
  assert.equal(gerenciador.temJanelaAberta('audio-teste-1'), true);

  gerenciador.definirEstado('audio-teste-1', {
    tipo: 'transcrevendo',
    inicioEsperaEm: 0
  });
  const estadoAtual = gerenciador.obterEstado('audio-teste-1');
  assert.equal(estadoAtual?.tipo, 'transcrevendo');

  gerenciador.definirEstado('audio-teste-1', {
    tipo: 'concluido',
    texto: 'Mensagem de voz transcrita com perfeição.',
    idioma: 'pt',
    tempos: { esperaTotalMs: 9_700, esperaFilaMs: 0, duracaoAudioSeg: 13 }
  });
  const estadoConcluido = gerenciador.obterEstado('audio-teste-1');
  assert.equal(estadoConcluido?.tipo, 'concluido');
  if (estadoConcluido?.tipo === 'concluido') {
    assert.equal(estadoConcluido.texto, 'Mensagem de voz transcrita com perfeição.');
    assert.equal(estadoConcluido.tempos?.esperaTotalMs, 9_700);
  }

  gerenciador.fechar('audio-teste-1');
  assert.equal(gerenciador.temJanelaAberta('audio-teste-1'), false);
});

test('GerenciadorDeJanelas respeita limite máximo de 20 janelas', () => {
  const gerenciador = new GerenciadorDeJanelas();

  for (let i = 1; i <= 25; i++) {
    gerenciador.abrir(`audio-${i}`);
  }

  assert.equal(gerenciador.totalAbertas(), 20);
});

// BUG-20261002-IXWO: a âncora só chegava por scroll ou resize, e a janela aberta sem rolagem ficava
// oculta. A abertura lê a âncora corrente antes de a janela existir: lida depois, com a janela já na
// página, a transição do transform a faria deslizar do canto da tela até o balão.
test('GerenciadorDeJanelas lê a âncora da mensagem ao abrir, antes de a janela existir', () => {
  const ancora: CoordenadasAncora = { idAudio: 'audio-1', x: 40, y: 120, largura: 300, altura: 60, visivel: true };
  const consultas: Array<{ idAudio: string; janelaJaExistia: boolean }> = [];
  const gerenciador: GerenciadorDeJanelas = new GerenciadorDeJanelas(new CronometroDeEspera(), (idAudio) => {
    consultas.push({ idAudio, janelaJaExistia: gerenciador.temJanelaAberta(idAudio) });
    return idAudio === 'audio-1' ? ancora : null;
  });

  gerenciador.abrir('audio-1');
  assert.deepEqual(consultas, [{ idAudio: 'audio-1', janelaJaExistia: false }]);

  // Reabrir uma janela existente só a destaca, sem nova leitura
  gerenciador.abrir('audio-1');
  assert.equal(consultas.length, 1);

  // A âncora que vem no pedido prevalece sobre a leitura
  gerenciador.abrir('audio-2', 'enviado', { ...ancora, idAudio: 'audio-2' });
  assert.equal(consultas.length, 1);
});

// BUG-20261002-A4MZ: a área da conversa limita o espaço lateral da janela. Na abertura, é lida uma vez e
// antes de a janela existir, pelo mesmo motivo da âncora: lida depois, a medida forçaria o estilo da
// janela ainda sem posição, e a janela deslizaria do canto da tela até o balão.
test('GerenciadorDeJanelas lê a área da conversa ao abrir, antes de a janela existir', () => {
  const leituras: boolean[] = [];
  const gerenciador: GerenciadorDeJanelas = new GerenciadorDeJanelas(new CronometroDeEspera(), () => null, () => {
    leituras.push(gerenciador.temJanelaAberta('audio-1'));
    return { esquerda: 488, direita: 1316 };
  });

  gerenciador.abrir('audio-1');
  assert.deepEqual(leituras, [false]);
});
