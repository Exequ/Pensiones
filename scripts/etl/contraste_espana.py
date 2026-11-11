"""A4 de la Fase 1C: contraste de los indicadores de España de la OCDE con los datos propios (series derivadas).

Escribe data/internacional/contraste-espana.json con (todo dato derivado y marcado como tal):
- gasto en pensiones contributivas del Sistema de la Seguridad Social sobre el PIB (ejecución del presupuesto / PIB del INE);
- cociente entre la pensión media de jubilación (altas iniciales o pensiones en vigor, 14 pagas) y cuatro definiciones de salario medio;
- datos de edad: edad ordinaria de jubilación y meses cotizados que permiten jubilarse a los 65 años, frente a la edad de jubilación de la OCDE.
Ninguno de los cocientes es una tasa de reposición: ver la descripción del fichero. Ejecutar con `python3 -I`.
"""
import csv, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

D = f'{REPO}/data'


def serie(ruta, sid):
    d = json.load(open(f'{D}/{ruta}'))
    s = next(x for x in d['series'] if x['id'] == sid)
    return {p['period']: p['value'] for p in s['points']}, s['source']


def main():
    pib, s_pib = serie('macro/pib-ine.json', 'pib-corriente')
    rows = list(csv.DictReader(open(f'{D}/sistema/presupuesto-ss-ejecucion.csv', encoding='utf-8')))
    gasto = {x['ejercicio']: float(x['derechos_u_obligaciones_meur']) for x in rows
             if x['tabla'] == 'gastos-cap4' and x['concepto'] == 'SUMA DE PENSIONES' and x['periodo'] == f"{x['ejercicio']}-T4"}
    s_ss = json.load(open(f'{D}/sistema/presupuesto-ss-ejecucion.json'))['source']
    out_series = []
    nd = 'Dato derivado, no publicado por la fuente: '
    out_series.append({'id': 'gasto-pensiones-contributivas-sobre-pib', 'title': 'Obligaciones reconocidas por «suma de pensiones» (contributivas) del Sistema de la Seguridad Social sobre el PIB', 'unit': '% del PIB',
                       'source': s_ss, 'fetchedAt': HOY, 'confidence': 'media',
                       'notes': nd + 'obligaciones reconocidas de la fila «SUMA DE PENSIONES» (capítulo 4, T4, data/sistema/presupuesto-ss-ejecucion) ÷ PIB corriente del INE (data/macro/pib-ine). '
                                'Solo pensiones contributivas del Sistema de la Seguridad Social: excluye Clases Pasivas y pensiones no contributivas, que otras definiciones (OCDE, Eurostat, Ageing Report) sí pueden incluir.',
                       'points': [{'period': a, 'value': round(100 * g / pib[a], 3)} for a, g in sorted(gasto.items()) if a in pib]})
    # cociente pensión / salario
    alt = {r['anio']: float(r['pension_media_eur_mes']) for r in csv.DictReader(open(f'{D}/sistema/altas-bajas-anual-clase-sexo.csv'))
           if r['movimiento'] == 'alta-inicial' and r['clase'] == 'jubilacion' and r['sexo'] == 'ambos'}
    vig, s_vig = serie('sistema/pensiones-vigor-pension-media.json', 'jubilacion-ambos')
    s_alt = json.load(open(f'{D}/sistema/altas-bajas-anual-clase-sexo.json'))['source']
    sal = {'eaes': serie('macro/salario-medio-definiciones.json', 'eaes-ambos')[0],
           'etcl-x12': serie('macro/salario-medio-definiciones.json', 'etcl-coste-salarial-total-x12')[0],
           'cn-puesto': serie('macro/salario-medio-definiciones.json', 'cn-remuneracion-por-asalariado-puesto')[0],
           'base-media-x12': {a: 12 * v for a, v in serie('macro/salario-medio-definiciones.json', 'base-media-cotizacion-rg-ambos')[0].items()}}
    for pens, nombre, fuente_p, src in ((alt, 'altas', 'pensión media de las altas iniciales de jubilación (ambos sexos)', s_alt), (vig, 'vigor', 'pensión media de las pensiones de jubilación en vigor a 1 de diciembre (ambos sexos)', s_vig)):
        for k, w in sal.items():
            pts = [{'period': str(a), 'value': round(14 * pens[str(a)] / w[str(a)], 4)} for a in range(2008, 2026) if str(a) in pens and str(a) in w]
            if pts:
                out_series.append({'id': f'pension-{nombre}-sobre-salario-{k}', 'title': f'Cociente entre la {fuente_p} × 14 pagas y el salario medio «{k}»', 'unit': 'razón', 'source': src, 'fetchedAt': HOY, 'confidence': 'media',
                                   'notes': nd + f'{fuente_p} × 14 ÷ salario medio anual de la definición «{k}» de data/macro/salario-medio-definiciones. NO es una tasa de reposición: compara medias de colectivos distintos (pensionistas o nuevos jubilados con carreras de distinta duración frente a todos los trabajadores del ámbito de cada fuente), no sigue a una persona ni a una carrera completa y no descuenta impuestos ni cotizaciones.',
                                   'points': pts})
    # edades
    edad, s_edad = serie('parametros/edad-ordinaria-jubilacion.json', 'edad-ordinaria-jubilacion') if False else (None, None)
    ed = json.load(open(f'{D}/parametros/edad-ordinaria-jubilacion.json'))
    car = json.load(open(f'{D}/parametros/carrera-jubilacion-65.json'))
    e25 = next(x for x in ed['data'] if x['period'] == '2025')
    c25 = next(x for x in car['data'] if x['period'] == '2025')
    oc = {x['id']: x for x in json.load(open(f'{D}/internacional/ocde-espana.json'))['data']}
    datos = [
        {'id': 'edad-jubilacion-ocde-hombres-2024', 'value': oc['crplf22-hombres-z-z-y-2024']['value'], 'unit': 'años', 'period': '2024', 'source': oc['crplf22-hombres-z-z-y-2024']['source'], 'fetchedAt': HOY, 'confidence': 'alta',
         'notes': 'Edad de jubilación actual (CRPLF22) de la OCDE para quien entra en el mercado laboral a los 22 años; copiada de ocde-espana (misma cifra para mujeres).'},
        {'id': 'edad-ordinaria-propia-2025', 'value': e25['value'], 'unit': e25['unit'], 'period': '2025', 'source': e25['source'], 'fetchedAt': HOY, 'confidence': e25['confidence'],
         'notes': f"Edad ordinaria de jubilación de 2025 de data/parametros/edad-ordinaria-jubilacion ({e25['value']} meses = {e25['value'] // 12} años y {e25['value'] % 12} meses): es la edad exigible a quien NO alcanza el periodo cotizado de la serie carrera-jubilacion-65."},
        {'id': 'carrera-jubilacion-65-propia-2025', 'value': c25['value'], 'unit': c25['unit'], 'period': '2025', 'source': c25['source'], 'fetchedAt': HOY, 'confidence': c25['confidence'],
         'notes': 'Meses cotizados que dan acceso a la jubilación ordinaria a los 65 años en 2025 (data/parametros/carrera-jubilacion-65).'},
        {'id': 'meses-carrera-completa-desde-22-hasta-65', 'value': (65 - 22) * 12, 'unit': 'meses', 'period': '2025', 'source': c25['source'], 'fetchedAt': HOY, 'confidence': 'media',
         'notes': 'Dato derivado: (65 − 22) × 12 meses de una carrera ininterrumpida desde los 22 años hasta los 65, la que supone la OCDE. Es superior a los meses de carrera-jubilacion-65-propia-2025, por eso la edad de la OCDE (65) y la edad ordinaria propia (66 años y 8 meses en 2025) no se contradicen: responden a carreras distintas.'},
    ]
    out = {'tipo': 'datos', 'id': 'contraste-espana', 'title': 'Contraste de España: OCDE frente a datos propios (series derivadas)',
           'description': 'Series derivadas que permiten comparar los indicadores de España de la OCDE (tasas de reposición teóricas, edad de jubilación, gasto sobre el PIB) con los datos propios del proyecto. '
                          'Son cocientes de definiciones distintas, no equivalentes: la tasa de reposición teórica de la OCDE (carrera completa desde los 22, 100 % del salario medio, parámetros de 2024) no tiene equivalente directo en los datos publicados; '
                          'los cocientes pensión media / salario medio de este fichero son una referencia empírica distinta. Las diferencias de definición se explican en docs/DISCREPANCIAS.md.',
           'series': out_series, 'data': datos}
    json.dump(out, open(f'{D}/internacional/contraste-espana.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{D}/internacional/contraste-espana.json', 'a').write('\n')
    print('contraste-espana', len(out_series), 'series', len(datos), 'datos')
    for s in out_series:
        print('  ', s['id'], s['points'][-1])


if __name__ == '__main__':
    main()
