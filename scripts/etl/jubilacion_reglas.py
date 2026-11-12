"""Fase 2-A: reglas de la jubilación que el motor necesita y que no estaban en forma numérica.

Lee los textos de data-raw/boe/ (origen y huellas en data-raw/boe/origen.json) y escribe en
data/parametros/:

  escala-jubilacion-tramos            DT 9.ª y art. 210.1 (porcentaje por meses cotizados, por versión)
  jubilacion-periodo-previo           art. 205.1.b (dos años dentro de los quince anteriores)
  jubilacion-coeficientes-involuntaria  art. 207.2 (cuadro de coeficientes reductores, desde 2022)
  jubilacion-coeficientes-voluntaria    art. 208.2 (cuadro de coeficientes reductores, desde 2022)
  jubilacion-coeficientes-voluntaria-limite  DT 34.ª.2 (aplicación gradual sobre el límite, 2024-2033)
  jubilacion-anticipada-reglas        requisitos numéricos de las jubilaciones anticipadas y parcial
  jubilacion-demora-reglas            art. 210.2, Ley 21/2021 y RD 371/2023 (complemento por demora)
  lagunas-integracion-brecha-genero   DT 41.ª (lagunas de las mujeres mientras la brecha supere el 5 %)
  pension-maxima-incremento-2051-2065 DT 39.ª.4 (tabla de incrementos 2051-2065)
  complemento-brecha-genero-reglas    art. 60 (tope de hijos, relación con la pensión máxima y las mínimas)

Cada dato lleva cita literal, que el propio script comprueba contra el texto del documento
(dentro del artículo o disposición correspondiente: si no aparece, falla). Los valores que la
norma escribe con letras («cuarenta y ocho») o en años se pasan a números (meses) en `value`; la
conversión se explica en `notes`. Modo local: basta data-raw/boe/. Ejecutar con `python3 -I`."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, BOE, fusionar

RAW = f'{REPO}/data-raw/boe'
ORIGEN = json.load(open(f'{RAW}/origen.json'))

TRLGSS = ('trlgss-2015-consolidado.txt', 'Real Decreto Legislativo 8/2015, texto refundido de la Ley General de la Seguridad Social (texto consolidado, última actualización publicada el 21/10/2026; descargado el 2026-11-11)')
LEY21 = ('ley-21-2021.txt', 'Ley 21/2021, de 28 de diciembre, de garantía del poder adquisitivo de las pensiones y de otras medidas de refuerzo de la sostenibilidad financiera y social del sistema público de pensiones (PDF oficial del BOE)')
RD371 = ('rd-371-2023.txt', 'Real Decreto 371/2023, de 16 de mayo, por el que se desarrolla el régimen jurídico del complemento económico establecido en el artículo 210.2 del texto refundido de la Ley General de la Seguridad Social (texto consolidado, última actualización publicada el 28/05/2026; descargado el 2026-11-12)')

_lineas = {}


def lineas(nombre):
    if nombre not in _lineas:
        with open(f'{RAW}/{nombre}', encoding='utf-8') as f:
            _lineas[nombre] = f.read().split('\n')
    return _lineas[nombre]


def norm(s):
    return re.sub(r'\s+', ' ', s)


def bloque(doc, inicio, fin=None, desde=0):
    """Líneas desde la primera que empieza por `inicio` (a partir de `desde`) hasta la anterior a la
    primera posterior que empieza por `fin`. Falla si no existe."""
    L = lineas(doc[0])
    i = next((k for k in range(desde, len(L)) if L[k].startswith(inicio)), None)
    if i is None:
        raise SystemExit(f'BLOQUE NO ENCONTRADO en {doc[0]}: {inicio[:60]}')
    j = len(L)
    if fin:
        j = next((k for k in range(i + 1, len(L)) if L[k].startswith(fin)), None)
        if j is None:
            raise SystemExit(f'FIN DE BLOQUE NO ENCONTRADO en {doc[0]}: {fin[:60]}')
    return L[i:j]


def src(doc):
    nombre, titulo = doc
    return {'title': titulo, 'publisher': BOE, 'url': ORIGEN[nombre]['url']}


def mk(id_, periodo, valor, unidad, doc, blk, cita, loc, notas=None, conf='alta'):
    """Dato con cita literal verificada dentro del bloque `blk` (lista de líneas)."""
    texto = norm(' '.join(blk))
    for c in cita.split(' [...] '):
        if norm(c) not in texto:
            raise SystemExit(f'CITA NO ENCONTRADA ({id_}) en {doc[0]}: {c[:100]}')
    d = {'id': id_, 'value': valor, 'unit': unidad, 'period': str(periodo), 'source': src(doc), 'fetchedAt': HOY,
         'confidence': conf}
    if notas:
        d['notes'] = notas
    d['quote'] = cita.replace(' [...] ', ' […] ')
    d['location'] = loc
    return d


def dec(s):
    return float(s.replace(',', '.'))


# ---------------------------------------------------------------------------------------------
# 1. Escala de porcentajes (art. 210.1 y DT 9.ª)
# ---------------------------------------------------------------------------------------------
art210 = bloque(TRLGSS, 'Artículo 210. ', 'Artículo 211. ')
dt9 = bloque(TRLGSS, 'Disposición transitoria novena. ', 'Disposición transitoria décima. ')
LOC9 = 'DT 9.ª TRLGSS (tabla de porcentajes sustitutivos del art. 210.1.b)'
datos = []
vers = []
for l in dt9:
    m = re.match(r'\| (?:Durante los años (\d{4}) a \d{4}|A partir del año (\d{4}))\. \| (.*) \|$', l)
    if not m:
        continue
    anio = int(m.group(1) or m.group(2))
    celda = m.group(3)
    mm = re.search(r'entre los meses 1 y (\d+), el (0,\d+) por ciento y por cada uno de los (\d+) meses siguientes, el (0,\d+) por ciento', celda)
    if not mm:
        raise SystemExit(f'fila de la DT 9.ª no reconocida: {l[:120]}')
    n1, c1, n2, c2 = int(mm.group(1)), dec(mm.group(2)), int(mm.group(3)), dec(mm.group(4))
    vers.append(anio)
    cita = celda
    datos.append(mk(f'{anio}-tramo1-pct', anio, c1, '% de la base reguladora por cada mes adicional del primer tramo', TRLGSS, dt9, cita, LOC9,
                    f'Porcentaje por cada mes cotizado adicional a los 15 años, de los meses 1 a {n1}. Rige desde {anio} hasta la versión siguiente; la última versión rige «a partir» de su año.'))
    datos.append(mk(f'{anio}-tramo1-meses', anio, n1, 'meses adicionales a los 15 años a los que se aplica el primer porcentaje', TRLGSS, dt9, cita, LOC9, None))
    datos.append(mk(f'{anio}-tramo2-pct', anio, c2, '% de la base reguladora por cada mes adicional del segundo tramo', TRLGSS, dt9, cita, LOC9, None))
    datos.append(mk(f'{anio}-tramo2-meses', anio, n2, 'meses adicionales del segundo tramo (los «meses siguientes» al primer tramo)', TRLGSS, dt9, cita, LOC9, None))
if vers != [2013, 2020, 2023, 2027]:
    raise SystemExit(f'versiones de la DT 9.ª inesperadas: {vers}')
c_base = 'Por los primeros quince años cotizados, el 50 por ciento.'
c_max = 'sin que el porcentaje aplicable a la base reguladora supere el 100 por cien'
for a in vers:
    datos.append(mk(f'{a}-base-pct', a, 50, '% de la base reguladora por los primeros quince años cotizados', TRLGSS, art210, c_base,
                    'art. 210.1.a) TRLGSS', 'Quince años = 180 meses (el artículo habla de años; en `base-meses`).'))
    datos.append(mk(f'{a}-base-meses', a, 180, 'meses cotizados que dan el porcentaje base', TRLGSS, art210, c_base, 'art. 210.1.a) TRLGSS',
                    'Conversión: quince años × 12 meses.'))
    datos.append(mk(f'{a}-maximo-pct', a, 100, '% máximo de la base reguladora', TRLGSS, art210, c_max, 'art. 210.1.b) TRLGSS',
                    'Salvo la demora del art. 210.2 (puede superar el 100 % con el límite del art. 57).'))
fusionar('parametros', 'escala-jubilacion-tramos', datos,
         'Escala de porcentajes de la jubilación por meses cotizados (DT 9.ª y art. 210.1 TRLGSS), en forma numérica',
         'Por versión (el periodo es el año desde el que rige): porcentaje base (50 % a los 15 años), porcentaje y meses de cada tramo adicional y máximo. Solo desde 2013 (escala por meses); la anterior (por años) no se ha estructurado (PENDIENTE_DATOS.md).')

# ---------------------------------------------------------------------------------------------
# 2. Periodo previo (art. 205.1.b)
# ---------------------------------------------------------------------------------------------
art205 = bloque(TRLGSS, 'Artículo 205. ', 'Artículo 206. ')
c205 = 'Tener cubierto un período mínimo de cotización de quince años, de los cuales al menos dos deberán estar comprendidos dentro de los quince años inmediatamente anteriores al momento de causar el derecho.'
datos = [
    mk('2013-meses-minimos', 2013, 24, 'meses cotizados exigidos dentro de la ventana del periodo previo', TRLGSS, art205, c205, 'art. 205.1.b) TRLGSS (art. 161.1.b LGSS 1994 antes de 2016)',
       'Dos años = 24 meses. La misma regla figuraba en el art. 161.1.b) de la LGSS de 1994 (véase carencia-jubilacion); el texto citado es el vigente.'),
    mk('2013-ventana-meses', 2013, 180, 'meses inmediatamente anteriores al hecho causante (ventana del periodo previo)', TRLGSS, art205, c205, 'art. 205.1.b) TRLGSS',
       'Quince años = 180 meses.'),
]
fusionar('parametros', 'jubilacion-periodo-previo', datos, 'Periodo previo exigido a la jubilación: dos años dentro de los quince anteriores (art. 205.1.b TRLGSS)',
         'Meses cotizados exigidos (24) dentro de los 180 meses anteriores al hecho causante.')

# ---------------------------------------------------------------------------------------------
# 3. Coeficientes reductores de la jubilación anticipada (art. 207.2, 208.2) y DT 34.ª
# ---------------------------------------------------------------------------------------------
UMBRALES = {'t2': (462, '38 años y 6 meses'), 't3': (498, '41 años y 6 meses'), 't4': (534, '44 años y 6 meses')}


def coeficientes(articulo_ini, articulo_fin, nombre, titulo, descripcion, n_meses, loc, nota_art):
    blk = bloque(TRLGSS, articulo_ini, articulo_fin)
    cab = next(l for l in blk if l.startswith('|  | Periodo cotizado'))
    filas = [l for l in blk if re.match(r'\| \d+ \| [\d,]+ \| [\d,]+ \| [\d,]+ \| [\d,]+ \|$', l)]
    if len(filas) != n_meses:
        raise SystemExit(f'{nombre}: {len(filas)} filas (esperadas {n_meses})')
    datos = []
    for fila in filas:
        c = [x.strip() for x in fila.strip('|').split('|')]
        meses = int(c[0])
        for t, v in zip(('t1', 't2', 't3', 't4'), c[1:]):
            datos.append(mk(f'{t}-{meses}', 2022, dec(v), '% de reducción de la pensión', TRLGSS, blk, fila, loc,
                            f'Tramo {t[1]} de periodo cotizado, {meses} meses de anticipación. {nota_art}' if meses == n_meses else None))
    for t, (m, txt) in UMBRALES.items():
        if txt not in cab:
            raise SystemExit(f'{nombre}: cabecera sin «{txt}»')
        datos.append(mk(f'umbral-{t}', 2022, m, 'meses cotizados desde los que se aplica el tramo', TRLGSS, blk, cab, loc,
                        f'Conversión de «{txt}» a meses. Tramo 1: menos de 462 meses (38 años y 6 meses); tramo 2: de 462 a menos de 498; tramo 3: de 498 a menos de 534; tramo 4: 534 o más.'))
    fusionar('parametros', nombre, datos, titulo, descripcion)


coeficientes('Artículo 207. ', 'Artículo 208. ', 'jubilacion-coeficientes-involuntaria',
             'Coeficientes reductores de la jubilación anticipada por causa no imputable al trabajador (art. 207.2 TRLGSS)',
             'Porcentaje de reducción de la pensión por meses de anticipación (1 a 48) y tramo de periodo cotizado (t1 a t4), según el cuadro del art. 207.2 en la redacción de la Ley 21/2021 (en vigor desde 2022). El periodo es el año desde el que rige.',
             48, 'art. 207.2 TRLGSS (art. 1.6 de la Ley 21/2021; en vigor desde 01/01/2022)',
             'Cuadro del art. 207.2: la reducción se aplica por cada mes o fracción de mes de anticipación.')
coeficientes('Artículo 208. ', 'Artículo 209. ', 'jubilacion-coeficientes-voluntaria',
             'Coeficientes reductores de la jubilación anticipada por voluntad del interesado (art. 208.2 TRLGSS)',
             'Porcentaje de reducción de la pensión por meses de anticipación (1 a 24) y tramo de periodo cotizado (t1 a t4), según el cuadro del art. 208.2 en la redacción de la Ley 21/2021 (en vigor desde 2022). El periodo es el año desde el que rige.',
             24, 'art. 208.2 TRLGSS (art. 1.7 de la Ley 21/2021; en vigor desde 01/01/2022)',
             'Cuadro del art. 208.2: la reducción se aplica por cada mes o fracción de mes de anticipación.')

# DT 34.ª: coeficientes sobre el límite (art. 210.3 párr. 2.º), 2024-2033
dt34 = bloque(TRLGSS, 'Disposición transitoria trigésima cuarta. ', 'Disposición transitoria trigésima quinta. ')
tramos_dt34 = []
for k, l in enumerate(dt34):
    if l.startswith('Período cotizado'):
        tramos_dt34.append(k)
if len(tramos_dt34) != 4:
    raise SystemExit('DT 34.ª: se esperaban 4 cuadros')
datos = []
for n, k in enumerate(tramos_dt34, start=1):
    fin = tramos_dt34[n] if n < 4 else len(dt34)
    sub = dt34[k:fin]
    cab = sub[1]
    anios = [int(x) for x in re.findall(r'\d{4}', cab)]
    if anios != list(range(2024, 2034)):
        raise SystemExit(f'DT 34.ª cuadro {n}: años {anios}')
    filas = [l for l in sub if re.match(r'\| \d+ \|(?: [\d,]+ \|){10}$', l)]
    if len(filas) != 24:
        raise SystemExit(f'DT 34.ª cuadro {n}: {len(filas)} filas')
    for fila in filas:
        c = [x.strip() for x in fila.strip('|').split('|')]
        meses = int(c[0])
        for a, v in zip(anios, c[1:]):
            datos.append(mk(f'{a}-t{n}-{meses}', a, dec(v), '% de reducción aplicado sobre el límite de pensión (art. 210.3, párr. 2.º)', TRLGSS, dt34, fila,
                            'DT 34.ª.2 TRLGSS (art. 1.21 de la Ley 21/2021)',
                            'Aplicación gradual 2024-2033 de los coeficientes del art. 208.2 cuando la pensión calculada supera el límite del art. 57. En 2033 coinciden con el art. 208.2. Desde 2034 rige el art. 208.2.' if (meses == 24 and n == 1 and a == 2024) else None))
fusionar('parametros', 'jubilacion-coeficientes-voluntaria-limite', datos,
         'Aplicación gradual de los coeficientes reductores sobre el límite de pensión (DT 34.ª TRLGSS, 2024-2033)',
         'Porcentaje de reducción por meses de anticipación (1 a 24) y tramo de periodo cotizado (t1 a t4), para cada año de 2024 a 2033, cuando la pensión resultante supera el límite del art. 57 en la jubilación anticipada voluntaria (art. 210.3, párrafo segundo).')

# ---------------------------------------------------------------------------------------------
# 4. Requisitos numéricos de las anticipadas y de la parcial
# ---------------------------------------------------------------------------------------------
art207 = bloque(TRLGSS, 'Artículo 207. ', 'Artículo 208. ')
art208 = bloque(TRLGSS, 'Artículo 208. ', 'Artículo 209. ')
art215 = bloque(TRLGSS, 'Artículo 215. ', 'CAPÍTULO XIV')
M = 'meses'
L207, L208, L210, L215 = 'art. 207.1 TRLGSS', 'art. 208 TRLGSS', 'art. 210.4 TRLGSS', 'art. 215 TRLGSS'
datos = [
    mk('involuntaria-anticipo-maximo-meses', 2022, 48, M + ' de anticipación como máximo respecto de la edad ordinaria', TRLGSS, art207,
       'Tener cumplida una edad que sea inferior en cuatro años, como máximo, a la edad que en cada caso resulte de aplicación', L207 + '.a)', 'Cuatro años = 48 meses.'),
    mk('involuntaria-demandante-empleo-meses', 2022, 6, M + ' inmediatamente anteriores a la solicitud como demandante de empleo', TRLGSS, art207,
       'durante un plazo de, al menos, seis meses inmediatamente anteriores a la fecha de la solicitud de la jubilación', L207 + '.b)', None),
    mk('involuntaria-cotizacion-efectiva-meses', 2022, 396, 'meses de cotización efectiva exigidos', TRLGSS, art207,
       'Acreditar un período mínimo de cotización efectiva de 33 años', L207 + '.c)', 'Treinta y tres años = 396 meses, sin parte proporcional de pagas extraordinarias.'),
    mk('involuntaria-servicio-militar-maximo-meses', 2022, 12, M + ' como máximo del servicio militar o prestación social computables', TRLGSS, art207,
       'solo se computará el período de prestación del servicio militar obligatorio o de la prestación social sustitutoria, o del servicio social femenino obligatorio, con el límite máximo de un año', L207 + '.c)', 'Un año = 12 meses.'),
    mk('involuntaria-tope-pension-pct-trimestre', 2022, 0.5, '% de reducción del tope máximo de pensión por trimestre o fracción de anticipación', TRLGSS, art210,
       'no podrá ser superior a la cuantía que resulte de reducir el tope máximo de pensión en un 0,50 por ciento por cada trimestre o fracción de trimestre de anticipación', L210, None),
    mk('voluntaria-anticipo-maximo-meses', 2022, 24, M + ' de anticipación como máximo respecto de la edad ordinaria', TRLGSS, art208,
       'Tener cumplida una edad que sea inferior en dos años, como máximo, a la edad que en cada caso resulte de aplicación', L208 + '.1.a)', 'Dos años = 24 meses.'),
    mk('voluntaria-cotizacion-efectiva-meses', 2022, 420, 'meses de cotización efectiva exigidos', TRLGSS, art208,
       'Acreditar un período mínimo de cotización efectiva de treinta y cinco años', L208 + '.1.b)', 'Treinta y cinco años = 420 meses, sin parte proporcional de pagas extraordinarias.'),
    mk('voluntaria-servicio-militar-maximo-meses', 2022, 12, M + ' como máximo del servicio militar o prestación social computables', TRLGSS, art208,
       'con el límite máximo de un año', L208 + '.1.b)', 'Un año = 12 meses.'),
    mk('voluntaria-subsidio-desempleo-meses', 2022, 3, M + ' mínimos con subsidio por desempleo para aplicar los coeficientes de la involuntaria', TRLGSS, art208,
       'el trabajador esté percibiendo el subsidio por desempleo del artículo 274, y lo haya hecho durante al menos tres meses', L208 + '.3', None),
    mk('parcial-reduccion-jornada-minima-pct', 2025, 25, '% mínimo de reducción de jornada', TRLGSS, art215,
       'siempre que se produzca una reducción de su jornada de trabajo comprendida entre un mínimo del 25 por ciento y un máximo del 75 por ciento', L215 + '.1', 'Versión vigente desde 01/04/2025 (RDL 11/2024).'),
    mk('parcial-reduccion-jornada-maxima-pct', 2025, 75, '% máximo de reducción de jornada', TRLGSS, art215,
       'siempre que se produzca una reducción de su jornada de trabajo comprendida entre un mínimo del 25 por ciento y un máximo del 75 por ciento', L215 + '.1', None),
    mk('parcial-relevo-anticipo-maximo-meses', 2025, 36, M + ' de anticipación como máximo (con contrato de relevo)', TRLGSS, art215,
       'una edad que sea inferior en tres años, como máximo, a la edad que en cada caso resulte de aplicación', L215 + '.2.a)', 'Tres años = 36 meses.'),
    mk('parcial-relevo-cotizacion-meses', 2025, 396, 'meses de cotización exigidos (con contrato de relevo)', TRLGSS, art215,
       'acreditar un periodo de cotización de treinta y tres años', L215 + '.2.a)', 'Treinta y tres años = 396 meses, sin pagas extraordinarias.'),
    mk('parcial-relevo-cotizacion-discapacidad-meses', 2025, 300, 'meses de cotización exigidos con discapacidad igual o superior al 33 % (con relevo)', TRLGSS, art215,
       'el período de cotización de 33 años indicado en el párrafo anterior se reducirá al de veinticinco años', L215 + '.2.a)', 'Veinticinco años = 300 meses.'),
    mk('parcial-relevo-antiguedad-empresa-meses', 2025, 72, 'meses de antigüedad en la empresa exigidos (con relevo)', TRLGSS, art215,
       'Acreditar un período de antigüedad en la empresa de, al menos, seis años inmediatamente anteriores', L215 + '.2.b)', 'Seis años = 72 meses.'),
]
fusionar('parametros', 'jubilacion-anticipada-reglas', datos,
         'Requisitos numéricos de las jubilaciones anticipadas y de la jubilación parcial (arts. 207, 208, 210.4 y 215 TRLGSS)',
         'Meses máximos de anticipación, cotización efectiva exigida, demanda de empleo, tope de pensión por trimestre y condiciones de la jubilación parcial. Anticipadas: redacción de la Ley 21/2021 (desde 2022). Parcial: redacción vigente desde 01/04/2025.')

# ---------------------------------------------------------------------------------------------
# 5. Jubilación demorada (art. 210.2, Ley 21/2021, RD 371/2023)
# ---------------------------------------------------------------------------------------------
L2102 = 'art. 210.2 TRLGSS (art. 1.8 de la Ley 21/2021; en vigor desde 01/01/2022)'
cita_formula = ('1.º Si ha cotizado menos de 44 años y 6 meses: 1 Pensión inicial anual [...] 1,65 Pago único = 800 [...] 500 2.º Si ha cotizado, al menos, '
                '44 años y 6 meses la cifra anterior se aumenta en un 10%: 1 Pensión inicial anual [...] 1,65 Pago único = 880 [...] 500 Verificable')
ley21 = lineas(LEY21[0])
nota_formula = ('Fórmula (Ley 21/2021, art. 1.Ocho, PDF oficial del BOE, donde es texto): Pago único = 800 × (Pensión inicial anual / 500)^(1/1,65) si se han cotizado menos de 44 años y 6 meses; '
                'Pago único = 880 × (…) si al menos 44 años y 6 meses. La disposición de las cifras en el PDF (numerador, exponente 1/1,65 y divisor 500) se comprobó sobre el PDF en la Fase 1A-bis; el texto extraído no conserva la barra de fracción ni el exponente.')
art210_ = art210
datos = [
    mk('porcentaje-adicional-anual', 2022, 4, '% adicional de la base reguladora por cada año completo de demora', TRLGSS, art210_,
       'Un porcentaje adicional de un 4 por ciento por cada año completo cotizado entre la fecha en que cumplió dicha edad y la del hecho causante de la pensión', L2102 + ', letra a)', None),
    mk('porcentaje-adicional-semestre', 2022, 2, '% adicional por un periodo de más de 6 meses y menos de un año (desde el segundo año completo)', TRLGSS, art210_,
       'correspondiendo a dichos periodos un 2 por ciento adicional', L2102 + ', letra a)', None),
    mk('fraccion-minima-meses', 2022, 6, M + ' que debe superar la fracción para computarse (desde el segundo año completo)', TRLGSS, art210_,
       'se podrán computar periodos superiores a 6 meses e inferiores a un año', L2102, 'El periodo debe ser superior a 6 meses (estrictamente) e inferior a un año.'),
    mk('tanto-alzado-base-menos-44-6', 2022, 800, 'euros (numerador de la fórmula del pago único, cotización inferior a 44 años y 6 meses)', LEY21, ley21, cita_formula,
       'Ley 21/2021, art. 1.Ocho (nueva redacción del art. 210.2.b TRLGSS)', nota_formula),
    mk('tanto-alzado-base-44-6-o-mas', 2022, 880, 'euros (numerador de la fórmula del pago único, cotización de al menos 44 años y 6 meses)', LEY21, ley21, cita_formula,
       'Ley 21/2021, art. 1.Ocho (nueva redacción del art. 210.2.b TRLGSS)', 'Es la cifra anterior aumentada en un 10 % (800 × 1,10).'),
    mk('tanto-alzado-divisor-pension', 2022, 500, 'euros (divisor de la pensión inicial anual en la fórmula del pago único)', LEY21, ley21, cita_formula,
       'Ley 21/2021, art. 1.Ocho (nueva redacción del art. 210.2.b TRLGSS)', None),
    mk('tanto-alzado-exponente-divisor', 2022, 1.65, 'divisor del exponente (el exponente es 1/1,65)', LEY21, ley21, cita_formula,
       'Ley 21/2021, art. 1.Ocho (nueva redacción del art. 210.2.b TRLGSS)', None),
    mk('tanto-alzado-umbral-cotizacion-meses', 2022, 534, 'meses cotizados que activan la cifra de 880 euros', TRLGSS, art210_,
       'Si ha cotizado, al menos, 44 años y 6 meses la cifra anterior se aumenta en un 10 %', L2102 + ', letra b)', 'Conversión: 44 años y 6 meses = 534 meses.'),
    mk('tanto-alzado-factor-semestre', 2022, 0.5, 'factor sobre el pago único por un periodo de más de 6 meses y menos de un año (desde el segundo año completo)', TRLGSS, art210_,
       'correspondiendo a dichos periodos el resultado de multiplicar la cuantía de la formula anterior por 0,5', L2102 + ', letra b).2.º', None),
]
rd = lineas(RD371[0])
a3 = bloque(RD371, 'Artículo 3. ', 'Artículo 4. ')
L371 = 'art. 3 del RD 371/2023 (redacción del RD 416/2026, en vigor desde 28/08/2026)'
nota_mixta = 'Redacción vigente desde el 28/08/2026 (RD 416/2026, disposición final 1.1); para hechos causantes anteriores regía la redacción original del RD 371/2023, que no se ha transcrito.'
datos += [
    mk('mixta-minimo-anios', 2026, 2, 'años completos cotizados tras la edad ordinaria para poder optar por la modalidad mixta', RD371, a3,
       'cuando acrediten, al menos, dos años completos cotizados entre la fecha en que cumplieron la edad ordinaria de jubilación aplicable y la del hecho causante', L371, nota_mixta),
    mk('mixta-tramo1-maximo-meses', 2026, 102, 'meses cotizados tras la edad ordinaria hasta los que se aplica el reparto por mitades', RD371, a3,
       'se acrediten entre dos y ocho años y seis meses de cotización', L371, 'Conversión: ocho años y seis meses = 102 meses. ' + nota_mixta),
    mk('mixta-tramo1-divisor-anios', 2026, 2, 'partes iguales en que se dividen los años completos (la parte entera recibe el 4 % adicional)', RD371, a3,
       'Los años completos cotizados se dividirán en dos partes iguales', L371, nota_mixta),
    mk('mixta-tramo2-minimo-anios', 2026, 9, 'años cotizados tras la edad ordinaria desde los que se aplica la regla de cinco años a tanto alzado', RD371, a3,
       'se acredite un periodo de nueve o más años cotizados', L371, nota_mixta),
    mk('mixta-vigencia-desde', 2026, 20260828, 'fecha AAAAMMDD desde la que rige la redacción del art. 3 del RD 371/2023 que se transcribe', RD371, a3,
       'Se modifica, con efectos desde el 28 de agosto de 2026, por la disposición final 1.1 del Real Decreto 416/2026, de 27 de mayo', L371, 'Fecha tomada del aviso de modificación del texto consolidado; antes de esa fecha rige la redacción original del RD 371/2023.'),
    mk('mixta-tramo2-anios-tanto-alzado', 2026, 5, 'años del periodo que se pagan a tanto alzado (el resto, con porcentaje adicional)', RD371, a3,
       'Una cantidad a tanto alzado por cinco años de ese periodo', L371, nota_mixta),
]
fusionar('parametros', 'jubilacion-demora-reglas', datos,
         'Complemento por jubilación demorada: porcentaje adicional, pago único y opción mixta (art. 210.2 TRLGSS, Ley 21/2021 y RD 371/2023)',
         'Porcentaje adicional (4 % por año, 2 % por semestre), fórmula del pago único (800/880, divisor 500, exponente 1/1,65) y reglas numéricas de la opción mixta. Periodo = año desde el que rige cada regla.')

# ---------------------------------------------------------------------------------------------
# 6. DT 41.ª: lagunas de la brecha de género
# ---------------------------------------------------------------------------------------------
dt41 = bloque(TRLGSS, 'Disposición transitoria cuadragésima primera. ', 'Disposición transitoria cuadragésima segunda. ')
c41 = ('los meses en los que no haya existido obligación de cotizar, desde la cuadragésima novena mensualidad hasta la sexagésima, se integrarán con el 100 por ciento de la base mínima de cotización del Régimen General '
       'que corresponda al mes respectivo. Este porcentaje será del 80 por ciento de la misma base desde la mensualidad sexagésima primera a la octagésima cuarta')
L41 = 'DT 41.ª TRLGSS (art. único.41 del RDL 2/2023; en vigor desde 01/01/2026)'
n41 = 'Se aplica a las mujeres trabajadoras por cuenta ajena y, con las condiciones del art. 60.1.b) reglas 1.ª o 2.ª, a los hombres; «en tanto la brecha de género sea superior al 5 por ciento» (DA 37.ª). No consta en /data la brecha de ningún año: el motor lo trata como opción.'
da37 = bloque(TRLGSS, 'Disposición adicional trigésima séptima. ', 'Disposición adicional trigésima octava. ')
datos = [
    mk('2026-tramo-a-desde-mes', 2026, 49, 'mensualidad (contada desde el hecho causante hacia atrás) desde la que se aplica el primer porcentaje adicional', TRLGSS, dt41, c41, L41, n41),
    mk('2026-tramo-a-hasta-mes', 2026, 60, 'mensualidad hasta la que se aplica el primer porcentaje adicional', TRLGSS, dt41, c41, L41, None),
    mk('2026-tramo-a-pct-base-minima', 2026, 100, '% de la base mínima de las mensualidades 49.ª a 60.ª', TRLGSS, dt41, c41, L41, None),
    mk('2026-tramo-b-desde-mes', 2026, 61, 'mensualidad desde la que se aplica el segundo porcentaje adicional', TRLGSS, dt41, c41, L41, None),
    mk('2026-tramo-b-hasta-mes', 2026, 84, 'mensualidad hasta la que se aplica el segundo porcentaje adicional', TRLGSS, dt41, c41, L41, None),
    mk('2026-tramo-b-pct-base-minima', 2026, 80, '% de la base mínima de las mensualidades 61.ª a 84.ª', TRLGSS, dt41, c41, L41, None),
    mk('2026-umbral-brecha-pct', 2026, 5, '% de brecha de género de las pensiones de jubilación por encima del cual rige la medida', TRLGSS, dt41,
       'En tanto la brecha de género sea superior al 5 por ciento', L41 + '; DA 37.ª', 'La DA 37.ª.1 define la brecha como la diferencia porcentual entre el importe medio de las pensiones de jubilación causadas en un año por mujeres y por hombres.'),
]
fusionar('parametros', 'lagunas-integracion-brecha-genero', datos,
         'Integración de lagunas con porcentajes adicionales de las mensualidades 49.ª a 84.ª (DT 41.ª TRLGSS)',
         'Mensualidades y porcentajes de la base mínima de la integración reforzada (100 % de la 49.ª a la 60.ª y 80 % de la 61.ª a la 84.ª) y umbral de la brecha de género que la condiciona. Rige desde 2026.')

# ---------------------------------------------------------------------------------------------
# 7. DT 39.ª.4: incrementos de la pensión máxima 2051-2065
# ---------------------------------------------------------------------------------------------
dt39 = bloque(TRLGSS, 'Disposición transitoria trigésima novena. ', 'Disposición transitoria cuadragésima. ')
c39 = 'Desde 2051, el incremento anual adicional aplicable para determinar la cuantía máxima inicial de las pensiones causadas desde ese año hasta 2065 será el recogido en la siguiente tabla'
datos = []
for l in dt39:
    m = re.match(r'\| (20\d\d) \| ([\d,]+) \|$', l)
    if not m:
        continue
    a, v = int(m.group(1)), dec(m.group(2))
    datos.append(mk(str(a), a, v, 'puntos porcentuales (valor de la tabla de la DT 39.ª.4; su lectura es una cuestión abierta, véase notes)', TRLGSS, dt39, l, 'DT 39.ª.4 TRLGSS (art. único.39 del RDL 2/2023)',
                    ('La DT dice «incremento anual adicional» y la tabla crece de 3,2 a 20,0; la DT 39.ª.1 suma 0,115 puntos «acumulativos» cada año hasta 2050 (26 × 0,115 = 2,99, que enlaza con el 3,2 de 2051). '
                     'Dos lecturas: (a) la tabla es el incremento acumulado total sobre el límite (convergencia hasta 30 puntos, DT 39.ª.4 último párrafo); (b) es el incremento anual adicional literal. '
                     'El motor las ofrece como opción (véase docs/REVISION_ACTUARIAL.md).') if a == 2051 else None,
                    conf='media' if a == 2051 else 'alta'))
if [d['period'] for d in datos] != [str(a) for a in range(2051, 2066)]:
    raise SystemExit('tabla de la DT 39.ª.4 incompleta')
cita_total = 'En 2065, se valorará en el marco del diálogo social la conveniencia de mantener el proceso de convergencia hasta alcanzar un incremento total de 30 puntos porcentuales'
datos.append(mk('2065-convergencia-total', 2065, 30, 'puntos porcentuales de incremento total al que apunta el proceso de convergencia (a valorar en 2065)', TRLGSS, dt39, cita_total,
                'DT 39.ª.4 TRLGSS', 'No es un incremento fijado por ley: la DT prevé valorar en 2065 si se mantiene la convergencia hasta ese total.', conf='media'))
fusionar('parametros', 'pension-maxima-incremento-2051-2065', datos,
         'Incrementos de la pensión máxima inicial de 2051 a 2065 (DT 39.ª.4 TRLGSS)',
         'Tabla de la DT 39.ª.4 con el incremento (puntos porcentuales) que fija la ley para cada año de 2051 a 2065; y el total de 30 puntos al que apunta la convergencia.')

# ---------------------------------------------------------------------------------------------
# 8. Art. 60: reglas del complemento de brecha de género
# ---------------------------------------------------------------------------------------------
art60 = bloque(TRLGSS, 'Artículo 60. ', 'Artículo 61. ')
L60 = 'art. 60 TRLGSS'
datos = [
    mk('hijos-minimo', 2023, 1, 'hijos o hijas mínimos para tener derecho al complemento', TRLGSS, art60,
       'Las mujeres que hayan tenido uno o más hijos o hijas y que sean beneficiarias de una pensión contributiva de jubilación', L60 + '.1', 'Versión del RDL 2/2023 (desde 2024: un complemento por cada hijo o hija, sin mínimo de dos).'),
    mk('hijos-maximo-multiplo', 2023, 4, 'veces el importe mensual por hijo: tope de la cuantía a percibir', TRLGSS, art60,
       'La cuantía a percibir estará limitada a cuatro veces el importe mensual fijado por hijo o hija', L60 + '.3', None),
    mk('computa-limite-pension-maxima', 2023, 0, 'indicador (1 = el complemento se tiene en cuenta en el límite máximo de pensiones; 0 = no)', TRLGSS, art60,
       'El importe del complemento no será tenido en cuenta en la aplicación del límite máximo de pensiones previsto en los artículos 57 y 58.7', L60 + '.3.d)', None),
    mk('se-suma-a-la-minima', 2023, 1, 'indicador (1 = con complemento por mínimos, el de brecha se suma a la cuantía mínima)', TRLGSS, art60,
       'Cuando concurran dichos requisitos, se reconocerá la cuantía mínima de pensión según establezca anualmente la correspondiente Ley de Presupuestos Generales del Estado. A este importe se sumará el complemento para la reducción de la brecha de género', L60 + '.3.e)', None),
    mk('pagas-anuales', 2023, 14, 'pagas anuales de las pensiones contributivas (12 mensualidades y 2 extraordinarias)', TRLGSS, art60,
       'El complemento será satisfecho en catorce pagas, junto con la pensión que determine el derecho al mismo', L60 + '.3.c)',
       'Las pensiones contributivas se abonan en catorce pagas; así se expresan la pensión máxima de pension-maxima (euros/mes, 14 pagas) y las mínimas anuales. El motor usa este dato para pasar de importe mensual a anual.'),
    mk('compatible-con-jubilacion-parcial', 2023, 0, 'indicador (1 = se reconoce en la jubilación parcial; 0 = no hasta el acceso a la jubilación plena)', TRLGSS, art60,
       'No se tendrá derecho a este complemento en los casos de jubilación parcial', L60 + '.4', 'Se reconoce el complemento cuando desde la jubilación parcial se acceda a la jubilación plena.'),
]
fusionar('parametros', 'complemento-brecha-genero-reglas', datos,
         'Reglas numéricas del complemento para la reducción de la brecha de género (art. 60 TRLGSS)',
         'Hijos mínimos, tope de cuatro veces el importe por hijo, relación con el límite de pensión máxima y con el complemento por mínimos, y exclusión de la jubilación parcial.')
# ---------------------------------------------------------------------------------------------
# 9. Edad de 65 años (carrera larga y referencia de las mínimas)
# ---------------------------------------------------------------------------------------------
c65 = 'Haber cumplido sesenta y siete años de edad, o sesenta y cinco años cuando se acrediten treinta y ocho años y seis meses de cotización'
c65m = 'al cumplimiento de los sesenta y cinco años de edad'
datos = [
    mk('2013-carrera-larga-meses', 2013, 780, 'meses de edad (65 años) exigidos con la carrera de cotización de la DT 7.ª', TRLGSS, art205, c65, 'art. 205.1.a) TRLGSS',
       'Sesenta y cinco años = 780 meses. Es la edad con carrera larga en todos los años de la DT 7.ª (antes de 2013, edad única de 65 años: edad-ordinaria-jubilacion).'),
    mk('2013-referencia-minimas-meses', 2013, 780, 'meses de edad (65 años) a partir de los cuales se aplica la cuantía mínima «de 65 años»', TRLGSS, art208, c65m, 'art. 208.1.c) TRLGSS',
       'Sesenta y cinco años = 780 meses. Distingue las mínimas jub65 de las jub-menor65 (pension-minima-jubilacion).'),
]
fusionar('parametros', 'jubilacion-edad-65', datos, 'Edad de 65 años: jubilación con carrera larga y referencia de las cuantías mínimas (arts. 205.1.a y 208.1.c TRLGSS)',
         'Edad de 65 años en meses (780), con la cita del artículo que la fija como edad con carrera larga y como referencia de las pensiones mínimas.')
print('hecho')
