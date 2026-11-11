"""Eurostat y Comisión Europea (Ageing Report 2024) para la Fase 1B-3.

Descarga (modo `descargar`) o lee (MODO=local) de data-raw/eurostat/ y data-raw/ce-ageing/ y escribe en
data/demografia/ y data/macro/. Ejecutar con `python3 -I scripts/etl/eurostat_ce.py`.
"""
import csv, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_tabla, escribe_series
import openpyxl

API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{ds}?format=JSON&lang=EN&geo=ES{extra}'
WEB = 'https://ec.europa.eu/eurostat/databrowser/view/{ds}/default/table?lang=en'
RAW = f'{REPO}/data-raw/eurostat'
ORIGEN = f'{RAW}/origen-1b3.json'
EUROSTAT = 'Eurostat'
CONJUNTOS = {  # nombre del fichero: (dataset, filtros extra)
    'demo_pjan_ES': ('demo_pjan', ''),
    'proj_25np_ES_BSL': ('proj_25np', '&projection=BSL'),
    'proj_25ndbi_ES_BSL': ('proj_25ndbi', '&projection=BSL'),
    'proj_25naasfr_ES_BSL': ('proj_25naasfr', '&projection=BSL'),
    'proj_25nalexp_ES_BSL': ('proj_25nalexp', '&projection=BSL'),
    'proj_25nanmig_ES_BSL': ('proj_25nanmig', '&projection=BSL'),
    'nama_10_gdp_ES_B1GQ': ('nama_10_gdp', '&na_item=B1GQ'),
    'irt_lt_mcby_a_ES': ('irt_lt_mcby_a', ''),
}


def origen():
    return json.load(open(ORIGEN)) if os.path.exists(ORIGEN) else {}


def descarga(nombre):
    ds, extra = CONJUNTOS[nombre]
    ruta = f'{RAW}/{nombre}.json'
    if not os.path.exists(ruta):
        if os.environ.get('MODO') == 'local':
            raise SystemExit(f'Falta {ruta}')
        url = API.format(ds=ds, extra=extra)
        crudo = subprocess.run(['curl', '-sS', '-m', '300', url], capture_output=True).stdout
        json.loads(crudo)
        open(ruta, 'wb').write(crudo)
        o = origen()
        o[nombre] = {'dataset': ds, 'url': url, 'web': WEB.format(ds=ds), 'fetchedAt': HOY, 'sha256': hashlib.sha256(crudo).hexdigest()}
        json.dump(o, open(ORIGEN, 'w'), indent=1)
    return json.load(open(ruta))


def filas(d):
    """Itera dicts {dimensión: código, 'valor': número} de un JSON-stat de Eurostat."""
    ids, size = d['id'], d['size']
    cats = [list(d['dimension'][k]['category']['index']) for k in ids]
    for pos_s, v in d['value'].items():
        p = int(pos_s)
        r = {}
        for k, n, c in zip(reversed(ids), reversed(size), reversed(cats)):
            r[k] = c[p % n]
            p //= n
        r['valor'] = v
        yield r


def src(nombre, titulo):
    return {'title': titulo, 'publisher': EUROSTAT, 'url': WEB.format(ds=CONJUNTOS[nombre][0]), 'docId': f'eurostat-{CONJUNTOS[nombre][0]}'}


def origenes_eu(nombres):
    o = origen()
    return [{'period': '2025', 'url': o[n]['url'], 'sha256': o[n]['sha256']} for n in nombres]


def escribe_csv(carpeta, id_, cab, rows):
    with open(f'{REPO}/data/{carpeta}/{id_}.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(cab)
        w.writerows(rows)
    return len(rows)


def edad(c):
    if c in ('Y_OPEN',):
        return 100
    if c == 'Y_LT1':
        return 0
    m = re.match(r'Y(\d+)$', c)
    return int(m.group(1)) if m else None


SX = {'T': 'ambos', 'M': 'hombres', 'F': 'mujeres'}


def pts(d):
    return [{'period': a, 'value': v} for a, v in sorted(d.items()) if v is not None]


def demografia_eurostat():
    d = descarga('demo_pjan_ES')
    rows, tot = [], {}
    desc = {}
    for r in filas(d):
        if r['age'] == 'TOTAL':
            tot[(r['sex'], r['time'])] = r['valor']
        elif r['age'] == 'UNK':
            desc[(r['sex'], r['time'])] = r['valor']
        else:
            e = edad(r['age'])
            if e is not None:
                rows.append([int(r['time']), SX[r['sex']], e, r['valor']])
    rows.sort(key=lambda x: (x[0], x[1], x[2]))
    n = escribe_csv('demografia', 'eurostat-poblacion-edad-sexo', ['anio', 'sexo', 'edad', 'poblacion'], rows)
    escribe_tabla('demografia', 'eurostat-poblacion-edad-sexo',
        'Población a 1 de enero por edad simple y sexo según Eurostat, España (1960-2025)',
        'Población a 1 de enero por edad simple (0 a 99 y «100 y más», edad 100) y sexo, España, de Eurostat (demo_pjan), que recoge las cifras que le envía el INE. '
        'Se publica como contraste independiente de data/demografia/poblacion-edad-sexo. Las personas de edad desconocida (código UNK) no se incluyen en las edades.',
        [('anio', 'Año (1 de enero)', None), ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad simple; 100 = «100 y más»', 'años'), ('poblacion', 'Población', 'personas')],
        n, src('demo_pjan_ES', 'Population on 1 January by age and sex (demo_pjan)'), origenes_eu(['demo_pjan_ES']), confidence='alta',
        notes='Eurostat actualizó el conjunto el 25/09/2026. Para 1960-1970 el INE no ofrece población por edad en la tabla utilizada en este proyecto (la serie del INE empieza en 1971).')
    series = [{'id': f'poblacion-total-{SX[s]}', 'title': f'Población total a 1 de enero, {SX[s]} (Eurostat)', 'unit': 'personas',
               'source': src('demo_pjan_ES', 'Population on 1 January by age and sex (demo_pjan)'), 'confidence': 'alta',
               'points': pts({t: v for (s2, t), v in tot.items() if s2 == s})} for s in ('T', 'M', 'F')]
    escribe_series('demografia', 'eurostat-poblacion-total', 'Población total a 1 de enero según Eurostat, España (1960-2025)',
                   'Total publicado por Eurostat en demo_pjan (age = TOTAL), por sexo.', series)


def europop():
    S = 'EUROPOP2025, escenario de referencia (BSL)'
    d = descarga('proj_25np_ES_BSL')
    rows = []
    for r in filas(d):
        e = edad(r['age'])
        if r['age'] == 'TOTAL' or e is None:
            continue
        rows.append([int(r['time']), SX[r['sex']], e, r['valor']])
    rows.sort(key=lambda x: (x[0], x[1], x[2]))
    n = escribe_csv('demografia', 'europop2025-poblacion', ['anio', 'sexo', 'edad', 'poblacion'], rows)
    escribe_tabla('demografia', 'europop2025-poblacion',
        'EUROPOP2025: población proyectada a 1 de enero por edad simple y sexo, España (2025-2100), escenario de referencia',
        'Proyección de población de Eurostat (EUROPOP2025, proj_25np, publicada el 11/06/2026) para España, escenario de referencia «BSL», por edad simple (0 a «100 y más», edad 100) y sexo. '
        'Es una proyección independiente de la del INE, con hipótesis propias de Eurostat y la Comisión Europea. Las variantes (fecundidad, mortalidad y migración altas o bajas) no se descargan.',
        [('anio', 'Año (1 de enero)', None), ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad simple; 100 = «100 y más»', 'años'), ('poblacion', 'Población proyectada', 'personas')],
        n, src('proj_25np_ES_BSL', 'Population on 1st January by age, sex and type of projection (proj_25np)'), origenes_eu(['proj_25np_ES_BSL']), confidence='alta')
    series = []
    d = descarga('proj_25naasfr_ES_BSL')
    series.append({'id': 'europop2025-icf', 'title': 'EUROPOP2025: indicador coyuntural de fecundidad (referencia)', 'unit': 'hijos por mujer',
                   'source': src('proj_25naasfr_ES_BSL', 'Assumptions for fertility rates by age and type of projection (proj_25naasfr)'), 'confidence': 'alta',
                   'notes': 'Código age = TOTAL del conjunto de tasas por edad.',
                   'points': pts({r['time']: r['valor'] for r in filas(d) if r['age'] == 'TOTAL'})})
    d = descarga('proj_25nalexp_ES_BSL')
    for sx in ('M', 'F'):
        for age, nom in (('Y_LT1', 0), ('Y65', 65)):
            series.append({'id': f'europop2025-esperanza-vida-{nom}-{SX[sx]}', 'title': f'EUROPOP2025: esperanza de vida a la edad {nom}, {SX[sx]} (referencia)', 'unit': 'años',
                           'source': src('proj_25nalexp_ES_BSL', 'Projected life expectancy by age, sex and type of projection (proj_25nalexp)'), 'confidence': 'alta',
                           'points': pts({r['time']: r['valor'] for r in filas(d) if r['sex'] == sx and r['age'] == age})})
    d = descarga('proj_25nanmig_ES_BSL')
    series.append({'id': 'europop2025-migracion-neta-total', 'title': 'EUROPOP2025: migración neta, total (referencia)', 'unit': 'personas',
                   'source': src('proj_25nanmig_ES_BSL', 'Assumptions for net migration by age, sex and type of projection (proj_25nanmig)'), 'confidence': 'alta',
                   'points': pts({r['time']: r['valor'] for r in filas(d) if r['sex'] == 'T' and r['age'] == 'TOTAL'})})
    d = descarga('proj_25ndbi_ES_BSL')
    NOM = {'JAN': ('Población a 1 de enero, total', 'personas'), 'LBIRTH': ('Nacimientos', 'personas'), 'DEATH': ('Defunciones', 'personas'),
           'NMIGRAT': ('Migración neta', 'personas'), 'OLDDEP1': ('Tasa de dependencia de mayores (65 o más / 15 a 64)', 'ratio'),
           'DEPRATIO1': ('Tasa de dependencia total (0 a 14 y 65 o más / 15 a 64)', 'ratio'), 'OLDDEP3': ('Tasa de dependencia de mayores (65 o más / 20 a 64)', 'ratio'),
           'DEPRATIO3': ('Tasa de dependencia total (0 a 19 y 65 o más / 20 a 64)', 'ratio'), 'PC_Y65_MAX': ('Proporción de población de 65 o más años', '%'),
           'PC_Y15_64': ('Proporción de población de 15 a 64 años', '%'), 'PC_Y0_14': ('Proporción de población de 0 a 14 años', '%'),
           'MEDAGEPOP': ('Edad mediana de la población', 'años')}
    for ind, (t, u) in NOM.items():
        pp = pts({r['time']: r['valor'] for r in filas(d) if r['indic_de'] == ind})
        if pp:
            series.append({'id': f'europop2025-{ind.lower()}', 'title': f'EUROPOP2025: {t} (referencia)', 'unit': u,
                           'source': src('proj_25ndbi_ES_BSL', 'Demographic balances and indicators by type of projection (proj_25ndbi)'), 'confidence': 'alta', 'points': pp})
    escribe_series('demografia', 'europop2025-indicadores', 'EUROPOP2025: hipótesis e indicadores para España (2025-2100), escenario de referencia',
                   'Hipótesis de fecundidad, mortalidad y migración e indicadores demográficos de Eurostat (EUROPOP2025, escenario de referencia) para España.', series)


def macro_eurostat():
    d = descarga('nama_10_gdp_ES_B1GQ')
    UN = {'CP_MEUR': ('pib-corriente', 'PIB a precios de mercado, precios corrientes (Eurostat)', 'millones de euros'),
          'CLV20_MEUR': ('pib-volumen-2020', 'PIB a precios de mercado, volumen encadenado (referencia 2020), millones de euros (Eurostat)', 'millones de euros de 2020'),
          'PD20_EUR': ('pib-deflactor-2020', 'Deflactor implícito del PIB, índice 2020 = 100 (Eurostat)', 'índice 2020 = 100')}
    ss = []
    for u, (sid, t, un) in UN.items():
        pp = pts({r['time']: r['valor'] for r in filas(d) if r['unit'] == u})
        if pp:
            ss.append({'id': sid, 'title': t, 'unit': un, 'source': src('nama_10_gdp_ES_B1GQ', 'Gross domestic product (GDP) and main components, annual data (nama_10_gdp), B1GQ'),
                       'confidence': 'alta', 'points': pp})
    escribe_series('macro', 'eurostat-pib', 'PIB de España según Eurostat (contraste con el INE)', 'PIB a precios de mercado (B1GQ) de Eurostat, corrientes, en volumen y deflactor, para contrastar con la Contabilidad Nacional del INE.', ss)
    d = descarga('irt_lt_mcby_a_ES')
    print('irt dims', {k: len(v['category']['index']) for k, v in d['dimension'].items()}, d['size'])
    pp = pts({r['time']: r['valor'] for r in filas(d)})
    escribe_series('macro', 'rendimiento-deuda-10-anios', 'Rendimiento de la deuda pública a 10 años, España (Eurostat, criterio de convergencia de Maastricht)',
                   'Serie anual de tipos de interés a largo plazo (bonos del Estado a 10 años) usada como criterio de convergencia de la UEM (irt_lt_mcby_a).',
                   [{'id': 'rendimiento-deuda-10-anios', 'title': 'Tipo de interés a largo plazo (deuda pública a 10 años), media anual', 'unit': '% anual',
                     'source': src('irt_lt_mcby_a_ES', 'EMU convergence criterion series - annual data (irt_lt_mcby_a)'), 'confidence': 'alta', 'points': pp}])


def ageing_report():
    ruta = f'{REPO}/data-raw/ce-ageing/anexo-estadistico-2024.xlsx'
    wb = openpyxl.load_workbook(ruta, data_only=True, read_only=True)
    ws = wb['cross-country_tables']
    tablas, cur, anios = {}, None, None
    for r in ws.iter_rows(values_only=True):
        b = r[1] if len(r) > 1 else None
        if isinstance(b, str) and b.startswith('Table II.1.'):
            m = re.match(r'Table II\.1\.(\d+): (.*)', b)
            cur = (int(m.group(1)), m.group(2).strip()); anios = None
        elif cur and anios is None and any(isinstance(x, (int, str)) and re.fullmatch(r'20\d\d', str(x)) for x in r):
            anios = {i: str(x) for i, x in enumerate(r) if re.fullmatch(r'20\d\d', str(x))}
        elif cur and anios and b == 'ES':
            tablas[cur] = {anios[i]: r[i] for i in anios if isinstance(r[i], (int, float))}
    print('Ageing Report: tablas con fila ES', len(tablas))
    SRC = {'title': 'The 2024 Ageing Report: Economic and Budgetary Projections for the EU Member States (2022-2070), Statistical annex: cross-country tables',
           'publisher': 'Comisión Europea (DG ECFIN) y Comité de Política Económica (Grupo de Trabajo sobre Envejecimiento)',
           'url': 'https://economy-finance.ec.europa.eu/publications/2024-ageing-report-economic-and-budgetary-projections-eu-member-states-2022-2070_en',
           'docId': 'ip279'}
    UNID = [(r'\(thousand\)|in thousands|thousands', 'miles'), (r'\(million\)|millions', 'millones'), (r'% of GDP', '% del PIB'), (r'growth rate', 'tasa de crecimiento (%)'),
            (r'as % of|share|Share', '%'), (r'rate|Rate', '%'), (r'ratio', '%')]
    ss = []
    for (n, t), vals in sorted(tablas.items()):
        if n > 84 and n not in (135,):
            continue
        u = 'según la tabla'
        for pat, nm in UNID:
            if re.search(pat, t):
                u = nm
                break
        if re.search(r'Life expectancy', t):
            u = 'años'
        if re.search(r'Fertility', t):
            u = 'hijos por mujer'
        if re.search(r'exit age', t):
            u = 'años'
        if re.search(r'Support ratio', t):
            u = 'cotizantes por 100 pensionistas'
        if re.search(r'accrual rate|Benefit ratio|replacement rate', t):
            u = '%'
        if re.search(r'contributory period', t):
            u = 'años'
        if not vals:
            continue
        ss.append({'id': f'ageing-report-2024-ii-1-{n}', 'title': f'Ageing Report 2024, tabla II.1.{n}: {t}, España', 'unit': u, 'source': SRC, 'confidence': 'alta',
                   'notes': 'Proyecciones del escenario de referencia (baseline) del Ageing Report 2024 (2022-2070). Unidad deducida del título de la tabla; ver el anexo original para el detalle.',
                   'points': [{'period': a, 'value': float(v)} for a, v in sorted(vals.items())]})
    escribe_series('demografia', 'ageing-report-2024-espana', 'Ageing Report 2024 de la Comisión Europea: proyecciones para España (2022-2070)',
                   'Hipótesis demográficas y macroeconómicas, población, tasas de dependencia, mercado laboral y gasto en pensiones públicas sobre PIB (y otras variables) del Ageing Report 2024, tablas horizontales del anexo estadístico, fila de España.', ss)


if __name__ == '__main__':
    os.makedirs(f'{REPO}/data/macro', exist_ok=True)
    demografia_eurostat(); europop(); macro_eurostat(); ageing_report()
