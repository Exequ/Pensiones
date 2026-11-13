"""Base mínima de cotización del Régimen General (grupos 4-7) de 2020 y de 2021 (enero-agosto).

2020: no hubo orden anual de cotización (prórroga del RDL 18/2019) y ninguna norma descargada da la
cuantía. La da el Anexo al informe económico-financiero a los presupuestos de la Seguridad Social de
2021 (Ministerio de Inclusión, Seguridad Social y Migraciones), Cuadro I.3, columna «01-01-20».
2021 (1 de enero a 31 de agosto): el artículo 119.Dos.1.a) de la Ley 11/2020 incrementa las bases
mínimas «respecto de las vigentes en 31 de diciembre de 2020» en el mismo porcentaje que el SMI; el
SMI no cambió hasta el 1 de septiembre de 2021 (preámbulo de la Orden PCM/1353/2021). Valor deducido
de esas dos fuentes (confianza «media»).

Lee los extractos de data-raw/base-minima-2020-2021 (huella en origen.json) y los ficheros de /data.
Orden de ejecución: va DESPUÉS de scripts/etl/cotizacion_2013_2026.py, porque contrasta con los
ficheros de /data que escribe aquel (bases de 2019 y 2020). Después de ejecutarlo, el orden entre
ambos ya no importa: los dos fusionan por identificador.
Uso: python3 -I scripts/etl/base_minima_2020_2021.py
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from comun import REPO, dato, fusionar, num

HOY = os.environ.get('FECHA_DESCARGA', '2026-11-13')
RAW = f'{REPO}/data-raw/base-minima-2020-2021'
URL_ANEXO = 'https://www.seg-social.es/wps/wcm/connect/wss/5410001a-62f0-4ab7-8a78-f214bb85c43c/202120004.pdf'
BOE = 'Boletín Oficial del Estado (BOE)'


def leer(ruta):
    with open(ruta, encoding='utf-8') as f:
        return f.read()


def datos(id_):
    with open(f'{REPO}/data/parametros/{id_}.json', encoding='utf-8') as f:
        return {d['id']: d for d in json.load(f)['data']}


# ---- Cuadro I.3 del anexo: filas de los grupos 4 a 7 (columnas 01-01-18, 01-08-18, 01-01-19, 01-01-20)
pagina = leer(f'{RAW}/informe-economico-2021-cuadro-I3-pdf-p19.txt')
cab = re.search(r'01-01-18 \(Euros\)\s+01-08-18 \(Euros\)\s+01-01-19 \(Euros\)\s+01-01-20 \(Euros\)', pagina)
assert cab
pagina = pagina[cab.end():]  # solo la tabla con esas cuatro columnas
filas = {}
for g in (4, 5, 6, 7):
    m = re.search(rf'^\s*{g}\. [^\n]*?((?:\s+[\d.]+,\d\d){{8}})\s*$', pagina, re.M)
    assert m, g
    n = [num(x) for x in m.group(1).split()]
    filas[g] = n
    assert n[0] == n[2] == 858.6 and n[4] == 1050.0 and n[7] == 4070.1, (g, n)
assert len({tuple(v) for v in filas.values()}) == 1, filas
n = filas[7]
min2019, max2019, min2020, max2020 = n[4], n[5], n[6], n[7]
fila_literal = re.search(r'^\s*7\. [^\n]*$', pagina, re.M).group(0)
fila_literal = re.sub(r'\s+', ' ', fila_literal).strip()

# ---- Contrastes con /data
bmin, bmax, smi = datos('base-minima-rg'), datos('base-maxima-rg'), datos('smi-mensual')
assert bmin['2019']['value'] == min2019, 'la base mínima de 2019 del anexo no coincide con la Orden TMS/83/2019'
assert bmax['2020']['value'] == max2020 and bmax['2019']['value'] == max2019
smi2020 = smi['2020']['value']
assert smi['2021']['value'] == 965.0 and smi2020 == 950.0
diario = re.search(r'^\s*8\. [^\n]*?\s([\d.]+,\d\d)\s+([\d.]+,\d\d)\s*$', pagina, re.M)
assert diario and num(diario.group(1)) == 36.95 and num(diario.group(2)) == 135.67
assert round(num(diario.group(1)) * 30, 2) == min2020  # base diaria × 30 = base mensual del anexo
asi_smi = round(smi2020 * 7 / 6, 2)  # art. 19.2 TRLGSS: SMI incrementado en un sexto (1.108,33)
assert abs(asi_smi - min2020) < 0.2

# ---- Textos de las normas de 2021
ley = leer(f'{REPO}/data-raw/boe/BOE-A-2020-17339.txt')
cita_ley = ('Las bases mínimas de cotización, según categorías profesionales y grupos de cotización, se incrementarán '
            'desde el 1 de enero de 2021, y respecto de las vigentes en 31 de diciembre de 2020, en el mismo porcentaje '
            'en que aumente el salario mínimo interprofesional.')
assert cita_ley in re.sub(r'\s+', ' ', ley)
pre = re.sub(r'\s+', ' ', leer(f'{RAW}/orden-pcm-1353-2021-preambulo.txt'))
cita_prorroga = ('prorrogó la vigencia del Real Decreto 231/2020, de 4 de febrero, por el que se fija el salario mínimo '
                 'interprofesional para 2020, hasta tanto se apruebe el real decreto por el que se fije el salario mínimo '
                 'interprofesional para el año 2021')
cita_efectos = 'en 32,17 euros/día o 965 euros/mes, si bien se fijan sus efectos a partir del 1 de septiembre de 2021'
assert cita_prorroga in pre and cita_efectos in pre

f = lambda x: f'{x:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
fuente_anexo = {
    'title': 'Anexo al informe económico-financiero a los presupuestos de la Seguridad Social de 2021 (Cuadro I.3: evolución de las bases mínimas y máximas de cotización del Régimen General)',
    'publisher': 'Ministerio de Inclusión, Seguridad Social y Migraciones (Dirección General de Ordenación de la Seguridad Social)',
    'url': URL_ANEXO,
}
d2020 = dato(
    2020, min2020, 'euros/mes', fuente_anexo,
    f'Cuadro I.3, grupo 7 (Auxil. Administrativos), columnas 01-01-18, 01-08-18, 01-01-19 y 01-01-20 (B/m, B/M): «{fila_literal}»',
    'Cuadro I.3 (página 19 del PDF), columna «01-01-20»',
    'Grupos 4 a 7 (idénticos). Sin orden anual de cotización en 2020 (prórroga del RDL 18/2019): la cuantía no consta en ninguna '
    'norma descargada y procede de este anexo del Ministerio. Contrastes por código: la columna «01-01-19» del mismo cuadro '
    f'(1.050,00) coincide con la Orden TMS/83/2019 de /data y la base máxima de la columna «01-01-20» ({f(max2020)}) con '
    f'/data; base diaria 36,95 × 30 = {f(min2020)}; el SMI de 2020 ({f(smi2020)}) × 7/6 (art. 19.2 TRLGSS) da {f(asi_smi)}, '
    'redondeado en el anexo a la base diaria (36,95 €/día).',
    confidence='alta',
)
fuente_ley = {
    'title': 'Ley 11/2020, de 30 de diciembre, de Presupuestos Generales del Estado para el año 2021.',
    'publisher': BOE, 'url': 'https://www.boe.es/buscar/doc.php?id=BOE-A-2020-17339', 'docId': 'BOE-A-2020-17339',
}
fuente_orden = {
    'title': 'Orden PCM/1353/2021, de 2 de diciembre, por la que se desarrollan las normas legales de cotización a la Seguridad Social, desempleo, protección por cese de actividad, Fondo de Garantía Salarial y Formación Profesional para el ejercicio 2021.',
    'publisher': BOE, 'url': 'https://www.boe.es/buscar/doc.php?id=BOE-A-2021-20075', 'docId': 'BOE-A-2021-20075',
}
d2021 = dato(
    2021, min2020, 'euros/mes', fuente_ley,
    f'Ley 11/2020, art. 119.Dos.1.a): «{cita_ley}» || Orden PCM/1353/2021, preámbulo: «…{cita_prorroga}…» y «…{cita_efectos}»',
    'Ley 11/2020, artículo 119.Dos.1.a); Orden PCM/1353/2021, preámbulo (cuarto y quinto párrafos)',
    f'Valor DEDUCIDO, no publicado: vigente del 1 de enero al 31 de agosto de 2021. La ley incrementa la base de 31-12-2020 '
    f'({f(min2020)}, dato de 2020) en el porcentaje de aumento del SMI, y el SMI no aumentó hasta el 1 de septiembre de 2021 '
    '(el RDL 38/2020 prorrogó el RD 231/2020, y el RD 817/2021 fijó el nuevo con efectos desde esa fecha), luego el porcentaje fue 0. '
    'Desde el 1 de septiembre de 2021 la base mínima fue 1.125,90 euros/mes (Orden PCM/1353/2021, art. 3); este fichero guarda '
    'el valor vigente el 1 de enero de cada año, así que el motor aplica 1.108,50 a todo 2021 (los cuatro últimos meses quedan '
    'alrededor de un 1,5 % por debajo del valor legal).',
    confidence='media',
)
d2021['crossCheck'] = {
    'source': fuente_orden, 'fetchedAt': HOY, 'matches': True,
    'notes': 'Localización: preámbulo. Confirma que el SMI de 2020 siguió vigente hasta el 31-8-2021 y que la Orden solo fija la tabla desde el 1-9-2021.',
}
for d in (d2020, d2021):
    d['fetchedAt'] = HOY
fusionar('parametros', 'base-minima-rg', [d2020, d2021])
