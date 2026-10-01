import type {
  MotorDeTranscricao,
  EstadoDoMotor,
  ResultadoDaTranscricao
} from '../dominio/motor-de-transcricao.ts';

export class MotorClienteContent implements MotorDeTranscricao {
  async verificar(): Promise<EstadoDoMotor> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return {
        estado: 'pronto',
        modelo: 'simulado',
        versaoApp: '0.1.0',
        protocolo: 1
      };
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ tipo: 'verificar_motor' }, (resposta) => {
        if (chrome.runtime.lastError || !resposta) {
          resolve({
            estado: 'indisponivel',
            codigo: 'MOTOR_INDISPONIVEL',
            motivo: chrome.runtime.lastError?.message || 'Serviço de segundo plano inacessível'
          });
          return;
        }
        resolve(resposta.resultado);
      });
    });
  }

  async transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return {
        ok: true,
        texto: 'Transcrição simulada concluída com sucesso.',
        idioma: 'pt',
        duracaoAudioSeg: 5,
        processamentoMs: 120
      };
    }

    return new Promise((resolve) => {
      // Converte bytes para base64 para envio via mensagem JSON do Chrome
      let binary = '';
      const len = audio.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(audio[i] ?? 0);
      }
      const audioBase64 = btoa(binary);

      chrome.runtime.sendMessage(
        {
          tipo: 'transcrever_audio',
          audioBase64,
          tipoDeMidia
        },
        (resposta) => {
          if (chrome.runtime.lastError || !resposta) {
            resolve({
              ok: false,
              codigo: 'MOTOR_INDISPONIVEL',
              motivo: chrome.runtime.lastError?.message || 'Falha na comunicação com o motor'
            });
            return;
          }

          if (resposta.ok && resposta.resultado) {
            resolve(resposta.resultado);
          } else {
            resolve({
              ok: false,
              codigo: 'FALHA_NA_TRANSCRICAO',
              motivo: resposta.erro || 'Falha desconhecida no motor'
            });
          }
        }
      );
    });
  }
}
