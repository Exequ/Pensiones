"""Fase 5-A3: Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2023 (extracto).

Origen: data-raw/tribunal-cuentas/declaracion-cge-2023-extracto.pdf (42 páginas del original de 572,
elegidas por el autor; véase data-raw/tribunal-cuentas/LEEME.txt). El texto es extraíble. El LEEME
da la huella del original (no del extracto) y las páginas físicas del original que contiene el
extracto, en orden; aquí se calcula la huella del extracto y se comprueba que la correspondencia
página del extracto -> página del original es coherente con la numeración impresa de cada página.

Se extraen: (1) las cifras del texto de los apartados 4.16 y 5.34 sobre préstamos del Estado,
transferencias por finalidad, aportaciones no contributivas y Fondo de Reserva, cada una con la
cita literal; (2) el Anexo 10 («Préstamos otorgados por el Estado a la Seguridad Social»), línea a
línea, con subtotales y total, y (3) la serie derivada de préstamos concedidos por año (2017 a 2024).

Salidas (python3 -I scripts/etl/tc_cge2023_seguridad_social.py; después, npx prettier --write):
  data/sistema/tribunal-cuentas-cge2023-ss.json              datos sueltos y serie derivada
  data/sistema/tribunal-cuentas-cge2023-prestamos.csv/.json  Anexo 10, tipo «extraccion-pdf»

Validaciones dentro del script (el script falla si alguna no se cumple): subtotales del Anexo 10 =
suma de sus líneas; total = suma de subtotales; préstamos 1992-1999 del texto = subtotales 1 a 3;
préstamos de 2017 a 2023 del texto = suma de las líneas concedidas hasta 2023; deuda a fin de 2023
del texto = total del anexo menos el préstamo desembolsado en 2024; transferencias 2018-2023 del
texto = finalidad de equilibrio + base normativa de 2021; porcentaje del PIB del texto = deuda / PIB
del texto. Tolerancia: 0,1 millones (las cifras del texto y del anexo tienen un decimal).
"""

import hashlib
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.environ.get('SALIDA', f'{REPO}/data/sistema')  # directorio de salida (los tests lo cambian)
PDF_REL = 'data-raw/tribunal-cuentas/declaracion-cge-2023-extracto.pdf'
PDF = f'{REPO}/{PDF_REL}'
FECHA = '2026-11-14'  # LEEME: «Descargado el: 2026-11-14 (manual, por Sergio)»
URL = 'https://www.congreso.es/docu/inf_fiscTC/LegXV/250-6.pdf'
SHA_ORIGINAL = 'c32a639cd9f39539bdc752b70fae18f0b64535b19d6c400ec27159e1548648cb'  # LEEME (original de 572 páginas)
# Páginas físicas del original incluidas en el extracto, en orden (LEEME): 1-3,15,35-47,59-62,67,73-76,84,94,102,120,128-129,135-137,262,467-470,511,553
PAGINAS_ORIGINAL = (
    [1, 2, 3, 15] + list(range(35, 48)) + list(range(59, 63)) + [67] + list(range(73, 77)) + [84, 94, 102, 120, 128, 129, 135, 136, 137, 262]
    + list(range(467, 471)) + [511, 553]
)
FUENTE = {
    'title': 'Declaración sobre la Cuenta General del Estado del ejercicio 2023 (N.º 1.617), aprobada por el Pleno del Tribunal de Cuentas el 28 de abril de 2025',
    'publisher': 'Tribunal de Cuentas, publicada por las Cortes Generales (Congreso de los Diputados)',
    'url': URL,
}
UNIDAD = 'millones de euros'
NOTA_FUENTE = (
    'Extracto de 42 páginas del original de 572; el original no se incluye en el repositorio. Descargado a mano por el autor el 2026-11-14.'
)
TOL = 0.1


def num(s):
    """'3.372,4' -> 3372.4 (conserva los decimales que trae la cifra: uno en importes, dos en porcentajes)."""
    return float(s.replace('.', '').replace(',', '.'))


def sha256(ruta):
    with open(ruta, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def paginas_texto():
    salida = subprocess.run(['pdftotext', '-layout', PDF, '-'], capture_output=True, text=True, check=True).stdout
    p = salida.split('\f')
    if p and not p[-1].strip():
        p.pop()
    if len(p) != len(PAGINAS_ORIGINAL):
        raise SystemExit(f'El extracto tiene {len(p)} páginas y el LEEME lista {len(PAGINAS_ORIGINAL)}')
    return p


RE_PIE = re.compile(r'^\s*(?:ANEXOS A LA )?DECLARACI[ÓO]N SOBRE LA CUENTA GENERAL DEL ESTADO DEL EJERCICIO 2023\s+(\d+)\s*$')


def pagina_impresa(texto):
    """Número impreso en el pie de la página (o None si no lo tiene)."""
    for l in reversed(texto.splitlines()):
        m = RE_PIE.match(l)
        if m:
            return int(m.group(1))
    return None


def comprobar_correspondencia(paginas):
    """El desfase entre página impresa y página física del original es constante en cada bloque contiguo."""
    desfases = {}
    for i, t in enumerate(paginas):
        imp = pagina_impresa(t)
        if imp is None:
            continue
        desfases[i + 1] = PAGINAS_ORIGINAL[i] - imp
    # bloques contiguos del original
    previo = None
    bloque = []
    for i in range(len(PAGINAS_ORIGINAL)):
        if previo is not None and PAGINAS_ORIGINAL[i] != previo + 1:
            bloque = []
        bloque.append(i + 1)
        previo = PAGINAS_ORIGINAL[i]
        d = [desfases[k] for k in bloque if k in desfases]
        if len(set(d)) > 1:
            raise SystemExit(f'Desfase de numeración incoherente en el bloque que acaba en la página {i + 1} del extracto: {d}')
    return desfases


def texto_con_paginas(paginas):
    """Texto normalizado y lista (desplazamiento inicial, página del extracto) para localizar cada cita."""
    trozos = []
    marcas = []
    pos = 0
    for i, t in enumerate(paginas, start=1):
        lineas = [l for l in t.splitlines() if l.strip() and not RE_PIE.match(l)]
        s = re.sub(r'\s+', ' ', ' '.join(lineas)).strip() + ' '
        marcas.append((pos, i))
        trozos.append(s)
        pos += len(s)
    return ''.join(trozos), marcas


def pagina_de(marcas, pos):
    p = 1
    for ini, i in marcas:
        if ini <= pos:
            p = i
    return p


def limpia(cita):
    """Quita llamadas a nota pegadas a la palabra anterior («corrientes63») y espacios sobrantes."""
    cita = re.sub(r'(corrientes|millones|PIB de 2023)(\d{2,3})\b', r'\1', cita)
    return re.sub(r'\s+', ' ', cita).strip()


def anexo10(paginas):
    """Líneas del Anexo 10: (n.º, bloque, norma, importe, vencimiento, página del extracto) y subtotales y total."""
    items = []
    subtotales = {}
    total = None
    for pidx in (30, 31):  # páginas 31 y 32 del extracto (índices 30 y 31)
        texto = paginas[pidx]
        lineas = [l for l in texto.splitlines() if l.strip()]
        bloque = ''
        actual = None

        def cerrar():
            nonlocal actual
            if actual is not None:
                bruto = ' '.join(actual['lineas'])
                bruto = re.sub(r'\s+', ' ', bruto)
                m_imp = re.search(r'(\d{1,3}(?:\.\d{3})*,\d)\b(?!\d)', re.sub(r'\d+/\d{4}', '', bruto))
                if not m_imp:
                    raise SystemExit(f'Anexo 10: la línea {actual["n"]} no tiene importe: {bruto}')
                m_ven = re.search(r'(10 años (?:a )?partir de (\d{4})|No se indica)', bruto)
                if not m_ven:
                    raise SystemExit(f'Anexo 10: la línea {actual["n"]} no tiene vencimiento: {bruto}')
                norma = bruto[: bruto.index(m_imp.group(1))].strip() if m_imp.group(1) in bruto else bruto
                # el importe va después de la norma; si la norma ocupa dos líneas, el importe puede ir en la segunda
                items.append({'n': actual['n'], 'bloque': actual['bloque'], 'norma': norma, 'importe': num(m_imp.group(1)),
                              'vencimiento': m_ven.group(1), 'anio_vencimiento': int(m_ven.group(2)) if m_ven.group(2) else None,
                              'pagina_extracto': pidx + 1, 'texto': bruto})
                actual = None

        for l in lineas:
            s = l.strip()
            if re.match(r'^ANEXOS A LA DECLARACI', s) or 'Fuente: Elaboración propia' in s or s.startswith('(*)'):
                continue
            mb = re.match(r'^(I|II|III|IV)\.-\s+(.*)$', s)
            if mb:
                cerrar()
                bloque = mb.group(1)
                continue
            mi = re.match(r'^(\d{1,2})\.-\s+(.*)$', s)
            if mi:
                cerrar()
                actual = {'n': int(mi.group(1)), 'bloque': bloque, 'lineas': [mi.group(2)]}
                continue
            ms = re.match(r'^SUBTOTAL \((\d)\)\s+(\d{1,3}(?:\.\d{3})*,\d)\s*$', s)
            if ms:
                cerrar()
                subtotales[int(ms.group(1))] = {'importe': num(ms.group(2)), 'pagina_extracto': pidx + 1, 'texto': s}
                continue
            mt = re.match(r'^TOTAL \(1\) \+ \(2\) \+ \(3\) \+ \(4\)\s+(\d{1,3}(?:\.\d{3})*,\d)\s*$', s)
            if mt:
                cerrar()
                total = {'importe': num(mt.group(1)), 'pagina_extracto': pidx + 1, 'texto': s}
                continue
            if actual is not None:
                # continuación de la norma (o texto de la ampliación de plazo, ya fuera de interés)
                actual['lineas'].append(s)
        cerrar()
    return items, subtotales, total


def main():
    paginas = paginas_texto()
    desfases = comprobar_correspondencia(paginas)
    huella = sha256(PDF)
    texto, marcas = texto_con_paginas(paginas)

    def loc(pos_ini, pos_fin):
        a, b = pagina_de(marcas, pos_ini), pagina_de(marcas, max(pos_ini, pos_fin - 1))
        o = (PAGINAS_ORIGINAL[a - 1], PAGINAS_ORIGINAL[b - 1])
        pr = [pagina_impresa(paginas[k - 1]) for k in (a, b)]
        rot = f'p. {o[0]}' if o[0] == o[1] else f'pp. {o[0]}-{o[1]}'
        return f'Declaración CGE 2023, {rot} del original (página del extracto {a}' + ('' if a == b else f'-{b}') + ')', a, b

    datos = []
    hechos = {}

    def cifra(id_, periodo, patron, notas, unidad=UNIDAD, grupo=1, naturaleza='observado'):
        m = re.search(patron, texto)
        if not m:
            raise SystemExit(f'SIN COINCIDENCIA {id_}: {patron}')
        ubic, a, b = loc(m.start(), m.end())
        v = num(m.group(grupo)) if ',' in m.group(grupo) or '.' in m.group(grupo) else float(m.group(grupo))
        hechos[id_] = v
        datos.append(OrderedDict([
            ('id', id_), ('value', v), ('unit', unidad), ('period', periodo), ('source', FUENTE), ('fetchedAt', FECHA),
            ('confidence', 'alta'), ('naturaleza', naturaleza),
            ('notes', f'{notas} {NOTA_FUENTE} SHA-256 del extracto: {huella}; del original (LEEME): {SHA_ORIGINAL}.'),
            ('quote', limpia(m.group(0))), ('location', ubic),
        ]))

    # --- apartado 4.16 (patrimonio neto, deuda con el Estado y transferencias)
    cifra('deuda-ss-con-estado-2023', '2023', r'endeudamiento frente al Estado, a 31 de diciembre de 2023, de (\d{1,3}(?:\.\d{3})*,\d)\s*millones',
          'Saldo a 31 de diciembre de 2023 del endeudamiento de la Seguridad Social frente al Estado por los préstamos concedidos, según el Tribunal de Cuentas.')
    cifra('deuda-ss-con-estado-2023-pib', '2023', r'millones \(un (\d,\d{2}) % del PIB de 2023',
          'Porcentaje del PIB de 2023 con que el Tribunal expresa el saldo anterior (cifra del texto, no calculada aquí).', unidad='% del PIB')
    cifra('pib-2023-segun-tribunal', '2023', r'el PIB a precios corrientes se sitúa en (\d{1,3}(?:\.\d{3})+) millones de euros',
          'PIB de 2023 a precios corrientes que cita el Tribunal (nota de prensa del INE de 18 de septiembre de 2024).')
    cifra('prestamos-1992-1999', '1999', r'se concedieron once préstamos por (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Importe de los once préstamos concedidos entre 1992 y 1999 (apartado 5.34).')
    cifra('prestamos-concedidos-2017-2023', '2023', r'entre 2017 y 2023, se han concedido nuevos préstamos por importe de (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Suma de los préstamos concedidos por el Estado a la Seguridad Social entre 2017 y 2023 (acumulado, no un dato anual).')
    cifra('prestamo-concedido-2024', '2024', r'para 2024, la LPGE para 2023 prorrogada otorga un nuevo préstamo con las mismas condiciones por (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Préstamo de 2024 en virtud de la prórroga de la LPGE de 2023, reconocido y recaudado durante 2024.')
    cifra('prestamos-insalud', '1991', r'tres de estos préstamos concedidos a la Seguridad Social, por (\d{1,3}(?:\.\d{3})*,\d)\s*millones',
          'Tres préstamos para cancelar obligaciones pendientes del extinto INSALUD a 31 de diciembre de 1991 sobre los que existe una recomendación de asunción por el Estado.')
    cifra('prestamos-resto-1992-1999', '1999', r'Respecto a los ocho préstamos restantes, por (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Ocho préstamos de 1992 a 1999 distintos de los del INSALUD (apartado 5.34).')
    cifra('transferencias-corrientes-2018-2023', '2023', r'entre 2018 y 2023, el Estado ha aportado a la Seguridad Social transferencias corrientes\d* por (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Transferencias corrientes del Estado a la Seguridad Social, acumulado 2018-2023, en el concepto del Tribunal de Cuentas.')
    cifra('transferencias-equilibrio-2018-2021', '2021', r'(\d{1,3}(?:\.\d{3})*,\d) millones de las transferencias recibidas entre 2018 y 2021 han tenido por finalidad apoyar su equilibrio presupuestario',
          'Parte de las transferencias de 2018 a 2021 con finalidad de apoyar el equilibrio presupuestario (nota 64).')
    cifra('transferencias-covid-2020-2021', '2021', r'\((\d{1,3}(?:\.\d{3})*,\d) millones para equilibrar el impacto derivado del COVID-19\)',
          'Parte de la finalidad de equilibrio presupuestario destinada a equilibrar el impacto de la COVID-19 en 2020 y 2021 (nota 64).')
    cifra('transferencias-base-normativa-2021-2023', '2023', r'otorgadas entre 2021 y 2023 por (\d{1,3}(?:\.\d{3})*) millones, se fundamentan en la modificación normativa',
          'Transferencias de 2021 a 2023 basadas en la modificación del TRLGSS por la LPGE de 2021 (nota 64).')
    cifra('transferencias-misma-finalidad-2024', '2024', r'En el ejercicio 2024 la Seguridad Social, con base en la prórroga de la LPGE para 2023, también ha recibido transferencias con idéntica finalidad, por (\d{1,3}(?:\.\d{3})*) millones',
          'Transferencias recibidas en 2024 con idéntica finalidad, en virtud de la prórroga de la LPGE de 2023.')
    cifra('aportaciones-no-contributivas-2023', '2023', r'conceptos de naturaleza no contributiva, que para 2023, ascienden a (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Aportaciones del Estado en 2023 para la financiación de conceptos de naturaleza no contributiva, según el Tribunal (cifra que cita el texto aparte de las transferencias anteriores).')
    cifra('lpge-2023-para-financiar-otros-conceptos', '2023', r'transferencias a favor de la Seguridad Social por (\d{1,3}(?:\.\d{3})*,\d) millones de euros bajo la rúbrica Para financiar otros conceptos',
          'Importe previsto en el artículo 12.Cuatro de la LPGE de 2023 bajo la rúbrica «Para financiar otros conceptos» (previsión de la ley, no ejecución).', naturaleza='observado')
    # --- Fondo de Reserva
    cifra('frss-reserva-patrimonial-2023', '2023', r'el saldo de esta reserva asciende a (\d{1,3}(?:\.\d{3})*,\d) millones de euros',
          'Saldo a 31 de diciembre de 2023 de la reserva patrimonial del Fondo de Reserva en el balance de la Tesorería General, según el Tribunal (criterio contable de balance, no el precio de adquisición de la serie del Fondo).')
    cifra('frss-dotacion-mei-2023', '2023', r'cotización finalista del Mecanismo de Equidad Intergeneracional \(MEI\) fijada en el artículo 127 bis\. 1 del TRLGSS, por (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Dotación de 2023 procedente de la cotización del MEI, según el Tribunal.')
    cifra('frss-dotacion-excedentes-2023', '2023', r'contingencias profesionales\d*, por (\d{1,3}(?:\.\d{3})*,\d) millones, que se integran en este Fondo',
          'Dotación de 2023 procedente del 80 % del exceso de los excedentes de las mutuas por contingencias profesionales, según el Tribunal.')
    cifra('frss-tesoreria-cuenta-especifica-2023', '2023', r'el saldo de tesorería, a 31 de diciembre de 2023, existente en la cuenta específica del FRSS abierta en el Banco de España, por (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Saldo de tesorería a 31 de diciembre de 2023 en la cuenta específica del Fondo en el Banco de España, según el Tribunal.')
    cifra('frss-mei-octubre-noviembre-2023', '2023', r'no recoge los ingresos del MEI correspondientes a los meses de octubre y noviembre de 2023 que ascienden a (\d{1,3}(?:\.\d{3})*,\d) millones',
          'Ingresos del MEI de octubre y noviembre de 2023 que, según el Tribunal, no están en la cuenta específica pero sí en la reserva del balance.')
    # --- textos literales
    def literal(id_, periodo, patron, notas):
        m = re.search(patron, texto)
        if not m:
            raise SystemExit(f'SIN COINCIDENCIA {id_}: {patron}')
        ubic, _, _ = loc(m.start(), m.end())
        cita = limpia(m.group(0))
        datos.append(OrderedDict([
            ('id', id_), ('value', cita), ('unit', 'cita literal'), ('period', periodo), ('source', FUENTE), ('fetchedAt', FECHA),
            ('confidence', 'alta'), ('naturaleza', 'observado'),
            ('notes', f'{notas} {NOTA_FUENTE} SHA-256 del extracto: {huella}.'), ('quote', cita), ('location', ubic),
        ]))

    literal('condiciones-prestamos-tc2023', '2023', r'Todos estos préstamos se han concedido sin devengo de intereses y con cancelación en un plazo máximo de 10 años, a partir del año siguiente al de su concesión',
            'Condiciones de los préstamos de 2017 a 2023 según el Tribunal de Cuentas (nota 61); fija que el plazo de cancelación empieza el año siguiente al de la concesión.')
    literal('objetivo-transferencias-tc2023', '2023', r'La realización anual de estas transferencias a la Seguridad Social tiene por objeto, según consta en el mencionado Informe del Pacto de Toledo, la asunción progresiva por el Estado de estos costes impropios',
            'Objeto de las transferencias anuales según el Tribunal de Cuentas, que cita el Informe del Pacto de Toledo.')
    literal('clasificacion-transferencias-alegacion-lpge', '2023', r'estas transferencias se otorgan para financiar gastos impropios del sistema vinculados a políticas estatales con entidad propia',
            'Descripción del Tribunal de las transferencias del artículo 12.Cuatro de la LPGE de 2023.')

    # --- Anexo 10
    items, subtotales, total = anexo10(paginas)
    if [i['n'] for i in items] != list(range(1, 21)):
        raise SystemExit(f'Anexo 10: líneas {[i["n"] for i in items]}')
    if sorted(subtotales) != [1, 2, 3, 4] or total is None:
        raise SystemExit('Anexo 10: faltan subtotales o total')
    bloque_n = {'I': 1, 'II': 2, 'III': 3, 'IV': 4}
    comprobaciones = []

    def comprueba(nombre, a, b, tol=TOL):
        ok = abs(a - b) <= tol + 1e-9
        comprobaciones.append({'regla': nombre, 'esperado': round(b, 1), 'obtenido': round(a, 1), 'ok': ok})
        if not ok:
            raise SystemExit(f'VALIDACIÓN FALLIDA {nombre}: {a} frente a {b}')

    for k in (1, 2, 3, 4):
        comprueba(f'Subtotal ({k}) = suma de sus líneas', sum(i['importe'] for i in items if bloque_n[i['bloque']] == k), subtotales[k]['importe'])
    comprueba('Total = suma de los cuatro subtotales', sum(s['importe'] for s in subtotales.values()), total['importe'])
    comprueba('Préstamos 1992-1999 (texto) = subtotales (1) a (3)', hechos['prestamos-1992-1999'], sum(subtotales[k]['importe'] for k in (1, 2, 3)))
    comprueba('Tres préstamos del INSALUD (texto) = subtotal (1)', hechos['prestamos-insalud'], subtotales[1]['importe'])
    comprueba('Ocho préstamos restantes (texto) = subtotales (2) y (3)', hechos['prestamos-resto-1992-1999'], subtotales[2]['importe'] + subtotales[3]['importe'])
    # año de concesión: «10 años a partir de N» y plazo que empieza el año siguiente al de la concesión (nota 61)
    for i in items:
        i['anio_concesion'] = i['anio_vencimiento'] - 1 if (i['bloque'] == 'IV' and i['anio_vencimiento']) else None
    hasta_2023 = sum(i['importe'] for i in items if i['anio_concesion'] is not None and i['anio_concesion'] <= 2023)
    comprueba('Préstamos de 2017 a 2023 (texto) = líneas del bloque IV concedidas hasta 2023', hechos['prestamos-concedidos-2017-2023'], hasta_2023)
    linea_2024 = [i for i in items if i['anio_concesion'] == 2024]
    if len(linea_2024) != 1:
        raise SystemExit('Anexo 10: se esperaba un único préstamo concedido en 2024')
    comprueba('Préstamo de 2024 (texto) = línea 20 del anexo', hechos['prestamo-concedido-2024'], linea_2024[0]['importe'])
    comprueba('Deuda a fin de 2023 (texto) = total del anexo menos el préstamo desembolsado en 2024', hechos['deuda-ss-con-estado-2023'], total['importe'] - linea_2024[0]['importe'])
    comprueba('Transferencias 2018-2023 (texto) = equilibrio 2018-2021 + base normativa 2021-2023',
              hechos['transferencias-corrientes-2018-2023'], hechos['transferencias-equilibrio-2018-2021'] + hechos['transferencias-base-normativa-2021-2023'])
    comprueba('Porcentaje del PIB del texto = deuda / PIB del texto', hechos['deuda-ss-con-estado-2023'] / hechos['pib-2023-segun-tribunal'] * 100, hechos['deuda-ss-con-estado-2023-pib'], tol=0.005)

    # --- serie derivada: préstamos concedidos por año de concesión
    por_anio = OrderedDict()
    for i in items:
        if i['anio_concesion'] is not None:
            por_anio.setdefault(i['anio_concesion'], []).append(i)
    puntos = [
        {'period': str(a), 'value': round(sum(i['importe'] for i in lst), 1),
         'notes': 'Líneas del Anexo 10: ' + ', '.join(f'n.º {i["n"]}' for i in lst) + '; año de concesión = año de inicio del plazo de cancelación menos uno.'}
        for a, lst in sorted(por_anio.items())
    ]
    serie = OrderedDict([
        ('id', 'prestamos-concedidos-por-anio'), ('title', 'Préstamos del Estado a la Seguridad Social por año de concesión, 2017 a 2024 (derivado del Anexo 10)'),
        ('unit', UNIDAD), ('source', FUENTE), ('fetchedAt', FECHA), ('confidence', 'alta'), ('naturaleza', 'derivado'),
        ('notes', 'Derivada del Anexo 10 de la Declaración del Tribunal de Cuentas sobre la CGE de 2023: cada línea del bloque IV (préstamos de 2017 en adelante) se asigna al año anterior al de inicio de su plazo de cancelación, porque el Tribunal indica (nota 61) que el plazo máximo de diez años empieza el año siguiente al de la concesión. El Anexo 10 no da la fecha de concesión de cada línea; el año es, por tanto, inferido. El préstamo de 2024 figura como desembolsado en su totalidad en 2024 según el propio anexo. ' + NOTA_FUENTE),
        ('points', puntos),
    ])

    archivo = OrderedDict([
        ('tipo', 'datos'), ('id', 'tribunal-cuentas-cge2023-ss'),
        ('title', 'Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2023: Seguridad Social (préstamos, transferencias por finalidad y Fondo de Reserva)'),
        ('description', 'Cifras y citas literales del extracto de la Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2023 (apartados 4.16, 4.17, 4.55 y 5.34 y Anexo 10), con su localización en el original, y la serie derivada de préstamos concedidos por año. Las validaciones de las sumas están en el script scripts/etl/tc_cge2023_seguridad_social.py. El detalle de cada préstamo está en tribunal-cuentas-cge2023-prestamos.csv.'),
        ('data', datos), ('series', [serie]),
    ])
    with open(f'{SALIDA}/tribunal-cuentas-cge2023-ss.json', 'w', encoding='utf-8') as f:
        json.dump(archivo, f, ensure_ascii=False, indent=2)
        f.write('\n')

    # --- CSV del Anexo 10 (tipo extraccion-pdf)
    columnas = [
        ('id', 'Identificador de la línea', None), ('tipo_linea', 'prestamo, subtotal o total', None), ('bloque', 'Bloque del anexo (I a IV)', None),
        ('numero', 'Número de línea del anexo (vacío en subtotales y total)', None), ('norma', 'Norma que autoriza el préstamo, literal', None),
        ('importe', 'Importe', UNIDAD), ('vencimiento', 'Vencimiento, literal', None),
        ('anio_concesion', 'Año de concesión inferido (solo bloque IV; ver notas)', None),
        ('fichero', 'Fichero de origen, ruta relativa al repositorio', None), ('sha256', 'Huella SHA-256 del fichero de origen', None),
        ('pagina', 'Página del original (numeración física)', None), ('pagina_extracto', 'Página del extracto (desde 1)', None),
        ('tabla', 'Tabla del PDF', None), ('linea', 'Línea de texto extraída del PDF', None),
    ]

    def celda(x):
        t = '' if x is None else str(x)
        return '"' + t.replace('"', '""') + '"' if any(c in t for c in ',"\n') else t

    filas = []
    for i in items:
        pe = i['pagina_extracto']
        filas.append([f'prestamo-{i["n"]:02d}', 'prestamo', i['bloque'], i['n'], i['norma'], f'{i["importe"]:.1f}', i['vencimiento'],
                      i['anio_concesion'] if i['anio_concesion'] is not None else '', PDF_REL, huella, PAGINAS_ORIGINAL[pe - 1], pe, 'Anexo 10', i['texto']])
    for k in (1, 2, 3, 4):
        s = subtotales[k]
        pe = s['pagina_extracto']
        filas.append([f'subtotal-{k}', 'subtotal', ['I', 'II', 'III', 'IV'][k - 1], '', f'Subtotal ({k})', f'{s["importe"]:.1f}', '', '', PDF_REL, huella,
                      PAGINAS_ORIGINAL[pe - 1], pe, 'Anexo 10', s['texto']])
    pe = total['pagina_extracto']
    filas.append(['total', 'total', '', '', 'Total (1) + (2) + (3) + (4)', f'{total["importe"]:.1f}', '', '', PDF_REL, huella, PAGINAS_ORIGINAL[pe - 1], pe, 'Anexo 10', total['texto']])
    with open(f'{SALIDA}/tribunal-cuentas-cge2023-prestamos.csv', 'w', encoding='utf-8') as f:
        f.write(','.join(c[0] for c in columnas) + '\n')
        for fila in filas:
            f.write(','.join(celda(x) for x in fila) + '\n')
    meta = OrderedDict([
        ('tipo', 'extraccion-pdf'), ('id', 'tribunal-cuentas-cge2023-prestamos'),
        ('title', 'Anexo 10 de la Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2023: préstamos otorgados por el Estado a la Seguridad Social'),
        ('description', 'Las veinte líneas del Anexo 10 con su importe y vencimiento, los cuatro subtotales y el total, en millones de euros, con huella SHA-256 y página. El año de concesión del bloque IV es inferido del plazo de cancelación (véase notes).'),
        ('columnas', [{'id': c[0], 'descripcion': c[1], 'unidad': c[2]} for c in columnas]), ('filas', len(filas)),
        ('source', FUENTE), ('fetchedAt', FECHA), ('confidence', 'alta'), ('naturaleza', 'observado'), ('unidad', UNIDAD),
        ('notes', 'Año de concesión del bloque IV = año de inicio del plazo de cancelación menos uno (nota 61 de la Declaración). ' + NOTA_FUENTE),
        ('tolerancia', 'Las cifras del anexo tienen un decimal; tolerancia de redondeo de 0,1 millones en las sumas.'),
        ('origenes', [{'fichero': PDF_REL, 'sha256': huella, 'paginas': len(paginas), 'ejercicio': 2023}]),
        ('resumenValidaciones', {'comprobaciones': len(comprobaciones), 'incorrectas': sum(1 for c in comprobaciones if not c['ok'])}),
        ('validacionesPorTabla', [{'ejercicio_pdf': 2023, 'tabla': 'Anexo 10', 'tipo_pagina': 'liquidacion', 'comprobaciones': len(comprobaciones), 'incorrectas': 0}]),
    ])
    with open(f'{SALIDA}/tribunal-cuentas-cge2023-prestamos.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps({'datos': len(datos), 'prestamos': len(items), 'comprobaciones': comprobaciones, 'desfases': sorted(set(desfases.values()))}, ensure_ascii=False))


if __name__ == '__main__':
    main()
