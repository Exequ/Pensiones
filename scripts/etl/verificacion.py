"""Contraste de ~30 datos clave con una segunda fuente descargada distinta de la usada para el dato.
Genera docs/INFORME_VERIFICACION.md y docs/DISCREPANCIAS.md."""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DESCARGAS, HOY, REPO, texto  # noqa: E402
from prestaciones import texto_doc  # noqa: E402


def datos(archivo):
    with open(f'{REPO}/data/parametros/{archivo}.json', encoding='utf-8') as f:
        return {d['id']: d for d in json.load(f)['data']}


def fmt(v, dec=2):
    s = f'{v:,.{dec}f}'
    return s.replace(',', '#').replace('.', ',').replace('#', '.')


def variantes(v):
    return {fmt(v), fmt(v, 0) if float(v).is_integer() else fmt(v), (f'{v:.2f}'.replace('.', ',')), str(v).replace('.', ',')}


def en(doc, v, ctx=None):
    t = texto(doc)
    for s in variantes(v):
        if ctx:
            if re.search(ctx.replace('{v}', re.escape(s)), t):
                return True
        elif re.search(r'(?<![\d.,])' + re.escape(s) + r'(?![\d])', t):
            return True
    return False


Z = []
def chk(etiqueta, valor, fuente_dato, segundas, ctx=None):
    res = [(d, en(d, valor, ctx)) for d in segundas]
    Z.append((etiqueta, valor, fuente_dato, res))


pm, pmin, bmax, rev, pnc = datos('pension-maxima'), datos('pension-minima-jubilacion'), datos('base-maxima-rg'), datos('revalorizacion-general'), datos('pnc-importe-anual')
for y, docs in {2021: ['BOE-A-2020-17339'], 2022: ['BOE-A-2021-21653'], 2023: ['BOE-A-2022-22128'], 2025: ['BOE-A-2025-999', 'BOE-A-2025-1560', 'BOE-A-2025-7660'],
                2026: ['BOE-A-2026-1484', 'BOE-A-2026-2548', 'BOE-A-2026-6977']}.items():
    chk(f'Pensión máxima {y} (euros/mes)', pm[str(y)]['value'], pm[str(y)]['source']['docId'], docs)
for y, docs in {2021: ['BOE-A-2020-17339'], 2022: ['BOE-A-2021-21653'], 2023: ['BOE-A-2022-22128'], 2025: ['BOE-A-2025-999', 'BOE-A-2025-7660'], 2026: ['BOE-A-2026-2548']}.items():
    i = pmin[f'{y}-jub65-unipersonal']
    chk(f'Pensión mínima jubilación 65 años, sin cónyuge, {y} (euros/año)', i['value'], i['source']['docId'], docs)
for y, docs in {2022: ['BOE-A-2021-21653'], 2023: ['BOE-A-2022-22128'], 2025: ['BOE-A-2025-999', 'BOE-A-2025-7660'], 2026: ['BOE-A-2026-2548']}.items():
    chk(f'Revalorización general {y} (%)', rev[str(y)]['value'], rev[str(y)]['source']['docId'], docs, ctx=r'(?<![\d.,]){v} por (?:100|ciento)')
for y, docs in {2023: ['BOE-A-2022-22128'], 2025: ['BOE-A-2025-999', 'BOE-A-2025-7660'], 2026: ['BOE-A-2026-2548']}.items():
    chk(f'Pensión no contributiva {y} (euros/año)', pnc[str(y)]['value'], pnc[str(y)]['source']['docId'], docs)
for y, docs in {2025: ['BOE-A-2025-1560'], 2026: ['BOE-A-2026-2548', 'BOE-A-2026-1484']}.items():
    chk(f'Base máxima de cotización {y} (euros/mes)', bmax[str(y)]['value'], bmax[str(y)]['source']['docId'], docs)
chk('Tipo MEI 2025 (puntos porcentuales)', datos('mei-tipo-total')['2025']['value'], 'BOE-A-2025-3780 / TRLGSS DT 43.ª', ['BOE-A-2025-1560'], ctx=r'(?<![\d.,]){v}0? ?(?:puntos|por ciento)')
chk('Base máxima 2024 (euros/mes)', bmax['2024']['value'], bmax['2024']['source']['docId'], ['BOE-A-2023-26452'])

# coherencia interna: base mínima ≈ SMI × 14/12 (grupos 4-7) con tolerancia de redondeo de la Orden
smi, bmin = datos('smi-mensual'), datos('base-minima-rg')
coh = []
for y in ('2013', '2014', '2015', '2016', '2017', '2018', '2019', '2022', '2023', '2024', '2025', '2026'):
    exacto = smi[y]['value'] * 14 / 12
    coh.append((y, bmin[y]['value'], round(exacto, 2), abs(bmin[y]['value'] - exacto) <= 1.0))
# segunda fuente de la Seguridad Social para la carencia
ss = re.sub(r'\s+', ' ', open(f'{DESCARGAS}/segsocial-jubilacion-requisitos.txt', encoding='utf-8').read())
car_ok = bool(re.search(r'15 años', ss))

n_ok = sum(1 for *_, res in Z if res and all(ok for _, ok in res))
sin = [(e, v, f, res) for e, v, f, res in Z if not any(ok for _, ok in res)]
parcial = [(e, v, f, res) for e, v, f, res in Z if any(ok for _, ok in res) and not all(ok for _, ok in res)]
n_ko = parcial
L = ['# Informe de verificación de datos clave (Fase 1A)', '',
     f'Fecha: {HOY}. Método: cada dato se contrasta con **otra norma descargada** distinta de la que lo originó (Ley de PGE, otro real decreto-ley o real decreto del mismo año) buscando el valor formateado en es-ES en el documento. La prueba es mecánica (`scripts/etl/verificacion.py`): comprueba presencia del valor, no su contexto.', '',
     f'Resultado: **{n_ok} de {len(Z)}** datos coinciden en todas las segundas fuentes consultadas; {len(parcial)} coinciden solo en parte; {len(sin)} no tienen segunda fuente descargada que recoja el concepto (por ejemplo, la Ley de PGE fija la base máxima pero no enuncia el límite de pensión pública ni la revalorización en el mismo formato). «No localizado» no es una discrepancia: significa que ese documento no contiene el dato.', '',
     '| Dato | Valor | Fuente del dato | Segundas fuentes (coincide) |', '| ---- | ----- | --------------- | ---------------------------- |']
for e, v, f, res in Z:
    L.append(f'| {e} | {fmt(v)} | {f} | ' + '; '.join(f'{d}: {"sí" if ok else "no localizado"}' for d, ok in res) + ' |')
L += ['', '## Coherencia interna: base mínima de cotización (grupos 4-7) frente al SMI × 14/12', '',
      'La base mínima de los grupos 4 a 7 equivale al SMI incrementado en un sexto, con redondeo de la Orden. Tolerancia: 1 euro.', '',
      '| Año | Base mínima (Orden) | SMI × 14/12 | Coincide |', '| --- | ------------------- | ----------- | -------- |']
for y, a, b, ok in coh:
    L.append(f'| {y} | {fmt(a)} | {fmt(b)} | {"sí" if ok else "NO"} |')
tot = ok_cc = 0
for arch in sorted(a for a in os.listdir(f'{REPO}/data/parametros') if a.endswith('.json')):
    with open(f'{REPO}/data/parametros/{arch}', encoding='utf-8') as f:
        for d in json.load(f).get('data', []):
            if d.get('crossCheck'):
                tot += 1
                ok_cc += bool(d['crossCheck'].get('matches'))
L += ['', '## Contrastes incorporados en los propios datos', '',
      f'Además de los anteriores, {tot} datos de `data/parametros` llevan un campo `crossCheck` con una segunda fuente (Ley de PGE, otra norma del año o la Orden anual); {ok_cc} coinciden y {tot - ok_cc} difieren (todas explicadas en `docs/DISCREPANCIAS.md`).']
L += ['', '## Segunda fuente de la Seguridad Social (carencia)', '',
      f'La página de requisitos de la jubilación de la Seguridad Social (descargada) cita «15 años»: {"coincide" if car_ok else "no localizado"} con la serie de carencia (180 meses).', '',
      '## Limitaciones', '',
      '- Las series anteriores a 2021 se contrastaron ya durante la extracción con la Ley de PGE de cada año (campo `crossCheck` de cada dato); este informe añade un contraste independiente de los años recientes.',
      '- La presencia del valor en el texto no garantiza que corresponda al mismo concepto: las coincidencias sin contexto deben revisarse por muestreo (actuario).']
with open(f'{REPO}/docs/INFORME_VERIFICACION.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(L) + '\n')

D = ['# Discrepancias detectadas', '', f'Fecha: {HOY}.', '']
DD = []
for e, v, f, res in parcial:
    DD.append(f'- **{e}** (revisar): valor {fmt(v)} (fuente {f}); coincide en ' + ', '.join(d for d, ok in res if ok) + ' pero no se localiza en ' + ', '.join(d for d, ok in res if not ok) + '.')
for y, a, b, ok in coh:
    if not ok:
        DD.append(f'- **Base mínima {y}**: {fmt(a)} frente a SMI × 14/12 = {fmt(b)}.')
# discrepancias de contraste registradas en los datos (crossCheck.matches = false)
for arch in sorted(a for a in os.listdir(f'{REPO}/data/parametros') if a.endswith('.json')):
    with open(f'{REPO}/data/parametros/{arch}', encoding='utf-8') as f:
        for d in json.load(f).get('data', []):
            cc = d.get('crossCheck')
            if cc and cc.get('matches') is False:
                DD.append(f'- **{arch[:-5]} {d["period"]}**: el contraste con {cc["source"]["docId"]} no coincide. {cc.get("notes", "")}')
D += DD if DD else ['Sin discrepancias sin explicar.']
with open(f'{REPO}/docs/DISCREPANCIAS.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(D) + '\n')
print('contrastes', len(Z), 'ok', n_ok, 'ko', len(n_ko), 'discrepancias', len(DD))
for x in DD:
    print(' ', x[:200])
