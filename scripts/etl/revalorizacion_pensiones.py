"""Revalorización anual, pensión máxima, límites de ingresos y pensiones mínimas (2000-2026).

Extrae los datos de los reales decretos (y reales decretos-leyes) de revalorización descargados.
Los años que el parser no resuelve se completan, solo cuando la cita literal figura en el documento,
con los hallazgos de la recogida manual (`brutos/`); el resto queda en PENDIENTE_DATOS.md.
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import minimas  # noqa: E402
from comun import DESCARGAS, dato, fuente, fusionar, num, texto  # noqa: E402

BRUTOS = os.path.join(DESCARGAS, '..', 'brutos')
PAL = {'cero': 0.0, 'uno': 1.0, 'un': 1.0, 'dos': 2.0, 'tres': 3.0}
PEND = []


def valor(s):
    return PAL[s] if s in PAL else num(s) if ',' in s or '.' in s else float(s)


def brutos(archivo, serie):
    """Hallazgos de la recogida manual cuya cita literal consta en el documento citado."""
    with open(os.path.join(BRUTOS, archivo), encoding='utf-8') as f:
        hs = json.load(f)['hallazgos']
    out = {}
    for h in hs:
        if h['serie'] != serie:
            continue
        doc = h['source'].get('docId')
        ev = re.sub(r'\s+', ' ', h['evidencia'].split('||')[0]).strip(' «»…')
        frag = ev[:90]
        if doc and frag in texto(doc):
            out[int(h['period'][:4])] = h
    return out


def de_bruto(h, unidad=None):
    return dato(int(h['period'][:4]), h['value'], unidad or h['unit'], h['source'], h['evidencia'], h['localizacion'],
                (h.get('notes') or None), h['confidence'])


# ---------------- revalorización general ----------------
REV = {}
for y, docs in minimas.NORMAS.items():
    for d in docs[::-1]:
        t = texto(d)
        m = re.search(r'causadas con anterioridad al 1 de enero de %d[^.]{0,120}?se revalorizar[áa]n(?: en)?(?: un| el)? ([\w,]+) por (?:100|ciento)' % y, t)
        if m:
            REV[y] = (d, valor(m.group(1)), m.group(0), 'Artículo 3.1')
            break
ALT = {  # año: (doc, patrón con un grupo numérico, localización)
    2018: ('BOE-A-2017-15854', r'experimentarán en 2018 un incremento del ([\d,]+) por ciento', 'Artículo de revalorización'),
    2019: ('BOE-A-2018-17992', r'experimentarán en 2019 un incremento del ([\d,]+) por ciento', 'Artículo de revalorización'),
    2020: ('BOE-A-2020-501', r'estableciendo con carácter general un incremento del ([\d,]+) por ciento', 'Exposición de motivos (artículo primero)'),
    2022: ('BOE-A-2022-1189', r'actualización general de las pensiones[^.]{0,160}?del ([\d,]+) por 100', 'Exposición de motivos'),
    2024: ('BOE-A-2023-26452', r'porcentaje general de revalorización del ([\d,]+) por ciento', 'Exposición de motivos'),
}
for y, (d, pat, loc) in ALT.items():
    m = re.search(pat, texto(d))
    if m:
        REV[y] = (d, valor(m.group(1)), m.group(0), loc)
m = re.search(r'se incrementarán en el año 2013 un uno por ciento[^.]{0,80}', texto('BOE-A-2012-15764'))
for h in brutos('revalorizacion-2013-2026.json', 'revalorizacion-general').values():
    pass
rev_datos = []
bru = {}
bru.update(brutos('revalorizacion-2000-2012.json', 'revalorizacion-general'))
bru.update(brutos('revalorizacion-2013-2026.json', 'revalorizacion-general'))
for y in range(2000, 2027):
    if y in REV:
        d, v, q, loc = REV[y]
        extra = ''
        if y == 2019:
            extra = ''
        rev_datos.append(dato(y, v, '%', fuente(d), q, loc, 'Incremento general de las pensiones contributivas del sistema de la Seguridad Social causadas antes del 1 de enero.'))
    elif y in bru:
        rev_datos.append(de_bruto(bru[y], '%'))
    else:
        PEND.append(('Revalorización general %d' % y, 'BOE', 'No se localizó el porcentaje en las normas descargadas.'))
fusionar('parametros', 'revalorizacion-general', rev_datos, 'Revalorización general anual de las pensiones contributivas',
         'Porcentaje de incremento de las pensiones contributivas del sistema de la Seguridad Social fijado cada año. Años 2000-2004 y 2013 recogidos con cita literal verificada contra el documento.')

# ---------------- pensión máxima ----------------
PM = {}
PAT = [r'limitado a la cantidad de ([\d.]+,\d\d) euros', r'[Ll]ímite máximo (?:establecido )?(?:para la percepción|de percepción)[^.]{0,140}?(?:será de|en \d{4} en|:) ?([\d.]+,\d\d) euros',
       r'estarán limitadas[^.]{0,80}? a la cantidad de ([\d.]+,\d\d) euros mensuales']
for y, docs in minimas.NORMAS.items():
    for d in docs[::-1]:
        t = texto(d)
        for p in PAT:
            m = re.search(p, t)
            if m and num(m.group(1)) < 10000 and y not in (2011,):
                PM[y] = (d, num(m.group(1)), m.group(0)); break
        if y in PM:
            break
pmb = {}
pmb.update(brutos('revalorizacion-2000-2012.json', 'pension-maxima'))
pmb.update(brutos('revalorizacion-2013-2026.json', 'pension-maxima'))
pm_datos = []
for y in range(2000, 2027):
    if y in PM:
        d, v, q = PM[y]
        pm_datos.append(dato(y, v, 'euros/mes', fuente(d), q, 'Artículo sobre el importe de la revalorización (límite máximo de percepción)',
                             'Importe de una mensualidad ordinaria (14 pagas anuales).'))
    elif y in pmb:
        pm_datos.append(de_bruto(pmb[y], 'euros/mes'))
    else:
        PEND.append(('Pensión máxima %d' % y, 'BOE', 'No se localizó el límite máximo mensual en las normas descargadas.'))
fusionar('parametros', 'pension-maxima', pm_datos, 'Pensión máxima (límite máximo de percepción de pensiones públicas)',
         'Importe mensual (14 pagas) fijado cada año en la norma de revalorización.')

# ---------------- límites de ingresos para los complementos por mínimos ----------------
L1, L2 = [], []
for y, docs in minimas.NORMAS.items():
    for d in docs[::-1]:
        t = texto(d)
        a = re.search(r'inferior a la suma de ([\d.]+,\d\d) euros', t)
        s = re.search(r'Sin cónyuge a cargo:? ?(?:–|-)? ?([\d.]+,\d\d) euros/año', t)
        c = re.search(r'Con cónyuge a cargo:? ?(?:–|-)? ?([\d.]+,\d\d) euros/año', t)
        if a and not c or s or c:
            src = fuente(d)
            if a and not s:
                L1.append(dato(y, num(a.group(1)), 'euros/año', src, a.group(0), 'Artículo sobre el límite de ingresos de los complementos por mínimos',
                               'Límite único (sin distinción por cónyuge a cargo) hasta 2017.'))
            if s:
                L1.append(dato(y, num(s.group(1)), 'euros/año', src, s.group(0), 'Anexo I, límite de ingresos para el reconocimiento de complementos por mínimos', 'Sin cónyuge a cargo.'))
            if c:
                L2.append(dato(y, num(c.group(1)), 'euros/año', src, c.group(0), 'Anexo I, límite de ingresos para el reconocimiento de complementos por mínimos', 'Con cónyuge a cargo.'))
            break
fusionar('parametros', 'limite-ingresos-complementos-minimos', L1, 'Límite de ingresos para los complementos por mínimos (sin cónyuge a cargo o límite único)',
         'Suma de rendimientos por encima de la cual no se reconoce complemento por mínimos. Hasta 2017 un único límite; desde 2018, uno sin cónyuge a cargo y otro con cónyuge a cargo.')
fusionar('parametros', 'limite-ingresos-complementos-minimos-con-conyuge', L2, 'Límite de ingresos para los complementos por mínimos (con cónyuge a cargo)',
         'Límite aplicable cuando hay cónyuge a cargo (desde 2018).')

# ---------------- cuadro de cuantías mínimas ----------------
FAM = {'jubilacion': ('jub65', 'jub-menor65', 'jub65-gran-invalidez'),
       'incapacidad': ('ip-gran-invalidez', 'ip-absoluta', 'ip-total-65', 'ip-total-60-64', 'ip-total-enf-comun-menor60', 'ip-parcial-at-65'),
       'viudedad': ('viud-cargas-familiares', 'viud-65-o-discapacidad65', 'viud-60-64', 'viud-menor60', 'viud-menor60-cargas'),
       'orfandad-familiares': ('orf', 'orf-discapacidad65', 'prest-orf-1', 'prest-orf-varios', 'fam', 'fam1-65', 'fam1-menor65')}
SALIDA = {k: [] for k in FAM}
CAMPOS = {'conyuge-cargo': 'con cónyuge a cargo', 'unipersonal': 'sin cónyuge (unidad económica unipersonal)',
          'conyuge-no-cargo': 'con cónyuge no a cargo', 'unico': 'importe único'}
for y, docs in sorted(minimas.NORMAS.items()):
    cand = [(d, minimas.extrae(d)) for d in docs]
    cand = [(d, r) for d, r in cand if r]
    if not cand:
        PEND.append(('Cuadro de pensiones mínimas %d' % y, ', '.join(docs), 'Cuadro no disponible en texto en los documentos descargados.'))
        continue
    d, r = cand[-1]
    otras = cand[:-1]
    visto = set()
    for clave, cols, lab, _ in r:
        for col, v in cols.items():
            if (clave, col) in visto:
                continue
            visto.add((clave, col))
            fam = next((k for k, cl in FAM.items() if clave in cl), None)
            if fam is None:
                continue
            cr = None
            for d2, r2 in otras:
                d2v = {(c2, k2): v2 for c2, vv, _, _ in r2 for k2, v2 in vv.items()}
                if (clave, col) in d2v:
                    cr = {'source': fuente(d2), 'fetchedAt': dato(y, 0, '', {}, '', '')['fetchedAt'], 'matches': d2v[(clave, col)] == v,
                          'notes': 'Misma cuantía en otra norma del mismo año.'}
                    break
            x = dato(f'{y}-{clave}-{col}', v, 'euros/año', fuente(d), f'{lab.strip()} … {", ".join(str(n) for n in _)}',
                     'Anexo I (cuadro de cuantías mínimas de las pensiones contributivas)',
                     f'Cuantía mínima anual ({CAMPOS[col]}).', cross=cr)
            x['period'] = str(y)
            SALIDA[fam].append(x)
TIT = {'jubilacion': 'Pensiones mínimas de jubilación', 'incapacidad': 'Pensiones mínimas de incapacidad permanente',
       'viudedad': 'Pensiones mínimas de viudedad', 'orfandad-familiares': 'Pensiones mínimas de orfandad y en favor de familiares'}
for fam, datos in SALIDA.items():
    ids = {x['id'] for x in datos}
    assert len(ids) == len(datos), fam
    fusionar('parametros', f'pension-minima-{fam}', datos, TIT[fam],
             'Cuantías mínimas anuales del Anexo I de la norma de revalorización de cada año (modalidad contributiva), por clase de pensión y situación familiar. Identificador: año-clase-situación.')

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pendientes_revalorizacion.json'), 'w', encoding='utf-8') as f:
    json.dump(PEND, f, ensure_ascii=False, indent=1)
print('PENDIENTES', len(PEND))
for p in PEND:
    print(' ', p)
