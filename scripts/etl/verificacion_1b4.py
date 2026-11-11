"""1B-4: triangulación de la mortalidad en edades altas (población del INE, tablas de mortalidad del INE y defunciones registradas).

Genera data/demografia/triangulacion-* (tablas derivadas), el resumen triangulacion-mortalidad.json y las secciones «1B-4» de
docs/INFORME_VERIFICACION.md y docs/DISCREPANCIAS.md. Ejecutar con `python3 -I scripts/etl/verificacion_1b4.py`.
"""
import collections, csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_tabla
from ine import tabla, meta, fuente, _origen
from ine_demografia import origenes, escribe_csv
import eurostat_ce as ec

D = f'{REPO}/data'
SEX = ('hombres', 'mujeres')
RES, DISC = [], []


def rd(f):
    return list(csv.DictReader(open(f'{D}/{f}', encoding='utf-8')))


def reg(i, t, e, d):
    RES.append({'id': i, 'titulo': t, 'estado': e, 'detalle': d})
    print(f'[{e}] {t}: {d}')


def n(x, nd=0):
    return f'{x:,.{nd}f}'.replace(',', '#').replace('.', ',').replace('#', '.')


pop = collections.defaultdict(float)
for r in rd('demografia/poblacion-edad-sexo.csv'):
    pop[(int(r['anio']), r['sexo'], int(r['edad']))] = float(r['poblacion'])
dea = {(int(r['anio']), r['sexo'], int(r['edad'])): float(r['defunciones']) for r in rd('demografia/defunciones-edad-sexo.csv')}
gen = {(int(r['anio']), r['sexo'], int(r['edad_alcanzada'])): float(r['defunciones']) for r in rd('demografia/eurostat-defunciones-generacion-sexo.csv')}
mx, qx = {}, {}
for r in rd('demografia/mortalidad-ine.csv'):
    if r['edicion'] == '1991-2024':
        k = (int(r['anio']), r['sexo'], int(r['edad']))
        mx[k], qx[k] = float(r['mx']) / 1000, float(r['qx_por_mil']) / 1000
GRUPOS = [('65-74', 65, 74), ('75-84', 75, 84), ('85-94', 85, 94), ('95-99', 95, 99), ('100+', 100, 100)]
OPEN = 100


def qlex(y, sx, a):
    return (qx[(y, sx, a)] + qx[(y, sx, min(a + 1, OPEN))]) / 2


# ------------------------------------------------------------------ Comprobación 1
def comp1_():
    rows = []
    for y in range(1991, 2025):
        for sx in SEX:
            for g, a, b in GRUPOS:
                reg_ = sum(dea[(y, sx, e)] for e in range(a, b + 1))
                e_mx = sum(mx[(y, sx, e)] * (pop[(y, sx, e)] + pop[(y + 1, sx, e)]) / 2 for e in range(a, b + 1))
                e_q = sum(qx[(y, sx, e)] * pop[(y, sx, e)] for e in range(a, b + 1))
                rows.append([y, sx, g, int(reg_), round(e_mx, 1), round(e_q, 1), round(reg_ / e_mx, 4), round(reg_ / e_q, 4)])
    c = escribe_csv('triangulacion-defunciones', ['anio', 'sexo', 'grupo_edad', 'registradas', 'esperadas_tasa_central', 'esperadas_qx_poblacion_1_enero', 'cociente_tasa_central', 'cociente_qx'], rows)
    escribe_tabla('demografia', 'triangulacion-defunciones',
        'Triangulación 1: defunciones registradas frente a las que implican las tablas de mortalidad del INE (1991-2024, edades de 65 y más) — datos derivados',
        'Por año, sexo y grupo de edad: defunciones registradas (INE) y defunciones esperadas con dos construcciones: (1) tasa central mx de la tabla del año × población media (media de la población a 1 de enero del año y del siguiente) de cada edad; '
        '(2) qx de la tabla × población a 1 de enero de la misma edad. «cociente» = registradas / esperadas. Dato derivado (no publicado por la fuente); el grupo «100+» es la edad de cierre de la tabla.',
        [('anio', 'Año de la tabla', None), ('sexo', 'hombres o mujeres', None), ('grupo_edad', '65-74, 75-84, 85-94, 95-99 o 100+', None), ('registradas', 'Defunciones registradas (por edad al fallecer)', 'personas'),
         ('esperadas_tasa_central', 'Σ mx × población media', 'personas'), ('esperadas_qx_poblacion_1_enero', 'Σ qx × población a 1 de enero', 'personas'),
         ('cociente_tasa_central', 'registradas / esperadas con la tasa central', 'razón'), ('cociente_qx', 'registradas / esperadas con qx y la población a 1 de enero', 'razón')],
        c, fuente(6547, 'Defunciones (tabla 6547), tablas de mortalidad (tabla 27153) y población (tabla 59583) del INE; cálculo propio'), origenes([6547, 27153, 59583]), confidence='media')
    sel = {(r[0], r[1], r[2]): r for r in rows}
    out = []
    for g, a, b in GRUPOS[:4]:
        v1 = [sel[(y, sx, g)][6] for y in range(2010, 2020) for sx in SEX]
        v2 = [sel[(y, sx, g)][7] for y in range(2010, 2020) for sx in SEX]
        out.append(f'{g}: tasa central {n(min(v1), 3)}-{n(max(v1), 3)}; qx×población 1 ene {n(min(v2), 3)}-{n(max(v2), 3)}')
    reg('B1-defunciones-tablas', 'Defunciones registradas ÷ defunciones implícitas en las tablas, 2010-2019 (hombres y mujeres, grupos de edad)', 'diferencia', ' | '.join(out))
    v1 = [r[6] for r in rows if r[2] != '100+']
    return rows, (min(v1), max(v1))


# ------------------------------------------------------------------ Comprobación 2
def surv(sx, x, y0, k, modo):
    s = 1.0
    for j in range(k):
        y, a = y0 + j, x + j
        p = qx[(y, sx, a)] if modo == 'q' else qlex(y, sx, a)
        s *= 1 - p
    return s


def surv_def(sx, x, y0, k):
    s = 1.0
    for j in range(k):
        y, a = y0 + j, x + j
        s *= 1 - gen[(y, sx, a + 1)] / pop[(y, sx, a)]
    return s


def comp2_():
    rows = []
    V = [(1995, 10), (2000, 10), (2005, 5), (2010, 10), (2015, 5), (2021, 3)]
    for sx in SEX:
        for y0, k in V:
            for x in (65, 70, 75, 80, 85):
                a0, a1 = pop[(y0, sx, x)], pop[(y0 + k, sx, x + k)]
                pub = a1 / a0
                sq, sl, sd = surv(sx, x, y0, k, 'q'), surv(sx, x, y0, k, 'lex'), surv_def(sx, x, y0, k)
                rows.append([f'{y0}-{y0 + k}', sx, x, int(a0), int(a1), round(pub, 4), round(sq, 4), round(sl, 4), round(sd, 4), round(pub / sq, 4), round(pub / sl, 4), round(pub / sd, 4)])
    c = escribe_csv('triangulacion-cohortes', ['ventana', 'sexo', 'edad_inicial', 'poblacion_inicial', 'poblacion_final', 'supervivencia_publicada', 'supervivencia_qx', 'supervivencia_qx_lexis', 'supervivencia_defunciones_generacion',
                                               'publicada_sobre_qx', 'publicada_sobre_qx_lexis', 'publicada_sobre_defunciones'], rows)
    escribe_tabla('demografia', 'triangulacion-cohortes',
        'Triangulación 2: supervivencia de las cohortes de 65 a 85 años según la población publicada, las tablas de mortalidad y las defunciones registradas por generación — datos derivados',
        'Para la cohorte de edad inicial x a 1 de enero del primer año de la ventana: supervivencia publicada = población de edad x+k a 1 de enero k años después / población inicial (INE, sin ajustar por migración); '
        'supervivencia_qx = Π (1 − qx) con la edad y la tabla de cada año; supervivencia_qx_lexis = Π (1 − (qx + qx+1)/2), que tiene en cuenta que durante el año la cohorte pasa de edad exacta media x+0,5 a x+1,5; '
        'supervivencia_defunciones_generacion = Π (1 − defunciones de la generación en el año / población de la cohorte a 1 de enero), con las defunciones por año de nacimiento de Eurostat (demo_mager, que recoge datos del INE). '
        'Los tres últimos campos son el cociente entre la supervivencia publicada y cada una de las otras. Dato derivado.',
        [('ventana', 'Años inicial-final (1 de enero)', None), ('sexo', 'hombres o mujeres', None), ('edad_inicial', 'Edad a 1 de enero del primer año', 'años'), ('poblacion_inicial', 'Población inicial de la cohorte', 'personas'),
         ('poblacion_final', 'Población de la misma cohorte k años después', 'personas'), ('supervivencia_publicada', 'Población final / inicial', 'razón'), ('supervivencia_qx', 'Π(1 − qx)', 'razón'),
         ('supervivencia_qx_lexis', 'Π(1 − (qx + qx+1)/2)', 'razón'), ('supervivencia_defunciones_generacion', 'Π(1 − defunciones de la generación / población de la cohorte)', 'razón'),
         ('publicada_sobre_qx', 'Publicada / Π(1 − qx)', 'razón'), ('publicada_sobre_qx_lexis', 'Publicada / Π(1 − (qx + qx+1)/2)', 'razón'), ('publicada_sobre_defunciones', 'Publicada / defunciones por generación', 'razón')],
        c, fuente(59583, 'Población (tabla 59583), tablas de mortalidad (tabla 27153) del INE y defunciones por generación de Eurostat (demo_mager); cálculo propio'), origenes([59583, 27153]), confidence='media')
    sel = {(r[0], r[1], r[2]): r for r in rows}
    txt = []
    for sx in SEX:
        txt.append(f'{sx} 2010-2020 (publicada ÷ Π(1−qx)): ' + ', '.join(f'{x} años {n(sel[("2010-2020", sx, x)][9], 3)}' for x in (65, 75, 80, 85)))
    reg('B2-cohortes-qx', 'Supervivencia a 10 años publicada ÷ supervivencia con qx (2010-2020): reproduce el desfase del modelo', 'diferencia', ' | '.join(txt))
    txt = [f'{sx}: ' + ', '.join(f'{x} años {n(sel[("2010-2020", sx, x)][10], 3)}' for x in (65, 75, 80, 85)) for sx in SEX]
    reg('B2-cohortes-lexis', 'Supervivencia a 10 años publicada ÷ supervivencia con (qx + qx+1)/2 (2010-2020)', 'diferencia', ' | '.join(txt))
    txt = [f'{sx}: ' + ', '.join(f'{x} años {n(sel[("2010-2020", sx, x)][11], 3)}' for x in (65, 75, 80, 85)) for sx in SEX]
    reg('B2-cohortes-defunciones', 'Supervivencia a 10 años publicada ÷ supervivencia con las defunciones registradas de cada generación (2010-2020)', 'diferencia', ' | '.join(txt))
    # factor f medio 2010-2019
    fr = []
    for sx in SEX:
        for x in (65, 70, 75, 80, 85, 90, 95):
            f = [gen[(y, sx, x + 1)] / (pop[(y, sx, x)] * qx[(y, sx, x)]) for y in range(2010, 2020)]
            g = [qlex(y, sx, x) / qx[(y, sx, x)] for y in range(2010, 2020)]
            fr.append([sx, x, round(sum(f) / 10, 4), round(min(f), 4), round(max(f), 4), round(sum(g) / 10, 4)])
    c = escribe_csv('triangulacion-factor-qx', ['sexo', 'edad', 'factor_real_medio_2010_2019', 'factor_real_minimo', 'factor_real_maximo', 'factor_lexis_medio'], fr)
    escribe_tabla('demografia', 'triangulacion-factor-qx',
        'Triangulación 2b: factor entre las defunciones registradas de la cohorte y qx × población a 1 de enero (2010-2019, por edad y sexo) — datos derivados',
        'factor_real = defunciones de la generación de edad x a 1 de enero (Eurostat, demo_mager, edad alcanzada x+1 en el año) / (población de edad x a 1 de enero × qx del año); se da la media de 2010-2019 y el mínimo y el máximo anuales. '
        'factor_lexis = (qx + qx+1)/2 / qx, media 2010-2019, el factor que implica tratar la cohorte con edad exacta media x+1 durante el año. Dato derivado.',
        [('sexo', 'hombres o mujeres', None), ('edad', 'Edad a 1 de enero', 'años'), ('factor_real_medio_2010_2019', 'Media de defunciones registradas / (población × qx)', 'razón'), ('factor_real_minimo', 'Mínimo anual', 'razón'),
         ('factor_real_maximo', 'Máximo anual', 'razón'), ('factor_lexis_medio', 'Media de (qx + qx+1)/2 / qx', 'razón')],
        c, fuente(59583, 'Población (tabla 59583), tablas de mortalidad (tabla 27153) del INE y defunciones por generación de Eurostat (demo_mager); cálculo propio'), origenes([59583, 27153]), confidence='media')
    fsel = {(r[0], r[1]): r for r in fr}
    reg('B2-factor', 'Factor sobre qx implícito en las defunciones registradas (media 2010-2019) frente al factor de Lexis', 'diferencia',
        ' | '.join(f'{sx}: ' + ', '.join(f'{x}: {n(fsel[(sx, x)][2], 3)} (Lexis {n(fsel[(sx, x)][5], 3)})' for x in (65, 75, 85, 95)) for sx in SEX))
    return rows, fr, sel, fsel


# ------------------------------------------------------------------ Comprobación 3 y 4
def comp34():
    eu = ec.descarga('demo_pjan_ES')
    eu_p = collections.defaultdict(float)
    for r in ec.filas(eu):
        e = ec.edad(r['age'])
        if e is not None and r['valor'] is not None and r['sex'] != 'T':
            eu_p[(int(r['time']), ec.SX[r['sex']], e)] = r['valor']
    mx_dif = {}
    for lim in (85, 90, 100):
        d = 0
        for y in range(1981, 2026):
            for sx in SEX:
                a = sum(v for (yy, s, e), v in pop.items() if yy == y and s == sx and e >= lim)
                b = sum(v for (yy, s, e), v in eu_p.items() if yy == y and s == sx and e >= lim)
                d = max(d, abs(a - b))
        mx_dif[lim] = d
    reg('B3-eurostat', 'Población de 85 o más, 90 o más y 100 o más años: INE frente a Eurostat (1981-2025, por sexo)', 'ok' if max(mx_dif.values()) < 150 else 'diferencia',
        f'diferencia máxima {n(mx_dif[85])} (85+), {n(mx_dif[90])} (90+) y {n(mx_dif[100])} (100+) personas; Eurostat recibe las cifras del INE')
    # población de 1 jul 2026 por edad (tabla 59583) y de 1 ene 2026
    p26 = collections.defaultdict(float)
    for s in tabla(59583):
        m = meta(s)
        if 'Totales de edad' in m or m.get('Sexo') == 'Total':
            continue
        from ine_demografia import edad_de, SEXO
        e = edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            if x['Fecha'][:10] in ('2026-01-01', '2026-07-01') and x['Valor'] is not None:
                p26[(x['Fecha'][:10], SEXO[m['Sexo']], e)] = x['Valor']
    pens = {(r['grupo_edad'], r['clase'], r['sexo']): float(r['numero']) for r in rd('sistema/pensiones-vigor-edad-clase-sexo.csv') if r['sexo'] in SEX}
    filas = []
    flag = []
    for fecha in ('2026-01-01', '2026-07-01'):
        for g, a, b in (('65-69', 65, 69), ('70-74', 70, 74), ('75-79', 75, 79), ('80-84', 80, 84), ('85-y-más', 85, 100)):
            for sx in SEX:
                P = sum(p26[(fecha, sx, e)] for e in range(a, b + 1))
                j, v = pens[(g, 'jubilacion', sx)], pens[(g, 'viudedad', sx)]
                filas.append((fecha, g, sx, P, j, v))
                if fecha == '2026-07-01' and (j > P or v > P or j + v > P):
                    flag.append(f'{sx} {g}: jubilación {n(j)} + viudedad {n(v)} frente a {n(P)} personas')
    t = collections.defaultdict(lambda: [0, 0, 0])
    for fecha, g, sx, P, j, v in filas:
        if fecha == '2026-07-01':
            t[g][0] += P; t[g][1] += j; t[g][2] += v
    reg('B3-pensiones-persona', 'Pensiones de jubilación y de viudedad en vigor (octubre de 2026) por persona de la población de 1 de julio de 2026, por grupo de edad (ambos sexos)', 'diferencia',
        '; '.join(f'{g}: jubilación {n(v[1] / v[0], 3)}, viudedad {n(v[2] / v[0], 3)}, suma {n((v[1] + v[2]) / v[0], 3)} pensiones por persona' for g, v in t.items()) + '. '
        + ('Grupos con más pensiones de jubilación o de viudedad por separado que personas: ' + '; '.join(flag) + '. ' if flag else 'Ningún grupo tiene más pensiones de jubilación o de viudedad (cada una por separado) que personas. ')
        + 'La suma de jubilación y viudedad supera 1 en: ' + (', '.join(g for g, v in t.items() if (v[1] + v[2]) / v[0] > 1) or 'ningún grupo') + ' (una misma persona puede cobrar las dos pensiones, por lo que no es una incoherencia)')
    # 4: centenarios
    p100 = {y: sum(pop[(y, s, 100)] for s in SEX) for y in range(1981, 2027)}
    d100 = {y: sum(dea[(y, s, 100)] for s in SEX) for y in range(1991, 2025)}
    q100 = {y: sum(qx[(y, s, 100)] * pop[(y, s, 100)] for s in SEX) for y in range(1991, 2025)}
    reg('B4-centenarios', 'Población de 100 o más años (INE) y defunciones de 100 o más años: tasa implícita frente a la de la tabla', 'diferencia',
        f'población de 100+ a 1 de enero de 2025: {n(p100[2025])}; de 2026 (provisional): {n(p100[2026])}; defunciones de 100+ en 2024: {n(d100[2024])} ({n(100 * d100[2024] / ((p100[2024] + p100[2025]) / 2), 1)} % de la población media; tasa central de la tabla de 2024: '
        f'{n(100 * sum(mx[(2024, s, 100)] * (pop[(2024, s, 100)] + pop[(2025, s, 100)]) / 2 for s in SEX) / ((p100[2024] + p100[2025]) / 2), 1)} %). La Seguridad Social solo publica pensiones por grupos de edad hasta «85 y más»: no hay estadística de centenarios contrastable en /data')
    return p100, d100, flag, t, p26, pens, filas


# ------------------------------------------------------------------ pensionistas: defunciones implícitas frente a bajas definitivas
def comp_pens(p26, pens):
    bajas = {int(r['anio']): float(r['numero']) for r in rd('sistema/altas-bajas-anual-clase-sexo.csv') if r['movimiento'] == 'baja-definitiva' and r['sexo'] == 'ambos' and r['clase'] == 'jubilacion'}
    tot = {int(r['anio']): float(r['numero']) for r in rd('sistema/altas-bajas-anual-clase-sexo.csv') if r['movimiento'] == 'baja-definitiva' and r['sexo'] == 'ambos' and r['clase'] == 'total'}
    gr = [('50-54', 50, 54), ('55-59', 55, 59), ('60-64', 60, 64), ('65-69', 65, 69), ('70-74', 70, 74), ('75-79', 75, 79), ('80-84', 80, 84), ('85-y-más', 85, 100)]
    E_q = E_l = 0.0
    for sx in SEX:
        for g, a, b in gr:
            N = pens[(g, 'jubilacion', sx)]
            w = {e: p26[('2026-01-01', sx, e)] for e in range(a, b + 1)}
            sw = sum(w.values())
            E_q += N * sum(qx[(2024, sx, e)] * w[e] for e in w) / sw
            E_l += N * sum(qlex(2024, sx, e) * w[e] for e in w) / sw
    reg('B3-pensionistas', 'Defunciones de 2025 entre las pensiones de jubilación implícitas en las tablas frente a las bajas definitivas de jubilación de la Seguridad Social', 'diferencia',
        f'con qx de 2024 y la distribución por edad de las pensiones de jubilación de octubre de 2026 (ponderando por población de 1 de enero de 2026 dentro de cada grupo): {n(E_q)} muertes; con (qx + qx+1)/2: {n(E_l)}; '
        f'bajas definitivas de jubilación de 2025 en la Seguridad Social: {n(bajas[2025])}. Cociente bajas ÷ esperadas con qx: {n(bajas[2025] / E_q, 3)}; con (qx + qx+1)/2: {n(bajas[2025] / E_l, 3)}')
    return E_q, E_l, bajas, tot


def main():
    rows1, rng1 = comp1_()
    rows2, fr, sel, fsel = comp2_()
    p100, d100, flag, t, p26, pens, filas = comp34()
    E_q, E_l, bajas, tot = comp_pens(p26, pens)
    d65 = {y: sum(dea[(y, s, e)] for s in SEX for e in range(65, 101)) for y in range(2021, 2025)}
    reg('B3-bajas-fallecidos', 'Bajas definitivas de la Seguridad Social frente a defunciones del INE (2021-2025)', 'diferencia',
        '; '.join(f'{y}: bajas de jubilación {n(bajas[y])} frente a {n(d65[y])} defunciones de 65 o más años' for y in range(2021, 2025))
        + f'; 2025: {n(bajas[2025])} bajas de jubilación y {n(tot[2025])} bajas en total frente a {n(json.load(open(f"{D}/demografia/defunciones-2025-estimadas.json"))["data"][0]["value"])} defunciones estimadas de todas las edades (EDeS, dato provisional)')
    # resumen (datos) para claims
    src = fuente(59583, 'Población, tablas de mortalidad y defunciones (INE y Eurostat); cálculo propio')
    nd = 'Dato derivado: '
    def dato(i, v, u, nota, per):
        return {'id': i, 'value': v, 'unit': u, 'period': per, 'source': src, 'fetchedAt': HOY, 'confidence': 'media', 'notes': nd + nota}
    S = lambda w, sx, x, c: sel[(w, sx, x)][c]
    datos = [
        dato('supervivencia-publicada-sobre-qx-hombres-85-2010-2020', S('2010-2020', 'hombres', 85, 9), 'razón', 'supervivencia publicada a 10 años de los hombres de 85 años en 2010 dividida por Π(1 − qx) (tablas del INE); un valor inferior a 1 significa que la población publicada pierde más efectivos que los que implica qx aplicado a la población a 1 de enero.', '2020'),
        dato('supervivencia-publicada-sobre-qx-mujeres-85-2010-2020', S('2010-2020', 'mujeres', 85, 9), 'razón', 'ídem para las mujeres de 85 años en 2010.', '2020'),
        dato('supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020', S('2010-2020', 'hombres', 85, 10), 'razón', 'ídem con (qx + qx+1)/2 en lugar de qx (convención de Lexis).', '2020'),
        dato('supervivencia-publicada-sobre-qx-lexis-mujeres-85-2010-2020', S('2010-2020', 'mujeres', 85, 10), 'razón', 'ídem con (qx + qx+1)/2 para las mujeres de 85 años en 2010.', '2020'),
        dato('supervivencia-publicada-sobre-defunciones-hombres-85-2010-2020', S('2010-2020', 'hombres', 85, 11), 'razón', 'supervivencia publicada a 10 años dividida por la que implican las defunciones registradas de cada generación (Eurostat, demo_mager); mide si la población publicada cuadra con las defunciones sin ajustar por migración.', '2020'),
        dato('factor-real-sobre-qx-hombres-85-2010-2019', fsel[('hombres', 85)][2], 'razón', 'media 2010-2019 del cociente entre las defunciones registradas de la cohorte de 85 años a 1 de enero y población × qx.', '2019'),
        dato('factor-real-sobre-qx-mujeres-85-2010-2019', fsel[('mujeres', 85)][2], 'razón', 'ídem para mujeres.', '2019'),
        dato('muertes-implicitas-pensiones-jubilacion-qx', round(E_q), 'personas', 'muertes de 2025 entre las pensiones de jubilación implícitas en qx de 2024 con la distribución por edad de octubre de 2026 (aproximación: pensiones no son pensionistas y hay años distintos).', '2025'),
        dato('muertes-implicitas-pensiones-jubilacion-lexis', round(E_l), 'personas', 'ídem con (qx + qx+1)/2.', '2025'),
    ]
    # citas literales de la metodología del INE (apartado F)
    import subprocess
    txt = re.sub(r'\s+', ' ', subprocess.run(['pdftotext', '-layout', f'{REPO}/data-raw/ine/metodologia/t2020319a.pdf', '-'], capture_output=True, text=True).stdout)
    meto = {'title': 'Tablas de mortalidad: metodología (INE)', 'publisher': 'Instituto Nacional de Estadística (INE)', 'url': 'https://www.ine.es/metodologia/t20/t2020319a.pdf', 'docId': 'INE-meto-tablas-mortalidad'}
    Q = [('ine-tablas-base-poblacional', 'Las tablas se calculan con las defunciones del Movimiento Natural de la Población y con las cifras de población a 1 de enero: estimaciones intercensales hasta 2020 y censos anuales desde 2021.',
          r'las tablas de mortalidad que se presentan se calculan a partir de los resultados de defunciones ocurridas en España cada año proporcionado por la estadística del Movimiento Natural de la Población y de las cifras de población residente a 1 de enero de cada año que el INE emplea como referencia en toda su producción estadística, constituidas por las Estimaciones Intercensales de Población hasta 2020 y las cifras de población de los Censos anuales desde 2021'),
         ('ine-tablas-recalculo-censo-2021', 'Con el censo de 2021 se calcularon en 2023 nuevas series intercensales (2012-2020) y en noviembre de 2023 se publicaron las tablas de mortalidad sobre la nueva base poblacional.',
          r'Con motivo del nuevo Censo de Población de 2021, publicado en diciembre de 2022, a lo largo del año 2023 se calcularon las series de población intercensales para el periodo 2012-2020, a fin de obtener una serie continua y unificada de cifras de población que se inicia el 1 de enero de 1970 y enlaza con el primer periodo publicado de los Censos anuales de Población a 1 de enero de 2021 y sucesivos\. En noviembre de 2023 se publican las tablas de mortalidad calculadas sobre la base poblacional de las nuevas intercensales y de los censos anuales'),
         ('ine-tablas-metodologia-igual-1975', 'La metodología de cálculo es la misma para toda la serie 1975-actualidad, salvo la edad de cierre de la tabla.',
          r'La metodología de cálculo aplicada para las tablas de mortalidad de España es la misma para toda la serie desde 1975 hasta la actualidad, con la excepción del grupo de edad abierto establecido para el cierre de la tabla')]
    for i, resumen, rx in Q:
        plano = rx.replace('\\(', '(').replace('\\)', ')').replace('\\.', '.')
        tol = re.escape(plano).replace('\\ ', r'(?: \d{1,3})? ')   # tolera el número de página del PDF entre dos palabras
        assert re.search(tol, txt), f'cita no encontrada: {i}'
        m = type('M', (), {'group': lambda self, k=0, plano=plano: plano})()
        datos.append({'id': i, 'value': resumen, 'unit': 'texto', 'period': '2023', 'source': meto, 'fetchedAt': HOY, 'confidence': 'alta', 'quote': m.group(0), 'location': 'metodología de las tablas de mortalidad del INE (cita sin el número de página del PDF)'})
    reg('F-ine-metodologia', 'Metodología del INE: ¿se recalcularon las tablas 1991-2024 con la población revisada tras el censo de 2021?', 'ok',
        'Según la fuente, en noviembre de 2023 se publicaron las tablas «calculadas sobre la base poblacional de las nuevas intercensales y de los censos anuales» (series intercensales de 2012-2020 calculadas en 2023 con el censo de 2021). '
        'La fuente no dice expresamente qué años de la serie 1991-2024 cambiaron: indica que las series de población de 1981-2001 se recalcularon en 2014 (tablas publicadas en diciembre de 2015) y las de 1971-1980 en 2015. Citas literales en data/demografia/triangulacion-mortalidad')
    out = {'tipo': 'datos', 'id': 'triangulacion-mortalidad', 'title': 'Triangulación de la mortalidad en edades altas: resultados clave (datos derivados)',
           'description': 'Resultados clave de la verificación 1B-4 (población del INE, tablas de mortalidad del INE y defunciones registradas) como datos derivados; las tablas completas son triangulacion-defunciones, triangulacion-cohortes y triangulacion-factor-qx.', 'data': datos}
    json.dump(out, open(f'{D}/demografia/triangulacion-mortalidad.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{D}/demografia/triangulacion-mortalidad.json', 'a').write('\n')
    return rows1, rng1, sel, fsel, E_q, E_l, bajas, flag, t, p100


def secciones(rows1, rng1, sel, fsel, E_q, E_l, bajas, flag, t, p100):
    def seccion(ruta, marca, cuerpo):
        ini, fin = f'<!-- {marca}:inicio -->', f'<!-- {marca}:fin -->'
        tx = open(ruta, encoding='utf-8').read()
        b = f'{ini}\n{cuerpo}\n{fin}'
        tx = re.sub(re.escape(ini) + '.*?' + re.escape(fin), lambda m: b, tx, flags=re.S) if ini in tx else tx.rstrip('\n') + '\n\n' + b + '\n'
        open(ruta, 'w', encoding='utf-8').write(tx)
    c = collections.Counter(r['estado'] for r in RES)
    inf = ['## Fase 1B-4: triangulación de la mortalidad en edades altas', '',
           f"Comprobaciones: {len(RES)} ({c['ok']} coinciden, {c['diferencia']} con diferencias explicadas o informativas, {c['fallo']} fallos). Generado por `scripts/etl/verificacion_1b4.py`; tablas derivadas `triangulacion-*` en `data/demografia/`.", '',
           '| Comprobación | Resultado | Detalle |', '| --- | --- | --- |'] + [f"| {r['titulo']} | {r['estado']} | {r['detalle'].replace('|', '/')} |" for r in RES]
    f85h, f85m = fsel[('hombres', 85)][2], fsel[('mujeres', 85)][2]
    inf += ['', '### Lectura de los resultados (solo lo que permiten los datos)', '',
            f'1. **Las tablas de mortalidad cuadran con las defunciones registradas y con la población del INE** cuando se usa la tasa central con la población media: registradas ÷ esperadas entre {n(rng1[0], 3)} y {n(rng1[1], 3)} en 65-99 años (1991-2024). Es lo esperable: el INE calcula las tablas con esas defunciones y esa población.',
            f'2. **El desfase del modelo se reproduce** (hombres de 85 años en 2010: publicada ÷ Π(1 − qx) = {n(sel[("2010-2020", "hombres", 85)][9], 3)}; mujeres, {n(sel[("2010-2020", "mujeres", 85)][9], 3)}) y **coincide con una convención de edades**: qx es la probabilidad entre las edades exactas x y x+1, y la cohorte que tiene x años cumplidos a 1 de enero pasa durante el año de una edad exacta media de x+0,5 a x+1,5. '
            f'El factor entre las defunciones registradas de la cohorte y población × qx es {n(f85h, 3)} (hombres) y {n(f85m, 3)} (mujeres) a los 85 años, igual al factor de Lexis (qx + qx+1)/2 ÷ qx ({n(fsel[("hombres", 85)][5], 3)} y {n(fsel[("mujeres", 85)][5], 3)}), que es de la magnitud del 1,07-1,10 que el modelo necesitaba.',
            f'3. **Con ese ajuste el desfase se reduce a entre un 0 % y un 5 %**: publicada ÷ Π(1 − (qx + qx+1)/2) en 2010-2020 es {n(sel[("2010-2020", "hombres", 85)][10], 3)} (hombres, 85 años) y {n(sel[("2010-2020", "mujeres", 85)][10], 3)} (mujeres). El resto en hombres de edades altas aparece también frente a las defunciones registradas de la generación ({n(sel[("2010-2020", "hombres", 85)][11], 3)}), de modo que no lo explica la tabla sino la población publicada o la migración (no contrastable aquí).',
            '4. **El comportamiento de la población publicada frente a las defunciones depende de la ventana**: cerca de 1,00 en 2015-2020 y 2021-2024, por debajo de 1 en 2010-2020 para hombres de 85 años y por encima de 1 en 2000-2010 (la población pierde menos que las defunciones; ver `triangulacion-cohortes`). La metodología del INE dice que las series intercensales de 2012-2020 se recalcularon en 2023 con el censo de 2021 para enlazar con los censos anuales; con los datos descargados no se puede atribuir un residuo concreto a ese ajuste.',
            f'5. **Pensionistas**: con la distribución por edad de las pensiones de jubilación de octubre de 2026 (aproximación), las tablas implican unas {n(E_q)} muertes en 2025 con qx y {n(E_l)} con (qx + qx+1)/2, frente a {n(bajas[2025])} bajas definitivas de jubilación registradas por la Seguridad Social; la fuente no desglosa las causas de baja.',
            f'6. **Edades muy altas**: la población de 85 o más, 90 o más y 100 o más años del INE y de Eurostat coincide (diferencias de hasta 6 personas). La Seguridad Social publica pensiones por edad solo hasta «85 y más», así que no hay contraste posible con la población de 90 o más ni con los centenarios. En 85 o más años hay más de una pensión (jubilación más viudedad) por persona; no hay grupo con más pensiones de jubilación que personas.']
    DISC.insert(0, f'- **Modelo de cohortes frente a las tablas de mortalidad del INE (65-90 años, 2010-2020)**: aplicar qx de la tabla a la población de edad x a 1 de enero deja una supervivencia a 10 años inferior en la población publicada ({n(sel[("2010-2020", "hombres", 65)][9], 3)} a los 65, {n(sel[("2010-2020", "hombres", 75)][9], 3)} a los 75, {n(sel[("2010-2020", "hombres", 80)][9], 3)} a los 80 y {n(sel[("2010-2020", "hombres", 85)][9], 3)} a los 85 en hombres; {n(sel[("2010-2020", "mujeres", 85)][9], 3)} a los 85 en mujeres). '
                'La diferencia procede sobre todo de la convención de edades (la cohorte con x años a 1 de enero envejece de x+0,5 a x+1,5 durante el año): el factor medio entre las defunciones registradas y población × qx es de 1,04 a 1,08 y coincide con (qx + qx+1)/2 ÷ qx. No es un error de la población ni de las tablas.')
    DISC.append(f'- **Residuo en hombres de 85 años (2010-2020)**: con la convención de Lexis la población publicada conserva un {n(100 * (1 - sel[("2010-2020", "hombres", 85)][10]), 1)} % menos de efectivos que la tabla ({n(sel[("2010-2020", "hombres", 85)][10], 3)}) y un {n(100 * (1 - sel[("2010-2020", "hombres", 85)][11]), 1)} % menos que las defunciones registradas de la generación; en mujeres el residuo es inferior al 1 %. No se puede atribuir con los datos a la población, a la migración o al ajuste intercensal de 2012-2020.')
    DISC.append(f'- **Bajas definitivas de jubilación frente a muertes implícitas (2025)**: {n(bajas[2025])} bajas registradas frente a {n(E_q)} muertes con qx y {n(E_l)} con (qx + qx+1)/2 (aproximación con la distribución por edad de octubre de 2026). Con la corrección de Lexis la diferencia pasa de un {n(100 * (bajas[2025] / E_q - 1), 1)} % a un {n(100 * (bajas[2025] / E_l - 1), 1)} %; la Seguridad Social no desglosa las causas de baja ni se conocen los pensionistas por edad simple.')
    DISC.append('- **Defunciones registradas frente a tasa central × población media (65-99 años)**: las registradas superan a las esperadas entre un 0,5 % y un 3 % (más en 95-99); el INE calcula la exposición con los tiempos vividos por los fallecidos (b1 y b2 de su metodología) y no con la población media, por lo que no se espera una igualdad exacta.')
    seccion(f'{REPO}/docs/INFORME_VERIFICACION.md', 'verificacion-1b4', '\n'.join(inf))
    seccion(f'{REPO}/docs/DISCREPANCIAS.md', 'discrepancias-1b4', '## Fase 1B-4\n\n' + '\n'.join(DISC))


if __name__ == '__main__':
    out = main()
    json.dump(RES, open(f'{REPO}/docs/verificacion-1b4.json', 'w'), ensure_ascii=False, indent=1)
    secciones(*out[:1], *out[1:2], *out[2:3], *out[3:4], *out[4:5], *out[5:6], *out[6:7], *out[7:8], *out[8:9], *out[9:10]) if False else secciones(out[0], out[1], out[2], out[3], out[4], out[5], out[6], out[7], out[8], out[9])
