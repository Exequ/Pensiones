"""Fase 5-B1. Convierte las salidas CSV de los modelos propios M1, M2 y M3 (data-raw/modelos-salidas/)
en ficheros JSON de data/proyecciones/ (uno por CSV), con el esquema `ArchivoProyeccion` de
src/engine/esquema-datos.ts.

Qué hace
  - Lee data-raw/modelos-salidas/LEEME.txt: fecha de ejecución, hash del último commit que modifica
    modelos/ y escenario (g, IPC, legislación congelada). Nada se escribe a mano.
  - Calcula el SHA-256 de cada CSV y lo guarda junto a su ruta.
  - Escribe `naturaleza: "proyeccion-de-modelo"`, el escenario, la fuente (URL del script del modelo en
    GitHub, en el commit indicado por el LEEME) y las columnas con su descripción y unidad. Las
    descripciones salen de docs/modelos/Mx_descripcion.md; no se añade nada que ahí no conste.
  - No usa M4 (fase 5-B2) ni modifica los CSV.

Ejecutar desde la raíz del repositorio con `python3 -I scripts/etl/modelos_salidas.py`. Después se
formatea con Prettier (el propio script lo intenta) y se comprueba con `npm run validate:data`.
"""

import csv
import hashlib
import json
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDAS = f'{REPO}/data-raw/modelos-salidas'
DESTINO = f'{REPO}/data/proyecciones'
PUBLICADOR = 'Elaboración propia: modelo de proyección'
URL_REPO = 'https://github.com/Exequ/Pensiones/blob'

ESCENARIO_APLICACION = {
    'm1': 'g e IPC no intervienen en la demografía; las variantes de fecundidad, mortalidad y migración se indican en cada escenario.',
    'm2': 'g e IPC solo cambian los importes (base de cotización y recaudación), no el número de personas.',
    'm3': 'g e IPC no intervienen: el modelo cuenta pensiones, no importes.',
}

HUECO_DEP = 'razón (personas de 65 o más por persona de 16 a 64)'
POBL = 'personas'
PENS = 'pensiones'
PCT = '%'

# Descripciones y unidades (de docs/modelos/M1_descripcion.md, M2_descripcion.md y M3_descripcion.md).
C_ANIO_ENERO = ('anio', 'numero', 'Año (población a 1 de enero)', None)
FICHEROS = [
    {
        'modelo': 'm1', 'csv': 'm1/m1_contraste_ine.csv', 'id': 'm1-contraste-ine', 'confidence': 'media',
        'title': 'M1 · Población proyectada por el modelo frente a la proyección del INE (2026-2076)',
        'description': (
            'Población residente a 1 de enero por grandes grupos de edad, proyectada por el modelo demográfico M1 '
            'con las hipótesis de las proyecciones del INE (edición 2026-2076), junto con los valores de la proyección '
            'del INE con los que el modelo los contrasta y el error. Es un cálculo propio con los supuestos explícitos del INE: '
            'no es una previsión. Lo posterior a 2050 se debe leer como ilustrativo (M1, apartado 6).'
        ),
        'notes': 'Las columnas «_ine» son los valores de la proyección del INE (escenario principal) que usa el modelo como referencia; el error es (modelo − INE) / INE, en %; «err_dep_pp» es la diferencia de la relación de dependencia en puntos porcentuales (modelo − INE, ×100).',
        'columnas': [
            C_ANIO_ENERO,
            ('total_m1', 'numero', 'Población total proyectada por el modelo', POBL),
            ('0_15_m1', 'numero', 'Población de 0 a 15 años proyectada por el modelo', POBL),
            ('16_64_m1', 'numero', 'Población de 16 a 64 años proyectada por el modelo', POBL),
            ('65_mas_m1', 'numero', 'Población de 65 años o más proyectada por el modelo', POBL),
            ('80_mas_m1', 'numero', 'Población de 80 años o más proyectada por el modelo', POBL),
            ('dep_65_m1', 'numero', 'Tasa de dependencia de mayores del modelo (65 o más entre 16 a 64)', HUECO_DEP),
            ('total_ine', 'numero', 'Población total de la proyección del INE', POBL),
            ('0_15_ine', 'numero', 'Población de 0 a 15 años de la proyección del INE', POBL),
            ('16_64_ine', 'numero', 'Población de 16 a 64 años de la proyección del INE', POBL),
            ('65_mas_ine', 'numero', 'Población de 65 años o más de la proyección del INE', POBL),
            ('80_mas_ine', 'numero', 'Población de 80 años o más de la proyección del INE', POBL),
            ('dep_65_ine', 'numero', 'Tasa de dependencia de mayores de la proyección del INE (65 o más entre 16 a 64)', HUECO_DEP),
            ('err_total_%', 'numero', 'Error del modelo en la población total: (modelo − INE) / INE', PCT),
            ('err_65_mas_%', 'numero', 'Error del modelo en la población de 65 años o más: (modelo − INE) / INE', PCT),
            ('err_0_15_%', 'numero', 'Error del modelo en la población de 0 a 15 años: (modelo − INE) / INE', PCT),
            ('err_dep_pp', 'numero', 'Diferencia de la tasa de dependencia de mayores (modelo − INE)', 'puntos porcentuales'),
        ],
    },
    {
        'modelo': 'm1', 'csv': 'm1/m1_backtest.csv', 'id': 'm1-backtest', 'confidence': 'media',
        'title': 'M1 · Prueba hacia atrás (2011-2025): población del modelo frente a la observada',
        'description': (
            'Partiendo de la población de 2010 y con las tasas realmente observadas, el modelo proyecta la población de los años '
            'siguientes; este fichero la compara con la población observada (INE) a 1 de enero. Mide cuánto se aparta el modelo de '
            'lo ocurrido; no mide el acierto de una proyección hacia el futuro (M1, apartado 7).'
        ),
        'notes': 'Los errores son (modelo − observado) / observado, en %.',
        'columnas': [
            C_ANIO_ENERO,
            ('total_m1', 'numero', 'Población total calculada por el modelo', POBL),
            ('total_real', 'numero', 'Población total observada', POBL),
            ('err_total_%', 'numero', 'Error en la población total: (modelo − observado) / observado', PCT),
            ('err_65_mas_%', 'numero', 'Error en la población de 65 años o más', PCT),
            ('err_16_64_%', 'numero', 'Error en la población de 16 a 64 años', PCT),
            ('err_0_15_%', 'numero', 'Error en la población de 0 a 15 años', PCT),
        ],
    },
    {
        'modelo': 'm1', 'csv': 'm1/m1_escenarios.csv', 'id': 'm1-escenarios', 'confidence': 'media',
        'title': 'M1 · Escenarios demográficos (2026, 2035, 2050 y 2076)',
        'description': (
            'Población a 1 de enero por grandes grupos de edad en los escenarios demográficos que calcula M1: la base del INE y variaciones '
            'de la fecundidad, la mortalidad y la migración, en cuatro años de referencia. Son escenarios, no predicciones: cada variación '
            'cambia una sola hipótesis del INE. Lo posterior a 2050 se debe leer como ilustrativo (M1, apartado 6).'
        ),
        'notes': 'Los rótulos de los escenarios son los del CSV. «INE (base)» es el modelo M1 ejecutado con las hipótesis base de las proyecciones del INE (no la proyección publicada del INE, con la que se contrasta en m1-contraste-ine). La columna «dep_65» viene redondeada a tres decimales en el CSV de origen.',
        'columnas': [
            ('escenario', 'texto', 'Escenario demográfico (rótulo del CSV)', None),
            C_ANIO_ENERO,
            ('total', 'numero', 'Población total', POBL),
            ('0_15', 'numero', 'Población de 0 a 15 años', POBL),
            ('16_64', 'numero', 'Población de 16 a 64 años', POBL),
            ('65_mas', 'numero', 'Población de 65 años o más', POBL),
            ('80_mas', 'numero', 'Población de 80 años o más', POBL),
            ('dep_65', 'numero', 'Tasa de dependencia de mayores (65 o más entre 16 a 64)', HUECO_DEP),
        ],
    },
    {
        'modelo': 'm2', 'csv': 'm2/m2_cotizantes.csv', 'id': 'm2-cotizantes', 'confidence': 'baja',
        'title': 'M2 · Afiliados, cotizantes del Régimen General y base de cotización (2026-2050)',
        'description': (
            'Afiliados de diciembre (todos los regímenes), cotizantes del Régimen General y base de cotización total, proyectados por el '
            'modelo M2 aplicando a la población de M1 las tasas de afiliación y de cotización de 2025 (constantes), y la base media de 2025 '
            'creciendo con el salario real (g) y los precios (IPC). Es la versión v0 del modelo: no modela el ciclo económico, el empleo ni '
            'los demás regímenes, y no es una previsión.'
        ),
        'notes': 'La recaudación es la de contingencias comunes del Régimen General (base total por el tipo vigente); no es el ingreso total de la Seguridad Social. «base_total_rg_meur_reales_2025» está en euros reales de 2025, el año de referencia del modelo.',
        'columnas': [
            ('anio', 'numero', 'Año', None),
            ('afiliados_dic', 'numero', 'Afiliados de diciembre, todos los regímenes', 'afiliados'),
            ('cotizantes_rg', 'numero', 'Cotizantes del Régimen General (media anual)', 'cotizantes'),
            ('base_total_rg_meur', 'numero', 'Base de cotización total del Régimen General, euros corrientes', 'millones de euros'),
            ('recaudacion_cc_rg_meur', 'numero', 'Recaudación de contingencias comunes del Régimen General, euros corrientes', 'millones de euros'),
            ('base_total_rg_meur_reales_2025', 'numero', 'Base de cotización total del Régimen General, euros reales de 2025', 'millones de euros de 2025'),
        ],
    },
    {
        'modelo': 'm2', 'csv': 'm2/m2_relacion_pensiones.csv', 'id': 'm2-relacion-pensiones', 'confidence': 'baja',
        'title': 'M2 · Afiliados por pensión (2026-2050)',
        'description': (
            'Cociente entre los afiliados de diciembre proyectados por M2 y las pensiones de octubre proyectadas por M3. Cada fecha es la del '
            'modelo: afiliados de diciembre y pensiones de octubre del mismo año. Es una razón calculada con dos proyecciones de modelo, no una '
            'previsión (M2, apartados 3 y 4).'
        ),
        'columnas': [
            ('anio', 'numero', 'Año', None),
            ('afiliados_dic', 'numero', 'Afiliados de diciembre, todos los regímenes (M2)', 'afiliados'),
            ('pensiones_oct', 'numero', 'Pensiones contributivas en octubre (M3)', PENS),
            ('afiliados_por_pension', 'numero', 'Afiliados de diciembre entre pensiones de octubre', 'afiliados por pensión'),
        ],
    },
    {
        'modelo': 'm3', 'csv': 'm3/m3_pensiones.csv', 'id': 'm3-pensiones', 'confidence': 'media',
        'title': 'M3 · Pensiones contributivas en vigor por clase, sexo y grupo de edad (2026-2050)',
        'description': (
            'Pensiones contributivas en vigor en octubre de cada año, por clase, sexo y grupo de edad de cinco años, obtenidas aplicando a la '
            'población proyectada por M1 la proporción de cada grupo que cobra cada clase de pensión en la foto de octubre de 2026 '
            '(prevalencia constante). Cuenta pensiones, no personas, y no incluye importes. No es una previsión.'
        ),
        'notes': 'Las pensiones de edad desconocida de la foto de partida (85) se ignoran (M3, apartado 8).',
        'columnas': [
            ('anio', 'numero', 'Año (octubre)', None),
            ('clase', 'texto', 'Clase de pensión: jubilacion, viudedad, incapacidad, orfandad o favor-familiares', None),
            ('sexo', 'texto', 'hombres o mujeres', None),
            ('grupo_edad', 'texto', 'Grupo de edad de cinco años («85-y-más» es el último)', None),
            ('pensiones', 'numero', 'Pensiones contributivas en vigor', PENS),
        ],
    },
    {
        'modelo': 'm3', 'csv': 'm3/m3_resumen.csv', 'id': 'm3-resumen', 'confidence': 'media',
        'title': 'M3 · Resumen de pensiones en vigor por clase y pensionistas aproximados (2026-2050)',
        'description': (
            'Pensiones contributivas en vigor en octubre de cada año por clase y total, y estimación del número de pensionistas (personas), '
            'que es menor porque hay quien cobra más de una pensión (M3, apartado 3). Es una proyección de modelo con prevalencias constantes, '
            'no una previsión.'
        ),
        'notes': '«pensionistas_aprox» aplica a las pensiones totales la relación entre pensionistas y pensiones del último dato publicado.',
        'columnas': [
            ('anio', 'numero', 'Año (octubre)', None),
            ('favor-familiares', 'numero', 'Pensiones en favor de familiares', PENS),
            ('incapacidad', 'numero', 'Pensiones de incapacidad permanente', PENS),
            ('jubilacion', 'numero', 'Pensiones de jubilación', PENS),
            ('orfandad', 'numero', 'Pensiones de orfandad', PENS),
            ('viudedad', 'numero', 'Pensiones de viudedad', PENS),
            ('total', 'numero', 'Total de pensiones contributivas', PENS),
            ('pensionistas_aprox', 'numero', 'Pensionistas (personas), estimación', 'pensionistas'),
        ],
    },
]

MODELOS = {
    'm1': ('M1 · Modelo demográfico', 'docs/modelos/M1_descripcion.md', 'modelos/m1/m1_demografia.py'),
    'm2': ('M2 · Cotizantes y bases de cotización (v0)', 'docs/modelos/M2_descripcion.md', 'modelos/m2/m2_cotizantes.py'),
    'm3': ('M3 · Pensiones contributivas en vigor', 'docs/modelos/M3_descripcion.md', 'modelos/m3/m3_pensiones.py'),
}


def leer_leeme():
    texto = open(f'{SALIDAS}/LEEME.txt', encoding='utf-8').read()
    fecha = re.search(r'el (\d{4}-\d{2}-\d{2})', texto)
    commit = re.search(r'commit que modifica modelos/: ([0-9a-f]{7,40})', texto)
    esc = re.search(r'Escenario: g = ([\d,.]+) %, IPC = ([\d,.]+) %, legislación congelada[^\n]*', texto)
    if not (fecha and commit and esc):
        sys.exit('El LEEME no tiene el formato esperado (fecha, commit y escenario)')
    completo = subprocess.run(['git', '-C', REPO, 'rev-parse', commit.group(1)], capture_output=True, text=True, check=True).stdout.strip()
    pct = lambda s: round(float(s.replace(',', '.')) / 100, 10)
    return {'fecha': fecha.group(1), 'commit': completo, 'g': pct(esc.group(1)), 'ipc': pct(esc.group(2)), 'literal': esc.group(0).rstrip('.')}


def horizonte_m1():
    """Año hasta el que M1 se presenta como resultado: lo dice su descripción (apartado 6)."""
    texto = open(f'{REPO}/docs/modelos/M1_descripcion.md', encoding='utf-8').read()
    m = re.search(r'El horizonte de presentación son \d+ años \(hasta (\d{4})\)', texto)
    if not m:
        sys.exit('No se encuentra el horizonte de presentación en docs/modelos/M1_descripcion.md')
    return int(m.group(1))


def convierte(valor, tipo):
    if tipo == 'texto':
        return valor
    return float(valor) if ('.' in valor or 'e' in valor.lower() or 'nan' in valor.lower()) else int(valor)


def lee_csv(ruta, columnas):
    with open(ruta, encoding='utf-8', newline='') as fh:
        lector = csv.reader(fh)
        cabecera = next(lector)
        esperada = [c[0] for c in columnas]
        # M2 y M3 guardan el índice sin nombre en algunos CSV: se acepta una primera columna vacía.
        if cabecera != esperada:
            sys.exit(f'{ruta}: la cabecera {cabecera} no coincide con {esperada}')
        filas = []
        for r in lector:
            if not r:
                continue
            filas.append([convierte(v, c[1]) for v, c in zip(r, columnas)])
    return filas


def modelo_extra(f, modelo):
    if f['modelo'] == 'm1':
        modelo['horizontePresentacion'] = horizonte_m1()
    for c in f['columnas']:
        m = re.search(r'_reales_(\d{4})$', c[0])
        if m:
            modelo['anioBaseReal'] = int(m.group(1))
    return modelo


def main():
    leeme = leer_leeme()
    os.makedirs(DESTINO, exist_ok=True)
    escritos = []
    for f in FICHEROS:
        ruta_csv = f'{SALIDAS}/{f["csv"]}'
        sha = hashlib.sha256(open(ruta_csv, 'rb').read()).hexdigest()
        nombre, descripcion, script = MODELOS[f['modelo']]
        filas = lee_csv(ruta_csv, f['columnas'])
        # Los enteros del CSV («2026») se guardan como número; los valores con decimales, como están.
        obj = {
            'tipo': 'proyeccion',
            'id': f['id'],
            'title': f['title'],
            'description': f['description'],
            'naturaleza': 'proyeccion-de-modelo',
            'modelo': modelo_extra(f, {'id': f['modelo'], 'nombre': nombre, 'descripcion': descripcion}),
            'escenario': {
                'g': leeme['g'],
                'ipc': leeme['ipc'],
                'legislacion': 'congelada',
                'literal': leeme['literal'],
                'aplicacion': ESCENARIO_APLICACION[f['modelo']],
            },
            'source': {
                'title': f'{nombre}: código del modelo en el repositorio y salidas de su ejecución',
                'publisher': PUBLICADOR,
                'url': f'{URL_REPO}/{leeme["commit"]}/{script}',
            },
            'fetchedAt': leeme['fecha'],
            'confidence': f['confidence'],
            'origen': {
                'csv': f'data-raw/modelos-salidas/{f["csv"]}',
                'sha256': sha,
                'commitModelos': leeme['commit'],
                'leeme': 'data-raw/modelos-salidas/LEEME.txt',
                'ejecutadoEl': leeme['fecha'],
            },
            'columnas': [{'id': c[0], 'descripcion': c[2], 'tipo': c[1], 'unidad': c[3]} for c in f['columnas']],
            'filas': filas,
        }
        if f.get('notes'):
            obj['notes'] = f['notes']
        destino = f'{DESTINO}/{f["id"]}.json'
        with open(destino, 'w', encoding='utf-8') as fh:
            json.dump(obj, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        escritos.append(destino)
        print('escrito', os.path.relpath(destino, REPO), len(filas), 'filas')
    try:
        subprocess.run(['npx', 'prettier', '--write', *escritos], cwd=REPO, check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError):
        print('Aviso: no se pudo ejecutar Prettier; ejecútalo a mano sobre data/proyecciones/')


if __name__ == '__main__':
    main()
