import type { FonteDeAudio, EventoPedidoTranscricao, EventoReproducao } from './fonte-de-audio.ts';
import type { MotorDeTranscricao, EstadoDoMotor } from './motor-de-transcricao.ts';
import type { ExibicaoDeTranscricao } from './exibicao-de-transcricao.ts';
import type { ArmazenamentoNavegador, MetricasContadores } from './armazenamento-navegador.ts';
import { GerenciadorContadores } from './contadores.ts';
import { CacheSessao } from './cache-sessao.ts';
import { FilaDeTranscricao, type ItemFila } from './fila-transcricao.ts';

export interface StatusGeralNucleo {
  motor: EstadoDoMotor;
  integracao: {
    status: 'ativa' | 'degradada';
    estruturasAusentes?: string[];
  };
  metricas: MetricasContadores;
  itensNaFila: number;
}

export class NucleoDeTranscricao {
  readonly contadores: GerenciadorContadores;
  readonly cache: CacheSessao;
  readonly fila: FilaDeTranscricao;
  private estadoMotorCache: EstadoDoMotor = { estado: 'iniciando' };
  private cancelamentos: Array<() => void> = [];

  private readonly fonteDeAudio: FonteDeAudio;
  private readonly motor: MotorDeTranscricao;
  private readonly exibicao: ExibicaoDeTranscricao;

  constructor(
    fonteDeAudio: FonteDeAudio,
    motor: MotorDeTranscricao,
    exibicao: ExibicaoDeTranscricao,
    armazenamento: ArmazenamentoNavegador
  ) {
    this.fonteDeAudio = fonteDeAudio;
    this.motor = motor;
    this.exibicao = exibicao;
    this.contadores = new GerenciadorContadores(armazenamento);
    this.cache = new CacheSessao();

    this.fila = new FilaDeTranscricao({
      aoMudarEstado: (item) => this.tratarMudancaEstadoFila(item),
      aoAtualizarPosicao: (item, posicao) => this.tratarPosicaoFila(item, posicao),
      aoProcessar: (item) => this.executarTranscricao(item)
    });

    this.conectarPortas();
  }

  /**
   * Conecta as escutas de eventos das portas externas ao núcleo.
   */
  private conectarPortas(): void {
    // Escuta pedidos de transcrição disparados pelo clique no WhatsApp Web (RF-01)
    const unsubSolicitar = this.fonteDeAudio.aoSolicitarTranscricao((evento) => {
      this.processarSolicitacao(evento);
    });
    this.cancelamentos.push(unsubSolicitar);

    // Escuta reproduções de áudio para contadores de adoção/qualidade (RF-12, RF-13)
    const unsubReproduzir = this.fonteDeAudio.aoIniciarReproducao((evento) => {
      this.contadores.registrarReproducao(evento.idAudio, evento.direcao).catch(() => {});
    });
    this.cancelamentos.push(unsubReproduzir);

    // Escuta remoção de mensagem (EC-05)
    const unsubRemover = this.fonteDeAudio.aoRemoverMensagem((idAudio) => {
      this.tratarMensagemRemovida(idAudio);
    });
    this.cancelamentos.push(unsubRemover);

    // Escuta fechamento de janela pelo usuário (RF-10)
    const unsubFechar = this.exibicao.aoFechar((idAudio) => {
      this.fila.notificarJanelaFechada(idAudio);
    });
    this.cancelamentos.push(unsubFechar);

    // Escuta reexecução de pedido em erro (RF-09)
    const unsubReexecutar = this.exibicao.aoReexecutar((idAudio) => {
      this.fila.repetir(idAudio);
    });
    this.cancelamentos.push(unsubReexecutar);
  }

  /**
   * Inicializa o núcleo consultando o estado do motor e carregando os contadores (RF-18).
   */
  async inicializar(): Promise<void> {
    await this.contadores.inicializar();
    await this.atualizarEstadoMotor();
  }

  /**
   * Consulta o estado operacional do motor local.
   */
  async atualizarEstadoMotor(): Promise<EstadoDoMotor> {
    try {
      this.estadoMotorCache = await this.motor.verificar();
    } catch (err) {
      this.estadoMotorCache = {
        estado: 'indisponivel',
        codigo: 'MOTOR_INDISPONIVEL',
        motivo: err instanceof Error ? err.message : 'Falha na comunicação com o motor'
      };
    }
    return this.estadoMotorCache;
  }

  /**
   * Retorna o resumo consolidado de saúde e métricas para o popup / painel (RF-15).
   */
  async obterStatusGeral(): Promise<StatusGeralNucleo> {
    const metricas = await this.contadores.obterMetricas();
    const saudeFonte = this.fonteDeAudio.verificarSaude();

    return {
      motor: this.estadoMotorCache,
      integracao: {
        status: saudeFonte.status,
        estruturasAusentes: saudeFonte.status === 'degradada' ? saudeFonte.estruturasAusentes : undefined
      },
      metricas,
      itensNaFila: this.fila.obterFilaPendente().length + (this.fila.obterItemAtivo() ? 1 : 0)
    };
  }

  /**
   * Trata o clique no ícone de transcrição.
   */
  processarSolicitacao(evento: EventoPedidoTranscricao): void {
    const idAudio = evento.idAudio;

    // RF-06 e RF-07: Se já está em cache nesta sessão da aba, reabre em ≤ 200 ms
    const emCache = this.cache.obter(idAudio);
    if (emCache) {
      this.exibicao.abrir(idAudio);
      this.exibicao.definirEstado(idAudio, {
        tipo: 'concluido',
        texto: emCache.texto,
        idioma: emCache.idioma
      });
      this.exibicao.destacar(idAudio);
      return;
    }

    // RF-08: Se o pedido já existe na fila ou transcrevendo, destaca a janela
    const pedidoExistente = this.fila.buscar(idAudio);
    if (pedidoExistente) {
      this.exibicao.destacar(idAudio);
      return;
    }

    // Cria novo pedido e abre a janela
    this.exibicao.abrir(idAudio);
    this.fila.enfileirar(idAudio, evento.direcao);
  }

  /**
   * Executa a transcrição na porta do motor quando o item vira ativo na fila (RF-02, RF-05).
   */
  private async executarTranscricao(item: ItemFila): Promise<{
    sucesso: boolean;
    texto?: string;
    idioma?: string;
    erro?: 'MOTOR_INDISPONIVEL' | 'AUDIO_INDISPONIVEL' | 'TEMPO_ESGOTADO' | 'FALHA_NA_TRANSCRICAO' | 'VERSAO_INCOMPATIVEL';
    motivoErro?: string;
  }> {
    // RF-19: Verifica se o motor está disponível
    const estadoMotor = await this.atualizarEstadoMotor();
    if (estadoMotor.estado === 'indisponivel') {
      this.fila.abortarPorMotorIndisponivel(estadoMotor.motivo);
      return {
        sucesso: false,
        erro: estadoMotor.codigo,
        motivoErro: estadoMotor.motivo
      };
    }

    // RF-05: Obtém os bytes do áudio somente agora
    let audio: { bytes: Uint8Array; tipoDeMidia: string; duracaoSeg: number };
    try {
      audio = await this.fonteDeAudio.obterAudio(item.idAudio);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        sucesso: false,
        erro: 'AUDIO_INDISPONIVEL',
        motivoErro: msg || 'Não foi possível baixar o áudio do WhatsApp Web'
      };
    }

    // Envia ao motor pela porta
    try {
      const resultado = await this.motor.transcrever(audio.bytes, audio.tipoDeMidia);

      // RF-05: Desaloca referências ao áudio imediatamente após envio
      // @ts-ignore
      audio = null;

      if (!resultado.ok) {
        return {
          sucesso: false,
          erro: resultado.codigo,
          motivoErro: resultado.motivo
        };
      }

      // RF-06: Salva texto e idioma no cache da sessão
      this.cache.guardar({
        idAudio: item.idAudio,
        texto: resultado.texto,
        idioma: resultado.idioma,
        duracaoAudioSeg: resultado.duracaoAudioSeg,
        concluidoEm: Date.now()
      });

      // RF-12 e RF-17: Registra conclusão nos contadores para métricas de adoção
      await this.contadores.registrarTranscricaoConcluida(item.idAudio, item.direcao);

      return {
        sucesso: true,
        texto: resultado.texto,
        idioma: resultado.idioma
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        sucesso: false,
        erro: 'FALHA_NA_TRANSCRICAO',
        motivoErro: msg
      };
    }
  }

  /**
   * Sincroniza a janela flutuante com a mudança de estado na fila.
   */
  private tratarMudancaEstadoFila(item: ItemFila): void {
    if (!item.janelaAberta && item.estado === 'concluido') {
      // RF-10: Janela fechada durante transcrição não deve ser reaberta
      return;
    }

    switch (item.estado) {
      case 'na_fila': {
        const posicao = this.fila.obterPosicao(item.idAudio);
        this.exibicao.definirEstado(item.idAudio, {
          tipo: 'fila',
          posicaoNaFila: Math.max(1, posicao)
        });
        break;
      }
      case 'transcrevendo':
        this.exibicao.definirEstado(item.idAudio, {
          tipo: 'transcrevendo',
          segundosDecorridos: 0
        });
        break;
      case 'concluido':
        this.exibicao.definirEstado(item.idAudio, {
          tipo: 'concluido',
          texto: item.texto ?? '',
          idioma: item.idioma
        });
        break;
      case 'erro':
        this.exibicao.definirEstado(item.idAudio, {
          tipo: 'erro',
          mensagem: item.erro ?? 'FALHA_NA_TRANSCRICAO',
          motivo: item.motivoErro ?? 'Falha ao transcrever o áudio'
        });
        break;
    }
  }

  /**
   * Informa a posição atualizada quando itens à frente terminam (RF-04).
   */
  private tratarPosicaoFila(item: ItemFila, posicao: number): void {
    if (item.estado === 'na_fila' && item.janelaAberta) {
      this.exibicao.definirEstado(item.idAudio, {
        tipo: 'fila',
        posicaoNaFila: posicao
      });
    }
  }

  /**
   * Trata remoção de mensagem no WhatsApp (EC-05).
   */
  private tratarMensagemRemovida(idAudio: string): void {
    this.fila.removerMensagem(idAudio);
    this.cache.remover(idAudio);
    this.exibicao.fechar(idAudio);
  }

  /**
   * Destrói inscrições para limpeza de memória.
   */
  destruir(): void {
    this.cancelamentos.forEach((fn) => fn());
    this.cancelamentos = [];
  }
}
