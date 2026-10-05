# Onboarding: testar o motor de transcrição no navegador

> Identificador: `007-motor-whisper-navegador`
> Data: `2026-10-04`
> Para quem: a pessoa que vai testar a feature pela primeira vez, no Mac do autor e no notebook Windows de referência
> Cenários de referência: `requirements.md`, seção 7 (17 cenários)

Os passos 1 a 3 valem uma vez; os passos 4 a 9 conferem os cenários e podem ser repetidos em qualquer ordem depois do passo 4. Áudios de pacientes podem ser usados no Mac do autor, porque tudo roda localmente, mas nunca em prints, vídeos ou no notebook de terceiros.

## 1. Teste da premissa (Fase 0)

Feito antes de qualquer código do produto; o resultado decide o modelo padrão.

1. Reúna em `amostras/reais/` (pasta fora do controle de versão) dez mensagens de voz informais em português, de 5 s a 5 min, sem dado de paciente: áudios próprios, de familiares ou de colegas que autorizem, e um áudio em inglês.
2. Gere a referência com o mlx-whisper no Mac, sem gravar o texto:
   ```
   cd auxiliar
   python -m ferramentas.prova_de_conceito ../amostras/reais --mostrar-texto
   ```
3. Abra a bancada da Fase 0 (entregue na primeira ação do `actions.md`) no Mac e no notebook Windows, no Chrome estável atualizado. Confira primeiro a linha "WebGPU no worker do documento offscreen: disponível".
4. Rode cada modelo candidato sobre as amostras e anote, por modelo e por máquina: segundos de processamento por minuto de áudio com o modelo carregado, tempo de carga, tempo de conferência de integridade, memória de GPU depois de cada áudio e, comparando com a referência, os erros que mudam o sentido.
5. No notebook Windows, desligue a aceleração gráfica (`chrome://settings/system`, "Usar aceleração gráfica quando disponível", reiniciar o Chrome) e repita com o modelo de reserva em WASM.
6. Registre tudo em `_reversa_forward/007-motor-whisper-navegador/premissa.md`, com a escolha do modelo padrão, o veredito do modo sem aceleração e os limites de memória e de espaço.

## 2. Preparar o ambiente

1. Pré-requisitos: Node 24 ou superior, Chrome estável 127 ou superior, e um perfil do Chrome só para o teste. O build local e a versão da loja têm o mesmo ID e não convivem no mesmo perfil.
2. Gere a extensão:
   ```
   cd extension
   npm ci
   npm run build
   ```
3. Em `chrome://extensions`, ative o modo do desenvolvedor, clique em "Carregar sem compactação" e escolha a pasta `extension/`. Confira se o ID exibido é o mesmo do item na loja (D-19).
4. No Mac do autor, reinstale o aplicativo auxiliar para autorizar o ID novo:
   ```
   auxiliar/motor.sh instalar
   ```

## 3. Página de boas-vindas (cenários "Colega com Windows instala…" e "Computador incompatível")

1. Ao carregar a extensão, a página de boas-vindas abre numa aba nova com 5 etapas: Privacidade, Compatibilidade, Modelo de fala, Teste e Pronto. Não há etapa de aplicativo.
2. Na etapa de privacidade, confira a menção ao download do modelo, à origem (Hugging Face) e à ausência de envio de áudio e texto. A verificação só começa depois do clique de aceite.
3. Na compatibilidade, o resultado deve ser "compatível" no Mac e no notebook; antes dele, nenhuma requisição de rede aparece no registro (passo 9.1).
4. Para o incompatível, use um computador abaixo de algum requisito, ou um Mac Intel: a página lista cada requisito não atendido, em linguagem simples, e não oferece download.
5. No preparo do modelo, o percentual e o tempo restante avançam; com 50 Mbps, o modelo padrão termina em poucos minutos.
6. No teste, a amostra sintética é transcrita pelo motor no navegador, mesmo no Mac com o auxiliar instalado, e a página avança para "Pronto: abra o WhatsApp Web".
7. Feche a página no meio do download e reabra-a pelo painel ("Concluir a preparação"): ela volta à etapa do modelo e o download continua de onde parou.

## 4. Transcrição no WhatsApp Web (cenários "Autor usa só o motor no navegador…", "Formatos e idioma", "Pedidos em sequência rápida")

1. No Mac, desligue o auxiliar: `pkill -f whispper_motor`, ou desinstale-o com `auxiliar/motor.sh desinstalar`.
2. Abra o WhatsApp Web. O painel da extensão mostra "Preparando o motor…" e, depois, "Pronto", com o motor "no navegador" e o modelo.
3. Clique no ícone de uma mensagem de voz: a janela mostra o texto. Repita com um áudio em inglês e confira o idioma no rodapé da janela.
4. Encaminhe a si mesmo um arquivo MP4/AAC e um MP3 e transcreva os dois.
5. Clique em três ícones em menos de 2 s: as transcrições chegam na ordem dos cliques.
6. O áudio ilegível é difícil de produzir no WhatsApp real; quem o cobre é a bateria de contrato com o motor real (`MOTOR_NAVEGADOR=1 npm test` em `extension/`), que transcreve `amostras/sinteticas/corrompido.ogg` e espera `FALHA_NA_TRANSCRICAO` com "áudio ilegível". A mensagem na janela é a mesma do motor local, já conferida na feature 003.

## 5. Carregamento e permanência do modelo (cenários "Clique durante o carregamento", "Modelo permanece carregado", "Segunda sessão reaproveita o modelo")

1. Feche todas as abas do WhatsApp Web, espere 3 min (o documento offscreen fecha depois de 2 min) e reabra. Clique num ícone logo em seguida: a janela mostra "Preparando o motor…" com o cronômetro correndo e, em seguida, a transcrição.
2. Transcreva um segundo áudio e exporte o registro pelo painel: a linha do segundo pedido tem `carregamento_ms` igual a 0.
3. Feche o Chrome por completo, reabra e transcreva: no registro de rede do documento offscreen (passo 9.1), nenhum pedido a `huggingface.co` ou `cdn.hf.co`.

## 6. Rede (cenários "Transcrição sem rede", "Nenhum dado do usuário sai da máquina", "Download interrompido")

1. Com o modelo baixado, desligue o Wi-Fi e transcreva: a transcrição é concluída.
2. Com o registro de rede aberto no service worker e no documento offscreen, faça 10 transcrições: nenhuma requisição aparece.
3. Para o download interrompido, remova o modelo (passo 7.3), volte à etapa do modelo e desligue o Wi-Fi perto de 50%. A página informa a falha em linguagem simples e, depois de 3 retomadas automáticas, oferece "Tentar de novo". Religue o Wi-Fi e clique: o percentual continua do ponto em que parou, sem voltar a zero.

## 7. Integridade (cenário "Modelo corrompido")

1. Em `chrome://extensions`, na extensão, clique em "Inspecionar visualizações: dist/offscreen/index.html". Se o documento não estiver aberto, abra o WhatsApp Web antes.
2. No console desse documento, adultere 16 bytes do maior arquivo de pesos (troque `<id>` pelo id do modelo padrão em `premissa.md`):
   ```js
   const raiz = await navigator.storage.getDirectory();
   let pasta = await (await raiz.getDirectoryHandle('modelos')).getDirectoryHandle('<id>');
   pasta = await pasta.getDirectoryHandle('onnx');
   let maior = null;
   for await (const [nome, h] of pasta.entries()) {
     if (h.kind === 'file' && !nome.endsWith('.parcial')) {
       const f = await h.getFile();
       if (!maior || f.size > maior.tamanho) maior = { h, tamanho: f.size };
     }
   }
   const w = await maior.h.createWritable({ keepExistingData: true });
   await w.write({ type: 'write', position: 1024, data: new Uint8Array(16).fill(7) });
   await w.close();
   ```
3. Feche todas as abas do WhatsApp Web, espere o documento offscreen fechar e reabra. A carga recusa o arquivo: o painel indica o modelo para baixar de novo, nenhuma transcrição acontece com ele, e a página de boas-vindas, aberta pelo painel, recomeça o download desse arquivo.
4. Para remover o modelo por inteiro, no mesmo console: `await raiz.removeEntry('modelos', { recursive: true })`.

## 8. Auxiliar, tempo-limite e aceleração (cenários "Mac com o aplicativo auxiliar pronto e depois desligado", "Pedido que excede o tempo-limite", "Computador sem aceleração gráfica")

1. No Mac, com o auxiliar instalado, abra o WhatsApp Web: o painel mostra "Pronto" com o motor "local". Transcreva um áudio.
2. Encerre o auxiliar à força (`pkill -9 -f whispper_motor`) e transcreva outro: o pedido é atendido pelo motor no navegador, sem nenhuma ação, e o painel passa a mostrar "no navegador".
3. Para o tempo-limite, abra o DevTools do documento offscreen, vá a Sources e pause o worker durante a transcrição de um áudio curto. Depois de 60 s, a janela mostra o tempo esgotado. Sem retomar a execução, clique em outro áudio: em até 10 s o documento encerra o worker pausado e cria outro, e o áudio é transcrito sem reabrir a aba, depois de "Preparando o motor…".
4. No notebook Windows, desligue a aceleração gráfica (`chrome://settings/system`) e reinicie o Chrome; `chrome://gpu` mostra o WebGPU desativado. Abra a página de boas-vindas pelo painel ("Verificar compatibilidade"): antes de qualquer download, ela segue no modo sem aceleração ou declara a incompatibilidade, conforme o veredito de `premissa.md`.

## 9. Ferramentas de conferência

1. **Registro de rede.** Em `chrome://extensions`, "Inspecionar visualizações" do service worker e do documento offscreen, aba Network, com "Preserve log". As requisições do worker aparecem no DevTools do documento offscreen. As únicas aceitas são as de `huggingface.co` e `*.cdn.hf.co`, só durante o preparo do modelo.
2. **Armazenamento.** No DevTools do documento offscreen, aba Application: em "Storage", o OPFS contém só `/modelos/`; em "Extension storage", só as chaves `whispper_*` previstas em `data-delta.md`. Depois de 10 transcrições e de fechar a aba, nenhum áudio nem texto (cenário RF-11).
3. **Registro de desempenho.** Painel da extensão, "Exportar registro": CSV com instante, duração, processamento, carregamento, modelo, origem e resultado, sem nenhuma palavra transcrita.
4. **Responsividade da página.** Na aba do WhatsApp Web, DevTools, aba Performance: com as métricas ao vivo abertas, transcreva um áudio de 5 min e, enquanto isso, role a conversa e digite. O INP deve ficar em até 200 ms.

## 10. Loja e piloto

1. No notebook Windows, num perfil que nunca teve a extensão, abra o link não listado da loja, instale e siga a página de boas-vindas sem ajuda (cenário "Colega com Windows…").
2. Confira o aviso de instalação: "Ler e alterar seus dados em web.whatsapp.com" e "Comunicar-se com aplicativos nativos de colaboração". Se aparecer "Ler seu histórico de navegação", a permissão `tabs` não foi retirada (D-18).
3. Durante a semana sem o auxiliar, o autor anota, por dia, quantos áudios leu e em quantos precisou ouvir o original; a meta é ≥ 95% compreendidos.
