#!/usr/bin/env python3
"""PreToolUse (Bash): impede que dados pessoais entrem no git.

Protegidos: as mensagens de voz reais (amostras/reais/) e as mídias do registro de bugs
(_reversa_bugs/**/*.png|mov|tsv), que mostram conversas reais. O .gitignore os mantém fora;
este gate cobre o que ele não cobre:

- `git add -f` (ou `git stage -f`) sobre esses caminhos ou com pathspec amplo (., *, -A, :/);
- `git commit` e `git push` quando o índice já contém algum desses arquivos.

Saída 2 bloqueia o comando e explica o motivo ao Claude.
"""
import json
import os
import re
import shlex
import subprocess
import sys

PROTEGIDO = re.compile(r"^(amostras/reais/|_reversa_bugs/.*\.(png|mov|tsv)$)", re.IGNORECASE)
AREAS = ("amostras", "_reversa_bugs")
AMPLOS = {".", "*", ":/", ":", "-A", "--all"}
SEPARADORES = {"&&", "||", ";", "|", "&", "(", ")"}


def bloquear(motivo):
    print(f"Bloqueado pela barreira de dados pessoais (LGPD): {motivo}", file=sys.stderr)
    sys.exit(2)


def segmentos(comando):
    lexer = shlex.shlex(comando, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    atual = []
    for ficha in lexer:
        if ficha in SEPARADORES:
            if atual:
                yield atual
            atual = []
        else:
            atual.append(ficha)
    if atual:
        yield atual


def chamada_git(fichas):
    """Devolve (diretório de -C, subcomando, argumentos) ou None se não for git."""
    while fichas and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", fichas[0]):
        fichas = fichas[1:]
    if not fichas or os.path.basename(fichas[0]) != "git":
        return None
    i, diretorio = 1, None
    while i < len(fichas) and fichas[i].startswith("-"):
        if fichas[i] == "-C" and i + 1 < len(fichas):
            diretorio = fichas[i + 1]
            i += 2
        elif fichas[i] == "-c" and i + 1 < len(fichas):
            i += 2
        else:
            i += 1
    if i >= len(fichas):
        return None
    return diretorio, fichas[i], fichas[i + 1:]


def forcado(args):
    return any(a == "--force" or re.match(r"^-[A-Za-z]*f[A-Za-z]*$", a) for a in args)


def relativo(caminho, cwd, raiz):
    absoluto = os.path.normpath(os.path.join(cwd, caminho))
    return os.path.relpath(absoluto, raiz)


def main():
    entrada = json.load(sys.stdin)
    comando = (entrada.get("tool_input") or {}).get("command") or ""
    if "git" not in comando:
        return
    raiz = os.environ.get("CLAUDE_PROJECT_DIR") or entrada.get("cwd") or os.getcwd()
    cwd = entrada.get("cwd") or raiz
    try:
        lista = list(segmentos(comando))
    except ValueError:
        return  # aspas desbalanceadas: o próprio shell recusará

    for fichas in lista:
        git = chamada_git(fichas)
        if not git:
            continue
        diretorio, sub, args = git
        base = os.path.normpath(os.path.join(cwd, diretorio)) if diretorio else cwd

        if sub in ("add", "stage") and forcado(args):
            if any(a in AMPLOS or re.match(r"^-[A-Za-z]*A[A-Za-z]*$", a) for a in args):
                bloquear("`git add` forçado com pathspec amplo traria amostras/reais/ e as mídias de "
                         "_reversa_bugs/. Arquivos não ignorados não precisam de -f; adicione-os pelo nome.")
            for a in args:
                if a.startswith("-"):
                    continue
                rel = relativo(a, base, raiz)
                if rel in (".", "") or rel.split("/")[0] in AREAS or PROTEGIDO.match(rel):
                    bloquear(f"`git add -f {a}` alcança área com dados pessoais. Sem -f, o .gitignore "
                             "já deixa entrar só o que pode ser versionado.")

        if sub in ("commit", "push"):
            indice = subprocess.run(["git", "-C", base, "ls-files"], capture_output=True, text=True)
            vazados = [f for f in indice.stdout.splitlines() if PROTEGIDO.match(f)]
            if vazados:
                lista_vazados = "\n  ".join(vazados[:10])
                bloquear(f"o índice contém dados pessoais; retire-os com `git rm --cached` antes de "
                         f"`git {sub}`:\n  {lista_vazados}")


if __name__ == "__main__":
    main()
