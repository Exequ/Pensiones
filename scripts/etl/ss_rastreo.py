"""Rastreo del portal de estadísticas de la Seguridad Social (pensiones).

Dos modos (variable MODO): `descargar` (por defecto) baja las páginas y ficheros a
data-raw/seg-social/; `local` solo lee lo que ya hay allí (para cuando la red no llegue y el
fichero se descargue a mano). Escribe data-raw/seg-social/indice.json con la URL de cada
fichero. Ejecutar con `python3 -I`.
"""

import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO  # noqa: E402

RAW = f'{REPO}/data-raw/seg-social'
BASE = 'https://www.seg-social.es'
RAIZ = f'{BASE}/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23'
MODO = os.environ.get('MODO', 'descargar')


def pagina(ruta_o_url, nombre):
    """HTML de una página (descargado o de data-raw/seg-social/paginas)."""
    os.makedirs(f'{RAW}/paginas', exist_ok=True)
    f = f'{RAW}/paginas/{nombre}.html'
    if MODO == 'descargar' and not os.path.exists(f):
        url = ruta_o_url if ruta_o_url.startswith('http') else BASE + ruta_o_url
        subprocess.run(['curl', '-sS', '--max-time', '60', '-o', f, url], check=True)
    with open(f, encoding='utf-8', errors='ignore') as fh:
        return html.unescape(fh.read())


def enlaces(t):
    for m in re.finditer(r'href="([^"]+)"[^>]*>(.*?)</a>', t, re.S):
        yield m.group(1), re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(2))).strip()


def main():
    indice = {}
    raiz = pagina(f'{RAIZ}/2575', 'historico')
    anios = {}
    for h, tx in enlaces(raiz):
        m = re.fullmatch(r'Año (\d{4})', tx)
        if m and '/2575/' in h:
            anios[int(m.group(1))] = h
    # año en curso: página EST24 (vigor) y EST44 (altas y bajas)
    cola = []
    for a, h in sorted(anios.items()):
        cola.append((a, h, 1))
    cola.append((2026, f'{RAIZ}/EST24', 9))
    cola.append((2026, f'{RAIZ}/EST44', 9))
    vistos = set()
    while cola:
        a, h, prof = cola.pop(0)
        if h in vistos:
            continue
        vistos.add(h)
        t = pagina(h, re.sub(r'\W+', '_', h.split('Estadisticas/')[-1])[-80:])
        for h2, tx in enlaces(t):
            if re.search(r'\.xlsx?(\?|$)', h2, re.I):
                nombre = h2.split('?')[0].split('/')[-1]
                url = (BASE + h2 if h2.startswith('/') else h2).split('?')[0]
                indice.setdefault(str(a), {})[nombre] = {'url': url, 'texto': tx}
            elif prof < 3 and 'EST23/2575/' in h2 and h2.count('/') > h.count('/') - 1 and h2.startswith('/wps/portal'):
                if h2.split('/!ut')[0].startswith(h.split('/!ut')[0]) and h2 != h:
                    cola.append((a, h2.split('/!ut')[0], prof + 1))
    with open(f'{RAW}/indice.json', 'w', encoding='utf-8') as f:
        json.dump(indice, f, ensure_ascii=False, indent=1)
    for a in sorted(indice):
        pref = sorted({re.sub(r'\d{4,6}.*$', '', n) for n in indice[a]})
        print(a, len(indice[a]), pref)


if __name__ == '__main__':
    main()
