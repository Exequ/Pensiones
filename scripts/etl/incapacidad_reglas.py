"""Fase 2-B-1: reglas de la incapacidad permanente contributiva para el motor.

Lee los textos de data-raw/boe/ (origen y huellas en data-raw/boe/origen.json; los textos
consolidados de la normativa de desarrollo los genera scripts/etl/boe_consolidado.py) y escribe en
data/parametros/:

  incapacidad-permanente-reglas   grados, beneficiarios y carencias, base reguladora por origen,
                                  porcentajes por grado, años de la ficción, total cualificada,
                                  complemento de gran incapacidad, suelo de la total, parcial,
                                  compatibilidad con el trabajo, art. 60 y reglas de las normas de
                                  revalorización (máxima, revalorización y mínimas de la gran
                                  incapacidad)
  pension-minima-incapacidad      añade las clases «Total: titular con 65 años» y «Total: titular con
                                  edad entre 60 y 64 años» de 2022 a 2026 (Anexo I), que la
                                  extracción de la Fase 1A no recogió porque la norma escribe la edad
                                  con letras

Cada dato lleva cita literal que el propio script comprueba **dentro del artículo o bloque** que se
cita (si no aparece, falla). De los textos consolidados se usa la versión vigente del bloque y se
comprueba que lo es para todos los hechos causantes desde 2022 (si una versión posterior a
01/01/2022 la sustituye, el script se detiene salvo que se indique la fecha). Ejecutar con
`python3 -I`.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from comun import BOE, REPO, fusionar  # noqa: E402

RAW = f'{REPO}/data-raw/boe'
ORIGEN = json.load(open(f'{RAW}/origen.json', encoding='utf-8'))
HOY = os.environ.get('FECHA_DESCARGA', '2026-11-12')
DESDE = 20220101  # hechos causantes cubiertos por el motor

TRLGSS = ('trlgss-2015-consolidado.txt', 'Real Decreto Legislativo 8/2015, texto refundido de la Ley General de la Seguridad Social (texto consolidado, última actualización publicada el 21/10/2026; descargado el 2026-11-11)', '2026-11-11')
O1969 = ('orden-15-04-1969.txt', 'Orden de 15 de abril de 1969 por la que se establecen normas para la aplicación y desarrollo de las prestaciones por invalidez en el Régimen General de la Seguridad Social (texto consolidado)', HOY)
D1646 = ('decreto-1646-1972.txt', 'Decreto 1646/1972, de 23 de junio, para la aplicación de la Ley 24/1972, de 21 de junio, en materia de prestaciones del Régimen General de la Seguridad Social (texto consolidado)', HOY)
D3158 = ('decreto-3158-1966.txt', 'Decreto 3158/1966, de 23 de diciembre, Reglamento General que determina la cuantía de las prestaciones económicas del Régimen General de la Seguridad Social (texto consolidado)', HOY)
RD1799 = ('rd-1799-1985.txt', 'Real Decreto 1799/1985, de 2 de octubre, para la aplicación de la Ley 26/1985 en materia de racionalización de las pensiones de jubilación e invalidez permanente (texto consolidado)', HOY)
RD1071 = ('rd-1071-1984.txt', 'Real Decreto 1071/1984, de 23 de mayo, por el que se modifican diversos aspectos en la normativa vigente en materia de invalidez permanente (texto consolidado)', HOY)
RDS = {
    2022: ('BOE-A-2022-1189.txt', 'Real Decreto 65/2022, de 25 de enero, sobre actualización de las pensiones del sistema de la Seguridad Social para el ejercicio 2022', HOY),
    2023: ('BOE-A-2022-22694.txt', 'Real Decreto 1058/2022, de 27 de diciembre, sobre revalorización de las pensiones del sistema de la Seguridad Social para el ejercicio 2023', HOY),
    2024: ('BOE-A-2023-26452.txt', 'Real Decreto-ley 8/2023, de 27 de diciembre (medidas para 2024, incluida la revalorización de las pensiones)', HOY),
    2025: ('BOE-A-2025-7660.txt', 'Real Decreto 316/2025, de 15 de abril, sobre limitación de la cuantía inicial de las pensiones públicas y revalorización de las pensiones para el ejercicio 2025', HOY),
    2026: ('BOE-A-2026-6977.txt', 'Real Decreto 241/2026, de 25 de marzo, sobre limitación de la cuantía inicial de las pensiones públicas y revalorización de las pensiones para el ejercicio 2026', HOY),
}

_lineas = {}


def lineas(doc):
    if doc[0] not in _lineas:
        with open(f'{RAW}/{doc[0]}', encoding='utf-8') as f:
            _lineas[doc[0]] = f.read().split('\n')
    return _lineas[doc[0]]


def norm(s):
    return re.sub(r'\s+', ' ', s)


def articulo(doc, inicio, fin):
    """Líneas de un artículo del TRLGSS consolidado (desde `inicio` hasta antes de `fin`)."""
    L = lineas(doc)
    i = next((k for k, l in enumerate(L) if l.startswith(inicio)), None)
    if i is None:
        raise SystemExit(f'BLOQUE NO ENCONTRADO en {doc[0]}: {inicio}')
    j = next((k for k in range(i + 1, len(L)) if L[k].startswith(fin)), None)
    if j is None:
        raise SystemExit(f'FIN NO ENCONTRADO en {doc[0]}: {fin}')
    return L[i:j]


def version(doc, bid, sustituida_desde=None):
    """Versión vigente del bloque `bid` de un texto consolidado (todas las versiones en el fichero).

    Exige que la versión vigente rija desde antes del 01/01/2022, salvo que se indique en
    `sustituida_desde` la fecha en que entró en vigor (para documentarlo en la nota)."""
    L = lineas(doc)
    cab = [(k, int(m.group(1))) for k, l in enumerate(L)
           if (m := re.match(rf'\[Bloque {re.escape(bid)} · vigente desde (\d+) · ', l))]
    if not cab:
        raise SystemExit(f'BLOQUE {bid} NO ENCONTRADO en {doc[0]}')
    k, desde = max(cab, key=lambda c: c[1])
    if desde > DESDE and desde != sustituida_desde:
        raise SystemExit(f'{doc[0]} {bid}: la versión vigente es de {desde}, posterior a {DESDE}')
    j = next((n for n in range(k + 1, len(L)) if L[n].startswith('[Bloque ')), len(L))
    return L[k + 1:j]


def src(doc):
    return {'title': doc[1], 'publisher': BOE, 'url': ORIGEN[doc[0]]['url']}


def mk(id_, periodo, valor, unidad, doc, blk, cita, loc, notas=None, conf='alta'):
    texto = norm(' '.join(blk))
    for c in cita.split(' [...] '):
        if norm(c) not in texto:
            raise SystemExit(f'CITA NO ENCONTRADA ({id_}) en {doc[0]} ({loc}): {c[:120]}')
    d = {'id': id_, 'value': valor, 'unit': unidad, 'period': str(periodo), 'source': src(doc),
         'fetchedAt': doc[2], 'confidence': conf}
    if notas:
        d['notes'] = notas
    d['quote'] = cita.replace(' [...] ', ' […] ')
    d['location'] = loc
    return d


M = 'meses'
datos = []

# ---------------------------------------------------------------------------------------------
# 1. Grados (art. 194 y DT 26.ª: redacción aplicable mientras no haya desarrollo reglamentario)
# ---------------------------------------------------------------------------------------------
a194 = articulo(TRLGSS, 'Artículo 194. ', 'Artículo 195. ')
dt26 = articulo(TRLGSS, 'Disposición transitoria vigésima sexta. ', 'Disposición transitoria vigésima séptima. ')
L26 = 'DT 26.ª TRLGSS (redacción del art. 194 aplicable hasta su desarrollo reglamentario)'
datos += [
    mk('grados-aplicables-hasta-desarrollo', 2016, 1, 'indicador (1 = rige la redacción de la DT 26.ª)', TRLGSS, dt26,
       'Lo dispuesto en el artículo 194 de esta ley únicamente será de aplicación a partir de la fecha en que entren en vigor las disposiciones reglamentarias a que se refiere el apartado 3 del mencionado artículo 194. Hasta que no se desarrolle reglamentariamente dicho artículo será de aplicación la siguiente redacción',
       L26 + ', apartado Uno', 'El art. 194 (grados por porcentaje de reducción de la capacidad) no rige: falta la lista de enfermedades reglamentaria. Las definiciones que siguen son las de la DT 26.ª.'),
    mk('grado-parcial', 2016, 'parcial', 'grado', TRLGSS, dt26,
       'Se entenderá por incapacidad permanente parcial para la profesión habitual la que, sin alcanzar el grado de total, ocasione al trabajador una disminución no inferior al 33 por ciento en su rendimiento normal para dicha profesión, sin impedirle la realización de las tareas fundamentales de la misma.',
       L26 + ', art. 194.3'),
    mk('grado-parcial-reduccion-minima-pct', 2016, 33, '% mínimo de disminución del rendimiento normal en la profesión habitual', TRLGSS, dt26,
       'ocasione al trabajador una disminución no inferior al 33 por ciento en su rendimiento normal para dicha profesión', L26 + ', art. 194.3'),
    mk('grado-total', 2016, 'total', 'grado', TRLGSS, dt26,
       'Se entenderá por incapacidad permanente total para la profesión habitual la que inhabilite al trabajador para la realización de todas o de las fundamentales tareas de dicha profesión, siempre que pueda dedicarse a otra distinta.',
       L26 + ', art. 194.4'),
    mk('grado-absoluta', 2016, 'absoluta', 'grado', TRLGSS, dt26,
       'Se entenderá por incapacidad permanente absoluta para todo trabajo la que inhabilite por completo al trabajador para toda profesión u oficio.',
       L26 + ', art. 194.5'),
    mk('grado-gran-incapacidad', 2016, 'gran-incapacidad', 'grado', TRLGSS, dt26,
       'Se entenderá por gran incapacidad la situación del trabajador afecto de incapacidad permanente y que, por consecuencia de pérdidas anatómicas o funcionales, necesite la asistencia de otra persona para los actos más esenciales de la vida, tales como vestirse, desplazarse, comer o análogos.',
       L26 + ', art. 194.6', 'Denominación «gran incapacidad» desde el 01/05/2025 (Ley 2/2025); antes, «gran invalidez». El cambio es solo de nombre.'),
]

# ---------------------------------------------------------------------------------------------
# 2. Beneficiarios y periodo mínimo de cotización (art. 195; RD 1799/1985, art. 4)
# ---------------------------------------------------------------------------------------------
a195 = articulo(TRLGSS, 'Artículo 195. ', 'Artículo 196. ')
L195 = 'art. 195 TRLGSS'
datos += [
    mk('carencia-exenta-accidente-ep', 2016, 0, 'meses de cotización exigidos si deriva de accidente (laboral o no) o de enfermedad profesional', TRLGSS, a195,
       'salvo que aquella sea debida a accidente, sea o no laboral, o a enfermedad profesional, en cuyo caso no será exigido ningún período previo de cotización', L195 + '.1'),
    mk('excluida-si-reune-jubilacion', 2016, 1, 'indicador (1 = no se reconoce la IP por contingencias comunes)', TRLGSS, a195,
       'No se reconocerá el derecho a las prestaciones de incapacidad permanente derivada de contingencias comunes cuando el beneficiario, en la fecha del hecho causante, tenga la edad prevista en el artículo 205.1.a) y reúna los requisitos para acceder a la pensión de jubilación en el sistema de la Seguridad Social.',
       L195 + '.1, párrafo 2.º'),
    mk('carencia-parcial-dias', 2016, 1800, 'días de cotización exigidos (incapacidad permanente parcial)', TRLGSS, a195,
       'el período mínimo de cotización exigible será de mil ochocientos días, que han de estar comprendidos en los diez años inmediatamente anteriores a la fecha en la que se haya extinguido la incapacidad temporal',
       L195 + '.2', 'Mil ochocientos días.'),
    mk('carencia-parcial-ventana-meses', 2016, 120, M + ' anteriores a la extinción de la incapacidad temporal en que deben estar los 1.800 días', TRLGSS, a195,
       'comprendidos en los diez años inmediatamente anteriores a la fecha en la que se haya extinguido la incapacidad temporal', L195 + '.2', 'Diez años = 120 meses.'),
    mk('carencia-joven-edad-limite-meses', 2016, 372, 'meses de edad por debajo de los cuales rige la regla de los menores de 31 años', TRLGSS, a195,
       'Si el sujeto causante tiene menos de treinta y un años de edad', L195 + '.3.a)', 'Treinta y un años = 372 meses.'),
    mk('carencia-joven-desde-edad-meses', 2016, 192, 'meses de edad desde los que se cuenta el tiempo (menores de 31 años)', TRLGSS, a195,
       'la tercera parte del tiempo transcurrido entre la fecha en que cumplió los dieciséis años y la del hecho causante de la pensión', L195 + '.3.a)', 'Dieciséis años = 192 meses.'),
    mk('carencia-joven-divisor', 2016, 3, 'divisor del tiempo transcurrido (la tercera parte)', TRLGSS, a195,
       'la tercera parte del tiempo transcurrido entre la fecha en que cumplió los dieciséis años y la del hecho causante de la pensión', L195 + '.3.a)'),
    mk('carencia-general-desde-edad-meses', 2016, 240, 'meses de edad desde los que se cuenta el tiempo (31 o más años)', TRLGSS, a195,
       'la cuarta parte del tiempo transcurrido entre la fecha en que cumplió los veinte años y la del hecho causante de la pensión, con un mínimo, en todo caso, de cinco años',
       L195 + '.3.b)', 'Veinte años = 240 meses.'),
    mk('carencia-general-divisor', 2016, 4, 'divisor del tiempo transcurrido (la cuarta parte)', TRLGSS, a195,
       'la cuarta parte del tiempo transcurrido entre la fecha en que cumplió los veinte años y la del hecho causante de la pensión', L195 + '.3.b)'),
    mk('carencia-general-minimo-meses', 2016, 60, 'meses de cotización mínimos (31 o más años)', TRLGSS, a195,
       'con un mínimo, en todo caso, de cinco años', L195 + '.3.b)', 'Cinco años = 60 meses.'),
    mk('carencia-reciente-divisor', 2016, 5, 'divisor del periodo exigible que debe estar en los últimos diez años (la quinta parte)', TRLGSS, a195,
       'al menos la quinta parte del período de cotización exigible deberá estar comprendida dentro de los diez años inmediatamente anteriores al hecho causante', L195 + '.3.b)'),
    mk('carencia-reciente-ventana-meses', 2016, 120, M + ' anteriores al hecho causante (o al cese de la obligación de cotizar) para la quinta parte', TRLGSS, a195,
       'dentro de los diez años inmediatamente anteriores al hecho causante [...] el período de los diez años, dentro de los cuales deba estar comprendido, al menos, una quinta parte del período de cotización exigible, se computará, hacia atrás, desde la fecha en que cesó la obligación de cotizar',
       L195 + '.3.b)', 'Diez años = 120 meses. Desde una situación de alta o asimilada sin obligación de cotizar, la ventana se cuenta hacia atrás desde el cese de la obligación de cotizar.'),
    mk('carencia-sin-alta-meses', 2016, 180, 'meses de cotización exigidos a la absoluta o gran incapacidad por contingencias comunes sin alta', TRLGSS, a195,
       'podrán causarse aunque los interesados no se encuentren en el momento del hecho causante en alta o situación asimilada a la de alta. [...] el período mínimo de cotización exigible será, en todo caso, de quince años, distribuidos en la forma prevista en el último inciso del apartado 3.b).',
       L195 + '.4', 'Quince años = 180 meses; la quinta parte (36 meses) en los diez años anteriores.'),
]
rd4 = version(RD1799, 'a4')
LRD4 = 'art. 4 RD 1799/1985 (redacción vigente desde el 10/01/1998)'
datos += [
    mk('carencia-redondeo-fracciones-mes', 1998, 1, 'indicador (1 = se desprecian las fracciones de mes del periodo exigido)', RD1799, rd4,
       'Los períodos resultantes por aplicación de las reglas contenidas en los apartados a) y b) del presente número serán objeto de redondeo, despreciándose, en su caso, las fracciones de mes.',
       LRD4 + ', apartado 1'),
    mk('carencia-redondeo-edad-medio-anio-meses', 1998, 6, 'meses: fracción de edad que el RD 1799/1985 redondea a medio año (lectura alternativa)', RD1799, rd4,
       'A tales efectos, no se tendrán en consideración, en su caso, las fracciones de edad del beneficiario en la fecha del hecho causante que sean inferiores a medio año. Del mismo modo, cuando tales fracciones sean superiores a seis meses, se considerarán equivalentes a medio año.',
       LRD4 + ', apartado 1.b)',
       'El art. 4.1 del RD 1799/1985 desarrolla la regla de la Ley 26/1985 (umbral de 26 años y la mitad del tiempo); el art. 195.3 TRLGSS fija otro umbral (31 años) y otra fracción. Si el redondeo de la edad a medios años sigue rigiendo con la regla del TRLGSS es una lectura abierta (opción del motor `redondeoEdadCarencia`).'),
    mk('carencia-dias-it-asimilados', 1998, 1, 'indicador (1 = los días que faltan para agotar la incapacidad temporal cuentan como cotizados)', RD1799, rd4,
       'los días que falten para agotar dicho período máximo se asimilarán a días cotizados a efectos del cómputo del período mínimo de cotización exigido para causar derecho a la pensión de incapacidad permanente',
       LRD4 + ', apartado 4'),
]

# ---------------------------------------------------------------------------------------------
# 3. Prestaciones (art. 196) y porcentajes por grado (Orden de 1969, Decretos de 1966 y 1972)
# ---------------------------------------------------------------------------------------------
a196 = articulo(TRLGSS, 'Artículo 196. ', 'Artículo 197. ')
L196 = 'art. 196 TRLGSS'
o15 = version(O1969, 'art15')
o17 = version(O1969, 'art17')
o18 = version(O1969, 'art18')
d12 = version(D3158, 'adoce')
d6 = version(D1646, 'asexto')
d9 = version(D1646, 'anoveno')
datos += [
    mk('parcial-tanto-alzado', 2016, 1, 'indicador (1 = la parcial es una cantidad a tanto alzado)', TRLGSS, a196,
       'La prestación económica correspondiente a la incapacidad permanente parcial, consistirá en una cantidad a tanto alzado.', L196 + '.1'),
    mk('parcial-mensualidades', 1972, 24, 'mensualidades de la base reguladora de la incapacidad temporal', D1646, d9,
       'percibirán una cantidad a tanto alzado equivalente a veinticuatro mensualidades de la base reguladora que haya servido para determinar la prestación económica por incapacidad laboral transitoria de la que se deriva la invalidez',
       'art. 9 Decreto 1646/1972', 'Veinticuatro mensualidades. «Cualquiera que sea la contingencia determinante de la misma y su edad».'),
    mk('total-porcentaje', 1969, 55, '% de la base reguladora (incapacidad permanente total)', O1969, o15,
       'que les sea reconocido el derecho a una pensión vitalicia de cuantía equivalente al 55 por 100 de la base reguladora',
       'art. 15.2 Orden de 15/04/1969',
       'Contraste: el art. 12.Dos del Decreto 3158/1966 fija la misma cuantía («cincuenta y cinco por ciento»). La opción entre pensión y rehabilitación que regula el artículo dejó de existir con el art. 3 del Decreto 1646/1972 (pensión vitalicia en todo caso); el porcentaje es el que se sigue aplicando.',
       ),
    mk('total-porcentaje-contraste-1966', 1967, 55, '% de la base (incapacidad permanente total; contraste)', D3158, d12,
       'la cuantía de ésta será equivalente al cincuenta y cinco por ciento de su base de cotización', 'art. 12.Dos Decreto 3158/1966', 'Segunda fuente del 55 %.'),
    mk('total-pension-vitalicia', 2019, 1, 'indicador (1 = pensión vitalicia; sustituible por tanto alzado si es menor de 60 años)', TRLGSS, a196,
       'La prestación económica correspondiente a la incapacidad permanente total consistirá en una pensión vitalicia, que podrá excepcionalmente ser sustituida por una indemnización a tanto alzado cuando el beneficiario fuese menor de sesenta años.',
       L196 + '.2 (redacción vigente desde el 01/01/2019)'),
    mk('total-sustitucion-edad-limite-meses', 2019, 720, 'meses de edad: la sustitución por tanto alzado solo cabe por debajo', TRLGSS, a196,
       'cuando el beneficiario fuese menor de sesenta años', L196 + '.2', 'Sesenta años = 720 meses. El motor no calcula la indemnización sustitutiva (Orden de 31/07/1972).'),
    mk('total-cualificada-pct', 1972, 20, '% de la base reguladora (incremento de la total «cualificada»)', D1646, d6,
       'El incremento a que el presente artículo se refiere consistirá en un veinte por ciento de la base reguladora que se tome para determinar la cuantía de la pensión.',
       'art. 6.Tres Decreto 1646/1972', 'Desarrolla el art. 196.2, párrafo 2.º, TRLGSS.'),
    mk('total-cualificada-edad-minima-meses', 1972, 660, 'meses de edad mínimos para el incremento de la total', D1646, d6,
       'El requisito de edad exigido en el precepto legal citado será, como mínimo, de cincuenta y cinco años.', 'art. 6.Dos Decreto 1646/1972', 'Cincuenta y cinco años = 660 meses.'),
    mk('total-cualificada-suspension-empleo', 1972, 1, 'indicador (1 = el incremento se suspende mientras se trabaje)', D1646, d6,
       'El incremento quedará en suspenso durante el período en que el trabajador obtenga un empleo.', 'art. 6.Cuatro Decreto 1646/1972'),
    mk('total-cualificada-condiciones', 2019, 1, 'indicador (1 = el incremento exige que se presuma la dificultad de obtener empleo)', TRLGSS, a196,
       'cuando por su edad, falta de preparación general o especializada y circunstancias sociales y laborales del lugar de residencia, se presuma la dificultad de obtener empleo en actividad distinta de la habitual anterior',
       L196 + '.2, párrafo 2.º', 'El motor aplica el incremento cuando la edad alcanza el mínimo, salvo que se indique lo contrario (`totalCualificada: false`).'),
    mk('total-ec-suelo-clase-minima', 2019, 'ip-total-enf-comun-menor60-conyuge-no-cargo', 'clase de pensión mínima del Anexo I que hace de suelo', TRLGSS, a196,
       'La cuantía de la pensión de incapacidad permanente total derivada de enfermedad común no podrá resultar inferior al importe mínimo fijado anualmente en la Ley de Presupuestos Generales del Estado para la pensión de incapacidad permanente total derivada de enfermedad común de titulares menores de sesenta años con cónyuge no a cargo.',
       L196 + '.2, párrafo 3.º (RDL 28/2018)', 'Suelo de la cuantía, distinto del complemento a mínimos: la norma no lo condiciona a las rentas.'),
    mk('absoluta-porcentaje', 1969, 100, '% de la base reguladora (incapacidad permanente absoluta)', O1969, o17,
       'dará derecho, a quienes reúnan las condiciones establecidas en el artículo 19, a una pensión vitalicia equivalente al 100 por 100 del salario real del trabajador',
       'art. 17 Orden de 15/04/1969',
       'El «salario real» como base se sustituyó por la base reguladora de las contingencias comunes (art. 3 del RD 1071/1984 y art. 197 TRLGSS); el porcentaje del 100 % sigue siendo el de la norma. Contraste: art. 12.Cuatro del Decreto 3158/1966 («ciento por ciento»).'),
    mk('gran-incapacidad-porcentaje', 1969, 100, '% de la base reguladora (gran incapacidad, sin el complemento)', O1969, o18,
       'dará derecho, a quienes reúnan las condiciones establecidas en el artículo 19, a la prestación económica que se señala en el articulo anterior para el de incapacidad permanente absoluta',
       'art. 18 Orden de 15/04/1969',
       'La gran incapacidad percibe la pensión de la absoluta (100 %). El incremento del 50 % de este artículo lo sustituye el complemento del art. 196.4 TRLGSS.'),
    mk('gran-incapacidad-complemento-pct-base-minima', 2016, 45, '% de la base mínima de cotización vigente en el hecho causante', TRLGSS, a196,
       'El importe de dicho complemento será equivalente al resultado de sumar el 45 por ciento de la base mínima de cotización vigente en el momento del hecho causante y el 30 por ciento de la última base de cotización del trabajador correspondiente a la contingencia de la que derive la situación de incapacidad permanente.',
       L196 + '.4'),
    mk('gran-incapacidad-complemento-pct-ultima-base', 2016, 30, '% de la última base de cotización de la contingencia', TRLGSS, a196,
       'el 30 por ciento de la última base de cotización del trabajador correspondiente a la contingencia de la que derive la situación de incapacidad permanente', L196 + '.4'),
    mk('gran-incapacidad-complemento-minimo-pct', 2016, 45, '% de la pensión sin el complemento (mínimo del complemento)', TRLGSS, a196,
       'En ningún caso el complemento señalado podrá tener un importe inferior al 45 por ciento de la pensión percibida, sin el complemento, por el trabajador.', L196 + '.4'),
    mk('edad-ip-sin-jubilacion-meses', 2016, 804, 'meses de edad (67 años) desde los que rige el art. 196.5', TRLGSS, a196,
       'En los casos en que el trabajador, con sesenta y siete o más años acceda a la pensión de incapacidad permanente derivada de contingencias comunes, por no reunir los requisitos para el reconocimiento del derecho a pensión de jubilación, la cuantía de la pensión de incapacidad permanente será equivalente al resultado de aplicar a la correspondiente base reguladora el porcentaje que corresponda al período mínimo de cotización que esté establecido, en cada momento, para el acceso a la pensión de jubilación. Cuando la incapacidad permanente derive de enfermedad común, se considerará como base reguladora el resultado de aplicar únicamente lo establecido en la norma a) del apartado 1 del artículo 197.',
       L196 + '.5', 'Sesenta y siete años = 804 meses. El porcentaje es el de la escala para la carencia de la jubilación.'),
]

# ---------------------------------------------------------------------------------------------
# 4. Base reguladora (art. 197; Decreto 1646/1972, art. 7; RD 1799/1985, art. 5)
# ---------------------------------------------------------------------------------------------
a197 = articulo(TRLGSS, 'Artículo 197. ', 'Artículo 198. ')
L197 = 'art. 197 TRLGSS'
rd5 = version(RD1799, 'a5')
d7 = version(D1646, 'aseptimo')
rd1071 = version(RD1071, 'a3')
datos += [
    mk('br-ec-meses', 2016, 96, 'meses de bases de cotización (enfermedad común)', TRLGSS, a197,
       'Se hallará el cociente que resulte de dividir por 112 las bases de cotización del interesado durante los 96 meses anteriores al mes previo al del hecho causante.', L197 + '.1.a)'),
    mk('br-ec-divisor', 2016, 112, 'divisor (enfermedad común)', TRLGSS, a197,
       'Se hallará el cociente que resulte de dividir por 112 las bases de cotización del interesado durante los 96 meses anteriores al mes previo al del hecho causante.', L197 + '.1.a)'),
    mk('br-ec-meses-nominales', 2016, 24, 'meses más recientes que entran por su valor nominal', TRLGSS, a197,
       'Las bases correspondientes a los veinticuatro meses anteriores al mes previo al del hecho causante se computarán en su valor nominal.', L197 + '.1.a), regla 1.ª'),
    mk('br-ec-mes-indice-referencia', 2016, 25, 'mes (contado hacia atrás desde el mes previo) cuyo IPC actualiza las bases', TRLGSS, a197,
       'Las restantes bases de cotización se actualizarán de acuerdo con la evolución que haya experimentado el Índice de Precios de Consumo desde los meses a que aquellas correspondan hasta el mes inmediato anterior a aquel en que se inicie el período de bases no actualizables a que se refiere la regla anterior.',
       L197 + '.1.a), regla 2.ª', 'El periodo no actualizable ocupa los meses 1 a 24; el mes inmediato anterior a su inicio es el 25 (Bi × I25 / Ii), como en la jubilación (`actualizacion-bases`).'),
    mk('br-ec-escala-con-anios-hasta-edad', 2016, 1, 'indicador (1 = se suman los años que faltan hasta la edad ordinaria)', TRLGSS, a197,
       'Al resultado obtenido en razón a lo establecido en la norma anterior se le aplicará el porcentaje que corresponda en función de los años de cotización, según la escala prevista en el artículo 210.1, considerándose a tal efecto como cotizados los años que le resten al interesado, en la fecha del hecho causante, para cumplir la edad ordinaria de jubilación vigente en cada momento.',
       L197 + '.1.b)', 'Qué edad ordinaria (con o sin la carrera de 65 años del art. 205.1.a) y si los «años» se cuentan enteros o por meses son lecturas abiertas (opciones del motor `edadFiccion` y `computoFiccion`).'),
    mk('br-ec-porcentaje-sin-15-anios', 2016, 50, '% si no se alcanzan quince años (con los años añadidos)', TRLGSS, a197,
       'En el caso de no alcanzarse quince años de cotización, el porcentaje aplicable será del 50 por ciento.', L197 + '.1.b)'),
    mk('br-periodo-corto-umbral-meses', 2016, 96, 'meses: si el periodo mínimo exigido es inferior, se computan tantas bases como meses exigidos', TRLGSS, a197,
       'En los supuestos en que se exija un período mínimo de cotización inferior a ocho años, la base reguladora se obtendrá de forma análoga a la establecida en el apartado anterior, pero computando bases mensuales de cotización en número igual al de meses de que conste el período mínimo exigible, sin tener en cuenta las fracciones de mes',
       L197 + '.2', 'Ocho años = 96 meses.'),
    mk('br-periodo-corto-coeficiente-divisor', 1985, 1.1666, 'coeficiente que multiplica el número de meses para obtener el divisor', RD1799, rd5,
       'por el número de meses a que dichas bases se refieran, incrementándose este divisor multiplicándolo por el coeficiente 1,1666', 'art. 5.2, regla 3.ª, RD 1799/1985',
       'El art. 197.2 TRLGSS dice «de forma análoga» sin fijar el divisor; el RD 1799/1985 da 1,1666. La alternativa (14/12, la relación 112/96) es una opción del motor (`divisorPeriodoCorto`).'),
    mk('br-ec-lagunas-tramo1-meses', 2016, 48, 'primeras mensualidades sin obligación de cotizar integradas con la base mínima', TRLGSS, a197,
       'las primeras cuarenta y ocho mensualidades se integrarán con la base mínima de entre todas las existentes en cada momento, y el resto de mensualidades con el 50 por ciento de dicha base mínima', L197 + '.4', 'Cuarenta y ocho mensualidades.'),
    mk('br-ec-lagunas-tramo1-pct', 2016, 100, '% de la base mínima (primeras 48 mensualidades)', TRLGSS, a197,
       'las primeras cuarenta y ocho mensualidades se integrarán con la base mínima de entre todas las existentes en cada momento', L197 + '.4'),
    mk('br-ec-lagunas-tramo2-pct', 2016, 50, '% de la base mínima (resto de mensualidades)', TRLGSS, a197,
       'y el resto de mensualidades con el 50 por ciento de dicha base mínima', L197 + '.4'),
    mk('br-anl-sin-alta-regla-general', 2016, 1, 'indicador (1 = absoluta o gran incapacidad por accidente no laboral sin alta: art. 197.1.a)', TRLGSS, a197,
       'Respecto a las pensiones de incapacidad permanente absoluta o gran incapacidad derivadas de accidente no laboral a que se refiere artículo 195.4, para el cómputo de su base reguladora, se aplicarán las reglas previstas en el apartado 1.a) del presente artículo.',
       L197 + '.3'),
    mk('br-anl-alta-normas-anteriores', 1985, 1, 'indicador (1 = el accidente no laboral en alta sigue las normas anteriores a la Ley 26/1985)', RD1799, rd5,
       'El cálculo de la base reguladora de las pensiones de invalidez permanente total, invalidez permanente absoluta y gran invalidez, derivadas de accidente no laboral, en que los beneficiarios se encontrasen en situación de alta o asimilada a la de alta, continuarán rigiéndose por las normas ya en vigor con anterioridad a la Ley 26/1985.',
       'art. 5.4, párrafo 2.º, RD 1799/1985'),
    mk('br-anl-meses', 2004, 24, 'meses ininterrumpidos de bases (accidente no laboral)', D1646, d7,
       'La base reguladora de las pensiones de incapacidad permanente, derivadas de accidente no laboral, será el cociente que resulte de dividir por 28 la suma de las bases de cotización del interesado durante un período ininterrumpido de 24 meses, elegido por el beneficiario dentro de los siete años inmediatamente anteriores a la fecha del hecho causante de la pensión.',
       'art. 7.1 Decreto 1646/1972 (redacción del RD 1795/2003, vigente desde el 01/01/2004)'),
    mk('br-anl-divisor', 2004, 28, 'divisor (accidente no laboral)', D1646, d7,
       'será el cociente que resulte de dividir por 28 la suma de las bases de cotización del interesado durante un período ininterrumpido de 24 meses', 'art. 7.1 Decreto 1646/1972'),
    mk('br-anl-ventana-meses', 2004, 84, 'meses anteriores al hecho causante en que se elige el periodo (accidente no laboral)', D1646, d7,
       'elegido por el beneficiario dentro de los siete años inmediatamente anteriores a la fecha del hecho causante de la pensión', 'art. 7.1 Decreto 1646/1972', 'Siete años = 84 meses.'),
    mk('br-absoluta-cc-como-art7', 1984, 1, 'indicador (1 = la absoluta por contingencias comunes usa la base de las demás pensiones)', RD1071, rd1071,
       'El cálculo de la base reguladora de la pensión de invalidez absoluta, derivada de enfermedad común o accidente no laboral, se llevará a cabo conforme a lo dispuesto en el artículo 7.º del Decreto 1646/1972',
       'art. 3 RD 1071/1984'),
]
o15b = o15
datos.append(mk('br-profesional-salario-real', 1969, 1, 'indicador (1 = la base de las contingencias profesionales es el salario real del Reglamento de 1956)', O1969, o15b,
                'serán de aplicación, para determinar la base reguladora, las normas que para la incapacidad permanente establecía el capitulo V del Reglamento aprobado por Decreto de 22 de junio de 1956',
                'art. 15.2.b) Orden de 15/04/1969',
                'El Reglamento de accidentes de trabajo de 1956 no está en la legislación consolidada del BOE y no se ha descargado (DESCARGAS_MANUALES.md): el motor no calcula la base de las contingencias profesionales.'))

# ---------------------------------------------------------------------------------------------
# 5. Compatibilidad con el trabajo (art. 198) y complemento de brecha (art. 60)
# ---------------------------------------------------------------------------------------------
a198 = articulo(TRLGSS, 'Artículo 198. ', 'Artículo 199. ')
a60 = articulo(TRLGSS, 'Artículo 60. ', 'Artículo 61. ')
L198 = 'art. 198 TRLGSS'
datos += [
    mk('compatibilidad-total-salario', 2016, 1, 'indicador (1 = la total es compatible con un salario en funciones distintas)', TRLGSS, a198,
       'En caso de incapacidad permanente total, la pensión vitalicia correspondiente será compatible con el salario que pueda percibir el trabajador en la misma empresa o en otra distinta, siempre y cuando las funciones no coincidan con aquellas que dieron lugar a la incapacidad permanente total.',
       L198 + '.1'),
    mk('compatibilidad-absoluta-suspension-desde', 2024, 20241222, 'fecha AAAAMMDD desde la que se suspende el pago de la absoluta o gran incapacidad al trabajar', TRLGSS, a198,
       'En el supuesto de que el pensionista realice un trabajo o actividad que de lugar a la inclusión en un régimen de la seguridad social, la entidad gestora suspenderá el pago de la pensión. [...] Modificación publicada el 21/12/2024, en vigor a partir del 22/12/2024.',
       L198 + '.2 (Ley 7/2024, disposición final 13)', 'La redacción anterior al 22/12/2024 no se ha transcrito: el motor no simula el trabajo de un pensionista de absoluta o gran incapacidad antes de esa fecha.'),
    mk('compatibilidad-complemento-gi-no-se-suspende', 2024, 1, 'indicador (1 = el complemento de gran incapacidad no se suspende)', TRLGSS, a198,
       'el complemento de gran incapacidad destinado a que la persona beneficiaria pueda remunerar a la persona que le atienda no se suspenderá por la realización de un trabajo incompatible con la pensión',
       L198 + '.2, párrafo 3.º'),
    mk('compatibilidad-desde-edad-jubilacion', 2016, 1, 'indicador (1 = desde la edad de jubilación, como la jubilación del art. 213.1)', TRLGSS, a198,
       'El disfrute de la pensión de incapacidad permanente absoluta y de gran incapacidad a partir de la edad de acceso a la pensión de jubilación será incompatible con el desempeño por el pensionista de un trabajo',
       L198 + '.3'),
    mk('brecha-incluye-incapacidad', 2021, 1, 'indicador (1 = el complemento del art. 60 se aplica a las pensiones de incapacidad permanente)', TRLGSS, a60,
       'Las mujeres que hayan tenido uno o más hijos o hijas y que sean beneficiarias de una pensión contributiva de jubilación, de incapacidad permanente o de viudedad, tendrán derecho a un complemento por cada hijo o hija',
       'art. 60.1 TRLGSS', 'Los hombres, solo si causan la pensión de incapacidad con la carrera afectada en las condiciones del art. 60.1.b).'),
]

# ---------------------------------------------------------------------------------------------
# 6. Normas de revalorización: gran incapacidad (límite, revalorización y mínimas)
# ---------------------------------------------------------------------------------------------
REGLA_GI = {
    2022: ('A los efectos del límite máximo señalado en el apartado 2, se computará únicamente la pensión sin complemento.',
           'La actualización de las pensiones de gran invalidez se efectuará aplicando las reglas previstas en el apartado 1 de manera separada a la pensión y al complemento.',
           'En el mínimo asignado a las pensiones de gran invalidez, están comprendidos los dos elementos que integran la pensión'),
    2023: ('A los efectos del límite máximo señalado en el apartado 2, se computará únicamente la pensión sin complemento.',
           'La revalorización de las pensiones de gran invalidez se efectuará aplicando las reglas previstas en el apartado 1 de manera separada a la pensión y al complemento.',
           'En el mínimo asignado a las pensiones de gran invalidez, están comprendidos los dos elementos que integran la pensión'),
    2025: ('A efectos de aplicar el citado límite máximo a las pensiones de gran invalidez, se computará únicamente la pensión, sin el complemento.',
           'La revalorización de las pensiones de gran invalidez se efectuará aplicando la regla prevista en el artículo 6 de manera separada a la pensión y al complemento.',
           'En el mínimo asignado a las pensiones de gran invalidez, están comprendidos los dos elementos que integran la pensión'),
    2026: ('A efectos de aplicar el citado límite máximo a las pensiones de gran incapacidad, se computará únicamente la pensión, sin el complemento.',
           'La revalorización de las pensiones de gran incapacidad se efectuará aplicando la regla prevista en el artículo 6 de manera separada a la pensión y al complemento.',
           'En el mínimo asignado a las pensiones de gran incapacidad, están comprendidos los dos elementos que integran la pensión'),
}
NOTA_2024 = 'El Real Decreto-ley 8/2023 (2024) no repite la regla en el texto descargado; el motor aplica la de 2023 (la última anterior con dato).'
for anio, (c_lim, c_rev, c_min) in REGLA_GI.items():
    doc = RDS[anio]
    blk = lineas(doc)
    loc = f'Norma de revalorización de {anio} (artículos de limitación, revalorización y mínimos)'
    datos += [
        mk(f'{anio}-gran-incapacidad-limite-sin-complemento', anio, 1, 'indicador (1 = el límite máximo se aplica solo a la pensión, sin el complemento)', doc, blk, c_lim, loc,
           NOTA_2024 if anio == 2023 else None),
        mk(f'{anio}-gran-incapacidad-revalorizacion-separada', anio, 1, 'indicador (1 = la pensión y el complemento se revalorizan por separado)', doc, blk, c_rev, loc),
        mk(f'{anio}-gran-incapacidad-minimo-incluye-complemento', anio, 1, 'indicador (1 = la cuantía mínima comprende pensión y complemento)', doc, blk, c_min, loc),
    ]

fusionar('parametros', 'incapacidad-permanente-reglas', datos,
         'Reglas de la incapacidad permanente contributiva (arts. 194 a 198 y DT 26.ª TRLGSS y normativa de desarrollo)',
         'Grados, periodos mínimos de cotización, base reguladora por origen, porcentajes por grado, años añadidos hasta la edad ordinaria, '
         'incremento de la total cualificada, complemento de gran incapacidad, suelo de la total por enfermedad común, cantidad a tanto alzado de la parcial, '
         'compatibilidad con el trabajo, complemento de brecha y reglas de la gran incapacidad en las normas de revalorización. Los valores escritos con '
         'letras o en años se pasan a números (meses); la conversión consta en `notes`. Los indicadores (1) recogen reglas cualitativas con su cita.')

# ---------------------------------------------------------------------------------------------
# 7. Pensiones mínimas de la IP total con 65 años y con 60 a 64 años (Anexo I, 2022-2026)
# ---------------------------------------------------------------------------------------------
FILAS = [('ip-total-65', 'Total: Titular con sesenta y cinco años.'),
         ('ip-total-60-64', 'Total: Titular con edad entre sesenta y sesenta y cuatro años.')]
SITUACIONES = [('conyuge-cargo', 'con cónyuge a cargo'), ('unipersonal', 'sin cónyuge (unidad económica unipersonal)'),
               ('conyuge-no-cargo', 'con cónyuge no a cargo')]
existente = json.load(open(f'{REPO}/data/parametros/pension-minima-incapacidad.json', encoding='utf-8'))
por_id = {d['id']: d for d in existente['data']}
minimas = []
for anio in range(2022, 2027):
    doc = RDS[anio]
    L = [l.strip() for l in lineas(doc)]
    k_abs = next(k for k, l in enumerate(L) if l == 'Absoluta. |')
    abs_vals = [L[k_abs + n].rstrip(' |') for n in (1, 2, 3)]
    # Contraste: la fila «Absoluta» del mismo cuadro coincide con /data
    for (sit, _), v in zip(SITUACIONES, abs_vals):
        dato = por_id.get(f'{anio}-ip-absoluta-{sit}')
        if dato is None or abs(dato['value'] - float(v.replace('.', '').replace(',', '.'))) > 0.005:
            raise SystemExit(f'{anio}: la fila Absoluta del Anexo I no coincide con pension-minima-incapacidad ({sit})')
    for clase, rotulo in FILAS:
        k = next((n for n in range(k_abs, len(L)) if L[n] == rotulo + ' |'), None)
        if k is None:
            raise SystemExit(f'{anio}: fila no encontrada: {rotulo}')
        vals = [L[k + n].rstrip(' |') for n in (1, 2, 3)]
        if not all(re.fullmatch(r'\d{1,3}(\.\d{3})*,\d{2}', v) for v in vals):
            raise SystemExit(f'{anio}: celdas no numéricas en {rotulo}: {vals}')
        cita = f'{rotulo} | {vals[0]} | {vals[1]} | {vals[2]} |'
        texto = norm(' '.join(L))
        if norm(cita) not in texto:
            raise SystemExit(f'{anio}: cita no encontrada: {cita}')
        for (sit, txt), v in zip(SITUACIONES, vals):
            d = {'id': f'{anio}-{clase}-{sit}', 'value': float(v.replace('.', '').replace(',', '.')), 'unit': 'euros/año', 'period': str(anio),
                 'source': {**src(doc), 'docId': doc[0][:-4]}, 'fetchedAt': HOY, 'confidence': 'alta',
                 'notes': f'Cuantía mínima anual ({txt}). Columnas del cuadro: con cónyuge a cargo, sin cónyuge, con cónyuge no a cargo. Extraída en la Fase 2-B-1.',
                 'quote': cita, 'location': 'Anexo I (cuadro de cuantías mínimas de las pensiones contributivas)'}
            minimas.append(d)
fusionar('parametros', 'pension-minima-incapacidad', minimas)
print('datos de reglas:', len(datos), '· mínimas añadidas:', len(minimas))
