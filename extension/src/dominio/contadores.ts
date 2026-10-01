import type {
  ArmazenamentoNavegador,
  ContadoresPersistidos,
  MetricasContadores
} from './armazenamento-navegador.ts';

export interface ClassificacaoAudioSessao {
  idAudio: string;
  classe: 'lido' | 'ouvido';
  tocadoAposLeitura: boolean;
}

export class GerenciadorContadores {
  private memoriaSessao = new Map<string, ClassificacaoAudioSessao>();
  private dadosCarregados: ContadoresPersistidos | null = null;
  private carregamentoPromise: Promise<void> | null = null;

  private readonly armazenamento: ArmazenamentoNavegador;

  constructor(armazenamento: ArmazenamentoNavegador) {
    this.armazenamento = armazenamento;
  }

  /**
   * Garante que os contadores persistidos foram lidos da porta de armazenamento.
   */
  async inicializar(): Promise<void> {
    if (this.carregamentoPromise) return this.carregamentoPromise;
    this.carregamentoPromise = (async () => {
      this.dadosCarregados = await this.armazenamento.carregarContadores();
    })();
    return this.carregamentoPromise;
  }

  /**
   * Registra a conclusão da transcrição de um áudio (RF-12).
   * Áudios próprios (enviados) são ignorados (RF-17).
   */
  async registrarTranscricaoConcluida(idAudio: string, direcao: 'recebido' | 'enviado'): Promise<void> {
    if (direcao === 'enviado') return;
    await this.inicializar();

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

    if (this.dadosCarregados) {
      this.dadosCarregados.lidos += 1;
      await this.armazenamento.salvarContadores(this.dadosCarregados);
    }
  }

  /**
   * Registra início de reprodução nativa de áudio (RF-12 e RF-13).
   * Áudios próprios (enviados) são ignorados (RF-17).
   */
  async registrarReproducao(idAudio: string, direcao: 'recebido' | 'enviado'): Promise<void> {
    if (direcao === 'enviado') return;
    await this.inicializar();

    const existente = this.memoriaSessao.get(idAudio);
    if (!existente) {
      // Primeira interação foi tocar antes de transcrever -> classifica como "ouvido"
      this.memoriaSessao.set(idAudio, {
        idAudio,
        classe: 'ouvido',
        tocadoAposLeitura: false
      });

      if (this.dadosCarregados) {
        this.dadosCarregados.ouvidos += 1;
        await this.armazenamento.salvarContadores(this.dadosCarregados);
      }
      return;
    }

    if (existente.classe === 'lido' && !existente.tocadoAposLeitura) {
      // Foi lido e agora o usuário tocou o áudio pela primeira vez na sessão (RF-13)
      existente.tocadoAposLeitura = true;
      if (this.dadosCarregados) {
        this.dadosCarregados.lidosETocados += 1;
        await this.armazenamento.salvarContadores(this.dadosCarregados);
      }
    }
  }

  /**
   * Retorna os números absolutos e métricas calculadas em percentuais inteiros (RF-15).
   */
  async obterMetricas(): Promise<MetricasContadores> {
    await this.inicializar();
    const dados = this.dadosCarregados!;

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
      taxaQualidadePercentual: taxaQualidade
    };
  }

  /**
   * Zera os contadores e atualiza a data de início da contagem (RF-16).
   */
  async zerar(): Promise<MetricasContadores> {
    this.dadosCarregados = await this.armazenamento.zerarContadores();
    this.memoriaSessao.clear();
    return this.obterMetricas();
  }
}
