"""Fase 1A-bis: reglas de evolución futura y de cálculo, en formato numérico.

Lee los textos de data-raw/boe/ (origen y huellas en data-raw/boe/origen.json) y escribe en
data/parametros/: base-maxima-incremento-futuro, pension-maxima-incremento-futuro,
revalorizacion-regla, pension-minima-regla, opcion-25-anos-{ventana,divisor,aplicable},
lagunas-integracion y actualizacion-bases. Cada dato lleva cita literal, que el propio script
comprueba contra el texto del documento (si no aparece, falla), y un contraste con una segunda
fuente cuando existe. Modo `local`: basta con tener los ficheros de data-raw/boe/ (es lo habitual;
los de la Fase 1A se copiaron de la descarga de esa fase). Ejecutar con `python3 -I`."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, BOE, fusionar, cruce

RAW = f'{REPO}/data-raw/boe'
ORIGEN = json.load(open(f'{RAW}/origen.json'))
_cache = {}


def texto(nombre):
    if nombre not in _cache:
        with open(f'{RAW}/{nombre}', encoding='utf-8') as f:
            _cache[nombre] = re.sub(r'\s+', ' ', f.read())
    return _cache[nombre]


def esta(nombre, literal):
    return re.sub(r'\s+', ' ', literal) in texto(nombre)


def exige(nombre, literal):
    if not esta(nombre, literal):
        raise SystemExit(f'CITA NO ENCONTRADA en {nombre}: {literal[:90]}')


TRLGSS = ('trlgss-2015-consolidado.txt', 'Real Decreto Legislativo 8/2015, texto refundido de la Ley General de la Seguridad Social (texto consolidado, versión descargada el 2026-11-11)')
RDL = ('rdl-2-2023.txt', 'Real Decreto-ley 2/2023, de 16 de marzo, de medidas urgentes para la ampliación de derechos de los pensionistas, la reducción de la brecha de género y el establecimiento de un nuevo marco de sostenibilidad del sistema público de pensiones')
ART209_2016 = ('trlgss-2015-art209-v20151031.txt', 'Real Decreto Legislativo 8/2015, TRLGSS: artículo 209, texto original (en vigor del 02/01/2016 al 31/12/2025)')
ART162_2010 = ('trlgss-1994-art162-v20101231.txt', 'Real Decreto Legislativo 1/1994, TRLGSS: artículo 162, versión en vigor el 31/12/2010')
ART162_2013 = ('trlgss-1994-art162-v20130401.txt', 'Real Decreto Legislativo 1/1994, TRLGSS: artículo 162, versión en vigor el 01/04/2013')
LEY3 = ('ley-3-2012.txt', 'Ley 3/2012, de 6 de julio, de medidas urgentes para la reforma del mercado laboral')


def src(doc):
    nombre, titulo = doc
    return {'title': titulo, 'publisher': BOE, 'url': ORIGEN[nombre]['url']}


def mk(id_, periodo, valor, unidad, doc, cita, loc, notas=None, otros=None, conf='alta'):
    """Dato con cita literal verificada; `otros`: [(doc, cita, localización)] de segundas fuentes."""
    for c in cita.split(' [...] '):
        exige(doc[0], c)
    d = {'id': id_, 'value': valor, 'unit': unidad, 'period': str(periodo), 'source': src(doc), 'fetchedAt': HOY, 'confidence': conf}
    if notas:
        d['notes'] = notas
    d['quote'] = cita.replace(' [...] ', ' […] ')
    d['location'] = loc
    if otros:
        d0, c0, l0 = otros[0]
        ok = esta(d0[0], c0)
        d['crossCheck'] = {'source': src(d0), 'fetchedAt': HOY, 'matches': ok, 'notes': f'Localización: {l0}. Cita comprobada en el texto: «{c0}».'}
        if not ok:
            raise SystemExit(f'segunda fuente sin coincidencia: {id_}')
    return d


def escribe(id_, titulo, desc, datos):
    fusionar('parametros', id_, datos, titulo, desc)


# 1. Evolución futura de la base máxima y de la pensión máxima ---------------------------------
cita_bm = 'las sucesivas leyes de Presupuestos Generales del Estado aprobadas para ese período fijarán el tope máximo de las bases de cotización de los distintos regímenes de Seguridad de Social conforme a lo establecido en el artículo 19.3, si bien al porcentaje al que se refiere dicho artículo se le sumará una cuantía fija anual de 1,2 puntos porcentuales'
cita_bm2 = 'Desde el año 2024 hasta el año 2050'
cita_bm_rdl = 'se le sumará una cuantía fija anual de 1,2 puntos porcentuales'
datos = [mk(str(a), a, 1.2, 'puntos porcentuales sobre el porcentaje de revalorización de las pensiones (art. 58.2)', TRLGSS,
            f'{cita_bm2}, {cita_bm}', 'DT 38.ª.1 TRLGSS (art. único.38 del RDL 2/2023); art. 19.3 TRLGSS (art. único.1 RDL 2/2023, en vigor el 01/01/2024)',
            'Incremento anual del tope máximo de cotización = porcentaje de revalorización del art. 58.2 (valor medio de las tasas interanuales del IPC de los doce meses previos a diciembre del año anterior) + 1,2 puntos porcentuales. '
            'Lo fija cada año la Ley de Presupuestos (art. 19.3); la DT 38.ª rige de 2024 a 2050 (27 años). Cada cinco años el Gobierno evalúa el impacto (DT 38.ª.2). Dato de la ley, no una previsión.',
            [(RDL, cita_bm_rdl, 'RDL 2/2023, art. único.38 (DT 38.ª TRLGSS)')]) for a in range(2024, 2051)]
escribe('base-maxima-incremento-futuro', 'Incremento anual de la base máxima de cotización sobre el IPC (2024-2050)',
        'Puntos porcentuales que la ley suma, cada año de 2024 a 2050, al porcentaje de revalorización de las pensiones (art. 58.2 TRLGSS) para fijar el tope máximo de las bases de cotización. Un dato por año; el incremento total del año es la revalorización más este valor.', datos)

cita_pm = 'las sucesivas leyes de presupuestos generales del Estado, comenzando con la correspondiente al año 2025 y finalizando con la del año 2050, aplicarán a la cuantía máxima establecida en el año anterior el porcentaje previsto en el artículo 58.2 más un incremento adicional de 0,115 puntos porcentuales acumulativos cada año hasta 2050'
cita_pm_rdl = 'más un incremento adicional de 0,115 puntos porcentuales acumulativos cada año hasta 2050'
datos = [mk(str(a), a, 0.115, 'puntos porcentuales sobre el porcentaje de revalorización de las pensiones (art. 58.2)', TRLGSS, cita_pm,
            'DT 39.ª.1 TRLGSS (art. único.39 del RDL 2/2023); art. 57 TRLGSS (en vigor el 01/01/2025)',
            'La cuantía máxima inicial de cada año = la del año anterior × (1 + (revalorización del art. 58.2 + 0,115 pp) / 100). «Acumulativos» se interpreta como que el efecto se compone año a año al aplicarse sobre la cuantía del año anterior; '
            'lo corroboran los datos de 2025 y 2026 de data/parametros/pension-maxima.json (test de coherencia). Rige de 2025 a 2050 (26 años).',
            [(RDL, cita_pm_rdl, 'RDL 2/2023, art. único.39 (DT 39.ª TRLGSS)')]) for a in range(2025, 2051)]
escribe('pension-maxima-incremento-futuro', 'Incremento anual de la pensión máxima inicial sobre el IPC (2025-2050)',
        'Puntos porcentuales que la ley suma, cada año de 2025 a 2050, al porcentaje de revalorización (art. 58.2 TRLGSS) para fijar la cuantía máxima inicial de las pensiones (art. 57). Las pensiones ya causadas se revalorizan solo con el art. 58.2 (DT 39.ª.2).', datos)

# 2. Revalorización y pensiones mínimas ------------------------------------------------------------
c1 = 'se revalorizarán al comienzo de cada año en el porcentaje equivalente al valor medio de las tasas de variación interanual expresadas en tanto por ciento del Índice de Precios al Consumo de los doce meses previos a diciembre del año anterior'
c1r = 'el porcentaje equivalente al valor medio de las tasas de variación interanual expresadas en tanto por ciento del Índice de Precios al Consumo de los doce meses previos a diciembre del año anterior'
c3 = 'Si el valor medio al que se refiere el apartado anterior fuera negativo, el importe de las pensiones no variará al comienzo del año.'
c_bg = 'todas las pensiones de Seguridad Social, en su modalidad contributiva, incluido el complemento de brecha de género'
loc58 = 'art. 58.2 TRLGSS (art. único.5 RDL 2/2023; en vigor el 01/01/2024)'
datos = [
    mk('2024-meses-medicion', 2024, 12, 'meses', TRLGSS, c1, loc58,
       'Referencia: IPC (índice general), tasas de variación interanual. Periodo de medición: doce meses previos a diciembre del año anterior, es decir, de diciembre del año t-2 a noviembre del año t-1; la revalorización se aplica «al comienzo de cada año». Rige desde 2024 (la derogación del apartado 4 produce efectos el 01/01/2025).',
       [(RDL, c1r, 'RDL 2/2023, art. único.5')]),
    mk('2024-ultimo-mes-medicion', 2024, 11, 'mes del año anterior (1-12): noviembre', TRLGSS, c1, loc58,
       'Deducido del texto: los doce meses previos a diciembre terminan en noviembre del año anterior a la revalorización.', [(RDL, c1r, 'RDL 2/2023, art. único.5')]),
    mk('2024-suelo', 2024, 0, '% (la revalorización no puede ser negativa)', TRLGSS, c3, 'art. 58.3 TRLGSS (art. único.5 RDL 2/2023)',
       'Único límite del texto vigente: si el valor medio es negativo, las pensiones no varían. No hay techo (el apartado 4 del art. 58 consta «(Derogado)», con efectos desde el 01/01/2025).',
       [(RDL, 'Si el valor medio al que se refiere el apartado anterior fuera negativo', 'RDL 2/2023, art. único.5')] if esta('rdl-2-2023.txt', 'Si el valor medio al que se refiere el apartado anterior fuera negativo') else None),
    mk('2024-incluye-complemento-brecha-genero', 2024, 1, 'indicador (1 = sí)', TRLGSS, c_bg, loc58, 'El complemento para la reducción de la brecha de género se revaloriza igual que la pensión.', None),
    mk('2024-actualiza-pension-maxima', 2024, 1, 'indicador (1 = sí)', TRLGSS, 'En ese mismo porcentaje se actualizarán anualmente en la correspondiente Ley de Presupuestos Generales del Estado la cuantía máxima de las pensiones a que se refiere el artículo 57 y la cuantía mínima de las pensiones prevista en el artículo 59',
       loc58, 'La pensión máxima y las mínimas se actualizan con el mismo porcentaje; sobre la máxima se suma además lo previsto en DT 39.ª (véase pension-maxima-incremento-futuro) y sobre las mínimas lo de la DA 53.ª (pension-minima-regla).', None),
]
datos = [x for x in datos if x]
escribe('revalorizacion-regla', 'Regla vigente de revalorización anual de las pensiones contributivas (art. 58 TRLGSS)',
        'Parámetros numéricos de la regla de revalorización en vigor: referencia (IPC), periodo de medición, suelo e indicadores de aplicación. Los años 2020-2022 se revalorizaron con normas especiales (véase revalorizacion-general).', datos)

da = lambda frag: 'Disposición adicional quincuagésima tercera' in texto('trlgss-2015-consolidado.txt') and frag
locda = 'DA 53.ª TRLGSS (art. único.35 RDL 2/2023; en vigor desde 01/04/2023)'
brecha = {2024: (20, 'El 1 de enero de 2024 la cuantía de referencia se incrementará adicionalmente en el porcentaje necesario para reducir en un 20 por ciento la brecha que exista'),
          2025: (30, 'El 1 de enero de 2025 la cuantía de referencia se incrementará adicionalmente en el porcentaje necesario para reducir en un 30 por ciento la brecha que exista'),
          2026: (50, 'El 1 de enero de 2026 la cuantía de referencia se incrementará adicionalmente en el porcentaje necesario para reducir en un 50 por ciento la brecha que exista'),
          2027: (100, 'El 1 de enero de 2027 la cuantía de referencia se incrementará adicionalmente, si ello fuese necesario, hasta alcanzar el umbral de pobreza calculado para un hogar de dos adultos')}
datos = []
for a, (v, c) in brecha.items():
    datos.append(mk(f'{a}-brecha-reducida', a, v, '% de la brecha entre la cuantía de referencia y el umbral de pobreza de un hogar de dos adultos que se reduce ese año', TRLGSS, c, locda + ', apartado 2',
                    'Cuantía de referencia = mínima de jubilación (titular mayor de 65 años con cónyuge a cargo) ya revalorizada según el art. 58.2. Desde 2027 el valor 100 significa «hasta alcanzar» el umbral (si fuese necesario), y esa cuantía no podrá ser inferior al umbral (apartado 1). '
                    'Las cuantías las fijan las leyes de presupuestos de cada año (apartado 6); este dato es el mandato legal, no el importe.',
                    [(RDL, c, 'RDL 2/2023, art. único.35')]))
datos += [
    mk('2024-umbral-multiplicador-hogar-unipersonal', 2024, 1.5, 'veces el umbral de pobreza del hogar unipersonal (ECV, INE)', TRLGSS,
       'se multiplicará por 1,5 el umbral de la pobreza correspondiente a un hogar unipersonal', locda + ', apartado 1', 'Umbral del hogar de dos adultos = 1,5 × umbral unipersonal, con el último dato disponible de la Encuesta de Condiciones de Vida del INE actualizado con el crecimiento medio interanual de esa renta en los últimos ocho años.',
       [(RDL, 'se multiplicará por 1,5 el umbral de la pobreza correspondiente a un hogar unipersonal', 'RDL 2/2023, art. único.35')]),
    mk('2024-anios-crecimiento-renta-umbral', 2024, 8, 'años (crecimiento medio interanual de la renta para actualizar el umbral)', TRLGSS,
       'de acuerdo con el crecimiento medio interanual de esa renta en los últimos ocho años', locda + ', apartado 1', None,
       [(RDL, 'de acuerdo con el crecimiento medio interanual de esa renta en los últimos ocho años', 'RDL 2/2023, art. único.35')]),
    mk('2024-factor-resto-minimas', 2024, 50, '% de los porcentajes de reducción de la brecha (apartado 2) que se añaden a las demás cuantías mínimas', TRLGSS,
       'El resto de las cuantías mínimas de las pensiones contributivas, una vez revalorizadas, se incrementarán adicionalmente cada año y en el mismo periodo en un porcentaje equivalente al 50 por ciento de los porcentajes resultantes del apartado 2',
       locda + ', apartado 4', 'Se refiere a las mínimas distintas de las de cuantía de referencia (viudedad con cargas familiares y pensiones con cónyuge a cargo, excepto IP total de menores de 60 años, que igualan la de referencia desde 2024: apartado 3).',
       [(RDL, 'en un porcentaje equivalente al 50 por ciento de los porcentajes resultantes del apartado 2', 'RDL 2/2023, art. único.35')]),
    mk('2024-pnc-multiplicador-umbral-unipersonal', 2024, 0.75, 'veces el umbral de pobreza del hogar unipersonal (referencia de las pensiones no contributivas)', TRLGSS,
       'con la referencia de multiplicar por 0,75 el umbral de la pobreza de un hogar unipersonal', locda + ', apartado 5', 'Las pensiones no contributivas, revalorizadas conforme al art. 62, se incrementan adicionalmente cada año por el mismo procedimiento del apartado 2.',
       [(RDL, 'con la referencia de multiplicar por 0,75 el umbral de la pobreza de un hogar unipersonal', 'RDL 2/2023, art. único.35')]),
    mk('2024-pp-adicionales-sobre-revalorizacion-general', 2024, 0, 'puntos porcentuales (ninguno: la mínima se actualiza con el mismo porcentaje del art. 58.2 antes de los incrementos adicionales de la DA 53.ª)', TRLGSS,
       'la cuantía mínima de las pensiones prevista en el artículo 59', 'art. 58.2 TRLGSS (art. único.5 RDL 2/2023)',
       'Regla general: la mínima se actualiza cada año en el porcentaje del art. 58.2; sobre ella operan los incrementos adicionales de 2024 a 2027 de esta DA. Desde 2028 no hay mandato adicional en el texto y rige solo el art. 58.2 y el tope del art. 59.4 (complementos ≤ cuantía de la PNC).', None),
]
escribe('pension-minima-regla', 'Regla de evolución de las pensiones mínimas (art. 58.2, DA 53.ª TRLGSS)',
        'Mandato legal numérico de evolución de las cuantías mínimas: revalorización general más reducción progresiva de la brecha con el umbral de pobreza (2024-2027) y parámetros del umbral. Las cuantías concretas las fijan las leyes de presupuestos.', datos)

# 3. Opción de 25 años (DT 4.ª.7) --------------------------------------------------------------------
dt47 = 'cuando el hecho causante se produzca con posterioridad al 31 de diciembre de 2025 y antes de 31 de diciembre de 2040, la entidad gestora aplicará en su integridad lo previsto en el artículo 209.1 en su redacción vigente el día 1 de enero de 2023 cuando dicho cálculo resulte más favorable que el vigente en la fecha en que se cause la pensión'
v25 = 'dividir por trescientos cincuenta, las bases de cotización del interesado durante los trescientos meses inmediatamente anteriores al mes previo al del hecho causante'
loc47 = 'DT 4.ª.7 TRLGSS (art. único.36 RDL 2/2023)'
nota_op = 'Opción por la redacción del art. 209.1 vigente el 01/01/2023 (25 años) cuando resulte más favorable que la regla vigente al causar la pensión. Literalmente: hechos causantes posteriores al 31/12/2025 y anteriores al 31/12/2040 (el propio 31/12/2040 queda sin cubrir en el texto); se modela 2026-2040 completo. '
anios = {**{a: (300, 350, None) for a in range(2026, 2041)},
         2041: (306, 357, 'Para los hechos causantes que se produzcan durante el año 2041, la entidad gestora aplicará, en su integridad, lo previsto en el artículo 209.1, en su redacción vigente el día 1 de enero de 2023, con una la base reguladora que comprenderá las bases de cotización de los últimos 306 meses entre 357, cuando dicho cálculo resulte más favorable'),
         2042: (312, 364, 'En 2042, la entidad gestora aplicará, en su integridad, lo previsto en el artículo 209.1 en su redacción vigente el día 1 de enero de 2023, con una base reguladora que comprenderá las bases de cotización de los últimos 312 meses entre 364, cuando dicho cálculo resulte más favorable'),
         2043: (318, 371, 'En 2043, la entidad gestora aplicará, en su integridad, lo previsto en el artículo 209.1 en su redacción vigente el día 1 de enero de 2023, con una base reguladora que comprenderá las bases de cotización de los últimos 318 meses entre 371, cuando dicho cálculo resulte más favorable')}
vent, divi, apli = [], [], []
for a, (m, dv, cita) in anios.items():
    if cita is None:
        c = dt47
        otros = [(ART209_2016, v25, 'art. 209.1 TRLGSS, texto original (redacción vigente el 01/01/2023)')]
        nota = nota_op + f'Ventana de 300 meses (25 años) y divisor 350 (= 300 × 14/12), según el art. 209.1 de la redacción de 2016-2025: «{v25}».  Las 24 bases más recientes en valor nominal, el resto actualizadas con el IPC; lagunas: 48 meses al 100 % de la base mínima y el resto al 50 % (art. 209.1.b, texto 2016-2025).'
    else:
        c = cita
        otros = [(RDL, cita.split('con una la base')[-1].strip() if 'con una la base' in cita else cita.split('con una base')[-1].strip(), 'RDL 2/2023, art. único.36 (DT 4.ª.7 TRLGSS)')]
        otros = [(RDL, f'los últimos {m} meses entre {dv}', 'RDL 2/2023, art. único.36 (DT 4.ª.7 TRLGSS)')]
        nota = f'Opción por la redacción de 01/01/2023, con base reguladora de los últimos {m} meses entre {dv} (se computan todas las bases de la ventana, sin descartar ninguna). '
    vent.append(mk(str(a), a, m, 'meses', TRLGSS, c, loc47, nota, otros))
    divi.append(mk(str(a), a, dv, 'divisor (14 pagas: meses × 14/12)', TRLGSS, c, loc47, nota, otros))
    apli.append(mk(str(a), a, 1, 'indicador (1 = la opción está disponible)', TRLGSS, c, loc47, nota, otros))
fin = 'A partir de 2044, se aplicará lo previsto en el artículo 209.1 en la redacción vigente desde el 1 de enero de 2026.'
apli.append(mk('2044', 2044, 0, 'indicador (0 = la opción deja de existir)', TRLGSS, fin, loc47, 'Desde 2044 solo rige el art. 209.1 en la redacción vigente desde el 01/01/2026 y su calendario de la DT 40.ª.', [(RDL, 'A partir de 2044, se aplicará lo previsto en el artículo 209.1 en la redacción vigente desde el 1 de enero de 2026', 'RDL 2/2023, art. único.36')]))
escribe('opcion-25-anos-ventana', 'Opción de 25 años (DT 4.ª.7 TRLGSS): ventana de cálculo por año del hecho causante (2026-2043)', 'Meses de bases de cotización de la ventana de la opción por la redacción del art. 209.1 vigente el 01/01/2023.', vent)
escribe('opcion-25-anos-divisor', 'Opción de 25 años (DT 4.ª.7 TRLGSS): divisor por año del hecho causante (2026-2043)', 'Divisor de la suma de bases de la opción por la redacción del art. 209.1 vigente el 01/01/2023.', divi)
escribe('opcion-25-anos-aplicable', 'Opción de 25 años (DT 4.ª.7 TRLGSS): años en que está disponible (2026-2044)', 'Indicador por año del hecho causante: 1 si la opción está disponible, 0 en 2044, primer año sin opción.', apli)

# 5. Integración de lagunas y actualización de bases -----------------------------------------------
def lag(ver, doc, c_pct1, c_pct2, loc, otros, nota):
    r = []
    if c_pct2 is None:
        r.append(mk(f'{ver}-tramo1-meses', ver, 180, 'meses (todos los de la ventana de 180)', doc, c_pct1, loc, nota, otros))
        r.append(mk(f'{ver}-tramo1-pct-base-minima', ver, 100, '% de la base mínima', doc, c_pct1, loc, nota, otros))
    else:
        r.append(mk(f'{ver}-tramo1-meses', ver, 48, 'meses (los primeros con laguna, contados desde el hecho causante hacia atrás)', doc, c_pct1, loc, nota, otros))
        r.append(mk(f'{ver}-tramo1-pct-base-minima', ver, 100, '% de la base mínima', doc, c_pct1, loc, nota, otros))
        r.append(mk(f'{ver}-tramo2-pct-base-minima', ver, 50, '% de la base mínima (el resto de los meses con laguna)', doc, c_pct1, loc, nota, otros))
    return r
c2010 = 'dichas lagunas se integrarán con la base mínima de entre todas las existentes en cada momento para trabajadores mayores de dieciocho años'
c48 = 'las primeras cuarenta y ocho mensualidades se integrarán con la base mínima de entre todas las existentes en cada momento, y el resto de mensualidades con el 50 por 100 de dicha base mínima'
c48_26 = 'las primeras cuarenta y ocho mensualidades se integrarán con la base mínima de cotización del Régimen General que corresponda al mes respectivo y el resto de las mensualidades con el 50 por ciento de dicha base mínima'
datos = []
datos += lag(2010, ART162_2010, c2010, None, 'art. 162.1.1.2 TRLGSS 1994 (versión de 31/12/2010; en vigor desde 13/01/2010 hasta 31/12/2012)', None,
             'Hasta 2012 (versión más antigua leída): todas las lagunas al 100 % de la base mínima, sin tramo al 50 %. No se han leído versiones anteriores a 2010.')
datos += lag(2013, ART162_2013, c48, c48, 'art. 162.1 TRLGSS 1994, versión de 01/04/2013 (introducida por el art. 4.3 de la Ley 27/2011 en la redacción del art. 4 de la Ley 3/2012; en vigor desde 01/01/2013)',
             [(LEY3, 'las primeras cuarenta y ocho mensualidades se integrarán con la base mínima de entre todas las existentes en cada momento', 'Ley 3/2012, disposición que da nueva redacción al apartado Tres del artículo 4 de la Ley 27/2011')],
             'Desde 2013: primeras 48 mensualidades al 100 % de la base mínima y el resto al 50 %. La Ley 3/2012 sustituyó antes de su entrada en vigor la regla de tres tramos (24+24+resto) del texto original de la Ley 27/2011.')
c48_16 = c48.replace('50 por 100', '50 por ciento')
datos += lag(2016, ART209_2016, c48_16, c48_16, 'art. 209.1.b TRLGSS 2015, texto original (en vigor del 02/01/2016 al 31/12/2025)',
             [(ART162_2013, c48, 'art. 162.1 TRLGSS 1994, versión de 01/04/2013 (cita con «50 por 100»)')], 'Texto refundido de 2015: mismos parámetros que 2013.')
datos += lag(2026, TRLGSS, c48_26, c48_26, 'art. 209.1.b TRLGSS (art. único.23 RDL 2/2023), en vigor desde 01/01/2026',
             [(RDL, c48_26, 'RDL 2/2023, art. único.23 (art. 209.1.b TRLGSS)')], 'Desde 2026: mismos parámetros numéricos; la base mínima de referencia es la del Régimen General del mes respectivo.')
escribe('lagunas-integracion', 'Integración de lagunas de cotización en el cálculo de la base reguladora de jubilación (por versión)',
        'Parámetros numéricos de cada versión de la regla: meses del primer tramo, porcentaje de la base mínima del primer tramo y porcentaje del resto. El periodo es el año desde el que rige la versión.', datos)

n_nom = {2010: ('Las bases correspondientes a los 24 meses anteriores al mes previo al del hecho causante se computarán en su valor nominal.', ART162_2010, 'art. 162.1.1.1.ª TRLGSS 1994 (versión de 31/12/2010)', 'Las restantes bases de cotización se actualizarán de acuerdo con la evolución que haya experimentado el índice de precios al consumo desde el mes a que aquéllas correspondan, hasta el mes inmediato anterior a aquél en que se inicie el período a que se refiere la regla anterior'),
         2013: ('Las bases correspondientes a los 24 meses anteriores al mes previo al del hecho causante se computarán en su valor nominal.', ART162_2013, 'art. 162.1.1.1.ª TRLGSS 1994 (versión de 01/04/2013)', None),
         2016: ('Las bases correspondientes a los veinticuatro meses anteriores al mes previo al del hecho causante se computarán en su valor nominal.', ART209_2016, 'art. 209.1.a).1.ª TRLGSS 2015, texto original', 'Las restantes bases se actualizarán de acuerdo con la evolución que haya experimentado el Índice de Precios de Consumo desde el mes a que aquellas correspondan, hasta el mes inmediato anterior a aquel en que se inicie el período a que se refiere la regla anterior'),
         2026: ('Las bases correspondientes a los veinticuatro meses inmediatamente anteriores al mes previo al del hecho causante se computarán en su valor nominal.', TRLGSS, 'art. 209.1.c) TRLGSS (RDL 2/2023), en vigor desde 01/01/2026', 'Las restantes bases se actualizarán de acuerdo con la evolución que haya experimentado el Índice de Precios de Consumo desde el mes a que aquellas correspondan, hasta el mes inmediato anterior a aquel en que se inicie el período a que se refiere la regla anterior')}
datos = []
for ver, (c_nom, doc, loc, c_act) in n_nom.items():
    otros = [(RDL, 'Las bases correspondientes a los veinticuatro meses inmediatamente anteriores al mes previo al del hecho causante se computarán en su valor nominal', 'RDL 2/2023, art. único.23 (art. 209.1.c TRLGSS)')] if ver == 2026 else None
    datos.append(mk(f'{ver}-meses-nominales', ver, 24, 'meses más recientes (anteriores al mes previo al del hecho causante) que se computan sin actualizar', doc, c_nom, loc,
                    'Estas bases entran por su valor nominal; las anteriores se actualizan con el IPC general hasta el mes inmediato anterior al inicio de ese tramo de 24 meses.', otros))
    datos.append(mk(f'{ver}-mes-indice-referencia', ver, 25, 'mes anterior al previo al hecho causante cuyo IPC es el índice de referencia (I25)', doc, c_nom, loc,
                    'En la fórmula, cada base Bi anterior a esos 24 meses se multiplica por I25 / Ii (IPC del mes 25 / IPC del mes i). Índice: IPC general (INE).' + ('' if ver != 2013 else ' Texto idéntico al de 2010 en este extremo.'), otros))
escribe('actualizacion-bases', 'Actualización de las bases de cotización en el cálculo de la base reguladora de jubilación (por versión)',
        'Parámetros numéricos de la actualización: meses que se computan en valor nominal y mes del índice de referencia. El periodo es el año desde el que rige la versión.', datos)
