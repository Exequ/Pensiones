"""A2 de la Fase 1C: indicadores de Eurostat para la comparativa internacional.

Gasto en prestaciones de vejez y supervivencia (ESSPROS, spr_exp_func), riesgo de pobreza o exclusión (ilc_peps01n),
tasa de empleo de 55 a 64 años (lfsi_emp_a) y duración de la vida laboral (lfsi_dwl_a). Descarga en modo `descargar`
o lee lo guardado en data-raw/eurostat/int/ (MODO=local). Escribe data/internacional/eurostat-indicadores (tabla)
y eurostat-espana (series). Ejecutar con `python3 -I scripts/etl/eurostat_int.py`.
"""
import csv, hashlib, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_tabla
sys.path.insert(0, os.path.dirname(__file__))
from eurostat_ce import filas

RAW = f'{REPO}/data-raw/eurostat/int'
OUT = f'{REPO}/data/internacional'
API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{q}&format=JSON&lang=EN'
WEB = 'https://ec.europa.eu/eurostat/databrowser/view/{ds}/default/table?lang=en'
GEO = 'geo=ES&geo=DE&geo=FR&geo=IT&geo=SE&geo=PT&geo=NL&geo=DK&geo=PL&geo=UK&geo=EU27_2020'
PAIS = {'ES': 'ESP', 'DE': 'DEU', 'FR': 'FRA', 'IT': 'ITA', 'SE': 'SWE', 'PT': 'PRT', 'NL': 'NLD', 'DK': 'DNK', 'PL': 'POL', 'UK': 'GBR', 'EU27_2020': 'EU27'}
SX = {'T': 'total', 'M': 'hombres', 'F': 'mujeres'}
CONJ = {
    'spr_exp_func': f'spr_exp_func?{GEO}&spfunc=OLD&spfunc=SRV&spfunc=OLD_SRV&spfunc=TOTAL&unit=PC_GDP&unit=MIO_EUR',
    'ilc_peps01n': f'ilc_peps01n?{GEO}&age=Y_GE65&age=TOTAL&sex=T&unit=PC',
    'lfsi_emp_a': f'lfsi_emp_a?{GEO}&age=Y55-64&indic_em=EMP_LFS&unit=PC_POP',
    'lfsi_dwl_a': f'lfsi_dwl_a?{GEO}',
}
LIT = {'spr_exp_func': 'Expenditure on social benefits by function (spr_exp_func)', 'ilc_peps01n': 'Persons at risk of poverty or social exclusion by age and sex (ilc_peps01n)',
       'lfsi_emp_a': 'Employment and labour force by sex and age, annual data (lfsi_emp_a)', 'lfsi_dwl_a': 'Duration of working life (lfsi_dwl_a)'}


def carga(ds):
    os.makedirs(RAW, exist_ok=True)
    ruta = f'{RAW}/{ds}.json'
    if not os.path.exists(ruta):
        if os.environ.get('MODO') == 'local':
            raise SystemExit('falta ' + ruta)
        url = API.format(q=CONJ[ds])
        crudo = subprocess.run(['curl', '-sS', '-m', '120', url], capture_output=True).stdout
        d = json.loads(crudo)
        assert 'error' not in d, d
        open(ruta, 'wb').write(crudo)
        o = json.load(open(f'{RAW}/origen.json')) if os.path.exists(f'{RAW}/origen.json') else {}
        o[ds] = {'url': url, 'web': WEB.format(ds=ds), 'fetchedAt': HOY, 'sha256': hashlib.sha256(crudo).hexdigest(), 'actualizado': d.get('updated', '')[:10]}
        json.dump(o, open(f'{RAW}/origen.json', 'w'), indent=1)
    return json.load(open(ruta))


def main():
    rows = []
    for ds in CONJ:
        d = carga(ds)
        for r in filas(d):
            if r['valor'] is None:
                continue
            geo = PAIS[r['geo']]
            if ds == 'spr_exp_func':
                rows.append(['gasto-' + r['spfunc'].lower().replace('_', '-'), geo, 'no-aplica', 'no-aplica', r['unit'], r['time'], r['valor']])
            elif ds == 'ilc_peps01n':
                rows.append(['pobreza-o-exclusion', geo, 'total', r['age'], r['unit'], r['time'], r['valor']])
            elif ds == 'lfsi_emp_a':
                rows.append(['empleo-55-64', geo, SX[r['sex']], r['age'], r['unit'], r['time'], r['valor']])
            else:
                rows.append(['duracion-vida-laboral', geo, SX[r['sex']], 'Y15+', r['unit'], r['time'], r['valor']])
    rows.sort(key=lambda r: (r[0], r[1], r[2], r[3], r[4], r[5]))
    with open(f'{OUT}/eurostat-indicadores.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['indicador', 'pais', 'sexo', 'edad', 'unidad', 'anio', 'valor'])
        w.writerows(rows)
    print('eurostat-indicadores filas', len(rows), 'años', min(r[5] for r in rows), max(r[5] for r in rows))
    o = json.load(open(f'{RAW}/origen.json'))
    org = [{'period': '2025', 'url': o[ds]['web'], 'sha256': o[ds]['sha256']} for ds in CONJ]
    fuente = {'title': 'Eurostat: spr_exp_func, ilc_peps01n, lfsi_emp_a y lfsi_dwl_a', 'publisher': 'Eurostat', 'url': WEB.format(ds='spr_exp_func'), 'docId': 'eurostat-int'}
    escribe_tabla('internacional', 'eurostat-indicadores',
        'Eurostat: gasto en pensiones, pobreza o exclusión de mayores, empleo de 55 a 64 años y duración de la vida laboral (11 áreas)',
        'Indicadores de Eurostat para España, Alemania, Francia, Italia, Suecia, Portugal, Países Bajos, Dinamarca, Polonia, Reino Unido (hasta donde Eurostat lo publica) y UE-27. '
        '«gasto-old», «gasto-srv» y «gasto-old-srv»: prestaciones de vejez, de supervivencia y de ambas, y «gasto-total» todas las prestaciones sociales (ESSPROS, spr_exp_func; unidades PC_GDP = % del PIB y MIO_EUR = millones de euros). '
        '«pobreza-o-exclusion»: personas en riesgo de pobreza o exclusión social (indicador AROPE), de 65 o más años (Y_GE65) y del total de la población, en % (ilc_peps01n). '
        '«empleo-55-64»: tasa de empleo de 55 a 64 años, en % de la población, por sexo (lfsi_emp_a). «duracion-vida-laboral»: duración de la vida laboral en años, por sexo (lfsi_dwl_a). '
        'Eurostat no ofrece por esta vía una serie de la edad media de salida del mercado laboral (los códigos de conjunto probados devuelven «no disponible»); esa edad está en la tabla de la OCDE (medida ELMEA).',
        [('indicador', 'gasto-old, gasto-srv, gasto-old-srv, gasto-total, pobreza-o-exclusion, empleo-55-64 o duracion-vida-laboral', None), ('pais', 'ESP, DEU, FRA, ITA, SWE, PRT, NLD, DNK, POL, GBR o EU27', None),
         ('sexo', 'total, hombres, mujeres o no-aplica', None), ('edad', 'Y_GE65, TOTAL, Y55-64, Y15+ o no-aplica', None), ('unidad', 'PC_GDP, MIO_EUR, PC, PC_POP o YR', None),
         ('anio', 'Año', None), ('valor', 'Valor', None)],
        len(rows), fuente, org, confidence='alta',
        notes='Descarga de la API de Eurostat el 2026-11-11. El Reino Unido solo tiene datos hasta donde Eurostat los publica tras 2020. Los datos brutos están en data-raw/eurostat/int/.')
    # series de España
    es = [r for r in rows if r[1] == 'ESP']
    por = {}
    for ind, pais, sx, ed, un, a, v in es:
        por.setdefault((ind, sx, ed, un), []).append({'period': a, 'value': v})
    src = lambda ds: {'title': LIT[ds], 'publisher': 'Eurostat', 'url': WEB.format(ds=ds), 'docId': f'eurostat-{ds}'}
    DS = {'gasto': 'spr_exp_func', 'pobreza': 'ilc_peps01n', 'empleo': 'lfsi_emp_a', 'duracion': 'lfsi_dwl_a'}
    series = []
    for (ind, sx, ed, un), pts in sorted(por.items()):
        series.append({'id': f'{ind}-{sx}-{ed.lower()}-{un.lower()}'.replace('_', '-').replace('+', ''), 'title': f'{ind} (España; sexo {sx}; edad {ed}; unidad {un})', 'unit': {'PC_GDP': '% del PIB', 'MIO_EUR': 'millones de euros', 'PC': '%', 'PC_POP': '% de la población', 'YR': 'años'}[un],
                       'source': src(DS[ind.split('-')[0]]), 'fetchedAt': HOY, 'confidence': 'alta', 'points': sorted(pts, key=lambda p: p['period'])})
    out = {'tipo': 'datos', 'id': 'eurostat-espana', 'title': 'Eurostat: indicadores de pensiones, pobreza de mayores y empleo para España',
           'description': 'Series de España de Eurostat: gasto en pensiones de vejez y supervivencia (% del PIB y millones de euros), riesgo de pobreza o exclusión de mayores de 65 años, tasa de empleo de 55 a 64 años y duración de la vida laboral.', 'series': series}
    json.dump(out, open(f'{OUT}/eurostat-espana.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{OUT}/eurostat-espana.json', 'a').write('\n')
    print('eurostat-espana series', len(series))


if __name__ == '__main__':
    main()
