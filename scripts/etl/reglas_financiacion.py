"""Fase 1B-2: reglas legales de financiación en formato numérico (data/parametros/).

- fondo-reserva-desembolso-maximo: límite del desembolso anual del Fondo de Reserva (art. 121.2 TRLGSS).
- mei-destino: destino de la cotización finalista del MEI (art. 127 bis TRLGSS).
- prestamos-estado-seguridad-social: préstamos del Estado a la TGSS autorizados por las leyes de PGE de 2021, 2022 y 2023.
- prestamos-plazo-ampliado-2026: nuevo plazo de cancelación de préstamos anteriores (RDL 3/2026, DA 2.ª).
Cada cita se comprueba contra el texto de data-raw/boe/. `python3 -I`."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY, BOE, fusionar

RAW = f'{REPO}/data-raw/boe'
_c = {}


def texto(n):
    if n not in _c:
        _c[n] = re.sub(r'\s+', ' ', open(f'{RAW}/{n}', encoding='utf-8').read())
    return _c[n]


def exige(n, lit):
    if lit not in texto(n):
        raise SystemExit(f'CITA NO ENCONTRADA en {n}: {lit[:90]}')


def src(n, titulo, url):
    return {'title': titulo, 'publisher': BOE, 'url': url}


def mk(id_, per, val, unit, fuente, doc, cita, loc, notas=None, segunda=None):
    exige(doc, cita)
    d = {'id': id_, 'value': val, 'unit': unit, 'period': str(per), 'source': fuente, 'fetchedAt': HOY, 'confidence': 'alta'}
    if notas:
        d['notes'] = notas
    d['quote'] = cita
    d['location'] = loc
    if segunda and cita in texto(segunda[0]):
        d['crossCheck'] = {'source': segunda[1], 'fetchedAt': HOY, 'matches': True, 'notes': f'Cita localizada en el texto de la segunda norma ({segunda[2]}).'}
    return d


def da_previa(doc, lit):
    t = texto(doc)
    i = t.index(lit)
    j = t.rfind('Disposición adicional', 0, i)
    return t[j:j + 140].split('.  ')[0][:120]


RDL2 = ('rdl-2-2023.txt', src('', 'Real Decreto-ley 2/2023, de 16 de marzo, de medidas urgentes para la ampliación de derechos de los pensionistas, la reducción de la brecha de género y el establecimiento de un nuevo marco de sostenibilidad del sistema público de pensiones', 'https://www.boe.es/buscar/doc.php?id=BOE-A-2023-6967'), 'RDL 2/2023, art. único')
TRLGSS = src('', 'Real Decreto Legislativo 8/2015, texto refundido de la Ley General de la Seguridad Social (texto consolidado, versión descargada el 2026-11-11)', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724')
datos = []
for a, pct in zip(range(2033, 2054), ['0,10', '0,12', '0,15', '0,17', '0,19', '0,22', '0,25', '0,28', '0,46', '0,50', '0,54', '0,77', '0,82', '0,87', '0,91', '0,86', '0,84', '0,82', '0,53', '0,51', '0,50']):
    datos.append(mk(str(a), a, float(pct.replace(',', '.')), '% del PIB (límite máximo del desembolso anual)', TRLGSS, 'trlgss-2015-consolidado.txt', f'| {a} | {pct}% |', 'art. 121.2 TRLGSS (art. único.15 RDL 2/2023)',
                    'Desde 2033 la Ley de Presupuestos fija cada año el desembolso del Fondo de Reserva, que se destina en exclusiva a las pensiones contributivas (art. 121.1), con este límite máximo en porcentaje del PIB. El RDL 2/2023 impide disposiciones hasta 2033 (según el informe del Fondo de Reserva de 2025, sección 4.3).', RDL2))
fusionar('parametros', 'fondo-reserva-desembolso-maximo', datos, 'Límite máximo del desembolso anual del Fondo de Reserva (2033-2053)', 'Límite del desembolso anual del Fondo de Reserva de la Seguridad Social, en % del PIB, que fija el art. 121.2 TRLGSS para cada año de 2033 a 2053.')

cita = 'una cotización finalista aplicable en todos los regímenes y en todos los supuestos en los que se cotice por la contingencia de jubilación, que no será computable a efectos de prestaciones y que nutrirá el Fondo de Reserva de la Seguridad Social'
mei = [mk('destino-fondo-reserva', 2023, 1, 'indicador (1 = la recaudación del MEI nutre el Fondo de Reserva)', TRLGSS, 'trlgss-2015-consolidado.txt', cita, 'art. 127 bis.1 TRLGSS (art. único.16 RDL 2/2023); DT 43.ª: efectos del 01/01/2023 al 31/12/2050',
          'El MEI es una cotización finalista, no computable a efectos de prestaciones, cuya recaudación nutre el Fondo de Reserva. Las dotaciones efectivas al Fondo con cargo al MEI están en data/sistema/fondo-reserva-anual.json y la recaudación en data/sistema/presupuesto-ss-ejecucion.json (concepto «MECANISMO DE EQUIDAD INTERGENERACIONAL»).', RDL2),
       mk('no-computable-prestaciones', 2023, 1, 'indicador (1 = no computa para prestaciones)', TRLGSS, 'trlgss-2015-consolidado.txt', 'que no será computable a efectos de prestaciones', 'art. 127 bis.1 TRLGSS', None)]
fusionar('parametros', 'mei-destino', mei, 'Destino de la cotización finalista del MEI (art. 127 bis TRLGSS)', 'Indicadores legales sobre el destino del Mecanismo de Equidad Intergeneracional.')

LEYES = {2021: ('BOE-A-2020-17339.txt', 'Ley 11/2020, de 30 de diciembre, de Presupuestos Generales del Estado para el año 2021', 'https://www.boe.es/buscar/doc.php?id=BOE-A-2020-17339', '13.830.090,00', 13830.09),
         2022: ('BOE-A-2021-21653.txt', 'Ley 22/2021, de 28 de diciembre, de Presupuestos Generales del Estado para el año 2022', 'https://www.boe.es/buscar/doc.php?id=BOE-A-2021-21653', '6.981.590,00', 6981.59),
         2023: ('BOE-A-2022-22128.txt', 'Ley 31/2022, de 23 de diciembre, de Presupuestos Generales del Estado para el año 2023', 'https://www.boe.es/buscar/doc.php?id=BOE-A-2022-22128', '10.003.806,15', 10003.81)}
datos = []
for a, (doc, tit, url, imp, val) in LEYES.items():
    f = src('', tit, url)
    c1 = f'podrá autorizar la concesión por parte del Estado de préstamos a la Tesorería General de la Seguridad Social por un importe de hasta {imp} miles de euros'
    loc = da_previa(doc, c1)
    c2 = 'Estos préstamos no devengarán intereses y su cancelación se producirá en un plazo máximo de diez años contados a partir del 1 de enero del año siguiente al de su concesión'
    datos.append(mk(f'{a}-importe-maximo', a, val, 'millones de euros (importe máximo autorizable en el ejercicio)', f, doc, c1, loc, 'Autorización a favor del Gobierno, no importe concedido; lo concedido figura en «9. PASIVOS FINANCIEROS» de data/sistema/presupuesto-ss-ejecucion.json.'))
    datos.append(mk(f'{a}-plazo-maximo-anios', a, 10, 'años desde el 1 de enero del año siguiente al de concesión', f, doc, c2, loc, None))
    datos.append(mk(f'{a}-tipo-interes', a, 0, '% (no devengan intereses)', f, doc, c2, loc, None))
fusionar('parametros', 'prestamos-estado-seguridad-social', datos, 'Préstamos del Estado a la Tesorería General de la Seguridad Social autorizados por las leyes de presupuestos (2021-2023)', 'Importe máximo, plazo máximo de cancelación y tipo de interés de los préstamos del Estado a la TGSS que autorizan las leyes de PGE de 2021, 2022 y 2023.')

f26 = src('', 'Real Decreto-ley 3/2026, de 3 de febrero, para la revalorización de las pensiones públicas y otras medidas urgentes en materia de Seguridad Social', 'https://www.boe.es/buscar/act.php?id=BOE-A-2026-2548')
ap = [(1, '1.686.187.539,81', 1686187539.81, 'Real Decreto-ley 6/1992, de 13 de noviembre, sobre concesión de un crédito extraordinario por importe de 280.558.000.000 de pesetas', 'préstamo otorgado a la Seguridad Social por el Estado en virtud del Real Decreto-ley 6/1992'),
      (2, '2.073.491.760,12', 2073491760.12, '345.000.000.000 pesetas', 'artículo 11.cuatro de la Ley 21/1993'),
      (3, '2.670.561.225,10', 2670561225.10, '444.344.000.000 pesetas', 'artículo 12.tres de la Ley 41/1994'),
      (4, '2.670.561.225,10', 2670561225.10, '444.344.000.000 pesetas', 'prorrogada para 1996')]
datos = []
for n, imp, val, ref, extra in ap:
    verbo = 'Se amplía en diez años, a partir de 2026, el plazo' if n == 4 else 'Se concede un nuevo plazo de diez años, a partir de 2026, para la cancelación'
    datos.append(mk(f'apartado-{n}-importe', 2026, val, 'euros (importe del préstamo)', f26, 'BOE-A-2026-2548.txt', f'({imp} euros)', f'DA 2.ª.{n} RDL 3/2026', f'Préstamo de {ref}; {extra}. Se repite el importe del apartado 3 en el 4 porque amplía el mismo préstamo (otro plazo).' if n == 4 else f'Préstamo de {ref}.'))
    datos.append(mk(f'apartado-{n}-plazo-anios', 2026, 10, 'años de nuevo plazo (o de ampliación) a partir de 2026', f26, 'BOE-A-2026-2548.txt', verbo, f'DA 2.ª.{n} RDL 3/2026', None))
fusionar('parametros', 'prestamos-plazo-ampliado-2026', datos, 'Nuevo plazo de cancelación de préstamos antiguos del Estado a la Seguridad Social (RDL 3/2026, DA 2.ª)', 'Préstamos de 1992, 1994 y 1995 cuyo plazo de cancelación se renueva o amplía en diez años desde 2026. Los apartados 3 y 4 tratan el mismo préstamo de 1995 en dos etapas.')
