"""Ejecución del presupuesto del Sistema de la Seguridad Social, acumulada a fin de cada trimestre.

Fuente: ficheros «ResSISTEMA_*» de Resumen Ejecución del Presupuesto (Seguridad Social, Información
Económico Financiera). Cada fichero trae el ejercicio en curso y el mismo periodo del ejercicio
anterior. Modo `descargar` (URL de data-raw/seg-social-fin/indice.json) o `local` (ficheros ya
colocados en data-raw/seg-social-fin/ejecucion/AAAA-MM.xlsx). Escribe la tabla
data/sistema/presupuesto-ss-ejecucion.{csv,json} (millones de euros). Ejecutar con `python3 -I`."""
import csv, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, escribe_tabla

RAW = f'{REPO}/data-raw/seg-social-fin'
MODO = os.environ.get('MODO', 'descargar')
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
HOJAS = {'ResumenPI': 'ingresos', 'ResumenPICap4': 'ingresos-cap1-cap4', 'ResumenPG': 'gastos',
         'ResumenPGCap4': 'gastos-cap4', 'ResumenPGCap4NoCont': 'gastos-cap4-no-contributivas'}
TRIM = {'03': 'T1', '06': 'T2', '09': 'T3', '12': 'T4'}


def limpia(v):
    return re.sub(r'\s+', ' ', str(v)).strip()


def fichero(anio, mes, ix):
    f = f'{RAW}/ejecucion/{anio}-{mes}.xlsx'
    d = ix['ejecucion'][anio][mes]
    nombre = next(n for n in d if n.startswith('ResSISTEMA'))
    if MODO == 'descargar' and not os.path.exists(f):
        os.makedirs(f'{RAW}/ejecucion', exist_ok=True)
        subprocess.run(['curl', '-sSL', '--max-time', '120', '-o', f, d[nombre]['url'] + '?MOD=AJPERES&CONVERT_TO=linktext'], check=True)
    return f, nombre, d[nombre]['url']


def hoja(ws, tabla, ej, periodo, definitivo, filas):
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    # fila de cabecera: la primera cuya columna 0 sea «CLASIFICACIÓN ECONÓMICA»
    h = next(i for i, r in enumerate(rows) if r[0] and 'CLASIFICACI' in limpia(r[0]).upper())
    cabeceras = {}
    for r in rows[h:h + 3]:
        for c, v in enumerate(r):
            t = limpia(v).upper() if v is not None else ''
            if t and c > 0:
                cabeceras.setdefault(t, []).append(c)
    ingreso = 'DERECHOS RECONOCIDOS NETOS' in cabeceras
    nombres = ('PREVISIONES DE INGRESOS', 'DERECHOS RECONOCIDOS NETOS', 'RECAUDACIÓN NETA') if ingreso else ('PRESUPUESTO TOTAL', 'OBLIGACIONES RECONOCIDAS', 'PAGOS REALIZADOS')
    cols = []
    for n in nombres:
        cs = [c for k, v in cabeceras.items() for c in v if k.replace('\n', ' ') == n or k.startswith(n)]
        cols.append(min(cs) if cs else None)
    previo = [c for k, v in cabeceras.items() if re.fullmatch(r'EJERCICIO \d{4}', k) for c in v]
    pc = previo[0] if previo else None
    for r in rows[h + 2:]:
        if not r[0] or not isinstance(r[0], str):
            continue
        concepto = limpia(r[0])
        if concepto.startswith('(*)'):
            continue
        def num(c):
            return r[c] if c is not None and c < len(r) and isinstance(r[c], (int, float)) else None
        prev, reco, pago = (num(c) for c in cols)
        if reco is not None or prev is not None:
            filas.append((ej, periodo, tabla, concepto, 'principal', definitivo, prev, reco, pago))
        if pc is not None:  # columnas del ejercicio anterior: derechos/obligaciones y recaudación/pagos
            a, b = num(pc), num(pc + 1)
            if a is not None:
                filas.append((ej - 1, f'{ej - 1}-{periodo[5:]}', tabla, concepto, 'comparativa', '', None, a, b))


def main():
    ix = json.load(open(f'{RAW}/indice.json'))
    filas, origenes = [], []
    for anio in sorted(ix['ejecucion']):
        for mes in sorted(ix['ejecucion'][anio]):
            if mes not in TRIM:
                continue
            f, nombre, url = fichero(anio, mes, ix)
            if not os.path.exists(f):
                continue
            definitivo = 'sí' if 'Definitivo' in nombre else 'no'
            wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
            for h, tabla in HOJAS.items():
                if h in wb.sheetnames:
                    hoja(wb[h], tabla, int(anio), f'{anio}-{TRIM[mes]}', definitivo, filas)
            origenes.append({'period': f'{anio}', 'url': url, 'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest()})
    # una fila por (ejercicio, periodo, tabla, concepto): se prefiere la columna principal
    por = {}
    for fila in filas:
        k = fila[:4]
        if k not in por or fila[4] == 'principal':
            por[k] = fila
    con_principal = {(f[0], f[1], f[2]) for f in por.values() if f[4] == 'principal'}
    # una comparativa solo se conserva si no hay fichero principal de ese ejercicio, periodo y tabla (evita duplicar con otro rótulo)
    out = sorted((f for f in por.values() if f[4] == 'principal' or (f[0], f[1], f[2]) not in con_principal), key=lambda x: (x[0], x[1], x[2]))
    with open(f'{REPO}/data/sistema/presupuesto-ss-ejecucion.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['ejercicio', 'periodo', 'tabla', 'concepto', 'columna', 'definitivo', 'prevision_o_presupuesto_meur', 'derechos_u_obligaciones_meur', 'recaudacion_o_pagos_meur'])
        for fila in out:
            w.writerow(['' if x is None else x for x in fila])
    fuente = {'title': 'Resumen Ejecución del Presupuesto de la Seguridad Social (Sistema de la Seguridad Social)', 'publisher': SS,
              'url': 'https://www.seg-social.es/wps/portal/wss/internet/InformacionEconomicoFinanciera/393/394'}
    escribe_tabla('sistema', 'presupuesto-ss-ejecucion',
        'Ejecución del presupuesto del Sistema de la Seguridad Social, acumulada a fin de trimestre (2018 en adelante), en millones de euros',
        'Ingresos (derechos reconocidos netos y recaudación) y gastos (obligaciones reconocidas y pagos) del Sistema de la Seguridad Social por clasificación económica, '
        'acumulados hasta fin de marzo (T1), junio (T2), septiembre (T3) y diciembre (T4; T4 es el año completo). «ingresos» y «gastos» son los capítulos; las demás tablas desarrollan el capítulo 4 (transferencias corrientes, con las pensiones por clase) y el capítulo 1 de ingresos. '
        '«columna»: «principal» es el ejercicio del propio fichero; «comparativa» es el mismo periodo del ejercicio anterior tal como figura en el fichero del año siguiente (solo si no hay fichero principal). '
        '«definitivo»: «sí» si el fichero se titula «Definitivo». Los conceptos conservan los nombres de la fuente, que cambian entre años (por ejemplo, partidas derivadas de la DANA en 2024-2025).',
        [('ejercicio', 'Ejercicio presupuestario', None), ('periodo', 'Periodo de cierre de la ejecución acumulada (AAAA-T1..T4)', None), ('tabla', 'ingresos, ingresos-cap1-cap4, gastos, gastos-cap4 o gastos-cap4-no-contributivas', None),
         ('concepto', 'Concepto de la clasificación económica, tal como lo nombra la fuente', None), ('columna', 'principal o comparativa', None), ('definitivo', 'sí o no (fichero «Definitivo»); vacío en las comparativas', None),
         ('prevision_o_presupuesto_meur', 'Previsiones de ingresos (ingresos) o presupuesto total (gastos)', 'millones de euros'),
         ('derechos_u_obligaciones_meur', 'Derechos reconocidos netos (ingresos) u obligaciones reconocidas (gastos)', 'millones de euros'),
         ('recaudacion_o_pagos_meur', 'Recaudación neta (ingresos) o pagos realizados (gastos)', 'millones de euros')],
        len(out), fuente, origenes, confidence='alta',
        notes='En los ficheros de 2018 el cierre de diciembre no es «Definitivo». Las cifras de los ficheros mensuales pueden revisarse en los siguientes; cada fila procede del fichero indicado en «origenes».')
    print('filas', len(out), 'ficheros', len(origenes))


if __name__ == '__main__':
    main()
