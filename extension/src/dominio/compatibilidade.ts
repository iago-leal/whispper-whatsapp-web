/**
 * Domínio de Compatibilidade e Verificação de Sistema (RF-03, RF-04, RF-05).
 *
 * Totalmente isolado de APIs proprietárias para garantir testabilidade direta.
 */

export type PlataformaSO = 'macOS' | 'Windows' | 'Linux' | 'outro';
export type ArquiteturaCPU = 'arm64' | 'x86_64' | 'x86_32' | 'outro';

export interface InfoHardwareInicial {
  plataforma: PlataformaSO;
  arquitetura: ArquiteturaCPU;
  memoriaTotalGB: number;
}

export interface RequisitoNaoAtendido {
  requisito: string;
  exigido: string;
  encontrado: string;
  explicacaoLeiga: string;
}

export interface ResultadoVerificacaoInicial {
  compativel: boolean;
  requisitosNaoAtendidos: RequisitoNaoAtendido[];
  instaladorSugerido?: {
    nome: string;
    arquivo: string;
    plataforma: PlataformaSO;
  };
}

export class VerificadorCompatibilidade {
  /**
   * Avalia as especificações de hardware contra a matriz de requisitos mínimos do Whispper.
   */
  avaliar(info: InfoHardwareInicial): ResultadoVerificacaoInicial {
    const naoAtendidos: RequisitoNaoAtendido[] = [];

    // Verificação de Sistema Operacional
    if (info.plataforma !== 'macOS' && info.plataforma !== 'Windows') {
      naoAtendidos.push({
        requisito: 'Sistema Operacional',
        exigido: 'macOS 14+ ou Windows 10/11',
        encontrado: info.plataforma,
        explicacaoLeiga:
          'O Whispper atualmente funciona em computadores Mac e Windows. O sistema operacional detectado ainda não é suportado.'
      });
      return { compativel: false, requisitosNaoAtendidos: naoAtendidos };
    }

    // Verificação de Arquitetura de Processador
    if (info.plataforma === 'macOS') {
      if (info.arquitetura !== 'arm64') {
        naoAtendidos.push({
          requisito: 'Processador Mac',
          exigido: 'Apple Silicon (M1, M2, M3 ou posterior)',
          encontrado: info.arquitetura === 'x86_64' ? 'Intel (x86-64)' : info.arquitetura,
          explicacaoLeiga:
            'O Whispper para Mac foi otimizado exclusivamente para processadores Apple Silicon da linha M (M1, M2, M3, M4). O seu Mac utiliza processador Intel.'
        });
      }
    } else if (info.plataforma === 'Windows') {
      if (info.arquitetura !== 'x86_64') {
        naoAtendidos.push({
          requisito: 'Processador Windows',
          exigido: 'Processador de 64 bits (x86-64)',
          encontrado: info.arquitetura === 'x86_32' ? '32 bits' : info.arquitetura,
          explicacaoLeiga:
            'O Whispper precisa de uma versão do Windows de 64 bits para executar a inteligência artificial localmente.'
        });
      }
    }

    // Verificação de Memória RAM (Mínimo 8 GB)
    if (info.memoriaTotalGB > 0 && info.memoriaTotalGB < 8) {
      naoAtendidos.push({
        requisito: 'Memória RAM',
        exigido: 'Pelo menos 8 GB',
        encontrado: `${info.memoriaTotalGB} GB`,
        explicacaoLeiga: `Seu computador possui cerca de ${info.memoriaTotalGB} GB de memória RAM. O modelo de inteligência artificial requer ao menos 8 GB para funcionar sem comprometer o computador.`
      });
    }

    const compativel = naoAtendidos.length === 0;

    let instaladorSugerido;
    if (compativel) {
      if (info.plataforma === 'macOS') {
        instaladorSugerido = {
          nome: 'Whispper para Mac (Apple Silicon)',
          arquivo: 'whispper-macos-apple-silicon.pkg',
          plataforma: 'macOS' as PlataformaSO
        };
      } else {
        instaladorSugerido = {
          nome: 'Whispper para Windows (64 bits)',
          arquivo: 'whispper-windows-x64.exe',
          plataforma: 'Windows' as PlataformaSO
        };
      }
    }

    return {
      compativel,
      requisitosNaoAtendidos: naoAtendidos,
      instaladorSugerido
    };
  }

  /**
   * Extrai informações aproximadas de hardware a partir de objetos padrão do navegador.
   */
  static extrairInfoDoNavegador(nav: {
    platform?: string;
    userAgent?: string;
    deviceMemory?: number;
  }): InfoHardwareInicial {
    const ua = (nav.userAgent || '').toLowerCase();
    const platform = (nav.platform || '').toLowerCase();

    let plataforma: PlataformaSO = 'outro';
    if (platform.includes('mac') || ua.includes('macintosh')) {
      plataforma = 'macOS';
    } else if (platform.includes('win') || ua.includes('windows')) {
      plataforma = 'Windows';
    } else if (platform.includes('linux') || ua.includes('linux')) {
      plataforma = 'Linux';
    }

    let arquitetura: ArquiteturaCPU = 'x86_64';
    if (plataforma === 'macOS') {
      // No Chrome/macOS em Apple Silicon, o userAgent muitas vezes emula Intel,
      // mas se estiver em arm64 ou se WebGL / platform sinalizar Apple Silicon:
      // O padrão para Macs modernos é arm64; no browser assumimos arm64 salvo indicação contrária.
      arquitetura = 'arm64';
    } else if (ua.includes('arm64') || ua.includes('aarch64')) {
      arquitetura = 'arm64';
    } else if (ua.includes('wow64') || ua.includes('win64') || ua.includes('x86_64')) {
      arquitetura = 'x86_64';
    } else if (ua.includes('i686') || ua.includes('i386')) {
      arquitetura = 'x86_32';
    }

    // Memória reportada pelo navegador em GB (ex: 8)
    const memoriaTotalGB = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;

    return {
      plataforma,
      arquitetura,
      memoriaTotalGB
    };
  }
}
