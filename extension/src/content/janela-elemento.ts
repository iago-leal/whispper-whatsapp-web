import type { EstadoExibicao } from '../dominio/exibicao-de-transcricao.ts';

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

  container.appendChild(cabecalho);
  container.appendChild(corpo);
  container.appendChild(rodape);

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      callbacks.aoFechar(idAudio);
    }
  });

  return container;
}

/**
 * Atualiza o conteúdo e botões da janela com base no estado atual.
 */
export function atualizarConteudoJanela(
  elementoJanela: HTMLElement,
  idAudio: string,
  estado: EstadoExibicao,
  callbacks: JanelaCallbacks
): void {
  const corpo = elementoJanela.querySelector('.whispper-janela-corpo');
  const rodape = elementoJanela.querySelector('.whispper-janela-rodape');
  if (!corpo || !rodape) return;

  corpo.innerHTML = '';
  rodape.innerHTML = '';

  if (estado.tipo === 'fila') {
    corpo.innerHTML = `<span style="opacity: 0.7;">Aguardando na fila (${estado.posicaoNaFila} à frente)...</span>`;
  } else if (estado.tipo === 'transcrevendo') {
    corpo.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="whispper-btn-transcrever whispper-animando" style="margin: 0; padding: 0;">⚙️</span>
        <span>Transcrevendo... (${estado.segundosDecorridos} s)</span>
      </div>
    `;
  } else if (estado.tipo === 'concluido') {
    const textoLimpo = estado.texto.trim();
    if (!textoLimpo) {
      corpo.innerHTML = '<em style="opacity: 0.6;">Nenhuma fala reconhecida.</em>';
    } else {
      corpo.textContent = textoLimpo;
    }

    if (estado.idioma && estado.idioma !== 'pt') {
      const tagIdioma = document.createElement('span');
      tagIdioma.style.opacity = '0.6';
      tagIdioma.style.fontSize = '11px';
      tagIdioma.textContent = `Idioma: ${estado.idioma.toUpperCase()}`;
      rodape.appendChild(tagIdioma);
    }

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
