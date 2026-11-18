"""Fase 5-A4: revalorización de las pensiones en 2011 según el RDL 8/2010 y el RD 1794/2010.

Origen: `data-raw/boe/RDL-8-2010.pdf` (BOE núm. 126, de 24 de mayo de 2010) y `data-raw/boe/RD-1794-2010.pdf`
(BOE núm. 318, de 31 de diciembre de 2010); texto extraíble, sin OCR. Cada dato lleva una cita literal que el
script busca en el texto de la página indicada y falla si no la encuentra. Alcance: la regla de 2011 (suspensión
de la revalorización de las pensiones contributivas con excepciones y el porcentaje de las excluidas) y el pago
único de la disposición adicional primera, ligado a 2010. **No** cubre la revalorización de 2012, ni el contenido
de la Ley 39/2010 (a la que el RD remite), ni la paga por desviación de 2001 a 2009.

Salida (python3 -I scripts/etl/boe_revalorizacion_2011.py; después, npx prettier --write sobre el JSON):
  data/normativa/revalorizacion-2011-regla.json   tipo «datos»: un dato por regla, con cita, artículo y página.

Validaciones: (a) cada cita existe en la página indicada; (b) la numeración de página del BOE de cada página del
PDF es consecutiva; (c) huella SHA-256 de los PDF; (d) idempotencia (ninguna marca de tiempo).
"""

import hashlib
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.environ.get('SALIDA', f'{REPO}/data/normativa')
FECHA = '2026-11-16'  # fecha de descarga indicada por Sergio
BOE = 'Boletín Oficial del Estado (BOE)'
DOCUMENTOS = {
    'RDL-8-2010': {
        'pdf': f'{REPO}/data-raw/boe/RDL-8-2010.pdf', 'fichero': 'data-raw/boe/RDL-8-2010.pdf', 'docId': 'BOE-A-2010-8228',
        'title': 'Real Decreto-ley 8/2010, de 20 de mayo, por el que se adoptan medidas extraordinarias para la reducción del déficit público.',
        'paginas': 59, 'cve': 'BOE-A-2010-8228',
    },
    'RD-1794-2010': {
        'pdf': f'{REPO}/data-raw/boe/RD-1794-2010.pdf', 'fichero': 'data-raw/boe/RD-1794-2010.pdf', 'docId': 'BOE-A-2010-20149',
        'title': 'Real Decreto 1794/2010, de 30 de diciembre, sobre revalorización de las pensiones del sistema de la Seguridad Social y de otras prestaciones sociales públicas para el ejercicio 2011.',
        'paginas': 14, 'cve': 'BOE-A-2010-20149',
    },
}
NOTA_PROCEDENCIA = (
    'PDF aportado por el autor, descargado el 2026-11-16 según su indicación; la URL es la de la ficha del BOE de la norma '
    '(comprobada) y la huella SHA-256 es la calculada el día de la extracción, sin referencia con la que compararla.'
)

# (id, documento, cita literal, ubicación, valor, unidad, título del dato, notas)
DATOS = [
    ('suspension-contributivas-2011', 'RDL-8-2010',
     'Se suspende para el ejercicio de 2011 la aplicación de lo previsto en el apartado 1.1 del artículo 48 de la ley General de la Seguridad Social, excepto para las pensiones mínimas del Sistema de la Seguridad Social, las pensiones del extinguido SOVI no concurrentes y las pensiones no contributivas.',
     'Artículo 4.Uno, primer párrafo', 1, 'indicador (1 = revalorización suspendida para 2011)',
     'Suspensión de la revalorización de las pensiones contributivas en 2011, salvo mínimos, SOVI no concurrentes y no contributivas',
     'El apartado 1.1 del artículo 48 del texto refundido de la LGSS entonces vigente es el de la revalorización general. El mismo artículo 4.Uno suspende también el apartado 1.2 del artículo 48, con las mismas excepciones (dato siguiente).'),
    ('suspension-actualizacion-ipc-2011', 'RDL-8-2010',
     'Igualmente para el ejercicio de 2011 se suspende la aplicación de lo dispuesto en el apartado 1.2 del artículo 48 de la Ley General de la Seguridad Social, excepto para las pensiones mínimas del Sistema de la Seguridad Social, las pensiones del extinguido SOVI no concurrentes y las pensiones no contributivas.',
     'Artículo 4.Uno, segundo párrafo', 1, 'indicador (1 = actualización suspendida para 2011)',
     'Suspensión de la actualización del apartado 1.2 del artículo 48 de la LGSS en 2011, con las mismas excepciones',
     'Los textos descargados de 2010 no dicen qué contiene el apartado 1.2; el texto del RDL 29/2012 ya descargado (BOE-A-2012-15764) lo cita como «la actualización de las pensiones en los términos previstos en el apartado 1.2 del artículo 48».'),
    ('porcentaje-excluidas-2011', 'RD-1794-2010',
     'este real decreto establece una revalorización del 1 por ciento de los complementos por mínimos de las pensiones del sistema de la Seguridad Social en su modalidad contributiva, de las pensiones no contributivas de dicho sistema, así como de las pensiones no concurrentes del extinguido seguro obligatorio de vejez e invalidez.',
     'Exposición de motivos, párrafo cuarto', 1.0, '%',
     'Revalorización de 2011 de los complementos por mínimos, las pensiones no contributivas y las pensiones no concurrentes del SOVI',
     'El porcentaje consta en la exposición de motivos, no en el articulado; los artículos fijan importes (anexo I, artículo 6, artículo 12) y dicen que la diferencia con los importes de diciembre de 2010 «tendrá carácter de a cuenta de la evolución del IPC real en el período noviembre 2010-noviembre 2011».'),
    ('a-cuenta-del-ipc-2011', 'RD-1794-2010',
     'tendrán carácter de a cuenta de la evolución del IPC real en el período noviembre 2010-noviembre 2011.',
     'Artículo 3.2 (complementos por mínimos); análogo en los artículos 6.1 y 12.2', 1, 'indicador (1 = a cuenta del IPC real noviembre 2010-noviembre 2011)',
     'Carácter «a cuenta» del IPC real de la diferencia de los complementos por mínimos',
     'El texto no dice cómo se liquida esa cuenta; no se descargó la norma que lo haga.'),
    ('resto-mantienen-cuantia-2011', 'RD-1794-2010',
     'mantendrán la cuantía que tuvieran reconocida al 31 de diciembre de 2010',
     'Artículo 2.3', 0.0, '%',
     'Pensiones no afectadas por la revalorización del real decreto: se mantiene la cuantía de 31 de diciembre de 2010',
     'El texto no enuncia un porcentaje: «mantendrán la cuantía» equivale a un incremento nulo (valor derivado del texto). El artículo remite a la disposición adicional primera para el pago único.'),
    ('pago-unico-referencia-2010', 'RD-1794-2010',
     'una cantidad equivalente a la diferencia entre el importe de la pensión percibida durante el ejercicio 2010 y el que hubiese correspondido de haberse revalorizado la pensión en dicho ejercicio en el 2,3 por ciento',
     'Disposición adicional primera, apartado 1', 2.3, '%',
     'Pago único de 2011 por la diferencia con un 2,3 % de revalorización en 2010 (colectivos del apartado 1)',
     'Es un pago único antes del 1 de abril de 2011 ligado al ejercicio 2010; el apartado 3 de la misma disposición lo calcula, para pensiones mínimas y SOVI, con «el incremento real experimentado por el IPC en el período noviembre de 2009-noviembre de 2010, una vez deducido de la misma un 1 por ciento». El texto no lo llama «paga por desviación».'),
]


def sha256(ruta):
    with open(ruta, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def paginas(ruta):
    s = subprocess.run(['pdftotext', '-layout', ruta, '-'], capture_output=True, text=True, check=True).stdout.split('\f')
    if s and not s[-1].strip():
        s.pop()
    return s


def normaliza(t):
    """Espacios simples y sin cortes de línea; los guiones de división de palabra no aparecen en estos textos."""
    return re.sub(r'\s+', ' ', t).strip()


def pagina_boe(texto):
    m = re.search(r'Sec\. I\. Pág\. (\d+)', texto)
    return int(m.group(1)) if m else None


def lee_documentos():
    docs = {}
    for k, d in DOCUMENTOS.items():
        ps = paginas(d['pdf'])
        if len(ps) != d['paginas']:
            raise SystemExit(f'{d["pdf"]}: se esperaban {d["paginas"]} páginas y hay {len(ps)}')
        boe = [pagina_boe(t) for t in ps]
        if None in boe or any(b - a != 1 for a, b in zip(boe, boe[1:])):
            raise SystemExit(f'{d["pdf"]}: la numeración de página del BOE no es consecutiva')
        if any(f'cve: {d["cve"]}' not in t for t in ps):
            raise SystemExit(f'{d["pdf"]}: alguna página no lleva el CVE {d["cve"]}')
        docs[k] = {'paginas': [normaliza(t) for t in ps], 'boe': boe, 'sha256': sha256(d['pdf'])}
    return docs


def localiza(docs, doc, cita):
    """Página del PDF (desde 1) en la que figura la cita; las citas que cruzan de página se buscan en el texto unido
    de dos páginas consecutivas (se devuelve la primera). Falla si no está."""
    ps = docs[doc]['paginas']
    c = normaliza(cita)
    # la cabecera y el pie de página no interrumpen la cita: se compara también sin ellos
    limpias = [re.sub(r'BOLETÍN OFICIAL DEL ESTADO Núm\. \d+ \S+ \d+ de \S+ de \d+ Sec\. I\. Pág\. \d+', ' ', re.sub(r'cve: BOE-A-\d{4}-\d+', ' ', t)) for t in ps]
    limpias = [normaliza(t) for t in limpias]
    hallazgos = [i for i, t in enumerate(limpias, start=1) if c in t]
    if len(hallazgos) == 1:
        return hallazgos[0]
    if len(hallazgos) > 1:
        raise SystemExit(f'cita repetida en {doc}, páginas {hallazgos}: {cita[:60]}')
    for i in range(len(limpias) - 1):
        if c in normaliza(limpias[i] + ' ' + limpias[i + 1]):
            return i + 1
    raise SystemExit(f'cita no encontrada en {doc}: {cita[:80]}')


def construye(docs):
    data = []
    for id_, doc, cita, ubicacion, valor, unidad, titulo, notas in DATOS:
        d = DOCUMENTOS[doc]
        p = localiza(docs, doc, cita)
        b = docs[doc]['boe'][p - 1]
        data.append(OrderedDict([
            ('id', id_), ('value', valor), ('unit', unidad), ('period', '2011'),
            ('source', OrderedDict([('title', d['title']), ('publisher', BOE), ('url', f'https://www.boe.es/buscar/doc.php?id={d["docId"]}'), ('docId', d['docId'])])),
            ('fetchedAt', FECHA), ('confidence', 'alta' if id_ != 'resto-mantienen-cuantia-2011' else 'media'),
            ('notes', f'{titulo}. {notas} {NOTA_PROCEDENCIA} Huella SHA-256 del PDF: {docs[doc]["sha256"]}.'),
            ('quote', cita), ('location', f'{ubicacion}; página {p} del PDF (BOE, pág. {b})'),
        ]))
    return data


def escribe(data):
    archivo = OrderedDict([
        ('tipo', 'datos'),
        ('id', 'revalorizacion-2011-regla'),
        ('title', 'Revalorización de las pensiones en 2011: suspensión, porcentaje de las pensiones excluidas y pago único (RDL 8/2010 y RD 1794/2010)'),
        ('description', 'Reglas de 2011 extraídas del texto del Real Decreto-ley 8/2010 y del Real Decreto 1794/2010, cada una con su cita literal, artículo y página. No hay aquí un porcentaje general de 2011: las pensiones contributivas no excluidas no se revalorizan (suspensión) y las excluidas (complementos por mínimos, no contributivas y SOVI no concurrentes) lo hacen en un 1 %. No cubre 2012 ni el contenido de la Ley 39/2010 a la que remite el real decreto.'),
        ('data', data),
    ])
    ruta = f'{SALIDA}/revalorizacion-2011-regla.json'
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump(archivo, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps({'datos': len(data), 'rdl_sha256': DOCUMENTOS and sha256(DOCUMENTOS['RDL-8-2010']['pdf'])[:12]}, ensure_ascii=False))


if __name__ == '__main__':
    escribe(construye(lee_documentos()))
    sys.exit(0)
