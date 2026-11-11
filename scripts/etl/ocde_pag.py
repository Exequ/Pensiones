"""A1 de la Fase 1C: OCDE, «Pensions at a Glance» (API SDMX de la OCDE, flujo DSD_PAG@DF_PAG).

Modo `descargar` (por defecto): baja el flujo completo en CSV con etiquetas y su estructura (DSD) a
data-raw/oecd/ (comprimidos); `local` lee lo ya guardado. Escribe en data/internacional/:
ocde-pag (tabla), ocde-pag-codigos (tabla con el literal de cada código) y ocde-espana (series y datos).
Ejecutar con `python3 -I scripts/etl/ocde_pag.py`.
"""
import csv, gzip, hashlib, io, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_tabla, escribe_series

RAW = f'{REPO}/data-raw/oecd'
OUT = f'{REPO}/data/internacional'
MODO = os.environ.get('MODO', 'descargar')
URL_DATOS = ('https://sdmx.oecd.org/public/rest/data/OECD.ELS.SPD,DSD_PAG@DF_PAG,1.0/all?dimensionAtObservation=AllDimensions')
URL_DSD = 'https://sdmx.oecd.org/public/rest/dataflow/OECD.ELS.SPD/DSD_PAG@DF_PAG/1.0?references=all'
URL_WEB = 'https://data-explorer.oecd.org/vis?df[ds]=dsDataExplorer&df[id]=DSD_PAG%40DF_PAG&df[ag]=OECD.ELS.SPD'
OECD = 'OECD (Organización para la Cooperación y el Desarrollo Económicos)'
PAISES = ['ESP', 'DEU', 'FRA', 'ITA', 'SWE', 'PRT', 'NLD', 'DNK', 'POL', 'GBR', 'USA', 'OECD_REP', 'EU27']
SEXO = {'M': 'hombres', 'F': 'mujeres', '_T': 'total', '_Z': 'no-aplica'}


def descarga():
    os.makedirs(RAW, exist_ok=True)
    origen = f'{RAW}/origen.json'
    if os.path.exists(f'{RAW}/DF_PAG.csv.gz') and os.path.exists(f'{RAW}/pag_dsd.xml.gz'):
        return json.load(open(origen))
    if MODO == 'local':
        raise SystemExit('faltan ficheros de data-raw/oecd (modo local)')
    o = {}
    for nombre, url, hdr in (('DF_PAG.csv', URL_DATOS, ['-H', 'Accept: application/vnd.sdmx.data+csv; charset=utf-8; urn=true; labels=both']),
                             ('pag_dsd.xml', URL_DSD, [])):
        crudo = subprocess.run(['curl', '-sS', '-m', '300', *hdr, url], capture_output=True).stdout
        with gzip.open(f'{RAW}/{nombre}.gz', 'wb', 9) as f:
            f.write(crudo)
        o[nombre] = {'url': url, 'fetchedAt': HOY, 'sha256': hashlib.sha256(crudo).hexdigest(), 'bytes': len(crudo)}
    json.dump(o, open(origen, 'w'), indent=1)
    return o


def lee():
    r = csv.DictReader(io.TextIOWrapper(gzip.open(f'{RAW}/DF_PAG.csv.gz'), encoding='utf-8'))
    out = []
    for x in r:
        d = {}
        for k, v in x.items():
            base = k.split(':')[0]
            cod, _, lit = v.partition(': ')
            d[base] = cod if base not in ('TIME_PERIOD', 'OBS_VALUE', 'DATAFLOW') else v
            d[base + '_lit'] = lit
        out.append(d)
    return out


def main():
    origen = descarga()
    filas = [x for x in lee() if x['REF_AREA'] in PAISES]
    filas.sort(key=lambda x: (PAISES.index(x['REF_AREA']), x['MEASURE'], x['SEX'], x['AGE'], x['OPTIONALITY'], x['UNIT_MEASURE'], x['TIME_PERIOD']))
    rows = [[x['REF_AREA'], x['MEASURE'], SEXO[x['SEX']], x['AGE'], x['OPTIONALITY'], x['UNIT_MEASURE'], x['TIME_PERIOD'], x['OBS_VALUE']] for x in filas]
    with open(f'{OUT}/ocde-pag.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['pais', 'medida', 'sexo', 'edad', 'opcionalidad', 'unidad', 'anio', 'valor'])
        w.writerows(rows)
    anios = sorted({int(r[6]) for r in rows})
    print('ocde-pag filas', len(rows), 'años', anios[0], anios[-1])
    # literales de los códigos
    cod = {}
    for x in filas:
        for dim in ('REF_AREA', 'MEASURE', 'UNIT_MEASURE', 'AGE', 'OPTIONALITY', 'SEX'):
            cod[(dim, x[dim])] = x[dim + '_lit']
    crows = sorted([[d, c, l] for (d, c), l in cod.items()])
    with open(f'{OUT}/ocde-pag-codigos.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['dimension', 'codigo', 'literal_en'])
        w.writerows(crows)
    org = [{'period': '2024', 'url': URL_WEB, 'sha256': origen['DF_PAG.csv']['sha256']}]
    fuente = {'title': 'Pensions at a Glance: flujo SDMX DSD_PAG@DF_PAG (OECD.ELS.SPD), edición vigente', 'publisher': OECD, 'url': URL_WEB, 'docId': 'OECD-DSD_PAG-DF_PAG'}
    escribe_tabla('internacional', 'ocde-pag',
        'OCDE, Pensions at a Glance: indicadores de pensiones por país (11 países, media OCDE y UE-27)',
        'Observaciones del flujo SDMX «Pensions at a Glance» (OCDE) para España, Alemania, Francia, Italia, Suecia, Portugal, Países Bajos, Dinamarca, Polonia, Reino Unido, Estados Unidos, la media OCDE (OECD_REP) y la UE-27 (EU27). '
        'Incluye, con el código y el literal de `ocde-pag-codigos`: tasas de reposición bruta y neta (GPRR, NPRR) al 50 %, 100 % y 200 % del salario medio, riqueza de pensiones (GPW, NPW), edad de jubilación actual y futura de quien entra en el mercado laboral a los 22 años (CRPLF22, FRPLF22), '
        'gasto público en pensiones sobre el PIB (PEP, proyecciones PPEP), pobreza de renta de los mayores (OAIP), ratio de dependencia de mayores (OAWAR), esperanza de vida (LE), tasa de empleo (ER), edad efectiva de salida del mercado laboral (ELMEA) y años esperados de pensión (EYLME), entre otros. '
        'Las tasas de reposición de la OCDE son teóricas (carrera completa desde los 22 años, pensión obligatoria, parámetros de 2024) y los niveles de renta son 0,5, 1 y 2 veces el salario medio (la fuente no ofrece 1,5). Los años y unidades son los de cada observación.',
        [('pais', 'Código de área de la OCDE (ISO 3 o agregado: OECD_REP = media OCDE, EU27 = UE-27)', None), ('medida', 'Código de la medida (literal en ocde-pag-codigos)', None),
         ('sexo', 'hombres, mujeres, total o no-aplica', None), ('edad', 'Código de edad de la fuente (_Z = no aplicable)', None),
         ('opcionalidad', 'M = obligatoria, MV = obligatoria y voluntaria, _Z = no aplicable', None), ('unidad', 'Código de unidad (literal en ocde-pag-codigos)', None),
         ('anio', 'Año de la observación (puede ser proyección)', None), ('valor', 'Valor de la observación', None)],
        len(rows), fuente, org, confidence='alta',
        notes='Descargado de la API SDMX pública de la OCDE el 2026-11-11 (todas las observaciones del flujo; aquí solo las de 13 áreas). Todas las observaciones tienen estado «A: Normal value». Los datos brutos están comprimidos en data-raw/oecd/.')
    escribe_tabla('internacional', 'ocde-pag-codigos',
        'OCDE, Pensions at a Glance: literal en inglés de cada código (área, medida, unidad, edad, opcionalidad y sexo)',
        'Literales de la estructura de datos de la OCDE (DSD_PAG) para los códigos que aparecen en `ocde-pag`. Son el literal de cada indicador de la fuente.',
        [('dimension', 'REF_AREA, MEASURE, UNIT_MEASURE, AGE, OPTIONALITY o SEX', None), ('codigo', 'Código de la fuente', None), ('literal_en', 'Literal en inglés de la fuente', None)],
        len(crows), fuente, org, confidence='alta')
    # España: series y datos
    esp = [x for x in filas if x['REF_AREA'] == 'ESP']
    src = {'title': fuente['title'], 'publisher': OECD, 'url': URL_WEB, 'docId': fuente['docId']}
    series, datos = [], []
    por = {}
    for x in esp:
        por.setdefault((x['MEASURE'], x['SEX'], x['AGE'], x['OPTIONALITY'], x['UNIT_MEASURE']), []).append(x)
    for (m, sx, ed, op, un), xs in por.items():
        if len(xs) >= 4:
            lit = xs[0]['MEASURE_lit']
            series.append({'id': f'{m.lower()}-{SEXO[sx]}-{ed.lower().strip("_")}-{op.lower().strip("_")}-{un.lower()}'.replace('--', '-').replace('_', '-'),
                           'title': f'{lit} (España; sexo: {SEXO[sx]}; edad: {ed}; opcionalidad: {op}; unidad: {xs[0]["UNIT_MEASURE_lit"]})', 'unit': xs[0]['UNIT_MEASURE_lit'], 'source': src, 'fetchedAt': HOY, 'confidence': 'alta',
                           'notes': f'Medida OCDE {m}. Puede incluir años proyectados.',
                           'points': [{'period': x['TIME_PERIOD'], 'value': float(x['OBS_VALUE'])} for x in sorted(xs, key=lambda z: z['TIME_PERIOD']) if re.fullmatch(r'\d{4}', x['TIME_PERIOD'])]})
        else:
            for x in xs:
                datos.append({'id': f'{m.lower()}-{SEXO[sx]}-{ed.lower().strip("_")}-{op.lower().strip("_")}-{x["UNIT_MEASURE"].lower()}-{x["TIME_PERIOD"]}'.replace('--', '-').replace('_', '-'),
                              'value': float(x['OBS_VALUE']), 'unit': x['UNIT_MEASURE_lit'], 'period': x['TIME_PERIOD'], 'source': src, 'fetchedAt': HOY, 'confidence': 'alta',
                              'notes': f"{x['MEASURE_lit']}. Sexo: {SEXO[sx]}; opcionalidad: {op}. Literal de la fuente.",
                              'quote': f"{x['REF_AREA']}: {x['MEASURE']} = {x['OBS_VALUE']} ({x['TIME_PERIOD']})", 'location': 'flujo DSD_PAG@DF_PAG, área ESP'})
    # ids únicos
    for lista in (series, datos):
        vistos = {}
        for e in lista:
            vistos[e['id']] = vistos.get(e['id'], 0) + 1
            if vistos[e['id']] > 1:
                e['id'] += f'-{vistos[e["id"]]}'
    out = {'tipo': 'datos', 'id': 'ocde-espana', 'title': 'OCDE, Pensions at a Glance: indicadores de España (series y datos de un año)',
           'description': 'Indicadores de España del flujo «Pensions at a Glance» de la OCDE: series con cuatro o más años y datos de un año (por ejemplo tasas de reposición teóricas y edad de jubilación de 2024). Cada elemento lleva el literal del indicador.',
           'series': series, 'data': datos}
    for e in datos:
        pass
    json.dump(out, open(f'{OUT}/ocde-espana.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{OUT}/ocde-espana.json', 'a').write('\n')
    print('ocde-espana series', len(series), 'datos', len(datos))


if __name__ == '__main__':
    main()
