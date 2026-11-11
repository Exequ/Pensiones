"""Afiliados medios mensuales por régimen (2001-2026), Seguridad Social.
Fichero «Serie de afiliación media por regímenes (Total Sistema)»: se descarga con la URL de
data-raw/seg-social/AFI/origen.json (modo `descargar`) o se coloca a mano en
data-raw/seg-social/AFI/serie-afiliacion-media-regimenes.xlsx (modo `local`).
Escribe la tabla mensual y las series anuales (media de los doce meses). `python3 -I`."""
import csv, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, escribe_tabla, escribe_series

RAW = f'{REPO}/data-raw/seg-social/AFI'
MODO = os.environ.get('MODO', 'descargar')
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
COLS = {1: 'general', 2: 'sistema-especial-agrario', 3: 'sistema-especial-hogar', 4: 'autonomos',
        5: 'sistema-especial-agrario-autonomos', 6: 'mar-cuenta-ajena', 7: 'mar-cuenta-propia', 8: 'carbon',
        9: 'hogar-continuos', 10: 'hogar-discontinuos', 11: 'agrario-cuenta-ajena', 12: 'agrario-cuenta-propia',
        13: 'total-sistema', 14: 'cuidadores-no-profesionales'}
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
PAGINA = 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8/EST10/EST290/EST291'


def main():
    origen = json.load(open(f'{RAW}/origen.json'))
    f = f'{RAW}/serie-afiliacion-media-regimenes.xlsx'
    if MODO == 'descargar' and not os.path.exists(f):
        subprocess.run(['curl', '-sS', '--max-time', '90', '-o', f, origen['url'] + '?MOD=AJPERES&CONVERT_TO=linktext'], check=True)
    ws = openpyxl.load_workbook(f, read_only=True, data_only=True).worksheets[0]
    filas = []
    for r in ws.iter_rows(values_only=True):
        m = re.fullmatch(r'\s*([A-Za-záéíóú]+)\s+(\d{4})\s*', str(r[0] or ''))
        if not m or m.group(1).lower() not in MESES:
            continue
        mes = f'{m.group(2)}-{MESES.index(m.group(1).lower()) + 1:02d}'
        for c, nombre in COLS.items():
            v = r[c] if c < len(r) else None
            if isinstance(v, (int, float)):
                filas.append((mes, nombre, round(float(v), 1)))
    ruta = f'{REPO}/data/sistema/afiliacion-media-mensual-regimen'
    with open(ruta + '.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['mes', 'regimen', 'afiliados_medios'])
        w.writerows(filas)
    fuente = {'title': 'Afiliados medios en alta por regímenes (serie 2001-2026, total sistema)', 'publisher': SS, 'url': PAGINA}
    escribe_tabla('sistema', 'afiliacion-media-mensual-regimen',
        'Afiliados medios mensuales por régimen (enero de 2001 a la última publicación)',
        'Afiliados medios en alta de cada mes, por régimen y sistema especial, tal como los publica la Seguridad Social. '
        'A partir de 2012 el Régimen General no incluye los sistemas especiales Agrario y de Empleados de Hogar; '
        '«total-sistema» los incluye todos. Los cuidadores no profesionales (desde 2008) ya están incluidos en el General.',
        [('mes', 'Mes (AAAA-MM)', None), ('regimen', 'Régimen o sistema especial', None), ('afiliados_medios', 'Afiliados medios en alta del mes', 'afiliados')],
        len(filas), fuente, [{'period': '2026', 'url': origen['url'], 'sha256': origen['sha256']}],
        notes='Los afiliados de «cuidadores-no-profesionales» están incluidos en general. Definiciones y notas a pie del fichero original (hoja Hoja1).')
    # Series anuales: media de los doce meses (derivada) y diciembre
    por = {}
    for mes, rg, v in filas:
        por.setdefault(rg, {}).setdefault(mes[:4], {})[mes] = v
    series = []
    for rg in ('total-sistema', 'general', 'autonomos'):
        pts = [{'period': a, 'value': round(sum(d.values()) / 12, 1)} for a, d in sorted(por[rg].items()) if len(d) == 12]
        series.append({'id': f'media-anual-{rg}', 'title': f'Afiliados medios anuales: {rg}', 'unit': 'afiliados', 'source': fuente, 'confidence': 'media',
                       'notes': 'Dato derivado: media aritmética de los doce afiliados medios mensuales publicados; solo años completos. No es una cifra publicada como tal por la fuente.', 'points': pts})
        pts = [{'period': a, 'value': d[f'{a}-12']} for a, d in sorted(por[rg].items()) if f'{a}-12' in d]
        series.append({'id': f'diciembre-{rg}', 'title': f'Afiliados medios de diciembre: {rg}', 'unit': 'afiliados', 'source': fuente, 'confidence': 'alta',
                       'notes': 'Afiliados medios del mes de diciembre, tal como figuran en el fichero.', 'points': pts})
    escribe_series('sistema', 'afiliacion-anual', 'Afiliados: serie anual (media de los doce meses y diciembre), 2001-2025',
        'Afiliados medios en alta, total sistema, Régimen General y autónomos: media anual derivada de los doce meses y valor de diciembre.', series)
    print('filas', len(filas))


if __name__ == '__main__':
    main()
