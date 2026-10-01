import { ArmazenamentoChrome } from '../adaptadores/armazenamento-chrome.ts';
import { GerenciadorContadores } from '../dominio/contadores.ts';
import type { EstadoDoMotor } from '../dominio/motor-de-transcricao.ts';

const armazenamento = new ArmazenamentoChrome();
const gerenciador = new GerenciadorContadores(armazenamento);

async function carregarDados(): Promise<void> {
  const elMotorStatus = document.getElementById('motor-status');
  const elIntegracaoStatus = document.getElementById('integracao-status');
  const elLidos = document.getElementById('metric-lidos');
  const elOuvidos = document.getElementById('metric-ouvidos');
  const elLidosETocados = document.getElementById('metric-lidos-tocados');
  const elAdocao = document.getElementById('metric-adocao');
  const elQualidade = document.getElementById('metric-qualidade');
  const elInicio = document.getElementById('data-inicio');

  // Consulta motor no background
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ tipo: 'verificar_motor' }, (resposta) => {
      const motor: EstadoDoMotor = resposta?.resultado || {
        estado: 'indisponivel',
        codigo: 'MOTOR_INDISPONIVEL',
        motivo: 'Não conectado'
      };

      if (elMotorStatus) {
        if (motor.estado === 'pronto') {
          elMotorStatus.textContent = `Pronto (${motor.modelo})`;
          elMotorStatus.className = 'status-tag status-ok';
        } else if (motor.estado === 'iniciando') {
          elMotorStatus.textContent = 'Iniciando…';
          elMotorStatus.className = 'status-tag status-aviso';
        } else {
          elMotorStatus.textContent = `Indisponível: ${motor.motivo}`;
          elMotorStatus.className = 'status-tag status-erro';
        }
      }
    });
  }

  // Verifica integração (se aba ativa do WhatsApp está aberta)
  if (elIntegracaoStatus) {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        if (url.includes('web.whatsapp.com')) {
          elIntegracaoStatus.textContent = 'Ativa';
          elIntegracaoStatus.className = 'status-tag status-ok';
        } else {
          elIntegracaoStatus.textContent = 'Aguardando WhatsApp Web';
          elIntegracaoStatus.className = 'status-tag status-aviso';
        }
      });
    } else {
      elIntegracaoStatus.textContent = 'Ativa';
      elIntegracaoStatus.className = 'status-tag status-ok';
    }
  }

  // Carrega métricas e contadores
  const metricas = await gerenciador.obterMetricas();
  if (elLidos) elLidos.textContent = String(metricas.lidos);
  if (elOuvidos) elOuvidos.textContent = String(metricas.ouvidos);
  if (elLidosETocados) elLidosETocados.textContent = String(metricas.lidosETocados);

  if (elAdocao) {
    elAdocao.textContent =
      metricas.taxaAdocaoPercentual !== null ? `${metricas.taxaAdocaoPercentual}%` : 'Sem dados ainda';
  }

  if (elQualidade) {
    elQualidade.textContent =
      metricas.taxaQualidadePercentual !== null ? `${metricas.taxaQualidadePercentual}%` : 'Sem dados ainda';
  }

  if (elInicio) {
    try {
      const data = new Date(metricas.inicioContagem);
      elInicio.textContent = `Início: ${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
    } catch {
      elInicio.textContent = `Início: ${metricas.inicioContagem}`;
    }
  }
}

function configurarEventos(): void {
  const btnCompatibilidade = document.getElementById('btn-verificar-compatibilidade');
  if (btnCompatibilidade) {
    btnCompatibilidade.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: 'dist/onboarding/index.html' });
      } else {
        window.open('../onboarding/index.html', '_blank');
      }
    });
  }

  const btnZerar = document.getElementById('btn-zerar') as HTMLButtonElement | null;
  const painelConfirmacao = document.getElementById('painel-confirmacao');
  const btnConfirmar = document.getElementById('btn-confirmar-zerar');
  const btnCancelar = document.getElementById('btn-cancelar-zerar');

  if (btnZerar && painelConfirmacao && btnConfirmar && btnCancelar) {
    btnZerar.addEventListener('click', () => {
      btnZerar.style.display = 'none';
      painelConfirmacao.style.display = 'flex';
    });

    btnCancelar.addEventListener('click', () => {
      painelConfirmacao.style.display = 'none';
      btnZerar.style.display = 'block';
    });

    btnConfirmar.addEventListener('click', async () => {
      await gerenciador.zerar();
      painelConfirmacao.style.display = 'none';
      btnZerar.style.display = 'block';
      await carregarDados();
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    configurarEventos();
  });
}
