"""Fase 5-A3: liquidaciones del presupuesto del Sistema de la Seguridad Social, ejercicios 2010 a 2016.

Origen: los siete PDF «AAAA_SISTEMA.pdf» de data-raw/seg-social-fin/liquidacion/ (Intervención General
de la Seguridad Social; el texto es extraíble, no hay imágenes escaneadas). Cada PDF tiene diez
páginas, de dos en dos: la liquidación del ejercicio (presupuesto y ejecución) y la comparación con el
ejercicio anterior, para cuatro tablas: presupuesto de gastos, capítulo 4 de gastos, presupuesto de
ingresos y capítulos 1 y 4 de ingresos. El orden de las páginas cambia (en 2014 empieza por la
comparación de ingresos), por lo que cada página se clasifica por su título y por la cabecera de sus
columnas, no por su posición.

Salidas (python3 -I scripts/etl/ssf_liquidacion_pdf.py; después, npx prettier --write sobre el JSON):
  data/sistema/liquidacion-ss-extraccion.csv/.json  tipo «extraccion-pdf»: cada valor con fichero, huella
                                               SHA-256 del PDF, página, tabla, fila y columna, el
                                               resultado de las validaciones y las diferencias entre PDF.
  data/sistema/liquidacion-ss-series.json      series anuales de las partidas que superan todas las
                                               validaciones (las que no, no se publican).

Validaciones (a) las partidas suman los totales de la propia tabla; (b) continuidad de años, unidad y
coherencia entre la página de liquidación y la de comparación del mismo PDF; (c) contraste de cada
cifra de un año con la columna del año anterior del PDF siguiente; (d) idempotencia (ninguna marca de
tiempo en la salida). Tolerancia de redondeo: 0,005 millones por cada cifra que interviene en la suma,
con mínimo de 0,01 (las cifras de la fuente tienen dos decimales).
"""

import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.environ.get('SALIDA', f'{REPO}/data/sistema')  # directorio de salida (los tests lo cambian)
RAW = f'{REPO}/data-raw/seg-social-fin/liquidacion'
ANIOS = list(range(2010, 2017))
FECHA = '2026-11-14'  # fecha del commit que incorpora los PDF (#26); no consta fecha de descarga en un LEEME
URL = 'https://www.seg-social.es/wps/portal/wss/internet/InformacionEconomicoFinanciera/393/396'
FUENTE = {
    'title': 'Liquidación del presupuesto del Sistema de la Seguridad Social (PDF «SISTEMA DE LA S.S.»)',
    'publisher': 'Intervención General de la Seguridad Social, Ministerio de Empleo y Seguridad Social (Seguridad Social)',
    'url': URL,
}
UNIDAD = 'millones de euros'
NOTA_PROCEDENCIA = (
    'PDF aportado por el autor el 2026-11-14 (commit c7320a9); no consta en ningún LEEME la URL exacta del '
    'fichero ni su fecha de descarga, por lo que fetchedAt es la fecha de incorporación al repositorio y la '
    'URL es la de la página de listado de liquidaciones.'
)

TABLAS = OrderedDict(
    [
        ('gastos', 'Presupuesto de gastos, clasificación económica'),
        ('gastos-cap4', 'Capítulo 4 del presupuesto de gastos (transferencias corrientes)'),
        ('ingresos', 'Presupuesto de ingresos, clasificación económica'),
        ('ingresos-cap1-cap4', 'Capítulos 1 y 4 del presupuesto de ingresos'),
    ]
)
COLUMNAS_LIQUIDACION = {
    'gastos': ['presupuesto_inicial', 'modificaciones', 'presupuesto_total', 'obligaciones_reconocidas', 'porcentaje'],
    'gastos-cap4': ['presupuesto_inicial', 'modificaciones', 'presupuesto_total', 'obligaciones_reconocidas', 'porcentaje'],
    'ingresos': ['previsiones', 'derechos_reconocidos_netos', 'porcentaje'],
    'ingresos-cap1-cap4': ['previsiones', 'derechos_reconocidos_netos', 'porcentaje'],
}
COLUMNAS_COMPARACION = ['ejercicio_anterior', 'ejercicio_actual', 'incremento_absoluto', 'incremento_relativo']
# Columna ejecutada de cada tabla en la página de liquidación y en la de comparación.
EJECUTADO = {
    'gastos': 'obligaciones_reconocidas',
    'gastos-cap4': 'obligaciones_reconocidas',
    'ingresos': 'derechos_reconocidos_netos',
    'ingresos-cap1-cap4': 'derechos_reconocidos_netos',
}

RE_NUM = re.compile(r'^-?\d{1,3}(?:\.\d{3})*,\d{2}%?$|^-?\d+,\d{2}%?$|^--?$')


def num(s):
    """'3.425,70' -> 3425.7; '12,34%' -> 12.34; '-' o '--' -> None."""
    if s in ('-', '--'):
        return None
    return round(float(s.rstrip('%').replace('.', '').replace(',', '.')), 2)


def sha256(ruta):
    with open(ruta, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def paginas(ruta):
    salida = subprocess.run(['pdftotext', '-layout', ruta, '-'], capture_output=True, text=True, check=True).stdout
    p = salida.split('\f')
    if p and not p[-1].strip():
        p.pop()
    return p


def tabla_de_pagina(texto):
    """Clasifica una página por su título: devuelve la clave de tabla o None."""
    if 'CAPITULOS 1 Y 4 DEL PRESUPUESTO DE INGRESOS' in texto:
        return 'ingresos-cap1-cap4'
    if 'CAPITULO 4 DEL PRESUPUESTO DE GASTOS' in texto:
        return 'gastos-cap4'
    if 'PRESUPUESTO DE INGRESOS' in texto:
        return 'ingresos'
    if 'PRESUPUESTO DE GASTOS' in texto:
        return 'gastos'
    return None


def tipo_de_pagina(texto):
    """'liquidacion' (presupuesto y ejecución del ejercicio) o 'comparacion' (con el ejercicio anterior)."""
    m = re.search(r'EJERCICIO[ \t]+(\d{4})[ \t]+EJERCICIO[ \t]+(\d{4})', texto)
    if m:
        return 'comparacion', (int(m.group(1)), int(m.group(2)))
    if re.search(r'PTO\.TOTAL|PREVISIONES', texto):
        return 'liquidacion', None
    raise ValueError('página sin cabecera de columnas reconocible')


def filas_de_pagina(texto):
    """Filas con cifras de la página: (n.º de fila, sección, etiqueta, valores, texto de la línea)."""
    filas = []
    seccion = ''
    anterior = ''
    n = 0
    for linea in texto.splitlines():
        s = linea.strip()
        if not s:
            continue
        trozos = re.split(r'\s{2,}', s)
        # etiqueta = trozos hasta el primero que es cifra
        i = next((k for k, t in enumerate(trozos) if RE_NUM.match(t)), None)
        if i is None:
            # línea sin cifras: posible encabezado de sección de una tabla
            if re.match(r'^(OPERACIONES|[A-C]\)|\d\.\s?[A-Z]|[1-4]\.\s*[A-Z]{3,})', s) and 'EJERCICIO' not in s:
                seccion = s
            anterior = s
            continue
        etiqueta = ' '.join(trozos[:i]).strip()
        valores = [num(t) for t in trozos[i:]]
        if etiqueta == 'SISTEMA DE LA SEGURIDAD SOCIAL' and anterior.startswith('TOTAL'):
            etiqueta = anterior + ' ' + etiqueta
        n += 1
        filas.append({'fila': n, 'seccion': seccion, 'etiqueta': etiqueta, 'valores': valores, 'linea': re.sub(r'\s{2,}', ' | ', s)})
        anterior = s
    return filas


def leer_pdf(anio):
    ruta = f'{RAW}/{anio}_SISTEMA.pdf'
    textos = paginas(ruta)
    registro = {'anio': anio, 'fichero': f'data-raw/seg-social-fin/liquidacion/{anio}_SISTEMA.pdf', 'sha256': sha256(ruta),
                'paginas': len(textos), 'tablas': []}
    if len(textos) != 10:
        raise SystemExit(f'{ruta}: se esperaban 10 páginas y hay {len(textos)}')
    for i, t in enumerate(textos, start=1):
        tabla = tabla_de_pagina(t)
        if tabla is None:
            raise SystemExit(f'{ruta}, página {i}: no se reconoce la tabla')
        if '(Millones de euros)' not in t:
            raise SystemExit(f'{ruta}, página {i}: unidad distinta de «Millones de euros»')
        tipo, anios = tipo_de_pagina(t)
        # El título de la página puede estar mal rotulado (en el PDF de 2015, la última página dice
        # «ejercicio 2014»); manda la cabecera de columnas. Se deja constancia.
        titulo_anio = int(re.search(r'LIQUIDACI[ÓO]N DEL EJERCICIO (\d{4})', t).group(1))
        esperado = (anio - 1, anio)
        if tipo == 'comparacion' and anios != esperado:
            raise SystemExit(f'{ruta}, página {i}: años de columnas {anios}, esperados {esperado}')
        filas = filas_de_pagina(t)
        for f in filas:
            f['pagina'] = i
        registro['tablas'].append(
            {'pagina': i, 'tabla': tabla, 'tipo': tipo, 'titulo_anio': titulo_anio, 'filas': filas}
        )
    # cada tabla aparece exactamente una vez como liquidación y una como comparación
    for tabla in TABLAS:
        for tipo in ('liquidacion', 'comparacion'):
            n = sum(1 for x in registro['tablas'] if x['tabla'] == tabla and x['tipo'] == tipo)
            esperado_n = 2 if tabla == 'gastos-cap4' else 1  # el capítulo 4 de gastos ocupa dos páginas por tipo
            if n != esperado_n:
                raise SystemExit(f'{ruta}: la tabla {tabla} ({tipo}) ocupa {n} páginas (esperadas {esperado_n})')
    return registro


# ---------------------------------------------------------------------------
# Estructura esperada de cada tabla (sumas)
# ---------------------------------------------------------------------------

def tolerancia(n_cifras):
    return max(0.01, round(0.005 * n_cifras, 3))


def buscar(filas, patron, seccion=None):
    """Fila única cuya etiqueta cumple el patrón (y, si se indica, de la sección dada)."""
    res = [f for f in filas if re.search(patron, f['etiqueta'], re.I) and (seccion is None or re.search(seccion, f['seccion'], re.I))]
    if len(res) != 1:
        raise LookupError(f'{len(res)} filas para «{patron}» (sección {seccion})')
    return res[0]


def reglas_de_suma(tabla):
    """Reglas (total, componentes) por tabla: lista de (patrón total, sección total, [(patrón, sección)...])."""
    if tabla == 'gastos':
        return [
            ('SUMA OPERACIONES CORRIENTES', None, [(r'^1\. Gastos de personal', None), (r'^2\. Gastos corrientes', None), (r'^3\. Gastos financieros', None), (r'^4\. Transferencias corrientes', None)]),
            ('SUMA OPERACIONES DE CAPITAL', None, [(r'^6\. Inversiones reales', None), (r'^7\. Transferencias de capital', None)]),
            ('SUMA OPERACIONES NO FINANCIERAS', None, [('SUMA OPERACIONES CORRIENTES', None), ('SUMA OPERACIONES DE CAPITAL', None)]),
            ('SUMA OPERACIONES FINANCIERAS', None, [(r'^8\. Activos financieros', None), (r'^9\. Pasivos financieros', None)]),
            ('^TOTAL GASTOS', None, [('SUMA OPERACIONES NO FINANCIERAS', None), ('SUMA OPERACIONES FINANCIERAS', None)]),
        ]
    if tabla == 'ingresos':
        return [
            ('SUMA OPERACIONES CORRIENTES', None, [(r'^1\. Cotizaciones sociales', None), (r'^3\. Tasas', None), (r'^4\. Transferencias corrientes', None), (r'^5\. Ingresos patrimoniales', None)]),
            ('SUMA OPERACIONES DE CAPITAL', None, [(r'^6\. Enajenaci', None), (r'^7\. Transferencias de capital', None)]),
            ('SUMA OPERACIONES NO FINANCIERAS', None, [('SUMA OPERACIONES CORRIENTES', None), ('SUMA OPERACIONES DE CAPITAL', None)]),
            ('SUMA OPERACIONES FINANCIERAS', None, [(r'^8\. Activos financieros', None), (r'^9\. Pasivos financieros', None)]),
            ('^TOTAL INGRESOS', None, [('SUMA OPERACIONES NO FINANCIERAS', None), ('SUMA OPERACIONES FINANCIERAS', None)]),
        ]
    raise KeyError(tabla)


def etiquetas_de_seccion(filas, seccion_re):
    return [f for f in filas if re.search(seccion_re, f['seccion'], re.I) and not re.match(r'^(SUMA|TOTAL)', f['etiqueta'], re.I)]


def comprobar_sumas(tabla, filas, columnas, idx_cols):
    """Devuelve la lista de comprobaciones de suma de una tabla para las columnas indicadas (índices)."""
    out = []

    def valores(fs, c):
        return [f['valores'][c] for f in fs]

    def registrar(nombre, total, comps, c):
        suma = round(sum(v for v in valores(comps, c) if v is not None), 2)
        v_total = total['valores'][c]
        tol = tolerancia(len(comps) + 1)
        dif = round(suma - (v_total or 0.0), 2)
        out.append({'regla': nombre, 'columna': columnas[c], 'total': v_total, 'suma': suma, 'diferencia': dif,
                    'tolerancia': tol, 'ok': abs(dif) <= tol + 1e-9, 'fila_total': total['fila']})

    if tabla in ('gastos', 'ingresos'):
        for patron, sec, comps in reglas_de_suma(tabla):
            total = buscar(filas, patron, sec)
            fs = [buscar(filas, p, s) for p, s in comps]
            for c in idx_cols:
                registrar(f'{total["etiqueta"]} = suma de sus partidas', total, fs, c)
    elif tabla == 'gastos-cap4':
        pens = etiquetas_de_seccion(filas, r'PENSIONES')
        subs = etiquetas_de_seccion(filas, r'SUBSIDIOS')
        nocon = etiquetas_de_seccion(filas, r'NO CONTRIBUTIVAS')
        otras = etiquetas_de_seccion(filas, r'OTRAS TRANSF')
        for c in idx_cols:
            registrar('SUMA PENSIONES = cinco clases', buscar(filas, r'^SUMA PENSIONES'), pens, c)
            registrar('SUMA SUBSIDIOS Y OTRAS PRESTACIONES = sus partidas', buscar(filas, r'^SUMA SUBSIDIOS'), subs, c)
            registrar('TOTAL PRESTACIONES CONTRIBUTIVAS = pensiones + subsidios', buscar(filas, r'^TOTAL PRESTACIONES CONTRIBUTIVAS'),
                      [buscar(filas, r'^SUMA PENSIONES'), buscar(filas, r'^SUMA SUBSIDIOS')], c)
            registrar('SUMA PREST. NO CONTRIBUTIVAS = sus partidas', buscar(filas, r'^SUMA PREST\. NO CONTRIBUTIVAS'), nocon, c)
            registrar('SUMA OTRAS TRANSF. CORRIENTES = sus partidas', buscar(filas, r'^SUMA OTRAS TRANSF'), otras, c)
            registrar('TOTAL TRANSFERENCIAS CORRIENTES = contributivas + no contributivas + otras', buscar(filas, r'^TOTAL TRANSFERENCIAS CORRIENTES'),
                      [buscar(filas, r'^TOTAL PRESTACIONES CONTRIBUTIVAS'), buscar(filas, r'^SUMA PREST\. NO CONTRIBUTIVAS'), buscar(filas, r'^SUMA OTRAS TRANSF')], c)
    elif tabla == 'ingresos-cap1-cap4':
        cot = etiquetas_de_seccion(filas, r'COTIZACIONES')
        tra = etiquetas_de_seccion(filas, r'TRANSFERENCIAS CTES')
        for c in idx_cols:
            registrar('TOTAL COTIZACIONES SOCIALES = sus partidas', buscar(filas, r'^TOTAL COTIZACIONES'), cot, c)
            registrar('TOTAL TRANSFERENCIAS CORRIENTES = sus partidas', buscar(filas, r'^TOTAL TRANSFERENCIAS CORRIENTES'), tra, c)
    return out


def indice_columnas(tabla, tipo):
    cols = COLUMNAS_LIQUIDACION[tabla] if tipo == 'liquidacion' else COLUMNAS_COMPARACION
    return cols


def unir(reg):
    """(tabla, tipo) -> tabla con las filas de todas sus páginas (cada fila lleva su página)."""
    por = {}
    for t in reg['tablas']:
        k = (t['tabla'], t['tipo'])
        if k not in por:
            por[k] = {'pagina': t['pagina'], 'paginas': [t['pagina']], 'tabla': t['tabla'], 'tipo': t['tipo'], 'filas': list(t['filas'])}
        else:
            por[k]['paginas'].append(t['pagina'])
            por[k]['filas'].extend(t['filas'])
    return por


def validar_pdf(reg):
    """Validaciones (a) y (b) dentro de un PDF; devuelve lista de resultados."""
    res = []
    por = unir(reg)
    for (tabla, tipo), t in por.items():
        cols = indice_columnas(tabla, tipo)
        for f in t['filas']:
            if len(f['valores']) != len(cols):
                raise SystemExit(f'{reg["fichero"]} p.{f["pagina"]}: la fila «{f["etiqueta"]}» tiene {len(f["valores"])} cifras (esperadas {len(cols)})')
        # (a) sumas: en la liquidación, sobre cada columna de importes; en la comparación, sobre las dos de ejercicios
        if tabla in ('gastos', 'ingresos', 'gastos-cap4', 'ingresos-cap1-cap4'):
            if tipo == 'liquidacion':
                idx = [c for c, n in enumerate(cols) if n != 'porcentaje']
            else:
                idx = [0, 1]
            for r in comprobar_sumas(tabla, t['filas'], cols, idx):
                res.append({'pdf': reg['anio'], 'paginas': t['paginas'], 'tabla': tabla, 'tipo': tipo, 'comprobacion': 'suma', **r})
        # presupuesto inicial + modificaciones = presupuesto total (gastos)
        if tipo == 'liquidacion' and tabla in ('gastos', 'gastos-cap4'):
            for f in t['filas']:
                ini, mod, tot = f['valores'][0], f['valores'][1], f['valores'][2]
                if None in (ini, mod, tot):
                    continue
                dif = round(ini + mod - tot, 2)
                res.append({'pdf': reg['anio'], 'paginas': t['paginas'], 'tabla': tabla, 'tipo': tipo, 'comprobacion': 'inicial+modificaciones',
                            'regla': f['etiqueta'], 'diferencia': dif, 'tolerancia': 0.01, 'ok': abs(dif) <= 0.01 + 1e-9, 'fila_total': f['fila']})
    # (b) coherencia página de liquidación / página de comparación (columna del ejercicio actual)
    for tabla in TABLAS:
        liq, comp = por[(tabla, 'liquidacion')], por[(tabla, 'comparacion')]
        col_liq = indice_columnas(tabla, 'liquidacion').index(EJECUTADO[tabla])
        mapa_comp = {(f['seccion'], f['etiqueta']): f for f in comp['filas']}
        for f in liq['filas']:
            clave = (f['seccion'], f['etiqueta'])
            g = None
            if clave in mapa_comp:
                g = mapa_comp[clave]
            else:
                # las etiquetas y rótulos de sección de las dos páginas no siempre coinciden letra a letra
                g = emparejar(f, comp['filas'])
            if g is None:
                res.append({'pdf': reg['anio'], 'tabla': tabla, 'comprobacion': 'liquidacion-vs-comparacion', 'regla': f['etiqueta'],
                            'ok': None, 'detalle': 'partida sin equivalente en la página de comparación'})
                continue
            a, b = f['valores'][col_liq], g['valores'][1]
            if a is None or b is None:
                continue
            res.append({'pdf': reg['anio'], 'tabla': tabla, 'comprobacion': 'liquidacion-vs-comparacion', 'regla': f['etiqueta'],
                        'diferencia': round(a - b, 2), 'tolerancia': 0.01, 'ok': abs(a - b) <= 0.01 + 1e-9})
    return res


def norm(s):
    """Etiqueta comparable: minúsculas, sin puntuación ni espacios (los rótulos de las dos páginas difieren en puntos y espacios)."""
    s = s.lower()
    return re.sub(r'[^a-záéíóúñü0-9]', '', s)


UMBRAL_PARECIDO = 0.85


def emparejar(fila, candidatas):
    """Fila de `candidatas` que corresponde a `fila`: la de rótulo normalizado idéntico y misma sección o, si no hay,
    la única de la misma sección cuyo rótulo se parece en al menos el 85 % (p. ej. «admivos» y «admtivos») y que
    supera en 5 puntos a la siguiente. Devuelve None si no hay una coincidencia única."""
    misma = [h for h in candidatas if norm_sec(h['seccion']) == norm_sec(fila['seccion'])]
    exactas = [h for h in misma if norm(h['etiqueta']) == norm(fila['etiqueta'])]
    if len(exactas) == 1:
        return exactas[0]
    if exactas:
        return None
    puntuadas = sorted(((difflib.SequenceMatcher(None, norm(h['etiqueta']), norm(fila['etiqueta'])).ratio(), i) for i, h in enumerate(misma)), reverse=True)
    if puntuadas and puntuadas[0][0] >= UMBRAL_PARECIDO and (len(puntuadas) == 1 or puntuadas[0][0] - puntuadas[1][0] >= 0.05):
        return misma[puntuadas[0][1]]
    return None


def norm_sec(s):
    """Compara secciones por su primera palabra significativa (los rótulos de las dos páginas difieren)."""
    n = norm(s)
    for clave in ('pensiones', 'subsidios', 'nocontributivas', 'otrastransf', 'cotizaciones', 'transferencias', 'operaciones'):
        if clave in n:
            return clave
    return n


def main():
    registros = [leer_pdf(a) for a in ANIOS]
    validaciones = []
    for r in registros:
        validaciones.extend(validar_pdf(r))

    # (c) contraste con el PDF siguiente: columna «ejercicio anterior» frente a la liquidación del año anterior
    revisiones = []
    por_anio = {r['anio']: unir(r) for r in registros}
    for a in ANIOS[1:]:
        for tabla in TABLAS:
            comp = por_anio[a][(tabla, 'comparacion')]
            liq_prev = por_anio[a - 1][(tabla, 'liquidacion')]
            col_liq = indice_columnas(tabla, 'liquidacion').index(EJECUTADO[tabla])
            for g in comp['filas']:
                f = emparejar(g, liq_prev['filas'])
                if f is None:
                    revisiones.append({'ejercicio': a - 1, 'tabla': tabla, 'partida': g['etiqueta'], 'estado': 'sin-equivalente',
                                       'pdf_siguiente': a, 'paginas_siguiente': comp['paginas']})
                    continue
                v0, v1 = f['valores'][col_liq], g['valores'][0]
                if v0 is None or v1 is None:
                    continue
                dif = round(v1 - v0, 2)
                revisiones.append({'ejercicio': a - 1, 'tabla': tabla, 'partida': g['etiqueta'], 'valor_pdf_propio': v0, 'valor_pdf_siguiente': v1,
                                   'diferencia': dif, 'estado': 'coincide' if abs(dif) <= 0.01 + 1e-9 else 'difiere',
                                   'pdf_propio': a - 1, 'paginas_propias': liq_prev['paginas'], 'pdf_siguiente': a, 'paginas_siguiente': comp['paginas']})

    # ----------------------------------------------------------------- extracción completa
    valores = []
    for r in registros:
        for t in r['tablas']:
            cols = indice_columnas(t['tabla'], t['tipo'])
            for f in t['filas']:
                for c, nombre in enumerate(cols):
                    v = f['valores'][c]
                    if nombre in ('porcentaje', 'incremento_relativo') or v is None:
                        continue
                    periodo = r['anio'] if t['tipo'] == 'liquidacion' else (r['anio'] - 1 if nombre == 'ejercicio_anterior' else r['anio'])
                    valores.append({
                        'id': f'{r["anio"]}-p{f["pagina"]}-f{f["fila"]}-{nombre}',
                        'ejercicio_pdf': r['anio'],
                        'periodo': periodo,
                        'tabla': t['tabla'],
                        'tipo_pagina': t['tipo'],
                        'seccion': f['seccion'],
                        'partida': f['etiqueta'],
                        'columna': nombre,
                        'valor': v,
                        'referencia': {'fichero': r['fichero'], 'sha256': r['sha256'], 'pagina': f['pagina'], 'tabla': t['tabla'],
                                       'fila': f['fila'], 'linea': f['linea']},
                    })

    # marca de verificación por (pdf, tabla, tipo): verificada si todas sus comprobaciones de suma y de coherencia pasan
    malas = {}
    for v in validaciones:
        if v.get('ok') is False:
            malas.setdefault((v['pdf'], v['tabla']), []).append(v)
    for v in valores:
        v['verificado'] = (v['ejercicio_pdf'], v['tabla']) not in malas

    return registros, validaciones, revisiones, valores


def construir_series(registros, valores, validaciones):
    """Series anuales publicables (solo valores verificados). Devuelve (series, descartadas)."""
    # (tabla, tipo_pagina liquidacion, columna ejecutada, partida regex, seccion regex, id de serie, titulo, nota)
    DEF = [
        ('ingresos-cap1-cap4', r'^Del Estado$', r'TRANSFERENCIAS', 'ingresos-transferencias-corrientes-del-estado',
         'Ingresos por transferencias corrientes «Del Estado» (derechos reconocidos netos)'),
        ('ingresos-cap1-cap4', r'^De Organismos Aut[oó]nomos adm', r'TRANSFERENCIAS', 'ingresos-transferencias-corrientes-organismos-autonomos',
         'Ingresos por transferencias corrientes «De Organismos Autónomos administrativos» (derechos reconocidos netos)'),
        ('ingresos-cap1-cap4', r'^De la Seguridad Social$', r'TRANSFERENCIAS', 'ingresos-transferencias-corrientes-de-la-seguridad-social',
         'Ingresos por transferencias corrientes «De la Seguridad Social» (derechos reconocidos netos)'),
        ('ingresos-cap1-cap4', r'^TOTAL TRANSFERENCIAS CORRIENTES', r'TRANSFERENCIAS', 'ingresos-transferencias-corrientes-total',
         'Total de ingresos por transferencias corrientes, de cualquier origen (derechos reconocidos netos)'),
        ('ingresos-cap1-cap4', r'^TOTAL COTIZACIONES SOCIALES', r'COTIZACIONES', 'ingresos-cotizaciones-sociales',
         'Cotizaciones sociales (derechos reconocidos netos)'),
        ('ingresos', r'^7\. Transferencias de capital', None, 'ingresos-transferencias-capital',
         'Ingresos por transferencias de capital, de cualquier origen (derechos reconocidos netos)'),
        ('ingresos', r'^8\. Activos financieros', None, 'ingresos-activos-financieros', 'Ingresos por activos financieros, capítulo 8 (derechos reconocidos netos)'),
        ('ingresos', r'^9\. Pasivos financieros', None, 'ingresos-pasivos-financieros', 'Ingresos por pasivos financieros, capítulo 9 (derechos reconocidos netos)'),
        ('ingresos', r'^TOTAL INGRESOS', None, 'ingresos-total', 'Total de ingresos del sistema (derechos reconocidos netos)'),
        ('gastos', r'^8\. Activos financieros', None, 'gastos-activos-financieros', 'Gastos en activos financieros, capítulo 8 (obligaciones reconocidas)'),
        ('gastos', r'^9\. Pasivos financieros', None, 'gastos-pasivos-financieros', 'Gastos en pasivos financieros, capítulo 9 (obligaciones reconocidas)'),
        ('gastos', r'^TOTAL GASTOS', None, 'gastos-total', 'Total de gastos del sistema (obligaciones reconocidas)'),
        ('gastos-cap4', r'^SUMA PENSIONES', None, 'gastos-suma-pensiones-contributivas', 'Pensiones contributivas, suma de las cinco clases (obligaciones reconocidas)'),
        ('gastos-cap4', r'^Complemento a m[ií]nimos', r'NO CONTRIBUTIVAS', 'gastos-complemento-a-minimos',
         'Complemento a mínimos, dentro de las prestaciones no contributivas (obligaciones reconocidas)'),
        ('gastos-cap4', r'^SUMA PREST\. NO CONTRIBUTIVAS', None, 'gastos-prestaciones-no-contributivas', 'Prestaciones no contributivas, suma (obligaciones reconocidas)'),
        ('gastos-cap4', r'^TOTAL TRANSFERENCIAS CORRIENTES', None, 'gastos-transferencias-corrientes-total', 'Total de gastos en transferencias corrientes, capítulo 4 (obligaciones reconocidas)'),
    ]
    series = []
    descartadas = []
    for tabla, patron, seccion, sid, titulo in DEF:
        puntos = []
        for a in ANIOS:
            cand = [v for v in valores if v['ejercicio_pdf'] == a and v['tabla'] == tabla and v['tipo_pagina'] == 'liquidacion'
                    and v['columna'] == EJECUTADO[tabla] and re.search(patron, v['partida'], re.I)
                    and (seccion is None or re.search(seccion, v['seccion'], re.I))]
            if len(cand) == 0:
                descartadas.append({'serie': sid, 'periodo': a, 'motivo': 'la partida no figura en la tabla de ese ejercicio'})
                continue
            if len(cand) > 1:
                raise SystemExit(f'{sid} {a}: {len(cand)} candidatas')
            v = cand[0]
            if not v['verificado']:
                descartadas.append({'serie': sid, 'periodo': a, 'motivo': 'no supera las validaciones de suma de su tabla'})
                continue
            puntos.append(v)
        if puntos:
            series.append({'id': sid, 'titulo': titulo, 'puntos': puntos})
    return series


def comprobaciones_especificas(valores):
    """Comprobaciones que no son sumas de una tabla.

    Reclasificación del complemento a mínimos entre los PDF de 2014 y 2015: en el PDF de 2014 las cinco clases
    de pensión incluyen el complemento; en el de 2015, la comparativa de 2014 lo muestra aparte, dentro de las
    prestaciones no contributivas. Se comprueba que «suma de pensiones de 2014 (PDF de 2014)» = «suma de pensiones
    de 2014 (PDF de 2015) + complemento a mínimos de 2014 (PDF de 2015)»."""
    def uno(pdf, tipo, columna, patron):
        c = [v for v in valores if v['ejercicio_pdf'] == pdf and v['tabla'] == 'gastos-cap4' and v['tipo_pagina'] == tipo
             and v['columna'] == columna and re.search(patron, v['partida'], re.I)]
        if len(c) != 1:
            raise SystemExit(f'comprobación específica: {len(c)} candidatas para {pdf} {columna} {patron}')
        return c[0]
    propio = uno(2014, 'liquidacion', 'obligaciones_reconocidas', r'^SUMA PENSIONES')
    sig = uno(2015, 'comparacion', 'ejercicio_anterior', r'^SUMA PENSIONES')
    comp = uno(2015, 'comparacion', 'ejercicio_anterior', r'^Complemento a m[ií]nimos')
    dif = round(propio['valor'] - (sig['valor'] + comp['valor']), 2)
    return [{
        'id': 'reclasificacion-complemento-a-minimos-2014',
        'descripcion': 'Suma de pensiones de 2014 en el PDF de 2014 = suma de pensiones de 2014 en el PDF de 2015 + complemento a mínimos de 2014 en el PDF de 2015',
        'esperado': propio['valor'], 'obtenido': round(sig['valor'] + comp['valor'], 2), 'diferencia': dif, 'tolerancia': 0.02, 'ok': abs(dif) <= 0.02 + 1e-9,
    }]


def serie_derivada_pensiones(series_pub, extra):
    """Pensiones contributivas con complemento a mínimos (obligaciones reconocidas), 2010-2016.

    Hasta 2014 (PDF de cada año) el complemento está incluido en las cinco clases de pensión; desde 2015 figura aparte
    y se suma. Solo se publica si la reclasificación de 2014 cuadra."""
    if not all(c['ok'] for c in extra):
        return None
    sp = {p['period']: p for p in next(s for s in series_pub if s['id'] == 'gastos-suma-pensiones-contributivas')['points']}
    cm_serie = next((s for s in series_pub if s['id'] == 'gastos-complemento-a-minimos'), None)
    cm = {p['period']: p for p in cm_serie['points']} if cm_serie else {}
    puntos = []
    for a in ANIOS:
        k = str(a)
        if k not in sp:
            continue
        if a >= 2015 and k not in cm:
            continue  # sin el complemento aparte no se puede completar la medida: no se publica el año
        valor = round(sp[k]['value'] + (cm[k]['value'] if a >= 2015 else 0.0), 2)
        nota = ('Suma de las cinco clases de pensión de ese PDF, que incluyen el complemento a mínimos (comprobado por la reclasificación de 2014).'
                if a <= 2014 else 'Suma de las cinco clases de pensión más el complemento a mínimos, que desde este PDF figura aparte en las prestaciones no contributivas.')
        puntos.append({'period': k, 'value': valor, 'notes': nota})
    return puntos


def escribe_json(ruta, obj):
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')


def celda_csv(x):
    t = '' if x is None else str(x)
    return '"' + t.replace('"', '""') + '"' if any(c in t for c in ',"\n') else t


COLUMNAS_CSV = [
    ('id', 'Identificador del valor: ejercicio del PDF, página, fila y columna', None),
    ('ejercicio_pdf', 'Ejercicio del PDF del que se extrae', None),
    ('periodo', 'Ejercicio al que se refiere la cifra (en las columnas «ejercicio_anterior», el anterior al del PDF)', None),
    ('tabla', 'gastos, gastos-cap4, ingresos o ingresos-cap1-cap4', None),
    ('tipo_pagina', 'liquidacion (presupuesto y ejecución del ejercicio) o comparacion (con el ejercicio anterior)', None),
    ('seccion', 'Epígrafe de la tabla bajo el que figura la partida', None),
    ('partida', 'Etiqueta literal de la partida en el PDF', None),
    ('columna', 'Columna del PDF', None),
    ('valor', 'Cifra del PDF', 'millones de euros'),
    ('fichero', 'PDF de origen, ruta relativa al repositorio', None),
    ('sha256', 'Huella SHA-256 del PDF de origen', None),
    ('pagina', 'Página del PDF (numeración física, desde 1)', None),
    ('fila', 'Fila con cifras dentro de la página (desde 1)', None),
    ('linea', 'Línea de texto extraída del PDF, sin los espacios sobrantes', None),
    ('verificado', 'si: todas las sumas de la tabla de ese PDF cuadran dentro de la tolerancia; no: alguna no cuadra y la cifra no se publica', None),
]


def emite(registros, validaciones, revisiones, valores):
    series = construir_series(registros, valores, validaciones)
    resumen = OrderedDict()
    for v in validaciones:
        if v['ok'] is None or v['comprobacion'] == 'liquidacion-vs-comparacion':
            continue
        k = (v['pdf'], v['tabla'], v['tipo'])
        r = resumen.setdefault(k, {'ejercicio_pdf': v['pdf'], 'tabla': v['tabla'], 'tipo_pagina': v['tipo'], 'comprobaciones': 0, 'incorrectas': 0})
        r['comprobaciones'] += 1
        r['incorrectas'] += 0 if v['ok'] else 1
    # la comprobación liquidación/comparación no lleva 'tipo': se cuenta aparte
    coherencia = [v for v in validaciones if v['comprobacion'] == 'liquidacion-vs-comparacion' and v['ok'] is not None]
    sin_equivalente = [v for v in validaciones if v['ok'] is None]
    resumen_val = {
        'comprobaciones_de_suma': sum(r['comprobaciones'] for r in resumen.values()),
        'sumas_incorrectas': sum(r['incorrectas'] for r in resumen.values()),
        'coherencia_liquidacion_comparacion': len(coherencia),
        'coherencia_incorrecta': sum(1 for v in coherencia if v['ok'] is False),
        'partidas_sin_equivalente_en_la_comparacion': len(sin_equivalente),
    }
    contraste = {
        'cifras_contrastadas': sum(1 for r in revisiones if r['estado'] in ('coincide', 'difiere')),
        'coinciden': sum(1 for r in revisiones if r['estado'] == 'coincide'),
        'difieren': sum(1 for r in revisiones if r['estado'] == 'difiere'),
        'sin_equivalente': sum(1 for r in revisiones if r['estado'] == 'sin-equivalente'),
    }
    especificas = comprobaciones_especificas(valores)
    ruta_csv = f'{SALIDA}/liquidacion-ss-extraccion.csv'
    with open(ruta_csv, 'w', encoding='utf-8') as f:
        f.write(','.join(c[0] for c in COLUMNAS_CSV) + '\n')
        for v in valores:
            r = v['referencia']
            fila = [v['id'], v['ejercicio_pdf'], v['periodo'], v['tabla'], v['tipo_pagina'], v['seccion'], v['partida'], v['columna'],
                    f'{v["valor"]:.2f}', r['fichero'], r['sha256'], r['pagina'], r['fila'], r['linea'], 'si' if v['verificado'] else 'no']
            f.write(','.join(celda_csv(x) for x in fila) + '\n')
    meta = OrderedDict([
        ('tipo', 'extraccion-pdf'),
        ('id', 'liquidacion-ss-extraccion'),
        ('title', 'Liquidaciones del presupuesto de la Seguridad Social, ejercicios 2010 a 2016: extracción de los PDF con su referencia'),
        ('description', 'Cada cifra de las cuatro tablas de cada PDF (presupuesto de gastos, capítulo 4 de gastos, presupuesto de ingresos, capítulos 1 y 4 de ingresos), en millones de euros, con fichero, huella SHA-256, página, fila y columna. Las páginas de comparación con el ejercicio anterior se conservan porque sirven de validación. Generado por scripts/etl/ssf_liquidacion_pdf.py.'),
        ('columnas', [{'id': c[0], 'descripcion': c[1], 'unidad': c[2]} for c in COLUMNAS_CSV]),
        ('filas', len(valores)),
        ('source', FUENTE),
        ('fetchedAt', FECHA),
        ('confidence', 'alta'),
        ('naturaleza', 'observado'),
        ('unidad', UNIDAD),
        ('notes', NOTA_PROCEDENCIA),
        ('tolerancia', 'Redondeo: 0,005 millones por cada cifra que interviene en una suma, con mínimo de 0,01; las cifras de la fuente tienen dos decimales.'),
        ('origenes', [{'fichero': r['fichero'], 'sha256': r['sha256'], 'paginas': r['paginas'], 'ejercicio': r['anio']} for r in registros]),
        ('resumenValidaciones', resumen_val),
        ('validacionesPorTabla', list(resumen.values())),
        ('comprobacionesEspecificas', especificas),
        ('resumenContrasteEntrePdf', contraste),
        ('diferenciasEntrePdf', [
            {'ejercicio': r['ejercicio'], 'tabla': r['tabla'], 'partida': r['partida'], 'valor_pdf_propio': r['valor_pdf_propio'],
             'valor_pdf_siguiente': r['valor_pdf_siguiente'], 'diferencia': r['diferencia'], 'pdf_propio': r['pdf_propio'],
             'paginas_propias': r['paginas_propias'], 'pdf_siguiente': r['pdf_siguiente'], 'paginas_siguiente': r['paginas_siguiente']}
            for r in revisiones if r['estado'] == 'difiere']),
    ])
    escribe_json(f'{SALIDA}/liquidacion-ss-extraccion.json', meta)

    # series publicables: formato ArchivoDatos común (series con puntos); la referencia de cada punto va en su nota
    out_series = []
    for s in series:
        pts = []
        for v in s['puntos']:
            r = v['referencia']
            pts.append({'period': str(v['periodo']), 'value': v['valor'],
                        'notes': f'{r["fichero"].split("/")[-1]}, p. {r["pagina"]}, tabla «{r["tabla"]}», fila {r["fila"]} («{v["partida"]}»), columna «{v["columna"]}»'})
        out_series.append({
            'id': s['id'], 'title': s['titulo'], 'unit': UNIDAD, 'source': FUENTE, 'fetchedAt': FECHA, 'confidence': 'alta',
            'naturaleza': 'observado',
            'notes': 'Cifra de la liquidación del propio ejercicio (columna de ejecución), no la que reaparece como comparativa en el PDF siguiente. ' + NOTA_PROCEDENCIA,
            'points': pts,
        })
    derivada = serie_derivada_pensiones(out_series, especificas)
    if derivada:
        out_series.append({
            'id': 'gastos-pensiones-con-complemento-a-minimos',
            'title': 'Pensiones contributivas con el complemento a mínimos, obligaciones reconocidas (derivado)',
            'unit': UNIDAD, 'source': FUENTE, 'fetchedAt': FECHA, 'confidence': 'media', 'naturaleza': 'derivado',
            'notes': 'Misma definición que la referencia de «meses de gasto» de la ejecución (suma de pensiones más complemento a mínimos). Hasta 2014 el complemento está dentro de las cinco clases de cada PDF; desde 2015 figura aparte y se suma. ' + NOTA_PROCEDENCIA,
            'points': derivada,
        })
    archivo = OrderedDict([
        ('tipo', 'datos'),
        ('id', 'liquidacion-ss-series'),
        ('title', 'Liquidaciones del presupuesto de la Seguridad Social 2010-2016: series anuales verificadas'),
        ('description', 'Series anuales (millones de euros, derechos u obligaciones reconocidos) de las partidas de las liquidaciones de 2010 a 2016 que superan las validaciones de suma y de coherencia entre páginas. La referencia de cada punto (PDF, página, tabla, fila) está en su nota y la huella SHA-256 de cada PDF, en liquidacion-ss-extraccion.json. Son series de la liquidación, no de la ejecución trimestral de 2017 en adelante: no se unen en una sola línea.'),
        ('series', out_series),
    ])
    escribe_json(f'{SALIDA}/liquidacion-ss-series.json', archivo)
    print(json.dumps({'validaciones': resumen_val, 'contraste_entre_pdf': contraste, 'series': len(out_series), 'valores': len(valores)}, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--inventario':
        regs = [leer_pdf(a) for a in ANIOS]
        for r in regs:
            print(r['anio'], r['sha256'][:12], r['paginas'], 'páginas')
            for t in r['tablas']:
                print('  p', t['pagina'], t['tabla'], t['tipo'], 'filas', len(t['filas']), 'título', t['titulo_anio'])
        sys.exit(0)
    emite(*main())
