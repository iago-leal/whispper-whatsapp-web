import type {
  ArmazenamentoNavegador,
  ContadoresPersistidos
} from '../dominio/armazenamento-navegador.ts';

const CHAVE_STORAGE = 'whispper_contadores';

export class ArmazenamentoMemoria implements ArmazenamentoNavegador {
  private contadores: ContadoresPersistidos;

  constructor(inicial?: Partial<ContadoresPersistidos>) {
    this.contadores = {
      lidos: inicial?.lidos ?? 0,
      ouvidos: inicial?.ouvidos ?? 0,
      lidosETocados: inicial?.lidosETocados ?? 0,
      inicioContagem: inicial?.inicioContagem ?? new Date().toISOString()
    };
  }

  async carregarContadores(): Promise<ContadoresPersistidos> {
    return { ...this.contadores };
  }

  async salvarContadores(contadores: ContadoresPersistidos): Promise<void> {
    this.contadores = { ...contadores };
  }

  async zerarContadores(): Promise<ContadoresPersistidos> {
    this.contadores = {
      lidos: 0,
      ouvidos: 0,
      lidosETocados: 0,
      inicioContagem: new Date().toISOString()
    };
    return { ...this.contadores };
  }
}

export class ArmazenamentoChrome implements ArmazenamentoNavegador {
  async carregarContadores(): Promise<ContadoresPersistidos> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return {
        lidos: 0,
        ouvidos: 0,
        lidosETocados: 0,
        inicioContagem: new Date().toISOString()
      };
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([CHAVE_STORAGE], (resultado) => {
        const salvos = resultado?.[CHAVE_STORAGE] as ContadoresPersistidos | undefined;
        if (salvos && typeof salvos.lidos === 'number') {
          resolve(salvos);
        } else {
          const novo: ContadoresPersistidos = {
            lidos: 0,
            ouvidos: 0,
            lidosETocados: 0,
            inicioContagem: new Date().toISOString()
          };
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
    const limpo: ContadoresPersistidos = {
      lidos: 0,
      ouvidos: 0,
      lidosETocados: 0,
      inicioContagem: new Date().toISOString()
    };
    await this.salvarContadores(limpo);
    return limpo;
  }
}
