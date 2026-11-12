"""Descarga textos consolidados del BOE (API de datos abiertos) y los guarda como texto plano.

Uso: `python3 -I scripts/etl/boe_consolidado.py [MODO=local]`.

Para cada norma de NORMAS:
  - descarga https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/<id>/texto (XML)
    salvo en modo local (entonces usa el XML guardado en el directorio de descargas);
  - escribe data-raw/boe/<fichero>.txt con un bloque por precepto. Cada bloque empieza por una
    línea «[Bloque <id> · vigente desde AAAAMMDD · norma <id_norma>]» y sigue con un párrafo por
    línea (celdas de tabla separadas por « | »). Se escriben **todas** las versiones de cada
    bloque, de la más antigua a la más reciente, para poder citar la redacción vigente en el año
    del hecho causante;
  - anota URL, SHA-256 del XML original y fecha en data-raw/boe/origen.json.

Ejecutar con `python3 -I`.
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
DESC = os.environ.get('DESCARGAS_BOE', '/tmp/boe-consolidado')
MODO = os.environ.get('MODO', 'descargar')
HOY = os.environ.get('FECHA_DESCARGA', '2026-11-12')
API = 'https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{}/texto'

NORMAS = {
    'BOE-A-1969-575': ('orden-15-04-1969.txt', 'Orden de 15 de abril de 1969 (prestaciones por invalidez del Régimen General)'),
    'BOE-A-1972-944': ('decreto-1646-1972.txt', 'Decreto 1646/1972, de 23 de junio (aplicación de la Ley 24/1972 en materia de prestaciones)'),
    'BOE-A-1972-1210': ('orden-31-07-1972.txt', 'Orden de 31 de julio de 1972 (desarrollo del Decreto 1646/1972)'),
    'BOE-A-1966-21116': ('decreto-3158-1966.txt', 'Decreto 3158/1966, de 23 de diciembre (Reglamento General de la cuantía de las prestaciones económicas)'),
    'BOE-A-1984-12729': ('rd-1071-1984.txt', 'Real Decreto 1071/1984, de 23 de mayo (modificación de diversos aspectos de la invalidez permanente)'),
    'BOE-A-1985-20582': ('rd-1799-1985.txt', 'Real Decreto 1799/1985, de 2 de octubre (racionalización de las pensiones de jubilación e invalidez permanente)'),
}


def limpio(s):
    s = re.sub(r'</t[dh]>', ' | ', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def convertir(xml):
    salida = []
    for b in re.finditer(r'<bloque id="([^"]*)"[^>]*>(.*?)</bloque>', xml, re.S):
        bid, cuerpo = b.group(1), b.group(2)
        for v in re.finditer(r'<version id_norma="([^"]*)"[^>]*fecha_vigencia="(\d*)"[^>]*>(.*?)</version>', cuerpo, re.S):
            salida.append(f'[Bloque {bid} · vigente desde {v.group(2)} · norma {v.group(1)}]')
            for p in re.finditer(r'<(p|table)\b[^>]*>(.*?)</\1>', v.group(3), re.S):
                t = limpio(p.group(2))
                if t:
                    salida.append(t)
    return '\n'.join(salida) + '\n'


def main():
    os.makedirs(DESC, exist_ok=True)
    origen_ruta = f'{RAW}/origen.json'
    origen = json.load(open(origen_ruta, encoding='utf-8'))
    for id_, (fichero, titulo) in NORMAS.items():
        xml_ruta = f'{DESC}/{id_}.xml'
        if MODO != 'local' and not os.path.exists(xml_ruta):
            subprocess.run(['curl', '-sS', '--fail', '-H', 'Accept: application/xml', API.format(id_), '-o', xml_ruta], check=True)
        if not os.path.exists(xml_ruta):
            print(f'sin XML (modo local): {id_}; se conserva el texto de data-raw/boe si existe')
            continue
        crudo = open(xml_ruta, 'rb').read()
        xml = crudo.decode('utf-8')
        if '<code>200</code>' not in xml:
            raise SystemExit(f'respuesta no válida para {id_}')
        open(f'{RAW}/{fichero}', 'w', encoding='utf-8').write(convertir(xml))
        origen[fichero] = {
            'url': f'https://www.boe.es/buscar/act.php?id={id_}',
            'urlDescarga': API.format(id_),
            'sha256_original': hashlib.sha256(crudo).hexdigest(),
            'fetchedAt': HOY,
            'nota': f'{titulo}. Texto consolidado descargado de la API de datos abiertos del BOE; texto plano con todas las versiones de cada bloque (scripts/etl/boe_consolidado.py)',
        }
        print(f'{id_} -> {fichero}')
    json.dump(origen, open(origen_ruta, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
