"""1B-4 (A): defunciones registradas en España por edad y sexo (INE y Eurostat) y estimación de 2025.

Escribe en data/demografia/: defunciones-edad-sexo (INE, Movimiento Natural de la Población, 1975-2024, por lugar de residencia),
eurostat-defunciones-edad-sexo (demo_magec, edad en años cumplidos), eurostat-defunciones-generacion-sexo (demo_mager, edad alcanzada
en el año = año − año de nacimiento) y defunciones-2025-estimadas (datos). Modo local con MODO=local. Ejecutar con `python3 -I`.
"""
import csv, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, escribe_tabla
from ine import tabla, fuente, meta, _origen
from ine_demografia import edad_de, SEXO, escribe_csv, origenes
import eurostat_ce as ec

OUT = f'{REPO}/data/demografia'


def ine():
    cel = {}
    for s in tabla(6547):
        m = meta(s)
        if m.get('Total Nacional') != 'Total Nacional':
            continue
        ed = 0 if 'Menores' in (m.get('Semiintervalos de edad') or '') else edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            if x['Valor'] is not None:
                cel[(x['Anyo'], SEXO[m['Sexo']], ed)] = x['Valor']
    # contraste con la tabla por nacionalidad (58700), total de nacionalidades
    dif = 0
    n58 = 0
    for s in tabla(58700):
        m = meta(s)
        if m.get('Nacionalidad') != 'Total' or 'Totales de edad' in m:
            continue
        ed = 0 if 'Menores' in (m.get('Semiintervalos de edad') or '') else edad_de(m.get('Valores simples de edad') or m['Semiintervalos de edad'])
        for x in s['Data']:
            k = (x['Anyo'], SEXO[m['Sexo']], ed)
            if x['Valor'] is not None and k in cel:
                n58 += 1
                dif = max(dif, abs(cel[k] - x['Valor']))
    print('INE 6547 frente a 58700 (total nacionalidades):', n58, 'comparaciones, diferencia máxima', dif)
    rows = [[a, sx, ed, int(v)] for (a, sx, ed), v in sorted(cel.items())]
    n = escribe_csv('defunciones-edad-sexo', ['anio', 'sexo', 'edad', 'defunciones'], rows)
    escribe_tabla('demografia', 'defunciones-edad-sexo',
        'Defunciones por año, sexo y edad simple, España (INE, Movimiento Natural de la Población, 1975-2024)',
        'Defunciones de residentes en España por edad en años cumplidos al fallecer (0 = menores de un año; 100 = «100 y más años») y sexo, por año de ocurrencia y lugar de residencia, total nacional. '
        'Es la estadística de la que el INE calcula las tablas de mortalidad. La tabla 58700 (por nacionalidad, 2009-2024) da el mismo total.',
        [('anio', 'Año', None), ('sexo', 'ambos, hombres o mujeres', None), ('edad', 'Edad al fallecer; 0 = menores de un año, 100 = «100 y más»', 'años'), ('defunciones', 'Defunciones', 'personas')],
        n, fuente(6547, 'Movimiento Natural de la Población, defunciones por lugar de residencia, sexo y edad (tabla 6547)'), origenes([6547, 58700]), confidence='alta',
        notes='Resultados definitivos hasta 2024. No hay todavía defunciones definitivas de 2025 (ver defunciones-2025-estimadas).')
    return cel


def eurostat():
    for nombre, idt, ed_col, tit, desc in (
            ('demo_magec_ES', 'eurostat-defunciones-edad-sexo', 'edad', 'Defunciones por edad y sexo, España (Eurostat, demo_magec, 1960-2024)',
             'Defunciones por edad en años cumplidos al fallecer (0 = menores de un año; 100 = «100 y más») y sexo. Los datos son los que el INE envía a Eurostat; las defunciones de edad desconocida (UNK) no se incluyen en las edades.'),
            ('demo_mager_ES', 'eurostat-defunciones-generacion-sexo', 'edad_alcanzada', 'Defunciones por generación (edad alcanzada en el año) y sexo, España (Eurostat, demo_mager, 1960-2024)',
             'Defunciones del año por edad alcanzada en el año (año de ocurrencia menos año de nacimiento; 0 = menores de un año; 100 = «100 y más»), es decir, por año de nacimiento de la persona fallecida, y sexo. '
             'La generación nacida en g y fallecida en el año t tiene edad alcanzada t − g.')):
        d = ec.descarga(nombre)
        rows = []
        for r in ec.filas(d):
            e = ec.edad(r['age'])
            if r['age'] in ('TOTAL', 'UNK') or e is None or r['valor'] is None:
                continue
            rows.append([int(r['time']), ec.SX[r['sex']], e, int(r['valor'])])
        rows.sort()
        n = escribe_csv(idt, ['anio', 'sexo', ed_col, 'defunciones'], rows)
        escribe_tabla('demografia', idt, tit, desc,
            [('anio', 'Año', None), ('sexo', 'ambos, hombres o mujeres', None), (ed_col, 'Edad (0 = menores de un año; 100 = «100 y más»)', 'años'), ('defunciones', 'Defunciones', 'personas')],
            n, ec.src(nombre, desc.split('.')[0]), ec.origenes_eu([nombre]), confidence='alta')
        print(idt, n)


def estimadas_2025():
    """Defunciones de 2025: valor acumulado de la última semana de 2025 de las estimaciones semanales del INE (EDeS)."""
    d = tabla(35177)
    acum = next(s for s in d if s['Nombre'].startswith('Total Nacional. Total. Todas las edades. Acumulado'))
    de25 = [x for x in acum['Data'] if x['Anyo'] == 2025]
    ult = max(de25, key=lambda x: x['Fecha'])
    base = next(s for s in d if s['Nombre'].startswith('Total Nacional. Total. Todas las edades. Dato base'))
    sem = {x['T3_Periodo']: x['Valor'] for x in base['Data'] if x['Anyo'] == 2025}
    print('EDeS 2025: última semana disponible', ult['T3_Periodo'], ult['T3_TipoDato'], ult['Valor'], 'semanas de 2025 en la descarga:', len(sem))
    src = fuente(35177, 'Estimación del número de defunciones semanales (EDeS): defunciones semanales y acumuladas, total nacional (tabla 35177)')
    data = [{'id': 'defunciones-2025-acumuladas-edes', 'value': ult['Valor'], 'unit': 'personas', 'period': '2025', 'source': src, 'fetchedAt': HOY, 'confidence': 'media',
             'notes': f"Defunciones acumuladas a la semana {ult['T3_Periodo']} de 2025 según las estimaciones semanales del INE (tipo de dato «{ult['T3_TipoDato']}»), todas las edades y ambos sexos. No son las defunciones definitivas del Movimiento Natural de la Población, que aún no se publican para 2025. La descarga solo cubre las últimas 60 semanas.",
             'quote': f"Total Nacional. Total. Todas las edades. Acumulado en lo que va de año: {ult['Valor']} ({ult['T3_Periodo']}, {ult['Anyo']})", 'location': 'tabla 35177, serie «Acumulado en lo que va de año»'}]
    out = {'tipo': 'datos', 'id': 'defunciones-2025-estimadas', 'title': 'Defunciones de 2025: estimación semanal del INE (EDeS)', 'description': 'Defunciones totales de 2025 estimadas por el INE a partir de las defunciones semanales (dato provisional de otra estadística que el Movimiento Natural de la Población).', 'data': data}
    json.dump(out, open(f'{OUT}/defunciones-2025-estimadas.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{OUT}/defunciones-2025-estimadas.json', 'a').write('\n')
    return ult


if __name__ == '__main__':
    ine(); eurostat(); estimadas_2025()
