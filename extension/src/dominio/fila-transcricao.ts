export type EstadoItemFila = 'na_fila' | 'transcrevendo' | 'concluido' | 'erro';

export type CodigoErroPedido =
  | 'MOTOR_INDISPONIVEL'
  | 'AUDIO_INDISPONIVEL'
  | 'TEMPO_ESGOTADO'
  | 'FALHA_NA_TRANSCRICAO'
  | 'VERSAO_INCOMPATIVEL';

export interface ItemFila {
  idAudio: string;
  direcao: 'recebido' | 'enviado';
  estado: EstadoItemFila;
  criadoEm: number;
  janelaAberta: boolean;
  duracaoEstimadaSeg?: number;
  texto?: string;
  idioma?: string;
  erro?: CodigoErroPedido;
  motivoErro?: string;
}

export interface ObservadoresFila {
  aoMudarEstado?: (item: ItemFila) => void;
  aoAtualizarPosicao?: (item: ItemFila, posicaoNaFila: number) => void;
  aoProcessar?: (item: ItemFila) => Promise<{
    sucesso: boolean;
    texto?: string;
    idioma?: string;
    erro?: CodigoErroPedido;
    motivoErro?: string;
  }>;
}

export class FilaDeTranscricao {
  private itens: ItemFila[] = [];
  private itemAtivo: ItemFila | null = null;
  private timerTimeout: ReturnType<typeof setTimeout> | null = null;
  private geracaoProcessamento = 0;

  private readonly observadores: ObservadoresFila;

  constructor(observadores: ObservadoresFila = {}) {
    this.observadores = observadores;
  }

  /**
   * Adiciona um novo pedido no fim da fila (RF-01, RF-02).
   * Retorna true se foi adicionado, false se já existia na fila ou em execução.
   */
  enfileirar(idAudio: string, direcao: 'recebido' | 'enviado', duracaoEstimadaSeg?: number): boolean {
    if (this.buscar(idAudio)) {
      return false; // Pedido já existe ativo ou na fila
    }

    const item: ItemFila = {
      idAudio,
      direcao,
      estado: 'na_fila',
      criadoEm: Date.now(),
      janelaAberta: true,
      duracaoEstimadaSeg
    };

    this.itens.push(item);
    this.notificarMudanca(item);
    this.atualizarPosicoes();
    this.processarProximoSeOcioso();
    return true;
  }

  /**
   * Recoloca um pedido em erro no fim da fila (RF-09).
   */
  repetir(idAudio: string): boolean {
    // Se estiver ativo ou na fila, não faz nada
    if (this.itemAtivo?.idAudio === idAudio || this.itens.some((i) => i.idAudio === idAudio)) {
      return false;
    }

    const item: ItemFila = {
      idAudio,
      direcao: 'recebido',
      estado: 'na_fila',
      criadoEm: Date.now(),
      janelaAberta: true
    };

    this.itens.push(item);
    this.notificarMudanca(item);
    this.atualizarPosicoes();
    this.processarProximoSeOcioso();
    return true;
  }

  /**
   * Registra que a janela foi fechada pelo usuário (RF-10).
   * Se estiver na fila, remove o pedido. Se estiver transcrevendo, marca que a janela fechou
   * mas deixa o processamento continuar em segundo plano.
   */
  notificarJanelaFechada(idAudio: string): void {
    if (this.itemAtivo && this.itemAtivo.idAudio === idAudio) {
      this.itemAtivo.janelaAberta = false;
      return;
    }

    const index = this.itens.findIndex((i) => i.idAudio === idAudio);
    if (index !== -1) {
      this.itens.splice(index, 1);
      this.atualizarPosicoes();
    }
  }

  /**
   * Remove imediatamente o áudio da fila e da execução se a mensagem foi apagada (EC-05).
   */
  removerMensagem(idAudio: string): void {
    if (this.itemAtivo && this.itemAtivo.idAudio === idAudio) {
      this.abortarItemAtivo('AUDIO_INDISPONIVEL', 'Mensagem apagada pelo remetente');
      return;
    }

    const index = this.itens.findIndex((i) => i.idAudio === idAudio);
    if (index !== -1) {
      this.itens.splice(index, 1);
      this.atualizarPosicoes();
    }
  }

  /**
   * Cancela todos os itens na fila e em execução com erro MOTOR_INDISPONIVEL (RF-19).
   */
  abortarPorMotorIndisponivel(motivo = 'Aplicativo auxiliar do Whispper indisponível'): void {
    if (this.itemAtivo) {
      this.abortarItemAtivo('MOTOR_INDISPONIVEL', motivo);
    }

    const filaPendente = [...this.itens];
    this.itens = [];

    for (const item of filaPendente) {
      item.estado = 'erro';
      item.erro = 'MOTOR_INDISPONIVEL';
      item.motivoErro = motivo;
      this.notificarMudanca(item);
    }
  }

  buscar(idAudio: string): ItemFila | undefined {
    if (this.itemAtivo && this.itemAtivo.idAudio === idAudio) {
      return this.itemAtivo;
    }
    return this.itens.find((i) => i.idAudio === idAudio);
  }

  obterItemAtivo(): ItemFila | null {
    return this.itemAtivo;
  }

  obterFilaPendente(): readonly ItemFila[] {
    return this.itens;
  }

  obterPosicao(idAudio: string): number {
    const idx = this.itens.findIndex((i) => i.idAudio === idAudio);
    return idx === -1 ? 0 : idx + 1;
  }

  private atualizarPosicoes(): void {
    this.itens.forEach((item, index) => {
      const posicao = index + 1;
      this.observadores.aoAtualizarPosicao?.(item, posicao);
    });
  }

  private notificarMudanca(item: ItemFila): void {
    this.observadores.aoMudarEstado?.(item);
  }

  private abortarItemAtivo(erro: CodigoErroPedido, motivo: string): void {
    if (!this.itemAtivo) return;
    this.limparTimeout();
    this.geracaoProcessamento += 1;

    const item = this.itemAtivo;
    item.estado = 'erro';
    item.erro = erro;
    item.motivoErro = motivo;
    this.itemAtivo = null;

    this.notificarMudanca(item);
    this.processarProximoSeOcioso();
  }

  private limparTimeout(): void {
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }
  }

  private calcularTimeoutMs(duracaoSeg?: number): number {
    // RNF-02: o maior entre 60 s e 30 s por minuto de áudio (0.5 s por seg)
    const seg = duracaoSeg && duracaoSeg > 0 ? duracaoSeg : 60;
    const prazoSeg = Math.max(60, Math.ceil((seg / 60) * 30));
    return prazoSeg * 1000;
  }

  private processarProximoSeOcioso(): void {
    if (this.itemAtivo || this.itens.length === 0) {
      return;
    }

    const proximo = this.itens.shift()!;
    this.itemAtivo = proximo;
    proximo.estado = 'transcrevendo';
    this.notificarMudanca(proximo);
    this.atualizarPosicoes();

    const geracaoAtual = ++this.geracaoProcessamento;
    const timeoutMs = this.calcularTimeoutMs(proximo.duracaoEstimadaSeg);

    this.limparTimeout();
    this.timerTimeout = setTimeout(() => {
      if (this.geracaoProcessamento === geracaoAtual && this.itemAtivo?.idAudio === proximo.idAudio) {
        this.abortarItemAtivo('TEMPO_ESGOTADO', `Tempo limite de ${timeoutMs / 1000}s esgotado`);
      }
    }, timeoutMs);

    if (this.observadores.aoProcessar) {
      this.observadores
        .aoProcessar(proximo)
        .then((resultado) => {
          if (this.geracaoProcessamento !== geracaoAtual) {
            // Resposta tardia ou descartada (RF-11)
            return;
          }
          this.limparTimeout();
          this.itemAtivo = null;

          if (resultado.sucesso) {
            proximo.estado = 'concluido';
            proximo.texto = resultado.texto ?? '';
            proximo.idioma = resultado.idioma;
          } else {
            proximo.estado = 'erro';
            proximo.erro = resultado.erro ?? 'FALHA_NA_TRANSCRICAO';
            proximo.motivoErro = resultado.motivoErro ?? 'Falha ao processar transcrição';
          }

          this.notificarMudanca(proximo);
          this.processarProximoSeOcioso();
        })
        .catch((err) => {
          if (this.geracaoProcessamento !== geracaoAtual) return;
          this.limparTimeout();
          this.itemAtivo = null;
          proximo.estado = 'erro';
          proximo.erro = 'FALHA_NA_TRANSCRICAO';
          proximo.motivoErro = err instanceof Error ? err.message : String(err);
          this.notificarMudanca(proximo);
          this.processarProximoSeOcioso();
        });
    }
  }
}
