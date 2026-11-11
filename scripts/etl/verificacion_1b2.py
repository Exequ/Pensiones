"""Contraste de datos clave de la subfase 1B-2 con una segunda publicación y escritura de las secciones
de docs/INFORME_VERIFICACION.md y docs/DISCREPANCIAS.md.

a) Ejecución a diciembre (fichero «Resumen Ejecución») frente a la liquidación del presupuesto (fichero 99SISTEMA, otra
   publicación de la misma Seguridad Social), 2020-2024.
b) Fondo de Reserva: coincidencia entre los informes a las Cortes que se solapan (comprobada al generar los datos).
c) Eurostat: B.9 = ingresos − gastos.
d) Pensiones por edad frente al fichero REG del mismo mes.
Los ficheros de la liquidación (xls) se descargan con curl y se convierten con LibreOffice (`soffice --headless --convert-to xlsx`)
a data-raw/seg-social-fin/liquidacion/AAAA.xlsx; en modo local basta con dejarlos ahí. `python3 -I`."""
import csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, HOY
from ss_reg import filas_anio

RAW = f'{REPO}/data-raw/seg-social-fin/liquidacion'
res = []  # (descripción, valor, segunda publicación, valor 2, coincide, tolerancia)


def f(n, dec=0):
    return f'{n:,.{dec}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def liquidacion(anio):
    wb = openpyxl.load_workbook(f'{RAW}/{anio}.xlsx', read_only=True, data_only=True)
    out = {}
    for ws in wb.worksheets:
        rows = [[c for c in r] for r in ws.iter_rows(max_col=8, values_only=True)]
        txt = ' '.join(str(c) for r in rows[:20] for c in r if c).upper()
        ingr = ws.title.strip() == 'CAP-INGR.01'  # previsiones y derechos reconocidos netos
        gast = ws.title == 'CAP-GTOS'  # presupuesto inicial, modificaciones, total y obligaciones reconocidas
        if not (ingr or gast):
            continue
        # columna de derechos reconocidos netos / obligaciones reconocidas: 2.ª o 4.ª numérica de la fila
        for r in rows:
            lab = next((str(c).strip() for c in r[:3] if isinstance(c, str) and c.strip()), '')
            nums = [c for c in r if isinstance(c, (int, float))]
            if not lab or len(nums) < 2:
                continue
            if ingr and 'PREVISIONES' not in txt[:0]:
                valor = nums[1] if len(nums) >= 2 else None  # previsiones, derechos
                if re.match(r'1\. COTIZACIONES SOCIALES', lab.upper()): out.setdefault('cotizaciones', valor)
                if re.match(r'4\. TRANSFERENCIAS CORRIENTES', lab.upper()): out.setdefault('transf_ing', valor)
                if re.match(r'9\. PASIVOS FINANCIEROS', lab.upper()): out.setdefault('pasivos', valor)
                if lab.upper().startswith('SISTEMA DE LA SEGURIDAD SOCIAL'): out.setdefault('total_ing', valor)
            if gast:
                valor = nums[3] if len(nums) >= 4 else None  # inicial, modif., total, obligaciones
                if re.match(r'4\. TRANSFERENCIAS CORRIENTES', lab.upper()): out.setdefault('transf_gas', valor)
                if lab.upper().startswith('SISTEMA DE LA SEGURIDAD SOCIAL'): out.setdefault('total_gas', valor)
    return out


def main():
    ej = {(x['ejercicio'], x['tabla'], x['concepto']): float(x['derechos_u_obligaciones_meur']) for x in csv.DictReader(open(f'{REPO}/data/sistema/presupuesto-ss-ejecucion.csv'))
          if x['periodo'].endswith('T4') and x['derechos_u_obligaciones_meur'] != ''}
    mapa = [('cotizaciones', 'ingresos', '1. COTIZACIONES SOCIALES', 'Cotizaciones sociales (derechos reconocidos netos)'),
            ('transf_ing', 'ingresos', '4. TRANSFERENCIAS CORRIENTES', 'Transferencias corrientes, ingresos (derechos reconocidos netos)'),
            ('pasivos', 'ingresos', '9. PASIVOS FINANCIEROS', 'Pasivos financieros, ingresos (derechos reconocidos netos)'),
            ('total_ing', 'ingresos', 'TOTAL INGRESOS', 'Total ingresos (derechos reconocidos netos)'),
            ('transf_gas', 'gastos', '4. TRANSFERENCIAS CORRIENTES', 'Transferencias corrientes, gastos (obligaciones reconocidas)'),
            ('total_gas', 'gastos', 'TOTAL GASTOS', 'Total gastos (obligaciones reconocidas)')]
    for a in range(2020, 2025):
        liq = liquidacion(a)
        for k, tabla, concepto, desc in mapa:
            v = ej.get((str(a), tabla, concepto))
            w = liq.get(k)
            if v is None or w is None:
                res.append((f'{desc}, {a}', v, 'Liquidación del presupuesto (99SISTEMA)', w, False, 'no localizado'))
            else:
                res.append((f'{desc}, {a}', v, 'Liquidación del presupuesto (99SISTEMA)', w, abs(v - w) < 0.5, '±0,5 M€'))
    # d) pensiones por edad frente a REG del mismo mes
    reg = {(x[2]): x[4] for x in filas_anio('202610') if x[1] == 'total-sistema' and x[3] == 'ambos'}
    for r in csv.DictReader(open(f'{REPO}/data/sistema/pensiones-vigor-edad-clase-sexo.csv')):
        if r['grupo_edad'] == 'total' and r['sexo'] == 'ambos':
            res.append((f'Pensiones en vigor octubre 2026, por edad, clase «{r["clase"]}», total', int(r['numero']), 'Fichero REG del mismo mes (por clase)', int(reg[r['clase']]), int(r['numero']) == int(reg[r['clase']]), 'exacta'))
    # c) Eurostat B9 = TR - TE (26 años)
    e = {s['id']: {p['period']: p['value'] for p in s['points']} for s in json.load(open(f'{REPO}/data/sistema/deficit-sec-fondos-seguridad-social.json'))['series']}
    bien_e = sum(1 for a in e['b9-mio-eur'] if abs(e['tr-mio-eur'][a] - e['te-mio-eur'][a] - e['b9-mio-eur'][a]) <= 1)
    res.append(('Eurostat S.1314: B.9 = ingresos totales − gastos totales (26 años, 2000-2025)', bien_e, 'Series TR y TE del mismo conjunto', len(e['b9-mio-eur']), bien_e == len(e['b9-mio-eur']), '±1 M€'))
    bien = sum(1 for x in res if x[4])
    md = ['## Fase 1B-2: financiación', '',
          f'Fecha: {HOY}. Método: cada dato clave se contrasta con **otra publicación** de la misma fuente oficial (la liquidación del presupuesto frente a la ejecución a diciembre; el fichero REG frente a la tabla por edades; la identidad B.9 = TR − TE de Eurostat). '
          'No hay segunda fuente independiente: la IGAE, la AIReF y Hacienda no son accesibles desde el entorno (`docs/DESCARGAS_MANUALES.md`). '
          'Además, el Fondo de Reserva se genera cruzando tres informes a las Cortes que se solapan (2017 en los tres; 2018-2024 en dos) y el proceso falla si alguna cifra difiere: no hubo diferencias.', '',
          f'Resultado: **{bien} de {len(res)}** contrastes coinciden.', '',
          '| Dato | Valor | Segunda publicación | Valor | Coincide |', '| ---- | ----- | ------------------- | ----- | -------- |']
    for d, v, s2, w, ok, tol in res:
        md.append(f'| {d} | {f(v, 2) if isinstance(v, float) else (f(v) if v is not None else "—")} | {s2} | {f(w, 2) if isinstance(w, float) else (f(w) if w is not None else "—")} | {"sí" if ok else "no (" + tol + ")"} |')
    md += ['', 'Comprobaciones internas adicionales (`scripts/coherencia-financiacion.test.ts`): ingresos y gastos igual a la suma de operaciones, cotizaciones por régimen igual al total, pensiones por clase igual a «SUMA DE PENSIONES», acumulados trimestrales crecientes, valor del Fondo igual a dotaciones + rendimientos + disposiciones, pasivos financieros igual al importe autorizado por las leyes de PGE de 2021-2023 y razón entre gasto en pensiones y número × pensión media × 14.', '']
    p = f'{REPO}/docs/INFORME_VERIFICACION.md'
    inf = open(p, encoding='utf-8').read()
    inf = re.sub(r'\n## Fase 1B-2.*?(?=\n## |\Z)', '\n', inf, flags=re.S).rstrip() + '\n\n' + '\n'.join(md)
    open(p, 'w', encoding='utf-8').write(inf)
    p = f'{REPO}/docs/DISCREPANCIAS.md'
    dis = open(p, encoding='utf-8').read()
    dis = re.sub(r'\n## Fase 1B-2.*?(?=\n## |\Z)', '\n', dis, flags=re.S).rstrip() + '\n\n## Fase 1B-2\n\n'
    malos = [x for x in res if not x[4]]
    for d, v, s2, w, ok, tol in malos:
        dis += f'- **{d}**: {v} en la fuente del dato frente a {w} en «{s2}» ({tol}).\n'
    dis += ('- **Eurostat, 2000-2001**: el subsector S.1314 incluye la sanidad hasta 2002 (nota de España en los metadatos de Eurostat); la serie no es comparable antes y después de 2002.\n'
            '- **Fondo de Reserva (valor)**: el valor publicado difiere hasta en 1 millón de dotaciones + rendimientos + disposiciones por redondeo de las tablas (comprobado en tests con tolerancia de 2).\n'
            '- **Pasivos financieros 2017-2025**: coinciden con los importes autorizados por las leyes de PGE de 2021, 2022 y 2023; en 2018, 2019, 2024 y 2025 (presupuestos prorrogados) los importes repiten los de 2021 (13.830,09) y 2023 (10.003,81) sin que se haya descargado la norma que los autoriza.\n')
    if not malos:
        dis += '- No hay discrepancias numéricas entre las publicaciones contrastadas.\n'
    open(p, 'w', encoding='utf-8').write(dis)
    print(bien, len(res))
    for x in malos: print('NO', x)


if __name__ == '__main__':
    main()
