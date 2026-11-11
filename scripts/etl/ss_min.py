"""Pensiones con complemento por mínimos a 1 de diciembre (2022-2025), por régimen, clase y sexo.
Fuente: ficheros MIN de «Pensiones contributivas en vigor» (Seguridad Social). Descarga con
`PREFIJO=MIN python3 -I scripts/etl/ss_descarga_reg.py` o deja el fichero a mano en
data-raw/seg-social/MIN/AAAA.xlsx (modo local). Ejecutar con `python3 -I`."""
import csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, escribe_tabla
from ss_reg import norm, regimen, CLASES, numero

RAW = f'{REPO}/data-raw/seg-social/MIN'
SEXO = {'ambos sexos': 'ambos', 'hombres': 'hombres', 'mujeres': 'mujeres'}


def bloques(ws, magnitudes):
    """Devuelve {(regimen, clase, sexo): [valores por magnitud]} de una hoja con bloques por sexo."""
    out = {}
    sexo = clases = None
    for r in ws.iter_rows(values_only=True):
        c0 = norm(r[0]) if r[0] else ''
        s0 = re.sub(r'\s*\(\*+\)', '', c0).strip()
        if s0 in SEXO:
            sexo = SEXO[s0]
        elif re.match(r'r[eé]g[ií]men', c0):
            clases, cur = {}, None
            for c in range(1, len(r)):
                if r[c] is not None and norm(r[c]) in CLASES:
                    cur = CLASES[norm(r[c])]
                    clases[cur] = c
        elif sexo and clases and c0:
            rg = 'total-sistema' if c0.startswith('total') else regimen(r[0])
            if rg:
                for cl, c in clases.items():
                    out[(rg, cl, sexo)] = [numero(r[c + k]) for k in range(magnitudes)]
    return out


def main():
    origen = json.load(open(f'{RAW}/origen.json'))
    filas = []
    for a in sorted(origen):
        wb = openpyxl.load_workbook(f'{RAW}/{a}.xlsx', read_only=True, data_only=True)
        n1, n2 = ('MIN1', 'MIN2') if 'MIN1' in wb.sheetnames else ('Min_número_%', 'Min_Pmedia_Cmedio')
        nums = bloques(wb[n1], 2)
        pms = bloques(wb[n2], 2)
        for k, (n, p) in nums.items():
            pm, cm = pms.get(k, [None, None])
            filas.append((int(a),) + k + (None if n is None else int(n), None if p is None else round(p * 100, 2),
                                          None if pm is None else round(pm, 2), None if cm is None else round(cm, 2)))
    filas.sort(key=lambda f: tuple(str(x) for x in f[:4]))
    ruta = f'{REPO}/data/sistema/complementos-minimos-regimen-clase-sexo'
    with open(ruta + '.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['anio', 'regimen', 'clase', 'sexo', 'numero', 'porcentaje_sobre_pensiones', 'pension_media_eur_mes', 'complemento_medio_eur_mes'])
        for f in filas:
            w.writerow(['' if x is None else x for x in f])
    fuente = {'title': 'Pensiones contributivas en vigor con complemento por mínimos (número, porcentaje, pensión media y complemento medio)',
              'publisher': 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)',
              'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST24'}
    escribe_tabla('sistema', 'complementos-minimos-regimen-clase-sexo',
        'Pensiones con complemento por mínimos a 1 de diciembre, por régimen, clase y sexo (2022-2025)',
        'Número de pensiones que perciben complemento por mínimos, su porcentaje sobre las pensiones de la misma clase, '
        'pensión media (con complemento) y complemento medio mensual. «ambos» incluye sexo no consta.',
        [('anio', 'Año (1 de diciembre)', None), ('regimen', 'Régimen', None), ('clase', 'Clase de pensión', None),
         ('sexo', 'ambos, hombres o mujeres', None), ('numero', 'Pensiones con complemento por mínimos', 'pensiones'),
         ('porcentaje_sobre_pensiones', 'Porcentaje sobre las pensiones en vigor de esa clase, régimen y sexo', '%'),
         ('pension_media_eur_mes', 'Pensión media de las que reciben complemento', 'euros/mes'),
         ('complemento_medio_eur_mes', 'Complemento medio por mínimos', 'euros/mes')],
        len(filas), fuente, [{'period': a, 'url': origen[a]['url'], 'sha256': origen[a]['sha256']} for a in sorted(origen)],
        notes='Solo hay estadística publicada de complementos por mínimos desde 2022 en la serie descargada; años anteriores en docs/PENDIENTE_DATOS.md. '
              'El gasto en complementos por mínimos no figura aquí: procede del presupuesto (subfase 1B-2).')
    print('filas', len(filas))


if __name__ == '__main__':
    main()
