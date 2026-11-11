"""A3 de la Fase 1C: descripción de la estructura del sistema de pensiones de cada país, con cita literal.

Fuente: fichas por país del «2024 Ageing Report» de la Comisión Europea (descargadas a data-raw/ce-ageing/fichas/;
los PDF no se versionan, su URL y huella están en origen.json). No se ha podido usar la OCDE (el sitio responde 403 a
las descargas automáticas del texto de los perfiles) y el Reino Unido y Estados Unidos no tienen ficha de la CE
(ver docs/PENDIENTE_DATOS.md). Cada etiqueta en español se apoya en una cita en inglés cuya presencia en el PDF
comprueba el script. Ejecutar con `python3 -I scripts/etl/paises_fichas.py` (requiere pdftotext).
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

RAW = f'{REPO}/data-raw/ce-ageing/fichas'
OUT = f'{REPO}/data/internacional'
CE = 'Comisión Europea (DG ECFIN) y Comité de Política Económica (Grupo de Trabajo sobre Envejecimiento)'
NOMBRE = {'ESP': 'España', 'FRA': 'Francia', 'ITA': 'Italia', 'SWE': 'Suecia', 'POL': 'Polonia', 'DEU': 'Alemania', 'PRT': 'Portugal', 'NLD': 'Países Bajos', 'DNK': 'Dinamarca'}
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
    out = {'tipo': 'datos', 'id': 'paises-sistemas', 'title': 'Estructura del sistema de pensiones de nueve países según las fichas del Ageing Report 2024',
           'description': 'Rasgos de la estructura de cada sistema (cuentas nocionales, ajuste automático, capitalización, reparto) con la cita literal en inglés de la ficha por país del Ageing Report 2024 de la Comisión Europea. '
                          'Reino Unido y Estados Unidos no tienen ficha de la Comisión; los perfiles de la OCDE no se han podido descargar (ver docs/PENDIENTE_DATOS.md).', 'data': data}
    json.dump(out, open(f'{OUT}/paises-sistemas.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{OUT}/paises-sistemas.json', 'a').write('\n')
    print('paises-sistemas', len(data), 'elementos')


if __name__ == '__main__':
    main()
