"""A3 de la Fase 1C: descripción de la estructura del sistema de pensiones de cada país, con cita literal.

Fuentes: (1) fichas por país del «2024 Ageing Report» de la Comisión Europea (descargadas a data-raw/ce-ageing/fichas/;
los PDF no se versionan, su URL y huella están en origen.json); (2) «Pensions at a Glance 2025» de la OCDE, PDF aportado a mano
por el autor en data-raw/oecd/ (el sitio de la OCDE responde 403 a las descargas automáticas), que es la única fuente descargada
para el Reino Unido y Estados Unidos (no tienen ficha de la CE) y que completa la ficha de España. El PDF no incluye los
«Country Profiles» (están en línea, oe.cd/pag): solo se recogen las frases del propio informe sobre cada país. Cada etiqueta
en español se apoya en una cita en inglés cuya presencia en el PDF comprueba el script. Ejecutar con
`python3 -I scripts/etl/paises_fichas.py` (requiere pdftotext).
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY
import ocde_pdf

RAW = f'{REPO}/data-raw/ce-ageing/fichas'
OUT = f'{REPO}/data/internacional'
CE = 'Comisión Europea (DG ECFIN) y Comité de Política Económica (Grupo de Trabajo sobre Envejecimiento)'
NOMBRE = {'GBR': 'Reino Unido', 'USA': 'Estados Unidos', 'ESP': 'España', 'FRA': 'Francia', 'ITA': 'Italia', 'SWE': 'Suecia', 'POL': 'Polonia', 'DEU': 'Alemania', 'PRT': 'Portugal', 'NLD': 'Países Bajos', 'DNK': 'Dinamarca'}
# (regex de la cita, etiqueta en español que la cita sustenta)
ENTRADAS = {
    'ESP': [(r'The Social Security system is a mandatory, pay-as-you-go system', 'sistema obligatorio de reparto')],
    'FRA': [(r'essentially a pay-as-you-go public system financed by contributions from both workers and employers', 'sistema público de reparto financiado con cotizaciones de trabajadores y empresas'),
            (r'The second-pillar scheme for private sector employees \(AGIRC-ARRCO\) is a pay-as-you-go point system scheme', 'segundo pilar del sector privado (Agirc-Arrco): sistema de puntos de reparto')],
    'ITA': [(r'the adoption of the Notional Defined Contribution \(NDC\) scheme, with periodic revisions of the implicit accrual rates; ii\) the linking of eligibility requirements for both old-age and early retirement to changes in life expectancy',
             'cuentas nocionales de aportación definida (NDC), con revisión periódica de los coeficientes y requisitos de acceso ligados a la esperanza de vida')],
    'SWE': [(r'an earnings-related notionally defined contribution \(NDC\) pay-as-you-go component and a fully funded, defined contribution \(DC\) pension component', 'cuentas nocionales (NDC) de reparto más un componente obligatorio de capitalización de aportación definida'),
            (r'The automatic balancing mechanism guarantees that the system will be able to finance its obligations with a fixed contribution rate and unchanged rules regardless of the demographic or economic development', 'mecanismo de ajuste automático (balancing) con tipo de cotización fijo')],
    'POL': [(r'The mandatory part of the system is divided into two pillars: non-financial \(NDC - national defined contributions\) and financial \(FDC - funded defined contributions\)', 'cuentas nocionales (NDC) y pilar de capitalización (FDC)')],
    'DEU': [(r'the general pay-as- you-go \(PAYG\) earnings-related first pillar statutory pension scheme', 'sistema público de reparto ligado a los ingresos (puntos de pensión)'),
            (r'The ‘sustainability factor\(sf\), that measures the change in the number of standardised contributors in relation to the number of standardised pensioners, links the adjustment of the pension point value to the changes in the statutory pension scheme’s dependency ratio',
             'factor de sostenibilidad que liga la actualización del valor del punto a la relación entre pensionistas y cotizantes')],
    'PRT': [(r'The public contributory welfare system is mainly a defined benefit \(DB\) system, working on a pay-as-you-go \(PAYG\) financing basis', 'sistema contributivo público de prestación definida y reparto'),
            (r'The public complementary system, organized and managed by State, of individual and voluntary initiative, works on a capitalised base', 'régimen público complementario, voluntario y de capitalización')],
    'NLD': [(r'State old-age pensions are financed according to the pay-as-you-go system', 'pensión pública de vejez (AOW) de reparto'),
            (r'occupational pension \(private, funded\)', 'segundo pilar: pensión de empleo privada de capitalización')],
    'DNK': [(r'defined benefit scheme, under- pinned by general taxation, designed to ensure a baseline pension for retirees', 'primer pilar: pensión pública de prestación definida financiada con impuestos generales'),
            (r'A minor funded pension scheme, ATP \(Arbejdsmarkedets Tillægspension\), also belong in the first pillar', 'primer pilar: pequeño régimen de capitalización (ATP)')],
}

NOTA_OCDE = ('Etiqueta en español de {pais} basada en la cita en inglés de «Pensions at a Glance 2025» (OCDE; PDF aportado a mano). Describe la legislación recogida por la OCDE para quien entra en el mercado laboral en 2024 a los 22 años, '
             'no es una descripción completa del sistema (los «Country Profiles» en línea no forman parte del PDF).')
# (iso, cita literal, etiqueta en español, ¿se busca en el texto con diseño (tablas)?, nota adicional)
ENTRADAS_OCDE = [
    ('ESP', 'Spain: The earnings measure is the best 27 years of the 29 years immediately prior to retirement.',
     'pensión pública de prestación definida; medida de ingresos pensionables: los mejores 27 años de los 29 anteriores a la jubilación', False, 'Nota de la tabla 3.4 (parámetros del régimen público de prestación definida).'),
    ('ESP', 'Within PAYG DB schemes, accrual rates of at least 2% apply in Colombia, Portugal, Spain and Türkiye.',
     'régimen de prestación definida y reparto con tasas de acumulación nominales de al menos el 2 % anual (Colombia, Portugal, España y Türkiye)', False, ''),
    ('ESP', 'In Spain and Türkiye, the total accumulated accrual rate is capped at 100% and 90% respectively.',
     'tasa de acumulación total limitada al 100 % de la base de cálculo', False, ''),
    ('ESP', 'Belgium, Colombia, Costa Rica, Spain and the main scheme in France only revalue past earnings with price inflation',
     'los ingresos pasados se revalorizan solo con la inflación (no con el crecimiento de los salarios)', False, 'Es una regla del sistema, no un supuesto económico: explica por qué la tasa de reposición teórica depende del crecimiento real de los salarios (ver ocde-supuestos-reposicion).'),
    ('ESP', 'Spain has provided some more flexibility in retirement timing in its deferral bonus. Previously, the bonus of 4% per year only accumulated per full year of deferral. Since 2025, the bonus instead accumulates at 2% per six months in case of a deferral of at least 18 months.',
     'bonus por demora de la jubilación: antes del 4 % por año completo; desde 2025, el 2 % por semestre con demora de al menos 18 meses', False, 'Reforma de 2024-2025 recogida por la OCDE (anexo 1.A: «Spain, December 2024»).'),
    ('ESP', 'Greece and Spain levy a supplementary contribution of 10% and 9% of earnings, respectively, that does not result in a higher pension.',
     'cotización adicional sobre los ingresos de quien compatibiliza trabajo y pensión tras la edad ordinaria, que no genera una pensión mayor', False, 'Se refiere a la compatibilización de trabajo y pensión; la OCDE dice 9 % para España.'),
    ('ESP', 'Spain, moreover, is the only country that requires that pension uptake is deferred with at least one year before a person can combine work and pension receipt after the normal retirement age.',
     'único país de la OCDE que exige demorar al menos un año el cobro de la pensión para poder compatibilizarla con el trabajo tras la edad ordinaria', False, ''),
    ('ESP', 'In Spain, the gap between pension spending and social security contributions will widen in the coming decades without further reforms, despite high contributions. AIReF (2025[32]) projects that, under current rules, pension spending will raise by 3.2 p.p. of GDP between 2023-2050, reaching 16.1% of GDP in 2050.',
     'la OCDE recoge la proyección de AIReF de 2025: el gasto en pensiones sube 3,2 puntos del PIB entre 2023 y 2050 (16,1 % del PIB en 2050) con las reglas vigentes; es una proyección de AIReF citada por la OCDE, no una estimación de la OCDE', False,
     'Dato de AIReF citado por la OCDE (referencia [32] del capítulo 1). La OCDE añade que implica un desfase entre gasto y cotizaciones; no se reproduce su valoración. Contrastar con data/demografia/ageing-report-2024-espana y con las proyecciones de gasto de ocde-pag.'),
    ('GBR', 'Five of these countries, Denmark, Iceland, the Netherlands, Sweden and the United Kingdom, also have quasi-mandatory, occupational FDC schemes in addition to either compulsory earnings-related public plans or basic pensions.',
     'además de la pensión básica pública, un plan de empleo de capitalización de aportación definida (FDC) cuasi obligatorio', False, 'La tabla 3.1 (panel A) clasifica al Reino Unido con pensión básica contributiva de primer nivel y FDC cuasi obligatorio («FDC [q]») de segundo nivel; el panel B añade un segundo nivel público de prestación definida (DB) para quienes se jubilan en 2024.'),
    ('GBR', 'United Kingdom ✓ FDC [q]',
     'tabla 3.1, panel A (legislación más reciente, personas que entran en 2024 a los 22 años): primer nivel con pensión básica contributiva y segundo nivel privado FDC cuasi obligatorio', True,
     'Lectura de la fila de la tabla 3.1; la columna de la marca (✓) es la de pensión básica contributiva, comprobada sobre la imagen de la página. Columnas: primer nivel (básica, focalizada, básica contributiva, mínima contributiva) y segundo nivel (público, privado).'),
    ('GBR', 'United Kingdom ✓ DB',
     'tabla 3.1, panel B (legislación vigente para quienes se jubilan en 2024, donde difiere del panel A): pensión básica contributiva y segundo nivel público de prestación definida', True,
     'Lectura de la fila del panel B de la tabla 3.1 (columna de pensión básica contributiva y columna de segundo nivel público).'),
    ('GBR', 'Such plans are called “quasi-mandatory” in this report and are included for Denmark, Iceland, the Netherlands, Sweden and the United Kingdom.',
     'el plan de empleo cuasi obligatorio se incluye en los cálculos porque cubre al menos el 85 % de los asalariados', False, 'El umbral del 85 % figura en la frase anterior del informe: «Schemes with near-universal coverage are also included, if they cover at least 85% of employees.»'),
    ('GBR', 'Early retirement is not possible in the basic pension in the United Kingdom for both current and future retirees. However, full-career workers starting today will be able to take early retirement within the quasi-mandatory FDC scheme.',
     'la jubilación anticipada no es posible en la pensión básica, pero sí en el plan FDC cuasi obligatorio para quien empieza hoy', False, 'Nota de la figura 3.9 (edades de jubilación anticipada).'),
    ('USA', 'United States DB',
     'tabla 3.1: un único componente obligatorio, el segundo nivel público de prestación definida (DB), sin primer nivel residencial ni contributivo básico', True,
     'Lectura de la fila de la tabla 3.1: sin marcas en ninguna columna de primer nivel y «DB» en segundo nivel público. El informe señala la prestación focalizada («targeted») como único componente de primer nivel (frase siguiente).'),
    ('USA', 'All OECD countries provide targeted benefits that are subject to means tests; in Australia, Finland, Germany and the United States these are the only first-tier schemes in place.',
     'el primer nivel está formado solo por prestaciones focalizadas sujetas a comprobación de recursos', False, ''),
    ('USA', 'Portugal, Slovenia and the United States also come close by using the best 40, 35 and 35 years, respectively.',
     'ingresos pensionables: los mejores 35 años de la carrera', False, 'Medida de ingresos pensionables de la tabla 3.4 (el informe indica «B35»).'),
    ('USA', 'However, in Czechia, Portugal, the United States and for the public scheme in Switzerland, entitlements vary with earnings levels, granting higher accrual rates to lower earners.',
     'la tasa de acumulación varía con el nivel de ingresos y es mayor para los ingresos bajos', False, ''),
    ('USA', 'United States: valorisation with earnings growth to age 60, no adjustment from 60 to 62, valorisation with price inflation from 62 to 67.',
     'revalorización de los ingresos pasados: con el crecimiento de los salarios hasta los 60 años, sin ajuste de 60 a 62 y con la inflación de 62 a 67', False, 'Nota de la tabla 3.4. La tasa de acumulación se aplica a la media de ingresos en el momento de la jubilación.'),
    ('USA', 'between 15% and 50% of income from public pensions in the United States (social security) is not taxed, depending on the total income of the pensioner',
     'entre el 15 % y el 50 % de la pensión pública no tributa en el impuesto sobre la renta, según los ingresos totales del pensionista', False, 'Tratamiento fiscal de las pensiones públicas citado por la OCDE como ejemplo.'),
    ('USA', 'In the United States, the depletion date of the Old-Age and Survivors Insurance (OASI) Trust Fund has moved forward by three-quarters to the first quarter of 2033',
     'fecha de agotamiento del fondo fiduciario de vejez y supervivencia (OASI): primer trimestre de 2033, adelantada tres trimestres respecto de la proyección anterior', False, 'Proyección de los administradores del fondo (Board of Trustees, 2025) citada por la OCDE, no una estimación de la OCDE.'),
    ('USA', 'In the United States, the spousal supplement is equal to 50% of the higher individual pension within the couple, and the lower pension is deducted from the spousal benefit.',
     'suplemento por cónyuge igual al 50 % de la pensión individual más alta de la pareja, del que se deduce la pensión más baja', False, 'Capítulo 2 (pensiones de pareja y brecha de género).'),
]


def texto(iso):
    t = subprocess.run(['pdftotext', '-layout', f'{RAW}/{iso}.pdf', '-'], capture_output=True, text=True).stdout
    return re.sub(r'\s+', ' ', t)


def main():
    origen = {v['iso']: v for v in json.load(open(f'{RAW}/origen.json')).values()}
    data = []
    for iso, entradas in ENTRADAS.items():
        t = texto(iso)
        o = origen[iso]
        src = {'title': f'2024 Ageing Report, country fiche for {NOMBRE[iso]}', 'publisher': CE, 'url': o['url'], 'docId': f'ageing-report-2024-ficha-{iso.lower()}'}
        for i, (rx, etiqueta) in enumerate(entradas, 1):
            m = re.search(rx, t)
            assert m, f'cita no encontrada en la ficha de {iso}: {rx[:60]}'
            data.append({'id': f'sistema-{iso.lower()}-{i}', 'value': etiqueta, 'unit': 'texto', 'period': '2024', 'source': src, 'fetchedAt': HOY, 'confidence': 'media',
                         'notes': f'Etiqueta en español de {NOMBRE[iso]} basada en la cita en inglés de la ficha (edición 2024 del Ageing Report; la ficha describe el sistema a finales de 2023). '
                                  'Las citas conservan los saltos de palabra del PDF. No es una descripción completa del sistema.',
                         'quote': m.group(0), 'location': 'ficha por país, apartado 1 «Overview of the pension system»'})
    n = {}
    for iso, cita, etiqueta, layout, extra in ENTRADAS_OCDE:
        n[iso] = n.get(iso, 1 if iso == 'ESP' else 0) + 1
        x = ocde_pdf.dato(f'sistema-{iso.lower()}-{n[iso]}', etiqueta, 'texto', cita, (NOTA_OCDE.format(pais=NOMBRE[iso]) + (' ' + extra if extra else '')), 'media', layout)
        data.append(x)
    out = {'tipo': 'datos', 'id': 'paises-sistemas', 'title': 'Estructura del sistema de pensiones de once países según las fichas del Ageing Report 2024 y «Pensions at a Glance 2025»',
           'description': 'Rasgos de la estructura de cada sistema (cuentas nocionales, ajuste automático, capitalización, reparto) con la cita literal en inglés de la ficha por país del Ageing Report 2024 de la Comisión Europea (nueve países) y de «Pensions at a Glance 2025» de la OCDE (Reino Unido y Estados Unidos, que no tienen ficha de la Comisión, y España, con lo que dice la OCDE). '
                          'El PDF de la OCDE no incluye los «Country Profiles» en línea (ver docs/PENDIENTE_DATOS.md).', 'data': data}
    json.dump(out, open(f'{OUT}/paises-sistemas.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{OUT}/paises-sistemas.json', 'a').write('\n')
    ocde_pdf.registra_origen()
    print('paises-sistemas', len(data), 'elementos')


if __name__ == '__main__':
    main()
