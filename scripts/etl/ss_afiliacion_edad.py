""". Fuente: ficheros «Afiliados Medios AAAA»
(hoja Tabla_1_5) de la Seguridad Social. Modo `descargar`: localiza los ficheros en la página
EST291 y los baja a data-raw/seg-social/AFI/ (no se versionan: pesan ~4 MB cada uno; se guarda URL y
huella en origen-edad.json). Modo `local`: usa los ficheros ya colocados con el nombre
Afiliacion-AAAA.xlsx. Ejecutar con `python3 -I`."""
import csv, hashlib, html, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, escribe_tabla

RAW = f'{REPO}/data-raw/seg-social/AFI'
MODO = os.environ.get('MODO', 'descargar')
PAGINA = 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8/EST10/EST290/EST291'
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
ANIOS = range(2021, 2026)


def descarga():
    t = html.unescape(subprocess.run(['curl', '-sS', '--max-time', '60', PAGINA], capture_output=True, text=True, check=True).stdout)
    out = {}
    for m in re.finditer(r'href="([^"]*Afiliaci%C3%B3n\+(\d{4})[^"/]*\.xlsx[^"]*)"', t):
        out[int(m.group(2))] = (m.group(1) if m.group(1).startswith('http') else 'https://www.seg-social.es' + m.group(1))
    return out


def main():
    ori_f = f'{RAW}/origen-edad.json'
    origen = json.load(open(ori_f)) if os.path.exists(ori_f) else {}
    if MODO == 'descargar':
        enlaces = descarga()
        for a in ANIOS:
            f = f'{RAW}/Afiliacion-{a}.xlsx'
            if not os.path.exists(f):
                subprocess.run(['curl', '-sS', '--max-time', '180', '-o', f, enlaces[a]], check=True)
            origen[str(a)] = {'url': enlaces[a].split('?')[0], 'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest()}
        json.dump(origen, open(ori_f, 'w'), indent=1)
    filas = []
    for a in ANIOS:
        ws = openpyxl.load_workbook(f'{RAW}/Afiliacion-{a}.xlsx', read_only=True, data_only=True)['1. EDAD']
        for r in ws.iter_rows(min_row=6, max_row=17, max_col=5, values_only=True):
            tr = re.sub(r'^\d+\.\s*', '', str(r[1] or '')).strip() or 'total'
            if r[0] is not None and str(r[0]).startswith('TOTAL'):
                tr = 'total'
            if not isinstance(r[2], (int, float)):
                continue
            for sx, v in (('hombres', r[2]), ('mujeres', r[3]), ('ambos', r[4])):
                filas.append((a, sx, tr, round(float(v), 1)))
    ruta = f'{REPO}/data/sistema/afiliados-sexo-edad'
    with open(ruta + '.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['anio', 'sexo', 'tramo_edad', 'afiliados_diciembre'])
        for f in filas:
            w.writerow(['' if x is None else x for x in f])
    fuente = {'title': 'Afiliados medios totales: ficheros anuales «Afiliados Medios AAAA» (hoja «1. EDAD», diciembre, sexo y tramo de edad)', 'publisher': SS, 'url': PAGINA}
    escribe_tabla('sistema', 'afiliados-sexo-edad', 'Afiliados medios de diciembre por sexo y tramo de edad, total sistema (2021-2025)',
        'Afiliados medios en alta del mes de diciembre por sexo y tramo de edad, total sistema (todos los regímenes y sistemas especiales), según la hoja «1. EDAD» de cada fichero anual. '
        '«ambos» es la columna Total de la fuente; «total» es la fila de total de todas las edades.',
        [('anio', 'Año (diciembre)', None), ('sexo', 'hombres, mujeres o ambos', None),
         ('tramo_edad', 'Tramo de edad (Entre 16 y 19 años … Mas de 64 años) o total', None),
         ('afiliados_diciembre', 'Afiliados medios de diciembre', 'afiliados')],
        len(filas), fuente, [{'period': a, 'url': origen[a]['url'], 'sha256': origen[a]['sha256']} for a in sorted(origen)], confidence='media',
        notes='El total coincide con el total sistema de la serie mensual por regímenes (comprobado en tests). Años anteriores a 2021: docs/DESCARGAS_MANUALES.md.')
    print('filas', len(filas))


if __name__ == '__main__':
    main()
