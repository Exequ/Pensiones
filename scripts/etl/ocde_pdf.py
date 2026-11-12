"""Lectura del PDF «Pensions at a Glance 2025» de la OCDE (aportado a mano por el autor en data-raw/oecd/).

El PDF no se descarga desde el entorno (el sitio de la OCDE responde HTTP 403 a las descargas automáticas): lo coloca el autor
y los scripts lo leen en modo local con `pdftotext`. Este módulo localiza cada cita literal en el texto del PDF y devuelve su
página; si una cita no está, el script que la pide se detiene (ninguna cita se da por buena sin comprobarla).

Se usan dos extracciones: `pdftotext` sin diseño (orden de lectura, buena para la prosa a dos columnas) y con `-layout` (buena
para las filas de las tablas). La numeración de páginas del informe es la del PDF menos dos.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO  # noqa: E402

RAW = f'{REPO}/data-raw/oecd'
PDF = f'{RAW}/Pensions at a Glance 2025 OCDE.pdf'
# DOI que consta en los metadatos del propio PDF (campo «Subject»)
URL = 'https://doi.org/10.1787/e40274c1-en'
OECD = 'OECD (Organización para la Cooperación y el Desarrollo Económicos)'
DOC_ID = 'OECD-PAG-2025'
TITULO = 'Pensions at a Glance 2025: OECD and G20 Indicators'
# El autor aportó el PDF a mano; la fecha es la de su incorporación al repositorio (commit af8a810 «pensions at a glance»).
FECHA_PDF = os.environ.get('FECHA_PDF_OCDE', '2026-11-12')
FUENTE = {'title': TITULO, 'publisher': OECD, 'url': URL, 'docId': DOC_ID}


def norm(t):
    return re.sub(r'\s+', ' ', t)


def _extrae(layout):
    args = ['pdftotext'] + (['-layout'] if layout else []) + [PDF, '-']
    t = subprocess.run(args, capture_output=True, text=True, check=True).stdout
    return [norm(p) for p in t.split('\f')]


_cache = {}


def paginas(layout=False):
    if layout not in _cache:
        if not os.path.exists(PDF):
            raise SystemExit('falta ' + PDF)
        _cache[layout] = _extrae(layout)
    return _cache[layout]


def sha256():
    h = hashlib.sha256()
    with open(PDF, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def busca(cita, layout=False):
    """Devuelve la localización de la cita (literal, con espacios normalizados) o detiene el script."""
    c = norm(cita)
    for i, p in enumerate(paginas(layout), 1):
        if c in p:
            return f'p. {i - 2} del informe (pág. {i} del PDF)'
    raise AssertionError(f'cita no encontrada en el PDF de la OCDE ({"layout" if layout else "lectura"}): {cita[:80]}')


def dato(id_, valor, unidad, cita, notas, confianza='alta', layout=False, periodo='2024', ubicacion_extra=''):
    """Elemento de `data` con la cita literal comprobada en el PDF."""
    loc = busca(cita, layout)
    return {'id': id_, 'value': valor, 'unit': unidad, 'period': periodo, 'source': FUENTE, 'fetchedAt': FECHA_PDF, 'confidence': confianza,
            'notes': notas, 'quote': cita, 'location': loc + (f'; {ubicacion_extra}' if ubicacion_extra else '')}


def registra_origen():
    """Anota el PDF aportado a mano en data-raw/oecd/origen.json (URL, fecha, huella)."""
    ruta = f'{RAW}/origen.json'
    o = json.load(open(ruta))
    o['Pensions at a Glance 2025 OCDE.pdf'] = {'url': URL, 'fetchedAt': FECHA_PDF, 'sha256': sha256(), 'bytes': os.path.getsize(PDF),
                                               'nota': 'Aportado a mano por el autor (HTTP 403 desde el entorno); 248 páginas; la fecha es la de su incorporación al repositorio.'}
    json.dump(o, open(ruta, 'w'), indent=1, ensure_ascii=False)
    open(ruta, 'a').write('\n')
