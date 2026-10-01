# PRD: whispper-whatsapp-web

> Selo 🟡 PLANEJADO. Documento gerado a partir de ideation + personas.

**Versão:** 1.0
**Data:** 2026-09-30T14:14:23-03:00
**Autor:** reversa-drafter
**Status:** rascunho

---

## 1. Problema

🟡 Ouvir áudios do WhatsApp consome tempo e atenção, sobretudo quando o remetente é prolixo e fragmenta uma mesma fala em vários áudios curtos. No WhatsApp Web, usado no computador, não há transcrição nativa, recurso que existe apenas nos aplicativos de celular. A saída disponível hoje é manual: baixar cada áudio e rodar o Whisper na própria máquina, fluxo que mantém o áudio local, mas custa cerca de cinco passos por áudio. As extensões e os bots de terceiros, que em geral enviam o áudio para a nuvem, não foram avaliados.

🟡 O produto é uma extensão de navegador que insere um ícone de transcrição em cada mensagem de áudio do WhatsApp Web e exibe o texto, transcrito localmente pelo Whisper, numa janela flutuante ancorada ao próprio áudio. Não cria capacidade nova: automatiza um fluxo que o usuário já pratica e valida, reduzindo-o a um clique.

🟡 "whispper", no nome do projeto, refere-se ao modelo de reconhecimento de fala Whisper, da OpenAI.

### Quem sente

- 🟡 **Usuário técnico**, o próprio iniciador do projeto, no Mac com Apple Silicon e com o WhatsApp Web aberto ao lado de outras tarefas. Sente o problema em quatro momentos: no meio do trabalho, em ambientes nos quais não pode reproduzir som, quando precisa localizar depressa uma informação dentro de um áudio e quando os áudios se acumulam.
- 🟡 **Usuário leigo**, horizonte de distribuição: profissional autônomo ou de pequeno negócio, em notebook comum, provavelmente com Windows. Sente o problema ao longo do dia, quando os áudios de clientes chegam enquanto atende outra pessoa.

---

## 2. Personas-alvo

🟡 Referência completa em [`personas.md`](./personas.md). Resumo:

- **Usuário técnico**: 🟡 avançado em terminal e em execução local de modelos, já transcreve áudios manualmente com mlx-whisper. Dor principal: o fluxo manual resolve, mas exige vários passos a cada áudio. É a prioridade imediata (uso pessoal).
- **Usuário leigo**: 🟡 iniciante; sabe instalar uma extensão pela loja do navegador, mas não usa terminal e desconhece o Whisper. Dor principal: ouvir áudios interrompe o atendimento, e as soluções locais de transcrição exigem conhecimento técnico que não possui. É o horizonte de distribuição.

---

## 3. Métricas de sucesso

🟡 Horizonte de três meses. As quatro métricas foram aceitas pelo usuário na ideação.

| Métrica | Unidade | Alvo | Prazo |
|---|---|---|---|
| 🟡 Adoção: áudios recebidos lidos em vez de ouvidos | % dos áudios recebidos | 🟡 ≥ 90% | 🟡 3 meses |
| 🟡 Latência: tempo entre o clique no ícone e o texto na janela | s por minuto de áudio | 🟡 ≤ 10 s/min | 🟡 3 meses |
| 🟡 Esforço: passos manuais para transcrever um áudio | passos | 🟡 1 clique (hoje, cerca de 5) | 🟡 3 meses |
| 🟡 Qualidade: transcrições compreendidas sem ouvir o áudio | % das transcrições | 🟡 ≥ 95% | 🟡 3 meses |

- 🟡 [INDEFINIDO, validar com usuário] Forma de coletar as métricas de adoção e de qualidade: registro automático, amostragem manual ou percepção.
- 🟡 [INDEFINIDO, validar com usuário] Hardware de referência da métrica de latência. O alvo de 10 s/min foi fixado sem indicar a máquina de medição, e o resultado varia muito entre o Mac com Apple Silicon e um notebook comum sem aceleração dedicada.

---

## 4. Escopo (in)

🟡 A prioridade é o uso pessoal imediato; a distribuição a terceiros é horizonte. O escopo divide-se, por isso, em duas etapas.

### Primeira etapa: uso pessoal

- 🟡 Extensão para o Chrome, alvo inicial escolhido pelo usuário, extensível aos navegadores de mesma base (Chromium), como Edge e Brave.
- 🟡 Ícone de transcrição inserido em cada mensagem de áudio do WhatsApp Web.
- 🟡 Transcrição sob demanda, disparada por um único clique no ícone.
- 🟡 Transcrição local pelo Whisper, executada na máquina do usuário.
- 🟡 Janela flutuante ancorada ao áudio de origem, com o texto transcrito.
- 🟡 Várias janelas abertas ao mesmo tempo, para acompanhar em ordem uma sequência de áudios fragmentados.
- 🟡 Fechamento individual das janelas pelo usuário.
- 🟡 Suporte inicial ao Mac com Apple Silicon, com o desenho preparado desde o início para máquinas sem Apple Silicon.

### Etapa posterior: distribuição

- 🟡 Publicação na loja de extensões do Chrome.
- 🟡 Verificação de compatibilidade da máquina, cujo alcance depende da ponte até o Whisper (premissa 2): um aplicativo auxiliar enxerga a máquina inteira; a extensão sozinha, só parte do hardware.
- 🟡 Instalação guiada do motor de transcrição, sem uso de terminal, ou aviso claro de incompatibilidade.
- 🟡 Requisitos mínimos de hardware declarados, em vez de suporte universal.
- 🟡 Suporte a máquinas sem Apple Silicon, entre elas notebooks comuns com Windows.

🟡 [INDEFINIDO, validar com usuário] Se a verificação de compatibilidade entra já na primeira etapa ou apenas com a distribuição. O brief a prevê, mas a ideação adia para depois a instalação acessível a leigos, à qual a verificação serve.

---

## 5. Não-objetivos (out)

🟡 Itens excluídos pelo usuário:

- 🟡 Aplicativos de celular do WhatsApp (iOS e Android), que já contam com transcrição nativa.
- 🟡 Outros mensageiros, como Telegram e Signal.
- 🟡 Transcrição automática, seja de cada áudio ao chegar, seja em lote: a transcrição ocorre apenas quando o usuário clica no ícone.

### Fora da primeira versão, sem exclusão definitiva

🟡 O usuário não os excluiu e deixou a decisão para um segundo momento. Ficam fora do escopo atual:

- 🟡 Transcrição em nuvem, mesmo como alternativa opcional ao motor local.
- 🟡 Resumo, tradução e sugestão de resposta a partir da transcrição.
- 🟡 Extensões para Firefox e Safari, previstas no brief; a porta do navegador preserva a expansão.

---

## 6. Restrições

🟡 Restrições derivadas da ideação e das respostas de cobertura.

| Tipo | Descrição |
|---|---|
| 🟡 Técnica | 🟡 Navegador inicial: Chrome (base Chromium). Firefox e Safari ficam para depois, isolados pela porta do navegador. |
| 🟡 Técnica | 🟡 Transcrição local na primeira versão: o áudio não é enviado a serviços remotos. A exclusão definitiva da nuvem está em aberto (seção 5). |
| 🟡 Técnica | 🟡 Arquitetura de portas e adaptadores (hexagonal), com alta coesão e baixo acoplamento, por diretriz do usuário. Portas candidatas, sugeridas pelo agente e a validar: motor de transcrição, integração com o WhatsApp Web e navegador. |
| 🟡 Técnica | 🟡 Plataforma: alvo inicial no Mac com Apple Silicon; máquinas sem Apple Silicon contempladas no desenho desde o início; requisitos mínimos declarados. |
| 🟡 Técnica | 🟡 Limite da extensão: sozinha, ela não executa programas na máquina e só enxerga parte do hardware. [INDEFINIDO, validar com usuário] Caminho até o Whisper: aplicativo auxiliar via *Native Messaging* (desempenho pleno, exige instalação à parte), Whisper no navegador via WebGPU ou WebAssembly (dispensa instalação, porém mais lento e com modelos menores), ou ambos como adaptadores do motor. |
| 🟡 Técnica | 🟡 [INDEFINIDO, validar com usuário] Linguagens e ferramentas de desenvolvimento. O único dado disponível é o uso atual do mlx-whisper, biblioteca Python, pelo usuário técnico. |
| 🟡 Prazo | 🟡 [INDEFINIDO, validar com usuário] Nenhum prazo de entrega declarado. O único horizonte temporal é o de três meses das métricas, sem marco inicial definido. |
| 🟡 Compliance | 🟡 [INDEFINIDO, validar com usuário] Nenhuma exigência regulatória declarada. Ponto a examinar na distribuição: a LGPD só deixa de se aplicar ao tratamento feito por pessoa natural para fins exclusivamente particulares e não econômicos (art. 4º, I), o que não abrange o usuário leigo que transcreve áudios de clientes. A transcrição local reduz a exposição, mas o destino das transcrições ainda não foi definido. |
| 🟡 Orçamento | 🟡 [INDEFINIDO, validar com usuário] Nenhum orçamento declarado. |

---

## 7. Dependências externas

- 🟡 **WhatsApp Web**: a interface da página e o áudio decifrado que ela carrega. É dependência sem contrato, sujeita a mudança sem aviso (premissa 1).
- 🟡 **Modelo Whisper (OpenAI) e suas implementações locais**: mlx-whisper, para Apple Silicon; whisper.cpp ou faster-whisper, para as demais plataformas; Whisper no navegador, via WebGPU ou WebAssembly. [INDEFINIDO, validar com usuário] Origem e forma de obtenção dos pesos do modelo.
- 🟡 **API de *Native Messaging* do Chrome**, se o caminho do aplicativo auxiliar for adotado.
- 🟡 **Loja de extensões do Chrome (Chrome Web Store)**, para a distribuição na etapa posterior.

---

## 8. Riscos

🟡 Riscos derivados das premissas da ideação, das lacunas nas jornadas e das restrições. Impacto e probabilidade são estimativas do drafter, a validar.

| Risco | Impacto | Probabilidade | Mitigação proposta |
|---|---|---|---|
| 🟡 A extensão não consegue obter o áudio já decifrado que a página carrega (premissa 1) | 🟡 alto: inviabiliza o produto | 🟡 média | 🟡 Prova de conceito de acesso ao áudio antes de qualquer outra frente de desenvolvimento. |
| 🟡 Mudanças na interface do WhatsApp Web impedem a inserção do ícone (premissa 1) | 🟡 alto | 🟡 alta | 🟡 Concentrar a leitura da página e a inserção do ícone num único adaptador; sinalizar ao usuário quando o ícone não puder ser inserido, em vez de falhar em silêncio. |
| 🟡 Nenhum caminho até o Whisper concilia a latência-alvo com a instalação sem ajuda técnica (premissa 2) | 🟡 alto | 🟡 média | 🟡 Porta do motor com mais de um adaptador: aplicativo auxiliar para desempenho pleno; Whisper no navegador para dispensar instalação. Medir a latência de cada um antes da distribuição. |
| 🟡 Latência acima de 10 s/min em máquinas sem Apple Silicon | 🟡 médio | 🟡 média | 🟡 Requisitos mínimos declarados; modelos menores nessas máquinas; métrica de latência medida por plataforma. |
| 🟡 Cliques sucessivos em vários áudios fragmentados disparam transcrições simultâneas, que disputam o hardware e somam latência (lacuna da jornada do usuário técnico, passos 4 e 5) | 🟡 médio | 🟡 alta | 🟡 Fila de transcrições na ordem dos áudios, com indicação de progresso em cada janela. |
| 🟡 Instalação do motor inacessível ao usuário leigo (lacuna da jornada do usuário leigo, passos 2 e 3) | 🟡 alto para a distribuição, nulo para o uso pessoal | 🟡 alta | 🟡 Tratar a instalação guiada como etapa própria; avaliar o adaptador no navegador, que dispensa instalação. |
| 🟡 Transcrições abaixo de 95% de compreensão em áudios informais, com ruído ou sotaque | 🟡 médio | 🟡 média | 🟡 Tamanho do modelo escolhido por plataforma; manter o áudio original acessível junto à janela. |
| 🟡 Sucesso não aferível por falta de forma de coleta das métricas de adoção e de qualidade | 🟡 médio | 🟡 alta | 🟡 Definir a coleta antes da implementação, preferindo registro local que não envie dados para fora da máquina. |

---

## 9. Critérios de aceite (alto nível)

- 🟡 **Dado** o WhatsApp Web aberto no Chrome, num Mac com Apple Silicon e com o motor local disponível, **Quando** o usuário técnico clica no ícone de transcrição de uma mensagem de áudio, **Então** o texto aparece numa janela flutuante ancorada ao áudio em até 10 s por minuto de áudio, sem nenhum outro passo manual.
- 🟡 **Dado** uma sequência de áudios fragmentados do mesmo remetente, **Quando** o usuário técnico clica no ícone de cada um, **Então** as janelas permanecem abertas ao mesmo tempo, cada uma ancorada ao seu áudio, e podem ser lidas em ordem e fechadas uma a uma.
- 🟡 **Dado** um áudio recebido, **Quando** o usuário não clica no ícone, **Então** nenhuma transcrição é executada.
- 🟡 **Dado** qualquer transcrição na primeira versão, **Quando** ela é executada, **Então** o áudio é processado na máquina do usuário, sem envio a serviços remotos.
- 🟡 **Dado** a extensão instalada pela loja do Chrome num computador sem Apple Silicon, **Quando** o usuário leigo executa a verificação de compatibilidade, **Então** recebe a instalação guiada do motor, sem uso de terminal, ou um aviso claro de incompatibilidade com os requisitos mínimos (etapa de distribuição).

---

## Pendências de cobertura

🟡 Pontos que precisam de validação humana antes da decomposição em specs:

1. 🟡 Forma de coleta das métricas de adoção e de qualidade (seção 3).
2. 🟡 Hardware de referência da métrica de latência (seção 3).
3. 🟡 Momento da verificação de compatibilidade: primeira etapa ou apenas na distribuição (seção 4).
4. 🟡 Destino da transcrição em nuvem e do resumo ou tradução, cuja decisão o usuário adiou (seção 5).
5. 🟡 Caminho até o Whisper: aplicativo auxiliar, Whisper no navegador ou ambos (seção 6, premissa 2).
6. 🟡 Linguagens e ferramentas de desenvolvimento (seção 6).
7. 🟡 Prazo de entrega e marco inicial do horizonte de três meses (seção 6).
8. 🟡 Exigências regulatórias e aplicação da LGPD na distribuição (seção 6).
9. 🟡 Orçamento (seção 6).
10. 🟡 Destino das transcrições: se ficam guardadas, e onde, ou se desaparecem ao fechar a janela (seções 6 e 9).
11. 🟡 Origem e forma de obtenção dos pesos do modelo Whisper (seção 7).
12. 🟡 Validação das portas candidatas da arquitetura hexagonal (seção 6).
13. 🟡 Validação das estimativas de impacto e probabilidade dos riscos (seção 8).

---

Gerado por reversa-drafter em 2026-09-30T14:14:23-03:00
Fontes: ideation.md, personas.md
