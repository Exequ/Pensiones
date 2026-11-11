"""C2 de la Fase 1B-3: pensiones no contributivas (IMSERSO) y «gastos impropios» (Revista de la Seguridad Social).

Modo local sobre data-raw/imserso/ (evolnom20192025.pdf y avperfil_pnc_2025.xlsx) y data-raw/ministerio/gastos_impropios.pdf.
Escribe data/sistema/imserso-pnc-evolucion (tabla), imserso-pnc-perfil-2025 y gastos-impropios. `python3 -I`.
"""
import csv, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, HOY, escribe_tabla

RAW = f'{REPO}/data-raw'
OUT = f'{REPO}/data/sistema'
IMS = 'Instituto de Mayores y Servicios Sociales (IMSERSO)'
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
URL_IMS = 'https://imserso.es/el-imserso/documentacion/estadisticas/pensiones-no-contributivas-jubilacion-invalidez-pnc'
MESES = {'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12}


def sha(f):
    return hashlib.sha256(open(f, 'rb').read()).hexdigest()


def n(s):
    return float(s.replace('.', '').replace(',', '.'))


def evolucion():
    f = f'{RAW}/imserso/evolnom20192025.pdf'
    txt = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout.split('\n')
    i0 = next(i for i, l in enumerate(txt) if 'TOTAL ESPA' in l and i > 1100 and i < 1200)  # Anexos 7 y 8
    num = r'(\d{1,3}(?:\.\d{3})*(?:,\d+)?)'
    pat = re.compile(r'^\s*(?:\d\s+)?(?P<per>20\d\d|ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|TOTAL \(3\))\s*\*?\s+' + r'\s+'.join([num] * 9) + r'\s*$')
    rows, anio_mes = [], 2025
    for l in txt[i0:i0 + 60]:
        m = pat.match(l.replace(' ', ' '))
        if not m:
            continue
        per = m.group('per')
        v = [n(m.group(k)) for k in range(2, 11)]
        if re.fullmatch(r'20\d\d', per):
            p, tipo = per, 'anual'
        elif per == 'TOTAL (3)':
            p, tipo = '2025', 'total-anual'
        else:
            p, tipo = f'2025-{MESES[per]:02d}', 'mes'
        for k, clase in enumerate(('jubilacion', 'invalidez', 'total')):
            rows.append([p, tipo, clase, int(v[3 * k]), repr(v[3 * k + 1]), repr(v[3 * k + 2])])
    print('PNC filas', len(rows), sorted({r[0] for r in rows})[:3], sorted({r[0] for r in rows})[-3:])
    with open(f'{OUT}/imserso-pnc-evolucion.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['periodo', 'tipo_periodo', 'clase', 'pensiones', 'importe_bruto_eur', 'pension_media_eur_mes'])
        w.writerows(rows)
    escribe_tabla('sistema', 'imserso-pnc-evolucion',
        'IMSERSO: pensiones no contributivas de jubilación e invalidez, número, importe bruto de la nómina y pensión media (2019-2025)',
        'Total España (incluye las nóminas de Navarra y el País Vasco, que facilitan sus comunidades). Filas «anual» (2019-2024): número de pensiones a diciembre e importe bruto abonado y pensión media del año; '
        'filas «mes» (2025): nómina de cada mes (en junio y noviembre la mensualidad incluye una paga extra, de ahí el importe duplicado); fila «total-anual» (2025): suma del año con el complemento de alquiler. '
        'clase: jubilacion, invalidez o total (jubilación e invalidez). La pensión media del IMSERSO es el importe bruto de la nómina entre el número de pensiones del mes, no el importe reconocido.',
        [('periodo', 'Año (AAAA) o mes de 2025 (2025-MM)', None), ('tipo_periodo', 'anual, mes o total-anual', None), ('clase', 'jubilacion, invalidez o total', None),
         ('pensiones', 'Número de pensiones', 'pensiones'), ('importe_bruto_eur', 'Importe bruto abonado', 'euros'), ('pension_media_eur_mes', 'Pensión media', 'euros/mes')],
        len(rows), {'title': 'Informe de evolución de las nóminas. PNC y PSPD. 2019-2025 (anexos 7 y 8, total España)', 'publisher': IMS, 'url': URL_IMS},
        [{'period': '2025', 'url': URL_IMS, 'sha256': sha(f)}], confidence='alta',
        notes='Descarga manual del autor (data-raw/imserso/evolnom20192025.pdf). Extraído del texto del PDF con pdftotext y comprobado con el total estatal de la tabla por comunidades del mismo informe.')
    return rows


def perfil():
    f = f'{RAW}/imserso/avperfil_pnc_2025.xlsx'
    ws = openpyxl.load_workbook(f, read_only=True, data_only=True)['SEXO RESUMEN jub e inv']
    r = next(list(x) for x in ws.iter_rows(values_only=True) if x[0] == 'TOTAL ESTADO')
    v = [x for x in r[1:] if x is not None]
    # orden de la fila: (H, %, M, %, T, 1) por jubilación, invalidez y total
    cifras = {}
    for k, clase in enumerate(('jubilacion', 'invalidez', 'total')):
        b = v[6 * k:6 * k + 6]
        cifras[clase] = {'hombres': int(b[0]), 'mujeres': int(b[2]), 'total': int(b[4])}
    for c in cifras.values():
        assert c['hombres'] + c['mujeres'] == c['total']
    src = {'title': 'Perfil del pensionista de pensiones no contributivas a diciembre de 2025 (Fichero Técnico de Pensionistas no Contributivos del IMSERSO), hoja «Tipo de pensión y sexo»', 'publisher': IMS, 'url': URL_IMS}
    data = []
    for clase, d in cifras.items():
        for sx, val in d.items():
            data.append({'id': f'{clase}-{sx}-2025', 'value': val, 'unit': 'pensionistas', 'period': '2025', 'source': src, 'fetchedAt': HOY, 'confidence': 'alta',
                         'notes': 'Dato a diciembre de 2025. La jubilación incluye la jubilación derivada de invalidez (nota (*) de la fuente). No coincide con el número de pensiones de la nómina (imserso-pnc-evolucion): el fichero técnico y la nómina son registros distintos.',
                         'quote': f'TOTAL ESTADO: {clase} {sx} {val}', 'location': 'hoja «SEXO RESUMEN jub e inv», fila «TOTAL ESTADO»'})
    out = {'tipo': 'datos', 'id': 'imserso-pnc-perfil-2025', 'title': 'Pensionistas no contributivos por tipo de pensión y sexo, diciembre de 2025 (IMSERSO)',
           'description': 'Total España: pensionistas de jubilación, invalidez y total, por sexo, según el fichero técnico de pensionistas no contributivos del IMSERSO a diciembre de 2025.', 'data': data}
    json.dump(out, open(f'{OUT}/imserso-pnc-perfil-2025.json', 'w'), ensure_ascii=False, indent=2); open(f'{OUT}/imserso-pnc-perfil-2025.json', 'a').write('\n')
    print('perfil', cifras['total'])
    return cifras


def impropios():
    f = f'{RAW}/ministerio/gastos_impropios.pdf'
    t = re.sub(r'\s+', ' ', subprocess.run(['pdftotext', f, '-'], capture_output=True, text=True).stdout)
    src = {'title': '¿Qué gastos no contributivos financia la Seguridad Social? (Revista Seguridad Social, 29/10/2020; antes «¿Qué son los gastos impropios de la Seguridad Social?»)', 'publisher': SS,
           'url': 'https://revista.seg-social.es/2020/10/29/que-son-los-gastos-impropios-de-la-seguridad-social/'}
    q1 = re.search(r'estos gastos impropios ascender[ií]an a 22\.871 millones en 2023, mientras que el d[ée]ficit estimado para ese a[ñn]o ser[ií]a de 20\.185 millones', t)
    q2 = re.search(r'transferencia de cerca de 14\.000 millones de euros', t)
    q3 = re.search(r'la aportaci[óo]n del Estado para pagar pensiones cubre el 14% del gasto en pensiones frente al 26,6% de Francia o el 37,2% de Alemania', t)
    assert q1 and q2 and q3, 'no se encuentran las citas en el PDF'
    base = {'source': src, 'fetchedAt': HOY, 'confidence': 'media'}
    data = [
        {'id': 'gastos-impropios-previstos-2023', 'value': 22871, 'unit': 'millones de euros', 'period': '2023', **base,
         'notes': 'Previsión de 2020 de la AIReF y del Ministerio (presentada en la Comisión del Pacto de Toledo en septiembre de 2020), no un dato observado. «Gastos impropios» es la expresión de la fuente: prestaciones no contributivas, reducciones de cuotas, políticas de apoyo a las familias y gastos de funcionamiento que el Pacto de Toledo propone financiar con impuestos. Fuente secundaria (revista institucional).',
         'quote': q1.group(0), 'location': 'apartado «Opinión de la AIReF»'},
        {'id': 'deficit-estimado-2023', 'value': 20185, 'unit': 'millones de euros', 'period': '2023', **base,
         'notes': 'Déficit estimado para 2023 en la misma previsión de 2020 (no un dato observado ni una definición concreta de déficit; ver data/sistema/deficit-definiciones).',
         'quote': q1.group(0), 'location': 'apartado «Opinión de la AIReF»'},
        {'id': 'transferencia-prevista-pge-2021', 'value': 14000, 'unit': 'millones de euros', 'period': '2021', **base, 'confidence': 'baja',
         'notes': 'La fuente dice «cerca de 14.000 millones»: cifra aproximada del proyecto de PGE 2021 para cubrir parte de los gastos impropios (no es el importe de la ley aprobada).',
         'quote': q2.group(0), 'location': 'apartado final'},
        {'id': 'aportacion-estado-gasto-pensiones-espana-2016', 'value': 14, 'unit': '% del gasto en pensiones', 'period': '2016', **base,
         'notes': 'Según el Ageing Report 2018 de la Comisión Europea citado por la fuente; en Francia 26,6 % y en Alemania 37,2 %.', 'quote': q3.group(0), 'location': 'apartado final'},
    ]
    out = {'tipo': 'datos', 'id': 'gastos-impropios', 'title': 'Gastos impropios de la Seguridad Social: previsiones de 2020 (Revista Seguridad Social)',
           'description': 'Cifras que cita el artículo de la Revista de la Seguridad Social de 29/10/2020 sobre los llamados gastos impropios (previsión de 2020 para 2023, déficit estimado, transferencia prevista en el proyecto de PGE 2021 y aportación del Estado en 2016). Fuente secundaria, con confianza media o baja.', 'data': data}
    json.dump(out, open(f'{OUT}/gastos-impropios.json', 'w'), ensure_ascii=False, indent=2); open(f'{OUT}/gastos-impropios.json', 'a').write('\n')
    print('impropios ok')


if __name__ == '__main__':
    evolucion(); perfil(); impropios()
