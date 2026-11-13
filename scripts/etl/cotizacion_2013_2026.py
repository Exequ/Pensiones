"""Cotización al Régimen General 2013-2026: bases máxima y mínima (grupos 4-7), tipos de
contingencias comunes (empresa y trabajador), MEI y cotización adicional de solidaridad.

Fuente principal: Orden anual de cotización (BOE) y, donde se modificó, la orden modificadora.
Contraste: Ley de PGE (o Real Decreto-ley) del año cuando existe.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from comun import busca, cruce, dato, fuente, fusionar, num, texto, url_boe

ORDEN = {
    2013: 'BOE-A-2013-835', 2014: 'BOE-A-2014-1051', 2015: 'BOE-A-2015-847',
    2016: 'BOE-A-2016-886', 2017: 'BOE-A-2017-1369', 2018: 'BOE-A-2018-1142',
    2019: 'BOE-A-2019-1366', 2021: 'BOE-A-2021-20075', 2022: 'BOE-A-2022-5063',
    2023: 'BOE-A-2023-2472', 2024: 'BOE-A-2024-1691', 2025: 'BOE-A-2025-3780',
    2026: 'BOE-A-2026-7296',
}
# Orden que modifica la anual y fija la base mínima vigente desde el 1 de enero
MODIFICADORA = {2023: 'BOE-A-2023-8121', 2024: 'BOE-A-2024-6218'}
# Norma con rango de ley del mismo año (contraste)
LEY = {2014: 'BOE-A-2013-13616', 2015: 'BOE-A-2014-13612', 2016: 'BOE-A-2015-11644',
       2017: 'BOE-A-2017-7387', 2018: 'BOE-A-2018-9268', 2019: 'BOE-A-2018-17992',
       2021: 'BOE-A-2020-17339', 2022: 'BOE-A-2021-21653', 2023: 'BOE-A-2022-22128'}
RDL_2020 = 'BOE-A-2019-18611'
RDL_2019 = 'BOE-A-2018-17992'
TRLGSS = 'BOE-A-2015-11724'

MAX, MIN, EMP, TRA, MEI, MEI_E, MEI_T = ([] for _ in range(7))
PEND, DISC = [], []
U = 'euros/mes'


def tabla_grupos(t, doc):
    """Filas de grupos 4-7: (mínima, máxima). Verifica que los cuatro grupos coinciden."""
    filas = {}
    for g, nombre in ((4, 'Ayudantes no Titulados'), (5, 'Oficiales Administrativos'),
                      (6, 'Subalternos'), (7, 'Auxiliares Administrativos')):
        m = busca(t, rf'{g} \| {nombre}\.? \| ([\d.]+,\d\d) \| ([\d.]+,\d\d)', doc)
        filas[g] = (num(m.group(1)), num(m.group(2)), m.group(0))
    assert len({(a, b) for a, b, _ in filas.values()}) == 1, (doc, filas)
    return filas


def max_literal(t, doc):
    m = busca(t, r'tope máximo de la base de cotización al Régimen General(?: de la Seguridad Social)? '
                 r'será, (?:a partir de|desde) (?:el )?1 de (?:enero|septiembre) de \d{4}, de ([\d.]+,\d\d) euros mensuales', doc)
    return num(m.group(1)), m.group(0)


def max_en_ley(doc, anio):
    t = texto(doc)
    m = re.search(r'tope máximo de la base de cotización en cada uno de los [Rr]egímenes de la Seguridad Social que lo '
                  r'tengan establecido,? queda fijado, a partir[^,]{0,120}, en la cuantía de ([\d.]+,\d\d) euros mensuales', t)
    if m:
        return num(m.group(1)), m.group(0)
    m = re.search(r'tope máximo de la base de cotización[^.]{0,200}?establece en ([\d.]+,\d\d) euros mensuales', t)
    return (num(m.group(1)), m.group(0)) if m else (None, None)


def tipos_cc(t):
    m = re.search(r'contingencias comunes,? el ([\d,]+) por (?:100|ciento),? (?:del que|siendo) el ([\d,]+) por '
                  r'(?:100|ciento) (?:será )?a cargo de la empresa y el ([\d,]+) por (?:100|ciento),? a cargo de(?:l trabajador| la persona trabajadora)', t)
    return (num(m.group(1)), num(m.group(2)), num(m.group(3)), m.group(0)) if m else None


for y, oid in sorted(ORDEN.items()):
    t = texto(oid)
    S = fuente(oid)
    vmax, ev_max = max_literal(t, oid)
    filas = tabla_grupos(t, oid)
    vmin, vmax_t, ev_min = filas[7]
    assert vmax_t == vmax, (y, vmax, vmax_t)
    nota_ord = ''
    src_min, ev_min_f, loc_min = S, ev_min, 'Artículo 3 (tabla de bases mínimas y máximas por grupo de cotización)'
    nota_min = f'Grupos 4 a 7 (idénticos). Orden dictada bajo prórroga presupuestaria; ver nota del año.' if y >= 2024 else 'Grupos 4 a 7 (idénticos).'
    if y in MODIFICADORA:
        mid = MODIFICADORA[y]
        tm = texto(mid)
        fm = tabla_grupos(tm, mid)
        vmin2, vmax2, ev2 = fm[7]
        assert vmax2 == vmax
        nota_min = (f'Valor de la orden modificadora, con efectos desde el 1 de enero de {y} (actualiza la base mínima al SMI '
                    f'de {y}). La orden original ({oid}) recogía {vmin:.2f} euros/mes. Grupos 4 a 7 (idénticos).'.replace('.', ',', 1) if False else
                    f'Valor de la orden modificadora, con efectos desde el 1 de enero de {y} (actualiza la base mínima al SMI de {y}); '
                    f'la orden original ({oid}) recogía un valor menor para ese periodo. Grupos 4 a 7 (idénticos).')
        vmin, src_min, ev_min_f = vmin2, fuente(mid), ev2
        loc_min = 'Artículo 3 de la Orden (texto modificado)'
    if y == 2021:
        # La orden de 2021 solo fija la tabla desde el 1 de septiembre: no se publica el valor de enero-agosto.
        # El valor de 2021 (deducido) lo añade scripts/etl/base_minima_2020_2021.py; aquí no se escribe.
        vmin = None
    # ---- base máxima
    cross = None
    if y in LEY:
        v2, ev2 = max_en_ley(LEY[y], y) if y != 2019 else max_en_ley(LEY[y], 2019)
        if v2 is not None:
            expl = ''
            if v2 != vmax and y == 2018:
                expl = ('La Ley 6/2018 (julio de 2018) elevó el tope desde el primer día del mes siguiente a su entrada en vigor; '
                        'la orden de enero de 2018 recogía el tope de la prórroga. No es una discrepancia: son dos periodos del mismo año.')
            cross = cruce(LEY[y], v2 == vmax, 'artículo sobre bases y tipos de cotización', f'{expl} Cita: «{ev2}».'.strip())
            if v2 != vmax and not expl:
                DISC.append({'que': f'base-maxima-rg {y}', 'fuenteA': {'docId': oid, 'valor': vmax}, 'fuenteB': {'docId': LEY[y], 'valor': v2}})
        else:
            PEND.append({'que': f'contraste base-maxima-rg {y}', 'url': url_boe(LEY[y]), 'motivo': 'No se localizó la frase del tope máximo en la norma de contraste.'})
    extra = ''
    if y == 2021:
        extra = ' Desde el 1 de septiembre de 2021 según la Orden; la Ley 11/2020 la fijó desde el 1 de enero.'
    if y >= 2024:
        extra = ' Orden dictada hasta la aprobación de una Ley de PGE (prórroga de los Presupuestos).'
    if y == 2018:
        extra = ' Desde el mes siguiente a la entrada en vigor de la Ley 6/2018 el tope fue 3.803,70 euros/mes (ver contraste).'
    MAX.append(dato(y, vmax, U, S, ev_max, 'Artículo 2.1', 'Tope máximo de la base de cotización del Régimen General, igual para todos los grupos de cotización.' + extra, cross=cross))
    if vmin is not None:
        MIN.append(dato(y, vmin, U, src_min, ev_min_f, loc_min, nota_min))
    # ---- tipos de cotización por contingencias comunes
    fuente_tipo, tt = (oid, t)
    if y == 2021:
        fuente_tipo, tt = LEY[2021], texto(LEY[2021])
    tp = tipos_cc(tt)
    if tp is None:
        PEND.append({'que': f'tipos de contingencias comunes {y}', 'url': url_boe(fuente_tipo), 'motivo': 'Frase de tipos no localizada.'})
        continue
    total, emp, tra, ev = tp
    assert abs(emp + tra - total) < 1e-9, (y, tp)
    cr = None
    if y in LEY and y != 2021:
        tl = tipos_cc(texto(LEY[y]))
        if tl:
            cr = cruce(LEY[y], tl[:3] == tp[:3], 'artículo de tipos de cotización')
    ft = fuente(fuente_tipo)
    loc_t = 'Artículo 4.a) (tipos de cotización)' if y != 2021 else 'Artículo de la Ley 11/2020 sobre tipos de cotización del Régimen General'
    nt = f'Tipo total por contingencias comunes: {str(total).replace(".", ",")} %.'
    EMP.append(dato(y, emp, '%', ft, ev, loc_t, nt, cross=cr))
    TRA.append(dato(y, tra, '%', ft, ev, loc_t, nt, cross=cr))

# 2020: sin orden anual
vmax20 = None
t20 = texto(RDL_2020)
m = busca(t20, r'Las cuantías del tope máximo y de la base máxima de cotización en el sistema de Seguridad Social serán las establecidas en el artículo 3 del Real Decreto-ley 28/2018, de 28 de diciembre\.', RDL_2020)
m2 = busca(texto(RDL_2019), r'se establece en ([\d.]+,\d\d) euros mensuales', RDL_2019)
MAX.append(dato(2020, num(m2.group(1)), U, fuente(RDL_2020), m.group(0) + ' || RDL 28/2018, art. 3: «' + m2.group(0) + '»',
                'Artículo de prórroga del RDL 18/2019 (remite al artículo 3 del RDL 28/2018)',
                'No hubo orden anual de cotización para 2020. El RDL 18/2019 remite a las cuantías del art. 3 del RDL 28/2018; el valor se toma de ese artículo.',
                confidence='media'))
# La base mínima de 2020 y 2021 la añade scripts/etl/base_minima_2020_2021.py (anexo del informe económico-financiero)
for q in ('tipos de contingencias comunes 2020',):
    PEND.append({'que': q, 'url': url_boe(RDL_2020), 'motivo': 'Sin orden anual de cotización en 2020 y el RDL 18/2019 no recoge la cuantía; falta la fuente que la fije.'})

fusionar('parametros', 'base-maxima-rg', MAX)
fusionar('parametros', 'base-minima-rg', MIN)
fusionar('parametros', 'tipo-cc-empresa', EMP)
fusionar('parametros', 'tipo-cc-trabajador', TRA)

# ---- MEI y cuota de solidaridad
tl = texto(TRLGSS + '_act')
bloque = busca(tl, r'Disposición transitoria cuadragésima tercera\. Aplicación del Mecanismo de Equidad Intergeneracional\..*?Se añade por el art\. único\.43', TRLGSS).group(0)
S = dict(fuente(TRLGSS), url='https://www.boe.es/buscar/act.php?id=' + TRLGSS)
MEI = []
for anio, (tot_s, emp_s, tra_s) in {}.items():
    pass
for m in re.finditer(r'En el año (\d{4}), será de ([\d,]+) puntos? porcentual(?:es)?, (?:de los que|del que) el ([\d,]+) corresponderá a la empresa y el ([\d,]+) al trabajador\.', bloque):
    a = int(m.group(1))
    tot, emp, tra = num(m.group(2)), num(m.group(3)), num(m.group(4))
    assert abs(emp + tra - tot) < 1e-9, (a, tot, emp, tra)
    q = m.group(0)
    loc = 'Disposición transitoria cuadragésima tercera TRLGSS (añadida por el RDL 2/2023)'
    for lista, v in ((MEI, tot), (MEI_E, emp), (MEI_T, tra)):
        lista.append(dato(a, v, 'puntos porcentuales', S, q, loc, 'Escala legal vigente en el texto consolidado. Desde 2030 hasta 2050 se mantiene el 1,2 con igual distribución.' if a == 2029 else None))
    # contraste con la orden anual
    if a in ORDEN:
        to = texto(ORDEN[a])
        mo = re.search(r'mecanismo de equidad intergeneracional, el ([\d,]+) por ciento aplicable sobre la base de cotización por contingencias comunes, del que el ([\d,]+) por ciento será a cargo de la empresa y el ([\d,]+) por ciento, a cargo del trabajador', to)
        if mo:
            ok = (num(mo.group(1)), num(mo.group(2)), num(mo.group(3))) == (tot, emp, tra)
            c = cruce(ORDEN[a], ok, 'artículo 4.c)', f'Cita: «{mo.group(0)}».')
            for lista in (MEI, MEI_E, MEI_T):
                lista[-1]['crossCheck'] = c
fusionar('parametros', 'mei-tipo-total', MEI, 'Tipo de cotización del Mecanismo de Equidad Intergeneracional (MEI)',
         'Puntos porcentuales sobre la base de cotización por contingencias comunes, escala 2023-2029 de la DT 43.ª del TRLGSS (texto consolidado). Contraste con la Orden anual donde existe.')
fusionar('parametros', 'mei-tipo-empresa', MEI_E, 'MEI: parte a cargo de la empresa', 'Puntos porcentuales del MEI a cargo de la empresa (DT 43.ª TRLGSS).')
fusionar('parametros', 'mei-tipo-trabajador', MEI_T, 'MEI: parte a cargo del trabajador', 'Puntos porcentuales del MEI a cargo del trabajador (DT 43.ª TRLGSS).')

# cotización adicional de solidaridad (tramos sobre la base máxima), 2025 y 2026
SOL = []
for y in (2025, 2026):
    t = texto(ORDEN[y])
    art = busca(t, r'Artículo 17\. Cotización adicional de solidaridad\..*?2\. En el caso', ORDEN[y]).group(0)
    tr = re.findall(r'([abc])\) El ([\d,]+) por ciento a la parte de la retribución (?:comprendida entre ([\d.]+,\d\d) euros y ([\d.]+,\d\d) euros|que supere los ([\d.]+,\d\d) euros), siendo el ([\d,]+) por ciento a cargo de la empresa y el ([\d,]+) por ciento a cargo de la persona trabajadora', art)
    assert len(tr) == 3, (y, tr)
    for letra, tipo, desde, hasta, supera, emp, tra in tr:
        tipo_n, emp_n, tra_n = num(tipo), num(emp), num(tra)
        assert abs(emp_n + tra_n - tipo_n) < 1e-9, (y, letra)
        lim = f'{desde} a {hasta}' if desde else f'más de {supera}'
        q = re.search(rf'{letra}\) El {tipo} por ciento[^.]*?(?:\.\d\d|\d) euros[^.]*?persona trabajadora\.', art)
        SOL.append({'id': f'{y}-tramo-{letra}', 'value': tipo_n, 'unit': '%', 'period': str(y), 'source': fuente(ORDEN[y]),
                    'fetchedAt': dato(y, 0, '', {}, '', '')['fetchedAt'], 'confidence': 'alta',
                    'notes': f'Tramo {letra}) sobre la retribución que excede de la base máxima (euros/mes: {lim}). Reparto: {emp} % empresa y {tra} % trabajador.',
                    'quote': q.group(0) if q else art[:300], 'location': 'Artículo 17.1 (cotización adicional de solidaridad; art. 19 bis TRLGSS)'})
import json, os
from comun import REPO
ruta = f'{REPO}/data/parametros/cuota-solidaridad-tipos.json'
with open(ruta, 'w', encoding='utf-8') as f:
    json.dump({'tipo': 'datos', 'id': 'cuota-solidaridad-tipos', 'title': 'Cotización adicional de solidaridad: tipos por tramo',
               'description': 'Tipo aplicable a la parte de la retribución que supera la base máxima, por tramos (hasta el 10 %, del 10 % al 50 % y más del 50 % del exceso), con el reparto empresa/trabajador. Orden anual de cotización 2025 y 2026.',
               'data': SOL}, f, ensure_ascii=False, indent=2)
    f.write('\n')
print('escrito parametros/cuota-solidaridad-tipos', len(SOL))
print('PENDIENTES', json.dumps(PEND, ensure_ascii=False)[:1500])
print('DISCREPANCIAS', DISC)
