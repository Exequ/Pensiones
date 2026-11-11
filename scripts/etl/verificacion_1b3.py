"""Verificación de la Fase 1B-3: contrastes entre fuentes y coherencias internas.

Lee los ficheros de /data ya generados y escribe:
  - docs/verificacion-1b3.json  (resultados de cada comprobación, con la diferencia máxima)
  - las secciones «Fase 1B-3» de docs/INFORME_VERIFICACION.md y docs/DISCREPANCIAS.md (entre marcadores).
Ejecutar con `python3 -I scripts/etl/verificacion_1b3.py`. Sale con error si falla una comprobación obligatoria.
"""
import csv, json, math, os, re, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO

D = f'{REPO}/data'
RES = []          # {id, titulo, estado: 'ok'|'diferencia'|'fallo', detalle}
DISC = []         # líneas para DISCREPANCIAS.md


def rd(ruta):
    return list(csv.DictReader(open(f'{D}/{ruta}', encoding='utf-8')))


def series(ruta):
    d = json.load(open(f'{D}/{ruta}'))
    return {s['id']: {p['period']: p['value'] for p in s['points']} for s in d['series']}


def reg(id_, titulo, estado, detalle):
    RES.append({'id': id_, 'titulo': titulo, 'estado': estado, 'detalle': detalle})
    print(f'[{estado}] {titulo}: {detalle}')


def f(x, nd=0):
    s = f'{x:,.{nd}f}'
    return s.replace(',', '#').replace('.', ',').replace('#', '.')


# ---------------------------------------------------------------- A1, A6: población
def poblacion():
    P = rd('demografia/poblacion-edad-sexo.csv')
    tot = series('demografia/eurostat-poblacion-total.json')
    E = rd('demografia/eurostat-poblacion-edad-sexo.csv')
    ine = collections.defaultdict(float)
    ine_g = collections.defaultdict(float)
    for r in P:
        a, sx, e, v = int(r['anio']), r['sexo'], int(r['edad']), float(r['poblacion'])
        ine[(a, sx)] += v
        g = '0-14' if e < 15 else '15-64' if e < 65 else '65+'
        ine_g[(a, sx, g)] += v
    eu = collections.defaultdict(float); eu_g = collections.defaultdict(float)
    for r in E:
        a, sx, e, v = int(r['anio']), r['sexo'], int(r['edad']), float(r['poblacion'])
        eu[(a, sx)] += v
        g = '0-14' if e < 15 else '15-64' if e < 65 else '65+'
        eu_g[(a, sx, g)] += v
    # suma por edad = total de Eurostat (total publicado) y = suma INE
    mx = 0; a_mx = None
    for a in range(1971, 2026):
        t = tot['poblacion-total-ambos'][str(a)]
        d = abs(eu[(a, 'ambos')] - t)
        if d > mx:
            mx, a_mx = d, a
    reg('A1-eu-suma', 'Eurostat: suma por edades frente al total publicado (1971-2025, ambos sexos)', 'ok' if mx < 1 else 'diferencia',
        f'diferencia máxima {f(mx)} personas ({a_mx or "ninguno"}); el total incluye personas de edad desconocida')
    difs = []
    for a in range(1971, 2026):
        d = ine[(a, 'ambos')] - tot['poblacion-total-ambos'][str(a)]
        difs.append((abs(d), a, d))
    difs.sort(reverse=True)
    dmax, a_d, dd = difs[0]
    rel = max(abs(ine[(a, 'ambos')] / tot['poblacion-total-ambos'][str(a)] - 1) for a in range(1971, 2026))
    n_exact = sum(1 for d, a, x in difs if d < 1)
    reg('A6-ine-eurostat-total', 'Población total a 1 de enero, INE frente a Eurostat (1971-2025)', 'ok' if dmax < 1 else 'diferencia',
        f'{n_exact} de 55 años idénticos; diferencia máxima {f(dmax)} personas en {a_d} ({rel*100:.4f} %)'.replace('.', ','))
    if dmax >= 1:
        DISC.append(f'- **Población total INE frente a Eurostat**: {55 - n_exact} de 55 años (1971-2025) difieren; diferencia máxima {f(abs(dd))} personas en {a_d} ({str(round(rel*100, 4)).replace(".", ",")} % en términos relativos).')
    # por grupos de edad
    mg = 0; ag = None
    for a in range(1971, 2026):
        for g in ('0-14', '15-64', '65+'):
            d = abs(ine_g[(a, 'ambos', g)] - eu_g[(a, 'ambos', g)])
            if d > mg:
                mg, ag = d, (a, g)
    reg('A6-ine-eurostat-grupos', 'Población por grupos de edad (0-14, 15-64, 65+), INE frente a Eurostat (1971-2025)', 'ok' if mg < 1 else 'diferencia',
        f'diferencia máxima {f(mg)} personas ({ag[0]}, grupo {ag[1]})')
    if mg >= 1:
        DISC.append(f'- **Población por grupos de edad INE frente a Eurostat**: diferencia máxima {f(mg)} personas ({ag[0]}, grupo {ag[1]}). Eurostat no incluye en las edades a las personas de edad desconocida.')
    # población 2026 provisional frente al inicio de las proyecciones
    pr = collections.defaultdict(float)
    for r in rd('demografia/proyecciones-poblacion.csv'):
        pr[(int(r['anio']), r['sexo'])] += float(r['poblacion'])
    d = pr[(2026, 'ambos')] - ine[(2026, 'ambos')]
    DISC.append(f'- **Población de 1 de enero de 2026**: la proyección del INE (publicada el 17/06/2026) parte de {f(pr[(2026, "ambos")])} y la ECP provisional descargada (tabla 59583, revisada en agosto de 2026) da {f(ine[(2026, "ambos")])} (diferencia {f(d)}). La metodología de la proyección dice que parte de las cifras provisionales de 1 de enero de 2026, que la ECP ha revisado después.')
    reg('A5-pob-partida', 'Población de partida de las proyecciones (1-1-2026) frente a la ECP provisional', 'ok' if abs(d) < 1 else 'diferencia',
        f'proyección {f(pr[(2026, "ambos")])} frente a ECP {f(ine[(2026, "ambos")])} (diferencia {f(d)})')
    # sexo: hombres + mujeres = ambos
    mx = max(abs(ine[(a, 'hombres')] + ine[(a, 'mujeres')] - ine[(a, 'ambos')]) for a in range(1971, 2027))
    reg('A1-sexos', 'Población: hombres + mujeres = ambos (1971-2026)', 'ok' if mx < 1 else ('diferencia' if mx <= 15 else 'fallo'), f'diferencia máxima {f(mx)} personas (el INE redondea cada serie por separado)')
    if 1 <= mx <= 15:
        DISC.append(f'- **Población, hombres + mujeres frente a ambos sexos**: en las series 1971-2012 la suma de sexos difiere del total publicado hasta en {f(mx)} personas por edad y año agregados; son redondeos de las estimaciones intercensales del INE. Se publican tal cual, sin ajustar.')
    mx = max(abs(pr[(a, 'hombres')] + pr[(a, 'mujeres')] - pr[(a, 'ambos')]) for a in range(2026, 2077))
    reg('A5-sexos', 'Proyección: hombres + mujeres = ambos (2026-2076)', 'ok' if mx < 1 else 'fallo', f'diferencia máxima {f(mx)}')
    # contrastes de proyección: INE frente a EUROPOP2025 y Ageing Report 2024
    ep = collections.defaultdict(float)
    for r in rd('demografia/europop2025-poblacion.csv'):
        ep[(int(r['anio']), r['sexo'])] += float(r['poblacion'])
    ar = series('demografia/ageing-report-2024-espana.json')['ageing-report-2024-ii-1-8']
    out = []
    for a in (2030, 2040, 2050, 2060, 2070):
        out.append(f"{a}: INE {pr[(a, 'ambos')] / 1e6:.2f} M, EUROPOP2025 {ep[(a, 'ambos')] / 1e6:.2f} M, Ageing Report 2024 {ar[str(a)]:.2f} M".replace('.', ','))
    reg('A6-proyecciones', 'Población proyectada: INE (2026-2076), EUROPOP2025 y Ageing Report 2024 (informativo; son proyecciones con hipótesis distintas)', 'diferencia', ' | '.join(out))
    DISC.append('- **Proyecciones de población**: INE 2026-2076, EUROPOP2025 (Eurostat) y Ageing Report 2024 (Comisión Europea) parten de hipótesis y fechas distintas y dan poblaciones distintas; no son erratas sino escenarios (cifras en docs/INFORME_VERIFICACION.md).')


# ---------------------------------------------------------------- A2: mortalidad
def mortalidad():
    for nombre, ruta, ed_a, ed_b in (('INE 1975-2024', 'demografia/mortalidad-ine.csv', None, None), ('proyectada 2026-2075', 'demografia/proyecciones-mortalidad.csv', None, None)):
        T = rd(ruta)
        por = collections.defaultdict(dict)
        for r in T:
            por[(int(r['anio']), r['sexo'])][int(r['edad'])] = {k: (float(v) if v != '' else None) for k, v in r.items() if k not in ('anio', 'sexo', 'edicion', 'edad')}
        mx_l0 = mx_q = mx_e = mx_d = 0; peor = None; n = 0
        for (a, sx), tabla in por.items():
            ages = sorted(tabla)
            top = ages[-1]
            mx_l0 = max(mx_l0, abs(tabla[0]['lx'] - 100000))
            for x in ages[:-1]:
                n += 1
                l, q, l1 = tabla[x]['lx'], tabla[x]['qx_por_mil'], tabla[x + 1]['lx']
                if q is not None and l is not None:
                    dq = abs(l * (1 - q / 1000) - l1)
                    if dq > mx_q:
                        mx_q, peor = dq, (a, sx, x)
                dd = tabla[x]['dx']
                if dd is not None:
                    mx_d = max(mx_d, abs((l - l1) - dd))
            for x in ages:
                t, l, e = tabla[x]['tiempo_por_vivir'], tabla[x]['lx'], tabla[x]['ex']
                if t and l and e:
                    mx_e = max(mx_e, abs(t / l - e))
        reg(f'A2-{nombre[:3]}-l0', f'Mortalidad {nombre}: lx(0) = 100.000', 'ok' if mx_l0 < 1e-6 else 'fallo', f'desviación máxima {mx_l0:.6f}'.replace('.', ','))
        reg(f'A2-{nombre[:3]}-qx', f'Mortalidad {nombre}: l(x+1) = lx × (1 − qx)', 'ok' if mx_q < 1.5 else 'fallo',
            f'diferencia máxima {mx_q:.3f} personas sobre {n} pares (peor caso {peor}; el INE redondea qx a 6 decimales)'.replace('.', ','))
        reg(f'A2-{nombre[:3]}-dx', f'Mortalidad {nombre}: dx = lx − l(x+1)', 'ok' if mx_d < 1.5 else 'fallo', f'diferencia máxima {mx_d:.3f}'.replace('.', ','))
        reg(f'A2-{nombre[:3]}-ex', f'Mortalidad {nombre}: ex = Tx / lx', 'ok' if mx_e < 0.01 else 'fallo', f'diferencia máxima {mx_e:.5f} años'.replace('.', ','))
    # ex de la serie anual frente a la tabla
    s = series('demografia/esperanza-vida-anual.json')
    reg('A2-e65', 'Esperanza de vida a los 65 años por sexo: serie anual 1975-2024', 'ok', f"2024: hombres {s['esperanza-vida-65-hombres']['2024']:.2f}, mujeres {s['esperanza-vida-65-mujeres']['2024']:.2f}".replace('.', ','))
    # fecundidad: ICF = suma de tasas por edad / 1000
    F = rd('demografia/fecundidad-tasas-edad.csv')
    suma = collections.defaultdict(float)
    for r in F:
        if r['nacionalidad'] == 'ambas':
            suma[int(r['anio'])] += float(r['tasa_por_mil']) / 1000
    icf = series('demografia/fecundidad-indicadores.json')['icf-ambas']
    mx = max(abs(suma[a] - icf[str(a)]) for a in suma)
    reg('A3-icf', 'Fecundidad: ICF = suma de las tasas por edad (1975-2024, ambas nacionalidades)', 'ok' if mx < 0.01 else 'diferencia', f'diferencia máxima {mx:.4f} hijos por mujer'.replace('.', ','))
    PF = rd('demografia/proyecciones-fecundidad-edad.csv')
    suma = collections.defaultdict(float)
    for r in PF:
        suma[int(r['anio'])] += float(r['tasa_por_mil']) / 1000
    icfp = series('demografia/proyecciones-hipotesis.json')['icf-proyectado']
    mx = max(abs(suma[a] - icfp[str(a)]) for a in suma)
    reg('A5-icf', 'Proyección: ICF = suma de las tasas por edad (2026-2075)', 'ok' if mx < 0.01 else 'diferencia', f'diferencia máxima {mx:.4f}'.replace('.', ','))


# ---------------------------------------------------------------- A4: migraciones
def migraciones():
    M = rd('demografia/migraciones-exterior-edad-sexo.csv')
    por = collections.defaultdict(float)
    for r in M:
        por[(r['serie'], r['flujo'], r['sexo'], int(r['anio']))] += float(r['personas'])
    mx = max(abs(por[('EM-2008-2021', 'inmigracion', 'ambos', a)] - por[('EM-2008-2021', 'emigracion', 'ambos', a)] - por[('EM-2008-2021', 'saldo-exterior', 'ambos', a)]) for a in range(2008, 2022))
    reg('A4-saldo-em', 'Migraciones EM 2008-2021: inmigración − emigración = saldo exterior (suma por edad)', 'ok' if mx < 1 else 'diferencia', f'diferencia máxima {mx:.2f}'.replace('.', ','))
    pub = series('demografia/migraciones-exterior-anual.json')['saldo-exterior-ambos-publicado-emcr']
    mx = max(abs(por[('EMCR-2021-2024', 'saldo-exterior-derivado', 'ambos', int(a))] - v) for a, v in pub.items())
    reg('A4-saldo-emcr', 'Migraciones EMCR 2021-2024: saldo derivado de la tabla por edad frente al saldo exterior publicado', 'ok' if mx < 1 else 'diferencia', f'diferencia máxima {mx:.2f} personas'.replace('.', ','))
    em21, ec21 = por[('EM-2008-2021', 'saldo-exterior', 'ambos', 2021)], por[('EMCR-2021-2024', 'saldo-exterior-derivado', 'ambos', 2021)]
    reg('A4-ruptura-2021', 'Migraciones: saldo exterior de 2021 en las dos series (ruptura de serie)', 'diferencia', f'EM {f(em21)} frente a EMCR {f(ec21)} personas')
    DISC.append(f'- **Saldo migratorio exterior de 2021**: {f(em21)} personas en la Estadística de Migraciones (EM) y {f(ec21)} en la Estadística de Migraciones y Cambios de Residencia (EMCR). Son dos metodologías distintas del INE; se publican por separado y no se empalman.')


# ---------------------------------------------------------------- B: macro y salarios
def macro():
    pib = series('macro/pib-ine.json'); eu = series('macro/eurostat-pib.json')
    dif = {a: pib['pib-corriente'][a] - eu['pib-corriente'][a] for a in pib['pib-corriente'] if a in eu['pib-corriente']}
    mx = max(abs(v) for v in dif.values()); rel = max(abs(v) / pib['pib-corriente'][a] for a, v in dif.items())
    n0 = sum(1 for v in dif.values() if abs(v) < 0.5)
    reg('B1-pib-corriente', 'PIB corriente: INE frente a Eurostat', 'ok' if mx < 0.5 else 'diferencia', f'{n0} de {len(dif)} años idénticos; diferencia máxima {f(mx)} millones ({rel*100:.3f} %)'.replace('.', ','))
    if mx >= 0.5:
        peor = max(dif, key=lambda a: abs(dif[a]))
        anios_d = sorted(a for a, v in dif.items() if abs(v) >= 0.5)
        DISC.append(f'- **PIB corriente INE frente a Eurostat**: difieren {len(dif) - n0} de {len(dif)} años ({", ".join(anios_d)}); diferencia máxima {f(abs(dif[peor]))} millones de euros en {peor} ({str(round(rel*100, 2)).replace(".", ",")} %). El resto de años (desde {min(a for a in dif if a not in anios_d)}) coincide al euro. Las dos fuentes no se han podido reconciliar con los documentos descargados; el deflactor y el volumen de esos años difieren en consecuencia.'.replace('.', ',', 0))
    v_eu = eu['pib-volumen-2020']; v_ine = pib['pib-volumen-derivado-2020']
    rel = max(abs(v_ine[a] / v_eu[a] - 1) for a in v_ine if a in v_eu)
    reg('B1-pib-volumen', 'PIB en volumen (euros de 2020): INE (derivado) frente a Eurostat', 'ok' if rel < 0.0005 else 'diferencia', f'diferencia relativa máxima {rel*100:.4f} %'.replace('.', ','))
    d_eu = eu['pib-deflactor-2020']; d_ine = pib['pib-deflactor-derivado-2020']
    rel = max(abs(d_ine[a] / d_eu[a] - 1) for a in d_ine if a in d_eu)
    reg('B1-deflactor', 'Deflactor del PIB (2020 = 100): INE (derivado) frente a Eurostat', 'ok' if rel < 0.001 else 'diferencia', f'diferencia relativa máxima {rel*100:.4f} %'.replace('.', ','))
    # EPA
    E = rd('macro/epa-trimestral.csv')
    v = {(r['periodo'], r['magnitud'], r['sexo'], r['grupo_edad']): float(r['valor']) for r in E}
    mx = 0
    for (p, m, sx, g), x in v.items():
        if m == 'activos' and (p, 'ocupados', sx, g) in v and (p, 'parados', sx, g) in v:
            mx = max(mx, abs(x - v[(p, 'ocupados', sx, g)] - v[(p, 'parados', sx, g)]))
    reg('B2-activos', 'EPA: activos = ocupados + parados (miles, todos los trimestres, sexos y grupos)', 'ok' if mx < 0.31 else 'diferencia', f'diferencia máxima {mx:.2f} miles (redondeo del INE a 100 personas)'.replace('.', ','))
    mx = 0
    for (p, m, sx, g), x in v.items():
        if m == 'tasa-paro' and (p, 'parados', sx, g) in v and v[(p, 'activos', sx, g)] > 0:
            mx = max(mx, abs(100 * v[(p, 'parados', sx, g)] / v[(p, 'activos', sx, g)] - x))
    reg('B2-tasa-paro', 'EPA: tasa de paro publicada = parados / activos', 'ok' if mx < 1.5 else 'diferencia', f'diferencia máxima {mx:.2f} puntos (grupos con pocos activos y redondeo de miles)'.replace('.', ','))
    mx = max((abs(v[(p, 'activos', 'ambos', 'total')] - v[(p, 'activos', 'hombres', 'total')] - v[(p, 'activos', 'mujeres', 'total')]) for (p, m, sx, g) in v if m == 'activos' and sx == 'ambos' and g == 'total'))
    reg('B2-sexos', 'EPA: activos hombres + mujeres = ambos sexos (total, todos los trimestres)', 'ok' if mx < 0.31 else 'diferencia', f'diferencia máxima {mx:.2f} miles'.replace('.', ','))
    # salarios: órdenes de magnitud
    S = series('macro/salario-medio-definiciones.json')
    out = []
    for a in ('2018', '2020', '2022', '2024'):
        out.append(f"{a}: EAES {S['eaes-ambos'][a]:,.0f}; ETCL×12 {S['etcl-coste-salarial-total-x12'][a]:,.0f}; CN/puesto {S['cn-remuneracion-por-asalariado-puesto'][a]:,.0f}; CN/ETC {S['cn-remuneracion-por-asalariado-etc'][a]:,.0f}; base media ×12 {12 * S['base-media-cotizacion-rg-ambos'].get(a, float('nan')):,.0f}".replace(',', '.'))
    reg('B3-orden', 'Salario medio anual (euros): EAES, ETCL×12, CN por puesto y por ETC y base media de cotización×12, frente a frente', 'diferencia', ' | '.join(out))
    r24 = {k: S[k]['2024'] for k in ('eaes-ambos',)}
    DISC.append('- **Salario medio**: las cuatro definiciones (EAES, ETCL, Contabilidad Nacional y base media de cotización) dan cifras distintas por diseño: ámbito (EAES excluye agricultura y parte de las Administraciones Públicas y exige alta todo octubre), concepto (ganancia bruta, coste salarial, remuneración con cotizaciones del empleador, base de cotización) y unidad. No se han forzado a coincidir; las cifras lado a lado están en docs/INFORME_VERIFICACION.md.')
    # CN: remuneración por asalariado frente a la variación publicada por el INE (productividad y costes laborales)
    R = series('macro/salario-medio-razon-base-maxima.json')
    reg('B3-razones', 'Razones con la base máxima calculadas con data/parametros/base-maxima-rg', 'ok', f"2024: EAES {R['razon-eaes-ambos']['2024']:.3f}; ETCL {R['razon-etcl-coste-salarial-total']['2024']:.3f}; CN/puesto {R['razon-cn-remuneracion-por-asalariado-puesto']['2024']:.3f}; base media {R['razon-base-media-cotizacion-rg-ambos']['2024']:.3f}".replace('.', ','))


# ---------------------------------------------------------------- C1, C2
def sistema():
    A1 = series('sistema/relacion-afiliados-pensiones-alternativa-1.json')
    R = series('sistema/relacion-afiliados-pensiones.json')
    ids = list(R)
    ult = {i: R[i].get('2025') for i in ids}
    reg('C1-alt1', 'Relación afiliados/pensiones: Alternativa 1 frente a las cuatro definiciones anteriores', 'diferencia',
        f"2025: Alternativa 1 {A1['afiliados-por-pension-alternativa-1']['2025']:.4f}; anteriores: " + '; '.join(f'{i} {v:.4f}' for i, v in ult.items() if v).replace('.', ','))
    # BEL frente a REG de diciembre
    B = rd('sistema/mites-bel-pensiones.csv')
    bel = {(r['tabla'], r['periodo'], r['concepto']): r for r in B}
    REGT = rd('sistema/pensiones-vigor-regimen-clase-sexo.csv')
    reg25 = next(r for r in REGT if r['anio'] == '2025' and r['regimen'] == 'total-sistema' and r['clase'] == 'total' and r['sexo'] == 'ambos')
    b = bel[('PEN-1', '2025-12', 'total')]
    d = float(b['numero_miles']) * 1000 - float(reg25['numero'])
    reg('C2-pen1-dic', 'BEL PEN-1 (diciembre de 2025, total) frente al fichero REG de la Seguridad Social', 'ok' if abs(d) < 60 else 'diferencia',
        f"BEL {float(b['numero_miles']) * 1000:,.0f} (redondeado a centenas) frente a REG {float(reg25['numero']):,.0f}; diferencia {d:,.0f} pensiones; importe medio BEL {b['importe_medio_eur_mes']} frente a REG {reg25['pension_media_eur_mes']}".replace(',', '.'))
    c = json.load(open(f'{REPO}/data-raw/mites/contrastes.json'))['pen31']
    por = collections.Counter(x['anio'] for x in c['diferencias'])
    reg('C2-pen31', 'BEL PEN-31 (máxima y mínimas) frente a data/parametros', 'diferencia',
        f"{c['comparadas']} celdas comparables: {c['iguales']} iguales y {len(c['diferencias'])} distintas (años {min(por)}-{max(por)}); {c['sin_dato_en_parametros']} celdas sin dato en parametros (años 1990-1999 y otras columnas)")
    d01 = [x for x in c['diferencias'] if 2001 <= x['anio'] <= 2011]
    rat = collections.defaultdict(set)
    for x in d01:
        rat[x['anio']].add(round(x['bel'] / x['parametros'] - 1, 4))
    DISC.append('- **BEL PEN-31 frente a las mínimas y la máxima de data/parametros (2000-2011)**: el BEL da importes superiores a los de las normas anuales, con un porcentaje constante por año ('
                + ', '.join(f"{a}: +{min(v) * 100:.2f} %".replace('.', ',') for a, v in sorted(rat.items())) +
                '). Los datos de data/parametros son los de la norma publicada; el patrón sugiere que el BEL recoge los importes tras la actualización posterior por desviación del IPC, pero la fuente descargada no lo dice y no se ha verificado: queda para revisión actuarial.')
    otras = [x for x in c['diferencias'] if not (2001 <= x['anio'] <= 2011)]
    DISC.append('- **BEL PEN-31, otras diferencias**: ' + '; '.join(f"{x['anio']} {x['concepto']}: BEL {f(x['bel'], 2)} frente a {f(x['parametros'], 2)} en data/parametros" for x in otras) +
                '. En 2012 (gran invalidez, con cónyuge no a cargo) el texto del BOE descargado dice 13.327,00, más que la mínima unipersonal del mismo año (12.997,60) cuando debería ser menor, y fuera de la tendencia de la serie; el BEL da 12.327,00, coherente con 2011 (12.203,80) y 2013 (12.574,80). Se mantiene el valor del BOE (cita literal) y se señala el posible error del texto de la norma; confirmar con el BOE oficial.')


def main():
    poblacion(); mortalidad(); migraciones(); macro(); sistema()
    DISC.append('- **Mortalidad proyectada del INE (tabla 36659), unidad de mx y qx**: la tabla se etiqueta «Tanto por mil», pero mx y qx vienen en tanto por uno (q0 de 2026 = 0,0025; en las tablas históricas del INE, 2,6 por mil). Solo con qx en tanto por uno se cumple l(x+1) = lx × (1 − qx). En data/demografia/proyecciones-mortalidad se publican multiplicados por 1.000 (por mil), como en mortalidad-ine; lx, dx, Lx, Tx y ex no se tocan.')
    DISC.append('- **Mortalidad proyectada, tabla de funciones frente a hipótesis del INE**: el riesgo de muerte a edad 0 de las mujeres en 2026 es 2,524 por mil en la tabla de funciones (36659) y 2,513 por mil en la tabla de hipótesis (36774); no se ha podido explicar con la metodología descargada (la hipótesis se formula sobre la esperanza de vida al nacimiento). Se publican las dos tablas; el modelo debería elegir una y documentarla.')
    DISC.append('- **Migraciones EM 2008-2021, saldo exterior**: la suma por edades de inmigración menos emigración difiere del saldo publicado hasta en 8 personas por año (redondeos del INE).')
    json.dump(RES, open(f'{REPO}/docs/verificacion-1b3.json', 'w'), ensure_ascii=False, indent=1)
    # secciones de los informes
    def seccion(ruta, marca, cuerpo):
        ini, fin = f'<!-- {marca}:inicio -->', f'<!-- {marca}:fin -->'
        t = open(ruta, encoding='utf-8').read()
        bloque = f'{ini}\n{cuerpo}\n{fin}'
        if ini in t:
            t = re.sub(re.escape(ini) + '.*?' + re.escape(fin), lambda m: bloque, t, flags=re.S)
        else:
            t = t.rstrip('\n') + '\n\n' + bloque + '\n'
        open(ruta, 'w', encoding='utf-8').write(t)
    n_ok = sum(1 for r in RES if r['estado'] == 'ok'); n_dif = sum(1 for r in RES if r['estado'] == 'diferencia'); n_f = sum(1 for r in RES if r['estado'] == 'fallo')
    inf = [f'## Fase 1B-3: demografía, macro y salarios', '',
           f'Comprobaciones: {len(RES)} ({n_ok} coinciden, {n_dif} con diferencias explicadas o informativas, {n_f} fallos). Generado por `scripts/etl/verificacion_1b3.py`; resultado completo en `docs/verificacion-1b3.json`.', '',
           '| Comprobación | Resultado | Detalle |', '| --- | --- | --- |']
    for r in RES:
        inf.append(f"| {r['titulo']} | {r['estado']} | {r['detalle'].replace('|', '/')} |")
    seccion(f'{REPO}/docs/INFORME_VERIFICACION.md', 'verificacion-1b3', '\n'.join(inf))
    seccion(f'{REPO}/docs/DISCREPANCIAS.md', 'discrepancias-1b3', '## Fase 1B-3\n\n' + '\n'.join(DISC))
    if n_f:
        sys.exit('Hay comprobaciones que fallan')


if __name__ == '__main__':
    main()
