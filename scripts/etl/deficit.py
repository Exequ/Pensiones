"""Fase 1B-2: saldos y definiciones de déficit de la Seguridad Social.

1. Capacidad (+) / necesidad (-) de financiación SEC 2010 de los fondos de la Seguridad Social (S.1314),
   ingresos y gastos totales: Eurostat, gov_10a_main (modo `descargar` por API, o `local` con los JSON en
   data-raw/eurostat/). Escribe data/sistema/deficit-sec-fondos-seguridad-social.json.
2. Saldo presupuestario del Sistema de la Seguridad Social, derivado de data/sistema/presupuesto-ss-ejecucion.csv
   (T4 = ejercicio completo). Escribe data/sistema/deficit-presupuestario-seguridad-social.json.
3. Catálogo de definiciones con su literal: data/sistema/deficit-definiciones.json.
`python3 -I`."""
import csv, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_series, fusionar

RAW = f'{REPO}/data-raw/eurostat'
MODO = os.environ.get('MODO', 'descargar')
API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main?format=JSON&lang=EN&geo=ES&sector=S1314&sinceTimePeriod=2000'
ESMS = 'https://ec.europa.eu/eurostat/cache/metadata/en/gov_10a_main_esms.htm'
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
EUROSTAT = 'Eurostat'
DATASET = 'https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table'


def eurostat(na_item, unidad):
    f = f'{RAW}/{na_item}_{unidad}.json'
    if MODO == 'descargar' and not os.path.exists(f):
        os.makedirs(RAW, exist_ok=True)
        subprocess.run(['curl', '-sS', '--max-time', '90', '-o', f, f'{API}&na_item={na_item}&unit={unidad}'], check=True)
    d = json.load(open(f))
    idx = {i: k for k, i in d['dimension']['time']['category']['index'].items()}
    return {idx[int(i)]: v for i, v in d['value'].items()}, d['updated'], hashlib.sha256(open(f, 'rb').read()).hexdigest()


def main():
    esms = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', open(f'{RAW}/gov_10a_main_esms.html', encoding='utf-8', errors='ignore').read()))
    lit_b9 = 'The difference between total revenue and total expenditure equals net lending/net borrowing (B.9).'
    lit_es = 'ES Health competencies were transferred from Social security funds (S.1314) to State government (S.1312) in 2002.'
    for lit in (lit_b9, lit_es):
        assert lit in esms, lit
    fuente = {'title': 'Government revenue, expenditure and main aggregates (gov_10a_main), sector S.1314 Social security funds, España', 'publisher': EUROSTAT, 'url': DATASET}
    series, upd = [], ''
    for na, unidad, titulo, uni in (('B9', 'MIO_EUR', 'Capacidad (+) / necesidad (-) de financiación (B.9) de los fondos de la Seguridad Social, SEC 2010', 'millones de euros'),
                                    ('B9', 'PC_GDP', 'Capacidad (+) / necesidad (-) de financiación (B.9) de los fondos de la Seguridad Social, en % del PIB', '% del PIB'),
                                    ('TR', 'MIO_EUR', 'Ingresos totales (TR) de los fondos de la Seguridad Social, SEC 2010', 'millones de euros'),
                                    ('TE', 'MIO_EUR', 'Gastos totales (TE) de los fondos de la Seguridad Social, SEC 2010', 'millones de euros')):
        v, upd, h = eurostat(na, unidad)
        series.append({'id': f'{na.lower()}-{unidad.lower().replace("_", "-")}', 'title': titulo, 'unit': uni, 'source': fuente, 'confidence': 'alta',
                       'notes': f'Eurostat, datos actualizados el {upd[:10]} (sha256 del JSON: {h}). Definición (ESMS de gov_10a_main): «{lit_b9}» Nota de España: «{lit_es}» '
                                'Por ese cambio de perímetro las cifras de 2000-2001 no son comparables con las de 2002 en adelante.',
                       'points': [{'period': a, 'value': x} for a, x in sorted(v.items())]})
    escribe_series('sistema', 'deficit-sec-fondos-seguridad-social', 'Fondos de la Seguridad Social (S.1314): capacidad o necesidad de financiación, ingresos y gastos en contabilidad nacional (2000-2025)',
                   'Saldo B.9, ingresos y gastos totales del subsector «Fondos de la Seguridad Social» según el SEC 2010, publicados por Eurostat (tabla 2 del programa de transmisión).', series)

    filas = list(csv.DictReader(open(f'{REPO}/data/sistema/presupuesto-ss-ejecucion.csv')))
    d = {(x['ejercicio'], x['tabla'], x['concepto']): x for x in filas if x['periodo'].endswith('T4')}
    def v(a, tabla, concepto):
        x = d.get((str(a), tabla, concepto))
        return None if x is None or x['derechos_u_obligaciones_meur'] == '' else float(x['derechos_u_obligaciones_meur'])
    anios = sorted({int(k[0]) for k in d})
    fp = {'title': 'Resumen Ejecución del Presupuesto de la Seguridad Social (Sistema de la Seguridad Social), a diciembre', 'publisher': SS,
          'url': 'https://www.seg-social.es/wps/portal/wss/internet/InformacionEconomicoFinanciera/393/394'}
    def ser(id_, titulo, f, conf='alta', notas=''):
        pts = [{'period': str(a), 'value': round(f(a), 2)} for a in anios if f(a) is not None]
        return {'id': id_, 'title': titulo, 'unit': 'millones de euros', 'source': fp, 'confidence': conf,
                'notes': 'Ejecución acumulada a diciembre (T4) de data/sistema/presupuesto-ss-ejecucion.csv.' + notas, 'points': pts}
    nf_i, nf_g = 'SUMA DE OPERACIONES NO FINANCIERAS', 'SUMA DE OPERACIONES NO FINANCIERAS'
    sal = lambda ti, tg: (lambda a: (v(a, 'ingresos', ti) - v(a, 'gastos', tg)) if v(a, 'ingresos', ti) is not None and v(a, 'gastos', tg) is not None else None)
    series = [
        ser('derechos-no-financieros', 'Derechos reconocidos netos por operaciones no financieras (ingresos)', lambda a: v(a, 'ingresos', nf_i)),
        ser('obligaciones-no-financieras', 'Obligaciones reconocidas por operaciones no financieras (gastos)', lambda a: v(a, 'gastos', nf_g)),
        ser('saldo-presupuestario-no-financiero', 'Saldo presupuestario no financiero (derechos reconocidos netos menos obligaciones reconocidas por operaciones no financieras)', sal(nf_i, nf_g), 'media',
            ' Dato derivado (diferencia de dos líneas de la fuente: «' + nf_i + '» en ingresos y en gastos); la Seguridad Social no publica este saldo en los ficheros descargados.'),
        ser('derechos-totales', 'Total derechos reconocidos netos (ingresos), incluidas operaciones financieras', lambda a: v(a, 'ingresos', 'TOTAL INGRESOS')),
        ser('obligaciones-totales', 'Total obligaciones reconocidas (gastos), incluidas operaciones financieras', lambda a: v(a, 'gastos', 'TOTAL GASTOS')),
        ser('saldo-presupuestario-total', 'Saldo presupuestario total (TOTAL INGRESOS menos TOTAL GASTOS)', sal('TOTAL INGRESOS', 'TOTAL GASTOS'), 'media',
            ' Dato derivado; incluye operaciones financieras (activos y pasivos financieros, entre ellos los préstamos del Estado).'),
        ser('pasivos-financieros', '9. Pasivos financieros (ingresos): derechos reconocidos netos', lambda a: v(a, 'ingresos', '9. PASIVOS FINANCIEROS'),
            notas=' Capítulo 9 de ingresos; incluye los préstamos del Estado a la Tesorería (véase parametros/prestamos-estado-seguridad-social).'),
        ser('transferencias-estado-corrientes', 'Transferencias corrientes del Estado y organismos autónomos (ingresos): derechos reconocidos netos', lambda a: v(a, 'ingresos-cap1-cap4', 'DEL ESTADO Y ORG.AUTÓNOMOS')),
    ]
    escribe_series('sistema', 'deficit-presupuestario-seguridad-social', 'Saldos del presupuesto del Sistema de la Seguridad Social (2017-2025)',
                   'Derechos reconocidos y obligaciones reconocidas del Sistema de la Seguridad Social a diciembre y saldos derivados, según la clasificación económica de la fuente.', series)

    src_ee = {'title': 'Government revenue, expenditure and main aggregates (gov_10a_main): metadatos de referencia (ESMS)', 'publisher': EUROSTAT, 'url': ESMS}
    src_ss = fp
    cat = []
    cat.append({'id': 'necesidad-financiacion-sec-s1314', 'value': lit_b9, 'unit': 'definición literal', 'period': '2026', 'source': src_ee, 'fetchedAt': HOY, 'confidence': 'alta',
                'notes': 'Capacidad (+) o necesidad (-) de financiación en contabilidad nacional (SEC 2010) del subsector fondos de la Seguridad Social (S.1314); datos en deficit-sec-fondos-seguridad-social. Los datos de Eurostat proceden de la transmisión de cada país; la fuente nacional (IGAE) no se ha podido descargar (ver docs/DESCARGAS_MANUALES.md).',
                'quote': lit_b9, 'location': 'ESMS gov_10a_main, apartado de conceptos y definiciones (sección 3.3)'})
    cat.append({'id': 'nota-espana-sanidad-2002', 'value': lit_es, 'unit': 'nota literal de la fuente', 'period': '2026', 'source': src_ee, 'fetchedAt': HOY, 'confidence': 'alta',
                'notes': 'Ruptura de perímetro del subsector S.1314 en España.', 'quote': lit_es, 'location': 'ESMS gov_10a_main, notas por país'})
    cat.append({'id': 'saldo-presupuestario-no-financiero', 'value': 'SUMA DE OPERACIONES NO FINANCIERAS', 'unit': 'rótulo literal de la fuente (ingresos y gastos)', 'period': '2025', 'source': src_ss, 'fetchedAt': HOY, 'confidence': 'media',
                'notes': 'La Seguridad Social presenta las «operaciones no financieras» (capítulos 1 a 7) en la ejecución de ingresos y de gastos, pero no publica un «saldo» con ese nombre en los ficheros descargados; en deficit-presupuestario-seguridad-social se calcula la diferencia entre ambas líneas (dato derivado, sin interpretación).',
                'quote': 'SUMA DE OPERACIONES NO FINANCIERAS', 'location': 'ResSISTEMA_DiciembreDefinitivo_2025.xlsx, hojas ResumenPI y ResumenPG'})
    cat.append({'id': 'saldo-presupuestario-total', 'value': 'TOTAL INGRESOS / TOTAL GASTOS', 'unit': 'rótulos literales de la fuente', 'period': '2025', 'source': src_ss, 'fetchedAt': HOY, 'confidence': 'media',
                'notes': 'Saldo derivado de los totales de ingresos y gastos, que incluyen activos y pasivos financieros (préstamos del Estado a la Tesorería).', 'quote': 'TOTAL INGRESOS', 'location': 'hoja ResumenPI (y «TOTAL GASTOS» en ResumenPG)'})
    fusionar('sistema', 'deficit-definiciones', cat, 'Definiciones de déficit y saldo de la Seguridad Social recogidas de fuentes oficiales descargadas',
             'Catálogo de definiciones con su literal y la fuente que las usa. No se elige ninguna como «la buena». Las definiciones de AIReF, IGAE y Ministerio (saldo contributivo ajustado, «gastos impropios») no se han podido descargar: docs/DESCARGAS_MANUALES.md.')
    print('series', len(series), 'catálogo', len(cat), 'anios', anios)


if __name__ == '__main__':
    main()
