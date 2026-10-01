# Requisitos — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Nome curto:** `compatibilidade-instalacao`
**Origem:** `_reversa_sdd/sdd/compatibilidade-instalacao.md` e `_reversa_sdd/prd.md`
**Data:** 2026-10-01
**Status:** Aprovado

---

## 1. Visão Geral

Esta feature implementa o fluxo de onboarding e compatibilidade para viabilizar o uso do Whispper por usuários leigos, sem dependência de terminal, linhas de comando ou privilégios de administrador:

1. **Página de Boas-Vindas (`onboarding/index.html`):** Aberta automaticamente ao instalar a extensão via Chrome Web Store (`chrome.runtime.onInstalled`).
2. **Aviso de Privacidade Estrito:** Apresenta com clareza o compromisso de privacidade local (processamento 100% no dispositivo, áudios e textos nunca persistidos, sem telemetria externa).
3. **Verificação Inicial de Compatibilidade:** Avalia sistema operacional, arquitetura de CPU e memória RAM antes de permitir qualquer download. Computadores incompatíveis recebem explicação clara em linguagem simples, sem jargões técnicos.
4. **Instalador Guiado do Aplicativo Auxiliar:** Oferece o pacote correspondente à plataforma detectada (macOS Apple Silicon ou Windows 64 bits), registrando o manifesto de Native Messaging no perfil do usuário local sem exigir senha de root/administrador.
5. **Detecção Reativa e Verificação Completa:** Polling a cada 3 s para detectar a ativação do aplicativo auxiliar, executando em seguida a checagem detalhada (espaço livre em disco ≥ 4 GB, aceleração de hardware e memória disponível).
6. **Download com Progresso e Transcrição de Teste:** Exibe barra de progresso do modelo e executa uma transcrição de teste fim-a-fim usando o áudio sintético em português (`fala-pt.ogg`), finalizando com o redirecionamento ao WhatsApp Web.
7. **Botão de Reavaliação no Popup:** Permite ao usuário reabrir a verificação a qualquer momento através do painel da extensão.

---

## 2. Requisitos Funcionais

- **RF-01:** Abrir a página de boas-vindas da extensão ao detectar a instalação (`details.reason === 'install'`).
- **RF-02:** Exibir aviso de privacidade transparente como passo obrigatório antes de qualquer verificação ou download.
- **RF-03:** Executar verificação inicial de hardware via APIs do navegador (SO, arquitetura, memória RAM).
- **RF-04:** Comparar os dados com os requisitos mínimos (macOS Apple Silicon ou Windows 64-bit; RAM ≥ 8 GB).
- **RF-05:** Se incompatível, detalhar os requisitos não atendidos sem jargões técnicos e instruir como desinstalar a extensão.
- **RF-06:** Se compatível, disponibilizar o instalador apropriado para o SO detectado.
- **RF-07:** Instalar o aplicativo auxiliar no escopo do usuário corrente sem requisição de senha de administrador.
- **RF-08:** Prover suporte a adaptadores para computadores sem Apple Silicon (Windows 64 bits com fallback/CPU/DirectML).
- **RF-09:** Sondar reativamente o motor a cada 3 segundos na página de boas-vindas até detectar conexão ativa.
- **RF-10:** Executar verificação completa através do aplicativo auxiliar (RAM livre, espaço em disco ≥ 4 GB, GPU/NPU).
- **RF-11:** Acompanhar o download dos pesos do modelo com progresso percentual e verificação de integridade de hash.
- **RF-12:** Permitir retomada de downloads interrompidos sem perda do progresso já baixado.
- **RF-13:** Realizar transcrição de teste com o áudio sintético de amostra embutido, concluindo com a mensagem "Pronto: abra o WhatsApp Web".
- **RF-14:** Fornecer scripts para desinstalação completa e limpa do aplicativo e dos pesos do modelo.
- **RF-15:** Disponibilizar botão "Verificar compatibilidade" no painel da extensão para reabrir o fluxo a qualquer momento.
- **RF-16:** Persistir a etapa atual no armazenamento da extensão para retomar o onboarding de onde parou em caso de fechamento acidental da aba.

---

## 3. Requisitos Não-Funcionais

- **RNF-01:** Zero termos técnicos sem explicação prévia na interface do onboarding.
- **RNF-02:** Tempo total até a primeira transcrição ≤ 15 minutos em banda padrão (50 Mbps).
- **RNF-03:** Acessibilidade WCAG 2.1 AA e navegação completa por teclado.
- **RNF-04:** Privacidade absoluta: zero envio de diagnósticos ou informações do hardware para a internet.
