import {
  VerificadorCompatibilidade,
  type ResultadoVerificacaoInicial
} from '../dominio/compatibilidade.ts';
import type { EstadoDoMotor, ResultadoDaTranscricao } from '../dominio/motor-de-transcricao.ts';

const CHAVE_STORAGE_ONBOARDING = 'whispper_onboarding';

class ControladorOnboarding {
  private etapaAtual = 1;
  private verificador = new VerificadorCompatibilidade();
  private intervaloPolling: ReturnType<typeof setInterval> | null = null;
  private resultadoVerificacao: ResultadoVerificacaoInicial | null = null;

  async iniciar(): Promise<void> {
    this.configurarBotoes();
    await this.restaurarProgresso();
  }

  private async restaurarProgresso(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get([CHAVE_STORAGE_ONBOARDING], (res) => {
        const salvo = res?.[CHAVE_STORAGE_ONBOARDING] as { etapa?: unknown } | undefined;
        if (salvo && typeof salvo.etapa === 'number' && salvo.etapa >= 1 && salvo.etapa <= 6) {
          this.irParaEtapa(salvo.etapa);
        } else {
          this.irParaEtapa(1);
        }
      });
    } else {
      this.irParaEtapa(1);
    }
  }

  private salvarProgresso(etapa: number): void {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({
        [CHAVE_STORAGE_ONBOARDING]: {
          etapa,
          atualizadoEm: new Date().toISOString()
        }
      });
    }
  }

  private irParaEtapa(etapa: number): void {
    this.etapaAtual = etapa;
    this.salvarProgresso(etapa);

    // Atualiza indicadores do header
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById(`step-indicador-${i}`);
      if (el) {
        el.className = i === etapa ? 'passo ativo' : i < etapa ? 'passo concluido' : 'passo';
      }
    }

    // Esconde todos os cards de etapa
    const ids = [
      'etapa-privacidade',
      'etapa-verificacao',
      'etapa-instalador',
      'etapa-modelo',
      'etapa-teste',
      'etapa-pronto'
    ];
    ids.forEach((id, index) => {
      const card = document.getElementById(id);
      if (card) {
        card.style.display = index + 1 === etapa ? 'block' : 'none';
      }
    });

    // Ações ao entrar em etapas específicas
    if (etapa === 2) {
      this.executarVerificacaoInicial();
    } else if (etapa === 3) {
      this.iniciarPollingMotor();
    } else {
      this.pararPollingMotor();
    }
  }

  private executarVerificacaoInicial(): void {
    const elSpinner = document.getElementById('verificando-spinner');
    const elCompativel = document.getElementById('resultado-compativel');
    const elIncompativel = document.getElementById('resultado-incompativel');
    const elLista = document.getElementById('lista-incompatibilidades');

    if (elSpinner) elSpinner.style.display = 'flex';
    if (elCompativel) elCompativel.style.display = 'none';
    if (elIncompativel) elIncompativel.style.display = 'none';

    setTimeout(() => {
      const info = VerificadorCompatibilidade.extrairInfoDoNavegador(navigator);
      this.resultadoVerificacao = this.verificador.avaliar(info);

      if (elSpinner) elSpinner.style.display = 'none';

      if (this.resultadoVerificacao.compativel) {
        if (elCompativel) elCompativel.style.display = 'block';
        this.configurarDownload(this.resultadoVerificacao);
      } else {
        if (elIncompativel) elIncompativel.style.display = 'block';
        if (elLista) {
          elLista.innerHTML = '';
          this.resultadoVerificacao.requisitosNaoAtendidos.forEach((req) => {
            const item = document.createElement('div');
            item.className = 'item-detalhe';
            item.innerHTML = `<strong>${req.requisito} (Exigido: ${req.exigido} / Encontrado: ${req.encontrado})</strong><p>${req.explicacaoLeiga}</p>`;
            elLista.appendChild(item);
          });
        }
      }
    }, 600);
  }

  private configurarDownload(resultado: ResultadoVerificacaoInicial): void {
    const elNome = document.getElementById('nome-instalador');
    const elLink = document.getElementById('link-download-instalador') as HTMLAnchorElement | null;

    if (resultado.instaladorSugerido) {
      if (elNome) elNome.textContent = resultado.instaladorSugerido.nome;
      if (elLink) {
        elLink.href = `#download-${resultado.instaladorSugerido.arquivo}`;
        elLink.setAttribute('download', resultado.instaladorSugerido.arquivo);
      }
    }
  }

  private iniciarPollingMotor(): void {
    this.pararPollingMotor();
    this.consultarMotor();
    this.intervaloPolling = setInterval(() => {
      this.consultarMotor();
    }, 3000);
  }

  private pararPollingMotor(): void {
    if (this.intervaloPolling) {
      clearInterval(this.intervaloPolling);
      this.intervaloPolling = null;
    }
  }

  private consultarMotor(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

    chrome.runtime.sendMessage({ tipo: 'verificar_motor' }, (resposta) => {
      const motor: EstadoDoMotor | undefined = resposta?.resultado;
      if (motor && (motor.estado === 'pronto' || motor.estado === 'iniciando')) {
        this.pararPollingMotor();
        // Avança automaticamente para a etapa do modelo / teste
        this.irParaEtapa(4);
      }
    });
  }

  private async executarTestePratico(): Promise<void> {
    const elBtn = document.getElementById('btn-executar-teste') as HTMLButtonElement | null;
    const elContainer = document.getElementById('resultado-teste-container');
    const elTexto = document.getElementById('texto-resultado-teste');
    const elTempo = document.getElementById('tempo-resultado-teste');

    if (elBtn) {
      elBtn.disabled = true;
      elBtn.textContent = 'Transcrevendo áudio…';
    }

    try {
      // Lê amostra de áudio sintético embutida
      const urlAmostra = chrome.runtime.getURL('dist/diagnostico/fala-pt.ogg');
      const resp = await fetch(urlAmostra);
      if (!resp.ok) throw new Error('Amostra sintética não encontrada em ' + urlAmostra);

      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i] ?? 0);
      }
      const audioBase64 = btoa(binary);

      chrome.runtime.sendMessage(
        {
          tipo: 'transcrever_audio',
          audioBase64,
          tipoDeMidia: 'audio/ogg; codecs=opus'
        },
        (resposta) => {
          if (elBtn) {
            elBtn.disabled = false;
            elBtn.textContent = 'Transcrever novamente';
          }

          if (resposta && resposta.ok && resposta.resultado) {
            const res: ResultadoDaTranscricao = resposta.resultado;
            if (res.ok) {
              if (elContainer) elContainer.style.display = 'block';
              if (elTexto) elTexto.textContent = `"${res.texto}"`;
              if (elTempo) elTempo.textContent = `Processado em ${res.processamentoMs} ms (idioma detectado: ${res.idioma})`;

              setTimeout(() => {
                this.irParaEtapa(6);
              }, 1800);
            } else {
              alert(`Falha no motor: ${res.motivo}`);
            }
          } else {
            alert(`Erro na comunicação: ${resposta?.erro || 'Sem resposta do motor'}`);
          }
        }
      );
    } catch (err) {
      if (elBtn) {
        elBtn.disabled = false;
        elBtn.textContent = 'Tentar novamente';
      }
      alert(`Falha no teste: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private configurarBotoes(): void {
    // Etapa 1 -> 2
    document.getElementById('btn-aceitar-privacidade')?.addEventListener('click', () => {
      this.irParaEtapa(2);
    });

    // Etapa 2 -> 3
    document.getElementById('btn-avancar-instalador')?.addEventListener('click', () => {
      this.irParaEtapa(3);
    });

    // Etapa 4 -> 5
    document.getElementById('btn-avancar-teste')?.addEventListener('click', () => {
      this.irParaEtapa(5);
    });

    // Etapa 5 (Executar teste)
    document.getElementById('btn-executar-teste')?.addEventListener('click', () => {
      this.executarTestePratico();
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new ControladorOnboarding();
    app.iniciar().catch(console.error);
  });
}
