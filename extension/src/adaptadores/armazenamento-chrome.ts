import {
  completarContadores,
  type ArmazenamentoNavegador,
  type ContadoresPersistidos
} from '../dominio/armazenamento-navegador.ts';

const CHAVE_STORAGE = 'whispper_contadores';

function contadoresZerados(): ContadoresPersistidos {
  return {
    lidos: 0,
    ouvidos: 0,
    lidosETocados: 0,
    inicioContagem: new Date().toISOString(),
    esperaAcumuladaMs: 0,
    audioAcumuladoMs: 0
  };
}

export class ArmazenamentoMemoria implements ArmazenamentoNavegador {
  private contadores: ContadoresPersistidos;

  constructor(inicial?: Partial<ContadoresPersistidos>) {
    this.contadores = { ...contadoresZerados(), ...inicial };
  }

  async carregarContadores(): Promise<ContadoresPersistidos> {
    return { ...this.contadores };
  }

  async salvarContadores(contadores: ContadoresPersistidos): Promise<void> {
    this.contadores = { ...contadores };
  }

  async zerarContadores(): Promise<ContadoresPersistidos> {
    this.contadores = contadoresZerados();
    return { ...this.contadores };
  }
}

export class ArmazenamentoChrome implements ArmazenamentoNavegador {
  async carregarContadores(): Promise<ContadoresPersistidos> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return contadoresZerados();
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([CHAVE_STORAGE], (resultado) => {
        const salvos = resultado?.[CHAVE_STORAGE] as ContadoresPersistidos | undefined;
        if (salvos && typeof salvos.lidos === 'number') {
          // Registro gravado antes dos totais de espera chega sem eles (feature 006)
          resolve(completarContadores(salvos));
        } else {
          const novo = contadoresZerados();
          chrome.storage.local.set({ [CHAVE_STORAGE]: novo }, () => resolve(novo));
        }
      });
    });
  }

  async salvarContadores(contadores: ContadoresPersistidos): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [CHAVE_STORAGE]: contadores }, () => resolve());
    });
  }

  async zerarContadores(): Promise<ContadoresPersistidos> {
    const limpo = contadoresZerados();
    await this.salvarContadores(limpo);
    return limpo;
  }
}
