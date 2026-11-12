"""Supuestos de la tasa de reposición teórica de «Pensions at a Glance».

1B-4 (H): lo que dice el flujo SDMX DSD_PAG@DF_PRR (se descarga, o se lee con MODO=local). Esos metadatos solo dan la edad de entrada (22 años).
Fase OCDE-PDF: las notas metodológicas del propio informe «Pensions at a Glance 2025» (capítulo 4, «Methodology and assumptions», y capítulo 5,
«Sensitivity of replacement rates to changes in the economic assumptions»), leídas del PDF aportado a mano en data-raw/oecd/ con cita literal
comprobada. Escribe data/internacional/ocde-supuestos-reposicion.json. Los impuestos y cotizaciones de los pensionistas de cada país figuran en
los «Country Profiles» en línea, que no están en el PDF (ver docs/PENDIENTE_DATOS.md).
"""
import gzip, hashlib, html, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY
import ocde_pdf

RAW = f'{REPO}/data-raw/oecd'
URL = 'https://sdmx.oecd.org/public/rest/dataflow/OECD.ELS.SPD/DSD_PAG@DF_PRR/1.0'
OECD = 'OECD (Organización para la Cooperación y el Desarrollo Económicos)'

CAP4 = 'capítulo 4, «Methodology and assumptions»'
CAP5 = 'capítulo 5, «Sensitivity of replacement rates to changes in the economic assumptions», tabla 5.3'
NOTA_BASE = 'Supuesto común a todos los países en el cálculo de la tasa de reposición teórica de «Pensions at a Glance 2025» (escenario base): la OCDE lo aplica cada año desde 2024 y, según el informe, hace que las diferencias entre países reflejen el diseño de los sistemas y no su evolución económica.'
NOTA_ALT = 'Supuesto del escenario alternativo (crecimiento bajo y tipos de interés bajos) de «Pensions at a Glance 2025», que se aplica cada año desde 2024 (tabla 5.3).'
# (id, valor, unidad, cita, nota, layout, ubicación)
SUPUESTOS_PDF = [
    ('ocde-pag-2025-inflacion-base', 2.0, '% anual', 'Price inflation is assumed to be 2% per year.', NOTA_BASE + ' Inflación de precios.', False, CAP4),
    ('ocde-pag-2025-crecimiento-real-salarios-base', 1.25, '% anual', 'Real earnings are assumed to grow by 1.25% per year on average', NOTA_BASE + ' Crecimiento real medio de los salarios (de toda la economía; el salario individual crece igual).', False, CAP4),
    ('ocde-pag-2025-crecimiento-nominal-salarios-base', 3.275, '% anual', 'this implies nominal wage growth of 3.275%', NOTA_BASE + ' Crecimiento nominal de los salarios que la OCDE deduce de los dos supuestos anteriores.', False, CAP4),
    ('ocde-pag-2025-tipo-descuento-real-base', 1.5, '% anual', 'The real discount rate (for actuarial calculations) is assumed to be 1.5% per year.', NOTA_BASE + ' Tipo de descuento real de los cálculos actuariales.', False, CAP4),
    ('ocde-pag-2025-rentabilidad-real-fdc-base', 2.5, '% anual', 'The net real rate of return on funded, defined contribution pensions over the long term is assumed to be 2.5% per year.', NOTA_BASE + ' Rentabilidad real neta de las pensiones de capitalización de aportación definida (no afecta al sistema público de España, sí a los planes FDC de Reino Unido).', False, CAP4),
    ('ocde-pag-2025-factor-conversion-fdc-base', 90, '%', 'Administrative charges, fee structures and the cost of buying an annuity are assumed to result in a defined contribution conversion factor of 90% applied to the accumulated defined contribution wealth when calculating the annuity.', NOTA_BASE + ' Factor de conversión aplicado al capital acumulado en planes de aportación definida al calcular la renta vitalicia.', False, CAP4),
    ('ocde-pag-2025-inflacion-alternativo', 1.0, '% anual', 'Price inflation 2.0% 1.0%', NOTA_ALT + ' Inflación de precios (base: 2,0 %).', True, CAP5),
    ('ocde-pag-2025-crecimiento-real-salarios-alternativo', 0.75, '% anual', 'Real wage growth 1.25% 0.75%', NOTA_ALT + ' Crecimiento real de los salarios (base: 1,25 %).', True, CAP5),
    ('ocde-pag-2025-tipo-descuento-real-alternativo', 1.0, '% anual', 'Real discount rate 1.5% 1.0%', NOTA_ALT + ' Tipo de descuento real (base: 1,5 %).', True, CAP5),
    ('ocde-pag-2025-rentabilidad-real-fdc-alternativo', 2.0, '% anual', 'Real rate of return 2.5% 2.0%', NOTA_ALT + ' Rentabilidad real de las pensiones FDC (base: 2,5 %).', True, CAP5),
    ('ocde-pag-2025-crecimiento-pib-alternativo', -0.5, 'puntos porcentuales', 'Adjusted downward by 0.50%', NOTA_ALT + ' Ajuste del crecimiento del PIB, que en el escenario base es específico de cada país y se basa en las proyecciones de población en edad de trabajar («Country specific based on projections of working-age population»).', True, CAP5),
]
# Supuestos de redacción (valor en texto): (id, etiqueta, cita, nota, ubicación)
TEXTOS_PDF = [
    ('ocde-pag-2025-carrera-completa', 'Carrera completa: entrada en el mercado laboral a los 22 años y trabajo hasta la edad normal de jubilación.',
     'A full career is defined here as entering the labour market at age of 22 and working until the normal pension age', 'Edad de entrada y de jubilación del cálculo. La edad normal de jubilación es la del propio sistema de cada país (para España, 65 años en la tabla 4.1).', CAP4),
    ('ocde-pag-2025-duracion-carrera', 'La duración de la carrera depende del país: la edad normal de jubilación menos 22 años.',
     'The implication is that the modelled length of the career is country-specific and varies with the normal retirement age: 40 years for retirement at 62, 45 for retirement at 67, etc.', 'Con edad normal de 65 años, la carrera modelada es de 43 años; con 68 (Reino Unido), de 46; con 67 (Estados Unidos), de 45. Es aritmética de la regla anterior, no una cifra del informe.', CAP4),
    ('ocde-pag-2025-trabajador-que-entra-en-2024', 'Trabajador soltero que entra en el sistema en 2024 a los 22 años (nacido en 2002) y se jubila tras una carrera completa con el mismo salario relativo; parámetros del sistema de 2024 en adelante.',
     'The calculations in this chapter show the pension benefits of a single worker who enters the system that year at age 22 – that worker is thus born in 2002 – and retires after a full career at the same relative wage.', 'Cohorte del cálculo. Las reglas se aplican como están legisladas, también las de indexación y revalorización.', CAP4),
    ('ocde-pag-2025-salario-relativo-constante', 'El salario individual crece igual que el salario medio de la economía: el trabajador mantiene el mismo porcentaje del salario medio todos los años.',
     'Individual earnings are assumed to grow in line with the economy-wide average. This means that the individual is assumed to remain at the same point in the earnings distribution, earning the same percentage of average earnings in every year of the working life.', 'No hay carreras salariales crecientes en el escenario base (el capítulo 5 modela un perfil alternativo). Consecuencia: la tasa sobre el último salario y sobre el salario medio de la vida laboral revalorizado coinciden.', CAP4),
    ('ocde-pag-2025-salario-medio-definicion', 'El salario medio (AW) es el salario bruto medio de un adulto a tiempo completo, definido en «Taxing Wages» de la OCDE.',
     'The “average worker” earnings series (AW), defined as the average full-time adult gross wage earnings is presented in the OECD report Taxing Wages.', 'El informe precisa que se basa en los sectores B-N de la CIIU Rev. 4 y advierte de que estos salarios medios pueden diferir de las estimaciones nacionales, «sometimes quite substantially». Los valores de 2024 están en el indicador «Average wage» (capítulo 7, tabla 7.5).', 'capítulo 4, «Methodology and assumptions», apartado «Average earnings»'),
    ('ocde-pag-2025-mortalidad', 'Mortalidad: proyecciones por país de la base de población de Naciones Unidas para cada año de 2024 a 2100, con mejoras de mortalidad por cohorte después de la edad de jubilación.',
     'The baseline modelling uses country-specific projections of mortality rates from the United Nations population database for every year from 2024 to 2100.', 'Para las cuentas nocionales se usa la mortalidad propia del país. Relevante para comparar con las tablas del INE usadas en data/demografia.', CAP4),
    ('ocde-pag-2025-renta-vitalicia-indexada', 'Las prestaciones de los planes de aportación definida se pagan como renta vitalicia indexada a los precios, calculada con el precio actuarialmente justo con previsión perfecta.',
     'The calculations assume that benefits from defined contribution plans are paid in the form of a price-indexed life annuity', 'No afecta al régimen público de reparto de España y Estados Unidos (prestación definida), sí al plan FDC cuasi obligatorio del Reino Unido.', CAP4),
    ('ocde-pag-2025-politica-fiscal-constante', 'Impuestos y cotizaciones de la tasa neta: se supone que no cambian en el futuro; los parámetros de «valor» (mínimos exentos, topes de cotización) se ajustan cada año con el salario medio y los de «tipo» (escala del IRPF, tipos de cotización) no varían.',
     'The modelling assumes that tax systems and social-security contributions remain unchanged in the future. This constant policy assumption implicitly means that “value” parameters, such as tax allowances or contribution ceilings, are adjusted annually in line with average worker earnings, while “rate” parameters, such as the personal income tax schedule and social security contribution rates, remain unchanged.', 'Regla de la tasa neta de la OCDE. El detalle del IRPF y de las cotizaciones que pagan los pensionistas de cada país no está en el PDF: ver «Country Profiles» (docs/PENDIENTE_DATOS.md).', 'capítulo 4, «Methodology and assumptions», apartado «Taxes and social security contributions»'),
    ('ocde-pag-2025-impuestos-pensionistas-en-perfiles', 'Los impuestos personales y las cotizaciones que pagan los pensionistas en el cálculo figuran en los «Country Profiles» en línea, no en el informe.',
     'Information on personal income tax and social security contributions paid by pensioners, which were used to calculate pension entitlements, are in the “Country Profiles” available at http://oe.cd/pag.', 'Hueco: el detalle por país (escala, mínimos, cotizaciones del pensionista) requiere descargar los perfiles de España, Reino Unido y Estados Unidos.', 'capítulo 4, «Methodology and assumptions», apartado «Taxes and social security contributions»'),
    ('ocde-pag-2025-tasa-neta-definicion', 'Tasa de reposición neta: pensión neta sobre ingresos netos individuales, descontando el IRPF y las cotizaciones de trabajadores y pensionistas; por lo demás se mide como la bruta.',
     'The net replacement rate is the net value of the pension entitlement relative to individual net earnings, taking account of personal income taxes and social security contributions paid by workers and pensioners.', 'Definición de la tasa neta (capítulo 4, indicador «Net pension replacement rates»).', 'capítulo 4, indicador «Net pension replacement rates»'),
    ('ocde-pag-2025-cotizaciones-pensionistas-general', 'Los pensionistas suelen no pagar cotizaciones por pensión ni desempleo, aunque pueden pagar aportaciones por sanidad o cuidados de larga duración; 21 países de la OCDE no cobran cotizaciones sociales a los pensionistas.',
     'Typically, old-age retirement income is not subject to contributions for pensions or unemployment (for obvious reasons). However, pensioners can be subject to levies to pay for health or long-term care.', 'Contexto general del indicador sobre tratamiento fiscal de pensiones y pensionistas (tabla 4.3: España, Reino Unido y Estados Unidos figuran sin cotizaciones sobre la pensión).', 'capítulo 4, indicador «Tax treatment of pensions and pensioners»'),
    ('ocde-pag-2025-indexacion-precios-espana', 'Con indexación a los precios y edad normal de 65 años (como en España), la tasa de reposición bruta a los 80 años es un 17 % menor que a la edad de jubilación, con los supuestos del modelo de la OCDE.',
     'With price indexation from a normal retirement age of 65, the fall is equal to 17% based on the OECD model assumptions – as found in Austria, Chile, Costa Rica, Hungary, Korea, Mexico, Poland, Spain and Türkiye.', 'Efecto del crecimiento real de los salarios (1,25 % anual en el escenario base) sobre una pensión indexada a los precios; la cifra depende de los supuestos de la OCDE. En la media de la OCDE la caída es del 13 %.', 'capítulo 4, indicador «Gross pension replacement rates»'),
    ('ocde-pag-2025-sensibilidad-espana-valorizacion-precios', 'En la sensibilidad al crecimiento y los tipos, la tasa bruta de España sube porque los ingresos pasados se revalorizan con los precios y el crecimiento real de los salarios es menor en el escenario alternativo.',
     'In these countries past earnings are valorised to prices (Belgium, Portugal and Spain)', 'La frase completa nombra a Bélgica, Portugal, España, Türkiye y Reino Unido como los países con mayores subidas (entre 5,8 y 7,6 puntos); España es la más alta de ese grupo (7,6 puntos). Muestra que la cifra de España depende de los supuestos económicos de la OCDE.', CAP5),
    ('ocde-pag-2025-definicion-edad-normal-jubilacion', 'Edad normal de jubilación de la OCDE: la edad de acceso a todos los componentes obligatorios del sistema en 2024, suponiendo entrada en el mercado laboral a los 22 años y una carrera ininterrumpida.',
     'The normal retirement age is defined as the age of eligibility to all mandatory components of the pension system in 2024, assuming labour market entry at age 22 and an uninterrupted career.', 'Corresponde a la tabla 3.5 del capítulo 3. Es la edad CRPLF22 de data/internacional/ocde-espana (65 años para España): no es la edad ordinaria de jubilación de la normativa española, que depende de los años cotizados.', 'capítulo 6, indicador «Effective age of labour market exit»'),
    ('ocde-pag-2025-definicion-edad-efectiva-salida', 'Edad efectiva de salida del mercado laboral de la OCDE (medida ELMEA): edad media de salida de la población activa de los trabajadores de 40 o más años, estimada con los cambios en las tasas de actividad por cohorte sintética.',
     'The average effective age of labour market exit is defined as the average age of exit from the labour force for workers aged 40 and over.', 'La definición sigue: los retiros se estiman con los cambios en las tasas de actividad (no con los niveles) por cohorte sintética en grupos de cinco años, ponderando cada grupo por su peso medio en la población de la OCDE. El informe advierte de que «absolute numbers for a given country should be interpreted cautiously» y que las comparaciones entre países o en el tiempo dentro de un país son robustas. Método remitido a Boulhol y Keese (2021), no descargado.', 'capítulo 6, indicador «Effective age of labour market exit», apartado «Definition and measurement»'),
]
# Tasa bruta del escenario base y del alternativo (tabla 5.4) y tratamiento fiscal de pensionistas (tabla 4.3) de España, Reino Unido y Estados Unidos
PAISES = {'ESP': ('España', 'Spain'), 'GBR': ('Reino Unido', 'United Kingdom'), 'USA': ('Estados Unidos', 'United States')}
T54 = {'ESP': ('Spain 65 80.4 88.0 7.6', 65, 80.4, 88.0, 7.6), 'GBR': ('United Kingdom 68 44.7 51.3 6.6', 68, 44.7, 51.3, 6.6), 'USA': ('United States 67 39.7 41.2 1.6', 67, 39.7, 41.2, 1.6)}
T43 = {'ESP': ('Spain ✓ None', 'sin asignación o crédito fiscal adicional por ser pensionista; desgravación total o parcial de la pensión del régimen público; sin cotizaciones sobre la pensión'),
       'GBR': ('United Kingdom ✓ None', 'sin asignación o crédito fiscal adicional por ser pensionista; desgravación total o parcial de la pensión de los planes privados; sin cotizaciones sobre la pensión'),
       'USA': ('United States ✓ ✓ None', 'asignación o crédito fiscal adicional por ser pensionista; desgravación total o parcial de la pensión del régimen público; sin cotizaciones sobre la pensión')}


def main():
    f = f'{RAW}/DF_PRR-dataflow.xml.gz'
    o = json.load(open(f'{RAW}/origen.json'))
    if not os.path.exists(f):
        if os.environ.get('MODO') == 'local':
            raise SystemExit('falta ' + f)
        crudo = subprocess.run(['curl', '-sS', '-m', '60', URL], capture_output=True).stdout
        gzip.open(f, 'wb', 9).write(crudo)
        o['DF_PRR-dataflow.xml'] = {'url': URL, 'fetchedAt': HOY, 'sha256': hashlib.sha256(crudo).hexdigest(), 'bytes': len(crudo)}
        json.dump(o, open(f'{RAW}/origen.json', 'w'), indent=1)
    t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', gzip.open(f, 'rt', encoding='utf-8').read())))
    frase = 'Pensions at a Glance reviews and analyses the pension measures enacted or legislated in OECD countries for workers entering the labour market at age 22 in the specified year.'
    assert frase in t, 'frase no encontrada en el flujo'
    src = {'title': 'Pensions at a Glance: definición del flujo SDMX DSD_PAG@DF_PRR (Pension replacement rates)', 'publisher': OECD, 'url': URL, 'docId': 'OECD-DSD_PAG-DF_PRR'}
    es = {x['id']: x for x in json.load(open(f'{REPO}/data/internacional/ocde-espana.json'))['data']}
    ids = [('crplf22-hombres-z-z-y-2024', 'edad-jubilacion-actual-carrera-desde-22-hombres'), ('crplf22-mujeres-z-z-y-2024', 'edad-jubilacion-actual-carrera-desde-22-mujeres'),
           ('frplf22-hombres-z-z-y-2024', 'edad-jubilacion-futura-carrera-desde-22-hombres'), ('frplf22-mujeres-z-z-y-2024', 'edad-jubilacion-futura-carrera-desde-22-mujeres')]
    data = [{'id': 'ocde-pag-entrada-mercado-laboral-22', 'value': 'Los indicadores de «Pensions at a Glance» se calculan para trabajadores que entran en el mercado laboral a los 22 años en el año especificado.', 'unit': 'texto', 'period': '2024', 'source': src, 'fetchedAt': HOY, 'confidence': 'alta',
             'quote': frase, 'location': 'descripción del flujo (metadatos SDMX)',
             'notes': 'Es la única referencia a los supuestos del cálculo en los metadatos accesibles del flujo: no figuran el crecimiento real de los salarios, la inflación ni la carrera (años cotizados).'}]
    for i, nuevo in ids:
        x = es[i]
        data.append({'id': nuevo, 'value': x['value'], 'unit': 'años', 'period': '2024', 'source': x['source'], 'fetchedAt': HOY, 'confidence': 'alta',
                     'notes': x['notes'] + ' Copiado de data/internacional/ocde-espana; es la edad que la OCDE considera para España (el flujo no da más supuestos).', 'quote': x['quote'], 'location': x['location']})
    for id_, v, u, cita, nota, layout, ub in SUPUESTOS_PDF:
        data.append(ocde_pdf.dato(id_, v, u, cita, nota, 'alta', layout, ubicacion_extra=ub))
    for id_, etiqueta, cita, nota, ub in TEXTOS_PDF:
        data.append(ocde_pdf.dato(id_, etiqueta, 'texto', cita, nota, 'alta', False, ubicacion_extra=ub))
    for iso, (pais, ing) in PAISES.items():
        fila, edad, base, alt, dif = T54[iso]
        nota = (f'Tabla 5.4 (tasa bruta para un hombre con carrera completa al salario medio; edad normal de jubilación {edad}). Escenario alternativo de la OCDE: crecimiento y tipos bajos '
                f'(ver ocde-pag-2025-*-alternativo). Diferencia con el escenario base ({base} %): {dif} puntos porcentuales. El escenario base coincide con la medida GPRR100 de data/internacional/ocde-pag.')
        data.append(ocde_pdf.dato(f'ocde-pag-2025-tasa-bruta-reposicion-alternativo-{iso.lower()}', alt, '% del salario medio', fila, f'{pais}: ' + nota, 'alta', True, ubicacion_extra='capítulo 5, tabla 5.4'))
    for iso, (pais, ing) in PAISES.items():
        fila, texto = T43[iso]
        data.append(ocde_pdf.dato(f'ocde-pag-2025-tratamiento-fiscal-pensionista-{iso.lower()}', f'{pais}: {texto}.', 'texto', fila, 'Lectura de la fila de la tabla 4.3 con las marcas por columna, comprobada sobre la imagen de la página (las marcas «✓» del texto extraído no indican la columna). '
                                  'Esta tabla solo da el tratamiento cualitativo; el detalle (escala del impuesto, mínimos exentos, cotizaciones) está en los «Country Profiles» en línea.', 'media', True, ubicacion_extra='capítulo 4, tabla 4.3'))
    out = {'tipo': 'datos', 'id': 'ocde-supuestos-reposicion', 'title': 'OCDE, Pensions at a Glance: supuestos de la tasa de reposición teórica (metadatos del flujo SDMX y notas metodológicas del informe de 2025)',
           'description': 'Supuestos del cálculo de la tasa de reposición teórica de la OCDE: edad de entrada (22 años) y de jubilación, crecimiento real de los salarios, inflación, tipo de descuento, rentabilidad de los planes FDC, escenario alternativo, mortalidad, y reglas de impuestos y cotizaciones de la tasa neta, con la cita literal de «Pensions at a Glance 2025» (PDF aportado a mano) y la edad de jubilación de España del flujo SDMX. El detalle de los impuestos y cotizaciones de los pensionistas de cada país figura en los «Country Profiles» en línea, que no están en el PDF (ver docs/PENDIENTE_DATOS.md).', 'data': data}
    json.dump(out, open(f'{REPO}/data/internacional/ocde-supuestos-reposicion.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{REPO}/data/internacional/ocde-supuestos-reposicion.json', 'a').write('\n')
    ocde_pdf.registra_origen()
    print('supuestos', len(data))


if __name__ == '__main__':
    main()
