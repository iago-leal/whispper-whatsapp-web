// Abstração do canal de Native Messaging, para que o adaptador rode sobre o Chrome, sobre um
// canal simulado nos testes unitários e sobre o host real lançado pelo Node (DT-10).

export interface PortaNativa {
  /** Lança exceção se a porta já estiver fechada, como `Port.postMessage` do Chrome. */
  enviar(mensagem: unknown): void;
  aoReceber(ouvinte: (mensagem: unknown) => void): void;
  /** Chamado quando o host ou o Chrome fecham a porta, com o texto de `lastError` ou null. */
  aoDesconectar(ouvinte: (erro: string | null) => void): void;
  /** Fecha a porta pelo lado da extensão; não dispara `aoDesconectar`. */
  desconectar(): void;
}

export interface CanalNativo {
  /**
   * Abre uma porta com o host. Não lança: como em `chrome.runtime.connectNative`, a falha
   * de conexão chega depois, como desconexão com o erro correspondente.
   */
  conectar(): PortaNativa;
}
