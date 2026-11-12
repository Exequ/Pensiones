"""Fase 2-B-3 (higiene de datos): citas literales con la cifra en las cuantías mínimas de 2013 y 2021.

Mismo método que scripts/etl/minimas_citas.py (2022-2026): la cita abreviada de la Fase 1A («Absoluta. …
1,00, 0,85, 1,85, 49») no contenía la cifra del dato. Este script lee el cuadro de cuantías mínimas de la
norma de cada año (2013: Real Decreto-ley 29/2012, anexo, que se descarga del XML del BOE y se guarda en
data-raw/boe; 2021: Ley 11/2020, ya descargada), localiza cada fila por su rótulo dentro de su sección, y:

  1. comprueba que la celda de la columna que corresponde coincide con el valor de /data (si no, se
     detiene: la discrepancia iría a docs/DISCREPANCIAS.md; no se cambia ningún valor);
  2. sustituye la cita por el texto literal de la fila (comprobado dentro del cuadro) y la localización.

Ejecutar con `python3 -I scripts/etl/minimas_citas_historicas.py` (`MODO=local` si el texto ya está en
data-raw/boe).
"""
import hashlib
import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO  # noqa: E402

RAW = f'{REPO}/data-raw/boe'
ORIGEN_RUTA = f'{RAW}/origen.json'
ORIGEN = json.load(open(ORIGEN_RUTA, encoding='utf-8'))
HOY = os.environ.get('FECHA_DESCARGA', '2026-11-12')
MODO = os.environ.get('MODO', 'descargar')
DOCS = {2013: 'BOE-A-2012-15764', 2021: 'BOE-A-2020-17339'}
INICIO = {2013: 'Cuadro de cuantías mínimas de las pensiones del Sistema de la Seguridad Social en su modalidad contributiva',
          2021: 'Durante el año 2021 las cuantías mínimas de las pensiones del sistema de la Seguridad Social, en su modalidad contributiva'}
FIN = {2013: 'Cuadro de cuantías mínimas de las pensiones de Clases Pasivas', 2021: '(1) Cuantía en función de la base mínima de cotización'}
FICHEROS = ['pension-minima-jubilacion', 'pension-minima-incapacidad', 'pension-minima-viudedad', 'pension-minima-orfandad-familiares']
CELDA = r'(?:\d{1,3}(?:\.\d{3})*,\d{2}|–|\(\*\)|\(1\)|)'
NUM = re.compile(r'\d{1,3}(?:\.\d{3})*,\d{2}')
SECCIONES = ['Jubilación', 'Incapacidad Permanente', 'Viudedad', 'Orfandad', 'Prestación de orfandad', 'En favor de familiares']
COLUMNAS = {'conyuge-cargo': 0, 'unipersonal': 1, 'conyuge-no-cargo': 2, 'unico': 0}

# clase -> (sección, rótulo (regex), nº de celdas, columna en cada situación)
P = r'\.?'
ROTULOS = {
    'jub65': ('Jubilación', rf'Titular con sesenta y cinco años{P}', 3),
    'jub-menor65': ('Jubilación', rf'Titular menor de sesenta y cinco años{P}', 3),
    'jub65-gran-invalidez': ('Jubilación', rf'Titular con sesenta y cinco años procedente de gran invalidez{P}', 3),
    'ip-gran-invalidez': ('Incapacidad Permanente', rf'Gran invalidez{P}', 3),
    'ip-absoluta': ('Incapacidad Permanente', rf'Absoluta{P}', 3),
    'ip-total-65': ('Incapacidad Permanente', rf'Total: Titular con sesenta y cinco años{P}', 3),
    'ip-total-60-64': ('Incapacidad Permanente', rf'Total: Titular con edad entre sesenta y sesenta y cuatro años{P}', 3),
    'ip-total-enf-comun-menor60': ('Incapacidad Permanente', rf'Total: Derivada de enfermedad común menor de sesenta años{P}', 3),
    'ip-parcial-at-65': ('Incapacidad Permanente', rf'Parcial del régimen de accidentes? de trabajo: Titular con sesenta y cinco años{P}', 3),
    'viud-cargas-familiares': ('Viudedad', rf'Titular con cargas familiares{P}', 3),
    'viud-65-o-discapacidad65': ('Viudedad', rf'Titular con sesenta y cinco años,? o con discapacidad en grado igual o superior al 65 por 100{P}', 3),
    'viud-60-64': ('Viudedad', rf'Titular con edad entre sesenta y sesenta y cuatro años{P}', 3),
    'viud-menor60': ('Viudedad', rf'Titular con menos de sesenta años{P}', 3),
    'orf': ('Orfandad', rf'Por beneficiario{P}', 1),
    'orf-discapacidad65': ('Orfandad', rf'Por beneficiario (?:discapacitado )?menor de 18 años con (?:una )?discapacidad en grado igual o superior al 65 por 100{P}', 1),
    'fam': ('En favor de familiares', rf'Por beneficiario{P}', 1),
    'fam1-65': ('En favor de familiares', rf'(?:– )?Un solo beneficiario con sesenta y cinco años{P}', 1),
    'fam1-menor65': ('En favor de familiares', rf'(?:– )?Un solo beneficiario menor de sesenta y cinco años{P}', 1),
}


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def numero(s):
    return float(s.replace('.', '').replace(',', '.'))


def fmt(v):
    return f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def descargar_2013(doc):
    """Texto plano del XML del BOE con el formato de data-raw/boe (una línea por párrafo; celdas «x |»)."""
    ruta = f'{RAW}/{doc}.txt'
    if os.path.exists(ruta):
        return
    if MODO == 'local':
        raise SystemExit(f'falta {ruta} (modo local)')
    url = f'https://www.boe.es/diario_boe/xml.php?id={doc}'
    xml = subprocess.run(['curl', '-sS', '--fail', url], check=True, capture_output=True).stdout
    x = xml.decode('utf-8')
    titulo = norm(html.unescape(re.search(r'<titulo>([^<]*)', x).group(1)))
    x = re.sub(r'</t[dh]>', ' |\n', x)
    x = re.sub(r'</p>|</tr>|<br\s*/?>', '\n', x)
    lineas = [norm(html.unescape(re.sub(r'<[^>]+>', ' ', l))) for l in x.split('\n')]
    open(ruta, 'w', encoding='utf-8').write('\n'.join(l for l in lineas if l) + '\n')
    ORIGEN[f'{doc}.txt'] = {'url': f'https://www.boe.es/buscar/doc.php?id={doc}', 'urlDescarga': url, 'sha256_original': hashlib.sha256(xml).hexdigest(),
                            'fetchedAt': HOY, 'nota': f'{titulo}. Texto plano del XML del BOE (etiquetas eliminadas; celdas de tabla terminadas en « |»).'}
    json.dump(ORIGEN, open(ORIGEN_RUTA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def cuadro(anio, doc):
    texto = norm(' '.join(open(f'{RAW}/{doc}.txt', encoding='utf-8').read().split('\n')))
    i = texto.index(INICIO[anio])
    j = texto.index(FIN[anio], i)
    t = texto[i:j]
    pos = {}
    for s in SECCIONES:
        m = re.search(rf'(?<=\| ){re.escape(s)}(?= \|)', t, re.I)
        pos[s] = m.start() if m else None
    return t, pos


def seccion_texto(t, pos, sec):
    inicios = sorted((p, s) for s, p in pos.items() if p is not None)
    k = next(n for n, (_, s) in enumerate(inicios) if s == sec)
    fin = inicios[k + 1][0] if k + 1 < len(inicios) else len(t)
    return t[inicios[k][0]:fin]


def buscar(t, pos, clase):
    sec, rot, n = ROTULOS[clase]
    st = seccion_texto(t, pos, sec)
    celdas = r'(?: \|(?: (?:\d{1,3}(?:\.\d{3})*,\d{2}|–|\(\*\)|\(1\)))?)' + '{' + str(n) + r'}(?: \|)?'
    m = re.search(rot + celdas, st, re.I)
    if not m:
        raise SystemExit(f'fila no encontrada: {clase} en la sección {sec}')
    return norm(m.group(0)), sec


def main():
    descargar_2013(DOCS[2013])
    cuadros = {a: cuadro(a, d) for a, d in DOCS.items()}
    corregidos = 0
    for f in FICHEROS:
        ruta = f'{REPO}/data/parametros/{f}.json'
        obj = json.load(open(ruta, encoding='utf-8'))
        cambio = False
        for d in obj['data']:
            anio = int(d['period'])
            if anio not in DOCS or fmt(d['value']) in (d.get('quote') or ''):
                continue
            m = re.fullmatch(rf'{anio}-(.+)-(conyuge-cargo|unipersonal|conyuge-no-cargo|unico)', d['id'])
            if not m or m.group(1) not in ROTULOS:
                raise SystemExit(f'sin rótulo para {d["id"]}')
            t, pos = cuadros[anio]
            cita, sec = buscar(t, pos, m.group(1))
            partes = [c.strip() for c in cita.split('|')][1:]
            n = ROTULOS[m.group(1)][2]
            col = {'viud': 1}.get(m.group(1)[:4], COLUMNAS[m.group(2)]) if n == 3 else 0
            celda = partes[col] if col < len(partes) else ''
            if not NUM.fullmatch(celda or '') or abs(numero(celda) - d['value']) > 0.005:
                raise SystemExit(f'DISCREPANCIA {d["id"]}: valor {d["value"]} y celda «{celda}» en «{cita}» (docs/DISCREPANCIAS.md)')
            if fmt(d['value']) not in cita:
                raise SystemExit(f'la cita no contiene la cifra: {d["id"]}')
            d['quote'] = cita
            d['location'] = f'Anexo (cuadro de cuantías mínimas de las pensiones contributivas), sección {sec}'
            nota = d.get('notes', '')
            if 'Cita corregida' not in nota:
                d['notes'] = (nota + ' ' if nota else '') + 'Cita corregida en la Fase 2-B-3: fila literal del cuadro, comprobada por código (la de la Fase 1A no contenía la cifra).'
            corregidos += 1
            cambio = True
        if cambio:
            with open(ruta, 'w', encoding='utf-8') as fh:
                json.dump(obj, fh, ensure_ascii=False, indent=2)
                fh.write('\n')
    print('citas corregidas:', corregidos)


main()
