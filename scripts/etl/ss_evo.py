"""Altas iniciales y bajas definitivas anuales de pensiones contributivas (2021-2025) y edad media
de las altas de jubilación. Fuente: fichero EVO de «Altas y bajas de pensiones contributivas»
(Seguridad Social). Modo `descargar` (por defecto) o `local` (fichero en data-raw/seg-social/EVO/).
Ejecutar con `python3 -I`."""
import csv, hashlib, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, escribe_tabla, escribe_series

RAW = f'{REPO}/data-raw/seg-social/EVO'
MODO = os.environ.get('MODO', 'descargar')
CLASES = ['total', 'incapacidad', 'jubilacion', 'viudedad', 'orfandad', 'favor-familiares']
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'


def fichero():
    ix = json.load(open(f'{REPO}/data-raw/seg-social/indice.json'))['2026']
    nombre = next(n for n in ix if n.startswith('EVO') and n[3:4].isdigit())
    f = f'{RAW}/{nombre}'
    os.makedirs(RAW, exist_ok=True)
    if MODO == 'descargar' and not os.path.exists(f):
        subprocess.run(['curl', '-sS', '--max-time', '90', '-o', f, ix[nombre]['url'] + '?MOD=AJPERES&CONVERT_TO=linktext'], check=True)
    return f, ix[nombre]['url']


def main():
    f, url = fichero()
    sha = hashlib.sha256(open(f, 'rb').read()).hexdigest()
    wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
    filas = []
    for mov, pref in (('alta-inicial', 'EVO_altas_'), ('baja-definitiva', 'EVO_bajas_')):
        for sexo, suf in (('ambos', 'ambos_sexos'), ('hombres', 'hombres'), ('mujeres', 'mujeres')):
            for r in wb[pref + suf].iter_rows(values_only=True):
                if isinstance(r[0], int) and r[1] is None and r[2] is not None:
                    for k, cl in enumerate(CLASES):
                        n, pm = r[2 + 2 * k], r[3 + 2 * k]
                        filas.append((r[0], mov, cl, sexo, int(n), round(float(pm), 2)))
    filas.sort()
    ruta = f'{REPO}/data/sistema/altas-bajas-anual-clase-sexo'
    with open(ruta + '.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['anio', 'movimiento', 'clase', 'sexo', 'numero', 'pension_media_eur_mes'])
        w.writerows(filas)
    fuente = {'title': 'Altas y bajas de pensiones contributivas: evolución 2022-2026 (fichero EVO)', 'publisher': SS,
              'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST44'}
    escribe_tabla('sistema', 'altas-bajas-anual-clase-sexo',
        'Altas iniciales y bajas definitivas de pensiones contributivas, por año, clase y sexo (2021-2025)',
        'Altas iniciales y bajas definitivas del año completo, con número y pensión media mensual de las altas/bajas, por clase y sexo. '
        '«ambos» incluye sexo no consta. Las altas no incluyen rehabilitaciones ni traslados.',
        [('anio', 'Año natural', None), ('movimiento', 'alta-inicial o baja-definitiva', None),
         ('clase', 'total, incapacidad, jubilacion, viudedad, orfandad o favor-familiares', None),
         ('sexo', 'ambos, hombres o mujeres', None), ('numero', 'Número de altas o bajas', 'pensiones'),
         ('pension_media_eur_mes', 'Pensión media mensual de las altas o bajas', 'euros/mes')],
        len(filas), fuente, [{'period': '2025', 'url': url, 'sha256': sha}],
        notes='Fichero EVO publicado con datos hasta septiembre de 2026; solo se toman los años completos 2021-2025. '
              'Años anteriores a 2021: ver docs/DESCARGAS_MANUALES.md.')
    # Edad media de las altas de jubilación (hoja por edad)
    edad = {}
    ws = wb['EVO_acumula_altas_jub_edad']
    rows = list(ws.iter_rows(values_only=True))
    cab = next(r for r in rows if r[0] == 'Edad')
    anios = {c: int(str(v).split()[1]) for c, v in enumerate(cab) if v and str(v).startswith('Año') and 'acumul' not in str(v)}
    fila = next(r for r in rows if r[0] and str(r[0]).startswith('Edad media'))
    pts = [{'period': str(a), 'value': float(fila[c])} for c, a in anios.items() if a <= 2025]
    escribe_series('sistema', 'edad-media-altas-jubilacion',
        'Edad media de las altas iniciales de jubilación (2022-2025)', 'Edad media (años) de las altas iniciales de pensión de jubilación contributiva en el año, total sistema.',
        [{'id': 'edad-media-altas-jubilacion', 'title': 'Edad media de las altas iniciales de jubilación', 'unit': 'años',
          'source': dict(fuente, title=fuente['title'] + ', hoja EVO_acumula_altas_jub_edad'), 'confidence': 'alta',
          'notes': 'Edad media de acceso a la pensión de jubilación (altas iniciales). No es la edad media efectiva de salida del mercado laboral.', 'points': pts}])


main()
