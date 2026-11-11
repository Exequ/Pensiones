"""Pensiones contributivas en vigor por grupo de edad, clase y sexo (total sistema), foto del
mes más reciente publicado (fichero ED). Fuente: Seguridad Social, «Pensiones contributivas en
vigor. Por edades». Modo `descargar` (URL en data-raw/seg-social/indice.json) o `local`
(data-raw/seg-social/ED/AAAAMM.xlsx). Ejecutar con `python3 -I`."""
import csv, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, escribe_tabla
from ss_reg import norm, CLASES, SEXOS, numero

RAW = f'{REPO}/data-raw/seg-social/ED'
MODO = os.environ.get('MODO', 'descargar')
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'


def fichero():
    ix = json.load(open(f'{REPO}/data-raw/seg-social/indice.json'))['2026']
    nombre = next(n for n in ix if re.fullmatch(r'ED\d{6}\.xlsx', n))
    mes = nombre[2:8]
    f = f'{RAW}/{mes}.xlsx'
    os.makedirs(RAW, exist_ok=True)
    if MODO == 'descargar' and not os.path.exists(f):
        subprocess.run(['curl', '-sS', '--max-time', '90', '-o', f, ix[nombre]['url'] + '?MOD=AJPERES&CONVERT_TO=linktext'], check=True)
    return f, mes, ix[nombre]['url']


def bloques(ws):
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    out, i = [], 0
    while i < len(rows):
        r = rows[i]
        if r[0] and norm(r[0]) == 'grupo de edad':
            cl, cur = {}, None
            for c in range(1, len(r)):
                if r[c] is not None and norm(r[c]) in CLASES:
                    cur = CLASES[norm(r[c])]
                cl[c] = cur
            sx = {c: SEXOS[norm(v)] for c, v in enumerate(rows[i + 1]) if c > 0 and v is not None and norm(v) in SEXOS}
            j = i + 3  # cabecera, sexos, unidades
            while j < len(rows) and rows[j][0] is not None and norm(rows[j][0]) != 'grupo de edad':
                et = str(rows[j][0]).strip()
                if not et.lower().startswith('edad media'):
                    for c, s in sx.items():
                        if cl.get(c):
                            out.append((et, cl[c], s, numero(rows[j][c]), numero(rows[j][c + 1])))
                j += 1
            i = j
        else:
            i += 1
    return out


def main():
    f, mes, url = fichero()
    sha = hashlib.sha256(open(f, 'rb').read()).hexdigest()
    ws = openpyxl.load_workbook(f, read_only=True, data_only=True)['Edades_Total sistema']
    filas = []
    for et, cl, s, n, pm in bloques(ws):
        if n is None and pm is None:
            continue
        etq = {'total': 'total', 'no consta': 'no-consta'}.get(et.lower(), re.sub(r'\s*-\s*', '-', et.lower()).replace(' ', '-'))
        filas.append((f'{mes[:4]}-{mes[4:]}', etq, cl, s, '' if n is None else int(n), '' if pm is None else round(pm, 2)))
    with open(f'{REPO}/data/sistema/pensiones-vigor-edad-clase-sexo.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['mes', 'grupo_edad', 'clase', 'sexo', 'numero', 'pension_media_eur_mes'])
        w.writerows(filas)
    fuente = {'title': 'Pensiones contributivas en vigor: por edades (total sistema)', 'publisher': SS,
              'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST24'}
    escribe_tabla('sistema', 'pensiones-vigor-edad-clase-sexo',
        f'Pensiones contributivas en vigor a 1 de {mes[4:]}/{mes[:4]} por grupo de edad, clase y sexo (total sistema)',
        'Número de pensiones y pensión media mensual por grupo de edad quinquenal del pensionista, clase de pensión y sexo, a la fecha indicada. '
        '«ambos» es la columna «Ambos sexos» de la fuente (incluye sexo no consta). Foto de un único mes: el portal solo publica por edades el mes más reciente.',
        [('mes', 'Mes de la foto (AAAA-MM), pensiones a día 1', None), ('grupo_edad', 'Grupo de edad (0-4, 5-9, …, total, no-consta)', None),
         ('clase', 'total, incapacidad, jubilacion, viudedad, orfandad o favor-familiares', None), ('sexo', 'ambos, hombres o mujeres', None),
         ('numero', 'Número de pensiones en vigor', 'pensiones'), ('pension_media_eur_mes', 'Pensión media mensual', 'euros/mes')],
        len(filas), fuente, [{'period': mes[:4], 'url': url, 'sha256': sha}],
        notes='Solo un mes (el último publicado): el histórico por edades no está en el portal (ver docs/PENDIENTE_DATOS.md). La edad es la del pensionista en la fecha, no la de acceso a la pensión.')
    print('filas', len(filas), mes)


if __name__ == '__main__':
    main()
