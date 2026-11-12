"""Fase 2-B-2 (paso previo): citas literales de las cuantías mínimas de 2022 a 2026.

La extracción de la Fase 1A dejó en algunas cuantías mínimas una cita abreviada («Absoluta. …
9.126,60») cuya cifra no es la del dato (es la última del cuadro). Este script:

  1. Lee el Anexo I (cuadro de cuantías mínimas de las pensiones contributivas) de la norma de
     revalorización de cada año 2022-2026 (data-raw/boe, huellas en origen.json) y lo convierte en
     filas «rótulo | celda | celda | celda |».
  2. Para cada cuantía de pension-minima-{jubilacion,incapacidad,viudedad,orfandad-familiares} de
     esos años cuya cita no contiene la cifra del valor, la sustituye por la fila literal del
     cuadro (comprobada por código dentro del Anexo I) y comprueba que la celda de la columna que
     corresponde coincide con el valor. No cambia ningún valor: si la celda no coincide, se detiene
     (la discrepancia iría a docs/DISCREPANCIAS.md).
  3. Añade las cuantías de supervivencia que faltaban: en 2026, orfandad por beneficiario,
     prestación de orfandad y favor de familiares por beneficiario; de 2022 a 2026, el incremento
     de la mínima en la orfandad absoluta y el importe a prorratear entre varios beneficiarios en
     favor de familiares (frases del cuadro con la cifra).

Ejecutar con `python3 -I scripts/etl/minimas_citas.py`.
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
LOC = 'Anexo I (cuadro de cuantías mínimas de las pensiones contributivas)'  # en 2024, anexo IV del RDL 8/2023
DOCS = {
    2022: 'BOE-A-2022-1189',
    2023: 'BOE-A-2022-22694',
    2024: 'BOE-A-2023-26452',
    2025: 'BOE-A-2025-7660',
    2026: 'BOE-A-2026-6977',
}
COLUMNAS = {'conyuge-cargo': 0, 'unipersonal': 1, 'conyuge-no-cargo': 2, 'unico': 0}
NUM = r'\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?'


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def numero(s):
    return float(s.replace('.', '').replace(',', '.'))


def fmt(v):
    return f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def anexo(doc, anio):
    """Líneas del cuadro de cuantías mínimas contributivas del año (hasta el anexo siguiente o el
    límite de ingresos)."""
    L = [norm(l) for l in open(f'{RAW}/{doc}.txt', encoding='utf-8')]
    i = next(k for k, l in enumerate(L) if l == f'Cuadro de cuantías mínimas de las pensiones de la modalidad contributiva para el año {anio}')
    j = next(k for k in range(i, len(L)) if L[k].startswith(('Límite de ingresos', 'ANEXO')))
    return L[i:j]


SECCIONES = {x.lower(): x for x in ('Jubilación', 'Incapacidad Permanente', 'Viudedad', 'Orfandad', 'Prestación de orfandad', 'En favor de familiares')}


def filas(L):
    """Filas del cuadro: (sección, rótulo, celdas, cita literal). Una fila es un rótulo terminado
    en « |» seguido de celdas («cifra |» o «|»)."""
    res, seccion, k = [], None, 0
    while k < len(L):
        l = L[k]
        cab = SECCIONES.get(re.sub(r' ?\|$', '', l).lower())
        if cab:
            seccion = cab
            k += 1
            continue
        if l.endswith(' |') and not re.fullmatch(NUM + ' \\|', l) and l != '|':
            celdas, n = [], k + 1
            while n < len(L) and (L[n] == '|' or re.fullmatch(NUM + ' \\|', L[n])):
                celdas.append(L[n][:-2].strip() if L[n] != '|' else '')
                n += 1
            cita = norm(' '.join(L[k:n]))
            res.append((seccion, l[:-2], celdas, cita))
            k = n
            continue
        k += 1
    return res


# Rótulos por clase (el texto cambia de un año a otro: «Gran invalidez» / «Gran incapacidad»,
# «Por beneficiario» / «Por persona beneficiaria»).
ROTULOS = {
    'jub65': ('Jubilación', [r'Titular con sesenta y cinco años\.']),
    'jub-menor65': ('Jubilación', [r'Titular menor de sesenta y cinco años\.']),
    'jub65-gran-invalidez': ('Jubilación', [r'Titular con sesenta y cinco años procedente de gran (invalidez|incapacidad)\.']),
    'ip-gran-invalidez': ('Incapacidad Permanente', [r'Gran (invalidez|incapacidad)\.']),
    'ip-absoluta': ('Incapacidad Permanente', [r'Absoluta\.']),
    'ip-total-65': ('Incapacidad Permanente', [r'Total: Titular con sesenta y cinco años\.']),
    'ip-total-60-64': ('Incapacidad Permanente', [r'Total: Titular con edad entre sesenta y sesenta y cuatro años\.']),
    'ip-total-enf-comun-menor60': ('Incapacidad Permanente', [r'Total: Derivada de enfermedad común menor de sesenta años\.']),
    'ip-parcial-at-65': ('Incapacidad Permanente', [r'Parcial del régimen de accidentes de trabajo: Titular con sesenta y cinco años\.']),
    'viud-cargas-familiares': ('Viudedad', [r'Titular con cargas familiares\.']),
    'viud-65-o-discapacidad65': ('Viudedad', [r'Titular con sesenta y cinco años o con discapacidad en grado igual o superior al 65 por 100\.']),
    'viud-60-64': ('Viudedad', [r'Titular con edad entre sesenta y sesenta y cuatro años\.']),
    'viud-menor60': ('Viudedad', [r'Titular con menos de sesenta años\.']),
    'orf': ('Orfandad', [r'Por (beneficiario|persona beneficiaria)\.']),
    'orf-discapacidad65': ('Orfandad', [r'Por (beneficiario|persona beneficiaria) menor de (18|dieciocho) años con (una )?discapacidad en grado igual o superior al 65 por 100\.']),
    'prest-orf-1': ('Prestación de orfandad', [r'(Un beneficiario|Una persona beneficiaria)\.']),
    'prest-orf-varios': ('Prestación de orfandad', [r'Vari[oa]s (beneficiarios|personas beneficiarias): a repartir entre número de (beneficiarios|personas beneficiarias)\.']),
    'fam': ('En favor de familiares', [r'Por (beneficiario|persona beneficiaria)\.']),
    'fam1-65': ('En favor de familiares', [r'(Un solo beneficiario|Una sola persona beneficiaria) con sesenta y cinco años\.']),
    'fam1-menor65': ('En favor de familiares', [r'(Un solo beneficiario|Una sola persona beneficiaria) menor de sesenta y cinco años\.']),
}
FICHEROS = ['pension-minima-jubilacion', 'pension-minima-incapacidad', 'pension-minima-viudedad', 'pension-minima-orfandad-familiares']


def fila(tabla, clase):
    seccion, patrones = ROTULOS[clase]
    cand = [f for f in tabla if f[0] == seccion and any(re.fullmatch(p, f[1]) for p in patrones)]
    if len(cand) != 1:
        raise SystemExit(f'fila {clase}: {len(cand)} candidatas')
    return cand[0]


def cita_de(fila_):
    """Cita literal: para filas repetidas en varias secciones se antepone la sección."""
    seccion, rotulo, _, cita = fila_
    if rotulo.startswith(('Por beneficiario', 'Por persona beneficiaria')) and not rotulo.endswith('100.'):
        return f'{seccion} | | {cita}'
    return cita


def fuente(doc, titulo):
    return {'title': titulo, 'publisher': BOE, 'url': ORIGEN[f'{doc}.txt']['url'] if f'{doc}.txt' in ORIGEN else f'https://www.boe.es/buscar/doc.php?id={doc}', 'docId': doc}


corregidos, nuevos_orf = [], []
for anio, doc in DOCS.items():
    L = anexo(doc, anio)
    texto = norm(' '.join(L))
    tabla = filas(L)
    for f in FICHEROS:
        ruta = f'{REPO}/data/parametros/{f}.json'
        obj = json.load(open(ruta, encoding='utf-8'))
        cambio = False
        for d in obj['data']:
            if not d['id'].startswith(f'{anio}-'):
                continue
            if fmt(d['value']) in (d.get('quote') or ''):
                continue
            m = re.fullmatch(rf'{anio}-(.+)-(conyuge-cargo|unipersonal|conyuge-no-cargo|unico)', d['id'])
            if not m or m.group(1) not in ROTULOS:
                raise SystemExit(f'sin rótulo para {d["id"]}')
            fl = fila(tabla, m.group(1))
            celdas = [c for c in fl[2] if c] if m.group(2) == 'unico' or m.group(1).startswith('viud') else fl[2]
            col = 0 if m.group(1).startswith('viud') else COLUMNAS[m.group(2)]
            if abs(numero(celdas[col]) - d['value']) > 0.005:
                raise SystemExit(f'DISCREPANCIA {d["id"]}: valor {d["value"]} y celda {celdas[col]}')
            cita = cita_de(fl)
            if norm(cita) not in texto:
                raise SystemExit(f'cita no encontrada: {cita}')
            if fmt(d['value']) not in cita:
                raise SystemExit(f'la cita no contiene la cifra: {d["id"]}')
            corregidos.append((d['id'], d.get('quote'), cita))
            d['quote'] = cita
            d['location'] = LOC
            nota = d.get('notes', '')
            if 'Cita corregida' not in nota:
                d['notes'] = (nota + ' ' if nota else '') + 'Cita corregida en la Fase 2-B-2: fila literal del cuadro, comprobada por código (la de la Fase 1A no contenía la cifra).'
            cambio = True
        if cambio:
            with open(ruta, 'w', encoding='utf-8') as fh:
                json.dump(obj, fh, ensure_ascii=False, indent=2)
                fh.write('\n')

    # Cuantías de supervivencia que faltaban
    orf = json.load(open(f'{REPO}/data/parametros/pension-minima-orfandad-familiares.json', encoding='utf-8'))
    ids = {d['id'] for d in orf['data']}
    titulo = next((d['source']['title'] for d in orf['data'] if d['id'].startswith(f'{anio}-')), None)
    for clase in ('orf', 'prest-orf-1', 'prest-orf-varios', 'fam'):
        id_ = f'{anio}-{clase}-unico'
        if id_ in ids:
            continue
        fl = fila(tabla, clase)
        v = [c for c in fl[2] if c][0]
        nuevos_orf.append({'id': id_, 'value': numero(v), 'unit': 'euros/año', 'period': str(anio), 'source': fuente(doc, titulo),
                           'fetchedAt': HOY, 'confidence': 'alta', 'notes': 'Cuantía mínima anual (importe único). Añadida en la Fase 2-B-2 (no la recogió la extracción de la Fase 1A).',
                           'quote': cita_de(fl), 'location': LOC})
    for id_, patron, nota in (
        ('orf-absoluta-incremento', rf'En la orfandad absoluta el mínimo se incrementará en ({NUM}) euros/año distribuidos, en su caso, entre (los beneficiarios|las personas beneficiarias)\.',
         'Incremento anual de la cuantía mínima de orfandad en la orfandad absoluta, distribuido entre los beneficiarios. Añadido en la Fase 2-B-2.'),
        ('fam-varios-incremento', rf'Vari[oa]s (beneficiarios|personas beneficiarias): El mínimo asignado a cada un[oa] de ell[oa]s se incrementará en el importe que resulte de prorratear ({NUM}) euros/año entre el número de (beneficiarios|personas beneficiarias)\.',
         'Importe anual que se prorratea entre varios beneficiarios de favor de familiares cuando no hay viudo ni huérfano pensionistas. Añadido en la Fase 2-B-2.'),
    ):
        cand = [f for f in tabla if re.fullmatch(patron, f[1])]
        if len(cand) != 1:
            raise SystemExit(f'{anio} {id_}: {len(cand)} candidatas')
        m = re.fullmatch(patron, cand[0][1])
        cifra = m.group(1) if id_.startswith('orf') else m.group(2)
        nuevos_orf.append({'id': f'{anio}-{id_}-unico', 'value': numero(cifra), 'unit': 'euros/año', 'period': str(anio), 'source': fuente(doc, titulo),
                           'fetchedAt': HOY, 'confidence': 'alta', 'notes': nota, 'quote': cand[0][1], 'location': LOC})

fusionar('parametros', 'pension-minima-orfandad-familiares', nuevos_orf)
for i, antes, despues in corregidos:
    print(f'{i}: «{antes}» -> «{despues}»')
print('citas corregidas:', len(corregidos), '· cuantías añadidas:', len(nuevos_orf))
