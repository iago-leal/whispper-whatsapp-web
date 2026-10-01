# Cápsula de reprodução · BUG-20261001-MAC1

| Campo | Valor |
|---|---|
| Commit base | `eab48ad` (branch `main`), com a alteração não commitada do BUG-20261001-404B em `extension/src/onboarding/onboarding.ts` |
| Ambiente | Apple M1, macOS 27.0.1, Chrome com a extensão carregada sem empacotamento (ID `femjlfnijaboogbcdionddnjcjpfmieg`), Node 24.13.0, Python 3.14.7 (python.org) |
| Classificação | `deterministic` |
| Taxa | 4/4 downloads produziram o mesmo arquivo inválido; 1/1 instalação do pacote alternativo falhou em silêncio |

## Defeito A: o "instalador" baixado é a própria página

No commit base, `configurarDownload` grava `href = "#download-whispper-macos-apple-silicon.pkg"` e
`download = "whispper-macos-apple-silicon.pkg"`. Um link para fragmento da própria página, com o
atributo `download`, faz o Chrome salvar o documento atual com o nome pedido.

Comando:

```bash
shasum -a 256 ~/Downloads/whispper-macos-apple-silicon*.pkg extension/onboarding/index.html
file ~/Downloads/whispper-macos-apple-silicon.pkg
```

Saída (íntegra em `pkg-baixado-e-html.txt`): os quatro `.pkg` e `extension/onboarding/index.html`
têm o mesmo SHA-256 `69248b35…edd3`; `file` responde `HTML document text`; a origem gravada pelo
macOS é `chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/`. Exit code 0.

Consequência: o Gatekeeper bloqueia o arquivo em quarentena sem assinatura e, depois de "Abrir Mesmo
Assim", o Instalador não lê um HTML como pacote xar: `com.apple.installer.pagecontroller erro -1`.

## Defeito B: o pacote gerado por `auxiliar/ferramentas/gerar_pkg.sh` (não commitado) falha em silêncio

O usuário abriu, às 10:53, o pacote de 19 MB gerado na raiz do repositório. Trecho de
`/var/log/install.log` (íntegra em `install-log-20261001-1053.txt`):

```text
./postinstall: motor.sh: não foi possível ler a key de /Users/iagoleal/extension/manifest.json: [Errno 2] No such file or directory
PackageKit: Writing receipt for com.whispper.motor.pkg to /Users/iagoleal
Installed "Whispper Motor" ()
```

O Instalador declarou sucesso, e `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
continua sem `whispper_whatsapp_web.motor.json`: a página de boas-vindas nunca avançaria.

## Prova de viabilidade (protótipo descartável no scratchpad)

Pacote sem payload, com domínio só `CurrentUserHomeDirectory`, instalado por
`installer -pkg final.pkg -target CurrentUserHomeDirectory` sem `sudo`: o `postinstall` rodou com
`uid=501`, `HOME=/Users/iagoleal`, `$2=/Users/iagoleal`, a partir de
`/tmp/PKInstallSandbox.*/Scripts/<identificador>.*/`, com os arquivos embarcados na pasta de scripts
disponíveis. Pacote sem payload não deixa recibo.
