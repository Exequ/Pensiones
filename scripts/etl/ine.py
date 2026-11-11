"""Descarga y lectura de tablas del INE (API Tempus, servicios.ine.es).

Dos modos (variable MODO): `descargar` (por defecto) baja cada tabla de
https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/<id>?tip=AM y la guarda comprimida en
data-raw/ine/tablas/<id>.json.gz; `local` solo lee lo que ya hay allí. data-raw/ine/origen.json
guarda por tabla la URL, la fecha de descarga, el SHA-256 del JSON original y su tamaño.
Uso como módulo: `from ine import tabla` (devuelve la lista de series de la tabla).
Uso como script: `python3 -I ine.py 59583 27153 ...` descarga las tablas indicadas.
"""
import gzip, hashlib, json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

RAW = f'{REPO}/data-raw/ine/tablas'
ORIGEN = f'{REPO}/data-raw/ine/origen.json'
MODO = os.environ.get('MODO', 'descargar')
URL = 'https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/{id}?tip=AM'
URL_WEB = 'https://www.ine.es/jaxiT3/Tabla.htm?t={id}'


def _origen():
    return json.load(open(ORIGEN)) if os.path.exists(ORIGEN) else {}


def descarga(tid, forzar=False):
    """Descarga la tabla `tid` (si no está) y registra su procedencia."""
    os.makedirs(RAW, exist_ok=True)
    ruta = f'{RAW}/{tid}.json.gz'
    if os.path.exists(ruta) and not forzar:
        return ruta
    if MODO == 'local':
        raise SystemExit(f'Falta {ruta} (modo local)')
    for intento in range(4):
        crudo = subprocess.run(['curl', '-sS', '-L', '-m', '600', URL.format(id=tid)],
                               capture_output=True).stdout
        try:
            json.loads(crudo)
            break
        except ValueError:
            time.sleep(2 ** (intento + 1))
    else:
        raise SystemExit(f'No se pudo descargar la tabla {tid}')
    with gzip.open(ruta, 'wb', 9) as f:
        f.write(crudo)
    o = _origen()
    o[str(tid)] = {'url': URL.format(id=tid), 'web': URL_WEB.format(id=tid), 'fetchedAt': HOY,
                   'sha256': hashlib.sha256(crudo).hexdigest(), 'bytes': len(crudo)}
    json.dump(dict(sorted(o.items(), key=lambda kv: int(kv[0]))), open(ORIGEN, 'w'), indent=1)
    return ruta


def tabla(tid):
    """Series de la tabla (lista de dicts con COD, Nombre, MetaData y Data)."""
    with gzip.open(descarga(tid), 'rb') as f:
        return json.loads(f.read())


def meta(serie):
    """{variable: nombre} de los metadatos de una serie."""
    return {m['T3_Variable']: m['Nombre'] for m in serie['MetaData']}


def fuente(tid, titulo, op=None):
    return {'title': titulo, 'publisher': 'Instituto Nacional de Estadística (INE)',
            'url': URL_WEB.format(id=tid), 'docId': f'INE-{tid}'}


if __name__ == '__main__':
    for t in sys.argv[1:]:
        r = descarga(int(t), forzar=os.environ.get('FORZAR') == '1')
        print(t, os.path.getsize(r), 'bytes comprimidos')
