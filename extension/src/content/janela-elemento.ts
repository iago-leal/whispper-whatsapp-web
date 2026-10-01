import type { EstadoExibicao } from '../dominio/exibicao-de-transcricao.ts';
import { formatarDuracaoFinal, formatarFalha, formatarResumo } from '../dominio/tempo-de-espera.ts';
import type { CronometroDeEspera } from './cronometro-espera.ts';

export interface JanelaCallbacks {
  aoFechar: (idAudio: string) => void;
  aoReexecutar: (idAudio: string) => void;
}

/**
 * Cria o elemento DOM completo de uma janela flutuante.
 */
export function criarElementoJanela(
  idAudio: string,
  callbacks: JanelaCallbacks
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'whispper-janela';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', `Transcrição do áudio ${idAudio}`);
  container.setAttribute('tabindex', '-1');

  // Cabeçalho
  const cabecalho = document.createElement('div');
  cabecalho.className = 'whispper-janela-cabecalho';

  const titulo = document.createElement('span');
  titulo.className = 'whispper-janela-titulo';
  titulo.textContent = 'Whispper';

  const btnFechar = document.createElement('button');
  btnFechar.className = 'whispper-janela-fechar';
  btnFechar.type = 'button';
  btnFechar.setAttribute('aria-label', 'Fechar transcrição');
  btnFechar.innerHTML = '&times;';
  btnFechar.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.aoFechar(idAudio);
  });

  cabecalho.appendChild(titulo);
  cabecalho.appendChild(btnFechar);

  // Corpo de conteúdo
  const corpo = document.createElement('div');
  corpo.className = 'whispper-janela-corpo';

  // Rodapé com ações
  const rodape = document.createElement('div');
  rodape.className = 'whispper-janela-rodape';

  // Anúncios ao leitor de tela só no início da espera e no fim (RNF de acessibilidade da feature
  // 006); o contador, com papel de cronômetro, não é anunciado a cada segundo.
  const anuncio = document.createElement('div');
  anuncio.className = 'whispper-janela-anuncio whispper-so-leitor';
  anuncio.setAttribute('role', 'status');
  anuncio.setAttribute('aria-live', 'polite');

  container.appendChild(cabecalho);
  container.appendChild(corpo);
  container.appendChild(rodape);
  container.appendChild(anuncio);

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      callbacks.aoFechar(idAudio);
    }
  });

  return container;
}

const CLASSE_CONTADOR = 'whispper-janela-contador';

function anunciar(elementoJanela: HTMLElement, mensagem: string): void {
  const anuncio = elementoJanela.querySelector('.whispper-janela-anuncio');
  if (anuncio) anuncio.textContent = mensagem;
}

/**
 * Para de contar o tempo na janela, quando ela muda de estado ou fecha.
 */
export function liberarContadorJanela(elementoJanela: HTMLElement, cronometro?: CronometroDeEspera): void {
  const contador = elementoJanela.querySelector<HTMLElement>(`.${CLASSE_CONTADOR}`);
  if (contador) cronometro?.remover(contador);
}

/**
 * Linha de espera com o contador vivo: "Na fila (1 à frente) · 9 s" ou "Transcrevendo… 12 s". O
 * cronômetro só troca o texto do contador, sem recriar a janela.
 */
function montarEspera(rotulo: string, inicioEsperaEm: number, cronometro?: CronometroDeEspera): HTMLElement {
  const linha = document.createElement('div');
  linha.className = 'whispper-janela-espera';

  const indicador = document.createElement('span');
  indicador.className = 'whispper-janela-indicador';
  indicador.setAttribute('aria-hidden', 'true');

  const texto = document.createElement('span');
  texto.textContent = rotulo;

  const contador = document.createElement('span');
  contador.className = CLASSE_CONTADOR;
  contador.setAttribute('role', 'timer');
  contador.textContent = '0 s';

  linha.append(indicador, texto, contador);
  cronometro?.registrar(contador, inicioEsperaEm);
  return linha;
}

/**
 * Atualiza o conteúdo e botões da janela com base no estado atual.
 */
export function atualizarConteudoJanela(
  elementoJanela: HTMLElement,
  idAudio: string,
  estado: EstadoExibicao,
  callbacks: JanelaCallbacks,
  cronometro?: CronometroDeEspera
): void {
  const corpo = elementoJanela.querySelector('.whispper-janela-corpo');
  const rodape = elementoJanela.querySelector('.whispper-janela-rodape');
  if (!corpo || !rodape) return;

  liberarContadorJanela(elementoJanela, cronometro);
  const estavaEsperando = elementoJanela.dataset.whispperFase === 'espera';
  const emEspera = estado.tipo === 'fila' || estado.tipo === 'transcrevendo';
  elementoJanela.dataset.whispperFase = emEspera ? 'espera' : 'fim';

  corpo.innerHTML = '';
  rodape.innerHTML = '';

  if (estado.tipo === 'fila') {
    corpo.appendChild(montarEspera(`Na fila (${estado.posicaoNaFila} à frente) · `, estado.inicioEsperaEm, cronometro));
    if (!estavaEsperando) anunciar(elementoJanela, 'Transcrição na fila');
  } else if (estado.tipo === 'transcrevendo') {
    corpo.appendChild(montarEspera('Transcrevendo… ', estado.inicioEsperaEm, cronometro));
    if (!estavaEsperando) anunciar(elementoJanela, 'Transcrevendo áudio');
  } else if (estado.tipo === 'concluido') {
    const textoLimpo = estado.texto.trim();
    if (!textoLimpo) {
      corpo.innerHTML = '<em style="opacity: 0.6;">Nenhuma fala reconhecida.</em>';
    } else {
      corpo.textContent = textoLimpo;
    }

    // Resumo e idioma à esquerda do rodapé; "Copiar" à direita
    const info = document.createElement('div');
    info.className = 'whispper-janela-info';
    if (estado.tempos) {
      const resumo = document.createElement('span');
      resumo.className = 'whispper-janela-resumo';
      resumo.textContent = formatarResumo(estado.tempos);
      info.appendChild(resumo);
    }
    if (estado.idioma && estado.idioma !== 'pt') {
      const tagIdioma = document.createElement('span');
      tagIdioma.style.opacity = '0.6';
      tagIdioma.style.fontSize = '11px';
      tagIdioma.textContent = `Idioma: ${estado.idioma.toUpperCase()}`;
      info.appendChild(tagIdioma);
    }
    rodape.appendChild(info);
    anunciar(
      elementoJanela,
      estado.tempos
        ? `Transcrição concluída em ${formatarDuracaoFinal(estado.tempos.esperaTotalMs)}`
        : 'Transcrição concluída'
    );

    const btnCopiar = document.createElement('button');
    btnCopiar.type = 'button';
    btnCopiar.className = 'whispper-btn-acao';
    btnCopiar.textContent = 'Copiar';
    btnCopiar.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(textoLimpo);
          btnCopiar.textContent = 'Copiado!';
          setTimeout(() => {
            btnCopiar.textContent = 'Copiar';
          }, 2000);
        }
      } catch {
        btnCopiar.textContent = 'Falha ao copiar';
      }
    });
    rodape.appendChild(btnCopiar);
  } else if (estado.tipo === 'erro') {
    corpo.innerHTML = '';
    const erroDiv = document.createElement('div');
    erroDiv.style.color = '#ea4335';
    
    const strongErro = document.createElement('strong');
    strongErro.textContent = 'Erro: ';
    erroDiv.appendChild(strongErro);
    
    const msgErro = document.createTextNode(estado.mensagem);
    erroDiv.appendChild(msgErro);
    
    corpo.appendChild(erroDiv);

    const info = document.createElement('div');
    info.className = 'whispper-janela-info';
    if (estado.falhouAposMs !== undefined) {
      const falha = document.createElement('span');
      falha.className = 'whispper-janela-resumo';
      falha.textContent = formatarFalha(estado.falhouAposMs);
      info.appendChild(falha);
    }
    rodape.appendChild(info);
    anunciar(elementoJanela, 'Erro na transcrição');

    const btnReexecutar = document.createElement('button');
    btnReexecutar.type = 'button';
    btnReexecutar.className = 'whispper-btn-acao';
    btnReexecutar.textContent = 'Tentar de novo';
    btnReexecutar.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.aoReexecutar(idAudio);
    });
    rodape.appendChild(btnReexecutar);
  }
}

/**
 * Aplica um efeito de realce visual temporário (highlight de 1 s).
 */
export function aplicarDestaqueJanela(elementoJanela: HTMLElement): void {
  elementoJanela.classList.add('whispper-janela-destaque');
  setTimeout(() => {
    elementoJanela.classList.remove('whispper-janela-destaque');
  }, 1000);
}
