"""Genera docs/FUENTES.md (todas las fuentes usadas en /data) y docs/claims.json (afirmaciones para revisión actuarial)."""

import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import HOY, REPO  # noqa: E402

fuentes = {}


def anota(src, fichero, fecha=HOY):
    url = src['url']
    e = fuentes.setdefault(url, {'src': src, 'ficheros': set(), 'fecha': fecha})
    e['ficheros'].add(fichero)


claims = []
huellas = []
SERIES_CLAIM = {'pensionistas', 'pensiones', 'total-ambos', 'jubilacion-ambos', 'media-anual-total-sistema', 'diciembre-total-sistema', 'afiliados-diciembre-por-pensionista', 'afiliados-media-anual-por-pension', 'edad-media-altas-jubilacion'}


def añade(id_, texto, ubic, datos, src, conf):
    claims.append({'id': id_, 'texto': texto, 'ubicacion': ubic, 'datos': datos, 'fuentes': [src], 'fetchedAt': HOY,
                   'estado': 'verificada' if conf == 'alta' else 'pendiente', 'revisionActuarial': 'pendiente'})


def num(v):
    return str(v).replace('.', ',')


for ruta in sorted(glob.glob(f'{REPO}/data/*/*.json')):
    rel = os.path.relpath(ruta, f'{REPO}/data')
    with open(ruta, encoding='utf-8') as f:
        d = json.load(f)
    for x in d.get('data', []):
        anota(x['source'], rel, x.get('fetchedAt', HOY))
        if x.get('crossCheck'):
            anota(x['crossCheck']['source'], rel)
    for s in d.get('series', []):
        anota(s['source'], rel)
    if d.get('tipo') == 'tabla':
        anota(d['source'], rel, d.get('fetchedAt', HOY))
        for o in d.get('origenes', []):
            anota({'title': f"{d['source']['title']} (fichero del periodo {o['period']})", 'publisher': d['source']['publisher'], 'url': o['url']}, rel, d.get('fetchedAt', HOY))
            huellas.append((d['id'], o['period'], o['url'], o['sha256']))
    for n in d.get('normas', []):
        anota(n['source'], rel)
    for p in d.get('prestaciones', []):
        anota(p['source'], rel)
        for a in p.get('fuentesAdicionales', []):
            anota(a, rel)
    carpeta = rel.split('/')[0]
    if carpeta == 'sistema':
        for sr in d.get('series', []):
            if sr['id'] in SERIES_CLAIM:
                u = sr['points'][-1]
                v = u['value']
                txt = f"{sr['title']}: {num(round(v, 2) if isinstance(v, float) else v)} ({sr['unit']}) en {u['period']}."
                añade(f"sistema-{d['id']}-{sr['id']}", txt, 'Datos del sistema (módulos «Financiación y déficit», «Cotizantes por pensionista»)',
                      [f"{rel}#{sr['id']}"], sr['source'], sr['confidence'])
    if carpeta == 'parametros' and d.get('data'):
        # una afirmación por serie: el dato más reciente
        x = sorted(d['data'], key=lambda z: (z['period'], z['id']))[-1]
        añade(f"param-{d['id']}", f"{d['title']}: {num(x['value'])} ({x['unit']}) en {x['period']}.", 'Datos de parámetros (módulo «Cómo se calcula» y «Metodología»)',
              [f"{rel}#{x['id']}"], x['source'], x['confidence'])
    for n in d.get('normas', []):
        añade(f"norma-{n['id']}", n['resumen'], 'Módulo «Reformas» (cronología)', [f"{rel}#{n['id']}"], n['source'], n['confidence'])
    for p in d.get('prestaciones', []):
        añade(f"prest-{p['id']}", p['aQuienCubre'], 'Módulo «Tipos de pensión»', [f"{rel}#{p['id']}"], p['source'], p['confidence'])

ORG = {'Boletín Oficial del Estado (BOE)': 'BOE', 'Instituto Nacional de Estadística (INE)': 'INE'}
filas = ['# Fuentes', '',
         'Registro de las fuentes consultadas. Cada fila corresponde a un documento descargado en una sesión de trabajo; nunca a datos recordados. La fecha es la de descarga (`fetchedAt`). Generado por `scripts/etl/fuentes_claims.py` a partir de `/data`.', '',
         '| Organismo | Documento | URL | Descargado | Ficheros de `/data` que lo usan |', '| --------- | --------- | --- | ---------- | ------------------------------- |']
for url, e in sorted(fuentes.items(), key=lambda kv: (kv[1]['src']['publisher'], kv[0])):
    s = e['src']
    t = s['title'].replace('|', '/')
    filas.append(f"| {ORG.get(s['publisher'], s['publisher'])} | {t} | <{url}> | {e['fecha'][:10]} | {', '.join(sorted(e['ficheros']))} |")
filas += ['', '## Huellas de los ficheros brutos (tablas)', '',
          'SHA-256 de cada fichero descargado que alimenta una tabla de `/data` (los ficheros de hasta 5 MB están en `data-raw/`; los mayores no se versionan y se localizan por URL y huella).', '',
          '| Tabla | Periodo | URL | SHA-256 |', '| ----- | ------- | --- | ------- |']
for tabla, per, url, sha in huellas:
    filas.append(f'| {tabla} | {per} | <{url}> | `{sha}` |')
with open(f'{REPO}/docs/FUENTES.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(filas) + '\n')
with open(f'{REPO}/docs/claims.json', 'w', encoding='utf-8') as f:
    json.dump({'version': 1, 'descripcion': 'Registro de afirmaciones factuales con sus fuentes. Lo valida npm run validate:data. Generado por scripts/etl/fuentes_claims.py a partir de /data; todas con revisionActuarial pendiente.', 'claims': claims}, f, ensure_ascii=False, indent=2)
    f.write('\n')
print('fuentes', len(fuentes), 'claims', len(claims))
