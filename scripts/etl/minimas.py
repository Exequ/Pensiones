"""Extrae de los reales decretos de revalorización: porcentaje, pensión máxima, límite de ingresos de los
complementos por mínimos y cuadro de cuantías mínimas (Anexo I, modalidad contributiva)."""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import REPO, busca, dato, fuente, fusionar, num, texto, url_boe  # noqa: E402

# año de efectos -> normas candidatas (la última de la lista prevalece si difieren; se informa)
NORMAS = {
    2000: ['BOE-A-1999-24922'], 2001: ['BOE-A-2000-24364'], 2002: ['BOE-A-2001-24969'],
    2003: ['BOE-A-2002-25416'], 2004: ['BOE-A-2004-507'], 2005: ['BOE-A-2004-21839'],
    2006: ['BOE-A-2005-21608'], 2007: ['BOE-A-2006-22958'], 2008: ['BOE-A-2007-22452'],
    2009: ['BOE-A-2008-20957'], 2010: ['BOE-A-2009-21052'], 2011: ['BOE-A-2010-20149'], 2012: ['BOE-A-2011-20638'], 2013: ['BOE-A-2012-15764', 'BOE-A-2012-15651'],
    2014: ['BOE-A-2013-13763'], 2015: ['BOE-A-2014-13680'], 2016: ['BOE-A-2015-14272'],
    2017: ['BOE-A-2016-12605'], 2018: ['BOE-A-2017-15854'], 2019: ['BOE-A-2018-17992'],
    2020: ['BOE-A-2020-501'], 2021: ['BOE-A-2021-1135', 'BOE-A-2020-17339'], 2022: ['BOE-A-2022-1189'], 2023: ['BOE-A-2022-22694'],
    2024: ['BOE-A-2023-26452'], 2025: ['BOE-A-2024-26915', 'BOE-A-2025-999', 'BOE-A-2025-1560', 'BOE-A-2025-7660'],
    2026: ['BOE-A-2025-26458', 'BOE-A-2026-1484', 'BOE-A-2026-2548', 'BOE-A-2026-6977'],
}
SECCIONES = {'jubilacion': 'Jubilación', 'incapacidad permanente': 'Incapacidad permanente', 'viudedad': 'Viudedad',
             'orfandad': 'Orfandad', 'en favor de familiares': 'En favor de familiares', 'prestacion de orfandad': 'Prestación de orfandad'}
COLS = ['conyuge-cargo', 'unipersonal', 'conyuge-no-cargo']
NUM = re.compile(r'^(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|[–—-])$')


def norm(s):
    s = s.lower().strip(' .:')
    for a, b in (('ñ', 'n'), ('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u')):
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', s)


def clave(sec, lab):
    l = norm(lab)
    if sec == 'jubilacion':
        if 'gran invalidez' in l: return 'jub65-gran-invalidez'
        if 'menor de' in l: return 'jub-menor65'
        if 'sesenta y cinco' in l or '65 anos' in l: return 'jub65'
    if sec == 'incapacidad permanente':
        if l.startswith('gran invalidez'): return 'ip-gran-invalidez'
        if l.startswith('absoluta'): return 'ip-absoluta'
        if l.startswith('total') and ('derivada' in l or 'enfermedad comun' in l): return 'ip-total-enf-comun-menor60'
        if l.startswith('total') and ('sesenta y cuatro' in l or '60 y 64' in l): return 'ip-total-60-64'
        if l.startswith('total') and ('sesenta y cinco' in l or '65 anos' in l): return 'ip-total-65'
        if l.startswith('parcial'): return 'ip-parcial-at-65'
        if l.startswith('titular con sesenta y cinco') or l.startswith('titular con 65'): return 'ip-parcial-at-65'
    if sec == 'viudedad':
        if 'cargas familiares' in l and ('sesenta y cinco' in l or 'titular con 65' in l): return 'viud-65-o-discapacidad65'
        if 'cargas familiares' in l and 'menos de' not in l: return 'viud-cargas-familiares'
        if 'cargas familiares' in l: return 'viud-menor60-cargas'
        if 'sesenta y cinco' in l or 'titular con 65' in l: return 'viud-65-o-discapacidad65'
        if 'sesenta y cuatro' in l or '60 y 64' in l: return 'viud-60-64'
        if 'menos de sesenta' in l or 'menos de 60' in l: return 'viud-menor60'
    if sec == 'orfandad':
        if 'discapac' in l or 'minusval' in l: return 'orf-discapacidad65'
        if l.startswith('por beneficiario'): return 'orf'
    if sec == 'en favor de familiares':
        if l.startswith('por beneficiario'): return 'fam'
        if 'menor de' in l: return 'fam1-menor65'
        if 'sesenta y cinco' in l or '65 anos' in l: return 'fam1-65'
    if sec == 'prestacion de orfandad':
        if l.startswith('un beneficiario'): return 'prest-orf-1'
        if l.startswith('varios'): return 'prest-orf-varios'
    return None


def cuadro(t):
    """Primer cuadro de mínimas (Anexo I). Devuelve lista (clave, columnas->valor, cita)."""
    i = t.find('Clase de pensión')
    a = re.search(r'Jubilación[ |]{1,12}Titular con (?:sesenta y cinco|65) años', t)
    if a and (i < 0 or a.start() < i + 400 and a.start() > i - 400):
        i = min(i, a.start()) if i >= 0 else a.start()
    elif a:
        i = a.start()
    f = t.find('En favor de familiares', i)
    f = f if f > 0 else i + 1500
    j = min([k for k in (t.find('ANEXO II', f), t.find('Límite de ingresos', f), t.find('Cuantías mínimas de las pensiones de Clases Pasivas', f), t.find('Cuadro de cuantías mínimas de las pensiones de Clases Pasivas', f)) if k > 0] or [len(t)])
    reg = t[i:j]
    reg = re.sub(r'\s*\|\s*', '\n', reg)
    # formato sin celdas (2000): salto antes de cada etiqueta conocida
    reg = re.sub(r'(?<=\S) (?=(?:Titular|Gran invalidez|Absoluta|Total:|Parcial|Por beneficiario|Un solo)\b)', '\n', reg)
    reg = re.sub(r'(?<=[a-z\.]) (?=\d{1,3}(?:\.\d{3})+(?:,\d\d)? \d)', '\n', reg)
    lineas = []
    for x in reg.split('\n'):
        x = x.strip()
        if not x:
            continue
        if re.fullmatch(r'(?:(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|[–—-])\s*)+', x):
            lineas.extend(x.split())
        else:
            lineas.append(x)
    sec, res, k = None, [], 0
    while k < len(lineas):
        l = lineas[k]
        ns = norm(l)
        if ns in SECCIONES:
            sec = ns; k += 1; continue
        if NUM.match(l):
            k += 1; continue
        # etiqueta: recoge los valores siguientes
        vals, m = [], k + 1
        while m < len(lineas) and NUM.match(lineas[m]):
            vals.append(lineas[m]); m += 1
        # etiqueta + valores en la misma línea (2000)
        mm = re.match(r'^(.*?[a-z\.])\s+((?:(?:\d{1,3}(?:\.\d{3})+(?:,\d\d)?|\d+,\d\d)\s*)+)$', l)
        if mm and not vals:
            l = mm.group(1); vals = mm.group(2).split()
        # «Parcial del régimen de accidentes de trabajo: Titular con sesenta y cinco años.»
        if sec == 'incapacidad permanente' and norm(l).startswith('parcial') and not vals and m < len(lineas):
            pass
        c = clave(sec, l) if sec else None
        if c and vals:
            res.append((c, vals, l))
        k = m if vals else k + 1
    return res


def extrae(doc):
    t = texto(doc)
    r = cuadro(t)
    out = []
    for c, vals, lab in r:
        if len(vals) == 4:  # 2000: pesetas y euros alternos
            vals = [vals[1], vals[3]]
        if c.startswith(('viud', 'orf', 'fam', 'prest')) and len(vals) == 1:
            cols = {'unipersonal': vals[0]} if c.startswith('viud') else {'unico': vals[0]}
        elif len(vals) == 2:
            cols = {'conyuge-cargo': vals[0], 'unipersonal': vals[1]}
        elif len(vals) == 3:
            cols = dict(zip(COLS, vals))
        elif len(vals) == 1:
            cols = {'unico': vals[0]}
        else:
            cols = {}
        cols = {k: v for k, v in cols.items() if v not in ('–', '—', '-')}
        out.append((c, {k: num(v) for k, v in cols.items()}, lab, vals))
    return out


if __name__ == '__main__':
    cobertura = {}
    ESP = {'jub65', 'jub-menor65', 'viud-65-o-discapacidad65', 'viud-60-64', 'viud-menor60', 'orf'}
    for y, docs in NORMAS.items():
        for d in docs:
            r = extrae(d)
            falta = sorted(ESP - {c for c, *_ in r})
            print(y, d, len(r), 'FALTA', falta)
