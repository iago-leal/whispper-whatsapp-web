import {
  completarContadores,
  type ArmazenamentoNavegador,
  type ContadoresPersistidos,
  type MetricasContadores
} from './armazenamento-navegador.ts';
import { calcularEsperaMediaSegPorMinuto } from './tempo-de-espera.ts';

export interface ClassificacaoAudioSessao {
  idAudio: string;
  classe: 'lido' | 'ouvido';
  tocadoAposLeitura: boolean;
}

export class GerenciadorContadores {
  private memoriaSessao = new Map<string, ClassificacaoAudioSessao>();
  // O popup grava o mesmo registro (zeramento): cada operação relê o armazenamento antes de
  // modificar, e as operações desta instância rodam uma de cada vez para não perder incremento.
  private emSerie: Promise<unknown> = Promise.resolve();

  private readonly armazenamento: ArmazenamentoNavegador;

  constructor(armazenamento: ArmazenamentoNavegador) {
    this.armazenamento = armazenamento;
  }

  private serializar<T>(operacao: () => Promise<T>): Promise<T> {
    const resultado = this.emSerie.then(operacao);
    this.emSerie = resultado.catch(() => {});
    return resultado;
  }

  private async ler(): Promise<ContadoresPersistidos> {
    return completarContadores(await this.armazenamento.carregarContadores());
  }

  private incrementar(alterar: (dados: ContadoresPersistidos) => void): Promise<void> {
    return this.serializar(async () => {
      const dados = await this.ler();
      alterar(dados);
      await this.armazenamento.salvarContadores(dados);
    });
  }

  /**
   * Garante que o registro persistido exista, criado zerado na primeira execução.
   */
  async inicializar(): Promise<void> {
    await this.serializar(() => this.ler());
  }

  /**
   * Registra a conclusão da transcrição de um áudio (RF-12).
   * Áudios próprios (enviados) são ignorados (RF-17).
   */
  async registrarTranscricaoConcluida(idAudio: string, direcao: 'recebido' | 'enviado'): Promise<void> {
    if (direcao === 'enviado') return;

    const existente = this.memoriaSessao.get(idAudio);
    if (existente) {
      // Já foi classificado nesta sessão (ex: já era ouvido ou já lido), não altera classificação primária
      return;
    }

    this.memoriaSessao.set(idAudio, {
      idAudio,
      classe: 'lido',
      tocadoAposLeitura: false
    });

    await this.incrementar((dados) => {
      dados.lidos += 1;
    });
  }

  /**
   * Registra início de reprodução nativa de áudio (RF-12 e RF-13).
   * Áudios próprios (enviados) são ignorados (RF-17).
   */
  async registrarReproducao(idAudio: string, direcao: 'recebido' | 'enviado'): Promise<void> {
    if (direcao === 'enviado') return;

    const existente = this.memoriaSessao.get(idAudio);
    if (!existente) {
      // Primeira interação foi tocar antes de transcrever -> classifica como "ouvido"
      this.memoriaSessao.set(idAudio, {
        idAudio,
        classe: 'ouvido',
        tocadoAposLeitura: false
      });

      await this.incrementar((dados) => {
        dados.ouvidos += 1;
      });
      return;
    }

    if (existente.classe === 'lido' && !existente.tocadoAposLeitura) {
      // Foi lido e agora o usuário tocou o áudio pela primeira vez na sessão (RF-13)
      existente.tocadoAposLeitura = true;
      await this.incrementar((dados) => {
        dados.lidosETocados += 1;
      });
    }
  }

  /**
   * Soma ao acumulado do painel a espera sem fila e a duração de uma transcrição concluída (RN-07).
   * Áudios próprios e áudios sem duração conhecida ficam de fora.
   */
  async registrarTempoDeEspera(direcao: 'recebido' | 'enviado', esperaMs: number, duracaoAudioMs: number): Promise<void> {
    if (direcao === 'enviado' || !(duracaoAudioMs > 0) || !(esperaMs >= 0)) return;

    await this.incrementar((dados) => {
      dados.esperaAcumuladaMs += Math.round(esperaMs);
      dados.audioAcumuladoMs += Math.round(duracaoAudioMs);
    });
  }

  private calcularMetricas(dados: ContadoresPersistidos): MetricasContadores {
    const totalAdoção = dados.lidos + dados.ouvidos;
    const taxaAdocao = totalAdoção > 0 ? Math.round((dados.lidos / totalAdoção) * 100) : null;

    const taxaQualidade = dados.lidos > 0
      ? Math.round(((dados.lidos - dados.lidosETocados) / dados.lidos) * 100)
      : null;

    return {
      lidos: dados.lidos,
      ouvidos: dados.ouvidos,
      lidosETocados: dados.lidosETocados,
      inicioContagem: dados.inicioContagem,
      taxaAdocaoPercentual: taxaAdocao,
      taxaQualidadePercentual: taxaQualidade,
      esperaMediaSegPorMinuto: calcularEsperaMediaSegPorMinuto(dados.esperaAcumuladaMs, dados.audioAcumuladoMs)
    };
  }

  /**
   * Retorna os números absolutos e métricas calculadas em percentuais inteiros (RF-15) e a espera média (RF-14).
   */
  async obterMetricas(): Promise<MetricasContadores> {
    return this.serializar(async () => this.calcularMetricas(await this.ler()));
  }

  /**
   * Zera os contadores e o acumulado de espera e atualiza a data de início da contagem (RF-16).
   */
  async zerar(): Promise<MetricasContadores> {
    return this.serializar(async () => {
      const dados = completarContadores(await this.armazenamento.zerarContadores());
      this.memoriaSessao.clear();
      return this.calcularMetricas(dados);
    });
  }
}
