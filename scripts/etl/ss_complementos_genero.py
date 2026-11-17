"""Fase 5-A4: complementos por brecha de género y por maternidad en vigor a 1 de octubre de 2026.

Origen: `data-raw/seg-social-fin/Brecha de género.pdf` (Instituto Nacional de la Seguridad Social,
«Pensiones contributivas del Sistema de la Seguridad Social en vigor a 1 de octubre de 2026»; 14 páginas con
capa de texto, sin OCR). Contiene, por comunidad autónoma y provincia y por sexo, el número de pensiones con
el complemento, su importe medio mensual y el desglose por número de hijos. **No** contiene la brecha
de género de las pensiones de jubilación causadas cada año (DA 37.ª TRLGSS): es el recuento de un complemento.

Salidas (python3 -I scripts/etl/ss_complementos_genero.py; después, npx prettier --write sobre los JSON):
  data/sistema/complementos-genero-territorio.csv/.json     tipo «extraccion-pdf»: cada fila de las 18 tablas
                                                            (2 complementos × 3 sexos × 3 páginas… ver abajo).
  data/sistema/complementos-genero-indicadores.csv/.json    tipo «extraccion-pdf»: página de indicadores básicos.

Validaciones: (a) provincias = comunidad y comunidades = total, en el número y en cada desglose; (b) número =
suma del desglose + las pensiones sin número de hijos que declaran las notas; (c) ambos sexos = hombres + mujeres;
(d) mismos territorios, en el mismo orden, en las seis tablas; (e) los importes del encabezado del desglose son
múltiplos del importe por hijo del año (dato ya cargado); (f) la página de indicadores frente a las filas de total
y la variación porcentual frente a la absoluta; (g) idempotencia (ninguna marca de tiempo en la salida).
"""

import hashlib
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ssf_liquidacion_pdf as base  # noqa: E402

REPO = base.REPO
SALIDA = os.environ.get('SALIDA', f'{REPO}/data/sistema')
PDF = f'{REPO}/data-raw/seg-social-fin/Brecha de género.pdf'
FICHERO = 'data-raw/seg-social-fin/Brecha de género.pdf'
IMPORTE_HIJO = os.environ.get('IMPORTE_HIJO', f'{REPO}/data/parametros/complemento-brecha-genero.json')
FECHA = '2026-11-16'  # fecha de descarga indicada por Sergio
URL = 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST24'
FUENTE = {
    'title': 'Pensiones contributivas del Sistema de la Seguridad Social en vigor a 1 de octubre de 2026: complementos por brecha de género y por maternidad según comunidad autónoma y provincia',
    'publisher': 'Instituto Nacional de la Seguridad Social, Subdirección General de Gestión Económico-Presupuestaria y Estudios Económicos (Seguridad Social)',
    'url': URL,
}
NOTA_PROCEDENCIA = (
    'PDF aportado por el autor, descargado el 2026-11-16 según su indicación; no consta LEEME con la URL exacta del '
    'fichero, por lo que la URL es la de la página de estadísticas de la Seguridad Social donde se publican estos datos '
    '(sin comprobar que sea la de descarga) y la huella SHA-256 es la calculada el día de la extracción, sin referencia con la que compararla.'
)

# tablas: página inicial y final de cada (complemento, sexo)
TABLAS = [
    ('brecha', 'ambos', (3, 4)), ('brecha', 'hombres', (5, 6)), ('brecha', 'mujeres', (7, 8)),
    ('maternidad', 'ambos', (9, 10)), ('maternidad', 'hombres', (11, 12)), ('maternidad', 'mujeres', (13, 14)),
]
COLUMNAS_NUMERICAS = {
    'brecha': ['numero', 'importe_medio', 'hijos_1', 'hijos_2', 'hijos_3', 'hijos_4_o_mas'],
    'maternidad': ['numero', 'importe_medio', 'hijos_2', 'hijos_3', 'hijos_4_o_mas'],
}
RE_ENTERO = re.compile(r'^\d{1,3}(?:\.\d{3})*$')
RE_DECIMAL = re.compile(r'^\d{1,3}(?:\.\d{3})*,\d{2}$')


def sha256(ruta):
    with open(ruta, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def paginas():
    s = subprocess.run(['pdftotext', '-layout', PDF, '-'], capture_output=True, text=True, check=True).stdout.split('\f')
    if s and not s[-1].strip():
        s.pop()
    return s


def entero(t):
    return int(t.replace('.', ''))


def decimal(t):
    return round(float(t.replace('.', '').replace(',', '.')), 2)


def filas_de_tabla(texto, complemento):
    """Filas con cifras de una página de territorio: (etiqueta, valores, línea)."""
    cols = COLUMNAS_NUMERICAS[complemento]
    out = []
    for linea in texto.splitlines():
        s = linea.strip()
        if not s:
            continue
        trozos = re.split(r'\s{2,}', s)
        if len(trozos) != len(cols) + 1:
            continue
        etiqueta, resto = trozos[0], trozos[1:]
        if not (RE_ENTERO.match(resto[0]) and RE_DECIMAL.match(resto[1]) and all(RE_ENTERO.match(x) for x in resto[2:])):
            continue
        if not re.match(r'^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]', etiqueta):
            continue
        vals = [entero(resto[0]), decimal(resto[1])] + [entero(x) for x in resto[2:]]
        out.append({'etiqueta': etiqueta, 'valores': vals, 'linea': re.sub(r'\s{2,}', ' | ', s)})
    return out


def cabecera_importes(texto, complemento):
    """Importes (o porcentajes) del encabezado del desglose: «(36,90€)» o «(5%)»."""
    m = re.findall(r'\((\d+(?:,\d+)?)\s*(€|%)\)', texto)
    if complemento == 'brecha':
        return [decimal(x) if ',' in x else float(x) for x, u in m if u == '€']
    return [float(x.replace(',', '.')) for x, u in m if u == '%']


def clasifica_territorios(filas):
    """Divide las filas (tras «Total») en comunidades y provincias por la suma exacta de las cifras de
    desglose: una fila es comunidad con provincias si las siguientes, en orden, suman exactamente su número y
    cada columna de desglose (sin las columnas de importe medio). Devuelve la lista con nivel y comunidad."""
    res = []
    i = 0
    n = len(filas)
    while i < n:
        f = filas[i]
        suma = None
        j = i
        acum = [0] * len(f['valores'])
        encontrado = None
        while j + 1 < n and j - i < 12:
            j += 1
            g = filas[j]
            acum = [a + (0 if k == 1 else g['valores'][k]) for k, a in enumerate(acum)]
            if all(a == (0 if k == 1 else f['valores'][k]) for k, a in enumerate(acum)):
                encontrado = j
                break
            if acum[0] > f['valores'][0]:
                break
        del suma
        if encontrado is not None and encontrado > i:
            res.append({**f, 'nivel': 'comunidad', 'comunidad': f['etiqueta']})
            for g in filas[i + 1:encontrado + 1]:
                res.append({**g, 'nivel': 'provincia', 'comunidad': f['etiqueta']})
            i = encontrado + 1
        else:
            res.append({**f, 'nivel': 'comunidad', 'comunidad': f['etiqueta']})
            i += 1
    return res


def lee_tablas():
    ps = paginas()
    if len(ps) != 14:
        raise SystemExit(f'{PDF}: se esperaban 14 páginas y hay {len(ps)}')
    tablas = []
    for complemento, sexo, (p0, p1) in TABLAS:
        textos = [ps[p - 1] for p in range(p0, p1 + 1)]
        titulo = 'BRECHA DE G' if complemento == 'brecha' else 'MATERNIDAD'
        sx = {'ambos': 'AMBOS SEXOS', 'hombres': 'HOMBRES', 'mujeres': 'MUJERES'}[sexo]
        for k, t in enumerate(textos, start=p0):
            if f'COMPLEMENTO POR {titulo}' not in t.upper().replace('É', 'E') and f'COMPLEMENTO POR {titulo}' not in t.upper():
                raise SystemExit(f'página {k}: no es del complemento «{complemento}»')
            if sx not in t:
                raise SystemExit(f'página {k}: no es de «{sexo}»')
        filas = []
        for k, t in enumerate(textos, start=p0):
            for n, f in enumerate(filas_de_tabla(t, complemento), start=1):
                f['pagina'] = k
                filas.append(f)
        total = [f for f in filas if f['etiqueta'] == 'Total']
        if len(total) != 1 or filas[0]['etiqueta'] != 'Total':
            raise SystemExit(f'tabla {complemento}/{sexo}: no hay una única fila «Total» al principio')
        for n, f in enumerate(filas, start=1):
            f['fila'] = n
        terr = clasifica_territorios(filas[1:])
        notas = [int(m) for t in textos for m in re.findall(r'Hay (\d+) prestaciones? con complemento por \w+ para las que no ha sido posible', t)]
        tablas.append({'complemento': complemento, 'sexo': sexo, 'paginas': list(range(p0, p1 + 1)), 'total': filas[0], 'territorios': terr,
                       'cabecera': cabecera_importes(textos[0], complemento), 'sin_hijos': sum(notas), 'notas_sin_hijos': notas})
    return tablas


def lee_indicadores():
    t = paginas()[1]
    bloques = OrderedDict()
    bloque = ''
    sub = ''
    filas = []
    for linea in t.splitlines():
        s = linea.strip()
        if not s:
            continue
        m = re.match(r'^(Número de complementos en vigor|Importe medio del complemento|Variación en el último mes|Variación en el último año)\b', s)
        if m:
            bloque, sub = m.group(1), ''
            continue
        if re.match(r'^En (brecha de género|maternidad)$', s):
            sub = 'brecha' if 'brecha' in s else 'maternidad'
            continue
        trozos = re.split(r'\s{2,}', s)
        vals = trozos[1:]
        if len(vals) != 3 or not all(re.match(r'^-?[\d.]+(,\d+)?%?$', v) for v in vals):
            continue
        etq = trozos[0]
        if bloque.startswith('Variación'):
            comp = sub
        else:
            comp = 'brecha' if etq.startswith('Por brecha de género') or (not filas or filas[-1]['complemento'] == 'brecha' and not etq.startswith('Por maternidad')) else 'maternidad'
            if etq.startswith('Por maternidad'):
                comp = 'maternidad'
        filas.append({'bloque': bloque, 'complemento': comp, 'concepto': etq, 'valores': vals, 'linea': re.sub(r'\s{2,}', ' | ', s)})
    return filas


def valor_ind(txt):
    pct = txt.endswith('%')
    t = txt.rstrip('%')
    if ',' in t:
        return round(float(t.replace('.', '').replace(',', '.')), 2), ('%' if pct else 'decimal')
    return int(t.replace('.', '')), ('%' if pct else 'entero')


def validaciones(tablas, indicadores):
    res = []

    def reg(id_, desc, esperado, obtenido, tol=0):
        dif = round(obtenido - esperado, 4)
        res.append({'id': id_, 'descripcion': desc, 'esperado': esperado, 'obtenido': obtenido, 'diferencia': dif, 'tolerancia': tol, 'ok': abs(dif) <= tol + 1e-9})

    for t in tablas:
        cols = COLUMNAS_NUMERICAS[t['complemento']]
        clave = f'{t["complemento"]}-{t["sexo"]}'
        ccaa = [f for f in t['territorios'] if f['nivel'] == 'comunidad']
        for k, c in enumerate(cols):
            if c == 'importe_medio':
                continue
            reg(f'comunidades-suman-total-{clave}-{c}', f'Tabla {clave}, columna «{c}»: la suma de las comunidades y ciudades autónomas es el total', t['total']['valores'][k], sum(f['valores'][k] for f in ccaa))
        for com in ccaa:
            provs = [f for f in t['territorios'] if f['nivel'] == 'provincia' and f['comunidad'] == com['etiqueta']]
            if not provs:
                continue
            for k, c in enumerate(cols):
                if c == 'importe_medio':
                    continue
                reg(f'provincias-suman-comunidad-{clave}-{re.sub(r"[^a-z]", "", com["etiqueta"].lower())}-{c}',
                    f'Tabla {clave}, {com["etiqueta"]}, columna «{c}»: las provincias suman la comunidad', com['valores'][k], sum(f['valores'][k] for f in provs))
        # número = suma del desglose + sin número de hijos (nota)
        desglose = [k for k, c in enumerate(cols) if c.startswith('hijos_')]
        reg(f'desglose-mas-sin-hijos-{clave}', f'Tabla {clave}: el total es la suma de los tramos de hijos más las pensiones sin número de hijos que declaran las notas ({t["sin_hijos"]})',
            t['total']['valores'][0], sum(t['total']['valores'][k] for k in desglose) + t['sin_hijos'])
        reg(f'sin-hijos-por-territorio-{clave}', f'Tabla {clave}: la suma, por comunidad, de la diferencia entre el número y su desglose coincide con lo que declaran las notas',
            t['sin_hijos'], sum(f['valores'][0] - sum(f['valores'][k] for k in desglose) for f in ccaa))
        # importes del encabezado: múltiplos del importe por hijo
    # ambos = hombres + mujeres
    for comp in ('brecha', 'maternidad'):
        a = next(t for t in tablas if t['complemento'] == comp and t['sexo'] == 'ambos')
        h = next(t for t in tablas if t['complemento'] == comp and t['sexo'] == 'hombres')
        m = next(t for t in tablas if t['complemento'] == comp and t['sexo'] == 'mujeres')
        cols = COLUMNAS_NUMERICAS[comp]
        ta, th, tm = ({(f['nivel'], f['comunidad'], f['etiqueta']): f for f in t['territorios']} for t in (a, h, m))
        for k, c in enumerate(cols):
            if c == 'importe_medio':
                continue
            reg(f'ambos-igual-hombres-mas-mujeres-{comp}-total-{c}', f'Complemento «{comp}», total, «{c}»: ambos sexos = hombres + mujeres',
                a['total']['valores'][k], h['total']['valores'][k] + m['total']['valores'][k])
        dif_terr = 0
        for clave_t, f in ta.items():
            g, w = th.get(clave_t), tm.get(clave_t)
            if g is None or w is None:
                reg(f'territorio-en-las-tres-tablas-{comp}-{re.sub(r"[^a-z]", "", clave_t[2].lower())}', f'«{clave_t[2]}» figura en las tres tablas del complemento «{comp}»', 1, 0)
                continue
            for k, c in enumerate(cols):
                if c == 'importe_medio':
                    continue
                if f['valores'][k] != g['valores'][k] + w['valores'][k]:
                    dif_terr += 1
        reg(f'ambos-igual-hombres-mas-mujeres-{comp}-territorios', f'Complemento «{comp}»: territorios y columnas en los que ambos sexos no es hombres + mujeres', 0, dif_terr)
        # mismos territorios y orden
        orden = [[(f['nivel'], f['etiqueta']) for f in t['territorios']] for t in (a, h, m)]
        reg(f'mismos-territorios-{comp}', f'Complemento «{comp}»: las tres tablas listan los mismos territorios en el mismo orden', 1, 1 if orden[0] == orden[1] == orden[2] else 0)
        n_ccaa = sum(1 for f in a['territorios'] if f['nivel'] == 'comunidad')
        n_prov = sum(1 for f in a['territorios'] if f['nivel'] == 'provincia')
        reg(f'numero-de-comunidades-{comp}', f'Complemento «{comp}»: 17 comunidades y 2 ciudades autónomas', 19, n_ccaa)
        reg(f'numero-de-provincias-{comp}', f'Complemento «{comp}»: 43 provincias en las diez comunidades con más de una (las provincias de las comunidades uniprovinciales figuran como comunidad)', 43, n_prov)
    # importes del encabezado
    with open(IMPORTE_HIJO, encoding='utf-8') as f:
        d = json.load(f)
    por_hijo = next(x['value'] for x in d['data'] if x['period'] == '2026')
    for t in tablas:
        if t['complemento'] == 'brecha':
            for k, v in enumerate(t['cabecera']):
                reg(f'importe-por-hijos-{t["sexo"]}-{k + 1}', f'Encabezado del desglose de la tabla brecha/{t["sexo"]}: el importe de {k + 1} hijo(s) es {k + 1} veces el importe de 2026 de los datos ya cargados',
                    round(por_hijo * (k + 1), 2), v, 0.005)
        else:
            reg(f'porcentajes-{t["sexo"]}', f'Encabezado del desglose de la tabla maternidad/{t["sexo"]}: tres porcentajes (2, 3 y 4 o más hijos)', 3, len(t['cabecera']))
    # indicadores frente a las filas de total
    def ind(bloque, comp, concepto, col):
        c = [f for f in indicadores if f['bloque'] == bloque and f['complemento'] == comp and f['concepto'] == concepto]
        if len(c) != 1:
            raise SystemExit(f'indicador {bloque}/{comp}/{concepto}: {len(c)} filas')
        return valor_ind(c[0]['valores'][col])[0]
    sexos = ['ambos', 'hombres', 'mujeres']
    nombres = {'brecha': ['Por brecha de género', 'Por 1 hijo', 'Por 2 hijos', 'Por 3 hijos', 'Por 4 ó más hijos'],
               'maternidad': ['Por maternidad', 'Por 2 hijos', 'Por 3 hijos', 'Por 4 ó más hijos']}
    for comp, etqs in nombres.items():
        for j, sx in enumerate(sexos):
            t = next(x for x in tablas if x['complemento'] == comp and x['sexo'] == sx)
            vals_total = [t['total']['valores'][0]] + [t['total']['valores'][k] for k, c in enumerate(COLUMNAS_NUMERICAS[comp]) if c.startswith('hijos_')]
            for q, etq in enumerate(etqs):
                reg(f'indicador-numero-{comp}-{sx}-{q}', f'Indicadores: «{etq}» ({comp}, {sx}) coincide con el total de la tabla de territorio', vals_total[q],
                    ind('Número de complementos en vigor', comp, etq, j))
            reg(f'indicador-importe-{comp}-{sx}', f'Indicadores: importe medio ({comp}, {sx}) coincide con el total de la tabla de territorio', t['total']['valores'][1],
                ind('Importe medio del complemento', comp, nombres[comp][0], j), 0.005)
    # variación porcentual = absoluta / (número actual - absoluta)
    for bloque, nombre, nid in (('Variación en el último mes', 'mes', 'mes'), ('Variación en el último año', 'año', 'anio')):
        for comp in ('brecha', 'maternidad'):
            for j, sx in enumerate(sexos):
                t = next(x for x in tablas if x['complemento'] == comp and x['sexo'] == sx)
                ab = ind(bloque, comp, 'Variación absoluta', j)
                pc = ind(bloque, comp, 'En %', j)
                n = t['total']['valores'][0]
                esperado = round(100 * ab / (n - ab), 2)
                # la fuente da un decimal en hombres y mujeres y dos en ambos sexos
                dec = 2 if sx == 'ambos' else 1
                reg(f'variacion-{nid}-{comp}-{sx}', f'Variación en el último {nombre} ({comp}, {sx}): el porcentaje es la variación absoluta sobre el número del periodo anterior (número actual menos la variación)',
                    round(pc, dec), round(esperado, dec), 0.051 if dec == 1 else 0.0051)
    return res


COLUMNAS_TERR = [
    ('id', 'Identificador: complemento, sexo, página y fila', None),
    ('complemento', 'brecha (complemento para la reducción de la brecha de género) o maternidad (complemento por maternidad)', None),
    ('sexo', 'ambos, hombres o mujeres', None),
    ('nivel', 'total, comunidad o provincia (las ciudades autónomas figuran como comunidad)', None),
    ('territorio', 'Rótulo del territorio tal como figura en el PDF', None),
    ('comunidad', 'Comunidad o ciudad autónoma a la que pertenece (vacío en el total)', None),
    ('numero', 'Número de pensiones en vigor con el complemento', 'pensiones'),
    ('importe_medio', 'Importe medio mensual del complemento', 'euros al mes'),
    ('hijos_1', 'Pensiones con el importe de un hijo (solo brecha de género)', 'pensiones'),
    ('hijos_2', 'Pensiones con el importe de dos hijos', 'pensiones'),
    ('hijos_3', 'Pensiones con el importe de tres hijos', 'pensiones'),
    ('hijos_4_o_mas', 'Pensiones con el importe de cuatro o más hijos', 'pensiones'),
    ('fichero', 'PDF de origen, ruta relativa al repositorio', None),
    ('sha256', 'Huella SHA-256 del PDF de origen', None),
    ('pagina', 'Página del PDF (numeración física, desde 1)', None),
    ('fila', 'Fila con cifras dentro de la tabla (desde 1, la fila «Total» es la 1)', None),
    ('linea', 'Línea de texto extraída del PDF, sin los espacios sobrantes', None),
    ('verificado', 'si: el territorio supera las sumas (provincias, comunidades, sexos y desglose); no: alguna falla y la cifra no se publica', None),
]

COLUMNAS_IND = [
    ('id', 'Identificador: bloque, complemento y concepto', None),
    ('bloque', 'Bloque de la tabla de indicadores del PDF', None),
    ('complemento', 'brecha o maternidad', None),
    ('concepto', 'Concepto tal como figura en el PDF', None),
    ('ambos', 'Cifra para ambos sexos (número de pensiones, euros al mes o porcentaje según el bloque y el concepto)', None),
    ('hombres', 'Cifra para hombres', None),
    ('mujeres', 'Cifra para mujeres', None),
    ('unidad_cifra', 'pensiones, euros al mes o porcentaje', None),
    ('fichero', 'PDF de origen, ruta relativa al repositorio', None),
    ('sha256', 'Huella SHA-256 del PDF de origen', None),
    ('pagina', 'Página del PDF (numeración física, desde 1)', None),
    ('fila', 'Fila de la página de indicadores (desde 1)', None),
    ('linea', 'Línea de texto extraída del PDF, sin los espacios sobrantes', None),
]


def celda(x):
    return base.celda_csv(x)


def emite(tablas, indicadores, vals, sha):
    malas = [v for v in vals if not v['ok']]
    verificado = not malas
    filas_csv = []
    for t in tablas:
        cols = COLUMNAS_NUMERICAS[t['complemento']]
        filas = [{**t['total'], 'nivel': 'total', 'comunidad': ''}] + t['territorios']
        for f in filas:
            v = dict(zip(cols, f['valores']))
            fila = [f'{t["complemento"]}-{t["sexo"]}-p{f["pagina"]}-f{f["fila"]}', t['complemento'], t['sexo'], f['nivel'], f['etiqueta'], f['comunidad'],
                    v['numero'], f'{v["importe_medio"]:.2f}', v.get('hijos_1', ''), v['hijos_2'], v['hijos_3'], v['hijos_4_o_mas'], FICHERO, sha, f['pagina'], f['fila'], f['linea'],
                    'si' if verificado else 'no']
            filas_csv.append(fila)
    with open(f'{SALIDA}/complementos-genero-territorio.csv', 'w', encoding='utf-8') as f:
        f.write(','.join(c[0] for c in COLUMNAS_TERR) + '\n')
        for r in filas_csv:
            f.write(','.join(celda(x) for x in r) + '\n')
    resumen = {
        'comprobaciones': len(vals), 'incorrectas': len(malas), 'tablas': len(tablas), 'filas': len(filas_csv),
        'comunidades_y_ciudades': len([f for f in tablas[0]['territorios'] if f['nivel'] == 'comunidad']),
        'provincias': len([f for f in tablas[0]['territorios'] if f['nivel'] == 'provincia']),
    }
    origen = [{'fichero': FICHERO, 'sha256': sha, 'paginas': 14, 'ejercicio': 2026}]
    por_tabla = [{'ejercicio_pdf': 2026, 'tabla': f'{t["complemento"]}-{t["sexo"]}', 'tipo_pagina': 'territorio',
                  'comprobaciones': sum(1 for v in vals if f'-{t["complemento"]}-{t["sexo"]}' in v['id'] or v['id'].endswith(f'{t["complemento"]}-{t["sexo"]}')),
                  'incorrectas': sum(1 for v in vals if (f'-{t["complemento"]}-{t["sexo"]}' in v['id'] or v['id'].endswith(f'{t["complemento"]}-{t["sexo"]}')) and not v['ok'])}
                 for t in tablas]
    meta = OrderedDict([
        ('tipo', 'extraccion-pdf'),
        ('id', 'complementos-genero-territorio'),
        ('title', 'Pensiones en vigor a 1 de octubre de 2026 con complemento por brecha de género y por maternidad, por comunidad autónoma, provincia y sexo'),
        ('description', 'Número de pensiones contributivas en vigor con el complemento, importe medio mensual y desglose por número de hijos, para cada comunidad, ciudad autónoma y provincia, por sexo y por tipo de complemento (seis tablas de 62 territorios más el total). Es un recuento de complementos a una fecha: no es la brecha de género de las pensiones de jubilación causadas cada año. Generado por scripts/etl/ss_complementos_genero.py.'),
        ('columnas', [{'id': c[0], 'descripcion': c[1], 'unidad': c[2]} for c in COLUMNAS_TERR]),
        ('filas', len(filas_csv)),
        ('source', FUENTE), ('fetchedAt', FECHA), ('confidence', 'alta'), ('naturaleza', 'observado'),
        ('unidad', 'Número de pensiones en vigor e importe medio en euros al mes'),
        ('notes', NOTA_PROCEDENCIA + ' Las pensiones sin número de hijos determinado figuran en las notas del PDF y no están en el desglose.'),
        ('tolerancia', 'Sin tolerancia en los recuentos (enteros); 0,005 euros en los importes del encabezado frente al importe por hijo de los datos.'),
        ('origenes', origen),
        ('resumenValidaciones', resumen),
        ('validacionesPorTabla', por_tabla),
        ('comprobacionesEspecificas', vals),
    ])
    base.escribe_json(f'{SALIDA}/complementos-genero-territorio.json', meta)

    # indicadores
    filas_i = []
    for n, f in enumerate(indicadores, start=1):
        vs = [valor_ind(x) for x in f['valores']]
        unidad = vs[0][1]
        u = 'porcentaje' if unidad == '%' else ('euros al mes' if f['bloque'].startswith('Importe') else 'pensiones')
        filas_i.append([f'{f["bloque"]}-{f["complemento"]}-{f["concepto"]}'.lower().replace(' ', '-').replace('á', 'a').replace('ó', 'o').replace('ú', 'u').replace('é', 'e').replace('í', 'i').replace('ñ', 'n').replace('%', 'pct'),
                        f['bloque'], f['complemento'], f['concepto'], f['valores'][0].rstrip('%').replace('.', '').replace(',', '.'),
                        f['valores'][1].rstrip('%').replace('.', '').replace(',', '.'), f['valores'][2].rstrip('%').replace('.', '').replace(',', '.'),
                        u, FICHERO, sha, 2, n, f['linea']])
    ids = [r[0] for r in filas_i]
    if len(set(ids)) != len(ids):
        # el concepto «Por 2 hijos» se repite entre bloques de variación: se añade el número de fila
        filas_i = [[f'{r[0]}-f{r[11]}'] + r[1:] for r in filas_i]
    with open(f'{SALIDA}/complementos-genero-indicadores.csv', 'w', encoding='utf-8') as f:
        f.write(','.join(c[0] for c in COLUMNAS_IND) + '\n')
        for r in filas_i:
            f.write(','.join(celda(x) for x in r) + '\n')
    meta_i = OrderedDict([
        ('tipo', 'extraccion-pdf'),
        ('id', 'complementos-genero-indicadores'),
        ('title', 'Indicadores básicos de los complementos por brecha de género y por maternidad a 1 de octubre de 2026'),
        ('description', 'Página de indicadores básicos del PDF: número de complementos en vigor, importe medio y variación en el último mes y en el último año, por tipo de complemento y sexo. Generado por scripts/etl/ss_complementos_genero.py.'),
        ('columnas', [{'id': c[0], 'descripcion': c[1], 'unidad': c[2]} for c in COLUMNAS_IND]),
        ('filas', len(filas_i)),
        ('source', FUENTE), ('fetchedAt', FECHA), ('confidence', 'alta'), ('naturaleza', 'observado'),
        ('unidad', 'Número de pensiones, euros al mes o porcentaje según el concepto'),
        ('notes', NOTA_PROCEDENCIA),
        ('tolerancia', 'Sin tolerancia en los recuentos; las variaciones porcentuales se comprueban con el redondeo con el que las publica la fuente (dos decimales en ambos sexos, uno en hombres y mujeres).'),
        ('origenes', origen),
        ('resumenValidaciones', {'comprobaciones': sum(1 for v in vals if v['id'].startswith(('indicador', 'variacion'))), 'incorrectas': sum(1 for v in vals if v['id'].startswith(('indicador', 'variacion')) and not v['ok'])}),
        ('validacionesPorTabla', [{'ejercicio_pdf': 2026, 'tabla': 'indicadores', 'tipo_pagina': 'indicadores',
                                   'comprobaciones': sum(1 for v in vals if v['id'].startswith(('indicador', 'variacion'))),
                                   'incorrectas': sum(1 for v in vals if v['id'].startswith(('indicador', 'variacion')) and not v['ok'])}]),
        ('comprobacionesEspecificas', [v for v in vals if v['id'].startswith(('indicador', 'variacion'))]),
    ])
    base.escribe_json(f'{SALIDA}/complementos-genero-indicadores.json', meta_i)
    print(json.dumps({'tablas': len(tablas), 'filas': len(filas_csv), 'indicadores': len(filas_i), 'validaciones': len(vals), 'incorrectas': len(malas)}, ensure_ascii=False))
    for v in malas[:15]:
        print('FALLA', v['id'], v['esperado'], v['obtenido'])


def main():
    tablas = lee_tablas()
    indicadores = lee_indicadores()
    return tablas, indicadores


if __name__ == '__main__':
    tablas, indicadores = main()
    sha = sha256(PDF)
    vals = validaciones(tablas, indicadores)
    emite(tablas, indicadores, vals, sha)
