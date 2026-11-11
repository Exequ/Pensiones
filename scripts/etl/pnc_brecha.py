"""Pensión no contributiva (importe anual) y complemento de pensiones para la reducción de la brecha de género."""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import minimas  # noqa: E402
from comun import dato, fuente, fusionar, num, texto  # noqa: E402
from revalorizacion_pensiones import brutos, de_bruto  # noqa: E402,F401

PAT = re.compile(r'[^.]{0,200}no contributiva[^.]{0,260}?([\d.]+,\d\d) euros(?: íntegros)?(?: anuales|/año| al año)?[^.]{0,60}')
PNC = {}
for y, docs in minimas.NORMAS.items():
    for d in docs[::-1]:
        t = texto(d)
        for m in PAT.finditer(t):
            v = num(m.group(1))
            if 3000 < v < 12000 and re.search(r'anual|euros/año|íntegros', m.group(0)):
                PNC[y] = (d, v, m.group(0).strip()[-300:])
                break
        if y in PNC:
            break
b = brutos('revalorizacion-2000-2012.json', 'pnc-importe-anual')
out = []
for y in range(2000, 2027):
    if y in PNC:
        d, v, q = PNC[y]
        nota = 'Importe anual íntegro de la pensión de jubilación e invalidez en su modalidad no contributiva (14 pagas).'
        if y == 2012:
            nota += ' La norma recoge también 4.957,40 euros/año, que corresponde a 2011 una vez aplicada la compensación por desviación del IPC.'
        out.append(dato(y, v, 'euros/año', fuente(d), q, 'Artículo o anexo sobre la pensión no contributiva', nota))
    elif y in b and b[y]['value'] < 12000:
        out.append(de_bruto(b[y], 'euros/año'))
fusionar('parametros', 'pnc-importe-anual', out, 'Pensión no contributiva: importe anual',
         'Importe anual íntegro de la pensión no contributiva de jubilación e invalidez fijado cada año en la norma de revalorización. Es también el límite de rentas individual del beneficiario (art. 363 TRLGSS).')
# la recogida manual usaba el identificador por periodo; comprobación de unidades
BR = []
for y, docs in minimas.NORMAS.items():
    if y < 2023:
        continue
    for d in docs[::-1]:
        t = texto(d)
        m = re.search(r'[^.]{0,200}(?:complemento (?:de pensiones )?(?:contributivas? )?(?:para|de pensiones para) la reducción de (?:la )?brecha de género)[^.]{0,260}?([\d.]+,\d\d) euros(?:/mes| mensuales)[^.]{0,80}', t) or \
            re.search(r'[^.]{0,200}reducción de brecha de género[^.]{0,260}?([\d.]+,\d\d) euros mensuales[^.]{0,120}', t)
        if m:
            BR.append(dato(y, num(m.group(1)), 'euros/mes', fuente(d), m.group(0).strip()[-330:], 'Artículo sobre el complemento para la reducción de la brecha de género',
                           'Importe mensual por hijo (art. 60 TRLGSS), 14 pagas.'))
            break
fusionar('parametros', 'complemento-brecha-genero', BR, 'Complemento para la reducción de la brecha de género: importe mensual por hijo',
         'Importe mensual del complemento (art. 60 TRLGSS) fijado en la norma de revalorización de cada año. Los años 2021 y 2022 constan en PENDIENTE_DATOS.md.')
