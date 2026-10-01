import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  VerificadorCompatibilidade,
  type InfoHardwareInicial
} from '../src/dominio/compatibilidade.ts';

describe('Compatibilidade e Instalação Guiada — Domínio', () => {
  const verificador = new VerificadorCompatibilidade();

  it('Mac Apple Silicon com 8 GB ou mais é aprovado como compatível (RF-03, RF-04)', () => {
    const info: InfoHardwareInicial = {
      plataforma: 'macOS',
      arquitetura: 'arm64',
      memoriaTotalGB: 8
    };

    const res = verificador.avaliar(info);
    assert.equal(res.compativel, true);
    assert.equal(res.requisitosNaoAtendidos.length, 0);
    assert.equal(res.instaladorSugerido?.plataforma, 'macOS');
    assert.equal(res.instaladorSugerido?.arquivo, 'whispper-macos-apple-silicon.pkg');
  });

  it('Mac com processador Intel (x86_64) é rejeitado com explicação leiga (RF-04, RF-05)', () => {
    const info: InfoHardwareInicial = {
      plataforma: 'macOS',
      arquitetura: 'x86_64',
      memoriaTotalGB: 16
    };

    const res = verificador.avaliar(info);
    assert.equal(res.compativel, false);
    assert.equal(res.requisitosNaoAtendidos.length, 1);
    assert.equal(res.requisitosNaoAtendidos[0]?.requisito, 'Processador Mac');
    assert.match(res.requisitosNaoAtendidos[0]!.explicacaoLeiga, /Apple Silicon/);
    assert.equal(res.instaladorSugerido, undefined);
  });

  it('Windows 64 bits com 8 GB ou mais é aprovado como compatível (RF-04, RF-08)', () => {
    const info: InfoHardwareInicial = {
      plataforma: 'Windows',
      arquitetura: 'x86_64',
      memoriaTotalGB: 16
    };

    const res = verificador.avaliar(info);
    assert.equal(res.compativel, true);
    assert.equal(res.requisitosNaoAtendidos.length, 0);
    assert.equal(res.instaladorSugerido?.plataforma, 'Windows');
    assert.equal(res.instaladorSugerido?.arquivo, 'whispper-windows-x64.exe');
  });

  it('Windows de 32 bits é rejeitado com explicação sobre 64 bits (RF-04, RF-05)', () => {
    const info: InfoHardwareInicial = {
      plataforma: 'Windows',
      arquitetura: 'x86_32',
      memoriaTotalGB: 8
    };

    const res = verificador.avaliar(info);
    assert.equal(res.compativel, false);
    assert.equal(res.requisitosNaoAtendidos.some((r) => r.requisito === 'Processador Windows'), true);
  });

  it('Computador com RAM inferior a 8 GB (ex: 4 GB) é rejeitado com explicação clara (RF-04, RF-05)', () => {
    const info: InfoHardwareInicial = {
      plataforma: 'Windows',
      arquitetura: 'x86_64',
      memoriaTotalGB: 4
    };

    const res = verificador.avaliar(info);
    assert.equal(res.compativel, false);
    const erroMem = res.requisitosNaoAtendidos.find((r) => r.requisito === 'Memória RAM');
    assert.ok(erroMem);
    assert.match(erroMem.explicacaoLeiga, /4 GB/);
    assert.match(erroMem.explicacaoLeiga, /8 GB/);
  });

  it('Sistema operacional não suportado (ex: Linux) é rejeitado antes de downloads (RF-04, RF-05)', () => {
    const info: InfoHardwareInicial = {
      plataforma: 'Linux',
      arquitetura: 'x86_64',
      memoriaTotalGB: 16
    };

    const res = verificador.avaliar(info);
    assert.equal(res.compativel, false);
    assert.equal(res.requisitosNaoAtendidos[0]?.requisito, 'Sistema Operacional');
  });

  it('extrairInfoDoNavegador infere plataforma e memória a partir de objetos do browser', () => {
    const mockNavMac = {
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      deviceMemory: 8
    };

    const infoMac = VerificadorCompatibilidade.extrairInfoDoNavegador(mockNavMac);
    assert.equal(infoMac.plataforma, 'macOS');
    assert.equal(infoMac.memoriaTotalGB, 8);

    const mockNavWin = {
      platform: 'Win32',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      deviceMemory: 16
    };

    const infoWin = VerificadorCompatibilidade.extrairInfoDoNavegador(mockNavWin);
    assert.equal(infoWin.plataforma, 'Windows');
    assert.equal(infoWin.arquitetura, 'x86_64');
    assert.equal(infoWin.memoriaTotalGB, 16);
  });
});
