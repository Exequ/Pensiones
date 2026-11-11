"""1B-4 (H): supuestos de la tasa de reposición teórica de «Pensions at a Glance» que figuran en los metadatos SDMX del flujo.

Descarga (o lee, con MODO=local) la definición del flujo DSD_PAG@DF_PRR y escribe data/internacional/ocde-supuestos-reposicion.json.
Solo recoge lo que dice el flujo; el crecimiento real de los salarios y la inflación NO aparecen en los metadatos accesibles (ver docs/PENDIENTE_DATOS.md).
"""
import gzip, hashlib, html, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

RAW = f'{REPO}/data-raw/oecd'
URL = 'https://sdmx.oecd.org/public/rest/dataflow/OECD.ELS.SPD/DSD_PAG@DF_PRR/1.0'
OECD = 'OECD (Organización para la Cooperación y el Desarrollo Económicos)'


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
    out = {'tipo': 'datos', 'id': 'ocde-supuestos-reposicion', 'title': 'OCDE, Pensions at a Glance: supuestos de la tasa de reposición teórica que figuran en los metadatos del flujo SDMX',
           'description': 'Edad de entrada al mercado laboral (22 años, literal del flujo) y edad de jubilación considerada para España. No se han encontrado en los metadatos accesibles el crecimiento real de los salarios ni la inflación (ver docs/PENDIENTE_DATOS.md).', 'data': data}
    json.dump(out, open(f'{REPO}/data/internacional/ocde-supuestos-reposicion.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{REPO}/data/internacional/ocde-supuestos-reposicion.json', 'a').write('\n')
    print('supuestos', len(data))


if __name__ == '__main__':
    main()
