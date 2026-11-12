"""Fase 2-B-3: reglas de las pensiones no contributivas (PNC) y del Mecanismo de Equidad
Intergeneracional (MEI) con la cotización adicional de solidaridad, para el motor.

Lee los textos de data-raw/boe/ (huellas en data-raw/boe/origen.json) y escribe en data/parametros/:

  pnc-reglas                    requisitos (edad, discapacidad, residencia, carencia de rentas),
                                unidad económica, reducción por rentas, mínimo del 25 %, complemento de
                                tercera persona, compatibilidad con el trabajo y complemento de
                                alquiler (RD 1191/2012); arts. 363, 364, 366, 369 y 370 TRLGSS
  pnc-complemento-alquiler      importe anual del complemento de alquiler de cada norma de
                                revalorización (2022, 2023, 2025 y 2026; 2024 no consta en el texto)
  mei-reglas                    MEI de 2030 a 2050, años de efecto, reglas del art. 127 bis y de la
                                cotización adicional de solidaridad (art. 19 bis y DT 42.ª)
  cuota-solidaridad-calendario  tipos por tramo de 2025 a 2045 (DT 42.ª), un dato por tramo y año

Cada cita se comprueba por código **en todas las redacciones del precepto vigentes desde el
01/01/2022** (o en el periodo que se indique). Si una cita no aparece, el script se detiene.
Ejecutar con `python3 -I scripts/etl/pnc_mei_reglas.py` (`MODO=local` si el texto del RD 1191/2012 ya
está en data-raw/boe).
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
DESDE = 20220101

TRV = ('trlgss-2015-versiones.txt', 'Real Decreto Legislativo 8/2015, texto refundido de la Ley General de la Seguridad Social (texto consolidado con todas las versiones de cada precepto, última actualización publicada el 21/10/2026)', HOY)
RD1191 = ('BOE-A-2012-10476.txt', 'Real Decreto 1191/2012, de 3 de agosto, por el que se establecen normas para el reconocimiento del complemento de pensión para el alquiler de vivienda a favor de los pensionistas de la Seguridad Social en su modalidad no contributiva', HOY)
REVALORIZACION = {
    2022: ('BOE-A-2022-1189.txt', 'Real Decreto 65/2022, de 25 de enero, sobre actualización de las pensiones del sistema de la Seguridad Social para el ejercicio 2022'),
    2023: ('BOE-A-2022-22694.txt', 'Real Decreto 1058/2022, de 27 de diciembre, sobre revalorización de las pensiones del sistema de la Seguridad Social para el ejercicio 2023'),
    2025: ('BOE-A-2025-7660.txt', 'Real Decreto 316/2025, de 15 de abril, sobre limitación de la cuantía inicial de las pensiones públicas y revalorización de las pensiones para el ejercicio 2025'),
    2026: ('BOE-A-2026-6977.txt', 'Real Decreto 241/2026, de 25 de marzo, sobre limitación de la cuantía inicial de las pensiones públicas y revalorización de las pensiones para el ejercicio 2026'),
}

_lineas = {}


def lineas(doc):
    if doc[0] not in _lineas:
        with open(f'{RAW}/{doc[0]}', encoding='utf-8') as f:
            _lineas[doc[0]] = f.read().split('\n')
    return _lineas[doc[0]]


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def versiones(doc, bid):
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
    vs = versiones(doc, bid)
    res = []
    for i, (d, blk) in enumerate(vs):
        fin = vs[i + 1][0] if i + 1 < len(vs) else 99999999
        if fin > desde and (hasta is None or d < hasta):
            res.append((d, blk))
    if not res:
        raise SystemExit(f'{doc[0]} {bid}: ninguna versión vigente en el periodo')
    return res


def src(doc):
    return {'title': doc[1], 'publisher': BOE, 'url': ORIGEN[doc[0]]['url']}


def mk(id_, periodo, valor, unidad, doc, bid, cita, loc, notas=None, desde=DESDE, hasta=None, conf='alta'):
    """Dato con cita comprobada en todas las versiones de `bid` vigentes en [desde, hasta)."""
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

# ---------------------------------------------------------------------------------------------
# 0. Texto del RD 1191/2012 (sin versión consolidada en el BOE: se guarda el texto original)
# ---------------------------------------------------------------------------------------------
def texto_rd1191():
    ruta = f'{RAW}/{RD1191[0]}'
    if not os.path.exists(ruta):
        if MODO == 'local':
            raise SystemExit(f'falta {ruta} (modo local)')
        url = 'https://www.boe.es/diario_boe/xml.php?id=BOE-A-2012-10476'
        xml = subprocess.run(['curl', '-sS', '--fail', url], check=True, capture_output=True).stdout
        x = xml.decode('utf-8')
        titulo = norm(html.unescape(re.search(r'<titulo>([^<]*)', x).group(1)))
        x = re.sub(r'</p>|</tr>|<br\s*/?>', '\n', x)
        L = [norm(html.unescape(re.sub(r'<[^>]+>', ' ', l))) for l in x.split('\n')]
        i = next(k for k, l in enumerate(L) if l.startswith('DISPONGO'))
        open(ruta, 'w', encoding='utf-8').write('\n'.join(l for l in L[i:] if l) + '\n')
        ORIGEN[RD1191[0]] = {'url': 'https://www.boe.es/buscar/doc.php?id=BOE-A-2012-10476', 'urlDescarga': url,
                             'sha256_original': hashlib.sha256(xml).hexdigest(), 'fetchedAt': HOY,
                             'nota': f'{titulo}. Texto original del XML del BOE desde «DISPONGO» (etiquetas eliminadas); el BOE no ofrece versión consolidada.'}
        json.dump(ORIGEN, open(ORIGEN_RUTA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return lineas(RD1191)


rd1191 = texto_rd1191()

# ---------------------------------------------------------------------------------------------
# 1. Reglas de las pensiones no contributivas
# ---------------------------------------------------------------------------------------------
L363 = 'art. 363 TRLGSS'
L364 = 'art. 364 TRLGSS'
pnc = [
    mk('incapacidad-edad-minima-meses', 2016, 216, M, TRV, 'a363', 'a) Ser mayor de dieciocho y menor de sesenta y cinco años de edad.', L363 + '.1.a)', 'Dieciocho años = 216 meses (mayor de: se exige más de 216 meses cumplidos).'),
    mk('incapacidad-edad-maxima-meses', 2016, 780, M, TRV, 'a363', 'a) Ser mayor de dieciocho y menor de sesenta y cinco años de edad.', L363 + '.1.a)', 'Sesenta y cinco años = 780 meses (menor de: menos de 780 meses cumplidos).'),
    mk('incapacidad-residencia-total-meses', 2016, 60, M, TRV, 'a363', 'Residir legalmente en territorio español y haberlo hecho durante cinco años, de los cuales dos deberán ser inmediatamente anteriores a la fecha de solicitud de la pensión.', L363 + '.1.b)', 'Cinco años = 60 meses.'),
    mk('incapacidad-residencia-reciente-meses', 2016, 24, M, TRV, 'a363', 'Residir legalmente en territorio español y haberlo hecho durante cinco años, de los cuales dos deberán ser inmediatamente anteriores a la fecha de solicitud de la pensión.', L363 + '.1.b)', 'Dos años = 24 meses.'),
    mk('incapacidad-grado-minimo-pct', 2016, 65, '% de discapacidad o enfermedad crónica', TRV, 'a363', 'Estar afectadas por una discapacidad o por una enfermedad crónica, en un grado igual o superior al 65 por ciento.', L363 + '.1.c)'),
    mk('rentas-insuficientes-menor-que-cuantia', 2016, 1, IND, TRV, 'a363', 'Se considerará que existen rentas o ingresos insuficientes cuando la suma, en cómputo anual, de los mismos sea inferior al importe, también en cómputo anual, de la prestación a que se refiere el apartado 1 del artículo siguiente.', L363 + '.1.d)', 'Rentas propias estrictamente inferiores a la cuantía anual.'),
    mk('unidad-economica-limite-pct-convivientes', 2016, 70, '% de la cuantía anual por cada conviviente adicional', TRV, 'a363', 'serán equivalentes a la cuantía, en cómputo anual, de la pensión, más el resultado de multiplicar el 70 por ciento de dicha cifra por el número de convivientes, menos uno', L363 + '.2'),
    mk('unidad-economica-ascendientes-descendientes-multiplo', 2016, 2.5, 'veces el límite de acumulación', TRV, 'a363', 'los límites de acumulación de recursos serán equivalentes a dos veces y media la cuantía que resulte de aplicar lo dispuesto en el apartado 2', L363 + '.3', 'Dos veces y media = 2,5. Convivencia con descendientes o ascendientes en primer grado.'),
    mk('unidad-economica-parentesco-grado', 2016, 2, 'grado de parentesco de consanguinidad', TRV, 'a363', 'Existirá unidad económica en todos los casos de convivencia de un beneficiario con otras personas, sean o no beneficiarias, unidas con aquel por matrimonio o por lazos de parentesco de consanguinidad hasta el segundo grado.', L363 + '.4'),
    mk('rentas-computables-trabajo-capital-prestaciones', 2016, 1, IND, TRV, 'a363', 'se considerarán como ingresos o rentas computables, cualesquiera bienes y derechos, derivados tanto del trabajo como del capital, así como los de naturaleza prestacional.', L363 + '.5', 'El motor recibe las rentas computables como dato; no las clasifica.'),
    mk('rentas-vivienda-habitual-excluida', 2016, 1, IND, TRV, 'a363', 'con la excepción, en todo caso, de la vivienda habitualmente ocupada por el beneficiario. Tampoco se computarán las asignaciones periódicas por hijos a cargo.', L363 + '.5', 'Los bienes muebles o inmuebles se valoran por sus rendimientos efectivos o, si no existen, por el IRPF; la vivienda habitual y las asignaciones por hijos a cargo no cuentan.'),
    mk('rentas-indemnizaciones-rc-excluidas-desde', 2026, 20261023, 'fecha AAAAMMDD desde la que no computan las indemnizaciones por responsabilidad civil por daños personales', TRV, 'a363',
       'no se considerarán rentas o ingresos computables las indemnizaciones por responsabilidad civil por daños personales en la cuantía legal o judicialmente reconocidas.', L363 + '.1 (Ley 4/2026, disposición final 12.2)',
       'Texto añadido por la Ley 4/2026, de 1 de octubre; en vigor desde el 23/10/2026. El motor no clasifica las rentas: quien aporta las rentas computables decide.', desde=20261023),
    mk('jubilacion-edad-minima-meses', 2016, 780, M, TRV, 'a369', 'habiendo cumplido sesenta y cinco años de edad', 'art. 369.1 TRLGSS', 'Sesenta y cinco años = 780 meses.'),
    mk('jubilacion-residencia-total-meses', 2016, 120, M, TRV, 'a369', 'lo hayan hecho durante diez años entre la edad de dieciséis años y la edad de devengo de la pensión, de los cuales dos deberán ser consecutivos e inmediatamente anteriores a la solicitud de la prestación', 'art. 369.1 TRLGSS', 'Diez años = 120 meses.'),
    mk('jubilacion-residencia-desde-edad-meses', 2016, 192, M, TRV, 'a369', 'lo hayan hecho durante diez años entre la edad de dieciséis años y la edad de devengo de la pensión, de los cuales dos deberán ser consecutivos e inmediatamente anteriores a la solicitud de la prestación', 'art. 369.1 TRLGSS', 'Dieciséis años = 192 meses.'),
    mk('jubilacion-residencia-reciente-meses', 2016, 24, M, TRV, 'a369', 'lo hayan hecho durante diez años entre la edad de dieciséis años y la edad de devengo de la pensión, de los cuales dos deberán ser consecutivos e inmediatamente anteriores a la solicitud de la prestación', 'art. 369.1 TRLGSS', 'Dos años = 24 meses.'),
    mk('jubilacion-cuantia-como-incapacidad', 2016, 1, IND, TRV, 'a370', 'Para la determinación de la cuantía de la pensión de jubilación en su modalidad no contributiva, se estará a lo dispuesto para la pensión de', 'art. 370 TRLGSS', 'La cuantía y la reducción por rentas son las del art. 364.'),
    mk('cuantia-unidad-economica-pct', 2016, 70, '% de la cuantía anual por cada beneficiario adicional', TRV, 'a364', 'Al importe referido en el primer párrafo de este apartado se le sumará el 70 por ciento de esa misma cuantía, tantas veces como número de beneficiarios, menos uno, existan en la unidad económica.', L364 + '.1.a)'),
    mk('cuantia-unidad-economica-reparto-igual', 2016, 1, IND, TRV, 'a364', 'La cuantía de la pensión para cada uno de los beneficiarios será igual al cociente de dividir el resultado de la suma prevista en la letra anterior por el número de beneficiarios con derecho a pensión.', L364 + '.1.b)'),
    mk('rentas-compatibles-pct', 2016, 35, '% de la cuantía anual', TRV, 'a364', 'siempre que los mismos no excedan del 35 por ciento del importe, en cómputo anual, de la pensión no contributiva. En otro caso, se deducirá del importe de dicha pensión la cuantía de las rentas o ingresos que excedan de tal porcentaje', L364 + '.2'),
    mk('reduccion-por-limite-acumulacion', 2016, 1, IND, TRV, 'a364', 'si la suma de los ingresos o rentas anuales de la unidad económica más la pensión o pensiones no contributivas, calculadas conforme a lo dispuesto en los dos apartados anteriores, superara el límite de acumulación de recursos establecidos en los apartados 2 y 3 del artículo anterior, la pensión o pensiones se reducirán para no sobrepasar el mencionado límite, disminuyendo en igual cuantía cada una de las pensiones.', L364 + '.3', 'Solo en convivencia con personas no beneficiarias.'),
    mk('cuantia-minima-pct', 2016, 25, '% de la cuantía anual', TRV, 'a364', 'la cuantía de la pensión reconocida será, como mínimo, del 25 por ciento del importe de la pensión a que se refiere el apartado 1', L364 + '.4'),
    mk('complemento-tercera-persona-pct', 2016, 50, '% de la cuantía anual', TRV, 'a364', 'tendrán derecho a un complemento equivalente al 50 por ciento del importe de la pensión a que se refiere el primer párrafo del apartado 1', L364 + '.6'),
    mk('complemento-tercera-persona-grado-minimo-pct', 2016, 75, '% de discapacidad o enfermedad crónica', TRV, 'a364', 'estén afectadas por una discapacidad o enfermedad crónica en un grado igual o superior al 75 por ciento y que, como consecuencia de pérdidas anatómicas o funcionales, necesiten el concurso de otra persona para realizar los actos más esenciales de la vida', L364 + '.6', 'Cumpliendo los requisitos del art. 363.1.a), b) y d).'),
    mk('compatibilidad-trabajo-anios-meses', 2016, 48, M, TRV, 'a366', 'durante los cuatro años siguientes al inicio de la actividad, la suma de la cuantía de la pensión de', 'art. 366 TRLGSS', 'Cuatro años = 48 meses.'),
    mk('compatibilidad-trabajo-limite-iprem', 2016, 1, IND, TRV, 'a366', 'no podrá ser superior, en cómputo anual, al importe, también en cómputo anual, de la suma del indicador público de renta de efectos múltiples, excluidas las pagas extraordinarias y la pensión de', 'art. 366 TRLGSS', 'Límite = IPREM mensual × 12 + pensión; se minora la pensión en lo que exceda. Exige el IPREM del año (no consta en /data para 2024-2026).'),
    mk('compatibilidad-no-reduce-complemento', 2016, 1, IND, TRV, 'a366', 'Esta reducción no afectará al complemento previsto en el artículo 364.6.', 'art. 366 TRLGSS'),
    mk('alquiler-contrato-minimo-meses', 2012, 12, M, RD1191, rd1191, 'Se entenderá que es el domicilio habitual cuando la vigencia del contrato de arrendamiento no sea inferior a un año y el pensionista haya residido en la misma durante los 180 días inmediatamente anteriores.', 'art. 2.1.e) RD 1191/2012', 'Un año = 12 meses. Texto original (el BOE no ofrece versión consolidada).', conf='media'),
    mk('alquiler-residencia-dias', 2012, 180, 'días', RD1191, rd1191, 'Se entenderá que es el domicilio habitual cuando la vigencia del contrato de arrendamiento no sea inferior a un año y el pensionista haya residido en la misma durante los 180 días inmediatamente anteriores.', 'art. 2.1.e) RD 1191/2012', conf='media'),
    mk('alquiler-sin-vivienda-propiedad', 2012, 1, IND, RD1191, rd1191, 'b) Carecer de vivienda en propiedad.', 'art. 2.1.b) RD 1191/2012', conf='media'),
    mk('alquiler-titular-contrato', 2012, 1, IND, RD1191, rd1191, 'c) Ser titular del contrato de arrendamiento de la vivienda.', 'art. 2.1.c) RD 1191/2012', conf='media'),
    mk('alquiler-arrendador-parentesco-grado', 2012, 3, 'grado de parentesco', RD1191, rd1191, 'd) No tener con el arrendador de la vivienda alquilada relación conyugal o de parentesco, por consanguinidad, afinidad o adopción hasta el tercer grado, ni constituir con aquél una unión estable y de convivencia con análoga relación de afectividad a la conyugal.', 'art. 2.1.d) RD 1191/2012', conf='media'),
    mk('alquiler-un-titular-por-vivienda', 2012, 1, IND, RD1191, rd1191, 'sólo tendrá derecho a este complemento aquel que sea el titular del contrato de arrendamiento o, de ser varios, el primero de ellos.', 'art. 2.2 RD 1191/2012', conf='media'),
]
ids = [d['id'] for d in pnc]
assert len(ids) == len(set(ids)), 'ids repetidos (pnc)'
fusionar('parametros', 'pnc-reglas', pnc,
         'Reglas de las pensiones no contributivas de jubilación e incapacidad (arts. 363 a 370 TRLGSS y RD 1191/2012)',
         'Requisitos (edad, discapacidad, residencia), carencia de rentas y unidad económica, reducción por rentas, mínimo del 25 %, complemento de tercera persona, compatibilidad con el trabajo y requisitos del complemento de alquiler. '
         'Los valores escritos con letras o en años se pasan a números (meses); la conversión consta en `notes`. Los indicadores (1) recogen reglas cualitativas con su cita. Cada cita se comprueba en todas las redacciones vigentes desde 2022.')

alquiler = []
for anio, (fichero, titulo) in REVALORIZACION.items():
    doc = (fichero, titulo, HOY)
    L = [l for l in lineas(doc)]
    alquiler.append(mk(str(anio), anio, 525.0, 'euros/año', doc, L, f'Para el año {anio}, tendrá un importe de 525,00 euros anuales el complemento de pensión establecido en favor de la persona pensionista que acredite fehacientemente carecer de vivienda en propiedad',
                       'Artículo de revalorización de las pensiones no contributivas (apartado 2)',
                       'Complemento de pensión para quien carece de vivienda en propiedad y vive en alquiler (RD 1191/2012). En el RDL 8/2023 (año 2024) el texto descargado no repite este importe: sin dato en 2024 (PENDIENTE_DATOS).'))
for d in alquiler:
    d['source']['docId'] = d['source']['url'].rsplit('=', 1)[1]
fusionar('parametros', 'pnc-complemento-alquiler', alquiler, 'Pensión no contributiva: complemento de alquiler de vivienda',
         'Importe anual del complemento de pensión no contributiva para quien carece de vivienda en propiedad y reside en una vivienda alquilada (RD 1191/2012), según la norma de revalorización de cada año.')

# ---------------------------------------------------------------------------------------------
# 2. MEI y cotización adicional de solidaridad
# ---------------------------------------------------------------------------------------------
DT43 = 'DT 43.ª TRLGSS'
A127 = 'art. 127 bis TRLGSS'
A19 = 'art. 19 bis TRLGSS'
DT42 = 'DT 42.ª TRLGSS'
mei = [
    mk('tipo-total-2030-2050', 2030, 1.2, 'puntos porcentuales', TRV, 'dt-14', 'Desde el año 2030 hasta 2050 se mantendrá el mismo porcentaje del 1,2, con igual distribución entre empresario y trabajador.', DT43,
       'Aplica a cada año de 2030 a 2050.', desde=DESDE),
    mk('tipo-empresa-2030-2050', 2030, 1.0, 'puntos porcentuales', TRV, 'dt-14',
       'En el año 2029, será de 1,2 puntos porcentuales, de los que el 1,00 corresponderá a la empresa y el 0,2 al trabajador. [...] Desde el año 2030 hasta 2050 se mantendrá el mismo porcentaje del 1,2, con igual distribución entre empresario y trabajador.', DT43,
       'Con «igual distribución» que en 2029: 1,00 la empresa y 0,2 el trabajador.'),
    mk('tipo-trabajador-2030-2050', 2030, 0.2, 'puntos porcentuales', TRV, 'dt-14',
       'En el año 2029, será de 1,2 puntos porcentuales, de los que el 1,00 corresponderá a la empresa y el 0,2 al trabajador. [...] Desde el año 2030 hasta 2050 se mantendrá el mismo porcentaje del 1,2, con igual distribución entre empresario y trabajador.', DT43,
       'Con «igual distribución» que en 2029.'),
    mk('primer-anio', 2023, 2023, 'año', TRV, 'dt-14', 'tendrá efectos desde el 1 de enero de 2023 hasta el 31 de diciembre de 2050', DT43),
    mk('ultimo-anio', 2050, 2050, 'año', TRV, 'dt-14', 'tendrá efectos desde el 1 de enero de 2023 hasta el 31 de diciembre de 2050', DT43, 'Después de 2050 la ley no fija el tipo: el motor lanza NoImplementada.'),
    mk('aplicable-contingencia-jubilacion', 2023, 1, IND, TRV, 'a1-5', 'una cotización finalista aplicable en todos los regímenes y en todos los supuestos en los que se cotice por la contingencia de jubilación', A127,
       'El motor lo aplica a la base de cotización por contingencias comunes (el artículo no nombra la base: lectura abierta `baseMEI`).'),
    mk('sin-beneficios-en-cotizacion', 2023, 1, IND, TRV, 'a1-5', 'no podrá ser objeto de bonificación, reducción, exención o deducción alguna', A127 + '.2'),
    mk('solidaridad-tramo-1-limite-pct', 2025, 10, '% de la base máxima', TRV, 'a1-4',
       'La cuota de solidaridad será el resultado de aplicar un tipo del 5,5 por ciento a la parte de retribución comprendida entre la base máxima de cotización y la cantidad superior a la referida base máxima en un 10 por ciento', A19),
    mk('solidaridad-tramo-2-limite-pct', 2025, 50, '% de la base máxima', TRV, 'a1-4',
       'el tipo del 6 por ciento a la parte de retribución comprendida entre el 10 por ciento superior a la base máxima de cotización y el 50 por ciento', A19),
    mk('solidaridad-tipo-final-tramo-a', 2045, 5.5, '%', TRV, 'a1-4', 'aplicar un tipo del 5,5 por ciento a la parte de retribución comprendida entre la base máxima de cotización', A19, 'Tipos del art. 19 bis: los que fija la DT 42.ª para 2045; aplican desde 2045.'),
    mk('solidaridad-tipo-final-tramo-b', 2045, 6.0, '%', TRV, 'a1-4', 'el tipo del 6 por ciento a la parte de retribución comprendida entre el 10 por ciento superior', A19),
    mk('solidaridad-tipo-final-tramo-c', 2045, 7.0, '%', TRV, 'a1-4', 'el tipo del 7 por ciento a la parte de retribución que supere el anterior porcentaje', A19),
    mk('solidaridad-primer-anio', 2025, 2025, 'año', TRV, 'dt-13', 'durante cada año desde el año 2025 hasta el año 2045', DT42),
    mk('solidaridad-ultimo-anio-calendario', 2045, 2045, 'año', TRV, 'dt-13', 'durante cada año desde el año 2025 hasta el año 2045', DT42),
    mk('solidaridad-reparto-como-contingencias-comunes', 2025, 1, IND, TRV, 'dt-13',
       'La distribución de los tipos de cotización por solidaridad entre empresario y trabajador mantendrá la misma proporción que la distribución del tipo general de cotización a la seguridad social por contingencias comunes.', DT42,
       'Proporción = tipo de contingencias comunes de empresa (tipo-cc-empresa) y trabajador (tipo-cc-trabajador) del año.'),
]
ids = [d['id'] for d in mei]
assert len(ids) == len(set(ids)), 'ids repetidos (mei)'
fusionar('parametros', 'mei-reglas', mei, 'Reglas del MEI y de la cotización adicional de solidaridad',
         'Tipo del MEI de 2030 a 2050 y años de efecto (DT 43.ª), alcance del art. 127 bis, y reglas de la cotización adicional de solidaridad (tramos y tipos finales del art. 19 bis, calendario de la DT 42.ª y reparto). '
         'El tipo de 2023 a 2029 está en mei-tipo-total, mei-tipo-empresa y mei-tipo-trabajador (Fase 1B-2).')

dt42 = [(d, b) for d, b in aplicables(TRV, 'dt-13')][-1][1]
texto42 = norm(' '.join(dt42))
cal = []
nombres = {1: 'tramo-a', 2: 'tramo-b', 3: 'tramo-c'}
for m in re.finditer(r'(?<![\d,])(20\d\d) \| (\d,\d\d?|\d) \| (\d,\d\d?|\d) \| (\d,\d\d?|\d)(?= \||$| La )', texto42):
    anio = int(m.group(1))
    if not 2025 <= anio <= 2045:
        continue
    cita = m.group(0)
    for k in (1, 2, 3):
        cal.append({'id': f'{anio}-{nombres[k]}', 'value': float(m.group(k + 1).replace(',', '.')), 'unit': '%', 'period': str(anio), 'source': src(TRV),
                    'fetchedAt': HOY, 'confidence': 'alta',
                    'notes': f'Tipo de la cuota adicional de solidaridad del año {anio} para el tramo {nombres[k][-1].upper()} (a: desde la base máxima hasta el 10 % adicional; b: del 10 % al 50 %; c: más del 50 %). Cuadro de la DT 42.ª, columnas en el orden del texto.',
                    'quote': cita, 'location': DT42})
anios = sorted({int(d['period']) for d in cal})
if anios != list(range(2025, 2046)) or len(cal) != 63:
    raise SystemExit(f'cuadro de la DT 42.ª incompleto: {anios}')
for d in cal:
    if d['quote'] not in texto42:
        raise SystemExit(f'cita no encontrada: {d["id"]}')
fusionar('parametros', 'cuota-solidaridad-calendario', cal, 'Cotización adicional de solidaridad: calendario de la DT 42.ª',
         'Tipo aplicable a cada tramo de retribución por encima de la base máxima, de 2025 a 2045 (DT 42.ª TRLGSS). Tramos: a (hasta el 10 % adicional de la base máxima), b (del 10 % al 50 %) y c (más del 50 %). '
         'Coincide con los tipos de 2025 y 2026 de la orden de cotización (cuota-solidaridad-tipos).')
print('pnc-reglas:', len(pnc), '· alquiler:', len(alquiler), '· mei-reglas:', len(mei), '· solidaridad:', len(cal))
