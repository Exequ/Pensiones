"""Fase 5-A4: liquidación del presupuesto del Sistema de la Seguridad Social, ejercicio 2025.

Origen: `data-raw/seg-social-fin/liquidacion/2025_SISTEMA.pdf` (Intervención General de la Seguridad
Social; texto extraíble, sin OCR). Reutiliza las funciones de lectura de `ssf_liquidacion_pdf.py` (la
extracción de las liquidaciones de 2010 a 2016) y las amplía donde este PDF es distinto: nueve páginas
en vez de diez (no trae la página de liquidación del presupuesto de gastos, solo su comparación con 2024),
rótulos con tilde («CAPÍTULO 4»), filas sin porcentaje y una partida nueva (MEI en cotizaciones).

Definición: la liquidación de 2025 coincide, cifra a cifra, con el cierre del cuarto trimestre de 2025
de la ejecución (ficheros «ResSISTEMA», `presupuesto-ss-ejecucion`), de modo que **no se une** a la serie
de las liquidaciones de 2010 a 2016 (`liquidacion-ss-series`): se publica como contraste de 2025.

Salidas (python3 -I scripts/etl/ssf_liquidacion_2025.py; después, npx prettier --write sobre los JSON):
  data/sistema/liquidacion-ss-2025-extraccion.csv/.json  tipo «extraccion-pdf»: cada cifra con su referencia.
  data/sistema/liquidacion-ss-2025-contraste.csv/.json   tipo «tabla»: cada partida de 2025 y 2024 frente a
                                                         la ejecución de fin de ejercicio, con la diferencia.

Validaciones: (a) sumas de las propias tablas; (b) la página de liquidación frente a la de comparación del
mismo PDF; (c) relaciones entre tablas (capítulo 4 de gastos con la partida 4 de gastos; cotizaciones y
transferencias de los capítulos 1 y 4 con la partida 1 y la 4 de ingresos); (d) contraste con la ejecución
ya cargada (2025 y 2024); (e) idempotencia (ninguna marca de tiempo en la salida). Lo que no cuadra se
marca como no verificado y no se publica en el contraste.
"""

import csv
import json
import os
import re
import sys
import unicodedata
from collections import OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ssf_liquidacion_pdf as base  # noqa: E402

REPO = base.REPO
SALIDA = os.environ.get('SALIDA', f'{REPO}/data/sistema')
PDF = f'{REPO}/data-raw/seg-social-fin/liquidacion/2025_SISTEMA.pdf'
FICHERO = 'data-raw/seg-social-fin/liquidacion/2025_SISTEMA.pdf'
EJECUCION = os.environ.get('EJECUCION', f'{REPO}/data/sistema/presupuesto-ss-ejecucion.csv')
ANIO = 2025
FECHA = '2026-11-16'  # fecha de descarga indicada por Sergio
URL = 'https://www.seg-social.es/wps/portal/wss/internet/InformacionEconomicoFinanciera/393/396'
FUENTE = {
    'title': 'Liquidación del presupuesto del Sistema de la Seguridad Social, ejercicio 2025 (PDF «SISTEMA DE LA S.S.»)',
    'publisher': 'Intervención General de la Seguridad Social, Ministerio de Inclusión, Seguridad Social y Migraciones (Seguridad Social)',
    'url': URL,
}
NOTA_PROCEDENCIA = (
    'PDF aportado por el autor, descargado el 2026-11-16 según su indicación; no consta LEEME con la URL exacta del '
    'fichero, por lo que la URL es la de la página de listado de liquidaciones y la huella SHA-256 es la calculada el día '
    'de la extracción, sin referencia con la que compararla.'
)
UNIDAD = base.UNIDAD

TABLAS = base.TABLAS
# páginas esperadas por (tabla, tipo): el PDF de 2025 no trae la liquidación del presupuesto de gastos
ESPERADAS = {
    ('gastos', 'comparacion'): 1,
    ('gastos-cap4', 'liquidacion'): 2,
    ('gastos-cap4', 'comparacion'): 2,
    ('ingresos', 'liquidacion'): 1,
    ('ingresos', 'comparacion'): 1,
    ('ingresos-cap1-cap4', 'liquidacion'): 1,
    ('ingresos-cap1-cap4', 'comparacion'): 1,
}


def sin_tildes(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def tabla_de_pagina(texto):
    """Clasifica una página por su título, sin tildes («CAPÍTULO 4 DEL…» y «CAPÍTULO 4 PRESUPUESTO…»)."""
    t = sin_tildes(texto).upper()
    if 'CAPITULOS 1 Y 4 DEL PRESUPUESTO DE INGRESOS' in t:
        return 'ingresos-cap1-cap4'
    if re.search(r'CAPITULO 4 (DEL )?PRESUPUESTO DE GASTOS', t):
        return 'gastos-cap4'
    if 'PRESUPUESTO DE INGRESOS' in t:
        return 'ingresos'
    if 'PRESUPUESTO DE GASTOS' in t:
        return 'gastos'
    return None


def une_lineas(texto):
    """Une los rótulos que el PDF parte en dos líneas: «TOTAL GASTOS» / «TOTAL INGRESOS» (cifras en la línea
    siguiente) y la partida «Desempleados y Benef. …» (cifras en la línea del segundo trozo)."""
    lineas = texto.splitlines()
    salida = []
    i = 0
    while i < len(lineas):
        s = lineas[i].strip()
        if re.fullmatch(r'TOTAL (GASTOS|INGRESOS)', s) and i + 1 < len(lineas):
            j = i + 1
            while j < len(lineas) and not lineas[j].strip():
                j += 1
            if j < len(lineas) and re.match(r'^\s*-?\d', lineas[j]):
                salida.append(f'{s}    {lineas[j].strip()}')
                i = j + 1
                continue
        if s.startswith('Desempleados y Benef.') and i + 2 < len(lineas) and re.match(r'^\s*-?\d', lineas[i + 1]) and 'Bonif. Fomento Empleo' in lineas[i + 2]:
            # el PDF parte el rótulo en dos líneas y pone las cifras entre ambas
            salida.append(f'{s} Bonif. Fomento Empleo    {lineas[i + 1].strip()}')
            i += 3
            continue
        salida.append(lineas[i])
        i += 1
    return '\n'.join(salida)


def columnas_de(tabla, tipo):
    return base.COLUMNAS_LIQUIDACION[tabla] if tipo == 'liquidacion' else base.COLUMNAS_COMPARACION


def lee_pdf():
    textos = base.paginas(PDF)
    if len(textos) != 9:
        raise SystemExit(f'{PDF}: se esperaban 9 páginas y hay {len(textos)}')
    reg = {'anio': ANIO, 'fichero': FICHERO, 'sha256': base.sha256(PDF), 'paginas': len(textos), 'tablas': []}
    for i, t in enumerate(textos, start=1):
        tabla = tabla_de_pagina(t)
        if tabla is None:
            raise SystemExit(f'{PDF}, página {i}: no se reconoce la tabla')
        if '(Millones de euros)' not in t:
            raise SystemExit(f'{PDF}, página {i}: unidad distinta de «Millones de euros»')
        tipo, anios = base.tipo_de_pagina(t)
        if tipo == 'comparacion' and anios != (ANIO - 1, ANIO):
            raise SystemExit(f'{PDF}, página {i}: años de columnas {anios}, esperados {(ANIO - 1, ANIO)}')
        if int(re.search(r'LIQUIDACI[ÓO]N DEL EJERCICIO (\d{4})', t).group(1)) != ANIO:
            raise SystemExit(f'{PDF}, página {i}: el título no es del ejercicio {ANIO}')
        filas = base.filas_de_pagina(une_lineas(t))
        cols = columnas_de(tabla, tipo)
        for k, f in enumerate(filas, start=1):
            f['pagina'] = i
            f['fila'] = k
            if len(f['valores']) > len(cols):
                raise SystemExit(f'{PDF} p.{i}: la fila «{f["etiqueta"]}» tiene {len(f["valores"])} cifras (máximo {len(cols)})')
            # filas sin la última columna (porcentaje o incremento relativo en blanco en el PDF)
            f['valores'] = f['valores'] + [None] * (len(cols) - len(f['valores']))
        reg['tablas'].append({'pagina': i, 'tabla': tabla, 'tipo': tipo, 'filas': filas})
    for (tabla, tipo), n_esperado in ESPERADAS.items():
        n = sum(1 for x in reg['tablas'] if x['tabla'] == tabla and x['tipo'] == tipo)
        if n != n_esperado:
            raise SystemExit(f'{PDF}: la tabla {tabla} ({tipo}) ocupa {n} páginas (esperadas {n_esperado})')
    if sum(ESPERADAS.values()) != 9:
        raise SystemExit('configuración de páginas esperadas incoherente')
    return reg


def unir(reg):
    por = {}
    for t in reg['tablas']:
        k = (t['tabla'], t['tipo'])
        if k not in por:
            por[k] = {'paginas': [t['pagina']], 'tabla': t['tabla'], 'tipo': t['tipo'], 'filas': list(t['filas'])}
        else:
            por[k]['paginas'].append(t['pagina'])
            por[k]['filas'].extend(t['filas'])
    return por


# ---------------------------------------------------------------------------
# Validaciones internas
# ---------------------------------------------------------------------------

def registra(res, tabla, tipo, paginas, regla, columna, total, comps, c_total=None):
    suma = round(sum(v for v in comps if v is not None), 2)
    v_total = total
    tol = base.tolerancia(len(comps) + 1)
    dif = round(suma - (v_total or 0.0), 2)
    res.append({'pdf': ANIO, 'paginas': paginas, 'tabla': tabla, 'tipo': tipo, 'comprobacion': 'suma', 'regla': regla,
                'columna': columna, 'total': v_total, 'suma': suma, 'diferencia': dif, 'tolerancia': tol, 'ok': abs(dif) <= tol + 1e-9})


def valida_sumas(por):
    res = []
    for (tabla, tipo), t in por.items():
        cols = columnas_de(tabla, tipo)
        idx = [c for c, n in enumerate(cols) if n != 'porcentaje'] if tipo == 'liquidacion' else [0, 1]
        filas = t['filas']
        if tabla in ('gastos', 'ingresos'):
            for r in base.comprobar_sumas(tabla, filas, cols, idx):
                res.append({'pdf': ANIO, 'paginas': t['paginas'], 'tabla': tabla, 'tipo': tipo, 'comprobacion': 'suma', **r})
        elif tabla == 'ingresos-cap1-cap4':  # la comparación rotula «TOTAL TRANSFERENCIAS CTES.»
            cot = base.etiquetas_de_seccion(filas, r'COTIZACIONES')
            tra = base.etiquetas_de_seccion(filas, r'TRANSFERENCIAS CTES')
            tc, tt = base.buscar(filas, r'^TOTAL COTIZACIONES'), base.buscar(filas, r'^TOTAL TRANSFERENCIAS (CORRIENTES|CTES)')
            for c in idx:
                registra(res, tabla, tipo, t['paginas'], 'TOTAL COTIZACIONES SOCIALES = sus partidas', cols[c], tc['valores'][c], [f['valores'][c] for f in cot])
                registra(res, tabla, tipo, t['paginas'], 'TOTAL TRANSFERENCIAS CORRIENTES = sus partidas', cols[c], tt['valores'][c], [f['valores'][c] for f in tra])
        else:  # capítulo 4 de gastos: este PDF no trae el «TOTAL TRANSFERENCIAS CORRIENTES» de las liquidaciones antiguas
            pens = base.etiquetas_de_seccion(filas, r'PENSIONES')
            subs = base.etiquetas_de_seccion(filas, r'SUBSIDIOS')
            nocon = base.etiquetas_de_seccion(filas, r'NO CONTRIBUTIVAS')
            otras = base.etiquetas_de_seccion(filas, r'OTRAS TRANSF')
            sp, ss = base.buscar(filas, r'^SUMA PENSIONES'), base.buscar(filas, r'^SUMA SUBSIDIOS')
            tc = base.buscar(filas, r'^TOTAL PRESTACIONES CONTRIBUTIVAS')
            sn, so = base.buscar(filas, r'^SUMA PREST\. NO CONTRIBUTIVAS'), base.buscar(filas, r'^SUMA OTRAS TRANSF')
            tn = base.buscar(filas, r'^TOTAL PREST NO CONTRIBUTIVAS')
            for c in idx:
                v = lambda f: f['valores'][c]  # noqa: E731
                registra(res, tabla, tipo, t['paginas'], 'SUMA PENSIONES = seis clases', cols[c], v(sp), [v(f) for f in pens])
                registra(res, tabla, tipo, t['paginas'], 'SUMA SUBSIDIOS Y OTRAS PRESTACIONES = sus partidas', cols[c], v(ss), [v(f) for f in subs])
                registra(res, tabla, tipo, t['paginas'], 'TOTAL PRESTACIONES CONTRIBUTIVAS = pensiones + subsidios', cols[c], v(tc), [v(sp), v(ss)])
                registra(res, tabla, tipo, t['paginas'], 'SUMA PREST. NO CONTRIBUTIVAS = sus partidas', cols[c], v(sn), [v(f) for f in nocon])
                registra(res, tabla, tipo, t['paginas'], 'SUMA OTRAS TRANSF. CORRIENTES = sus partidas', cols[c], v(so), [v(f) for f in otras])
                registra(res, tabla, tipo, t['paginas'], 'TOTAL PREST NO CONTRIBUTIVAS + OTRAS TRANSF = suma de sus dos bloques', cols[c], v(tn), [v(sn), v(so)])
        if tipo == 'liquidacion' and tabla == 'gastos-cap4':
            for f in filas:
                ini, mod, tot = f['valores'][0], f['valores'][1], f['valores'][2]
                if None in (ini, mod, tot):
                    continue
                dif = round(ini + mod - tot, 2)
                res.append({'pdf': ANIO, 'paginas': t['paginas'], 'tabla': tabla, 'tipo': tipo, 'comprobacion': 'inicial+modificaciones',
                            'regla': f['etiqueta'], 'diferencia': dif, 'tolerancia': 0.01, 'ok': abs(dif) <= 0.01 + 1e-9})
    return res


def valida_coherencia(por):
    """(b) página de liquidación frente a la de comparación del mismo PDF (columna del ejercicio actual)."""
    res = []
    for tabla in TABLAS:
        liq, comp = por.get((tabla, 'liquidacion')), por.get((tabla, 'comparacion'))
        if liq is None or comp is None:
            continue
        col = columnas_de(tabla, 'liquidacion').index(base.EJECUTADO[tabla])
        mapa = {(f['seccion'], f['etiqueta']): f for f in comp['filas']}
        for f in liq['filas']:
            g = mapa.get((f['seccion'], f['etiqueta'])) or base.emparejar(f, comp['filas'])
            if g is None:
                res.append({'pdf': ANIO, 'tabla': tabla, 'comprobacion': 'liquidacion-vs-comparacion', 'regla': f['etiqueta'], 'ok': None,
                            'detalle': 'partida sin equivalente en la página de comparación'})
                continue
            a, b = f['valores'][col], g['valores'][1]
            if a is None or b is None:
                continue
            res.append({'pdf': ANIO, 'tabla': tabla, 'comprobacion': 'liquidacion-vs-comparacion', 'regla': f['etiqueta'],
                        'diferencia': round(a - b, 2), 'tolerancia': 0.01, 'ok': abs(a - b) <= 0.01 + 1e-9})
    return res


def valor(por, tabla, tipo, patron, columna, seccion=None):
    t = por[(tabla, tipo)]
    c = columnas_de(tabla, tipo).index(columna)
    f = base.buscar(t['filas'], patron, seccion)
    return f['valores'][c], f


def comprobaciones_cruzadas(por):
    """(c) Relaciones entre tablas distintas del mismo PDF, en las dos columnas de ejercicio de la comparación."""
    out = []

    def cmp_(id_, desc, esperado, partes):
        obtenido = round(sum(partes), 2)
        dif = round(obtenido - esperado, 2)
        out.append({'id': id_, 'descripcion': desc, 'esperado': esperado, 'obtenido': obtenido, 'diferencia': dif,
                    'tolerancia': base.tolerancia(len(partes) + 1), 'ok': abs(dif) <= base.tolerancia(len(partes) + 1) + 1e-9})

    for col, anio in (('ejercicio_actual', ANIO), ('ejercicio_anterior', ANIO - 1)):
        t4, _ = valor(por, 'gastos', 'comparacion', r'^4\. Transferencias corrientes', col)
        tc, _ = valor(por, 'gastos-cap4', 'comparacion', r'^TOTAL PRESTACIONES CONTRIBUTIVAS', col)
        tn, _ = valor(por, 'gastos-cap4', 'comparacion', r'^TOTAL PREST NO CONTRIBUTIVAS', col)
        cmp_(f'gastos-cap4-total-{anio}', f'Capítulo 4 de gastos de {anio}: prestaciones contributivas + no contributivas y otras transferencias = partida «4. Transferencias corrientes» de la tabla de gastos',
             t4, [tc, tn])
        i1, _ = valor(por, 'ingresos', 'comparacion', r'^1\. Cotizaciones sociales', col)
        c1, _ = valor(por, 'ingresos-cap1-cap4', 'comparacion', r'^TOTAL COTIZACIONES', col)
        cmp_(f'ingresos-cotizaciones-{anio}', f'Cotizaciones sociales de {anio}: total de los capítulos 1 y 4 de ingresos = partida «1. Cotizaciones sociales» de la tabla de ingresos', i1, [c1])
        i4, _ = valor(por, 'ingresos', 'comparacion', r'^4\. Transferencias corrientes', col)
        c4, _ = valor(por, 'ingresos-cap1-cap4', 'comparacion', r'^TOTAL TRANSFERENCIAS', col)
        cmp_(f'ingresos-transferencias-{anio}', f'Transferencias corrientes de {anio}: total de los capítulos 1 y 4 de ingresos = partida «4. Transferencias corrientes» de la tabla de ingresos', i4, [c4])
    # incrementos de la propia comparación: absoluto = actual - anterior
    for (tabla, tipo), t in por.items():
        if tipo != 'comparacion':
            continue
        for f in t['filas']:
            a, b, inc = f['valores'][0], f['valores'][1], f['valores'][2]
            if None in (a, b, inc):
                continue
            dif = round((b - a) - inc, 2)
            out.append({'id': f'incremento-{tabla}-p{f["pagina"]}-f{f["fila"]}', 'descripcion': f'«{f["etiqueta"]}»: ejercicio {ANIO} menos {ANIO - 1} = incremento absoluto ({tabla}, p. {f["pagina"]})',
                        'esperado': inc, 'obtenido': round(b - a, 2), 'diferencia': dif, 'tolerancia': 0.02, 'ok': abs(dif) <= 0.02 + 1e-9})
    return out


# ---------------------------------------------------------------------------
# Contraste con la ejecución (fin del cuarto trimestre)
# ---------------------------------------------------------------------------

def lee_ejecucion():
    with open(EJECUCION, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def norm_ej(s):
    s = sin_tildes(s).lower()
    s = re.sub(r'\s+sistema de la seguridad social$', '', s)
    s = re.sub(r'\b(de|en)\b', '', s)
    return re.sub(r'[^a-z0-9]', '', s)


# Correspondencia de partidas: (tabla, patrón de la etiqueta del PDF, [(tabla de la ejecución, concepto)…]); la
# cifra del PDF es la suma de las de la ejecución. Cuando la correspondencia es por rótulo (tablas de gastos
# e ingresos) la lista es None y se empareja por el rótulo normalizado.
MAPA_CAP4 = [
    (r'^Incapacidad Permanente', [('gastos-cap4', 'INCAPACIDAD PERMANENTE')]),
    (r'^Jubilaci', [('gastos-cap4', 'JUBILACIÓN')]),
    (r'^Viudedad', [('gastos-cap4', 'VIUDEDAD')]),
    (r'^Orfandad', [('gastos-cap4', 'ORFANDAD')]),
    (r'^En favor de familiares', [('gastos-cap4', 'A FAVOR DE FAMILIARES')]),
    (r'^Pensiones derivadas DANA', [('gastos-cap4', 'PENSIONES DERIVADAS DANA')]),
    (r'^SUMA PENSIONES', [('gastos-cap4', 'SUMA DE PENSIONES')]),
    (r'^Incapacidad temporal', [('gastos-cap4', 'INCAPACIDAD TEMPORAL')]),
    (r'^Recargos', [('gastos-cap4', 'RECARGOS FALTA MEDIDAS SEGURIDAD E HIGIENE')]),
    (r'^Nacimiento', [('gastos-cap4', 'NACIM.CUIDADO MENOR, CORRESP.RIESGO EMB.,LACT.')]),
    (r'^Prestac\. y entreg|^Prestac\.y entreg', [('gastos-cap4', 'PRESTACIONES Y ENTREGAS ÚNICAS')]),
    (r'^Prestaciones sociales$', [('gastos-cap4', 'PRESTACIONES SOCIALES')]),
    (r'^Otras prestc', [('gastos-cap4', 'OTRAS PRESTACIONES E INDEMNIZACIONES')]),
    (r'^Farmacia$', [('gastos-cap4', 'FARMACIA')]),
    (r'^Ayudas gen[eé]ricas', [('gastos-cap4', 'AYUDAS GENÉRICAS A FAMILIAS E INSTITUCIONES')]),
    (r'^SUMA SUBSIDIOS', [('gastos-cap4', 'SUMA DE SUBSIDIOS Y OTRAS PRESTACIONES')]),
    (r'^TOTAL PRESTACIONES CONTRIBUTIVAS', [('gastos-cap4', 'SUMA DE PENSIONES'), ('gastos-cap4', 'SUMA DE SUBSIDIOS Y OTRAS PRESTACIONES')]),
]
MAPA_CAP4_NOCON = [
    (r'^Pensiones$', [('gastos-cap4-no-contributivas', 'PENSIONES DE INVALIDEZ'), ('gastos-cap4-no-contributivas', 'PENSIONES DE JUBILACIÓN'),
                      ('gastos-cap4-no-contributivas', 'PENSIONES DE ORFANDAD'), ('gastos-cap4-no-contributivas', 'PENSIONES DERIVADAS DANA 2024')]),
    (r'^Complemento a m', [('gastos-cap4-no-contributivas', 'COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS')]),
    (r'^Ingreso M[ií]nimo Vital', [('gastos-cap4-no-contributivas', 'INGRESO MÍNIMO VITAL Y PRESTAC.FAMILIARES')]),
    (r'^Prestaciones Sociales$', [('gastos-cap4-no-contributivas', 'PRESTACIONES SOCIALES'), ('gastos-cap4-no-contributivas', 'SÍNDROME TÓXICO'),
                                  ('gastos-cap4-no-contributivas', 'SUBS.ECON.PARA PERS.DISCAPACIDAD')]),
    (r'^Otras prestac', [('gastos-cap4-no-contributivas', 'OTRAS PRESTACIONES E INDEMNIZACIONES')]),
    (r'^Farmacia', [('gastos-cap4-no-contributivas', 'FARMACIA')]),
    (r'^Ayudas gen[eé]ricas', [('gastos-cap4-no-contributivas', 'AYUDAS GENÉRICAS E INS.SIN FIN LUCRO')]),
    (r'^Nacim\.', [('gastos-cap4-no-contributivas', 'PREST.MATERN., PATERN., RIESGO DURANTE EMBAR.')]),
    (r'^SUMA PREST\. NO CONTRIBUTIVAS', [('gastos-cap4-no-contributivas', 'SUMA DE PENSIONES NO CONTR. Y COMPL. A MÍNIMOS DE PENSIONES CONTR.'),
                                         ('gastos-cap4-no-contributivas', 'SUMA SUBSIDIOS Y OTRAS PRESTACIONES')]),
    (r'^A la Administraci', [('gastos-cap4', 'AL ESTADO Y ORG.AUTÓNOMOS'), ('gastos-cap4-no-contributivas', 'A LA ADM. DEL ESTADO Y ORG. AUTÓNOMOS')]),
    (r'^A la Seguridad Social', [('gastos-cap4', 'A LA SEGURIDAD SOCIAL'), ('gastos-cap4-no-contributivas', 'A LA SEGURIDAD SOCIAL')]),
    (r'^A Comunidades', [('gastos-cap4', 'A COMUNIDADES AUTÓNOMAS'), ('gastos-cap4-no-contributivas', 'A COMUNIDADES AUTÓNOMAS')]),
    (r'^A empresas privadas', [('gastos-cap4', 'A EMPRESAS PRIVADAS Y OTRAS')]),
    (r'^Al Exterior', [('gastos-cap4', 'AL EXTERIOR')]),
    (r'^SUMA OTRAS TRANSF', [('gastos-cap4', 'SUMA DE OTRAS TRANSFERENCIAS CORRIENTES'), ('gastos-cap4-no-contributivas', 'SUMA DE OTRAS TRANSFERENCIAS CORRIENTES')]),
    (r'^TOTAL PREST NO CONTRIBUTIVAS', [('gastos-cap4-no-contributivas', 'TOTAL'), ('gastos-cap4', 'SUMA DE OTRAS TRANSFERENCIAS CORRIENTES')]),
]
MAPA_ING14 = [
    (r'^Mecanismo de Equidad', [('ingresos-cap1-cap4', 'MECANISMO DE EQUIDAD INTERGENERACIONAL')]),
    (r'^R[eé]gimen general', [('ingresos-cap1-cap4', 'RÉGIMEN GENERAL')]),
    (r'^R\.E\. Trabajadores aut', [('ingresos-cap1-cap4', 'RÉGIMEN ESPECIAL TRABAJADORES AUTÓNOMOS')]),
    (r'^R\.E\. Agrario', [('ingresos-cap1-cap4', 'RÉGIMEN ESPECIAL AGRARIO')]),
    (r'^R\.E\. Trabajadores del Mar', [('ingresos-cap1-cap4', 'RÉGIMEN ESPECIAL TRABAJADORES DEL MAR')]),
    (r'^R\.E\. Miner', [('ingresos-cap1-cap4', 'RÉGIMEN ESPECIAL MINERÍA DEL CARBÓN')]),
    (r'^R\.E\. Empleados de hogar', [('ingresos-cap1-cap4', 'RÉGIMEN ESPECIAL EMPLEADOS DEL HOGAR')]),
    (r'^Accidentes de trabajo', [('ingresos-cap1-cap4', 'ACCIDENTES TRABAJO ENFERMEDADES PROFESIONALES')]),
    (r'^Desempleados', [('ingresos-cap1-cap4', 'DESEMPLEADOS Y BENEF. PREST. ERTE, MEC. RED, CESE ACTIV Y BONIF. FOMENTO EMPLEO'),
                        ('ingresos-cap1-cap4', 'CESE ACTIVIDAD TRABAJADORES AUTÓNOMOS')]),
    (r'^TOTAL COTIZACIONES', [('ingresos-cap1-cap4', 'TOTAL COTIZACIONES SOCIALES')]),
    (r'^Del Estado y Organismos', [('ingresos-cap1-cap4', 'DEL ESTADO Y ORG.AUTÓNOMOS')]),
    (r'^De la Seguridad Social', [('ingresos-cap1-cap4', 'DE LA SEGURIDAD SOCIAL')]),
    (r'^De Comunidades', [('ingresos-cap1-cap4', 'DE COMUNIDADES AUTÓNOMAS')]),
    (r'^De Empresas privadas', [('ingresos-cap1-cap4', 'DE EMPRESAS PRIVADAS Y OTROS')]),
    (r'^TOTAL TRANSFERENCIAS', [('ingresos-cap1-cap4', 'TOTAL TRANSFERENCIAS CORRIENTES')]),
]


def mapa_de(tabla, fila):
    """Mapa de correspondencias de una fila del PDF. En el capítulo 4 de gastos, los rótulos «Prestaciones sociales»,
    «Farmacia» o «Ayudas genéricas» figuran en la sección contributiva y en la no contributiva: manda la sección."""
    if tabla == 'gastos-cap4':
        if re.search(r'NO CONTRIBUTIVAS|OTRAS TRANSF', fila['seccion'], re.I) or re.match(r'^(TOTAL PREST NO|SUMA OTRAS)', fila['etiqueta'], re.I):
            return MAPA_CAP4_NOCON
        return MAPA_CAP4
    return MAPA_ING14


def indice_ejecucion(filas):
    """(ejercicio, tabla, concepto normalizado) -> fila de la ejecución al cierre del cuarto trimestre (principal)."""
    idx = {}
    for r in filas:
        if r['columna'] == 'principal' and r['periodo'] == f'{r["ejercicio"]}-T4':
            idx[(int(r['ejercicio']), r['tabla'], norm_ej(r['concepto']))] = r
    return idx


def num_ej(x):
    return round(float(x), 2) if x not in ('', None) else None


def contrasta(por, ejec):
    """Filas de contraste: una por partida, ejercicio y columna (presupuesto/previsión y ejecutado) que se
    puede casar con la ejecución. Devuelve (filas, sin_equivalente)."""
    idx = indice_ejecucion(ejec)
    filas, sin = [], []

    def busca(anio, tabla_ej, concepto):
        return idx.get((anio, tabla_ej, norm_ej(concepto)))

    def anade(tabla, f, anio, columna, v_pdf, partes, tipo_pagina, pagina, referencia_pdf):
        # partes: filas de la ejecución cuya suma es la cifra del PDF
        campo = 'derechos_u_obligaciones_meur' if columna in ('obligaciones_reconocidas', 'derechos_reconocidos_netos', 'ejercicio_actual', 'ejercicio_anterior') else 'prevision_o_presupuesto_meur'
        vals = [num_ej(p[campo]) for p in partes]
        if v_pdf is None or any(v is None for v in vals) and not all(v is None for v in vals):
            # partes sin cifra: se tratan como cero si alguna otra la tiene (la ejecución deja en blanco los ceros)
            vals = [0.0 if v is None else v for v in vals]
        suma = round(sum(0.0 if v is None else v for v in vals), 2)
        dif = round(suma - (v_pdf or 0.0), 2)
        tol = base.tolerancia(len(partes) + 1)
        filas.append(OrderedDict([
            ('id', f'{anio}-{tabla}-p{pagina}-f{f["fila"]}-{columna}'),
            ('ejercicio', anio), ('tabla', tabla), ('partida', f['etiqueta']), ('columna', columna),
            ('liquidacion_meur', v_pdf), ('ejecucion_meur', suma), ('diferencia_meur', dif),
            ('estado', 'coincide' if abs(dif) <= tol + 1e-9 else 'difiere'),
            ('referencia_liquidacion', referencia_pdf),
            ('referencia_ejecucion', ' + '.join(f'{p["tabla"]}: {p["concepto"]}' for p in partes) + f' ({partes[0]["periodo"]})'),
        ]))

    for tabla in TABLAS:
        liq = por.get((tabla, 'liquidacion'))
        comp = por[(tabla, 'comparacion')]
        for f in comp['filas']:
            for clave, anio in (('ejercicio_actual', ANIO), ('ejercicio_anterior', ANIO - 1)):
                col = columnas_de(tabla, 'comparacion').index(clave)
                v = f['valores'][col]
                if v is None:
                    continue
                ref = f'{FICHERO}, p. {f["pagina"]}, tabla «{tabla}», fila {f["fila"]} («{f["etiqueta"]}»), columna «{clave}»'
                partes = None
                if tabla in ('gastos', 'ingresos'):
                    p = busca(anio, tabla, f['etiqueta'])
                    partes = [p] if p else None
                else:
                    for patron, destinos in mapa_de(tabla, f):
                        if re.search(patron, f['etiqueta'], re.I):
                            ps = [busca(anio, t, c) for t, c in destinos]
                            partes = ps if all(ps) else None
                            break
                if not partes:
                    sin.append({'ejercicio': anio, 'tabla': tabla, 'partida': f['etiqueta']})
                    continue
                anade(tabla, f, anio, clave, v, partes, 'comparacion', f['pagina'], ref)
        # presupuesto o previsión de 2025 (columna «presupuesto_total» o «previsiones»)
        if liq is not None:
            nombre = 'presupuesto_total' if tabla == 'gastos-cap4' else 'previsiones'
            col = columnas_de(tabla, 'liquidacion').index(nombre)
            for f in liq['filas']:
                v = f['valores'][col]
                if v is None:
                    continue
                ref = f'{FICHERO}, p. {f["pagina"]}, tabla «{tabla}», fila {f["fila"]} («{f["etiqueta"]}»), columna «{nombre}»'
                partes = None
                if tabla == 'ingresos':
                    p = busca(ANIO, tabla, f['etiqueta'])
                    partes = [p] if p else None
                else:
                    for patron, destinos in mapa_de(tabla, f):
                        if re.search(patron, f['etiqueta'], re.I):
                            ps = [busca(ANIO, t, c) for t, c in destinos]
                            partes = ps if all(ps) else None
                            break
                if not partes:
                    continue
                anade(tabla, f, ANIO, nombre, v, partes, 'liquidacion', f['pagina'], ref)
    return filas, sin


# ---------------------------------------------------------------------------
# Salidas
# ---------------------------------------------------------------------------

COLUMNAS_CSV = base.COLUMNAS_CSV


def extrae_valores(reg, validaciones):
    malas = {(v['tabla']) for v in validaciones if v.get('ok') is False}
    valores = []
    for t in reg['tablas']:
        cols = columnas_de(t['tabla'], t['tipo'])
        for f in t['filas']:
            for c, nombre in enumerate(cols):
                v = f['valores'][c]
                if nombre in ('porcentaje', 'incremento_relativo', 'incremento_absoluto') or v is None:
                    continue
                periodo = ANIO if t['tipo'] == 'liquidacion' else (ANIO - 1 if nombre == 'ejercicio_anterior' else ANIO)
                valores.append({'id': f'{ANIO}-p{f["pagina"]}-f{f["fila"]}-{nombre}', 'ejercicio_pdf': ANIO, 'periodo': periodo, 'tabla': t['tabla'],
                                'tipo_pagina': t['tipo'], 'seccion': f['seccion'], 'partida': f['etiqueta'], 'columna': nombre, 'valor': v,
                                'referencia': {'fichero': reg['fichero'], 'sha256': reg['sha256'], 'pagina': f['pagina'], 'tabla': t['tabla'],
                                               'fila': f['fila'], 'linea': f['linea']},
                                'verificado': t['tabla'] not in malas})
    return valores


def main():
    reg = lee_pdf()
    por = unir(reg)
    validaciones = valida_sumas(por) + valida_coherencia(por)
    cruzadas = comprobaciones_cruzadas(por)
    valores = extrae_valores(reg, validaciones)
    ejec = lee_ejecucion()
    filas_contraste, sin_equivalente = contrasta(por, ejec)
    return reg, por, validaciones, cruzadas, valores, filas_contraste, sin_equivalente


COLUMNAS_CONTRASTE = [
    ('id', 'Identificador: ejercicio, tabla, página, fila y columna del PDF', None),
    ('ejercicio', 'Ejercicio de la cifra', None),
    ('tabla', 'gastos, gastos-cap4, ingresos o ingresos-cap1-cap4', None),
    ('partida', 'Etiqueta de la partida en el PDF', None),
    ('columna', 'Columna del PDF: ejercicio_actual o ejercicio_anterior (ejecutado: obligaciones o derechos reconocidos), presupuesto_total o previsiones (presupuesto o previsión de 2025)', None),
    ('liquidacion_meur', 'Cifra de la liquidación (PDF)', 'millones de euros'),
    ('ejecucion_meur', 'Suma de las cifras de la ejecución con las que se contrasta (cierre del cuarto trimestre)', 'millones de euros'),
    ('diferencia_meur', 'Ejecución menos liquidación', 'millones de euros'),
    ('estado', 'coincide si la diferencia no supera la tolerancia de redondeo; difiere en otro caso', None),
    ('referencia_liquidacion', 'PDF, página, tabla, fila y columna de la cifra de la liquidación', None),
    ('referencia_ejecucion', 'Partida o partidas de la ejecución sumadas y periodo', None),
]


def emite(reg, por, validaciones, cruzadas, valores, filas_contraste, sin_equivalente):
    resumen = OrderedDict()
    for v in validaciones:
        if v.get('ok') is None or v['comprobacion'] == 'liquidacion-vs-comparacion':
            continue
        k = (v['tabla'], v['tipo'])
        r = resumen.setdefault(k, {'ejercicio_pdf': ANIO, 'tabla': v['tabla'], 'tipo_pagina': v['tipo'], 'comprobaciones': 0, 'incorrectas': 0})
        r['comprobaciones'] += 1
        r['incorrectas'] += 0 if v['ok'] else 1
    coherencia = [v for v in validaciones if v['comprobacion'] == 'liquidacion-vs-comparacion' and v.get('ok') is not None]
    n_coincide = sum(1 for f in filas_contraste if f['estado'] == 'coincide')
    resumen_val = {
        'comprobaciones_de_suma': sum(r['comprobaciones'] for r in resumen.values()),
        'sumas_incorrectas': sum(r['incorrectas'] for r in resumen.values()),
        'coherencia_liquidacion_comparacion': len(coherencia),
        'coherencia_incorrecta': sum(1 for v in coherencia if v['ok'] is False),
        'comprobaciones_entre_tablas': len(cruzadas),
        'comprobaciones_entre_tablas_incorrectas': sum(1 for c in cruzadas if not c['ok']),
        'cifras_contrastadas_con_la_ejecucion': len(filas_contraste),
        'cifras_que_coinciden_con_la_ejecucion': n_coincide,
        'cifras_que_difieren_de_la_ejecucion': len(filas_contraste) - n_coincide,
        'partidas_sin_equivalente_en_la_ejecucion': len(sin_equivalente),
    }
    # extracción
    ruta_csv = f'{SALIDA}/liquidacion-ss-2025-extraccion.csv'
    with open(ruta_csv, 'w', encoding='utf-8') as f:
        f.write(','.join(c[0] for c in COLUMNAS_CSV) + '\n')
        for v in valores:
            r = v['referencia']
            fila = [v['id'], v['ejercicio_pdf'], v['periodo'], v['tabla'], v['tipo_pagina'], v['seccion'], v['partida'], v['columna'],
                    f'{v["valor"]:.2f}', r['fichero'], r['sha256'], r['pagina'], r['fila'], r['linea'], 'si' if v['verificado'] else 'no']
            f.write(','.join(base.celda_csv(x) for x in fila) + '\n')
    meta = OrderedDict([
        ('tipo', 'extraccion-pdf'),
        ('id', 'liquidacion-ss-2025-extraccion'),
        ('title', 'Liquidación del presupuesto de la Seguridad Social, ejercicio 2025: extracción del PDF con su referencia'),
        ('description', 'Cada cifra de las cuatro tablas del PDF (presupuesto de gastos, capítulo 4 de gastos, presupuesto de ingresos, capítulos 1 y 4 de ingresos), en millones de euros, con fichero, huella SHA-256, página, fila y columna. Este PDF no trae la página de liquidación del presupuesto de gastos, solo su comparación con 2024. Generado por scripts/etl/ssf_liquidacion_2025.py.'),
        ('columnas', [{'id': c[0], 'descripcion': c[1], 'unidad': c[2]} for c in COLUMNAS_CSV]),
        ('filas', len(valores)),
        ('source', FUENTE),
        ('fetchedAt', FECHA),
        ('confidence', 'alta'),
        ('naturaleza', 'observado'),
        ('unidad', UNIDAD),
        ('notes', NOTA_PROCEDENCIA),
        ('tolerancia', 'Redondeo: 0,005 millones por cada cifra que interviene en una suma, con mínimo de 0,01; las cifras de la fuente tienen dos decimales.'),
        ('origenes', [{'fichero': reg['fichero'], 'sha256': reg['sha256'], 'paginas': reg['paginas'], 'ejercicio': ANIO}]),
        ('resumenValidaciones', resumen_val),
        ('validacionesPorTabla', list(resumen.values())),
        ('comprobacionesEspecificas', cruzadas),
    ])
    base.escribe_json(f'{SALIDA}/liquidacion-ss-2025-extraccion.json', meta)

    # contraste (tabla)
    with open(f'{SALIDA}/liquidacion-ss-2025-contraste.csv', 'w', encoding='utf-8') as f:
        f.write(','.join(c[0] for c in COLUMNAS_CONTRASTE) + '\n')
        for r in filas_contraste:
            f.write(','.join(base.celda_csv(f'{x:.2f}' if isinstance(x, float) else x) for x in r.values()) + '\n')
    contraste = OrderedDict([
        ('tipo', 'tabla'),
        ('id', 'liquidacion-ss-2025-contraste'),
        ('title', 'Liquidación de 2025 del Sistema de la Seguridad Social frente a la ejecución del presupuesto al cierre del cuarto trimestre (2025 y 2024), en millones de euros'),
        ('description', 'Cada partida de las tablas del PDF de la liquidación de 2025 (ejercicio 2025, comparativa de 2024 y presupuesto o previsión de 2025) que se puede casar con la ejecución del presupuesto al cierre del cuarto trimestre, con la cifra de cada fuente, su diferencia y la referencia de ambas. Cuando el rótulo de la liquidación agrupa varias partidas de la ejecución, la cifra de la ejecución es la suma de ellas (la referencia las lista). Es un contraste de definición: no es una serie y no se une a las liquidaciones de 2010 a 2016.'),
        ('columnas', [{'id': c[0], 'descripcion': c[1], 'unidad': c[2]} for c in COLUMNAS_CONTRASTE]),
        ('filas', len(filas_contraste)),
        ('source', FUENTE),
        ('origenes', [{'period': str(ANIO), 'url': URL, 'sha256': reg['sha256']}]),
        ('fetchedAt', FECHA),
        ('confidence', 'alta'),
        ('notes', NOTA_PROCEDENCIA + ' La ejecución es la tabla «presupuesto-ss-ejecucion» de este mismo conjunto de datos (ficheros «ResSISTEMA» de la Seguridad Social, cierre de diciembre, versión definitiva).'),
    ])
    base.escribe_json(f'{SALIDA}/liquidacion-ss-2025-contraste.json', contraste)
    print(json.dumps({'validaciones': resumen_val, 'valores': len(valores), 'contraste': len(filas_contraste)}, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--inventario':
        r = lee_pdf()
        print(r['anio'], r['sha256'][:12], r['paginas'], 'páginas')
        for t in r['tablas']:
            print('  p', t['pagina'], t['tabla'], t['tipo'], 'filas', len(t['filas']))
        sys.exit(0)
    emite(*main())
