# CHG-005 (data-repair): dry-run da varredura

| Campo | Valor |
|---|---|
| Data | 2026-10-02, cerca de 20:14 -03, antes da aprovação do Gate 2 |
| Onde | WhatsApp Web real, aba própria do grupo da automação (mesmo perfil do Chrome do usuário, logo o mesmo Cache Storage) |
| Script | `fix/CHG-005-reparo-cache-vazio.js`, `MODO = 'dry-run'` (só leitura: `caches.keys`, `match`, `arrayBuffer().byteLength`, `LruMediaStore.has`) |
| Extensão carregada | build anterior à correção (a varredura só executa depois de a extensão corrigida estar carregada) |

| Medida | Valor |
|---|---|
| Entradas no `lru-media-array-buffer-cache` | 284 (283 na reprodução; a página cacheou mais uma mídia no intervalo) |
| Entradas de 0 bytes | **31** |
| Reconhecidas pelo `LruMediaStore` (`has(filehash)`) | 31 |
| Chave sem `filehash` legível | 0 |
| Impressão digital das chaves vazias (SHA-256 da lista ordenada, 16 primeiros dígitos) | `4b74ec2ee1d28360` |
| Apagadas | 0 (dry-run) |

O dry-run rodou duas vezes, com o mesmo resultado. A primeira versão do script tentava devolver as chaves em
hexadecimal para um backup fora do git; a ferramenta da automação bloqueou a saída (filtro de hashes), e o script
passou a devolver só a contagem e a impressão digital, sem contornar o filtro.

**Backup:** o conteúdo de cada entrada é, por definição, 0 bytes; a contagem e a impressão digital identificam o
conjunto apagado. **Rollback:** não há dado a restaurar; a mídia íntegra segue no servidor do WhatsApp e a página a
baixa de novo no próximo acesso.

**Mecanismo de exclusão:** lido no bundle da página, `LruMediaStore.del` → `SizeLruObjectStore` chama o `dispose` do
`LruMediaStore`, que apaga o buffer no Cache Storage (`_bufferStore.del`), e depois os metadados no IndexedDB. A
execução confere isso: `apagadasDireto` deve sair 0 e `vaziasDepois`, 0; se o `del` deixar alguma entrada, o script
a apaga direto no Cache Storage e a conta à parte, e a cura do CHG-002 terá de ser revista.
