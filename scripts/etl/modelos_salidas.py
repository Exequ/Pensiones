"""Fases 5-B1 y 5-B2. Convierte las salidas CSV de los modelos propios M1, M2, M3 y M4
(data-raw/modelos-salidas/) en ficheros JSON de data/proyecciones/ (uno por CSV), con el esquema
`ArchivoProyeccion` de src/engine/esquema-datos.ts.

Qué hace
  - Lee data-raw/modelos-salidas/LEEME.txt: fecha de ejecución, hash del último commit que modifica
    modelos/ y escenario (g, IPC, legislación congelada). Nada se escribe a mano.
  - Calcula el SHA-256 de cada CSV y lo guarda junto a su ruta.
  - Escribe `naturaleza: "proyeccion-de-modelo"`, el escenario, la fuente (URL del script del modelo en
    GitHub, en el commit indicado por el LEEME) y las columnas con su descripción y unidad. Las
    descripciones salen de docs/modelos/Mx_descripcion.md; no se añade nada que ahí no conste.
  - M4 con escenarios (Ajustes de M4): `m4/m4_escenarios.csv` y `m4/LEEME_m4_escenarios.txt` dan `m4-escenarios.json`; la fila de
    2025 (observada, no calculada) se guarda aparte en `filaObservada` y el escenario base debe reproducir `m4_financiero.csv`.
  - M4 con sensibilidades (Ajustes de M4, sensibilidades): `m4/m4_sensibilidades.csv` y `m4/LEEME_m4_sensibilidades.txt` dan
    `m4-sensibilidades.json`: diez casos de una palanca cada vez, con el texto de cada parámetro tal cual lo da el LEEME, la fila de 2025
    (observada) aparte y `reproduccionLocalPorAutor: false` (el autor aún no ha reproducido los casos en local).
  - No modifica los CSV ni ejecuta los modelos.

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
    'm4': 'g e IPC intervienen en la pensión de las altas, en las bases de cotización y en el PIB aproximado (afiliados por salario nominal); las pensiones en vigor se revalorizan con el IPC.',
}

MEUR = 'millones de euros'
EUR_MES = 'euros al mes'
PCT_PIB = '% del PIB aproximado de M4'
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
    {
        'modelo': 'm4', 'csv': 'm4/m4_financiero.csv', 'id': 'm4-financiero', 'confidence': 'media',
        'title': 'M4 · Modelo financiero del sistema: gasto en pensiones, ingresos, saldos y Fondo de Reserva (2026-2050)',
        'description': (
            'Gasto en pensiones contributivas (pensiones de cada clase por pensión media y catorce pagas), cotizaciones, Mecanismo de Equidad '
            'Intergeneracional (MEI), resto de gastos, transferencias del Estado y otros ingresos, tres medidas de saldo, dotación, disposición y '
            'valor del Fondo de Reserva y financiación adicional, calculados por el modelo financiero M4 con la legislación actual congelada. '
            'Junta M1 (población), M2 (cotizantes y bases) y M3 (pensiones) y se calibra con la ejecución presupuestaria de 2025. Es un cálculo '
            'propio con un solo escenario de referencia: no es una previsión.'
        ),
        'notes': (
            'Importes en millones de euros corrientes (con inflación) salvo las pensiones medias (euros al mes). El PIB de M4 es un indicador '
            'aproximado (afiliados por salario nominal): no es una previsión macroeconómica ni coincide con el PIB del INE. Según la descripción '
            'de M4, las cotizaciones incluyen el MEI (en el presupuesto el MEI es una partida de las cotizaciones sociales): la columna «mei» es un '
            'desglose de «cotizaciones», no un ingreso adicional (se comprueba en scripts/proyecciones-5b2.test.ts). El gasto en pensiones es el '
            'número de pensiones de cada clase por la pensión media por catorce pagas y por un factor de calibración (devengo) de cada clase, '
            'que se obtiene con el cociente de 2025 y se mantiene constante. La descripción de M4 atribuye la diferencia a los complementos a '
            'mínimos, que el presupuesto contabiliza aparte: es una hipótesis de su autor, no verificada contra la metodología de la fuente '
            '(consta en docs/PENDIENTE_DATOS.md). «saldo_sin_transferencias» es cotizaciones menos gasto en pensiones '
            'menos resto de gastos, es decir, sin las transferencias del Estado ni otros ingresos; «saldo_no_financiero» es ese saldo más '
            '«transferencias_y_otros» (se comprueba en el mismo test). El Fondo de Reserva parte de un valor a precio de adquisición a fin del '
            'último año observado y crece con una rentabilidad nominal constante (la descripción da el valor), más la dotación y menos la '
            'disposición: no es valor de mercado. La fiabilidad asignada a esta salida es media porque M4 hereda la incertidumbre de M2, que es baja.'
        ),
        'columnas': [
            ('anio', 'numero', 'Año', None),
            ('pensiones_oct', 'numero', 'Pensiones contributivas en vigor en octubre, todas las clases (M3)', PENS),
            ('pension_media_jub', 'numero', 'Pensión media de jubilación, en euros corrientes de cada año', EUR_MES),
            ('pension_media_total', 'numero', 'Pensión media de todas las clases, en euros corrientes de cada año', EUR_MES),
            ('gasto_pensiones', 'numero', 'Gasto en pensiones contributivas: número de pensiones de cada clase por pensión media por catorce pagas y por un factor de calibración (devengo) de cada clase', MEUR),
            ('cotizaciones', 'numero', 'Cotizaciones sociales, incluido el MEI: las del año de calibración sin el MEI escaladas con la masa de bases de M2, más el MEI calculado con su tipo legal', MEUR),
            ('mei', 'numero', 'Parte de las cotizaciones que corresponde al Mecanismo de Equidad Intergeneracional (MEI), con el tipo legal creciente hasta su último año de vigencia en el modelo; es un desglose de «cotizaciones», no un ingreso adicional', MEUR),
            ('otros_gastos', 'numero', 'Resto de gastos: bajas por enfermedad, maternidad, complementos a mínimos, pensiones no contributivas, Ingreso Mínimo Vital, personal y otros', MEUR),
            ('transferencias_y_otros', 'numero', 'Transferencias del Estado y otros ingresos que no son cotizaciones', MEUR),
            ('saldo_cotizaciones_menos_pensiones', 'numero', 'Saldo de cotizaciones menos pensiones: cotizaciones menos gasto en pensiones contributivas', MEUR),
            ('saldo_sin_transferencias', 'numero', 'Saldo sin transferencias: cotizaciones menos gasto en pensiones menos resto de gastos, sin transferencias del Estado ni otros ingresos', MEUR),
            ('saldo_no_financiero', 'numero', 'Saldo no financiero: saldo sin transferencias más las transferencias del Estado y otros ingresos', MEUR),
            ('dotacion_fondo', 'numero', 'Dotación anual al Fondo de Reserva, que se nutre del MEI', MEUR),
            ('disposicion_fondo', 'numero', 'Disposición anual del Fondo de Reserva para cubrir déficit, con el límite legal anual en porcentaje del PIB', MEUR),
            ('fondo_reserva', 'numero', 'Valor del Fondo de Reserva a fin de año: parte de un valor a precio de adquisición y crece con una rentabilidad nominal constante; no es valor de mercado', MEUR),
            ('financiacion_adicional', 'numero', 'Financiación adicional: lo que el Fondo de Reserva no cubre', MEUR),
            ('pib_proxy', 'numero', 'PIB aproximado de M4: afiliados por salario nominal; no es una previsión macroeconómica', MEUR),
            ('gasto_pensiones_pct_pib', 'numero', 'Gasto en pensiones contributivas', PCT_PIB),
            ('saldo_cot_pens_pct_pib', 'numero', 'Saldo de cotizaciones menos pensiones', PCT_PIB),
            ('saldo_no_financiero_pct_pib', 'numero', 'Saldo no financiero', PCT_PIB),
            ('fondo_pct_pib', 'numero', 'Valor del Fondo de Reserva a fin de año', PCT_PIB),
            ('afiliados_por_pension', 'numero', 'Afiliados (M2) por pensión (M3)', 'afiliados por pensión'),
        ],
    },
]

# M4 con escenarios (Ajustes de M4): mismo CSV largo con la columna «escenario» delante y la fila de 2025.
_M4 = next(f for f in FICHEROS if f['id'] == 'm4-financiero')
FICHEROS.append({
    **_M4,
    'csv': 'm4/m4_escenarios.csv',
    'id': 'm4-escenarios',
    'leeme': 'm4/LEEME_m4_escenarios.txt',
    'escenarios': True,
    'title': 'M4 · Modelo financiero del sistema en cinco escenarios de sensibilidad (2026-2050, con la fila observada de 2025)',
    'description': (
        'Las mismas salidas de M4 que «m4-financiero» en cinco escenarios que cambian solo el crecimiento real de los salarios o el IPC '
        'respecto al escenario base, con la legislación actual congelada. Cada fila es un escenario y un año. El año 2025 no lo calcula el '
        'modelo: son datos observados, iguales en los cinco escenarios, que constan aparte en «filaObservada». Es un cálculo propio con '
        'supuestos explícitos: no es una previsión.'
    ),
    'notes': (
        'Las columnas son las de m4-financiero con la columna «escenario» delante; sus definiciones y limitaciones son las de ese fichero. '
        'Cada escenario cambia solo g o el IPC respecto al base; las demás palancas del modelo son las de por defecto (véase «parametrosComunes»). '
        'El escenario base de 2026 en adelante coincide con m4-financiero (lo comprueba el script y un test). La rentabilidad nominal del Fondo es la '
        'misma en los cinco escenarios, de modo que su rentabilidad real cambia con el IPC. «pib_proxy» es un indicador aproximado (afiliados por '
        'salario nominal), no el PIB del INE. Esta salida la ejecutó Claude en su entorno de trabajo con el código de modelos/m4/m4_escenarios.py, no '
        'Sergio en local (véase el LEEME de los escenarios).'
    ),
    'columnas': [('escenario', 'texto', 'Escenario de sensibilidad (identificador del LEEME de los escenarios)', None)] + _M4['columnas'],
})

# M4 con sensibilidades (Ajustes de M4, sensibilidades): diez casos que cambian una palanca respecto al base.
FICHEROS.append({
    **_M4,
    'csv': 'm4/m4_sensibilidades.csv',
    'id': 'm4-sensibilidades',
    'leeme': 'm4/LEEME_m4_sensibilidades.txt',
    'sensibilidades': True,
    'aplicacion': 'Es el escenario base del que parte cada caso de sensibilidad; cada caso cambia una sola palanca respecto a él (véase «sensibilidades»).',
    'title': 'M4 · Modelo financiero del sistema en diez casos de sensibilidad, una palanca cada vez respecto al escenario base (2026-2050, con la fila observada de 2025)',
    'description': (
        'Las mismas salidas de M4 que «m4-financiero» en diez casos de sensibilidad. Cada caso cambia una sola palanca respecto al escenario '
        'base y no se combina con las demás. Cada fila es un caso y un año. El año 2025 no lo calcula el modelo: son datos observados, iguales '
        'en los diez casos, que constan aparte en «filaObservada». Es un cálculo propio con la legislación actual congelada: no es una previsión.'
    ),
    'notes': (
        'Las columnas son las de m4-financiero con la columna «escenario» delante, que aquí identifica el caso de sensibilidad; sus definiciones y '
        'limitaciones son las de ese fichero. «sensibilidades» da, en el orden del LEEME, el parámetro de cada caso tal cual lo escribe el LEEME. '
        'El escenario base al que se refiere cada caso es el de m4-escenarios (g = 1 %, IPC = 2 %, el mismo que m4-financiero); este fichero no '
        'trae filas del base. «pib_proxy» es un indicador aproximado (afiliados por salario nominal), no el PIB del INE. Esta salida la ejecutó '
        'Claude en su entorno de trabajo con el código de modelos/m4/m4_sensibilidades.py, no Sergio en local, y el autor no la ha reproducido '
        'todavía en local (reproduccionLocalPorAutor); véase el LEEME de las sensibilidades.'
    ),
    'columnas': [('escenario', 'texto', 'Caso de sensibilidad (identificador del LEEME de las sensibilidades)', None)] + _M4['columnas'],
})

MODELOS = {
    'm1': ('M1 · Modelo demográfico', 'docs/modelos/M1_descripcion.md', 'modelos/m1/m1_demografia.py'),
    'm2': ('M2 · Cotizantes y bases de cotización (v0)', 'docs/modelos/M2_descripcion.md', 'modelos/m2/m2_cotizantes.py'),
    'm3': ('M3 · Pensiones contributivas en vigor', 'docs/modelos/M3_descripcion.md', 'modelos/m3/m3_pensiones.py'),
    'm4': ('M4 · Modelo financiero del sistema (v1)', 'docs/modelos/M4_descripcion.md', 'modelos/m4/m4_financiero.py'),
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
    if valor == '':
        return None
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


def leer_leeme_escenarios():
    """LEEME de los escenarios de M4: fecha, commit previo, tabla de escenarios, palancas comunes y fila de 2025."""
    texto = open(f'{SALIDAS}/m4/LEEME_m4_escenarios.txt', encoding='utf-8').read()
    fecha = re.search(r'^Fecha: (\d{4}-\d{2}-\d{2})', texto, re.M)
    previo = re.search(r'último commit que modifica modelos/ antes de esta ejecución es ([0-9a-f]{7,40})', texto)
    if not (fecha and previo):
        sys.exit('El LEEME de escenarios no tiene fecha o commit previo')
    pct = lambda s: round(float(s.replace(',', '.')) / 100, 10)
    escenarios = [
        {'id': m.group(1), 'g': pct(m.group(2)), 'ipc': pct(m.group(3))}
        for m in re.finditer(r'^(base|g\d|ipc\d)\s*\|\s*([\d,.]+) %\s*\|\s*([\d,.]+) %\s*$', texto, re.M)
    ]
    if len(escenarios) != 5:
        sys.exit(f'Se esperaban cinco escenarios en el LEEME y hay {len(escenarios)}')

    def bloque(inicio, fin):
        a = texto.index(inicio)
        b = texto.index(fin, a) if fin else len(texto)
        return [re.sub(r'^- ', '', l).strip() for l in texto[a:b].splitlines()[1:] if l.strip()]

    comunes = bloque('En los cinco, el resto de palancas', '\nLA FILA DE 2025')
    fila = bloque('LA FILA DE 2025', '\nEJECUCIÓN')
    # La primera línea del bloque de 2025 es la advertencia general; las demás describen cada magnitud.
    completo = subprocess.run(
        ['git', '-C', REPO, 'log', '-1', '--format=%H', '--', 'modelos/m4/m4_escenarios.py'],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    if not completo:
        sys.exit('No se encuentra en git el commit que añade modelos/m4/m4_escenarios.py')
    anterior = subprocess.run(['git', '-C', REPO, 'rev-parse', previo.group(1)], capture_output=True, text=True, check=True).stdout.strip()
    return {
        'fecha': fecha.group(1), 'commit': completo, 'commitPrevio': anterior, 'escenarios': escenarios,
        'comunes': comunes, 'fila2025': fila,
    }


def leer_leeme_sensibilidades():
    """LEEME de las sensibilidades de M4: fecha, commit previo, casos (en su orden, con su parámetro), base y fila de 2025."""
    texto = open(f'{SALIDAS}/m4/LEEME_m4_sensibilidades.txt', encoding='utf-8').read()
    fecha = re.search(r'^Fecha: (\d{4}-\d{2}-\d{2})', texto, re.M)
    previo = re.search(r'último commit que modifica modelos/ antes de esta ejecución es ([0-9a-f]{7,40})', texto)
    if not (fecha and previo):
        sys.exit('El LEEME de sensibilidades no tiene fecha o commit previo')
    a = texto.index('\nCASOS')
    b = texto.index('\nRESULTADOS EN 2050')
    lineas = texto[a:b].splitlines()
    casos = []
    for linea in lineas:
        m = re.match(r'^([a-z0-9_]+)\s*\|\s*(.+?)\s*$', linea)
        if m:
            casos.append({'id': m.group(1), 'parametro': m.group(2)})
    if len(casos) != 10:
        sys.exit(f'Se esperaban diez casos en el LEEME y hay {len(casos)}')
    base = next((l.strip() for l in lineas if l.startswith('Cada caso cambia UNA palanca')), None)
    fila = re.search(r'^La fila de 2025 es el dato observado[^\n]*', texto, re.M)
    if base is None or fila is None:
        sys.exit('El LEEME de sensibilidades no describe el caso base o la fila de 2025')
    completo = subprocess.run(
        ['git', '-C', REPO, 'log', '-1', '--format=%H', '--', 'modelos/m4/m4_sensibilidades.py'],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    if not completo:
        sys.exit('No se encuentra en git el commit que añade modelos/m4/m4_sensibilidades.py')
    anterior = subprocess.run(['git', '-C', REPO, 'rev-parse', previo.group(1)], capture_output=True, text=True, check=True).stdout.strip()
    return {
        'fecha': fecha.group(1), 'commit': completo, 'commitPrevio': anterior, 'casos': casos,
        'base': base, 'fila2025': [fila.group(0).strip()],
    }


def modelo_extra(f, modelo):
    if f['modelo'] == 'm1':
        modelo['horizontePresentacion'] = horizonte_m1()
    for c in f['columnas']:
        m = re.search(r'_reales_(\d{4})$', c[0])
        if m:
            modelo['anioBaseReal'] = int(m.group(1))
    return modelo


def separa_escenarios(f, filas, esc):
    """Separa del CSV de escenarios la fila de 2025 (observada) de las filas calculadas por el modelo.

    Comprueba que la fila observada es igual en los cinco escenarios, que el escenario base de 2026 en
    adelante reproduce `m4_financiero.csv` celda a celda y que cada escenario tiene todos los años.
    """
    columnas = f['columnas']
    ids = [c[0] for c in columnas]
    i_esc, i_anio = ids.index('escenario'), ids.index('anio')
    lista = [e['id'] for e in esc['escenarios']]
    anio_obs = min(r[i_anio] for r in filas)
    observadas = [r for r in filas if r[i_anio] == anio_obs]
    calculadas = [r for r in filas if r[i_anio] != anio_obs]
    if sorted(r[i_esc] for r in observadas) != sorted(lista):
        sys.exit('La fila observada no está una vez en cada escenario del LEEME')
    if len({tuple(r[:i_esc] + r[i_esc + 1:]) for r in observadas}) != 1:
        sys.exit('La fila observada no es igual en los cinco escenarios')
    anios = sorted({r[i_anio] for r in calculadas})
    for e in lista:
        if sorted(r[i_anio] for r in calculadas if r[i_esc] == e) != anios:
            sys.exit(f'El escenario {e} no tiene todos los años')
    base = [r[:i_esc] + r[i_esc + 1:] for r in calculadas if r[i_esc] == 'base']
    ruta_base = f'{SALIDAS}/m4/m4_financiero.csv'
    esperado = lee_csv(ruta_base, [c for c in columnas if c[0] != 'escenario'])
    # Las celdas pueden diferir en el último bit de la coma flotante (≈ 1e-16 en términos relativos).
    iguales = len(base) == len(esperado) and all(
        len(a) == len(b) and all(
            (x == y) or (isinstance(x, float) and isinstance(y, float) and abs(x - y) <= 1e-12 * max(abs(x), abs(y)))
            for x, y in zip(a, b)
        )
        for a, b in zip(base, esperado)
    )
    if not iguales:
        sys.exit('El escenario base no reproduce m4_financiero.csv')
    # Orden de las filas: por escenario del LEEME y por año.
    orden = {e: i for i, e in enumerate(lista)}
    calculadas.sort(key=lambda r: (orden[r[i_esc]], r[i_anio]))
    obs = observadas[0]
    valores = {c[0]: v for c, v in zip(columnas, obs) if c[1] == 'numero' and v is not None and c[0] != 'anio'}
    return calculadas, {
        'escenarios': esc['escenarios'],
        'parametrosComunes': esc['comunes'],
        'filaObservada': {'anio': anio_obs, 'descripcion': esc['fila2025'], 'valores': valores},
    }


def separa_sensibilidades(f, filas, sens):
    """Separa del CSV de sensibilidades la fila de 2025 (observada) de las filas calculadas por el modelo.

    Comprueba que la fila observada está una vez en cada caso, que es igual en los diez casos y a la del
    escenario base de `m4_escenarios.csv`, y que cada caso tiene todos los años. El CSV no trae filas del base.
    """
    columnas = f['columnas']
    ids = [c[0] for c in columnas]
    i_esc, i_anio = ids.index('escenario'), ids.index('anio')
    lista = [c['id'] for c in sens['casos']]
    if sorted({r[i_esc] for r in filas}) != sorted(lista):
        sys.exit('Los casos del CSV no son los del LEEME')
    anio_obs = min(r[i_anio] for r in filas)
    observadas = [r for r in filas if r[i_anio] == anio_obs]
    calculadas = [r for r in filas if r[i_anio] != anio_obs]
    if sorted(r[i_esc] for r in observadas) != sorted(lista):
        sys.exit('La fila observada no está una vez en cada caso del LEEME')
    if len({tuple(r[:i_esc] + r[i_esc + 1:]) for r in observadas}) != 1:
        sys.exit('La fila observada no es igual en los diez casos')
    anios = sorted({r[i_anio] for r in calculadas})
    for c in lista:
        if sorted(r[i_anio] for r in calculadas if r[i_esc] == c) != anios:
            sys.exit(f'El caso {c} no tiene todos los años')
    # La fila observada debe ser la del escenario base de m4_escenarios.csv (misma fila de 2025).
    base25 = [r[:i_esc] + r[i_esc + 1:] for r in lee_csv(f'{SALIDAS}/m4/m4_escenarios.csv', columnas)
              if r[i_anio] == anio_obs and r[i_esc] == 'base']
    if len(base25) != 1 or base25[0] != observadas[0][:i_esc] + observadas[0][i_esc + 1:]:
        sys.exit('La fila observada no es la del escenario base de m4_escenarios.csv')
    orden = {c: i for i, c in enumerate(lista)}
    calculadas.sort(key=lambda r: (orden[r[i_esc]], r[i_anio]))
    valores = {c[0]: v for c, v in zip(columnas, observadas[0]) if c[1] == 'numero' and v is not None and c[0] != 'anio'}
    return calculadas, {
        'sensibilidades': sens['casos'],
        'reproduccionLocalPorAutor': False,
        'parametrosComunes': [sens['base']],
        'filaObservada': {'anio': anio_obs, 'descripcion': sens['fila2025'], 'valores': valores},
    }


def main():
    leeme = leer_leeme()
    os.makedirs(DESTINO, exist_ok=True)
    escritos = []
    for f in FICHEROS:
        ruta_csv = f'{SALIDAS}/{f["csv"]}'
        sha = hashlib.sha256(open(ruta_csv, 'rb').read()).hexdigest()
        nombre, descripcion, script = MODELOS[f['modelo']]
        filas = lee_csv(ruta_csv, f['columnas'])
        extra = {}
        procedencia = leeme
        if f.get('escenarios'):
            esc = leer_leeme_escenarios()
            filas, extra = separa_escenarios(f, filas, esc)
            procedencia = {**leeme, 'fecha': esc['fecha'], 'commit': esc['commit']}
            script = 'modelos/m4/m4_escenarios.py'
        elif f.get('sensibilidades'):
            sens = leer_leeme_sensibilidades()
            filas, extra = separa_sensibilidades(f, filas, sens)
            procedencia = {**leeme, 'fecha': sens['fecha'], 'commit': sens['commit']}
            script = 'modelos/m4/m4_sensibilidades.py'
        # Los enteros del CSV («2026») se guardan como número; los valores con decimales, como están.
        obj = {
            'tipo': 'proyeccion',
            'id': f['id'],
            'title': f['title'],
            'description': f['description'],
            'naturaleza': 'proyeccion-de-modelo',
            'modelo': modelo_extra(f, {'id': f['modelo'], 'nombre': nombre, 'descripcion': descripcion}),
            'escenario': {
                'g': procedencia['g'],
                'ipc': procedencia['ipc'],
                'legislacion': 'congelada',
                'literal': procedencia['literal'],
                'aplicacion': f.get('aplicacion', ESCENARIO_APLICACION[f['modelo']]),
            },
            'source': {
                'title': f'{nombre}: código del modelo y salidas de su ejecución',
                'publisher': PUBLICADOR,
                'url': f'{URL_REPO}/{procedencia["commit"]}/{script}',
            },
            'fetchedAt': procedencia['fecha'],
            'confidence': f['confidence'],
            'origen': {
                'csv': f'data-raw/modelos-salidas/{f["csv"]}',
                'sha256': sha,
                'commitModelos': procedencia['commit'],
                'leeme': 'data-raw/modelos-salidas/' + f.get('leeme', 'LEEME.txt'),
                'ejecutadoEl': procedencia['fecha'],
            },
            'columnas': [{'id': c[0], 'descripcion': c[2], 'tipo': c[1], 'unidad': c[3]} for c in f['columnas']],
            'filas': filas,
        }
        if f.get('sensibilidades'):
            obj['origen']['leemeSha256'] = hashlib.sha256(open(f'{SALIDAS}/{f["leeme"]}', 'rb').read()).hexdigest()
        # Campos propios de las salidas con varios escenarios (van antes de «columnas»).
        for clave in ('escenarios', 'sensibilidades', 'reproduccionLocalPorAutor', 'parametrosComunes', 'filaObservada'):
            if clave in extra:
                obj[clave] = extra[clave]
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
