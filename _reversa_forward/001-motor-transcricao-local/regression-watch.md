# Vigilância de regressão: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Criado em: `2026-09-30`
> Feature greenfield: não há regras 🟢 extraídas de código existente, por isso o watch principal começa vazio. Os requisitos implementados ficam em "Observações", sem peso de regressão, até que uma extração `/reversa` futura sobre o código novo os confirme como 🟢.

## Watch principal

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|

## Observações

Requisitos de `requirements.md` implementados nesta entrega. Os marcados com portão só serão aferidos por inteiro em T025 ou T043.

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W001 | `requirements.md#RF-01` | A porta `MotorDeTranscricao` oferece só `verificar()` e `transcrever(audio, tipoDeMidia)`. | presença | Operação a mais ou a menos na porta, ou núcleo falando com o Native Messaging sem a porta. |
| W002 | `requirements.md#RF-02` | O idioma é detectado automaticamente por áudio. | presença | Idioma fixo ou exigido em configuração. |
| W003 | `requirements.md#RF-03` | Ogg com Opus é transcrito. Portão T025 para latência com mensagens reais. | presença | Mensagem de voz do WhatsApp recusada ou `ACIMA` do limite. |
| W004 | `requirements.md#RF-04` | MP4 com AAC e MP3 são transcritos. | presença | Falha nesses formatos. |
| W005 | `requirements.md#RF-05` | O modelo fica carregado entre transcrições da mesma conexão. | presença | Linha `carregamento` a cada pedido no `desempenho.tsv`. |
| W006 | `requirements.md#RF-06` | A primeira verificação inicia o carregamento; pedidos durante o carregamento aguardam. | presença | Carregamento só no primeiro pedido, ou pedido recusado durante o carregamento. |
| W007 | `requirements.md#RF-07` | Um pedido por vez, na ordem de chegada. | presença | Respostas fora da ordem de envio ou transcrições simultâneas. |
| W008 | `requirements.md#RF-08` | A verificação devolve protocolo, versão do aplicativo, modelo, estado e motivo. | presença | Campo ausente na resposta `estado`. |
| W009 | `requirements.md#RF-09` | Protocolo divergente gera VERSAO_INCOMPATIVEL com as duas versões. | presença | Pedido de outra versão processado. |
| W010 | `requirements.md#RF-10` | Aplicativo ausente, que não inicia ou que cai gera MOTOR_INDISPONIVEL com instrução. Portão T043. | presença | Promessa pendurada ou erro sem instrução. |
| W011 | `requirements.md#RF-11` | Áudio ilegível, vazio ou com falha do Whisper gera FALHA_NA_TRANSCRICAO e o motor segue pronto. | presença | Motor em erro ou trabalhador recriado por falha de um só áudio. |
| W012 | `requirements.md#RF-12` | Sem acesso à rede, com modelo do cache local. Portão T043. | ausência | Conexão de rede do host ou do trabalhador; `snapshot_download` acionado. |
| W013 | `requirements.md#RF-13` | Nenhuma cópia de áudio ou texto após a resposta; temporários apagados, inclusive após queda. | ausência | Arquivo em `$TMPDIR/whispper-motor-*` depois do pedido, ou texto em registro. |
| W014 | `requirements.md#RF-14` | Só a extensão autorizada conecta; o host confere a origem. Portão T043. | presença | Extensão intrusa conectando, ou `allowed_origins` com curinga. |
| W015 | `requirements.md#RF-15` | Turbo por padrão e modelo configurável no `config.toml`. | presença | Modelo fixo no código. |
| W016 | `requirements.md#RF-16` | Instalar e desinstalar por comando, com verificação de pré-requisitos e sem rede. | presença | Instalação que baixa modelo, ou desinstalação que deixa manifesto ou host vivo. |
| W017 | `requirements.md#RF-17` | Registro local de desempenho, sem conteúdo, limitado a 1 000 linhas. | presença | Texto transcrito, nome de arquivo ou crescimento sem poda. |
| W018 | `requirements.md#RF-18` | Pedido acima de 64 MiB recusado antes do envio. | presença | Mensagem grande enviada ao Chrome. |
| W019 | `requirements.md#RF-19` | Verificação sem resposta em 10 s declara "indisponível" com "sem resposta". | presença | Espera indefinida pelo aplicativo. |
| W020 | `requirements.md#RF-20` | Áudio sem fala devolve texto vazio, não erro nem texto inventado. | presença | Frase inventada ("Thank you.", "Obrigado.") em silêncio ou ruído. |
| W021 | `requirements.md#RF-21` | Mensagem malformada recebe "mensagem inválida" sem encerrar o host. | presença | Host encerrado ou mensagem sem resposta. |
| W022 | `requirements.md#RF-22` | Extensão mínima com identificador fixo hospeda o adaptador. Portão T043. | presença | Identificador que muda entre carregamentos. |
| W023 | `requirements.md#RF-23` | O modelo é descarregado após a ociosidade configurada e recarregado na mensagem seguinte. | presença | Memória do modelo retida sem pedidos, ou `ocioso` exposto no protocolo. |
| W024 | `requirements.md#RF-24` | Transcrição acima do prazo é interrompida, e o trabalhador, recriado. | presença | Pedido travado bloqueando a fila, ou trabalhador órfão após a morte do host. |

## Histórico de re-extrações

<!-- Preenchido pelo agente reverso quando `/reversa` rodar de novo sobre o código desta feature. -->

## Arquivadas

<!-- Itens que deixaram de valer, com a data e o motivo. -->
