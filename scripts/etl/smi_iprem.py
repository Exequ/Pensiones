"""Salario mínimo interprofesional (euros/día y euros/mes) e IPREM (diario, mensual y anual)."""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import dato, fuente, fusionar, num, texto  # noqa: E402

SMI = {2000: 'BOE-A-1999-24923', 2001: 'BOE-A-2000-24365', 2002: 'BOE-A-2001-24745', 2003: 'BOE-A-2002-25290',
       2004: 'BOE-A-2003-23711', 2005: 'BOE-A-2004-21909', 2006: 'BOE-A-2005-21610', 2007: 'BOE-A-2006-22959',
       2008: 'BOE-A-2007-22451', 2009: 'BOE-A-2008-20958', 2010: 'BOE-A-2009-21170', 2011: 'BOE-A-2010-20150',
       2012: 'BOE-A-2011-20645', 2013: 'BOE-A-2012-15766', 2014: 'BOE-A-2013-13764', 2015: 'BOE-A-2014-13518',
       2016: 'BOE-A-2015-14273', 2017: 'BOE-A-2016-12598', 2018: 'BOE-A-2017-15848', 2019: 'BOE-A-2018-17773',
       2020: 'BOE-A-2020-1652', 2021: 'BOE-A-2021-15770', 2022: 'BOE-A-2022-2851', 2023: 'BOE-A-2023-3982',
       2024: 'BOE-A-2024-2251', 2025: 'BOE-A-2025-2576', 2026: 'BOE-A-2026-3815'}
IPREM = {2004: 'BOE-A-2004-12010', 2005: 'BOE-A-2004-21688', 2006: 'BOE-A-2005-21525', 2007: 'BOE-A-2006-22865',
         2008: 'BOE-A-2008-977', 2009: 'BOE-A-2008-20744', 2010: 'BOE-A-2009-20765', 2011: 'BOE-A-2010-19703',
         2012: 'BOE-A-2012-8745', 2013: 'BOE-A-2012-15651', 2014: 'BOE-A-2013-13616', 2015: 'BOE-A-2014-13612',
         2016: 'BOE-A-2015-11644', 2017: 'BOE-A-2017-7387', 2018: 'BOE-A-2018-9268', 2021: 'BOE-A-2020-17339',
         2022: 'BOE-A-2021-21653', 2023: 'BOE-A-2022-22128'}
N = r'(\d{1,3}(?:[. ]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)'
D, M = [], []
PEND = []
for y, d in SMI.items():
    t = texto(d)
    m = re.search(r'queda fijado en [\d.]+ pesetas/día \(%s euros/día\) o [\d.]+ pesetas/mes \(%s euros/mes\)' % (N, N), t) or \
        re.search(r'queda fijado en %s euros/día o %s euros/mes' % (N, N), t)
    if not m:
        PEND.append(f'SMI {y}')
        continue
    dia, mes = num(m.group(1).replace(' ', '')), num(m.group(2).replace(' ', ''))
    nota = {2021: 'Fijado por el RD 817/2021 con efectos desde el 1 de septiembre de 2021; hasta el 31 de agosto regía el del RD 231/2020 (950 euros/mes).'}.get(y)
    if y in (2000, 2001):
        nota = 'La norma expresa el importe en pesetas y, entre paréntesis, en euros; se recoge el importe en euros que consta en la norma.'
    q = m.group(0)
    D.append(dato(y, dia, 'euros/día', fuente(d), q, 'Artículo 1', nota))
    M.append(dato(y, mes, 'euros/mes', fuente(d), q, 'Artículo 1', nota))
fusionar('parametros', 'smi-diario', D, 'Salario mínimo interprofesional diario', 'Importe diario fijado cada año por real decreto.')
fusionar('parametros', 'smi-mensual', M, 'Salario mínimo interprofesional mensual',
         'Importe mensual (para salarios fijados por meses) fijado cada año por real decreto. En 2021 constan dos periodos (ver notas).')

RX = re.compile(r'a\) [Ee][Ll] IPREM diario[,:]? (?:será de )?' + N +
                r' euros[;.]? b\) [Ee]l IPREM mensual[,:]? (?:será de )?' + N + r' euros[;.]? c\) [Ee]l IPREM anual[,:]? (?:será de )?' + N + ' euros')
S1, S2, S3 = [], [], []
for y, d in IPREM.items():
    t = texto(d)
    m = RX.search(t)
    if not m and d == 'BOE-A-2004-12010':
        m = re.search(r'IPREM tendrá las siguientes cuantías: a\) El IPREM diario, ([\d.,]+) euros[^b]*?b\) El IPREM mensual, ([\d.,]+) euros[^c]*?c\) El IPREM anual, ([\d.,]+) euros', t)
    if not m:
        PEND.append(f'IPREM {y}')
        continue
    q = m.group(0)[:400]
    nota = {2008: 'El RDL 1/2008 sustituye al importe de la Ley 51/2007 de PGE 2008 (509,40 euros/mes).',
            2017: 'La Ley 3/2017 lo fija «durante la vigencia de esta ley».'}.get(y)
    for lista, g, unidad in ((S1, 1, 'euros/día'), (S2, 2, 'euros/mes'), (S3, 3, 'euros/año')):
        lista.append(dato(y, num(m.group(g)), unidad, fuente(d), q, 'Artículo sobre el IPREM', nota))
fusionar('parametros', 'iprem-diario', S1, 'IPREM diario', 'Indicador público de renta de efectos múltiples, importe diario.')
fusionar('parametros', 'iprem-mensual', S2, 'IPREM mensual', 'Indicador público de renta de efectos múltiples, importe mensual (12 pagas).')
fusionar('parametros', 'iprem-anual', S3, 'IPREM anual', 'Indicador público de renta de efectos múltiples, importe anual.')
print('PENDIENTES', PEND)
