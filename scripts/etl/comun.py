"""Utilidades comunes de los scripts ETL de la Fase 1A.

Los scripts leen documentos ya descargados (XML/TXT del BOE, JSON del INE) desde el directorio
indicado en la variable de entorno DESCARGAS y escriben JSON en /data con su procedencia
(URL, fetchedAt, cita literal y localización). Ejecutar con `python3 -I`.
"""

import json
import os
import re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DESCARGAS = os.environ.get(
    'DESCARGAS',
    '/tmp/claude-0/-home-user-Pensiones/518cadd7-c655-5da6-9b4d-7ec373ee2d3e/scratchpad/fase1a/descargas',
)
HOY = os.environ.get('FECHA_DESCARGA', '2026-11-11')
BOE = 'Boletín Oficial del Estado (BOE)'
INE = 'Instituto Nacional de Estadística (INE)'


def texto(doc_id):
    """Texto plano del documento (celdas de tabla separadas por « | »), espacios normalizados."""
    with open(f'{DESCARGAS}/{doc_id}.txt', encoding='utf-8') as f:
        return re.sub(r'\s+', ' ', f.read())


def titulo(doc_id):
    with open(f'{DESCARGAS}/{doc_id}.xml', encoding='utf-8') as f:
        m = re.search(r'<titulo>([^<]*)', f.read())
    if not m:
        raise SystemExit(f'sin título: {doc_id}')
    return re.sub(r'\s+', ' ', m.group(1)).strip()


def url_boe(doc_id):
    return f'https://www.boe.es/buscar/doc.php?id={doc_id}'


def fuente(doc_id):
    return {'title': titulo(doc_id), 'publisher': BOE, 'url': url_boe(doc_id), 'docId': doc_id}


def num(s):
    """'3.425,70' -> 3425.7"""
    return float(s.replace('.', '').replace(',', '.'))


def busca(t, patron, doc=''):
    m = re.search(patron, t)
    if not m:
        raise SystemExit(f'SIN COINCIDENCIA en {doc}: {patron}')
    return m


def dato(periodo, valor, unidad, src, quote, location, notes=None, confidence='alta', cross=None):
    d = {
        'id': str(periodo).lower(),
        'value': valor,
        'unit': unidad,
        'period': str(periodo),
        'source': src,
        'fetchedAt': HOY,
        'confidence': confidence,
    }
    if notes:
        d['notes'] = notes
    d['quote'] = quote
    d['location'] = location
    if cross:
        d['crossCheck'] = cross
    return d


def cruce(doc_id, coincide, localizacion, extra=''):
    return {
        'source': fuente(doc_id),
        'fetchedAt': HOY,
        'matches': bool(coincide),
        'notes': f'Localización: {localizacion}.{(" " + extra) if extra else ""}',
    }


def fusionar(carpeta, id_, nuevos, title=None, description=None):
    """Añade o sustituye datos (por id) en data/<carpeta>/<id_>.json, ordenados por periodo."""
    ruta = f'{REPO}/data/{carpeta}/{id_}.json'
    if os.path.exists(ruta):
        with open(ruta, encoding='utf-8') as f:
            obj = json.load(f)
    else:
        obj = {'tipo': 'datos', 'id': id_, 'title': title, 'description': description, 'data': []}
    por_id = {d['id']: d for d in obj['data']}
    for d in nuevos:
        por_id[d['id']] = d
    obj['data'] = sorted(por_id.values(), key=lambda d: d['period'])
    if title:
        obj['title'] = title
    if description:
        obj['description'] = description
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('escrito', f'{carpeta}/{id_}', len(obj['data']))
