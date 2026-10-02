"""Views do /reversa-debugger-graph: valida tudo, regenera um contexto e o espelho.

Uso, a partir de qualquer pasta:
    /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 \\
        .reversa/ferramentas/gerar_views.py <raiz-do-projeto> <contexto> [AAAA-MM-DDTHH:MMZ]

Precisa do PyYAML, que o Python do python.org tem e o do Homebrew não. Sem o terceiro argumento,
carimba com a hora UTC atual. Os bug.md são só lidos: inconsistência de invariante sai como ERRO e
interrompe a geração, sem consertar nada.

Versão de 2026-10-02 19:42, a que gerou as views do HVT4, do OW7G e do XDL5; antes vivia em
scratchpads de sessão, em duas linhagens divergentes.
"""
import datetime, glob, html, json, os, re, sys
from collections import Counter, defaultdict
import yaml

RAIZ, CTX = sys.argv[1], sys.argv[2]
AGORA = sys.argv[3] if len(sys.argv) > 3 else datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
os.chdir(RAIZ)


def ler(p):
    texto = open(p).read()
    fm = yaml.safe_load(texto.split('---')[1])
    fm = json.loads(json.dumps(fm, default=str))
    fm['path'] = p
    return fm


bugs = [ler(p) for p in sorted(glob.glob('_reversa_bugs/*/bugs/*/bug.md'))]
por_id = {b['id']: b for b in bugs}
ctx_de = {b['id']: b['path'].split('/')[1] for b in bugs}
pasta = {b['id']: os.path.dirname(b['path']) for b in bugs}

# Etapa 1: invariantes globais
erros = []
for i, n in Counter(b['id'] for b in bugs).items():
    if n > 1: erros.append((i, 'id', f'duplicado {n} vezes'))
for b in bugs:
    i, tr = b['id'], b.get('traceability') or {}
    trava = os.path.exists(os.path.join(pasta[i], 'DONE.md'))
    fechado = b['status'] == 'resolved' and (b.get('closure') or {}).get('satisfied') is True
    if b.get('schema_version') != 1: erros.append((i, 'schema_version', 'desconhecida'))
    if b['status'] == 'resolved' and not (b.get('resolution_kind') and (b.get('closure') or {}).get('satisfied') is True):
        erros.append((i, 'status', 'resolved sem resolution_kind ou closure.satisfied'))
    if b.get('resolution_kind') == 'fixed':
        if (tr.get('root_cause') or {}).get('state') != 'confirmed': erros.append((i, 'root_cause', 'fixed sem causa confirmed'))
        if not tr.get('regression_tests'): erros.append((i, 'regression_tests', 'fixed sem regressão'))
        if not b.get('spec_verdict'): erros.append((i, 'spec_verdict', 'fixed sem veredito'))
    for r in b.get('relationships') or []:
        if r['bug'] not in por_id: erros.append((i, 'relationships', f'{r["bug"]} inexistente'))
        if r['bug'] == i: erros.append((i, 'relationships', 'autorrelação'))
    if trava and b['status'] != 'resolved': erros.append((i, 'DONE.md', 'trava sem fechamento'))
    if fechado and not trava: erros.append((i, 'DONE.md', 'fechamento sem trava'))
dup = {b['id']: r['bug'] for b in bugs for r in b.get('relationships') or [] if r['type'] == 'duplicate-of' and r['state'] != 'rejected'}
for inicio in dup:
    visto, x = set(), inicio
    while x in dup:
        if x in visto: erros.append((inicio, 'relationships', 'ciclo de duplicate-of')); break
        visto.add(x); x = dup[x]
if erros:
    for e in erros: print('ERRO', *e)
    sys.exit(1)

cab = f'<!-- GENERATED, DO NOT EDIT: regenerado por /reversa-debugger-graph em {AGORA} a partir de {{n}} bugs -->'
visiveis = [b for b in bugs if b.get('visibility') != 'restricted']
doctx = sorted((b for b in bugs if ctx_de[b['id']] == CTX), key=lambda b: b['display_number'])
ctxvis = [b for b in doctx if b.get('visibility') != 'restricted']
N = len(doctx)
gen = f'_reversa_bugs/{CTX}/generated'
aberto = lambda b: b['status'] != 'resolved'
amf = lambda b: f"{b['area']}/{b['module']}/{b['feature']}"
suf = lambda i: i.rsplit('-', 1)[1]
rotulo = lambda i: i if ctx_de[i] == CTX else f'{i} ({ctx_de[i]})'


def estado(b):
    if b['status'] == 'resolved': return f"resolved · {b['resolution_kind']}"
    return f"{b['status']} ({b['phase']})" if b.get('phase') else b['status']


def adendo(b):
    a = (b.get('spec_verdict_decision') or {}).get('addendum') or (b.get('spec_addendum') or {}).get('path')
    if a: return a
    for c in b.get('change_set') or []:
        for art in [c.get('artifact')] + (c.get('artifacts') or []):
            if c.get('kind') == 'specification' and art and '_reversa_sdd/addenda/' in art: return art
    return None


def gravar(caminho, conteudo):
    tmp = caminho + '.tmp'
    open(tmp, 'w').write(conteudo)
    os.replace(tmp, caminho)


arestas = [(b['id'], r['type'], r['bug'], r['state'], bool(r.get('evidence'))) for b in ctxvis for r in b.get('relationships') or []]
fortes = [a for a in arestas if a[3] in ('supported', 'confirmed')]

# catalog.jsonl
gravar(f'{gen}/catalog.jsonl', ''.join(json.dumps(b, ensure_ascii=False) + '\n' for b in doctx))

# index.md
st, ph = Counter(b['status'] for b in doctx), Counter(str(b.get('phase')).replace('None', 'null') for b in doctx)
L = [cab.format(n=N), '', f'# Índice de bugs · {CTX}', '', '## Resumo', '', '| status | bugs |', '|---|---|']
L += [f'| {k} | {v} |' for k, v in sorted(st.items())]
L += ['', '| phase | bugs |', '|---|---|'] + [f'| {k} | {v} |' for k, v in sorted(ph.items())]
L += ['', '## Abertos / ativos', '']
abertos = [b for b in ctxvis if aberto(b)]
if abertos:
    L += ['| # | ID | prioridade | severidade | area/module/feature | título | caminho | is_blocked |', '|---|---|---|---|---|---|---|---|']
    L += [f"| {b['display_number']} | {b['id']} | {b['priority']} | {b['severity']} | {amf(b)} | {b['title']} | `{b['path']}` | {'sim' if b.get('blocking') else 'não'} |" for b in abertos]
else:
    L += ['Nenhum bug aberto ou ativo neste contexto.']
res = [b for b in ctxvis if not aberto(b)]
L += ['', '## Resolvidos', ''] + [f'- {k}: {v}' for k, v in sorted(Counter(b['resolution_kind'] for b in res).items())]
L += [f"- #{b['display_number']} {b['id']} ({b['resolution_kind']}): {b['title']}" for b in res]
restritos = [b for b in doctx if b.get('visibility') == 'restricted']
if restritos: L += ['', '## Restritos', ''] + [f"- {b['id']}: restrito" for b in restritos]
gravar(f'{gen}/index.md', '\n'.join(L) + '\n')

# matrix.md
L = [cab.format(n=N), '', f'# Matriz de relações · {CTX}', '', '| origem | tipo | destino | state | evidência |', '|---|---|---|---|---|']
L += [f"| {o} | {t} | {rotulo(d)} | {s} | {'sim' if e else 'não'} |" for o, t, d, s, e in arestas]
gravar(f'{gen}/matrix.md', '\n'.join(L) + '\n')

# graph.md
mid = lambda i: i.replace('-', '_')
L = [cab.format(n=N), '', f'# Grafo · {CTX}', '', '```mermaid', 'graph LR']
L += [f'  {mid(b["id"])}["#{b["display_number"]} {b["id"]}"]' for b in ctxvis]
L += [f"  {mid(o)} {'-.-' if s == 'proposed' else '---'}|{t}| {mid(d)}" for o, t, d, s, e in arestas if s != 'rejected']
L += ['```', '', 'Arestas tracejadas são relações `proposed` (hipótese); as `rejected` ficam só na matriz, como histórico.', '',
      '## Impact score (heurística de triagem, não substitui priority/severity)', '',
      'Só arestas `supported`/`confirmed` contam; relações `proposed` ficam fora.', '']


def impacto(i):
    pesos = {'causes': 3, 'blocks': 2, 'regression-of': 4}
    soma, rel = 0, 0
    for o, t, d, s, e in [a for a in fortes] + [(b['id'], r['type'], r['bug'], r['state'], 0) for b in visiveis if ctx_de[b['id']] != CTX for r in b.get('relationships') or [] if r['state'] in ('supported', 'confirmed')]:
        if t == 'related-to' and i in (o, d): rel += 1
        elif t == 'caused-by' and d == i: soma += 3
        elif t == 'blocked-by' and d == i: soma += 2
        elif t == 'regression-of' and d == i: soma += 4
        elif o == i and t in pesos: soma += pesos[t]
    return soma + min(rel, 3)


if abertos:
    L += ['| bug | impact score |', '|---|---|'] + [f"| {b['id']} | {impacto(b['id'])} |" for b in sorted(abertos, key=lambda b: -impacto(b['id']))]
else:
    L += ['Nenhum bug aberto neste contexto.']
arq = defaultdict(list)
for b in ctxvis:
    for f in (b.get('traceability') or {}).get('affected_code') or []: arq[os.path.basename(f)].append(b['id'])
nucleo = sorted((f for f, ids in arq.items() if len(ids) >= 3), key=lambda f: -len(arq[f]))
cluster = ''
if nucleo:
    ids = sorted({i for f in nucleo for i in arq[f]}, key=lambda i: por_id[i]['display_number'])
    cluster = (f"{len(ids)} bugs ({', '.join(ids)}) convergem em " + ', '.join(f'`{f}` ({len(arq[f])})' for f in nucleo) +
               ('' if abertos else ': todos resolvidos e travados; um defeito novo nesses arquivos deve verificar primeiro `regression-of` contra eles.'))
L += ['', '## Clusters', '', f'- {cluster}' if cluster else '- Nenhum cluster.']
gravar(f'{gen}/graph.md', '\n'.join(L) + '\n')

# spec-matrix.md
linhas = defaultdict(lambda: {'open': [], 'active': [], 'resolved': []})
col = lambda b: 'resolved' if b['status'] == 'resolved' else ('active' if b['status'] == 'active' else 'open')
for b in ctxvis:
    for s in (b.get('traceability') or {}).get('specs') or []: linhas[s][col(b)].append(b['id'])
L = [cab.format(n=N), '', f'# Matriz BUG ↔ SPEC · {CTX}', '', '| seção da spec | open | active | resolved |', '|---|---|---|---|']
L += [f"| `{s}` | {', '.join(c['open'])} | {', '.join(c['active'])} | {', '.join(c['resolved'])} |" for s, c in sorted(linhas.items())]
gap = {'open': [], 'active': [], 'resolved': []}
for b in ctxvis:
    if b.get('spec_verdict') == 'spec-gap': gap[col(b)].append(b['id'])
L += [f"| spec-gap (comportamento não especificado até o adendo) | {', '.join(gap['open'])} | {', '.join(gap['active'])} | {', '.join(gap['resolved'])} |"]
ads = [(adendo(b), b['id']) for b in ctxvis if adendo(b)]
L += ['', 'Adendos de bug vigentes em `_reversa_sdd/addenda/`: ' + ('; '.join(f'`{os.path.basename(a)}` ({i})' for a, i in ads) if ads else 'nenhum') + '.']
gravar(f'{gen}/spec-matrix.md', '\n'.join(L) + '\n')

# graph.html
E = html.escape
pos = {b['id']: k for k, b in enumerate(ctxvis)}
X = lambda k: 20 + 300 * k
svg = []
for o, t, d, s, e in arestas:
    if s == 'rejected' or d not in pos: continue
    a, z = pos[o], pos[d]
    tr = ' stroke-dasharray="6 4"' if s == 'proposed' else ''
    if abs(a - z) == 1:
        x1, x2 = (X(a), X(z) + 260) if z < a else (X(a) + 260, X(z))
        svg += [f'<line x1="{x1}" y1="66.0" x2="{x2}" y2="66.0" stroke="#9e9e9e" stroke-width="1.5"{tr}/>',
                f'<text x="{(x1 + x2) / 2}" y="60.0" fill="#9e9e9e" font-size="11" text-anchor="middle">{t} ({s})</text>']
    else:
        ca, cz = X(a) + 130, X(z) + 130
        svg += [f'<path d="M{ca},112 C{ca},190 {cz},190 {cz},112" fill="none" stroke="#9e9e9e" stroke-width="1.5"{tr}/>',
                f'<text x="{(ca + cz) / 2}" y="186" fill="#9e9e9e" font-size="11" text-anchor="middle">{t} ({s})</text>']
cor_sev = lambda b: '#cf6679' if b['severity'] in ('high', 'critical') else ('#ffb74d' if b['severity'] == 'medium' else '#555')
cor_st = lambda b: '#81c784' if b['status'] == 'resolved' else ('#ffd54f' if b['status'] in ('active', 'awaiting-human') else '#ef5350')
curto = lambda t: t if len(t) <= 39 else t[:38] + '…'
rel = lambda b: '../' + os.path.relpath(b['path'], f'_reversa_bugs/{CTX}')
for b in ctxvis:
    x = X(pos[b['id']])
    svg.append(f'<a href="{rel(b)}"><rect x="{x}" y="20" width="260" height="92" rx="8" fill="#1e1e1e" stroke="{cor_sev(b)}" stroke-width="2"/>'
               f'<text x="{x + 10}" y="42" fill="#bb86fc" font-size="13" font-weight="bold">#{b["display_number"]} · {suf(b["id"])}</text>'
               f'<text x="{x + 10}" y="62" fill="#e0e0e0" font-size="12">{E(curto(b["title"]))}</text>'
               f'<text x="{x + 10}" y="80" fill="#9e9e9e" font-size="11">{b["severity"]} · {b["priority"]} · {b["area"]}</text>'
               f'<text x="{x + 10}" y="99" fill="{cor_st(b)}" font-size="11">{estado(b)}</text></a>')
W = 20 + 300 * len(ctxvis)
grau = Counter(x for o, t, d, s, e in arestas if s != 'rejected' for x in (o, d))
centro = grau.most_common(1)[0] if grau else None
prosa = (f'Nó central: {centro[0]} ({centro[1]} arestas). ' if centro else '')
prosa += 'Confirmadas: ' + ' '.join(f'{o} {t} {rotulo(d)} ({s}).' for o, t, d, s, e in fortes) if fortes else 'Nenhuma relação confirmada.'
prop = [a for a in arestas if a[3] == 'proposed']
prosa += (' Hipóteses (proposed, tracejadas): ' + ' '.join(f'{o} {t} {rotulo(d)}.' for o, t, d, s, e in prop)) if prop else ' Nenhuma hipótese pendente.'
if cluster: prosa += ' ' + cluster
travados = [b for b in ctxvis if os.path.exists(os.path.join(pasta[b['id']], 'DONE.md'))]
fixed = sum(1 for b in doctx if b['status'] == 'resolved' and b['resolution_kind'] == 'fixed')
cards = [(N, 'Total'), (fixed, 'resolved · fixed'), (sum(map(aberto, doctx)), 'Abertos/ativos'), (len(ads), 'Adendos de spec'), (0, 'Inconsistências')]
H = ['<!DOCTYPE html>', '<html lang="pt-br">', '<head>', '  <meta charset="UTF-8">',
     '  <meta name="viewport" content="width=device-width, initial-scale=1.0">', f'  <title>Grafo de Bugs · {CTX}</title>', '  <style>',
     'body { background-color: #121212; color: #e0e0e0; font-family: sans-serif; padding: 20px; }',
     'a { color: #bb86fc; text-decoration: none; } a:hover { text-decoration: underline; }',
     'table { border-collapse: collapse; width: 100%; margin-top: 12px; }',
     'th, td { border: 1px solid #333; padding: 8px 10px; text-align: left; vertical-align: top; }',
     'th { background-color: #1e1e1e; }',
     '.card { background-color: #1e1e1e; padding: 12px 16px; border-radius: 8px; margin: 0 12px 12px 0; display: inline-block; min-width: 120px; }',
     '.card b { display: block; font-size: 1.6em; }', '.meta { color: #9e9e9e; font-size: 0.9em; }',
     'svg { background: #181818; border-radius: 8px; max-width: 100%; }', '  </style>', '</head>', '<body>',
     '  ' + cab.format(n=N), f'  <h1>Grafo de Bugs · {CTX}</h1>',
     f'  <p class="meta">Gerado por /reversa-debugger-graph em {AGORA} · {N} bugs · 0 inconsistências · arestas tracejadas = relação proposed (hipótese)</p>',
     '  <div>' + ''.join(f'<div class="card"><b>{v}</b>{k}</div>' for v, k in cards) + '</div>',
     f'  <svg viewBox="0 0 {W} 210" width="{W}" height="210" role="img" aria-label="Grafo de bugs">',
     '<defs><marker id="seta" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#9e9e9e"/></marker></defs>']
H += svg + ['</svg>', f'  <p>{E(prosa, quote=False)}</p>', '  ', '  <h2>Bugs abertos / ativos</h2>']
if abertos:
    H += ['  <table><thead><tr><th>#</th><th>ID</th><th>Severidade</th><th>Prioridade</th><th>Título</th><th>Área/Módulo/Feature</th><th>Status</th></tr></thead>', '  <tbody>']
    H += [f'<tr><td>{b["display_number"]}</td><td><a href="{rel(b)}">{b["id"]}</a></td><td>{b["severity"]}</td><td>{b["priority"]}</td><td>{E(b["title"])}</td><td>{amf(b)}</td><td>{estado(b)}</td></tr>' for b in abertos]
    H += ['  </tbody></table>']
else:
    H += ['  <p class="meta">Nenhum bug aberto ou ativo neste contexto.</p>']
H += ['  <h2>Concluídos (travados)</h2>',
      '  <table><thead><tr><th>#</th><th>ID</th><th>Título</th><th>Fechado em</th><th>resolution_kind</th></tr></thead>', '  <tbody>']
H += [f'<tr><td>{b["display_number"]}</td><td><a href="{rel(b)}">{b["id"]}</a></td><td>{E(b["title"])}</td><td>{b["updated"]}</td><td>{b["resolution_kind"]}</td></tr>' for b in travados]
H += ['  </tbody></table>', '</body>', '</html>']
gravar(f'{gen}/graph.html', '\n'.join(H) + '\n')

# Etapa 3: espelho _reversa_sdd/traceability/bugs.md
esp = defaultdict(list)
for b in sorted(visiveis, key=lambda b: (b['created'], b['display_number'])):
    for s in sorted({s.split('#')[0] for s in (b.get('traceability') or {}).get('specs') or []}):
        esp[s].append(b)
st2 = lambda b: f"{b['status']}/{b['resolution_kind']}" if b['status'] == 'resolved' else b['status']
L = [cab.format(n=len(visiveis)), '', '# Bugs por artefato de spec', '',
     'Espelho gerado a partir de `_reversa_bugs/`; o vínculo é registrado aqui, a mudança de spec vai em adendos.']
for s in sorted(esp):
    L += ['', f'## `{s}`', '']
    for b in sorted(esp[s], key=lambda b: b['display_number']):
        a = adendo(b)
        L.append(f"- {b['id']} ({st2(b)}, {b['priority']}): {b['title']} · `{pasta[b['id']]}/`" + (f' · adendo `{a}`' if a else ''))
os.makedirs('_reversa_sdd/traceability', exist_ok=True)
gravar('_reversa_sdd/traceability/bugs.md', '\n'.join(L) + '\n')
print('ok', len(bugs), 'bugs;', N, 'em', CTX, '; erros', len(erros))
