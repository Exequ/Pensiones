"""Pensiones contributivas en vigor a 1 de diciembre de cada año, por régimen, clase y sexo.

Lee data-raw/seg-social/REG/AAAA.xlsx (descargados con ss_descarga_reg.py; en modo `local` basta
con colocar ahí el fichero) y escribe data/sistema/pensiones-vigor-regimen-clase-sexo.{csv,json}
(tabla larga) y las series de totales. Ejecutar con `python3 -I`.
"""
import csv, hashlib, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, HOY, escribe_tabla, escribe_series

RAW = f'{REPO}/data-raw/seg-social/REG'
CLASES = {'total pensiones': 'total', 'total': 'total', 'incapacidad permanente': 'incapacidad',
          'jubilación': 'jubilacion', 'viudedad': 'viudedad', 'orfandad': 'orfandad',
          'favor de familiares': 'favor-familiares'}
REGIMENES = [('total sistema', 'total-sistema'), ('general', 'general'), ('trabajadores autónomos', 'autonomos'),
             ('trabajadores  autónomos', 'autonomos'), ('autónomos', 'autonomos'), ('trabajadores autonomos', 'autonomos'),
             ('agrario', 'agrario'), ('trabajadores del mar', 'mar'), ('minería del carbón', 'carbon'),
             ('empleados de hogar', 'hogar'), ('accidentes de trabajo', 'accidentes-trabajo'),
             ('enfermedades profesionales', 'enfermedades-profesionales'), ('sovi', 'sovi'), ('t. del mar', 'mar'), ('m. del carbón', 'carbon'), ('e. de hogar', 'hogar'),
             ('a. de trabajo', 'accidentes-trabajo'), ('e. profesional', 'enfermedades-profesionales')]
SEXOS = {'hombres': 'hombres', 'mujeres': 'mujeres', 'no consta': 'no-consta', 'ambos sexos': 'ambos'}


def norm(s):
    return re.sub(r'\s+', ' ', str(s)).strip().lower().replace('(*)', '').strip()


def regimen(s):
    n = norm(s)
    for k, v in REGIMENES:
        if n.startswith(norm(k)):
            return v
    return None


def numero(v):
    if v is None or isinstance(v, str):
        return None
    return float(v)


def hoja(wb):
    for ws in wb.worksheets:
        if re.search(r'reg3|clase_sexo|género y clase', ws.title, re.I):
            return ws
    if len(wb.worksheets) == 1:
        return wb.worksheets[0]
    raise SystemExit('hoja no encontrada: ' + str(wb.sheetnames))


def filas_anio(anio):
    wb = openpyxl.load_workbook(f'{RAW}/{anio}.xlsx', read_only=True, data_only=True)
    ws = hoja(wb)
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    out = []
    i = 0
    while i < len(rows):
        r = rows[i]
        if r and r[0] and re.match(r'r[eé]g[ií]men', norm(r[0])) and i + 1 < len(rows):
            clase_por_col, sexo_por_col = {}, {}
            cur = None
            for c in range(1, len(r)):
                if r[c] is not None and norm(r[c]) in CLASES:
                    cur = CLASES[norm(r[c])]
                clase_por_col[c] = cur
            sx = rows[i + 1]
            for c in range(1, len(sx)):
                if sx[c] is not None and norm(sx[c]) in SEXOS:
                    sexo_por_col[c] = SEXOS[norm(sx[c])]
            j = i + 2
            while j < len(rows) and rows[j][1] is not None and isinstance(rows[j][1], str):
                j += 1  # fila de unidades (Núm./P.Media)
            while j < len(rows) and rows[j][0] is not None and not re.match(r'r[eé]g[ií]men', norm(rows[j][0])):
                reg = regimen(rows[j][0])
                if reg:
                    for c, sexo in sexo_por_col.items():
                        cl = clase_por_col.get(c)
                        if cl:
                            out.append((anio, reg, cl, sexo, numero(rows[j][c]), numero(rows[j][c + 1])))
                j += 1
            i = j
        else:
            i += 1
    return out


def main():
    filas = []
    origen = json.load(open(f'{RAW}/origen.json'))
    for a in sorted(origen):
        filas += filas_anio(int(a))
    # Cuando el fichero da «ambos sexos» solo (2025) o H/M/no consta (resto), se completa «ambos».
    por = {}
    for a, rg, cl, sx, n, pm in filas:
        por[(a, rg, cl, sx)] = (n, pm)
    for (a, rg, cl, sx), _ in list(por.items()):
        if sx == 'ambos' or (a, rg, cl, 'ambos') in por:
            continue
        tot = sum((por.get((a, rg, cl, s), (None, None))[0] or 0) for s in ('hombres', 'mujeres', 'no-consta'))
        imp = sum(((por.get((a, rg, cl, s), (None, None))[0] or 0) * (por.get((a, rg, cl, s), (None, None))[1] or 0))
                  for s in ('hombres', 'mujeres', 'no-consta'))
        por[(a, rg, cl, 'ambos')] = (tot, round(imp / tot, 1) if tot else None)
    ruta = f'{REPO}/data/sistema/pensiones-vigor-regimen-clase-sexo'
    os.makedirs(f'{REPO}/data/sistema', exist_ok=True)
    n = 0
    with open(ruta + '.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['anio', 'regimen', 'clase', 'sexo', 'numero', 'pension_media_eur_mes'])
        for (a, rg, cl, sx), (num, pm) in sorted(por.items()):
            if num is None and pm is None:
                continue
            w.writerow([a, rg, cl, sx, '' if num is None else int(num), '' if pm is None else round(pm, 2)])
            n += 1
    print('filas', n)
    SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
    fuente = {'title': 'Estadísticas de pensiones: pensiones contributivas en vigor (número y cuantía por sexo, régimen y clase, a 1 de diciembre)',
              'publisher': SS, 'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST24'}
    escribe_tabla('sistema', 'pensiones-vigor-regimen-clase-sexo',
        'Pensiones contributivas en vigor a 1 de diciembre, por régimen, clase y sexo (2008-2025)',
        'Número de pensiones y pensión media mensual (euros) a 1 de diciembre de cada año, por régimen, clase de pensión y sexo. '
        '«total» es la suma de las cinco clases; «ambos» es hombres + mujeres + no consta (en 2024 y 2025 lo da la fuente). '
        'Cada fila procede del fichero REG de diciembre de ese año (ver «origenes»).',
        [('anio', 'Año (1 de diciembre)', None), ('regimen', 'Régimen de la Seguridad Social', None),
         ('clase', 'Clase de pensión (total, incapacidad, jubilacion, viudedad, orfandad, favor-familiares)', None),
         ('sexo', 'hombres, mujeres, no-consta o ambos', None), ('numero', 'Número de pensiones en vigor', 'pensiones'),
         ('pension_media_eur_mes', 'Pensión media mensual', 'euros/mes')],
        n, fuente,
        [{'period': a, 'url': origen[a]['url'], 'sha256': origen[a]['sha256']} for a in sorted(origen)],
        notes='Hasta 2011 existen los regímenes agrario y de empleados de hogar; la Ley 28/2011 los integró en el General en 2012. '
              'La pensión media de «ambos» se calcula ponderando por número cuando la fuente no la da. '
              'En 2008 la suma de regímenes de jubilación «ambos» difiere en 14 pensiones del total del sistema (celdas «no consta» de la fuente).')
    # Series de totales del sistema
    por2 = {(a, rg, cl, sx): v for (a, rg, cl, sx), v in por.items()}
    anios = sorted({k[0] for k in por2})
    def serie(sid, titulo, unidad, idx):
        pts = [{'period': str(a), 'value': por2[(a, 'total-sistema', cl, sx)][idx]} for a in anios if (a, 'total-sistema', cl, sx) in por2 and por2[(a, 'total-sistema', cl, sx)][idx] is not None]
        return {'id': sid, 'title': titulo, 'unit': unidad, 'source': fuente, 'confidence': 'alta',
                'notes': 'Dato a 1 de diciembre. Procedencia por año: data/sistema/pensiones-vigor-regimen-clase-sexo.json (origenes).', 'points': pts}
    NOM = {'total': 'todas las clases', 'incapacidad': 'incapacidad permanente', 'jubilacion': 'jubilación', 'viudedad': 'viudedad', 'orfandad': 'orfandad', 'favor-familiares': 'favor de familiares'}
    for idx, nombre, unidad, pref, desc in ((4, 'Número de pensiones contributivas en vigor', 'pensiones', 'numero', 'Número de pensiones contributivas en vigor a 1 de diciembre'), (5, 'Pensión media mensual', 'euros/mes', 'pension-media', 'Pensión media mensual de las pensiones contributivas en vigor a 1 de diciembre')):
        ss = []
        for cl, nc in NOM.items():
            for sx in ('ambos', 'hombres', 'mujeres'):
                ss.append(serie(f'{cl}-{sx}', f'{nombre}: {nc}, {sx}', unidad, idx - 4 + 4 if False else (0 if idx == 4 else 1)))
        escribe_series('sistema', f'pensiones-vigor-{pref}', f'{nombre}, total sistema, por clase y sexo (2008-2025)', desc + ', total del sistema, por clase y sexo.', ss)


main()
