"""Fase 2-B-2: reglas de las prestaciones de muerte y supervivencia (viudedad, orfandad y favor de
familiares) para el motor.

Lee los textos de data-raw/boe/ (huellas en data-raw/boe/origen.json; los consolidados con todas
las versiones de cada precepto los genera scripts/etl/boe_consolidado.py) y escribe en
data/parametros/:

  supervivencia-reglas   requisitos del causante y de los beneficiarios, base reguladora (causante
                         en activo o pensionista), porcentajes (52, 60 y 70 % de la viudedad, 20 % de
                         orfandad y familiares, incremento de la orfandad absoluta), límites
                         conjuntos, separados y divorciados, parejas de hecho, prestación temporal,
                         complemento de brecha y clases de las cuantías mínimas
  smi-anual              cuantía anual del salario mínimo interprofesional de 2022 a 2026 (la usan
                         los requisitos de ingresos de orfandad, familiares y viudedad)

Cada cita se comprueba por código **en todas las redacciones del precepto vigentes desde el
01/01/2022** (o en las que se indiquen, para las reglas que cambian, con su periodo). Si una cita
no aparece, el script se detiene. Ejecutar con `python3 -I scripts/etl/supervivencia_reglas.py`
(`MODO=local` para no descargar las normas del SMI si ya están en data-raw/boe).
"""
import hashlib
import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from comun import BOE, REPO, fusionar  # noqa: E402

RAW = f'{REPO}/data-raw/boe'
ORIGEN_RUTA = f'{RAW}/origen.json'
ORIGEN = json.load(open(ORIGEN_RUTA, encoding='utf-8'))
HOY = os.environ.get('FECHA_DESCARGA', '2026-11-12')
MODO = os.environ.get('MODO', 'descargar')
DESDE = 20220101  # hechos causantes cubiertos por el motor

TRV = ('trlgss-2015-versiones.txt', 'Real Decreto Legislativo 8/2015, texto refundido de la Ley General de la Seguridad Social (texto consolidado con todas las versiones de cada precepto, última actualización publicada el 21/10/2026)', HOY)
TRLGSS = ('trlgss-2015-consolidado.txt', 'Real Decreto Legislativo 8/2015, texto refundido de la Ley General de la Seguridad Social (texto consolidado, última actualización publicada el 21/10/2026; descargado el 2026-11-11)', '2026-11-11')
D3158 = ('decreto-3158-1966.txt', 'Decreto 3158/1966, de 23 de diciembre, Reglamento General que determina la cuantía de las prestaciones económicas del Régimen General de la Seguridad Social (texto consolidado)', HOY)
D1646 = ('decreto-1646-1972.txt', 'Decreto 1646/1972, de 23 de junio, para la aplicación de la Ley 24/1972, de 21 de junio, en materia de prestaciones del Régimen General de la Seguridad Social (texto consolidado)', HOY)
O1967 = ('orden-13-02-1967.txt', 'Orden de 13 de febrero de 1967 por la que se establecen normas para la aplicación y desarrollo de las prestaciones de muerte y supervivencia del Régimen General de la Seguridad Social (texto consolidado)', HOY)
RD900 = ('rd-900-2018.txt', 'Real Decreto 900/2018, de 20 de julio, de desarrollo de la disposición adicional trigésima de la Ley 27/2011 en materia de porcentaje aplicable a la base reguladora de la pensión de viudedad para pensionistas con 65 o más años que no perciban otra pensión pública (texto consolidado)', HOY)
RD1647 = ('rd-1647-1997.txt', 'Real Decreto 1647/1997, de 31 de octubre, por el que se desarrollan determinados aspectos de la Ley 24/1997 (texto consolidado)', HOY)
RD2026 = ('BOE-A-2026-6977.txt', 'Real Decreto 241/2026, de 25 de marzo, sobre limitación de la cuantía inicial de las pensiones públicas y revalorización de las pensiones para el ejercicio 2026', HOY)

_lineas = {}


def lineas(doc):
    if doc[0] not in _lineas:
        with open(f'{RAW}/{doc[0]}', encoding='utf-8') as f:
            _lineas[doc[0]] = f.read().split('\n')
    return _lineas[doc[0]]


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def versiones(doc, bid):
    """[(vigente desde, líneas)] de todas las versiones del bloque `bid`."""
    L = lineas(doc)
    cab = [(k, int(m.group(1))) for k, l in enumerate(L)
           if (m := re.match(rf'\[Bloque {re.escape(bid)} · vigente desde (\d+) · ', l))]
    if not cab:
        raise SystemExit(f'BLOQUE {bid} NO ENCONTRADO en {doc[0]}')
    res = []
    for k, desde in cab:
        j = next((n for n in range(k + 1, len(L)) if L[n].startswith('[Bloque ')), len(L))
        res.append((desde, L[k + 1:j]))
    return sorted(res, key=lambda v: v[0])


def aplicables(doc, bid, desde=DESDE, hasta=None):
    """Versiones vigentes en algún momento de [desde, hasta)."""
    vs = versiones(doc, bid)
    res = []
    for i, (d, blk) in enumerate(vs):
        fin = vs[i + 1][0] if i + 1 < len(vs) else 99999999
        if fin > desde and (hasta is None or d < hasta):
            res.append((d, blk))
    if not res:
        raise SystemExit(f'{doc[0]} {bid}: ninguna versión vigente en el periodo')
    return res


def articulo(doc, inicio, fin):
    L = lineas(doc)
    i = next((k for k, l in enumerate(L) if l.startswith(inicio)), None)
    j = next((k for k in range(i + 1, len(L)) if L[k].startswith(fin)), None) if i is not None else None
    if i is None or j is None:
        raise SystemExit(f'ARTÍCULO NO ENCONTRADO en {doc[0]}: {inicio}')
    return L[i:j]


def src(doc):
    return {'title': doc[1], 'publisher': BOE, 'url': ORIGEN[doc[0]]['url']}


def mk(id_, periodo, valor, unidad, doc, bid, cita, loc, notas=None, desde=DESDE, hasta=None, conf='alta'):
    """Dato con cita comprobada en todas las versiones de `bid` vigentes en [desde, hasta).
    `bid` puede ser una lista de líneas (texto no versionado)."""
    bloques = [(0, bid)] if isinstance(bid, list) else aplicables(doc, bid, desde, hasta)
    for vd, blk in bloques:
        texto = norm(' '.join(blk))
        for c in cita.split(' [...] '):
            if norm(c) not in texto:
                raise SystemExit(f'CITA NO ENCONTRADA ({id_}) en {doc[0]} {"" if isinstance(bid, list) else bid} (versión {vd}): {c[:140]}')
    d = {'id': id_, 'value': valor, 'unit': unidad, 'period': str(periodo), 'source': src(doc),
         'fetchedAt': doc[2], 'confidence': conf}
    vers = '' if isinstance(bid, list) else ', '.join(str(v) for v, _ in bloques)
    nota = (notas + ' ' if notas else '')
    if vers:
        nota += f'Cita comprobada en las redacciones vigentes desde {vers} (bloque {bid}).'
    if nota:
        d['notes'] = nota.strip()
    d['quote'] = cita.replace(' [...] ', ' […] ')
    d['location'] = loc
    return d


M = 'meses'
IND = 'indicador (1 = se aplica la regla citada)'
datos = []

# ---------------------------------------------------------------------------------------------
# 1. Causante y periodo previo de cotización (arts. 217, 219, 224 y 226 TRLGSS; Orden de 1967)
# ---------------------------------------------------------------------------------------------
datos += [
    mk('causante-pensionista', 2016, 1, IND, TRV, 'a217',
       'Los titulares de pensiones contributivas de jubilación e incapacidad permanente.', 'art. 217.1.c) TRLGSS',
       'Pueden causar las prestaciones los pensionistas de jubilación e incapacidad permanente, sin periodo previo de cotización.'),
    mk('carencia-alta-dias', 2016, 500, 'días de cotización', TRV, 'a219',
       'hubiera completado un período de cotización de quinientos días, dentro de los cinco años inmediatamente anteriores a la fecha del hecho causante de la pensión',
       'art. 219.1, párr. 1.º, TRLGSS', 'Quinientos días = 500. Causante en alta o asimilada.'),
    mk('carencia-alta-ventana-meses', 2016, 60, M, TRV, 'a219',
       'hubiera completado un período de cotización de quinientos días, dentro de los cinco años inmediatamente anteriores a la fecha del hecho causante de la pensión',
       'art. 219.1, párr. 1.º, TRLGSS', 'Cinco años = 60 meses.'),
    mk('carencia-sin-obligacion-desde-cese', 2016, 1, IND, TRV, 'a219',
       'el período de cotización de quinientos días deberá estar comprendido dentro de los cinco años inmediatamente anteriores a la fecha en que cesó la obligación de cotizar',
       'art. 219.1, párr. 1.º, TRLGSS'),
    mk('carencia-exenta-accidente-ep', 2016, 1, IND, TRV, 'a219',
       'si la causa de la muerte fuera un accidente, sea o no de trabajo, o una enfermedad profesional, no se exigirá ningún período previo de cotización',
       'art. 219.1, párr. 1.º, TRLGSS', 'Comprende el accidente no laboral.'),
    mk('carencia-sin-alta-meses', 2016, 180, M, TRV, 'a219',
       'También tendrá derecho a la pensión de viudedad el cónyuge superviviente aunque el causante, a la fecha de fallecimiento, no se encontrase en alta o en situación asimilada a la de alta, siempre que el mismo hubiera completado un período mínimo de cotización de quince años.',
       'art. 219.1, párr. 2.º, TRLGSS', 'Quince años = 180 meses. Se aplica también a orfandad (art. 224.1) y favor de familiares (art. 226.1).'),
    mk('orfandad-alta-o-pensionista', 2016, 1, IND, TRV, 'a224',
       'que el causante se encontrase en alta o situación asimilada a la de alta, o fuera pensionista en los términos del artículo 217.1.c)',
       'art. 224.1 TRLGSS', 'La ley no exige a la orfandad el periodo de quinientos días (sí el art. 9.1 del RD 1647/1997: lectura abierta `carenciaOrfandad`).'),
    mk('orfandad-sin-alta-quince-anios', 2016, 1, IND, TRV, 'a224',
       'Será de aplicación, asimismo, a las pensiones de orfandad lo previsto en el segundo párrafo del artículo 219.1.', 'art. 224.1, párr. 2.º, TRLGSS'),
    mk('orfandad-carencia-rd-1647-1997-dias', 2002, 500, 'días de cotización', RD1647, 'a9',
       'Asimismo, cuando al fallecer el causante se encontrase en alta o en situación asimilada al alta, será exigible que hubiera completado un periodo de cotización de quinientos días dentro de los cinco años anteriores a la fecha del fallecimiento. Si la causa de éste fuese un accidente, sea o no de trabajo, o una enfermedad profesional, no se exigirá ningún periodo previo de cotización.',
       'art. 9.1, párr. 2.º, RD 1647/1997', 'Regla reglamentaria anterior a la Ley 40/2007; el art. 224.1 TRLGSS vigente no la recoge. Solo se aplica con la lectura `carenciaOrfandad: rd-1647-1997`.'),
    mk('familiares-sin-alta-quince-anios', 2016, 1, IND, TRV, 'a226',
       'Será de aplicación a las prestaciones en favor de familiares lo establecido en el párrafo segundo del artículo 219.1.', 'art. 226.1, párr. 2.º, TRLGSS'),
    mk('familiares-carencia-alta-dias', 2002, 500, 'días de cotización', O1967, 'a22',
       'Será además preciso que el causante, que al fallecer se encontrase en activo o en situación asimilada al alta, hubiese cubierto un período de cotización de quinientos días dentro de los cinco años anteriores a la fecha del fallecimiento, salvo que la causa de éste sea un accidente de trabajo o enfermedad profesional, en cuyo caso no se exigirá este requisito.',
       'art. 22.1 Orden de 13/02/1967', 'La Orden solo exime el accidente de trabajo y la enfermedad profesional; el art. 219.1 TRLGSS exime cualquier accidente en la viudedad (lectura abierta `carenciaFamiliaresAccidenteNoLaboral`).'),
]

# ---------------------------------------------------------------------------------------------
# 2. Base reguladora (art. 228 TRLGSS; art. 7 Decreto 1646/1972; art. 9 Orden de 1967)
# ---------------------------------------------------------------------------------------------
BR7 = 'será el cociente que resulte de dividir por 28 la suma de las bases de cotización del interesado durante un período ininterrumpido de 24 meses, elegidos por los beneficiarios dentro de los 15 años inmediatamente anteriores a la fecha del hecho causante de la pensión'
datos += [
    mk('br-meses', 2004, 24, M, D1646, 'aseptimo', BR7, 'art. 7.2 Decreto 1646/1972 (redacción del RD 1795/2003)'),
    mk('br-ventana-meses', 2004, 180, M, D1646, 'aseptimo', BR7, 'art. 7.2 Decreto 1646/1972', 'Quince años = 180 meses.'),
    mk('br-divisor', 2004, 28, 'divisor', D1646, 'aseptimo', BR7, 'art. 7.2 Decreto 1646/1972'),
    mk('br-anterior-mes-previo', 2019, 1, IND, TRV, 'a228',
       'se computará la totalidad de las bases por las que se haya efectuado la cotización durante el periodo establecido reglamentariamente anterior al mes previo al del hecho causante',
       'art. 228 TRLGSS', 'Las bases se toman por su valor nominal (la norma no prevé actualizarlas).'),
    mk('br-lapsos-sin-obligacion', 1967, 1, IND, O1967, 'a9',
       'aun cuando dentro del mismo existan lapsos en los que no haya habido obligación de cotizar',
       'art. 9.a) Orden de 13/02/1967', 'Los meses sin cotización dentro del periodo elegido cuentan como cero (no se integran).'),
    mk('br-pensionista-misma-base', 2004, 1, IND, D1646, 'aseptimo',
       'La base reguladora de las pensiones por muerte y supervivencia, cuando el causante, al tiempo de su fallecimiento, fuese pensionista de jubilación o incapacidad permanente, será la misma que sirvió para determinar su pensión.',
       'art. 7.3 Decreto 1646/1972'),
    mk('br-pensionista-revalorizaciones', 2004, 1, IND, D1646, 'aseptimo',
       'En estos casos, la cuantía de la pensión se incrementará mediante la aplicación de las mejoras o revalorizaciones que, para las prestaciones de igual naturaleza por muerte y supervivencia, hayan tenido lugar desde la fecha del hecho causante de la pensión de la que deriven.',
       'art. 7.3 Decreto 1646/1972', 'El motor aplica la revalorización general de cada año posterior al del hecho causante de la pensión del causante hasta el año del fallecimiento.'),
    mk('br-profesional-salario-real', 1967, 1, IND, O1967, 'a9',
       'Cuando el fallecimiento del causante sea debido a accidente de trabajo o a enfermedad profesional, la base reguladora se determinará, en todos los casos, sobre las retribuciones efectivamente percibidas',
       'art. 9.d) Orden de 13/02/1967', 'Remite al capítulo V del Reglamento de accidentes de trabajo de 1956 (no descargado): el motor lanza NoImplementada salvo base calculada fuera.'),
]

# ---------------------------------------------------------------------------------------------
# 3. Viudedad: beneficiarios (arts. 219 a 223 TRLGSS)
# ---------------------------------------------------------------------------------------------
datos += [
    mk('matrimonio-antelacion-meses', 2016, 12, M, TRV, 'a219',
       'En los supuestos excepcionales en que el fallecimiento del causante derivara de enfermedad común, no sobrevenida tras el vínculo conyugal, se requerirá, además, que el matrimonio se hubiera celebrado con un año de antelación como mínimo a la fecha del fallecimiento o, alternativamente, la existencia de hijos comunes.',
       'art. 219.2 TRLGSS', 'Un año = 12 meses.'),
    mk('matrimonio-convivencia-total-meses', 2016, 24, M, TRV, 'a219',
       'No se exigirá dicha duración del vínculo matrimonial cuando en la fecha de celebración del mismo se acreditara un período de convivencia con el causante, en los términos establecidos en el artículo 221.2, que, sumado al de duración del matrimonio, hubiera superado los dos años.',
       'art. 219.2 TRLGSS', 'Dos años = 24 meses; la suma debe superarlos.'),
    mk('divorcio-requiere-compensatoria', 2016, 1, IND, TRV, 'a220',
       'se requerirá que las personas divorciadas o separadas judicialmente sean acreedoras de la pensión compensatoria a que se refiere el artículo 97 del Código Civil y esta quedara extinguida a la muerte del causante',
       'art. 220.1 TRLGSS', 'Separación o divorcio posteriores al 01/01/2008 (los anteriores, DT 13.ª: no implementada).'),
    mk('divorcio-limite-compensatoria', 2016, 1, IND, TRV, 'a220',
       'En el supuesto de que la cuantía de la pensión de viudedad fuera superior a la pensión compensatoria, aquella se disminuirá hasta alcanzar la cuantía de esta última.',
       'art. 220.1 TRLGSS'),
    mk('divorcio-violencia-genero-sin-compensatoria', 2016, 1, IND, TRV, 'a220',
       'tendrán derecho a la pensión de viudedad las mujeres que, aun no siendo acreedoras de pensión compensatoria, pudieran acreditar que eran víctimas de violencia de género en el momento de la separación judicial o el divorcio',
       'art. 220.1, párr. 3.º, TRLGSS'),
    mk('divorcio-sin-nuevas-nupcias', 2016, 1, IND, TRV, 'a220',
       'siempre que no hubiera contraído nuevas nupcias o hubiera constituido una pareja de hecho en los términos a que se refiere el artículo siguiente',
       'art. 220.1 TRLGSS'),
    mk('concurrencia-garantia-pct', 2016, 40, '% de la pensión garantizado al cónyuge o pareja superviviente', TRV, 'a220',
       'esta será reconocida en cuantía proporcional al tiempo vivido por cada uno de ellos con el causante, garantizándose, en todo caso, el 40 por ciento a favor del cónyuge superviviente',
       'art. 220.2 TRLGSS'),
    mk('pareja-convivencia-meses', 2022, 60, M, TRV, 'a221',
       'una convivencia estable y notoria con carácter inmediato al fallecimiento del causante y con una duración ininterrumpida no inferior a cinco años',
       'art. 221.2 TRLGSS', 'Cinco años = 60 meses.'),
    mk('pareja-registro-antelacion-meses', 2022, 24, M, TRV, 'a221',
       'Tanto la mencionada inscripción como la formalización del correspondiente documento público deberán haberse producido con una antelación mínima de dos años con respecto a la fecha del fallecimiento del causante.',
       'art. 221.2 TRLGSS', 'Dos años = 24 meses. Si no se cumple, prestación temporal (art. 222).'),
    mk('2022-pareja-hijos-comunes-solo-constitucion', 2022, 1, IND, TRV, 'a221',
       'salvo que existan hijos en común, en cuyo caso solo deberán acreditar la constitución de la pareja de hecho de conformidad con lo previsto en el párrafo siguiente',
       'art. 221.2 TRLGSS (redacción de la Ley 21/2021)', 'Hechos causantes del 01/01/2022 al 20/10/2026.', hasta=20261021),
    mk('2026-pareja-hijos-comunes-convivencia-meses', 2026, 24, M, TRV, 'a221',
       'En el caso de que existan hijos en común únicamente será exigible el requisito de una convivencia estable y notoria durante un periodo de al menos dos años ininterrumpidos, con carácter inmediato al fallecimiento del causante.',
       'art. 221.2 TRLGSS (redacción del RDL 31/2026)', 'Dos años = 24 meses. Hechos causantes desde el 21/10/2026.', desde=20261021),
    mk('pareja-redaccion-2026-desde', 2026, 20261021, 'fecha AAAAMMDD de entrada en vigor de la redacción del art. 221.2 del RDL 31/2026', TRLGSS,
       articulo(TRLGSS, 'Artículo 221. ', 'Artículo 222. '),
       'Se modifica el apartado 2 por el art. 1.10 del Real Decreto-ley 31/2026, de 20 de octubre. [...] Última actualización, publicada el 21/10/2026, en vigor a partir del 21/10/2026.',
       'art. 221 TRLGSS (notas de la versión consolidada)'),
    mk('expareja-requiere-compensatoria', 2022, 1, IND, TRV, 'a221',
       'Asimismo, se requerirá que la persona supérstite sea acreedora de una pensión compensatoria y que ésta se extinga con motivo de la muerte del causante.',
       'art. 221.3 TRLGSS'),
    mk('prestacion-temporal-meses', 2022, 24, M, TRV, 'a222',
       'tendrá derecho a una prestación temporal en cuantía igual a la de la pensión de viudedad que le hubiera correspondido y con una duración de dos años',
       'art. 222 TRLGSS', 'Dos años = 24 meses; incluye a la pareja de hecho desde 2022.'),
    mk('viudedad-compatible-trabajo', 2022, 1, IND, TRV, 'a223',
       'La pensión de viudedad será compatible con cualesquiera rentas de trabajo.', 'art. 223.1 TRLGSS'),
]

# ---------------------------------------------------------------------------------------------
# 4. Viudedad: porcentajes (art. 31 Decreto 3158/1966; RD 900/2018; art. 8 RD 1647/1997)
# ---------------------------------------------------------------------------------------------
L31 = 'art. 31 Decreto 3158/1966 (redacción del RD 1795/2003)'
datos += [
    mk('viudedad-pct', 2004, 52, '% de la base reguladora', D3158, 'atreintayuno',
       'El porcentaje a aplicar a la correspondiente base reguladora para la determinación de la cuantía de la pensión de viudedad será del 52 por ciento.', L31 + ', apartado 1'),
    mk('viudedad-cargas-pct', 2004, 70, '% de la base reguladora', D3158, 'atreintayuno',
       'Cuando la pensión de viudedad constituya la principal o única fuente de ingresos del pensionista, aquéllos no superen la cuantía a que se refiere el párrafo siguiente y el pensionista tenga cargas familiares, el porcentaje señalado en el apartado 1 será del 70 por 100.',
       L31 + ', apartado 2'),
    mk('viudedad-cargas-principal-fuente-pct', 2004, 50, '% mínimo de la pensión (con el complemento a mínimos) sobre los ingresos totales', D3158, 'atreintayuno',
       'cuando el importe anual de la misma represente, como mínimo, el 50 por 100 del total de los ingresos de aquél, también en cómputo anual. A tales efectos, como cuantía de la pensión se tendrá en cuenta también el importe del complemento a mínimo que pudiera corresponder.',
       L31 + ', apartado 2'),
    mk('viudedad-cargas-limite-rendimientos', 2004, 1, IND, D3158, 'atreintayuno',
       'será necesario que los rendimientos anuales del pensionista por todos los conceptos no superen la cuantía resultante de sumar al límite que, en cada ejercicio económico, esté previsto para el reconocimiento de los complementos por mínimos de las pensiones contributivas, el importe anual que, en cada ejercicio, corresponda a la pensión mínima de viudedad en función de la edad del pensionista',
       L31 + ', apartado 2', 'Límite = límite de ingresos de los complementos por mínimos + mínima anual de viudedad de la edad del pensionista.'),
    mk('viudedad-cargas-hijos-edad-meses', 2004, 312, M, D3158, 'atreintayuno',
       'Se entenderá por cargas familiares la convivencia del beneficiario con hijos menores de veintiséis años o mayores incapacitados, o menores acogidos',
       L31 + ', apartado 2', 'Veintiséis años = 312 meses.'),
    mk('viudedad-cargas-smi-pct', 2004, 75, '% del SMI anual sin pagas extraordinarias (renta por miembro de la unidad familiar)', D3158, 'atreintayuno',
       'cuando los rendimientos del conjunto de la unidad familiar, así constituida, incluido el pensionista, dividida entre el número de miembros que la compongan, no supere, en cómputo anual, el 75 por 100 del salario mínimo interprofesional, excluida la parte proporcional de dos pagas extraordinarias',
       L31 + ', apartado 2'),
    mk('viudedad-cargas-pagas-extra-excluidas', 2004, 2, 'pagas extraordinarias del SMI que se excluyen', D3158, 'atreintayuno',
       'el 75 por 100 del salario mínimo interprofesional, excluida la parte proporcional de dos pagas extraordinarias', L31 + ', apartado 2',
       'Dos = 2. El SMI anual sin pagas extraordinarias es el SMI anual menos dos mensualidades (smi-mensual).'),
    mk('viudedad-cargas-reduccion-limite', 2004, 1, IND, D3158, 'atreintayuno',
       'La aplicación del porcentaje del 70 por 100 sobre la respectiva base reguladora no podrá dar lugar a que la suma de la cuantía, en cómputo anual, de la pensión de viudedad, más los rendimientos anuales percibidos por el interesado, excedan del límite a que se refiere el párrafo segundo del apartado anterior. En caso contrario, se procederá a reducir la cuantía de la pensión de viudedad, a fin de no superar el límite señalado.',
       L31 + ', apartado 3', 'La norma no dice si la reducción puede bajar del 52 %: lectura abierta `reduccionViudedad70`.'),
    mk('viudedad-65-pct', 2018, 60, '% de la base reguladora', RD900, 'ar-3',
       'Cuando concurran los requisitos recogidos en el artículo anterior, el importe de la pensión de viudedad se determinará aplicando a la base reguladora que corresponda el porcentaje del 60 por ciento.',
       'art. 3 RD 900/2018', 'Desde el 01/01/2019 (DT 1.ª: «A partir de 1 de enero de 2019, se aplicará el 60 por ciento.»).'),
    mk('viudedad-65-edad-meses', 2018, 780, M, RD900, 'ar-2',
       'a) Haber cumplido una edad igual o superior a los 65 años.', 'art. 2.a) RD 900/2018', '65 años = 780 meses.'),
    mk('viudedad-65-requisitos', 2018, 1, IND, RD900, 'ar-2',
       'b) No tener derecho a otra pensión pública española o extranjera. c) No percibir ingresos por la realización de trabajo, ya sea por cuenta propia o ajena. d) No percibir rendimientos del capital, de actividades económicas o ganancias patrimoniales, de acuerdo con el concepto establecido para dichas rentas en el Impuesto sobre la Renta de las Personas Físicas, que en cómputo anual superen el límite de ingresos establecido en la correspondiente Ley de Presupuestos Generales del Estado para ser beneficiario de la pensión mínima de viudedad.',
       'art. 2.b)-d) RD 900/2018'),
    mk('viudedad-65-incompatible-70', 2018, 1, IND, RD900, 'ar-7',
       'procederá el reconocimiento de aquel, de resultar más favorable, no pudiendo acumularse a la mejora regulada en este real decreto',
       'art. 7 RD 900/2018', 'Se aplica el 70 % o el 60 %, el que dé mayor pensión.'),
    mk('viudedad-minima-cargas-definicion', 2001, 1, IND, RD1647, 'a8',
       'se entenderá por cargas familiares la convivencia del beneficiario con hijos menores de veintiséis años o mayores incapacitados, o menores acogidos, cuando la renta del conjunto de la unidad familiar así constituida, dividida por el número de miembros que la componen, no supere en cómputo anual el 75 por 100 del salario mínimo interprofesional, excluida la parte proporcional de dos pagas extraordinarias',
       'art. 8.2 RD 1647/1997', 'Misma definición de cargas familiares que el art. 31.2 del Decreto 3158/1966: la usa la mínima de viudedad «con cargas familiares».'),
]

# ---------------------------------------------------------------------------------------------
# 5. Orfandad (art. 224 TRLGSS; arts. 36 y 38 Decreto 3158/1966; art. 17 Orden de 1967)
# ---------------------------------------------------------------------------------------------
datos += [
    mk('orfandad-edad-limite-meses', 2016, 252, M, TRV, 'a224',
       'sean menores de veintiún años o estén incapacitados para el trabajo', 'art. 224.1 TRLGSS', 'Veintiún años = 252 meses (edad en la fecha del fallecimiento).'),
    mk('orfandad-edad-ampliada-meses', 2016, 300, M, TRV, 'a224',
       'fuera menor de veinticinco años, el hijo del causante que no efectúe un trabajo lucrativo por cuenta ajena o propia, o cuando realizándolo, los ingresos que obtenga resulten inferiores, en cómputo anual, a la cuantía vigente para el salario mínimo interprofesional, también en cómputo anual',
       'art. 224.3 TRLGSS', 'Veinticinco años = 300 meses; ingresos inferiores al SMI anual (smi-anual).'),
    mk('orfandad-pct', 2009, 20, '% de la base reguladora por huérfano', D3158, 'atreintayseis',
       'será para cada huérfano la equivalente al veinte por ciento de la base reguladora del causante', 'art. 36.Uno Decreto 3158/1966', 'Veinte por ciento = 20 %.'),
    mk('orfandad-pct-contraste-orden-1967', 1967, 20, '% de la base reguladora por huérfano', O1967, 'a17',
       'La cuantía de la pensión de orfandad será para cada huérfano la equivalente al 20 por 100 de la base reguladora del causante',
       'art. 17.1 Orden de 13/02/1967', 'Segunda fuente del porcentaje de orfandad (test de contraste).'),
    mk('orfandad-absoluta-incremento-pct', 2009, 52, '% de la base reguladora (se reparte entre los huérfanos)', D3158, 'atreintayocho',
       'Cuando a la muerte del causante no exista beneficiario de la pensión de viudedad, la cuantía de la pensión de orfandad que se reconozca al huérfano se incrementará en el importe resultante de aplicar a la base reguladora el 52 por ciento.',
       'art. 38.1.1.º Decreto 3158/1966 (redacción del RD 296/2009)'),
    mk('orfandad-absoluta-porcentaje-no-asignado', 2009, 1, IND, D3158, 'atreintayocho',
       'Cuando a la muerte del causante exista algún beneficiario de la pensión de viudedad, la pensión de orfandad que se reconozca podrá, en su caso, incrementarse en el importe resultante de aplicar a la base reguladora el porcentaje de pensión de viudedad que no hubiera sido asignado.',
       'art. 38.1.2.º Decreto 3158/1966'),
    mk('orfandad-absoluta-reparto-iguales', 2009, 1, IND, D3158, 'atreintayocho',
       'en el caso de existir varios huérfanos con derecho a pensión, el porcentaje de incremento que corresponda se distribuirá a partes iguales entre todos ellos',
       'art. 38.1.4.º Decreto 3158/1966'),
    mk('orfandad-absoluta-dentro-limite', 2009, 1, IND, D3158, 'atreintayocho',
       'Los incrementos de las pensiones de orfandad regulados en los párrafos 1.º, 2.º, 3.º y 4.º en ningún caso podrán dar lugar a que se supere el límite establecido en el apartado 4 del artículo 179 de la Ley General de la Seguridad Social, para las pensiones por muerte y supervivencia.',
       'art. 38.1.5.º Decreto 3158/1966', 'El límite del art. 179.4 LGSS de 1994 es hoy el art. 229 TRLGSS.'),
    mk('orfandad-absoluta-progenitor-desconocido', 2009, 1, IND, D3158, 'atreintayocho',
       'se asimila a huérfano absoluto el huérfano de un solo progenitor conocido', 'art. 38.2 Decreto 3158/1966'),
    mk('orfandad-absoluta-compatible-prestacion-temporal', 2009, 1, IND, D3158, 'atreintayocho',
       'dichos incrementos serán compatibles con la prestación temporal de viudedad, pudiendo, por tanto, ser reconocidos durante el percibo de esta última.',
       'art. 38.1.5.º Decreto 3158/1966', 'Si solo hay prestación temporal de viudedad, el motor trata la orfandad absoluta como sin beneficiario de pensión de viudedad.'),
]

# ---------------------------------------------------------------------------------------------
# 6. Favor de familiares (art. 226 TRLGSS; arts. 22 y 23 Orden de 1967; art. 39 Decreto 3158/1966)
# ---------------------------------------------------------------------------------------------
L22 = 'art. 22.1 Orden de 13/02/1967 (redacción del RD 1465/2001)'
datos += [
    mk('familiares-cuantia-igual-orfandad', 1967, 1, IND, D3158, 'atreintaynueve',
       'será para cada uno de ellos igual a la señalada para la prestación de orfandad en el número uno del artículo treinta y seis',
       'art. 39.Uno Decreto 3158/1966', 'El 20 % de la orfandad (orfandad-pct).'),
    mk('familiares-incremento-sin-viudo', 1967, 1, IND, O1967, 'a23',
       'Si al fallecimiento del causante no quedase cónyuge sobreviviente, o cuando el cónyuge sobreviviente con derecho a pensión de viudedad falleciese estando en el disfrute de la misma, la pensión correspondiente a los nietos o hermanos se incrementará en la forma prevista en el número 2 del artículo 17. Si en el indicado momento no quedase cónyuge sobreviviente, ni hijos, nietos o hermanos con derecho a pensión, el porcentaje para determinar la pensión de los ascendientes se incrementará, en igual forma que en el anterior supuesto, distribuyéndose el incremento por partes iguales entre todos los ascendientes, si hubiera más de uno con derecho a pensión.',
       'art. 23.2 Orden de 13/02/1967', 'El art. 17.2 remite al porcentaje de viudedad; el art. 36.Dos del Decreto 3158/1966 al que remite su art. 39.Dos está derogado desde 2009: lectura abierta `incrementoFamiliares`.'),
    mk('familiares-nietos-hermanos-edad-meses', 2002, 216, M, O1967, 'a22',
       'Menores de dieciocho años o que tengan reducida su capacidad de trabajo en un porcentaje valorado en el grado de incapacidad permanente absoluta o gran invalidez.',
       L22 + ', punto 1).a)', 'Dieciocho años = 216 meses.'),
    mk('familiares-nietos-hermanos-edad-ampliada-meses', 2002, 264, M, O1967, 'a22',
       'resulten inferiores al 75 por 100 de la cuantía del salario mínimo que se fije en cada momento, también en cómputo anual, se podrá ser beneficiario de la pensión en favor de familiares siempre que, al fallecer el causante, sea menor de veintidós años de edad',
       L22 + ', punto 1).a), párr. 2.º', 'Veintidós años = 264 meses, sin trabajo o con ingresos inferiores al 75 % del SMI anual.'),
    mk('familiares-trabajo-smi-pct', 2002, 75, '% del SMI anual (ingresos del trabajo)', O1967, 'a22',
       'resulten inferiores al 75 por 100 de la cuantía del salario mínimo que se fije en cada momento, también en cómputo anual', L22 + ', punto 1).a), párr. 2.º'),
    mk('familiares-nietos-hermanos-huerfanos', 2002, 1, IND, O1967, 'a22', 'b) Huérfanos de padre y madre.', L22 + ', punto 1).b)'),
    mk('familiares-convivencia-meses', 2002, 24, M, O1967, 'a22',
       'c) Que convivieran con el causante, y a sus expensas, al menos con dos años de antelación al fallecimiento de aquél.', L22 + ', punto 1).c)', 'Dos años = 24 meses.'),
    mk('familiares-sin-pension-publica', 2002, 1, IND, O1967, 'a22', 'd) Que no tengan derecho a pensión pública.', L22 + ', punto 1).d)'),
    mk('familiares-medios-subsistencia-smi-pct', 2002, 100, '% del SMI anual (ingresos totales máximos)', O1967, 'a22',
       'Se entenderá que el nieto o hermano del causante carece de medios de subsistencia, cuando los ingresos de que disponga, en cómputo anual, sean iguales o inferiores a la cuantía, también en cómputo anual, que esté establecida en cada momento para el salario mínimo interprofesional para trabajadores con dieciocho años.',
       L22 + ', punto 1).e)', 'Iguales o inferiores al SMI anual = 100 %. El motor aplica el mismo umbral a los ascendientes (remisión a la letra e).'),
    mk('familiares-trabajo-mayor-18-smi-pct', 2002, 75, '% del SMI anual (ingresos del trabajo con 18 o más años)', O1967, 'a22',
       'Cuando el nieto o hermano tengan dieciocho o más años y realicen un trabajo por cuenta ajena o efectúan una actividad profesional por cuenta propia, será preciso, además, que los ingresos anuales procedentes del trabajo o de la actividad profesional no superen el 75 por 100 del importe, también en cómputo anual, del salario mínimo interprofesional vigente en cada momento.',
       L22 + ', punto 1).e)'),
    mk('familiares-madre-abuelas-estado-civil', 2002, 1, IND, O1967, 'a22',
       '2) Madre y abuelas: a) Viudas casadas cuyo marido esté incapacitado para el trabajo, o solteras. b) Que reúnan las condiciones de los apartados c), d) y e) del punto anterior.',
       L22 + ', punto 2)', 'El motor recibe el cumplimiento del estado civil como dato (estadoCivilCumple).'),
    mk('familiares-padre-abuelos-edad-meses', 2002, 720, M, O1967, 'a22',
       '3) Padre y abuelos. a) Que tengan cumplidos los sesenta años de edad o se hallen incapacitados para el trabajo.', L22 + ', punto 3)', 'Sesenta años = 720 meses.'),
    mk('familiares-hijos-hermanos-pensionista-edad-meses', 2016, 540, M, TRV, 'a226',
       'En todo caso, se reconocerá derecho a pensión a los hijos o hermanos de beneficiarios de pensiones contributivas de jubilación e incapacidad permanente, en quienes se den, en los términos que se establezcan reglamentariamente, las siguientes circunstancias: a) Haber convivido con el causante y a su cargo. b) Ser mayores de cuarenta y cinco años y solteros, divorciados o viudos. c) Acreditar dedicación prolongada al cuidado del causante. d) Carecer de medios propios de vida.',
       'art. 226.2 TRLGSS', 'Cuarenta y cinco años = 540 meses (deben ser mayores: más de 540 meses). El desarrollo reglamentario no se ha localizado en las normas descargadas; las circunstancias a), c) y d) se reciben como datos.'),
]

# ---------------------------------------------------------------------------------------------
# 7. Límite conjunto (art. 229 TRLGSS; art. 18 Orden de 1967)
# ---------------------------------------------------------------------------------------------
L229 = 'art. 229 TRLGSS'
datos += [
    mk('limite-conjunto-pct-br', 2018, 100, '% de la base reguladora (suma de las pensiones)', TRV, 'a229',
       'La suma de las cuantías de las pensiones por muerte y supervivencia no podrá exceder del importe de la base reguladora que corresponda',
       L229 + '.1', 'El importe de la base reguladora = 100 %.'),
    mk('limite-solo-inicial', 2018, 1, IND, TRV, 'a229',
       'Esta limitación se aplicará a la determinación inicial de las expresadas cuantías, pero no afectará a las revalorizaciones periódicas de las pensiones que procedan en lo sucesivo',
       L229 + '.1'),
    mk('limite-preferencia-orfandad', 2018, 1, IND, TRV, 'a229',
       'las pensiones de orfandad tendrán preferencia sobre las pensiones a favor de otros familiares', L229 + '.2'),
    mk('limite-orden-nietos-hermanos', 2018, 1, 'orden de preferencia', TRV, 'a229', '1.º Nietos y hermanos del causante, menores de dieciocho años o mayores incapacitados.', L229 + '.2'),
    mk('limite-orden-padres', 2018, 2, 'orden de preferencia', TRV, 'a229', '2.º Padre y madre del causante.', L229 + '.2'),
    mk('limite-orden-abuelos', 2018, 3, 'orden de preferencia', TRV, 'a229', '3.º Abuelos y abuelas del causante.', L229 + '.2'),
    mk('limite-orden-hijos-hermanos-pensionista', 2018, 4, 'orden de preferencia', TRV, 'a229',
       '4.º Hijos y hermanos del titular de una pensión contributiva de jubilación o incapacidad permanente mayores de cuarenta y cinco años y que reúnan los demás requisitos establecidos.', L229 + '.2'),
    mk('limite-excepcion-viudedad-umbral-pct', 2018, 52, '% de la viudedad por encima del cual puede rebasarse el límite', TRV, 'a229',
       'el límite establecido podrá ser rebasado en caso de concurrencia de varias pensiones de orfandad con una pensión de viudedad cuando el porcentaje a aplicar a la correspondiente base reguladora para el cálculo de esta última sea superior al 52 por ciento',
       L229 + '.3'),
    mk('limite-orfandad-max-pct', 2018, 48, '% de la base reguladora (suma de las pensiones de orfandad en la excepción)', TRV, 'a229',
       'si bien, en ningún caso, la suma de las pensiones de orfandad podrá superar el 48 por ciento de la base reguladora que corresponda', L229 + '.3'),
    mk('limite-viudedad-orfandad-orden-1967', 1967, 1, IND, O1967, 'a18',
       'En todo caso, la suma de las pensiones de viudedad y de orfandad no podrá exceder de la cuantía de la base reguladora sobre la que se hayan determinado dichas pensiones.',
       'art. 18.1 Orden de 13/02/1967', 'La norma no dice qué pensión se reduce; el motor reduce las de orfandad (lectura en DECISIONES y REVISION_ACTUARIAL).'),
]

# ---------------------------------------------------------------------------------------------
# 8. Complemento de brecha de género (art. 60 TRLGSS) y clases de las mínimas (Anexo I)
# ---------------------------------------------------------------------------------------------
anexo26 = lineas(RD2026)
datos += [
    mk('brecha-incluye-viudedad', 2021, 1, IND, TRV, 'a60',
       'beneficiarias de una pensión contributiva de jubilación, de incapacidad permanente o de viudedad, tendrán derecho a un complemento por cada hijo o hija',
       'art. 60.1 TRLGSS'),
    mk('brecha-hombre-viudedad-con-orfandad', 2021, 1, IND, TRV, 'a60',
       'pensión de viudedad [...] fallecimiento del otro progenitor [...] siempre que alguno de ellos tenga derecho a percibir una pensión de orfandad',
       'art. 60.1.a) TRLGSS', 'Un hombre tiene derecho al complemento en la viudedad si alguno de los hijos en común tiene derecho a pensión de orfandad.'),
    mk('brecha-un-complemento-por-hijo', 2021, 1, IND, TRV, 'a60',
       'a) Cada hijo o hija dará derecho únicamente al reconocimiento de un complemento.', 'art. 60.3.a) TRLGSS',
       'Si el complemento ya se percibe con otra pensión (jubilación o incapacidad), no se suma en la viudedad (opción brechaEnOtraPension).'),
    mk('minima-viudedad-edad-60-meses', 2026, 720, M, RD2026, anexo26,
       'Titular con edad entre sesenta y sesenta y cuatro años. | | 12.262,60 | |', 'Anexo I (Viudedad) del RD 241/2026',
       'Sesenta años = 720 meses. Clases de la viudedad: con cargas familiares; 65 años o discapacidad del 65 %; 60 a 64; menos de 60.'),
    mk('minima-orfandad-discapacidad-edad-meses', 2026, 216, M, RD2026, anexo26,
       'Por persona beneficiaria menor de dieciocho años con una discapacidad en grado igual o superior al 65 por 100. | 7.882,00 |', 'Anexo I (Orfandad) del RD 241/2026',
       'Dieciocho años = 216 meses.'),
    mk('minima-familiares-sin-viudo-ni-huerfanos', 2026, 1, IND, RD2026, anexo26,
       'Si no existen personas viudas ni huérfanas pensionistas: | | Una sola persona beneficiaria con sesenta y cinco años. | 9.683,80 |', 'Anexo I (En favor de familiares) del RD 241/2026',
       'Las mínimas incrementadas de familiares solo se aplican si no hay pensionistas de viudedad ni de orfandad.'),
]

ids = [d['id'] for d in datos]
assert len(ids) == len(set(ids)), 'ids repetidos'
fusionar('parametros', 'supervivencia-reglas', datos,
         'Reglas de las prestaciones de muerte y supervivencia (viudedad, orfandad y favor de familiares)',
         'Requisitos del causante y de los beneficiarios, base reguladora, porcentajes de viudedad (52, 60 y 70 %), orfandad y familiares (20 %), '
         'incremento de la orfandad absoluta, límites conjuntos del art. 229, separados, divorciados y parejas de hecho, prestación temporal, '
         'complemento de brecha y clases de las mínimas (arts. 216 a 229 TRLGSS, Decreto 3158/1966, Decreto 1646/1972, Orden de 13/02/1967, '
         'RD 1647/1997 y RD 900/2018). Los valores escritos con letras o en años se pasan a números (meses); la conversión consta en `notes`. '
         'Los indicadores (1) recogen reglas cualitativas con su cita. Las reglas que cambian el 21/10/2026 (RDL 31/2026) llevan el año en el id.')

# ---------------------------------------------------------------------------------------------
# 9. SMI anual 2022-2026 (art. 3 de cada real decreto del SMI)
# ---------------------------------------------------------------------------------------------
# Identificadores tomados de data/parametros/smi-mensual.json (fuente del SMI mensual de cada año).
SMI = {2022: 'BOE-A-2022-2851', 2023: 'BOE-A-2023-3982', 2024: 'BOE-A-2024-2251', 2025: 'BOE-A-2025-2576', 2026: 'BOE-A-2026-3815'}
smi = []
for anio, doc_id in SMI.items():
    ruta = f'{RAW}/{doc_id}.txt'
    url_xml = f'https://www.boe.es/diario_boe/xml.php?id={doc_id}'
    if not os.path.exists(ruta):
        if MODO == 'local':
            raise SystemExit(f'falta {ruta} (modo local)')
        xml = subprocess.run(['curl', '-sS', '--fail', url_xml], check=True, capture_output=True).stdout
        x = xml.decode('utf-8')
        titulo = norm(html.unescape(re.search(r'<titulo>([^<]*)', x).group(1)))
        cuerpo = re.sub(r'</t[dh]>', ' | ', x)
        texto = norm(html.unescape(re.sub(r'<[^>]+>', ' ', cuerpo)))
        open(ruta, 'w', encoding='utf-8').write(f'{titulo}\n{texto}\n')
        ORIGEN[f'{doc_id}.txt'] = {'url': f'https://www.boe.es/buscar/doc.php?id={doc_id}', 'urlDescarga': url_xml,
                                   'sha256_original': hashlib.sha256(xml).hexdigest(), 'fetchedAt': HOY,
                                   'nota': f'{titulo}. Texto plano del XML del BOE (etiquetas eliminadas).'}
    contenido = open(ruta, encoding='utf-8').read()
    titulo = contenido.split('\n', 1)[0]
    if f'salario mínimo interprofesional para {anio}' not in titulo:
        raise SystemExit(f'{doc_id}: título inesperado: {titulo}')
    texto = norm(contenido)
    m = re.search(r'sin que en ningún caso pueda considerarse una cuantía anual inferior a (\d{1,3}(?:[. ]\d{3})*) euros', texto)
    if not m:
        raise SystemExit(f'{doc_id}: cuantía anual no encontrada')
    smi.append({'id': str(anio), 'value': float(re.sub(r'[. ]', '', m.group(1))), 'unit': 'euros/año', 'period': str(anio),
                'source': {'title': titulo, 'publisher': BOE, 'url': f'https://www.boe.es/buscar/doc.php?id={doc_id}', 'docId': doc_id},
                'fetchedAt': ORIGEN[f'{doc_id}.txt']['fetchedAt'], 'confidence': 'alta',
                'notes': 'Salario mínimo en cómputo anual (término de comparación del art. 3). Lo usan los requisitos de ingresos de orfandad (art. 224.3 TRLGSS), favor de familiares (art. 22 Orden de 13/02/1967) y viudedad con cargas familiares (art. 31.2 Decreto 3158/1966).',
                'quote': m.group(0), 'location': 'Artículo 3.1'})
json.dump(ORIGEN, open(ORIGEN_RUTA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
fusionar('parametros', 'smi-anual', smi, 'Salario mínimo interprofesional anual',
         'Cuantía anual del salario mínimo interprofesional (cómputo anual del art. 3 del real decreto de cada año), en euros/año.')
print('reglas:', len(datos), '· smi anual:', len(smi))
