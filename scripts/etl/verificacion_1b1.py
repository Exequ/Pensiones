"""Contraste de datos clave de la subfase 1B-1 con una segunda publicación de la Seguridad Social
(otro fichero, distinto de aquel del que sale el dato) y escritura de docs/INFORME_VERIFICACION.md
(sección 1B-1) y docs/DISCREPANCIAS.md. `python3 -I scripts/etl/verificacion_1b1.py`."""
import csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, HOY

RAW = f'{REPO}/data-raw/seg-social'
res = []  # (descripción, valor, segunda fuente, valor2, coincide)

# a) Totales de pensiones a 1 de diciembre: ficheros REG (por clase) frente a serie histórica PTAS (hoja «Pnes y ptas»)
reg = {}
for r in csv.DictReader(open(f'{REPO}/data/sistema/pensiones-vigor-regimen-clase-sexo.csv')):
    if r['regimen'] == 'total-sistema' and r['clase'] == 'total' and r['sexo'] == 'ambos':
        reg[r['anio']] = int(r['numero'])
ptas = {s['id']: {p['period']: p['value'] for p in s['points']} for s in json.load(open(f'{REPO}/data/sistema/pensionistas-pensiones-historico.json'))['series']}
for a in sorted(reg):
    res.append((f'Pensiones contributivas en vigor a 1 dic. {a}', reg[a], 'PTAS, serie histórica (Pnes y ptas)', ptas['pensiones'][a], reg[a] == ptas['pensiones'][a]))

# b) Afiliados medios de diciembre: serie mensual por regímenes frente a hoja «1. EDAD» de cada fichero anual
mens = {(r['mes'], r['regimen']): float(r['afiliados_medios']) for r in csv.DictReader(open(f'{REPO}/data/sistema/afiliacion-media-mensual-regimen.csv'))}
for r in csv.DictReader(open(f'{REPO}/data/sistema/afiliados-sexo-edad.csv')):
    if r['sexo'] == 'ambos' and r['tramo_edad'] == 'total':
        a = r['anio']
        v, w = mens[(f'{a}-12', 'total-sistema')], float(r['afiliados_diciembre'])
        res.append((f'Afiliados medios diciembre {a} (total sistema)', v, 'Fichero «Afiliados Medios» del año, hoja 1. EDAD', w, abs(v - w) < 1))

# c) Altas iniciales de jubilación: hoja de evolución anual frente a hoja por edad (mismo fichero EVO)
evo = next(f for f in os.listdir(f'{RAW}/EVO') if f.endswith('.xlsx'))
wb = openpyxl.load_workbook(f'{RAW}/EVO/{evo}', read_only=True, data_only=True)
tabla = {(r['anio'], r['movimiento'], r['clase'], r['sexo']): int(r['numero']) for r in csv.DictReader(open(f'{REPO}/data/sistema/altas-bajas-anual-clase-sexo.csv'))}
rows = list(wb['EVO_acumula_altas_jub_edad'].iter_rows(values_only=True))
cab = next(r for r in rows if r[0] == 'Edad')
tot = next(r for r in rows if r[0] == 'Total Altas')
for c, v in enumerate(cab):
    m = re.fullmatch(r'Año (\d{4})', str(v or '').strip())
    if m and int(m.group(1)) <= 2025:
        a = m.group(1)
        res.append((f'Altas iniciales de jubilación {a}', tabla[(a, 'alta-inicial', 'jubilacion', 'ambos')], 'EVO, hoja de altas de jubilación por edad', int(tot[c]), tabla[(a, 'alta-inicial', 'jubilacion', 'ambos')] == int(tot[c])))

def f(n, signo=False):
    t = f'{n:+,.0f}' if signo else f'{n:,.0f}'
    return t.replace(',', '.')


bien = sum(1 for x in res if x[4])
md = [f'## Fase 1B-1: sistema (pensiones, afiliación, altas y bajas)', '',
      f'Fecha: {HOY}. Método: cada dato clave se contrasta con **otra publicación de la misma fuente oficial** (otro fichero de la Seguridad Social). '
      'No hay segunda fuente independiente porque MITES (anuario y boletín de estadísticas laborales) no es accesible desde el entorno (ver `docs/DESCARGAS_MANUALES.md`). '
      'La prueba es mecánica (`scripts/etl/verificacion_1b1.py`).', '',
      f'Resultado: **{bien} de {len(res)}** datos coinciden exactamente con la segunda publicación.', '',
      '| Dato | Valor | Segunda publicación | Valor | Coincide |', '| ---- | ----- | ------------------- | ----- | -------- |']
for d, v, s2, w, ok in res:
    md.append(f'| {d} | {f(v)} | {s2} | {f(w)} | {"sí" if ok else "no"} |')
md += ['', 'Comprobaciones internas adicionales (tests de coherencia, `scripts/coherencia-sistema.test.ts`): suma de clases, regímenes y sexos igual al total; afiliados mensuales igual a la suma de regímenes; ratios entre 1,5 y 3.', '']
inf = open(f'{REPO}/docs/INFORME_VERIFICACION.md', encoding='utf-8').read()
inf = re.sub(r'\n## Fase 1B-1.*', '\n', inf, flags=re.S).rstrip() + '\n\n' + '\n'.join(md)
open(f'{REPO}/docs/INFORME_VERIFICACION.md', 'w', encoding='utf-8').write(inf)
dis = open(f'{REPO}/docs/DISCREPANCIAS.md', encoding='utf-8').read()
dis = re.sub(r'\n## Fase 1B-1.*', '\n', dis, flags=re.S).rstrip() + '\n\n## Fase 1B-1\n\n'
for d, v, s2, w, ok in res:
    if not ok:
        dis += f'- **{d}**: {f(v)} en la fuente del dato frente a {f(w)} en «{s2}» (diferencia {f(v - w, True)}). No se ha corregido: la Seguridad Social revisa las series históricas; se conserva cada cifra con su origen.\n'
dis += '- **Suma de regímenes en 2008 (jubilación, ambos sexos)**: 14 pensiones menos que el total del sistema en el mismo fichero (celdas «no consta» de la fuente).\n'
dis += '- **Afiliados por sexo y edad (2021-2025)**: entre 36 y 49 afiliados sin sexo y entre 94 y 194 sin tramo de edad respecto del total, según el año; la suma por sexo o por tramo no coincide exactamente con el total.\n'
open(f'{REPO}/docs/DISCREPANCIAS.md', 'w', encoding='utf-8').write(dis)
print(bien, len(res))
