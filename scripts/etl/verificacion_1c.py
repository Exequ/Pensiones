"""Verificación de la Fase 1C: contrastes de España (OCDE frente a datos propios), comprobaciones cruzadas entre carpetas y URLs.

Lee /data y docs/comprobacion-urls.json; escribe docs/verificacion-1c.json y las secciones «Fase 1C» de docs/INFORME_VERIFICACION.md y
docs/DISCREPANCIAS.md (entre marcadores). Sale con error si falla una comprobación obligatoria. Ejecutar con `python3 -I`.
"""
import collections, csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO

D = f'{REPO}/data'
RES, DISC = [], []


def rd(r):
    return list(csv.DictReader(open(f'{D}/{r}', encoding='utf-8')))


def series(r):
    return {s['id']: {p['period']: p['value'] for p in s['points']} for s in json.load(open(f'{D}/{r}'))['series']}


def reg(i, t, e, d):
    RES.append({'id': i, 'titulo': t, 'estado': e, 'detalle': d})
    print(f'[{e}] {t}: {d}')


def n(x, nd=0):
    return f'{x:,.{nd}f}'.replace(',', '#').replace('.', ',').replace('#', '.')


CL = ('incapacidad', 'jubilacion', 'viudedad', 'orfandad', 'favor-familiares')


def cruzadas():
    regt = rd('sistema/pensiones-vigor-regimen-clase-sexo.csv')
    v = {(int(r['anio']), r['clase']): (float(r['numero']), float(r['pension_media_eur_mes'])) for r in regt
         if r['regimen'] == 'total-sistema' and r['sexo'] == 'ambos' and r['numero'] != '' and r['pension_media_eur_mes'] != ''}
    anios = sorted({a for a, c in v if (a, 'total') in v})
    # 1. total = suma de clases y pensión media total = media ponderada
    mx_n = max(abs(sum(v[(a, c)][0] for c in CL) - v[(a, 'total')][0]) for a in anios)
    mx_m = max(abs(sum(v[(a, c)][0] * v[(a, c)][1] for c in CL) / v[(a, 'total')][0] - v[(a, 'total')][1]) for a in anios)
    reg('C2-total-clases', 'Pensiones en vigor: total = suma de las cinco clases y pensión media total = media ponderada de las clases (2008-2025)', 'ok' if mx_n <= 20 and mx_m < 0.05 else 'diferencia',
        f'diferencia máxima en número {n(mx_n)} pensiones; en pensión media {n(mx_m, 3)} euros/mes')
    dm = {a: sum(v[(a, c)][0] * v[(a, c)][1] for c in CL) / v[(a, 'total')][0] - v[(a, 'total')][1] for a in anios}
    peor = max(dm, key=lambda a: abs(dm[a]))
    DISC.append(f'- **Pensión media total frente a la media ponderada de las cinco clases (2008-2011)**: en los ficheros REG de 2008 a 2011 la pensión media del total del sistema es hasta {n(abs(dm[peor]), 2)} euros/mes superior a la media ponderada por número de las cinco clases ({n(abs(dm[2008]), 2)} en 2008, {n(abs(dm[2011]), 2)} en 2011); desde 2012 la diferencia no pasa de {n(max(abs(dm[a]) for a in anios if a >= 2012), 3)} euros/mes. '
                'Los datos descargados no explican la diferencia en 2008-2011 (el número sí coincide con la suma de clases).')
    # 2. pensionistas frente a pensiones
    ptas = series('sistema/pensionistas-pensiones-historico.json')
    rat = {a: v[(a, 'total')][0] / ptas['pensionistas'][str(a)] for a in anios if str(a) in ptas['pensionistas']}
    reg('C2-pensionistas-pensiones', 'Pensionistas (personas) frente a pensiones en vigor a diciembre (2008-2025)', 'ok' if all(x >= 1 for x in rat.values()) else 'fallo',
        f'pensiones por pensionista entre {n(min(rat.values()), 3)} y {n(max(rat.values()), 3)}; 2025: {n(rat[2025], 3)}; la serie histórica de pensiones coincide con el fichero REG salvo diferencias de unas decenas (ver DISCREPANCIAS 1B-1)')
    # 3. gasto de la ejecución frente a número × pensión media × 14
    ej = rd('sistema/presupuesto-ss-ejecucion.csv')
    sp, cm = {}, {}
    for x in ej:
        if x['periodo'] == x['ejercicio'] + '-T4':
            if x['tabla'] == 'gastos-cap4' and x['concepto'] == 'SUMA DE PENSIONES':
                sp[int(x['ejercicio'])] = float(x['derechos_u_obligaciones_meur'])
            if x['tabla'] == 'gastos-cap4-no-contributivas' and x['concepto'].startswith('COMPL. A M'):
                cm[int(x['ejercicio'])] = float(x['derechos_u_obligaciones_meur'])
    bel = {r['periodo']: r for r in rd('sistema/mites-bel-pensiones.csv') if r['tabla'] == 'PEN-1' and r['tipo_periodo'] == 'anual' and r['concepto'] == 'total'}
    r_dic, r_bel, r_cm = {}, {}, {}
    for a in range(2018, 2026):
        e_dic = sum(v[(a, c)][0] * v[(a, c)][1] * 14 for c in CL) / 1e6
        e_bel = float(bel[str(a)]['numero_miles']) * 1000 * float(bel[str(a)]['importe_medio_eur_mes']) * 14 / 1e6
        r_dic[a], r_bel[a], r_cm[a] = sp[a] / e_dic, sp[a] / e_bel, (sp[a] + cm[a]) / e_bel
    reg('C2-gasto-ejecucion', 'Gasto en pensiones de la ejecución («suma de pensiones», obligaciones) ÷ número × pensión media × 14, 2018-2025', 'diferencia',
        f'con datos de diciembre: de {n(min(r_dic.values()), 3)} a {n(max(r_dic.values()), 3)}; con la media anual del BEL (PEN-1): de {n(min(r_bel.values()), 3)} a {n(max(r_bel.values()), 3)}; '
        f'sumando el complemento a mínimos de pensiones contributivas (otra fila de la ejecución): de {n(min(r_cm.values()), 3)} a {n(max(r_cm.values()), 3)}')
    DISC.append(f'- **Gasto en pensiones de la ejecución frente a número × pensión media × 14 (2018-2025)**: la fila «suma de pensiones» de la ejecución (obligaciones reconocidas) es entre un {n(100 * (1 - max(r_dic.values())), 1)} % y un {n(100 * (1 - min(r_dic.values())), 1)} % inferior a la suma de las cinco clases de número de diciembre × pensión media de diciembre × 14, y entre un {n(100 * (1 - max(r_bel.values())), 1)} % y un {n(100 * (1 - min(r_bel.values())), 1)} % inferior con la media anual del BEL. '
                'La ejecución registra el complemento a mínimos de las pensiones contributivas en otra fila (tabla «gastos-cap4-no-contributivas»): sumándolo, el cociente con la media anual del BEL queda entre '
                f'{n(min(r_cm.values()), 3)} y {n(max(r_cm.values()), 3)} (2021 es el valor más alto). Es compatible con que la pensión media publicada incluya el complemento a mínimos y que la ejecución lo lleve en otra fila, pero los datos descargados no lo confirman por sí solos; '
                'lo que resta (hasta un 2 %) no se puede atribuir con los datos (atrasos, efectos de calendario o diferencias entre obligaciones reconocidas y pagos).')
    # 4. población 65+ frente a pensiones de jubilación
    pob = collections.defaultdict(float)
    for r in rd('demografia/poblacion-edad-sexo.csv'):
        if r['sexo'] == 'ambos' and int(r['edad']) >= 65:
            pob[int(r['anio'])] += float(r['poblacion'])
    cocs = {a: v[(a, 'jubilacion')][0] / pob[a + 1] for a in anios if a + 1 in pob}
    reg('C2-poblacion-65', 'Pensiones de jubilación a 1 de diciembre ÷ población de 65 o más años a 1 de enero siguiente (INE, 2008-2025)', 'diferencia',
        f'de {n(min(cocs.values()), 3)} a {n(max(cocs.values()), 3)}; 2025: {n(cocs[2025], 3)}; no es una tasa de cobertura: hay jubilados menores de 65 años, mayores de 65 sin pensión de jubilación del sistema (incluida Clases Pasivas) y pensiones de otras clases')
    DISC.append(f'- **Pensiones de jubilación frente a población de 65 o más años**: el cociente (jubilaciones a 1 de diciembre ÷ población de 65 o más años a 1 de enero siguiente) va de {n(min(cocs.values()), 3)} a {n(max(cocs.values()), 3)} entre 2008 y 2025. No es una tasa de cobertura: la población de 65 o más años incluye personas sin pensión de jubilación del Sistema (Clases Pasivas, sin carrera suficiente), '
                'y entre las jubilaciones hay personas menores de 65 años.')
    # 5. EAES, base media y base máxima
    S = series('macro/salario-medio-definiciones.json')
    bmax = {int(d['period']): d['value'] for d in json.load(open(f'{D}/parametros/base-maxima-rg.json'))['data']}
    fila = []
    for a in range(2018, 2025):
        k = str(a)
        fila.append(f"{a}: base media×12 / EAES = {n(12 * S['base-media-cotizacion-rg-ambos'][k] / S['eaes-ambos'][k], 3)}; EAES / (12 × base máxima) = {n(S['eaes-ambos'][k] / (12 * bmax[a]), 3)}")
    reg('C2-eaes-base', 'Salario medio EAES frente a la base media de cotización y a la base máxima (2018-2024)', 'diferencia', ' | '.join(fila))
    rb = [12 * S['base-media-cotizacion-rg-ambos'][str(a)] / S['eaes-ambos'][str(a)] for a in range(2018, 2025)]
    DISC.append(f'- **EAES frente a la base media de cotización**: la base media de cotización (por contingencias comunes, topada) ×12 es entre el {n(100 * min(rb), 1)} % y el {n(100 * max(rb), 1)} % de la ganancia bruta anual de la EAES en 2018-2024 (cifras por año en docs/INFORME_VERIFICACION.md). Ámbitos distintos (EAES excluye agricultura y parte del sector público; la base media es de personas físicas del Régimen General con al menos un día cotizado, sin agrario, hogar ni artistas): no se espera que coincidan.')


def contraste_ocde():
    es = {x['id']: x for x in json.load(open(f'{D}/internacional/ocde-espana.json'))['data']}
    sers = series('internacional/ocde-espana.json')
    con = series('internacional/contraste-espana.json')
    # coherencia entre tabla y fichero de España
    t = [r for r in rd('internacional/ocde-pag.csv') if r['pais'] == 'ESP' and r['medida'] == 'GPRR100' and r['opcionalidad'] == 'M' and r['sexo'] == 'hombres']
    reg('A4-tabla-datos', 'OCDE: tasa de reposición bruta al 100 % del salario medio de España, tabla frente a fichero de datos', 'ok' if t and float(t[0]['valor']) == es['gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024']['value'] else 'fallo',
        f"{t[0]['valor']} (tabla) frente a {es['gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024']['value']} (fichero)")
    g100, g50, g200 = (es[f'gprr{k}-hombres-z-m-pt-earn-g-pre-ret-inc-2024']['value'] for k in ('100', '50', '200'))
    n100 = es['nprr100-hombres-z-m-pt-earn-n-pre-ret-inc-2024']['value']
    sm = {'EAES': con['pension-altas-sobre-salario-eaes']['2024'], 'ETCL×12': con['pension-altas-sobre-salario-etcl-x12']['2024'], 'Contabilidad Nacional por puesto': con['pension-altas-sobre-salario-cn-puesto']['2024'], 'base media×12': con['pension-altas-sobre-salario-base-media-x12']['2024']}
    sv = {'EAES': con['pension-vigor-sobre-salario-eaes']['2024'], 'ETCL×12': con['pension-vigor-sobre-salario-etcl-x12']['2024'], 'Contabilidad Nacional por puesto': con['pension-vigor-sobre-salario-cn-puesto']['2024'], 'base media×12': con['pension-vigor-sobre-salario-base-media-x12']['2024']}
    reg('A4-reposicion', 'Tasa de reposición teórica de la OCDE para España (2024) frente a cocientes empíricos propios (2024)', 'diferencia',
        f'OCDE bruta: {n(g50, 1)} % (50 % del salario medio), {n(g100, 1)} % (100 %), {n(g200, 1)} % (200 %); neta al 100 %: {n(n100, 1)} %. Propios (pensión media de las altas de jubilación × 14 / salario medio): '
        + '; '.join(f'{k} {n(100 * x, 1)} %' for k, x in sm.items()) + '. Con la pensión media en vigor: ' + '; '.join(f'{k} {n(100 * x, 1)} %' for k, x in sv.items()))
    DISC.append(f'- **Tasa de reposición: OCDE frente a cocientes propios (2024)**: la OCDE publica para España una tasa de reposición teórica bruta de {n(g100, 1)} % al 100 % del salario medio ({n(g50, 1)} % al 50 % y {n(g200, 1)} % al 200 %) y neta de {n(n100, 1)} %, para una carrera completa desde los 22 años con parámetros de 2024. '
                f'El cociente propio entre la pensión media de las altas de jubilación (×14) y el salario medio de la EAES es {n(100 * sm["EAES"], 1)} %, y con la pensión media en vigor, {n(100 * sv["EAES"], 1)} %; con otras definiciones de salario va de {n(100 * min(sm.values()), 1)} % a {n(100 * max(sm.values()), 1)} % (altas). '
                'No son magnitudes comparables sin precisiones: la OCDE modela una carrera completa y un nivel de renta dado, mientras que el cociente propio mezcla colectivos con carreras de duración distinta, mínimos y topes. Los datos no permiten descomponer la diferencia.')
    # edad de jubilación
    reg('A4-edad', 'Edad de jubilación: OCDE (carrera desde los 22) frente a edad ordinaria propia (2025)', 'diferencia',
        'OCDE: 65 años (hombres y mujeres, 2024). Propia: 800 meses (66 años y 8 meses) como edad ordinaria en 2025, y jubilación a los 65 con 459 meses cotizados (38 años y 3 meses); una carrera ininterrumpida desde los 22 hasta los 65 son 516 meses, por lo que ambas cifras responden a carreras distintas')
    DISC.append('- **Edad de jubilación: OCDE frente a datos propios**: la OCDE da 65 años como edad de jubilación actual de quien entra en el mercado laboral a los 22 años (carrera completa); data/parametros da una edad ordinaria de 66 años y 8 meses en 2025 para quien no alcanza 459 meses cotizados (38 años y 3 meses), que permiten jubilarse a los 65. Una carrera ininterrumpida de los 22 a los 65 son 516 meses, por encima de ese umbral: las dos cifras no se contradicen, responden a definiciones distintas.')
    # gasto sobre PIB
    pep = sers['pep-no-aplica-z-z-pt-b1gq']
    eur = series('internacional/eurostat-espana.json')['gasto-old-srv-no-aplica-no-aplica-pc-gdp']
    ar = series('demografia/ageing-report-2024-espana.json')['ageing-report-2024-ii-1-64']
    pro = con['gasto-pensiones-contributivas-sobre-pib']
    a = '2021'
    reg('A4-gasto', f'Gasto en pensiones sobre el PIB de {a}: OCDE, Eurostat, Ageing Report y datos propios', 'diferencia',
        f"OCDE (gasto público en pensiones) {n(pep[a], 1)} %; Eurostat (vejez y supervivencia) {n(eur[a], 1)} %; Ageing Report 2024 (pensiones públicas, 2022) {n(ar['2022'], 1)} %; propio (pensiones contributivas del Sistema, sin Clases Pasivas ni PNC) {n(pro[a], 1)} %")
    DISC.append(f'- **Gasto en pensiones sobre el PIB de {a}**: {n(pep[a], 1)} % (OCDE, gasto público en pensiones), {n(eur[a], 1)} % (Eurostat, prestaciones de vejez y supervivencia), {n(pro[a], 1)} % (propio: «suma de pensiones» contributivas del Sistema de la Seguridad Social, sin Clases Pasivas ni PNC) y {n(ar["2022"], 1)} % en 2022 (Ageing Report 2024, pensiones públicas). '
                'Las diferencias se deben a la delimitación de los regímenes y prestaciones incluidos; los datos descargados no permiten reconciliarlas una a una.')
    # esperanza de vida: OCDE frente a INE
    le = {(x['id']): x for x in json.load(open(f'{D}/internacional/ocde-espana.json'))['data'] if x['id'].startswith('le-')}
    ine65 = series('demografia/esperanza-vida-anual.json')
    oh = [x for k, x in le.items() if 'hombres' in k and k.endswith('2024') and 'y65' in k]
    om = [x for k, x in le.items() if 'mujeres' in k and k.endswith('2024') and 'y65' in k]
    if oh and om:
        dh = 65 + ine65['esperanza-vida-65-hombres']['2024'] - oh[0]['value']
        dm = 65 + ine65['esperanza-vida-65-mujeres']['2024'] - om[0]['value']
        reg('A4-esperanza-vida', 'Esperanza de vida a los 65 años de 2024: OCDE (edad de fallecimiento esperada) frente a INE (65 + e65)', 'diferencia',
            f"hombres: OCDE {n(oh[0]['value'], 1)} frente a INE {n(65 + ine65['esperanza-vida-65-hombres']['2024'], 2)} (diferencia {n(dh, 2)}); mujeres: OCDE {n(om[0]['value'], 1)} frente a INE {n(65 + ine65['esperanza-vida-65-mujeres']['2024'], 2)} (diferencia {n(dm, 2)})")
        DISC.append(f'- **Esperanza de vida a los 65 años de 2024 (OCDE frente a INE)**: la OCDE publica la edad hasta la que se espera vivir a los 65 años ({n(oh[0]["value"], 1)} hombres, {n(om[0]["value"], 1)} mujeres) y el INE, la esperanza de vida a esa edad (65 más {n(ine65["esperanza-vida-65-hombres"]["2024"], 2)} y {n(ine65["esperanza-vida-65-mujeres"]["2024"], 2)} años): diferencias de {n(dh, 2)} y {n(dm, 2)} años. La OCDE no indica en el flujo descargado la fuente de ese dato.')
    # Eurostat: UE-27 y España
    eu = rd('internacional/eurostat-indicadores.csv')
    es25 = [float(r['valor']) for r in eu if r['indicador'] == 'pobreza-o-exclusion' and r['pais'] == 'ESP' and r['edad'] == 'Y_GE65' and r['anio'] == '2025']
    ue25 = [float(r['valor']) for r in eu if r['indicador'] == 'pobreza-o-exclusion' and r['pais'] == 'EU27' and r['edad'] == 'Y_GE65' and r['anio'] == '2025']
    if es25 and ue25:
        reg('A2-arope', 'Riesgo de pobreza o exclusión de mayores de 65 años en 2025 (Eurostat): España y UE-27', 'diferencia', f'España {n(es25[0], 1)} %; UE-27 {n(ue25[0], 1)} %')


def urls():
    d = json.load(open(f'{REPO}/docs/comprobacion-urls.json'))
    c = collections.Counter(r['estado'] for r in d['resultados'])
    malas = [r for r in d['resultados'] if r['estado'] != 'responde']
    reg('C3-urls', f"Muestra de {d['muestra']} URLs de fuentes de /data (comprobada el {d['fecha']})", 'ok' if not [m for m in malas if m['estado'] == 'no responde'] else 'diferencia',
        f"{c['responde']} responden; {c['bloqueada']} bloqueada(s) por límite de peticiones o protección; {c['no responde']} no responde(n)" + (': ' + '; '.join(f"{m['url'][:90]} (HTTP {m['http']}{', ' + m['error'][:60] if m['error'] else ''})" for m in malas) if malas else ''))
    for m in malas:
        DISC.append(f"- **URL de fuente que no responde desde el entorno ({d['fecha']})**: {m['url']} → HTTP {m['http']}{(' (' + m['error'].splitlines()[0][:100] + ')') if m['error'] else ''}.")


def main():
    cruzadas(); contraste_ocde(); urls()
    json.dump(RES, open(f'{REPO}/docs/verificacion-1c.json', 'w'), ensure_ascii=False, indent=1)

    def seccion(ruta, marca, cuerpo):
        ini, fin = f'<!-- {marca}:inicio -->', f'<!-- {marca}:fin -->'
        t = open(ruta, encoding='utf-8').read()
        b = f'{ini}\n{cuerpo}\n{fin}'
        if ini in t:
            t = re.sub(re.escape(ini) + '.*?' + re.escape(fin), lambda m: b, t, flags=re.S)
        else:
            t = t.rstrip('\n') + '\n\n' + b + '\n'
        open(ruta, 'w', encoding='utf-8').write(t)
    c = collections.Counter(r['estado'] for r in RES)
    inf = ['## Fase 1C: comparativa internacional, afirmaciones circulantes y auditoría', '',
           f"Comprobaciones: {len(RES)} ({c['ok']} coinciden, {c['diferencia']} con diferencias explicadas o informativas, {c['fallo']} fallos). Generado por `scripts/etl/verificacion_1c.py`; detalle en `docs/verificacion-1c.json`. La auditoría de los datos está en `docs/AUDITORIA_DATOS.md`.", '',
           '| Comprobación | Resultado | Detalle |', '| --- | --- | --- |']
    inf += [f"| {r['titulo']} | {r['estado']} | {r['detalle'].replace('|', '/')} |" for r in RES]
    seccion(f'{REPO}/docs/INFORME_VERIFICACION.md', 'verificacion-1c', '\n'.join(inf))
    seccion(f'{REPO}/docs/DISCREPANCIAS.md', 'discrepancias-1c', '## Fase 1C\n\n' + '\n'.join(DISC))
    if c['fallo']:
        sys.exit('Hay comprobaciones que fallan')


if __name__ == '__main__':
    main()
