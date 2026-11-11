"""C2 de la Fase 1B-3: descargas manuales del autor en data-raw/mites/ (BEL del MITES y anuarios).

Modo local (los ficheros los coloca el autor): PEN-1, PEN-2, PEN-10 a PEN-13 y PEN-31 del Boletín de
Estadísticas Laborales (.xls) y PEN-1 de los anuarios 2022 y 2025 (.xlsx). Escribe en data/sistema/:
mites-bel-pensiones, mites-bel-pen31-cuantias y mites-anuario-pen1-sexo-clase. Los contrastes con lo que ya
hay (pensiones de diciembre de la Seguridad Social, mínimas y máximas de data/parametros) se escriben
en data-raw/mites/contrastes.json y los recoge verificacion_1b3.py. Ejecutar con `python3 -I`.
"""
import csv, hashlib, json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl, xlrd
from comun import REPO, escribe_tabla

RAW = f'{REPO}/data-raw/mites'
OUT = f'{REPO}/data/sistema'
MITES = 'Ministerio de Trabajo y Economía Social (MITES), Boletín de Estadísticas Laborales'
URL_BEL = 'https://www.mites.gob.es/estadisticas/bel/PEN/index.htm'
URL_ANU = 'https://www.mites.gob.es/estadisticas/anuarios/index.htm'
MESES = {'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6, 'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12}


def sha(f):
    return hashlib.sha256(open(f, 'rb').read()).hexdigest()


def slug(s):
    s = unicodedata.normalize('NFKD', ' '.join(str(s).split())).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\(\d\)', '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def num(v):
    return None if v in ('', '-', None) or isinstance(v, str) else float(v)


def parsea_bel(nombre, hoja):
    s = xlrd.open_workbook(f'{RAW}/{nombre}.xls').sheet_by_index(hoja)
    # fila de cabecera: la que tiene «TOTAL» en la columna 1; fila de «Número» marca el inicio de los datos
    h = next(i for i in range(s.nrows) if str(s.row_values(i)[1]).strip().upper().startswith('TOTAL') or (hoja and str(s.row_values(i)[1]).strip()[:2] in ('R.', 'RE', 'R '))) if hoja == 0 else \
        next(i for i in range(4, s.nrows) if any(str(c).strip().startswith('R.E') or 'ACC' in str(c) for c in s.row_values(i)[1:]))
    fn = next(i for i in range(h, s.nrows) if str(s.row_values(i)[1]).strip().lower().startswith('n'))
    cols = {}
    for c in range(1, s.ncols, 2):
        partes = [str(s.row_values(i)[c]).strip() for i in range(h, fn - 1) if str(s.row_values(i)[c]).strip() and not re.match(r'^\(?(media|anual)\)?$', str(s.row_values(i)[c]).strip())]
        if partes:
            cols[c] = slug(' '.join(partes))
    filas, anio = [], None
    for i in range(fn + 2, s.nrows):
        a = str(s.row_values(i)[0]).strip()
        m = re.match(r'^(\d{4})\.{2,}$', a)
        if m:
            per, tipo = m.group(1), 'anual'
        elif re.match(r'^(\d{4}):$', a):
            anio = int(a[:4]); continue
        elif re.match(r'^\(ENE-[A-Z]{3}\)\.*$', a):
            per, tipo = f'{anio}-ene-{a[5:8].lower()}', 'acumulado'
        elif re.match(r'^[A-Z]{3}\.{2,}$', a) and a[:3] in MESES:
            per, tipo = f'{anio}-{MESES[a[:3]]:02d}', 'mes'
        else:
            continue
        for c, lab in cols.items():
            n, im = num(s.row_values(i)[c]), num(s.row_values(i)[c + 1] if c + 1 < s.ncols else None)
            if n is not None or im is not None:
                filas.append([nombre.upper().replace('PEN', 'PEN-'), per, tipo, lab, n, im])
    return filas


def bel():
    filas = []
    for nombre, hojas in (('pen1', (0,)), ('pen2', (0, 1)), ('pen10', (0,)), ('pen11', (0,)), ('pen12', (0, 1)), ('pen13', (0, 1))):
        for h in hojas:
            f = parsea_bel(nombre, h)
            print(nombre, h, len(f), f[0][1], f[-1][1])
            filas += f
    rows = [[t, p, tp, c, ('' if n is None else repr(n)), ('' if im is None else repr(im))] for t, p, tp, c, n, im in filas]
    with open(f'{OUT}/mites-bel-pensiones.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['tabla', 'periodo', 'tipo_periodo', 'concepto', 'numero_miles', 'importe_medio_eur_mes'])
        w.writerows(rows)
    org = [{'period': '2025', 'url': URL_BEL, 'sha256': sha(f'{RAW}/{n}.xls')} for n in ('pen1', 'pen2', 'pen10', 'pen11', 'pen12', 'pen13')]
    escribe_tabla('sistema', 'mites-bel-pensiones',
        'MITES, Boletín de Estadísticas Laborales: pensiones contributivas por clase y régimen, y altas y bajas (PEN-1, PEN-2, PEN-10 a PEN-13; 2016-2026)',
        'Número de pensiones (miles) e importe medio (euros/mes) por clase (PEN-1, PEN-10, PEN-11) y por régimen (PEN-2, PEN-12, PEN-13). PEN-1 y PEN-2: pensiones en vigor el primer día de cada mes; '
        'el valor «anual» es la media anual de esas cifras mensuales. PEN-10 a PEN-13: altas y bajas del período. Cobertura del fichero descargado: años 2016-2025 (anual), acumulados enero-octubre de 2025 y 2026 y meses de 2025 (mayo a diciembre) y 2026 (enero a octubre). '
        'tipo_periodo: anual, mes o acumulado. El BEL no publica el sexo ni la edad.',
        [('tabla', 'Tabla del BEL (PEN-1 …)', None), ('periodo', 'Año (AAAA), mes (AAAA-MM) o acumulado (AAAA-ene-oct)', None), ('tipo_periodo', 'anual, mes o acumulado', None),
         ('concepto', 'Clase de pensión o régimen, normalizado desde el rótulo de la fuente', None), ('numero_miles', 'Número de pensiones', 'miles de pensiones'),
         ('importe_medio_eur_mes', 'Importe medio mensual', 'euros/mes')],
        len(rows), {'title': 'Boletín de Estadísticas Laborales: pensiones contributivas del sistema de la Seguridad Social (PEN-1, PEN-2, PEN-10, PEN-11, PEN-12, PEN-13)', 'publisher': MITES, 'url': URL_BEL},
        org, confidence='alta',
        notes='Descarga manual del autor (data-raw/mites/*.xls). Los rótulos de régimen cambian con la Ley 28/2011 (integración de los regímenes agrario y de hogar en el General desde 2012).')
    return filas


def pen31():
    wb = xlrd.open_workbook(f'{RAW}/pen31.xls')
    s0, s1 = wb.sheet_by_index(0), wb.sheet_by_index(1)
    cel = []   # (anio, concepto, valor)
    def anio_fila(r):
        a = r[0]
        return int(float(a)) if isinstance(a, float) or str(a).strip().isdigit() else None
    bloque1 = [i for i in range(s0.nrows) if anio_fila(s0.row_values(i)) and i < 49]
    bloque2 = [i for i in range(s0.nrows) if anio_fila(s0.row_values(i)) and i > 49]
    M1 = {1: 'maxima', 2: 'ip-gran-invalidez-conyuge-cargo', 3: 'ip-gran-invalidez-unipersonal', 4: 'ip-gran-invalidez-conyuge-no-cargo',
          5: 'ip-absoluta-65-conyuge-cargo', 6: 'ip-absoluta-65-unipersonal', 7: 'ip-absoluta-65-conyuge-no-cargo', 8: 'ip-total-60-64-conyuge-cargo', 9: 'ip-total-60-64-unipersonal'}
    M2 = {1: 'jub65-conyuge-cargo', 2: 'jub65-unipersonal', 3: 'jub65-conyuge-no-cargo', 4: 'jub-menor65-conyuge-cargo', 6: 'jub-menor65-unipersonal', 7: 'jub-menor65-conyuge-no-cargo', 8: 'viud-cargas-familiares'}
    for i in bloque1:
        r = s0.row_values(i)
        for c, nom in M1.items():
            if c < len(r) and num(r[c]) is not None:
                cel.append((anio_fila(r), nom, num(r[c])))
    for i in bloque2:
        r = s0.row_values(i)
        for c, nom in M2.items():
            if c < len(r) and num(r[c]) is not None:
                cel.append((anio_fila(r), nom, num(r[c])))
    # hoja de conclusión: orfandad, favor familiares y SOVI (columnas por posición, ver cabecera)
    M3 = {1: 'orf-no-absoluta-sin-discapacidad', 2: 'orf-no-absoluta-menor18-discapacidad', 3: 'orf-absoluta-sin-discapacidad', 4: 'orf-absoluta-menor18-discapacidad',
          5: 'fam-concurrente-con-viudedad-u-orfandad', 6: 'fam-no-concurrente-65-o-mas', 7: 'fam-no-concurrente-menor65', 8: 'sovi'}
    for i in range(s1.nrows):
        r = s1.row_values(i)
        a = anio_fila(r) if i < 47 else None
        if a:
            for c, nom in M3.items():
                if c < len(r) and num(r[c]) is not None:
                    cel.append((a, nom, num(r[c])))
    cel.sort()
    rows = [[a, c, repr(v)] for a, c, v in cel]
    with open(f'{OUT}/mites-bel-pen31-cuantias.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['anio', 'concepto', 'euros_anio'])
        w.writerows(rows)
    escribe_tabla('sistema', 'mites-bel-pen31-cuantias',
        'MITES, BEL PEN-31: cuantía máxima y cuantías mínimas de las pensiones contributivas, 1990-2026',
        'Cuantía máxima y cuantías mínimas por clase y situación familiar, en euros al año, tal como las publica el BEL (PEN-31), 1990-2026. «maxima» es la pensión máxima anual; el resto son mínimas '
        '(ip = incapacidad permanente, jub = jubilación, viud = viudedad, orf = orfandad, fam = favor de familiares). La asignación de columnas a conceptos se ha hecho por la cabecera del fichero; '
        'las celdas vacías o «-» no se incluyen. Hay columnas de la hoja que no se han podido asignar con seguridad (ver notas) y no se publican.',
        [('anio', 'Año', None), ('concepto', 'Concepto (máxima o mínima por clase y situación)', None), ('euros_anio', 'Cuantía anual', 'euros/año')],
        len(rows), {'title': 'Boletín de Estadísticas Laborales: PEN-31 cuantías máxima y mínima de las pensiones contributivas', 'publisher': MITES, 'url': URL_BEL},
        [{'period': '2026', 'url': URL_BEL, 'sha256': sha(f'{RAW}/pen31.xls')}], confidence='alta',
        notes='Descarga manual del autor (data-raw/mites/pen31.xls). El fichero tiene 10 columnas en la primera hoja y las cabeceras combinadas desplazan algunas celdas; se publican solo las columnas cuya cabecera es inequívoca. '
              'Contraste con data/parametros en docs/INFORME_VERIFICACION.md y docs/DISCREPANCIAS.md.')
    return cel


def contraste_pen31(cel):
    """Compara PEN-31 con data/parametros (máxima y mínimas). Devuelve estadísticas y diferencias."""
    P = f'{REPO}/data/parametros'
    def v(f):
        return {d['id']: d['value'] for d in json.load(open(f'{P}/{f}.json'))['data']}
    mins = {}
    for f in ('pension-minima-jubilacion', 'pension-minima-incapacidad', 'pension-minima-viudedad', 'pension-minima-orfandad-familiares'):
        mins.update(v(f))
    maxi = {int(k): val * 14 for k, val in v('pension-maxima').items()}
    por_anio = {}
    for a, c, x in cel:
        por_anio.setdefault(a, []).append((c, x))
    MAP = {'ip-gran-invalidez-conyuge-cargo': 'ip-gran-invalidez-conyuge-cargo', 'ip-gran-invalidez-unipersonal': 'ip-gran-invalidez-unipersonal',
           'ip-gran-invalidez-conyuge-no-cargo': 'ip-gran-invalidez-conyuge-no-cargo', 'ip-absoluta-65-conyuge-cargo': 'ip-absoluta-conyuge-cargo',
           'ip-absoluta-65-unipersonal': 'ip-absoluta-unipersonal', 'ip-absoluta-65-conyuge-no-cargo': 'ip-absoluta-conyuge-no-cargo',
           'jub65-conyuge-cargo': 'jub65-conyuge-cargo', 'jub65-unipersonal': 'jub65-unipersonal', 'jub65-conyuge-no-cargo': 'jub65-conyuge-no-cargo',
           'jub-menor65-conyuge-cargo': 'jub-menor65-conyuge-cargo', 'jub-menor65-unipersonal': 'jub-menor65-unipersonal',
           'jub-menor65-conyuge-no-cargo': 'jub-menor65-conyuge-no-cargo', 'viud-cargas-familiares': 'viud-cargas-familiares-unipersonal'}
    comp, igual, difs, sin_dato = 0, 0, [], 0
    for a, lista in sorted(por_anio.items()):
        for c, x in lista:
            if c == 'maxima':
                ref = maxi.get(a)
            elif c in MAP:
                ref = mins.get(f'{a}-{MAP[c]}')
            else:
                continue
            if ref is None:
                sin_dato += 1
                continue
            comp += 1
            if abs(ref - x) < 0.05:
                igual += 1
            else:
                difs.append({'anio': a, 'concepto': c, 'bel': x, 'parametros': ref})
    return {'comparadas': comp, 'iguales': igual, 'sin_dato_en_parametros': sin_dato, 'diferencias': difs}


def anuario():
    rows = []
    org = []
    for fich, ed in (('PEN-anuario2022.xlsx', 2022), ('PEN-anuario2025.xlsx', 2025)):
        ws = openpyxl.load_workbook(f'{RAW}/{fich}', read_only=True, data_only=True)['PEN-1']
        filas = [list(r) for r in ws.iter_rows(values_only=True)]
        # años de cabecera (fila con «2024», «2025» repetidos)
        for r in filas:
            ys = [x for x in r if isinstance(x, (int, str)) and re.fullmatch(r'20\d\d', str(x).strip())]
            if len(ys) >= 4:
                anios = [int(str(x).strip()) for x in ys]
                break
        sexo = 'ambos'
        for r in filas:
            lab = next((str(x).strip() for x in r if isinstance(x, str) and x.strip()), '')
            vals = [x for x in r if isinstance(x, (int, float))]
            if lab.upper().startswith('VARONES'):
                sexo = 'hombres'
            elif lab.upper().startswith('MUJERES'):
                sexo = 'mujeres'
            m = re.match(r'^(TOTAL|Incapacidad|Jubilaci|Viudedad|Orfandad|Favor)', lab, re.I)
            if m and len(vals) >= 6:
                clase = {'total': 'total', 'incap': 'incapacidad', 'jubil': 'jubilacion', 'viude': 'viudedad', 'orfan': 'orfandad', 'favor': 'favor-familiares'}[lab[:5].lower()]
                n = len(anios) // 3
                for k, a in enumerate(anios[:n]):
                    rows.append([ed, a, sexo, clase, repr(vals[k]), repr(vals[n + k]), repr(vals[2 * n + k])])
        org.append({'period': str(max(anios)), 'url': URL_ANU, 'sha256': sha(f'{RAW}/{fich}')})
    rows = sorted({tuple(r) for r in rows})
    with open(f'{OUT}/mites-anuario-pen1-sexo-clase.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['edicion', 'anio', 'sexo', 'clase', 'pensiones', 'importe_medio_eur_mes', 'pensionistas'])
        w.writerows(rows)
    escribe_tabla('sistema', 'mites-anuario-pen1-sexo-clase',
        'MITES, Anuario de Estadísticas: pensiones, importe medio y pensionistas (media anual) por sexo y clase (PEN-1; 2020 a 2025)',
        'Pensiones (número), importe medio (euros/mes) y pensionistas (personas) como media anual, por sexo y clase de pensión, según la tabla PEN-1 de los anuarios de 2022 y 2025 (cada edición recoge dos años). '
        '«ambos» incluye los de sexo «no consta». Los pensionistas se calculan sobre los que perciben al menos una pensión de esa clase (nota (1) de la fuente: una persona con pensiones de varias clases cuenta en cada una), por lo que no suman el total.',
        [('edicion', 'Edición del anuario (2022 o 2025)', None), ('anio', 'Año de referencia', None), ('sexo', 'ambos, hombres o mujeres', None), ('clase', 'total, incapacidad, jubilacion, viudedad, orfandad o favor-familiares', None),
         ('pensiones', 'Número de pensiones (media anual)', 'pensiones'), ('importe_medio_eur_mes', 'Importe medio de las pensiones', 'euros/mes'), ('pensionistas', 'Pensionistas (media anual)', 'personas')],
        len(rows), {'title': 'Anuario de Estadísticas del MITES: pensiones contributivas, PEN-1 (pensiones e importe medio y pensionistas por sexo y clase)', 'publisher': MITES, 'url': URL_ANU},
        org, confidence='alta',
        notes='Descarga manual del autor (data-raw/mites/PEN-anuario2022.xlsx y PEN-anuario2025.xlsx). El resto de tablas PEN del anuario (PEN-2 a PEN-28) no se han procesado: ver docs/ESTADO_FASE_1B.md.')
    return rows


def main():
    f = bel()
    cel = pen31()
    c = contraste_pen31(cel)
    print('PEN-31 contraste', {k: (v if k != 'diferencias' else len(v)) for k, v in c.items()})
    for d in c['diferencias'][:12]:
        print('  ', d)
    a = anuario()
    print('anuario filas', len(a))
    json.dump({'pen31': c}, open(f'{RAW}/contrastes.json', 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
