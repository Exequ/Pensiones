"""Bloque B de la Fase 1B-3: macro y salarios. Escribe data/macro/.

B1 PIB (Contabilidad Nacional anual del INE, xlsx de la Revisión Estadística 2024), B2 EPA (INE),
B3 salario medio con cuatro definiciones (EAES, ETCL, remuneración por asalariado de la CN y base media
de cotización de la TGSS) y razones con la base máxima de cotización. Ejecutar con `python3 -I`.
"""
import collections, csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_tabla, escribe_series
from ine import tabla, fuente, meta, _origen
import openpyxl

OUT = f'{REPO}/data/macro'
CNA = f'{REPO}/data-raw/ine/cna'
BC = f'{REPO}/data-raw/seg-social/BC/Tablas_Bases_Medias_y_Cotizantes_-_CNAE25.xlsx'
INE = 'Instituto Nacional de Estadística (INE)'
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
URL_CNA = 'https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177057&menu=resultados&idp=1254735576581'


def escribe_csv(id_, cab, rows):
    with open(f'{OUT}/{id_}.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(cab)
        w.writerows(rows)
    return len(rows)


def vs(v):
    if v is None or v == '':
        return ''
    v = float(v)
    return str(int(v)) if v == int(v) else repr(v)


def origenes_ine(ids):
    o = _origen()
    return [{'period': str(max(x['Anyo'] for s in tabla(i) for x in s['Data'])), 'url': o[str(i)]['web'], 'sha256': o[str(i)]['sha256']} for i in ids]


# ------------------------------------------------------------------ Contabilidad Nacional (xlsx)
def hoja_cn(fichero, hoja):
    wb = openpyxl.load_workbook(f'{CNA}/{fichero}.xlsx', data_only=True)
    return [list(r) for r in wb[hoja].iter_rows(values_only=True)]


def columnas_anio(fila):
    """{columna: (año, estado)} de una fila de cabecera con '1995', '2024 (P)', '2025 (A)'."""
    out = {}
    for i, x in enumerate(fila):
        m = re.match(r'^(\d{4})\s*(\((P|A)\))?$', str(x).strip()) if x is not None else None
        if m:
            out[i] = (int(m.group(1)), m.group(3) or '')
    return out


def fila_serie(filas, cab_fila, etiqueta, ocurrencia=0):
    cols = columnas_anio(filas[cab_fila])
    n = -1
    for r in filas[cab_fila + 1:]:
        lab = ' '.join(str(x).strip() for x in r[:4] if x not in (None, ''))
        if lab.upper().startswith(etiqueta.upper()):
            n += 1
            if n == ocurrencia:
                return {a: (r[i], est) for i, (a, est) in cols.items() if isinstance(r[i], (int, float))}
    raise SystemExit(f'No encuentro «{etiqueta}» ({ocurrencia}) en la hoja')


def cab_idx(filas):
    for i, r in enumerate(filas):
        if len(columnas_anio(r)) > 20:
            return i
    raise SystemExit('sin cabecera de años')


def puntos(d, redond=None):
    out = []
    for a, (v, est) in sorted(d.items()):
        p = {'period': str(a), 'value': round(v, redond) if redond is not None else v}
        if est:
            p['notes'] = 'Estimación provisional (P) según el INE' if est == 'P' else 'Estimación avance (A) según el INE'
        out.append(p)
    return out


def cn():
    S1 = {'title': 'Contabilidad Nacional Anual de España, Revisión Estadística 2024: PIB a precios de mercado y sus componentes', 'publisher': INE,
          'url': URL_CNA, 'docId': 'INE-CNA-pib95_25'}
    S2 = {'title': 'Contabilidad Nacional Anual de España, Revisión Estadística 2024: remuneración y empleo por ramas de actividad', 'publisher': INE,
          'url': URL_CNA, 'docId': 'INE-CNA-rem_empleo95_25'}
    t1 = hoja_cn('pib95_25', 'Tabla_1'); h1 = cab_idx(t1)
    t4 = hoja_cn('pib95_25', 'Tabla_4'); h4 = cab_idx(t4)
    pib = fila_serie(t1, h1, 'PRODUCTO INTERIOR BRUTO A PRECIOS DE MERCADO', 0)
    idx = fila_serie(t4, h4, 'PRODUCTO INTERIOR BRUTO A PRECIOS DE MERCADO', 0)
    pc = fila_serie(t1, h1, 'PIB per cápita (*)', 0)
    pob = fila_serie(t1, h1, 'Población total (miles', 0)
    base = pib[2020][0]
    vol = {a: (base * idx[a][0] / 100, idx[a][1]) for a in idx}
    defl = {a: (100 * pib[a][0] / vol[a][0], pib[a][1]) for a in pib if a in vol}
    nd = 'Dato derivado (no publicado por el INE): '
    ss = [
        {'id': 'pib-corriente', 'title': 'PIB a precios de mercado, precios corrientes', 'unit': 'millones de euros', 'source': S1, 'confidence': 'alta',
         'notes': 'Tabla 1, fila «PRODUCTO INTERIOR BRUTO A PRECIOS DE MERCADO» (demanda). Serie 1995-2025; 2024 provisional y 2025 avance.', 'points': puntos(pib)},
        {'id': 'pib-volumen-indice-2020', 'title': 'PIB a precios de mercado, índice de volumen encadenado (2020 = 100)', 'unit': 'índice 2020 = 100', 'source': S1, 'confidence': 'alta',
         'notes': 'Tabla 4, fila «PRODUCTO INTERIOR BRUTO A PRECIOS DE MERCADO». El INE publica el volumen como índice encadenado con referencia 2020.', 'points': puntos(idx, 6)},
        {'id': 'pib-volumen-derivado-2020', 'title': 'PIB en volumen, millones de euros de 2020 (derivado)', 'unit': 'millones de euros de 2020', 'source': S1, 'confidence': 'media',
         'notes': nd + 'PIB corriente de 2020 × índice de volumen / 100. Equivale al nivel en euros encadenados de referencia 2020.', 'points': puntos(vol, 1)},
        {'id': 'pib-deflactor-derivado-2020', 'title': 'Deflactor implícito del PIB, índice 2020 = 100 (derivado)', 'unit': 'índice 2020 = 100', 'source': S1, 'confidence': 'media',
         'notes': nd + '100 × PIB corriente / PIB en volumen (referencia 2020).', 'points': puntos(defl, 4)},
        {'id': 'pib-per-capita', 'title': 'PIB per cápita', 'unit': 'euros', 'source': S1, 'confidence': 'alta',
         'notes': 'Tabla 1, fila «PIB per cápita (*)»; (*) población media anual residente (ECP del INE).', 'points': puntos(pc)},
        {'id': 'poblacion-media-anual', 'title': 'Población media anual residente (denominador del PIB per cápita)', 'unit': 'miles de personas', 'source': S1, 'confidence': 'alta',
         'notes': 'Tabla 1, fila «Población total (miles de habitantes) (*)».', 'points': puntos(pob)},
    ]
    escribe_series('macro', 'pib-ine', 'PIB anual de España: precios corrientes, volumen y deflactor (INE, 1995-2025)',
                   'Contabilidad Nacional anual del INE (Revisión Estadística 2024, base 2020): PIB a precios corrientes, índice de volumen encadenado, y el volumen en euros de 2020 y el deflactor implícito derivados.', ss)
    # remuneración y empleo
    def total(hoja, bloque):
        f = hoja_cn('rem_empleo95_25', hoja)
        h = None
        # cabecera y fila TOTAL de cada bloque
        cab = [i for i, r in enumerate(f) if len(columnas_anio(r)) > 20]
        i0 = cab[bloque]
        return fila_serie(f, i0, 'TOTAL', 0)
    rem = total('Tabla_1', 0); rem_as = total('Tabla_1', 1)
    emp_puestos_tot = total('Tabla_2', 0); puestos_as = total('Tabla_2', 1)
    etc_tot = total('Tabla_3', 0); etc_as = total('Tabla_3', 1)
    pers_as = total('Tabla_5', 1)
    # Contraste interno: remuneración total de Tabla_1 (primer bloque) debe ser igual a la del PIB (rentas)
    rem_pib = fila_serie(t1, h1, 'Remuneración de los asalariados', 0)
    assert all(abs(rem[a][0] - rem_pib[a][0]) < 1.5 for a in rem if a in rem_pib), 'remuneración CN no coincide con la tabla de rentas'
    ss2 = []
    for sid, t, u, d, nota in (
        ('remuneracion-asalariados', 'Remuneración de los asalariados, total economía', 'millones de euros', rem, 'Tabla 1 (primer bloque, TOTAL). Coincide con la fila de rentas de la tabla 1 del PIB.'),
        ('asalariados-puestos', 'Empleo asalariado, puestos de trabajo (total economía)', 'miles de puestos', puestos_as, 'Tabla 2 (bloque «Empleo asalariado», TOTAL).'),
        ('asalariados-puestos-etc', 'Empleo asalariado, puestos de trabajo equivalentes a tiempo completo (total economía)', 'miles de puestos', etc_as, 'Tabla 3 (bloque «Empleo equivalente a tiempo completo asalariado», TOTAL).'),
        ('asalariados-personas', 'Personas asalariadas (total economía)', 'miles de personas', pers_as, 'Tabla 5 (bloque «Personas Asalariadas», TOTAL).'),
        ('empleo-puestos', 'Empleo total, puestos de trabajo (total economía)', 'miles de puestos', emp_puestos_tot, 'Tabla 2 (bloque «Empleo total», TOTAL).'),
    ):
        ss2.append({'id': sid, 'title': t, 'unit': u, 'source': S2, 'confidence': 'alta', 'notes': nota, 'points': puntos(d)})
    escribe_series('macro', 'cn-remuneracion-empleo', 'Remuneración de asalariados y empleo asalariado de la Contabilidad Nacional (INE, 1995-2025)',
                   'Remuneración de los asalariados y empleo (puestos, puestos equivalentes a tiempo completo y personas) del total de la economía, Contabilidad Nacional anual del INE (Revisión Estadística 2024).', ss2)
    return {'rem': rem, 'puestos': puestos_as, 'etc': etc_as, 'personas': pers_as}


# ------------------------------------------------------------------ EPA
SEXO = {'Ambos sexos': 'ambos', 'Hombres': 'hombres', 'Mujeres': 'mujeres'}


def epa():
    GR = {'Total': 'total'}
    rows = []
    for tid, mag, filtro in ((65080, 'activos', 'Valor absoluto'), (65109, 'ocupados', 'Valor absoluto'), (65218, 'parados', 'Valor absoluto'),
                             (65081, 'tasa-actividad', None), (65219, 'tasa-paro', None)):
        for s in tabla(tid):
            m = meta(s)
            if filtro and m.get('Tipo de dato') != filtro:
                continue
            g = m.get('Grupos de edad') or m.get('Semiintervalos de edad')
            gid = 'total' if g == 'Total' else re.sub(r'^De ', '', g).replace(' años', '').replace(' a ', '-').replace(' y más', '+')
            if g == '70 y más años':
                gid = '70+'
            for x in s['Data']:
                if x['Valor'] is None:
                    continue
                rows.append([f"{x['Anyo']}-{x['T3_Periodo']}", mag, SEXO[m['Sexo']], gid, x['Valor']])
    rows.sort(key=lambda r: (r[0], r[1], r[2], r[3]))
    cab = ['periodo', 'magnitud', 'sexo', 'grupo_edad', 'valor']
    rows_s = [[r[0], r[1], r[2], r[3], vs(r[4])] for r in rows]
    n = escribe_csv('epa-trimestral', cab, rows_s)
    print('EPA trimestral filas', n, rows[0][0], rows[-1][0])
    ids = [65080, 65109, 65218, 65081, 65219]
    escribe_tabla('macro', 'epa-trimestral',
        'Encuesta de Población Activa: activos, ocupados, parados y tasas por sexo y grupo de edad, trimestral (2002-T1 a 2026-T3)',
        'Activos, ocupados y parados (miles de personas) y tasas de actividad y de paro (%) por sexo y grupo de edad, total nacional, trimestral. '
        'Grupos: de 16 a 19 años, quinquenales hasta 65-69, 70+ y total (16 y más). Desde el primer trimestre de 2021 la EPA incorpora los cambios del Reglamento (UE) 2019/1700 '
        '(«Resumen de cambios EPA 2021» del INE): hay una ruptura metodológica en 2021-T1 cuyo efecto mide el INE en un documento aparte.',
        [('periodo', 'Trimestre (AAAA-Tn)', None), ('magnitud', 'activos, ocupados, parados (miles), tasa-actividad o tasa-paro (%)', None),
         ('sexo', 'ambos, hombres o mujeres', None), ('grupo_edad', 'Grupo de edad (16-19, 20-24, …, 65-69, 70+, total)', None),
         ('valor', 'Valor: miles de personas (activos, ocupados, parados) o porcentaje (tasas)', None)],
        n, fuente(65080, 'Encuesta de Población Activa: activos, ocupados, parados y tasas por sexo y grupo de edad (tablas 65080, 65109, 65218, 65081 y 65219)'),
        origenes_ine(ids), confidence='alta')
    # media anual (años con cuatro trimestres)
    acc = collections.defaultdict(list)
    for per, mag, sx, g, v in rows:
        acc[(per[:4], mag, sx, g)].append(v)
    anual = [[a, mag, sx, g, vs(round(sum(v) / 4, 4))] for (a, mag, sx, g), v in sorted(acc.items()) if len(v) == 4]
    n2 = escribe_csv('epa-anual-media', cab[:1] + cab[1:], [[a, mag, sx, g, v] for a, mag, sx, g, v in anual])
    # renombrar cabecera: periodo -> anio
    txt = open(f'{OUT}/epa-anual-media.csv', encoding='utf-8').read().replace('periodo,', 'anio,', 1)
    open(f'{OUT}/epa-anual-media.csv', 'w', encoding='utf-8').write(txt)
    escribe_tabla('macro', 'epa-anual-media',
        'EPA: media anual de los cuatro trimestres (2002-2025), dato derivado',
        'Media aritmética de los cuatro trimestres de cada año de las magnitudes de epa-trimestral (activos, ocupados, parados en miles; tasas en %). Solo años con los cuatro trimestres (2002-2025). '
        'Se elige la media anual y no el cuarto trimestre porque elimina la estacionalidad (agricultura, hostelería, campañas) y es el equivalente anual de las magnitudes de la Contabilidad Nacional; '
        'el cuarto trimestre se puede leer en epa-trimestral. Es un dato derivado: las tasas anuales son la media de las tasas trimestrales, no el cociente de las medias.',
        [('anio', 'Año', None), ('magnitud', 'activos, ocupados, parados (miles), tasa-actividad o tasa-paro (%)', None), ('sexo', 'ambos, hombres o mujeres', None),
         ('grupo_edad', 'Grupo de edad', None), ('valor', 'Media anual: miles de personas o porcentaje', None)],
        n2, fuente(65080, 'Encuesta de Población Activa (tablas 65080, 65109, 65218, 65081 y 65219), media anual calculada'), origenes_ine(ids), confidence='media')
    print('EPA anual filas', n2)
    return {(a, mag, sx, g): float(v) for a, mag, sx, g, v in anual}


# ------------------------------------------------------------------ salario medio
def eaes():
    rows = []
    for s in tabla(28189):
        m = meta(s)
        g = m.get('Grupos de edad') or m.get('Semiintervalos de edad') or 'Todas las edades'
        gid = {'Todas las edades': 'total', 'Menos de 20 años': '<20', '65 y más años': '65+'}.get(g) or re.sub(r'^De ', '', g).replace(' años', '').replace(' a ', '-')
        for x in s['Data']:
            if x['Valor'] is not None:
                rows.append([x['Anyo'], SEXO[m['Sexo']], gid, x['Valor']])
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    n = escribe_csv('eaes-salario-sexo-edad', ['anio', 'sexo', 'grupo_edad', 'salario_medio_bruto_anual'], [[a, s, g, vs(v)] for a, s, g, v in rows])
    escribe_tabla('macro', 'eaes-salario-sexo-edad',
        'Encuesta Anual de Estructura Salarial: salario medio bruto anual por trabajador, sexo y edad (2008-2024)',
        'Salario medio bruto anual (euros por trabajador) por sexo y grupo de edad, total nacional. Definición del INE: «ganancia bruta anual por asalariado» '
        '(percepciones salariales en dinero y en especie, devengos brutos antes de cotizaciones del trabajador e IRPF; sin atrasos de años anteriores ni percepciones no salariales). '
        'Cobertura: trabajadores por cuenta ajena en centros de cotización de industria, construcción y servicios, de alta en la Seguridad Social todo el mes de octubre del año de referencia; '
        'quedan excluidas agricultura, ganadería y pesca, parcialmente la Administración Pública y Defensa, el personal doméstico y los organismos extraterritoriales; '
        'se excluyen presidentes, consejeros y personal con remuneración principalmente en comisiones o beneficios.',
        [('anio', 'Año de referencia', None), ('sexo', 'ambos, hombres o mujeres', None), ('grupo_edad', 'total, <20, 20-24, …, 60-64, 65+', None),
         ('salario_medio_bruto_anual', 'Salario medio bruto anual por trabajador', 'euros/año')],
        n, fuente(28189, 'Encuesta Anual de Estructura Salarial: salario medio bruto por sexo y edad (tabla 28189)'), origenes_ine([28189]), confidence='alta',
        notes='La encuesta tiene antecedentes cuatrienales (1995, 2002, 2006) con otro ámbito (1995: centros de 10 o más trabajadores; 2006: se incorporan los de 1 a 9); '
              'esos años no están en la tabla anual utilizada y quedan en docs/PENDIENTE_DATOS.md.')
    return {(a, s, g): v for a, s, g, v in rows}


def etcl():
    rows = []
    JOR = {'Ambas jornadas': 'ambas', 'Jornada a tiempo completo': 'completa', 'Jornada a tiempo parcial': 'parcial'}
    COMP = {'Coste salarial total': 'total', 'Coste salarial ordinario': 'ordinario', 'Coste salarial pagos extraordinarios': 'extraordinarios', 'Coste salarial pagos atrasados': 'atrasados'}
    for s in tabla(6038):
        m = meta(s)
        if 'SECTORES ' in m or m.get('SECTORES') is not None and m.get('SECTORES') not in ('', None):
            pass
        sec = m.get('SECTORES') or m.get('SECTORES ')
        if sec:
            continue  # solo el total industria, construcción y servicios
        comp = COMP[next(v for k, v in m.items() if k.startswith('Componentes'))]
        for x in s['Data']:
            if x['Valor'] is not None:
                rows.append([f"{x['Anyo']}-{x['T3_Periodo']}", JOR[m['Tipo de jornada']], comp, x['Valor']])
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    n = escribe_csv('etcl-coste-salarial-trimestral', ['periodo', 'jornada', 'componente', 'euros_trabajador_mes'], [[p, j, c, vs(v)] for p, j, c, v in rows])
    print('ETCL filas', n, rows[0][0], rows[-1][0])
    escribe_tabla('macro', 'etcl-coste-salarial-trimestral',
        'Encuesta Trimestral de Coste Laboral: coste salarial por trabajador y mes, trimestral (2008-T1 a 2026-T2)',
        'Coste salarial medio por trabajador y mes (euros), total nacional, industria, construcción y servicios (secciones B a S), por tipo de jornada y componente '
        '(total, ordinario, pagos extraordinarios, pagos atrasados). Definición del INE: el coste salarial comprende todas las percepciones económicas a los trabajadores, en efectivo o en especie, '
        'por la prestación de servicios por cuenta ajena (salario base, complementos, horas extraordinarias, gratificaciones…), antes de cotizaciones; el total incluye el ordinario, los pagos extraordinarios y los atrasados. '
        'La unidad es euros por trabajador y mes: la media anual (siguiente tabla) es la de los cuatro trimestres y NO equivale a 12 mensualidades más extras sin más.',
        [('periodo', 'Trimestre (AAAA-Tn)', None), ('jornada', 'ambas, completa o parcial', None), ('componente', 'total, ordinario, extraordinarios o atrasados', None),
         ('euros_trabajador_mes', 'Coste salarial por trabajador', 'euros/mes')],
        n, fuente(6038, 'Encuesta Trimestral de Coste Laboral: coste salarial por trabajador, tipo de jornada y sectores (tabla 6038)'), origenes_ine([6038]), confidence='alta')
    acc = collections.defaultdict(list)
    for p, j, c, v in rows:
        acc[(p[:4], j, c)].append(v)
    anual = {(a, j, c): sum(v) / 4 for (a, j, c), v in acc.items() if len(v) == 4}
    return anual


def base_media():
    wb = openpyxl.load_workbook(BC, data_only=True, read_only=True)
    SX = {'MUJER': 'mujeres', 'VARON': 'hombres'}
    rows = []
    tot = collections.defaultdict(lambda: [0.0, 0.0])
    for r in list(wb['DATOS_EDAD'].iter_rows(values_only=True))[1:]:
        per, edad, gen, cot, base = r[:5]
        if per is None:
            continue
        a, mm = int(str(per)[:4]), int(str(per)[4:])
        sx = SX[gen.upper()]
        e = re.sub(r'^\d+\. ', '', edad).lower()
        rows.append([a, mm, sx, e, int(cot), round(base, 2), round(base / cot, 2)])
        for s in (sx, 'ambos'):
            tot[(a, mm, s)][0] += cot
            tot[(a, mm, s)][1] += base
    for (a, mm, s), (c, b) in tot.items():
        rows.append([a, mm, s, 'total', int(c), round(b, 2), round(b / c, 2)])
    rows.sort(key=lambda r: (r[0], r[1], r[2], r[3]))
    n = escribe_csv('base-media-cotizacion-rg-mensual', ['anio', 'mes', 'sexo', 'tramo_edad', 'cotizantes', 'base_total_eur', 'base_media_eur_mes'], rows)
    print('base media filas', n)
    fuente_bc = {'title': 'Estadística de Bases de Cotización al Régimen General: tablas de bases medias y cotizantes (hoja DATOS_EDAD)', 'publisher': SS,
                 'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/c9bd51e5-79bc-44f2-9618-14d6094eb585',
                 'docId': 'TGSS-bases-medias-RG'}
    import hashlib
    h = hashlib.sha256(open(BC, 'rb').read()).hexdigest()
    escribe_tabla('macro', 'base-media-cotizacion-rg-mensual',
        'Base media de cotización por contingencias comunes del Régimen General: cotizantes y base media por sexo y edad, mensual (2018-01 a 2026-06)',
        'Cotizantes (personas físicas con al menos un día cotizado en el mes) e importe total de sus bases de cotización por contingencias comunes, por sexo y tramo de edad, Régimen General (código 0111) '
        'excluidos el Sistema Especial de Trabajadores por Cuenta Ajena Agrarios, el de Empleados de Hogar y el Régimen Especial de Artistas. «base_media_eur_mes» = base total / cotizantes '
        '(definición literal de la fuente: «la base media se calcula dividiendo el importe total de las bases de cotización de contingencias comunes del periodo de liquidación entre el número de cotizantes (persona física)»). '
        'Las filas «total» (ambos sexos, hombres, mujeres) se han calculado sumando los tramos de edad (dato derivado). No incluye bases de períodos de alta no laboral (convenios especiales, desempleados con prestación). '
        'La base está topada por la base máxima y no incluye el efecto de los topes por contingencias profesionales; las percepciones de vencimiento superior al mes se prorratean en los doce meses.',
        [('anio', 'Año del período de liquidación', None), ('mes', 'Mes del período de liquidación', None), ('sexo', 'ambos, hombres o mujeres', None),
         ('tramo_edad', 'Tramo de edad de la fuente (en minúsculas) o «total»', None), ('cotizantes', 'Cotizantes (personas físicas)', 'personas'),
         ('base_total_eur', 'Suma de las bases de cotización por contingencias comunes', 'euros'), ('base_media_eur_mes', 'Base media de cotización', 'euros/mes')],
        n, fuente_bc, [{'period': '2026', 'url': fuente_bc['url'], 'sha256': h}], confidence='alta',
        notes='Los datos anteriores a 2018 no están en este fichero (ver docs/PENDIENTE_DATOS.md). El fichero es la versión «CNAE 25» de la fuente (desde enero de 2026), que recoge toda la serie por edad desde 2018-01.')
    # anual ponderada
    acc = collections.defaultdict(lambda: [0.0, 0.0, 0])
    for a, mm, sx, e, c, b, bm in rows:
        if e == 'total':
            x = acc[(a, sx)]
            x[0] += c; x[1] += b; x[2] += 1
    anual = {(a, sx): x[1] / x[0] for (a, sx), x in acc.items() if x[2] == 12}
    return anual


def main():
    os.makedirs(OUT, exist_ok=True)
    c = cn()
    ep = epa()
    ea = eaes()
    et = etcl()
    bm = base_media()
    # series anuales de las definiciones de salario medio
    S_EAES = fuente(28189, 'Encuesta Anual de Estructura Salarial: salario medio bruto por sexo y edad (tabla 28189)')
    S_ETCL = fuente(6038, 'Encuesta Trimestral de Coste Laboral: coste salarial por trabajador, tipo de jornada y sectores (tabla 6038)')
    S_CN = {'title': 'Contabilidad Nacional Anual de España, Revisión Estadística 2024: remuneración de asalariados y empleo', 'publisher': INE, 'url': URL_CNA, 'docId': 'INE-CNA-rem_empleo95_25'}
    S_BC = {'title': 'Estadística de Bases de Cotización al Régimen General: tablas de bases medias y cotizantes', 'publisher': SS,
            'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/c9bd51e5-79bc-44f2-9618-14d6094eb585', 'docId': 'TGSS-bases-medias-RG'}
    series, ratios = [], []
    bmax = {int(d['period']): d['value'] for d in json.load(open(f'{REPO}/data/parametros/base-maxima-rg.json'))['data']}
    def add(sid, title, unit, src, conf, notes, d, anual_eur=None, mensual=False):
        pts = [{'period': str(a), 'value': round(v, 2)} for a, v in sorted(d.items())]
        series.append({'id': sid, 'title': title, 'unit': unit, 'source': src, 'confidence': conf, 'notes': notes, 'points': pts})
        # razón con la base máxima: referencias homogéneas (anual / (12 × base máxima mensual) o mensual / base máxima mensual)
        rp = []
        for a, v in sorted(d.items()):
            if a in bmax:
                rp.append({'period': str(a), 'value': round(v / (bmax[a] * (1 if mensual else 12)), 4)})
        ratios.append({'id': 'razon-' + sid, 'title': 'Razón con la base máxima de cotización: ' + title, 'unit': 'razón (veces la base máxima)', 'source': src, 'confidence': 'media',
                       'notes': 'Dato derivado: ' + ('valor mensual' if mensual else 'valor anual') + ' de la definición ÷ ' + ('base máxima mensual del Régimen General del año (data/parametros/base-maxima-rg)' if mensual else '(12 × base máxima mensual del Régimen General del año)') + '.',
                       'points': rp})
    for sx in ('ambos', 'hombres', 'mujeres'):
        add(f'eaes-{sx}', f'EAES: salario medio bruto anual por trabajador, {sx}', 'euros/año', S_EAES, 'alta',
            'Ganancia bruta anual por asalariado, total de edades (tabla 28189). Años 2008-2024. Ver el literal y la cobertura en eaes-salario-sexo-edad.',
            {a: v for (a, s, g), v in ea.items() if s == sx and g == 'total'})
    add('etcl-coste-salarial-total', 'ETCL: coste salarial total por trabajador y mes, media de los cuatro trimestres, ambas jornadas', 'euros/mes', S_ETCL, 'media',
        'Dato derivado: media aritmética de los cuatro trimestres del coste salarial total por trabajador y mes (euros/mes, ambas jornadas, industria, construcción y servicios). 2008-2025.',
        {int(a): v for (a, j, cc), v in et.items() if j == 'ambas' and cc == 'total'}, mensual=True)
    add('etcl-coste-salarial-total-x12', 'ETCL: coste salarial total por trabajador y año (12 × la media mensual), ambas jornadas', 'euros/año', S_ETCL, 'media',
        'Dato derivado: 12 × la media anual del coste salarial total por trabajador y mes. Los pagos extraordinarios ya están en el total mensual del trimestre en que se pagan.',
        {int(a): 12 * v for (a, j, cc), v in et.items() if j == 'ambas' and cc == 'total'})
    rem, puestos, etc, pers = c['rem'], c['puestos'], c['etc'], c['personas']
    add('cn-remuneracion-por-asalariado-puesto', 'Contabilidad Nacional: remuneración de asalariados / asalariados (puestos de trabajo)', 'euros/año', S_CN, 'media',
        'Dato derivado: remuneración de los asalariados (millones de euros × 1.000.000) ÷ empleo asalariado en puestos de trabajo (miles × 1.000). Incluye cotizaciones sociales a cargo del empleador (la remuneración de asalariados de la Contabilidad Nacional comprende sueldos y salarios y cotizaciones sociales de los empleadores). 1995-2025.',
        {a: rem[a][0] * 1e6 / (puestos[a][0] * 1e3) for a in rem if a in puestos})
    add('cn-remuneracion-por-asalariado-etc', 'Contabilidad Nacional: remuneración de asalariados / asalariados (puestos equivalentes a tiempo completo)', 'euros/año', S_CN, 'media',
        'Dato derivado: remuneración de los asalariados ÷ empleo asalariado en puestos de trabajo equivalentes a tiempo completo. Incluye cotizaciones sociales de los empleadores. 1995-2025.',
        {a: rem[a][0] * 1e6 / (etc[a][0] * 1e3) for a in rem if a in etc})
    add('cn-remuneracion-por-asalariado-persona', 'Contabilidad Nacional: remuneración de asalariados / personas asalariadas', 'euros/año', S_CN, 'media',
        'Dato derivado: remuneración de los asalariados ÷ personas asalariadas. Incluye cotizaciones sociales de los empleadores. 1995-2025.',
        {a: rem[a][0] * 1e6 / (pers[a][0] * 1e3) for a in rem if a in pers})
    for sx in ('ambos', 'hombres', 'mujeres'):
        add(f'base-media-cotizacion-rg-{sx}', f'TGSS: base media de cotización por contingencias comunes del Régimen General, media anual ponderada, {sx}', 'euros/mes', S_BC, 'media',
            'Dato derivado: suma de las bases mensuales del año ÷ suma de los cotizantes mensuales (media ponderada por cotizantes de las doce bases medias mensuales). Solo años completos (2018-2025).',
            {a: v for (a, s), v in bm.items() if s == sx}, mensual=True)
    escribe_series('macro', 'salario-medio-definiciones',
        'Salario medio anual: cuatro definiciones, lado a lado (sin elegir ninguna)',
        'Salario medio según la Encuesta Anual de Estructura Salarial (INE), la Encuesta Trimestral de Coste Laboral (INE), la remuneración por asalariado de la Contabilidad Nacional (INE) '
        'y la base media de cotización al Régimen General (TGSS). Cada serie lleva en sus notas su concepto, cobertura y años; difieren en ámbito, concepto (salario bruto, coste salarial, '
        'remuneración con cotizaciones del empleador, base de cotización topada) y unidad, por lo que no son intercambiables ni se espera que coincidan.', series)
    escribe_series('macro', 'salario-medio-razon-base-maxima',
        'Razón de cada definición de salario medio con la base máxima de cotización (dato derivado)',
        'Cociente de cada serie de salario-medio-definiciones entre la base máxima de cotización del Régimen General del mismo año (mensual para las series mensuales; 12 veces la mensual para las anuales). '
        'Dato derivado calculado con data/parametros/base-maxima-rg; no equivale a la proporción de trabajadores topados.', ratios)


if __name__ == '__main__':
    main()
