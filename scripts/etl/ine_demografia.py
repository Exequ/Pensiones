"""Bloque A de la Fase 1B-3: demografía (INE). Escribe data/demografia/.

Lee las tablas del INE descargadas por ine.py (data-raw/ine/tablas/) y genera tablas CSV con su JSON
hermano y ficheros de series. Ejecutar con `python3 -I scripts/etl/ine_demografia.py` (MODO=local si
las tablas ya están descargadas).
"""
import collections, csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_tabla, escribe_series
from ine import tabla, fuente, meta, _origen, URL_WEB

OUT = f'{REPO}/data/demografia'
SEXO = {'Total': 'ambos', 'Ambos sexos': 'ambos', 'Hombres': 'hombres', 'Mujeres': 'mujeres'}


def puntos(data):
    """Puntos de serie ordenados por año, sin los valores que el INE no publica (nulos)."""
    return [{'period': str(x['Anyo']), 'value': x['Valor']} for x in sorted(data, key=lambda x: x['Anyo']) if x['Valor'] is not None]


def edad_de(nombre):
    """'37 años' -> 37; '1 año' -> 1; '100 y más años' -> 100; '15 y menos años' -> 15."""
    m = re.match(r'(\d+)', nombre)
    return int(m.group(1)) if m else None


def origenes(ids):
    o = _origen()
    # period: último año con datos de la tabla (el esquema exige un año); la tabla se identifica en la URL
    return [{'period': str(max(x['Anyo'] for s in tabla(i) for x in s['Data'])), 'url': o[str(i)]['web'],
             'sha256': o[str(i)]['sha256']} for i in ids]


def escribe_csv(id_, cab, filas):
    with open(f'{OUT}/{id_}.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(cab)
        w.writerows(filas)
    return len(filas)


def num(v, nd=None):
    if v is None:
        return ''
    if nd is None:
        return repr(float(v)) if v != int(v) else str(int(v))
    return f'{v:.{nd}f}'


def valor_str(v):
    if v is None:
        return ''
    return str(int(v)) if float(v) == int(v) else repr(float(v))


# ---------------------------------------------------------------- A1: población
def a1():
    filas = {}
    # 1981-2026: tabla 59583 (edades 0 a 99 y «100 y más»). 1971-1980: la 59583 no trae el tramo abierto
    # (solo 0-84); la tabla 56934 (hasta «105 y más») sí, con el tramo abierto «85 y más» en esas fechas.
    for tid, anios in ((59583, range(1981, 2027)), (56934, range(1971, 1981))):
        for s in tabla(tid):
            m = meta(s)
            if 'Totales de edad' in m or m.get('Conceptos demógraficos') != 'Población':
                continue
            sx, ed = SEXO[m['Sexo']], edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
            for x in s['Data']:
                if x['Fecha'][5:10] == '01-01' and x['Anyo'] in anios:
                    filas[(x['Anyo'], sx, ed)] = (x['Valor'], x['T3_TipoDato'].lower())
    filas = sorted(filas.items())
    rows = [[a, sx, ed, valor_str(v), t, 1 if ed == (85 if a <= 1980 else 100) else 0] for (a, sx, ed), (v, t) in filas]
    n = escribe_csv('poblacion-edad-sexo', ['anio', 'sexo', 'edad', 'poblacion', 'tipo', 'tramo_abierto'], rows)
    print('A1 filas', n, 'años', filas[0][0][0], filas[-1][0][0])
    notas = ('Población residente en España a 1 de enero de cada año por edad simple (0 a 99 y «100 y más», '
             'que figura como edad 100) y sexo; «ambos» es el total publicado por el INE. Serie 1971-2021: '
             'estimaciones intercensales de población (coinciden con los censos de 1981, 1991, 2001, 2011 y 2021 y '
             'se corrigen con cada censo); desde el 1 de enero de 2021, Estadística Continua de Población (ECP), '
             'basada por primera vez enteramente en registros administrativos. El INE señala que la ECP sustituye '
             'a las series «Cifras de Población» y a las correcciones intercensales decenales; el año 2021 es el '
             'punto de cambio de metodología. El valor de 1 de enero de 2026 es «provisional» según el INE. '
             '1971-1980: la tabla 59583 del INE solo da las edades 0 a 84 (sin tramo abierto) y se usa la tabla 56934, que añade «85 y más» '
             '(la suma coincide con el total); 1981-2026: tabla 59583. Ambas tablas coinciden en todas las fechas comunes.')
    escribe_tabla('demografia', 'poblacion-edad-sexo',
        'Población residente a 1 de enero por edad simple y sexo (1971-2026)',
        'Población residente en España a 1 de enero por edad simple (0 a «100 y más»; 0 a «85 y más» en 1971-1980) y sexo, 1971-2026. ' + notas,
        [('anio', 'Año (1 de enero)', None), ('sexo', 'ambos, hombres o mujeres', None),
         ('edad', 'Edad simple en años cumplidos; 100 = «100 y más años»', 'años'),
         ('poblacion', 'Población residente', 'personas'),
         ('tipo', 'definitivo o provisional (según el INE)', None),
         ('tramo_abierto', '1 si la edad es el tramo abierto final («85 y más» en 1971-1980, «100 y más» desde 1981)', None)],
        n, fuente(59583, 'Estadística Continua de Población: población residente por fecha, sexo y edad (tabla 59583)'),
        origenes([59583, 56934]), confidence='alta')
    return {(a, sx, ed): v for (a, sx, ed), (v, t) in filas}


# ---------------------------------------------------------------- A2: mortalidad
FUNC = {'Tasa de mortalidad': 'mx', 'Promedio de años vividos el último año de vida': 'ax', 'Riesgo de muerte': 'qx_por_mil',
        'Supervivientes': 'lx', 'Defunciones teóricas': 'dx', 'Población estacionaria': 'pob_estacionaria', 'Tiempo por vivir': 'tiempo_por_vivir',
        'Esperanza de vida': 'ex'}


def tabla_mortalidad(tids, edicion_de):
    cel = {}
    for tid in tids:
        for s in tabla(tid):
            m = meta(s)
            fn = FUNC[m['Conceptos demógraficos']]
            ed = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
            for x in s['Data']:
                cel[(x['Anyo'], SEXO[m['Sexo']], ed, fn)] = x['Valor']
    return cel


def a2():
    cel = tabla_mortalidad([27150, 27153], None)
    claves = sorted({k[:3] for k in cel})
    cols = ['mx', 'ax', 'qx_por_mil', 'lx', 'dx', 'pob_estacionaria', 'tiempo_por_vivir', 'ex']
    rows = []
    for (a, sx, ed) in claves:
        ed_ab = 90 if a <= 1990 else 100
        rows.append([a, '1975-1990' if a <= 1990 else '1991-2024', sx, ed] + [valor_str(cel.get((a, sx, ed, c))) for c in cols])
    n = escribe_csv('mortalidad-ine', ['anio', 'edicion', 'sexo', 'edad'] + cols, rows)
    print('A2 filas', n)
    uni = [('mx', 'Tasa central de mortalidad (tasa de mortalidad)', 'por mil'),
           ('ax', 'Promedio de años vividos el último año de vida', 'años'),
           ('qx_por_mil', 'Probabilidad de muerte entre las edades x y x+1 (riesgo de muerte), qx', 'por mil'),
           ('lx', 'Supervivientes a la edad exacta x (raíz 100.000)', 'personas'),
           ('dx', 'Defunciones teóricas entre x y x+1', 'personas'),
           ('pob_estacionaria', 'Población estacionaria Lx entre x y x+1', 'personas-año'),
           ('tiempo_por_vivir', 'Tiempo por vivir Tx desde la edad x', 'personas-año'),
           ('ex', 'Esperanza de vida a la edad x', 'años')]
    escribe_tabla('demografia', 'mortalidad-ine',
        'Tablas de mortalidad del INE por año, sexo y edad simple (1975-2024)',
        'Funciones de la tabla de mortalidad (mx, ax, qx, lx, dx, Lx, Tx, ex) por año, sexo y edad simple, total nacional. '
        'Dos ediciones del INE: 1975-1990 (edades 0 a 89 y «90 y más», que figura como edad 90) y 1991-2024 (edades 0 a 99 y '
        '«100 y más», que figura como edad 100). Cambia el tramo abierto final y, con él, las funciones de ese tramo '
        '(ver notas); no se han armonizado ni recalculado. Los valores son los del INE (dato base, tanto por mil en qx).',
        [('anio', 'Año de la tabla', None), ('edicion', '1975-1990 o 1991-2024 (tabla del INE de la que procede)', None),
         ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad x; el último valor de cada edición es el tramo abierto', 'años')]
        + [(c, d, u) for c, d, u in uni],
        n, fuente(27153, 'Tablas de mortalidad por año, sexo, edad y funciones (tablas 27153 y 27150)'),
        origenes([27150, 27153]), confidence='alta',
        notes='Ediciones: 1991-2024 de la tabla 27153 (modificada 19/11/2025) y 1975-1990 de la tabla 27150 (modificada 11/04/2018). '
              'Las dos son del INE «Tablas de Mortalidad»; la serie 1975-1990 es la edición histórica que publica el INE. '
              'La tabla 67233 es idéntica a la 27153.')
    # series de esperanza de vida al nacer y a los 65 años por sexo
    src = fuente(27153, 'Tablas de mortalidad por año, sexo, edad y funciones (tablas 27153 y 27150)')
    series = []
    for edad, nom in ((0, 'al nacer'), (65, 'a los 65 años')):
        for sx in ('ambos', 'hombres', 'mujeres'):
            pts = [{'period': str(a), 'value': cel[(a, sx, edad, 'ex')]} for a in range(1975, 2025)
                   if (a, sx, edad, 'ex') in cel]
            series.append({'id': f'esperanza-vida-{edad}-{sx}', 'title': f'Esperanza de vida {nom}, {sx}', 'unit': 'años',
                           'source': src, 'confidence': 'alta',
                           'notes': 'Función ex de la tabla de mortalidad del INE del año indicado (dato publicado, no derivado).',
                           'points': pts})
    escribe_series('demografia', 'esperanza-vida-anual', 'Esperanza de vida al nacer y a los 65 años por sexo (1975-2024)',
                   'Serie anual de la esperanza de vida (función ex de las tablas de mortalidad del INE) al nacer y a los 65 años, por sexo.', series)
    return cel


# ---------------------------------------------------------------- A3: fecundidad
def a3():
    NAC = {'Ambas nacionalidades': 'ambas', 'Española': 'espanola', 'Extranjera': 'extranjera'}
    rows = []
    for s in tabla(1406):
        m = meta(s)
        if m['Orden de nacimiento'] != 'Todos':
            continue
        ed = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            rows.append([x['Anyo'], NAC[m['Nacionalidad']], ed, valor_str(x['Valor'])])
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    n = escribe_csv('fecundidad-tasas-edad', ['anio', 'nacionalidad', 'edad_madre', 'tasa_por_mil'], rows)
    print('A3 filas', n)
    escribe_tabla('demografia', 'fecundidad-tasas-edad',
        'Tasas de fecundidad por edad de la madre (1975-2024)',
        'Nacimientos por 1.000 mujeres, por edad simple de la madre y nacionalidad (ambas, española, extranjera), todos los órdenes de '
        'nacimiento, 1975-2024. La edad 15 agrupa «15 y menos años» y la 49 agrupa «49 y más años», como en la fuente.',
        [('anio', 'Año', None), ('nacionalidad', 'ambas, espanola o extranjera (nacionalidad de la madre)', None),
         ('edad_madre', 'Edad de la madre; 15 = «15 y menos», 49 = «49 y más»', 'años'),
         ('tasa_por_mil', 'Tasa de fecundidad', 'nacimientos por 1.000 mujeres')],
        n, fuente(1406, 'Tasas de fecundidad según orden del nacimiento, nacionalidad y edad de la madre (tabla 1406)'),
        origenes([1406]), confidence='alta')
    series = []
    S = fuente(1407, 'Indicador Coyuntural de Fecundidad según orden del nacimiento y nacionalidad de la madre (tabla 1407)')
    for s in tabla(1407):
        m = meta(s)
        if m['Orden de nacimiento'] != 'Todos':
            continue
        series.append({'id': f'icf-{NAC[m["Nacionalidad"]]}', 'title': f'Indicador coyuntural de fecundidad, nacionalidad {NAC[m["Nacionalidad"]]} de la madre',
                       'unit': 'hijos por mujer', 'source': S, 'confidence': 'alta',
                       'points': puntos(s['Data'])})
    for tid, sid, tit, unit, tt in ((1409, 'tasa-global-fecundidad', 'Tasa global de fecundidad', 'nacimientos por 1.000 mujeres de 15 a 49 años', 'Tasa global de fecundidad según nacionalidad de la madre (tabla 1409)'),):
        for s in tabla(tid):
            m = meta(s)
            series.append({'id': f'{sid}-{NAC[m["Nacionalidad"]]}', 'title': f'{tit}, nacionalidad {NAC[m["Nacionalidad"]]} de la madre', 'unit': unit,
                           'source': fuente(tid, tt), 'confidence': 'alta',
                           'points': puntos(s['Data'])})
    s = tabla(1381)[0]
    series.append({'id': 'tasa-bruta-natalidad', 'title': 'Tasa bruta de natalidad', 'unit': 'nacidos por 1.000 habitantes',
                   'source': fuente(1381, 'Tasa bruta de natalidad (tabla 1381)'), 'confidence': 'alta',
                   'points': puntos(s['Data'])})
    escribe_series('demografia', 'fecundidad-indicadores', 'Indicador coyuntural de fecundidad, tasa global y tasa bruta de natalidad (1975-2024)',
                   'Indicadores de fecundidad del INE (Indicadores Demográficos Básicos / Movimiento Natural de la Población), total nacional.', series)


# ---------------------------------------------------------------- A4: migraciones
def a4():
    rows = []
    def lee(tid, flujo, fuente_serie):
        for s in tabla(tid):
            m = meta(s)
            if 'Totales de edad' in m:
                continue
            ed = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
            for x in s['Data']:
                rows.append([x['Anyo'], fuente_serie, flujo, SEXO[m['Sexo']], ed, valor_str(x['Valor'])])
    lee(24282, 'inmigracion', 'EM-2008-2021'); lee(24296, 'emigracion', 'EM-2008-2021'); lee(24304, 'saldo-exterior', 'EM-2008-2021')
    lee(69687, 'inmigracion', 'EMCR-2021-2024'); lee(69702, 'emigracion', 'EMCR-2021-2024')
    # saldo exterior derivado 2021-2024 (EMCR no lo publica por edad)
    idx = {(r[0], r[1], r[2], r[3], r[4]): float(r[5]) for r in rows}
    for (a, fs, fl, sx, ed), v in list(idx.items()):
        if fs == 'EMCR-2021-2024' and fl == 'inmigracion':
            rows.append([a, fs, 'saldo-exterior-derivado', sx, ed, valor_str(v - idx[(a, fs, 'emigracion', sx, ed)])])
    rows.sort(key=lambda r: (r[1], r[0], r[2], r[3], r[4]))
    n = escribe_csv('migraciones-exterior-edad-sexo', ['anio', 'serie', 'flujo', 'sexo', 'edad', 'personas'], rows)
    print('A4 filas', n)
    escribe_tabla('demografia', 'migraciones-exterior-edad-sexo',
        'Inmigración, emigración y saldo migratorio exterior por año, sexo y edad (2008-2024)',
        'Flujos migratorios con el extranjero por año, sexo y edad simple (0 a 89 y «90 y más», que figura como edad 90). '
        'Dos series del INE que NO son homogéneas y se solapan en 2021: «EM-2008-2021» (Estadística de Migraciones, flujo de '
        'inmigración y emigración, y saldo con el extranjero) y «EMCR-2021-2024» (Estadística de Migraciones y Cambios de Residencia, '
        'basada en la ECP). El saldo exterior de EMCR por edad se ha calculado como inmigración menos emigración '
        '(flujo «saldo-exterior-derivado», dato derivado).',
        [('anio', 'Año natural', None), ('serie', 'EM-2008-2021 o EMCR-2021-2024', None),
         ('flujo', 'inmigracion, emigracion, saldo-exterior o saldo-exterior-derivado', None),
         ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad simple; 90 = «90 y más»', 'años'),
         ('personas', 'Número de personas (flujo del año)', 'personas')],
        n, fuente(69687, 'Estadística de Migraciones y Cambios de Residencia (tablas 69687 y 69702) y Estadística de Migraciones (tablas 24282, 24296 y 24304)'),
        origenes([24282, 24296, 24304, 69687, 69702]), confidence='alta')
    # series anuales (totales por sexo)
    series = []
    for fs, ts in (('EM-2008-2021', 'Estadística de Migraciones (tablas 24282, 24296, 24304)'), ('EMCR-2021-2024', 'Estadística de Migraciones y Cambios de Residencia (tablas 69687, 69702, 69758)')):
        for fl in ('inmigracion', 'emigracion', 'saldo-exterior' if fs.startswith('EM-') else 'saldo-exterior-derivado'):
            for sx in ('ambos', 'hombres', 'mujeres'):
                tot = collections.defaultdict(float)
                for r in rows:
                    if r[1] == fs and r[2] == fl and r[3] == sx:
                        tot[r[0]] += float(r[5])
                if tot:
                    series.append({'id': f'{fl}-{sx}-{fs.lower()}', 'title': f'{fl.replace("-", " ").capitalize()} exterior, {sx}, serie {fs}', 'unit': 'personas',
                                   'source': fuente(24282 if fs.startswith('EM-') else 69687, ts), 'confidence': 'media',
                                   'notes': 'Suma de las edades simples de la tabla por edad (dato derivado). '
                                            + ('Serie homogénea 2008-2021.' if fs.startswith('EM-') else 'Serie basada en la ECP; no es homogénea con EM-2008-2021.'),
                                   'points': [{'period': str(a), 'value': round(v, 1)} for a, v in sorted(tot.items())]})
    # saldo exterior total publicado por EMCR (tabla 69758)
    pub = {}
    for s in tabla(69758):
        m = meta(s)
        if m['Nacionalidad'] == 'Total' and m['Saldo migratorio'] == 'Saldo exterior':
            pub[SEXO[m['Sexo']]] = {x['Anyo']: x['Valor'] for x in s['Data']}
    for sx, dd in pub.items():
        series.append({'id': f'saldo-exterior-{sx}-publicado-emcr', 'title': f'Saldo migratorio exterior publicado por EMCR, {sx}', 'unit': 'personas',
                       'source': fuente(69758, 'Estadística de Migraciones y Cambios de Residencia: saldos (tabla 69758)'), 'confidence': 'alta',
                       'points': [{'period': str(a), 'value': v} for a, v in sorted(dd.items())]})
    escribe_series('demografia', 'migraciones-exterior-anual', 'Inmigración, emigración y saldo migratorio exterior anuales (2008-2024)',
                   'Totales anuales por sexo de los flujos migratorios con el extranjero. Dos series del INE no homogéneas (2008-2021 y 2021-2024).', series)


# ---------------------------------------------------------------- A5: proyecciones
def a5():
    S = 'Proyecciones de Población 2026-2076 (INE)'
    rows = []
    for s in tabla(36643):
        m = meta(s)
        if 'Totales de edad' in m:
            continue
        ed = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            rows.append([x['Anyo'], SEXO[m['Sexo']], ed, repr(float(x['Valor']))])
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    n = escribe_csv('proyecciones-poblacion', ['anio', 'sexo', 'edad', 'poblacion'], rows)
    print('A5 pob filas', n)
    escribe_tabla('demografia', 'proyecciones-poblacion',
        'Proyecciones de población del INE 2026-2076: población a 1 de enero por edad simple y sexo (escenario principal)',
        'Población residente en España a 1 de enero proyectada por el INE (edición 2026-2076, publicada el 17/06/2026) por edad simple (0 a «100 y más», que figura como edad 100) y sexo, '
        'escenario principal («proyección a largo plazo»). El INE publica los resultados con decimales para garantizar la coherencia entre flujos y stocks. '
        'La población de partida es la cifra provisional de 1 de enero de 2026 de la ECP.',
        [('anio', 'Año (1 de enero)', None), ('sexo', 'ambos, hombres o mujeres', None),
         ('edad', 'Edad simple; 100 = «100 y más años»', 'años'), ('poblacion', 'Población proyectada', 'personas')],
        n, fuente(36643, 'Proyecciones de Población 2026-2076: población residente a 1 de enero por sexo, edad y año (tabla 36643)'),
        origenes([36643]), confidence='alta',
        notes='El INE actualiza cada dos años las proyecciones con un horizonte de 50 años; esta edición se basa en una encuesta a expertos de febrero de 2026. '
              'Los códigos Tempus de las tablas empiezan por PROY24 aunque contienen la edición 2026-2076 (el horizonte 2026-2076 y la metodología de junio de 2026 lo confirman).')
    # hipótesis: series
    series = []
    def ser(tid, sid, titulo, unidad, tt, nombre_ok=None, conf='alta', notes=None):
        for s in tabla(tid):
            m = meta(s)
            if nombre_ok and not nombre_ok(m):
                continue
            series.append({'id': sid(m), 'title': titulo(m), 'unit': unidad, 'source': fuente(tid, tt), 'confidence': conf,
                           **({'notes': notes} if notes else {}),
                           'points': puntos(s['Data'])})
    ser(36655, lambda m: 'icf-proyectado', lambda m: 'Indicador coyuntural de fecundidad proyectado (hipótesis)', 'hijos por mujer', 'Proyecciones de Población: indicador coyuntural de fecundidad por año (tabla 36655)')
    ser(36662, lambda m: 'saldo-migratorio-exterior-por-mil-proyectado', lambda m: 'Saldo de migración con el exterior proyectado (por mil habitantes)', 'por mil habitantes', 'Proyecciones de Población: saldo migratorio por mil habitantes (tabla 36662)')
    # flujos exteriores proyectados por sexo y lugar de nacimiento (todas las edades)
    ser(36777, lambda m: f'emigracion-proyectada-{SEXO[m["Sexo"]]}-{m["Lugar de nacimiento"].lower().replace("á","a").replace("ñ","n")}',
        lambda m: f'Emigración exterior proyectada, {SEXO[m["Sexo"]]}, lugar de nacimiento {m["Lugar de nacimiento"].lower()}', 'personas', 'Proyecciones de Población: flujos de emigración exterior (tabla 36777)')
    ser(36776, lambda m: f'inmigracion-proyectada-{SEXO[m["Sexo"]]}-{m["Lugar de nacimiento"].lower().replace("á","a").replace("ñ","n")}',
        lambda m: f'Inmigración exterior proyectada, {SEXO[m["Sexo"]]}, lugar de nacimiento {m["Lugar de nacimiento"].lower()}', 'personas', 'Proyecciones de Población: flujos de inmigración exterior (tabla 36776)',
        nombre_ok=lambda m: m['Generación/edades'] == 'Todas las edades')
    # esperanza de vida proyectada (función ex del INE)
    mort = collections.defaultdict(dict)
    rows = []
    for s in tabla(36659):
        m = meta(s)
        fn = {'Tasa de mortalidad': 'mx', 'Riesgo de muerte': 'qx_por_mil', 'Supervivientes': 'lx', 'Defunciones teóricas': 'dx',
              'Población estacionaria': 'pob_estacionaria', 'Tiempo por vivir': 'tiempo_por_vivir', 'Esperanza de vida': 'ex'}.get(m['Conceptos demógraficos'])
        if fn is None:
            continue
        ed = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            # El INE etiqueta mx y qx de esta tabla como «tanto por mil», pero los valores están en tanto por uno
            # (q0 = 0,0025 frente a 2,6 por mil en la tabla histórica; solo l(x+1) = lx(1 − qx) cuadra así): se pasan a por mil.
            mort[(x['Anyo'], SEXO[m['Sexo']], ed)][fn] = x['Valor'] * 1000 if fn in ('mx', 'qx_por_mil') else x['Valor']
    cols = ['mx', 'qx_por_mil', 'lx', 'dx', 'pob_estacionaria', 'tiempo_por_vivir', 'ex']
    rows = [[a, sx, ed] + [repr(float(v.get(c))) if v.get(c) is not None else '' for c in cols] for (a, sx, ed), v in sorted(mort.items())]
    n = escribe_csv('proyecciones-mortalidad', ['anio', 'sexo', 'edad'] + cols, rows)
    print('A5 mort filas', n)
    escribe_tabla('demografia', 'proyecciones-mortalidad',
        'Tablas de mortalidad proyectadas por el INE 2026-2075 por año, sexo y edad simple',
        'Funciones de la tabla de mortalidad proyectada (mx, qx, lx, dx, Lx, Tx, ex) por año, sexo y edad simple (0 a «100 y más», edad 100), escenario principal de la edición 2026-2076. '
        'Es la hipótesis de mortalidad de las proyecciones del INE. mx y qx se publican aquí en tanto por mil: el INE los etiqueta así pero los entrega en tanto por uno, y se han multiplicado por 1.000 (comprobado con l(x+1) = lx × (1 − qx)).',
        [('anio', 'Año', None), ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad x; 100 = «100 y más»', 'años'),
         ('mx', 'Tasa de mortalidad', 'por mil'), ('qx_por_mil', 'Riesgo de muerte', 'por mil'),
         ('lx', 'Supervivientes (raíz 100.000)', 'personas'), ('dx', 'Defunciones teóricas', 'personas'),
         ('pob_estacionaria', 'Población estacionaria Lx', 'personas-año'), ('tiempo_por_vivir', 'Tiempo por vivir Tx', 'personas-año'), ('ex', 'Esperanza de vida', 'años')],
        n, fuente(36659, 'Proyecciones de Población: tablas de mortalidad por sexo, edad, funciones y año (tabla 36659)'),
        origenes([36659, 36774, 36775]), confidence='alta')
    for edad, nom in ((0, 'al nacer'), (65, 'a los 65 años')):
        for sx in ('ambos', 'hombres', 'mujeres'):
            series.append({'id': f'esperanza-vida-{edad}-{sx}-proyectada', 'title': f'Esperanza de vida {nom} proyectada, {sx}', 'unit': 'años',
                           'source': fuente(36659, 'Proyecciones de Población: tablas de mortalidad proyectadas (tabla 36659)'), 'confidence': 'alta',
                           'points': [{'period': str(a), 'value': mort[(a, sx, edad)]['ex']} for a in range(2026, 2076)]})
    # fecundidad por edad (hipótesis)
    rows = []
    for s in tabla(36654):
        m = meta(s)
        ed = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            rows.append([x['Anyo'], ed, repr(float(x['Valor']))])
    rows.sort(key=lambda r: (r[0], r[1]))
    n = escribe_csv('proyecciones-fecundidad-edad', ['anio', 'edad_madre', 'tasa_por_mil'], rows)
    escribe_tabla('demografia', 'proyecciones-fecundidad-edad',
        'Tasas de fecundidad por edad de la madre proyectadas por el INE 2026-2075',
        'Hipótesis de fecundidad de las proyecciones del INE (edición 2026-2076): tasas por edad simple de la madre (15 = «15 y menos», 49 = «49 y más»), nacimientos por 1.000 mujeres, total nacional.',
        [('anio', 'Año', None), ('edad_madre', 'Edad de la madre', 'años'), ('tasa_por_mil', 'Tasa de fecundidad', 'nacimientos por 1.000 mujeres')],
        n, fuente(36654, 'Proyecciones de Población: tasas de fecundidad por edad de la madre y año (tabla 36654)'), origenes([36654]), confidence='alta')
    # inmigración proyectada por edad y sexo (total lugar de nacimiento)
    rows = []
    for s in tabla(36776):
        m = meta(s)
        if m['Lugar de nacimiento'] != 'Total' or m['Generación/edades'].startswith('Todas'):
            continue
        ed = edad_de(m['Generación/edades'])
        for x in s['Data']:
            rows.append([x['Anyo'], SEXO[m['Sexo']], ed, repr(float(x['Valor']))])
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    n = escribe_csv('proyecciones-inmigracion-edad', ['anio', 'sexo', 'edad', 'personas'], rows)
    escribe_tabla('demografia', 'proyecciones-inmigracion-edad',
        'Inmigración exterior proyectada por el INE 2026-2075 por año, sexo y edad',
        'Hipótesis de inmigración procedente del extranjero (edición 2026-2076) por edad simple (0 a «100 y más», edad 100) y sexo, todos los lugares de nacimiento. '
        'El INE publica la emigración solo por sexo y lugar de nacimiento (serie «emigracion-proyectada-*» de proyecciones-hipotesis).',
        [('anio', 'Año', None), ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad', 'años'), ('personas', 'Inmigración proyectada', 'personas')],
        n, fuente(36776, 'Proyecciones de Población: flujos de inmigración exterior por sexo, generación y lugar de nacimiento (tabla 36776)'), origenes([36776]), confidence='alta')
    # emigración proyectada por edad y sexo (resultados de la proyección, escenario principal)
    rows = []
    for s in tabla(36651):
        m = meta(s)
        if 'Totales de edad' in m:
            continue
        ed = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            rows.append([x['Anyo'], SEXO[m['Sexo']], ed, repr(float(x['Valor']))])
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    n = escribe_csv('proyecciones-emigracion-edad', ['anio', 'sexo', 'edad', 'personas'], rows)
    escribe_tabla('demografia', 'proyecciones-emigracion-edad',
        'Emigración exterior proyectada por el INE 2026-2075 por año, sexo y edad',
        'Emigraciones con destino al extranjero proyectadas (edición 2026-2076, escenario principal «proyección a largo plazo») por edad simple (0 a 89 y «90 y más», edad 90) y sexo. '
        'Con proyecciones-inmigracion-edad permite calcular el saldo migratorio exterior por edad (las edades de 90 y más y de 100 y más no coinciden: 90 frente a 100).',
        [('anio', 'Año', None), ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad; 90 = «90 y más»', 'años'), ('personas', 'Emigración proyectada', 'personas')],
        n, fuente(36651, 'Proyecciones de Población: emigraciones con destino al extranjero por sexo, edad y año (tabla 36651)'), origenes([36651]), confidence='alta',
        notes='Los códigos Tempus de la tabla indican la edición PROY24 y su fecha de modificación es de 2024, pero el horizonte (2026-2075) es el de la edición 2026-2076; ver proyecciones-poblacion.')
    # tasas de dependencia INE
    for tid, sid, tit in ((36668, 'tasa-dependencia', 'Tasa de dependencia'), (36669, 'tasa-dependencia-menores-16', 'Tasa de dependencia de la población menor de 16 años'),
                          (36670, 'tasa-dependencia-mayores-64', 'Tasa de dependencia de la población mayor de 64 años')):
        ser(tid, lambda m, sid=sid: f'{sid}-proyectada', lambda m, tit=tit: f'{tit} (proyección INE)', '%', f'Proyecciones de Población: {tit.lower()} por año (tabla {tid})')
    escribe_series('demografia', 'proyecciones-hipotesis', 'Hipótesis y resultados agregados de las proyecciones de población del INE 2026-2076',
                   'Indicador coyuntural de fecundidad, saldo migratorio, flujos de inmigración y emigración exteriores, esperanza de vida y tasas de dependencia proyectados por el INE (escenario principal, edición 2026-2076).', series)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    pob = a1(); a2(); a3(); a4(); a5()
