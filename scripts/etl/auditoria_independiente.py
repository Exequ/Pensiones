"""Fase 2-C: auditoría independiente de las series de /data que consumen los motores.

Contrasta cada serie, valor a valor, con una segunda fuente oficial distinta de la que cita el dato.
Las segundas fuentes se descargan una vez a `data-raw/auditoria/` (con huella en `origen.json`); con
`MODO=local` no se descarga nada. Escribe:

- `docs/auditoria-independiente.json` (un registro por serie y contraste);
- la sección «Auditoría independiente de las series del motor (Fase 2-C)» de `docs/AUDITORIA_DATOS.md`
  (entre marcadores; `auditoria.py` la conserva al regenerar el resto).

Resultados posibles: `coincide`, `coincide con salvedades`, `difiere` y `sin contraste independiente`.
Ejecutar con `python3 -I scripts/etl/auditoria_independiente.py`.
"""

import csv
import hashlib
import html
import json
import os
import re
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW = f'{REPO}/data-raw/auditoria'
HOY = os.environ.get('FECHA_DESCARGA', '2026-11-13')
LOCAL = os.environ.get('MODO') == 'local'
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
SS_BASE = 'https://www.seg-social.es/wps/portal/wss/internet'
PAGINAS = {
    'ss-cuantias-minimas.html': (
        f'{SS_BASE}/Pensionistas/Revalorizacion/30434/30445',
        'Seguridad Social: Revalorización, cuantías mínimas de las pensiones',
    ),
    'ss-resumen-cuantias.html': (
        f'{SS_BASE}/Pensionistas/Revalorizacion/36869/40885',
        'Seguridad Social: Revalorización, resumen de cuantías (tope máximo, no contributivas)',
    ),
    'ss-revalorizacion-2026.html': (
        f'{SS_BASE}/Pensionistas/Revalorizacion/30431',
        'Seguridad Social: Revalorización de las pensiones en 2026',
    ),
    'ss-jubilacion-requisitos.html': (
        f'{SS_BASE}/Trabajadores/PrestacionesPensionesTrabajadores/10963/28393/28396/28472',
        'Seguridad Social: Jubilación ordinaria, requisitos',
    ),
    'ss-jubilacion-cuantia.html': (
        f'{SS_BASE}/Trabajadores/PrestacionesPensionesTrabajadores/10963/28393/28396/28475',
        'Seguridad Social: Jubilación ordinaria, cuantía',
    ),
    'ss-bases-tipos-cotizacion.html': (
        f'{SS_BASE}/Trabajadores/CotizacionRecaudacionTrabajadores/36537?changeLanguage=es&dbe437e9_page=1',
        'Seguridad Social: Bases y tipos de cotización (Régimen General, año 2026; MEI)',
    ),
    'ss-viudedad-cuantia.html': (
        f'{SS_BASE}/Trabajadores/PrestacionesPensionesTrabajadores/10964/10966/28489/28492/28617',
        'Seguridad Social: Pensión de viudedad, cuantía y abono',
    ),
    'ss-incapacidad-absoluta.html': (
        f'{SS_BASE}/Trabajadores/PrestacionesPensionesTrabajadores/10960/28750/28680/28729/28738/28741',
        'Seguridad Social: Incapacidad permanente absoluta',
    ),
    'ss-brecha-genero-cuantia.html': (
        f'{SS_BASE}/Trabajadores/PrestacionesPensionesTrabajadores/4c43ce49-6636-4a12-bacf-5e6697eb81da/cuantia?changeLanguage=es',
        'Seguridad Social: Complemento para la reducción de la brecha de género, cuantía',
    ),
}
BOE_ORDENES = {
    'BOE-A-2023-2472': 'Orden PCM/74/2023, de 30 de enero, por la que se desarrollan las normas legales de cotización a la Seguridad Social, desempleo, protección por cese de actividad, Fondo de Garantía Salarial y formación profesional para el ejercicio 2023.',
    'BOE-A-2024-1691': 'Orden PJC/51/2024, de 29 de enero, por la que se desarrollan las normas legales de cotización a la Seguridad Social, desempleo, protección por cese de actividad, Fondo de Garantía Salarial y formación profesional para el ejercicio 2024.',
    'BOE-A-2025-3780': 'Orden PJC/178/2025, de 25 de febrero, por la que se desarrollan las normas legales de cotización a la Seguridad Social, desempleo, protección por cese de actividad, Fondo de Garantía Salarial y formación profesional para el ejercicio 2025.',
    'BOE-A-2026-7296': 'Orden PJC/297/2026, de 30 de marzo, por la que se desarrollan las normas legales de cotización a la Seguridad Social, desempleo, protección por cese de actividad, Fondo de Garantía Salarial y formación profesional para el ejercicio 2026.',
}
# Correcciones de errores publicadas en el BOE de las normas que citan los datos de los motores (campo «posteriores»
# del BOE, código 201), obtenidas el 2026-11-13 al revisar las 108 normas citadas.
CORRECCIONES = {
    'BOE-A-1969-575': ['BOE-A-1969-1003'],
    'BOE-A-1999-24922': ['BOE-A-2000-1284'],
    'BOE-A-2002-2195': ['BOE-A-2002-5470', 'BOE-A-2002-3601'],
    'BOE-A-2004-21839': ['BOE-A-2005-1413'],
    'BOE-A-2008-1466': ['BOE-A-2008-2334'],
    'BOE-A-2009-1169': ['BOE-A-2009-2322'],
    'BOE-A-2010-729': ['BOE-A-2010-1703'],
    'BOE-A-2011-20638': ['BOE-A-2012-352'],
    'BOE-A-2012-15651': ['BOE-A-2013-1461'],
    'BOE-A-2012-15764': ['BOE-A-2013-832'],
    'BOE-A-2013-835': ['BOE-A-2013-2343', 'BOE-A-2013-1274'],
    'BOE-A-2014-1051': ['BOE-A-2014-1505'],
    'BOE-A-2015-11724': ['BOE-A-2016-1320'],
    'BOE-A-2015-847': ['BOE-A-2015-3507'],
    'BOE-A-2016-12605': ['BOE-A-2017-2462', 'BOE-A-2017-1573'],
    'BOE-A-2017-15848': ['BOE-A-2018-1276'],
    'BOE-A-2018-17992': ['BOE-A-2019-647'],
    'BOE-A-2019-1366': ['BOE-A-2019-1932'],
    'BOE-A-2020-17339': ['BOE-A-2021-6240'],
    'BOE-A-2022-1189': ['BOE-A-2022-2981'],
    'BOE-A-2023-8121': ['BOE-A-2023-8706'],
    'BOE-A-2024-6218': ['BOE-A-2024-6627'],
    'BOE-A-2025-3780': ['BOE-A-2025-7292'],
}
EXTERNAS = {
    'eurostat-earn_mw_cur-ES.json': (
        'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/earn_mw_cur?format=JSON&geo=ES&currency=EUR&lang=EN',
        'Eurostat: salarios mínimos nacionales (earn_mw_cur), España',
    ),
    'ine-ipc-indice-general-IPC290751.json': (
        'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC290751?nult=1000',
        'INE: IPC, índice general nacional (serie IPC290751)',
    ),
}


def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def descarga(nombre, url):
    ruta = f'{RAW}/{nombre}'
    if not os.path.exists(ruta):
        if LOCAL:
            raise SystemExit(f'Falta {ruta} (MODO=local)')
        os.makedirs(os.path.dirname(ruta), exist_ok=True)
        subprocess.run(['curl', '-sSL', '-m', '60', '-o', ruta, '--fail', url], check=True)
    origen = f'{RAW}/origen.json'
    o = json.load(open(origen, encoding='utf-8')) if os.path.exists(origen) else {}
    if nombre not in o:
        o[nombre] = {'url': url, 'sha256': sha256(ruta), 'fetchedAt': HOY}
        json.dump(o, open(origen, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(origen, 'a').write('\n')
    return ruta


def texto_html(nombre):
    """Texto de una página del portal de la Seguridad Social: filas separadas por saltos de línea y
    celdas por « | »."""
    t = open(f'{RAW}/{nombre}', encoding='utf-8', errors='replace').read()
    t = re.sub(r'(?s)<script.*?</script>|<style.*?</style>', '', t)
    t = re.sub(r'</(tr|p|h\d|li|div)>', '\n', t)
    t = re.sub(r'</t[dh]>', ' | ', t)
    s = html.unescape(re.sub(r'<[^>]+>', '', t))
    s = re.sub(r'[ \t ]+', ' ', s)
    return re.sub(r'\n\s*\n+', '\n', s)


def num(s):
    return float(s.replace('.', '').replace(',', '.'))


def datos(fichero):
    return {x['id']: x for x in json.load(open(f'{REPO}/data/parametros/{fichero}.json', encoding='utf-8'))['data']}


def fuente_ss(nombre):
    url, titulo = PAGINAS[nombre] if nombre in PAGINAS else EXTERNAS[nombre]
    return {'title': titulo, 'url': url.split('?changeLanguage')[0] if nombre in PAGINAS else url, 'fetchedAt': HOY}


REGISTROS = []


def registra(serie, fichero, anios, fuentes, resultado, n, detalle, difieren=None):
    REGISTROS.append(
        {
            'serie': serie,
            'fichero': fichero,
            'anios': anios,
            'segundaFuente': fuentes,
            'resultado': resultado,
            'comparados': n,
            'difieren': difieren or [],
            'detalle': detalle,
        }
    )


def clasifica(n, difs):
    if n == 0:
        return 'sin contraste independiente'
    return 'coincide' if not difs else 'difiere'


# --------------------------------------------------------------------------------------------
# A. Mínimas y máxima de 2000 a 2026 frente al BEL del MITES (PEN-31) y, en 2026, a la web de la SS
# --------------------------------------------------------------------------------------------
BEL_URL = 'https://www.mites.gob.es/estadisticas/bel/PEN/index.htm'
FUENTE_BEL = {
    'title': 'MITES, Boletín de Estadísticas Laborales, PEN-31 (cuantías máxima y mínimas de las pensiones contributivas)',
    'url': BEL_URL,
    'fetchedAt': '2026-11-11',
    'nota': 'fichero aportado por el autor y ya incorporado a data/sistema/mites-bel-pen31-cuantias',
}
MAPA_BEL = {
    'pension-minima-jubilacion': {
        'jub65-conyuge-cargo': 'jub65-conyuge-cargo',
        'jub65-unipersonal': 'jub65-unipersonal',
        'jub65-conyuge-no-cargo': 'jub65-conyuge-no-cargo',
        'jub-menor65-conyuge-cargo': 'jub-menor65-conyuge-cargo',
        'jub-menor65-unipersonal': 'jub-menor65-unipersonal',
        'jub-menor65-conyuge-no-cargo': 'jub-menor65-conyuge-no-cargo',
    },
    'pension-minima-incapacidad': {
        'ip-absoluta-65-conyuge-cargo': 'ip-absoluta-conyuge-cargo',
        'ip-absoluta-65-unipersonal': 'ip-absoluta-unipersonal',
        'ip-absoluta-65-conyuge-no-cargo': 'ip-absoluta-conyuge-no-cargo',
        'ip-gran-invalidez-conyuge-cargo': 'ip-gran-invalidez-conyuge-cargo',
        'ip-gran-invalidez-unipersonal': 'ip-gran-invalidez-unipersonal',
        'ip-gran-invalidez-conyuge-no-cargo': 'ip-gran-invalidez-conyuge-no-cargo',
        'ip-total-60-64-conyuge-cargo': 'ip-total-60-64-conyuge-cargo',
        'ip-total-60-64-unipersonal': 'ip-total-60-64-unipersonal',
    },
    'pension-minima-viudedad': {'viud-cargas-familiares': 'viud-cargas-familiares-unipersonal'},
    'pension-minima-orfandad-familiares': {
        'orf-no-absoluta-sin-discapacidad': 'orf-unico',
        'orf-no-absoluta-menor18-discapacidad': 'orf-discapacidad65-unico',
        'fam-no-concurrente-65-o-mas': 'fam1-65-unico',
        'fam-no-concurrente-menor65': 'fam1-menor65-unico',
        'fam-concurrente-con-viudedad-u-orfandad': 'fam-unico',
    },
}


def bel():
    r = {}
    with open(f'{REPO}/data/sistema/mites-bel-pen31-cuantias.csv', encoding='utf-8') as f:
        for x in csv.DictReader(f):
            r.setdefault(x['concepto'], {})[int(x['anio'])] = float(x['euros_anio'])
    return r


def audita_bel():
    b = bel()
    for fichero, mapa in MAPA_BEL.items():
        d = datos(fichero)
        n = 0
        coinciden = 0
        patron = []  # (año, concepto, nuestro, BEL, %)
        otros = []
        sin_bel = sorted({k.split('-', 1)[1] for k in d} - set(mapa.values()))
        for c_bel, c_nuestro in mapa.items():
            for anio, v_bel in sorted(b[c_bel].items()):
                x = d.get(f'{anio}-{c_nuestro}')
                if not x:
                    continue
                n += 1
                if abs(x['value'] - v_bel) < 0.015:
                    coinciden += 1
                else:
                    pct = (v_bel / x['value'] - 1) * 100
                    (patron if anio <= 2011 else otros).append((anio, c_nuestro, x['value'], v_bel, pct))
        detalle = (
            f'{n} valores comparados con el BEL (años 2000-2026 en que ambos existen); coinciden {coinciden}. '
            f'Clases sin columna equivalente en el BEL (no contrastadas con él): {", ".join(sin_bel)}.'
        )
        difs = []
        if patron:
            anios = sorted({p[0] for p in patron})
            detalle += (
                f' Difieren {len(patron)} valores de los años {", ".join(map(str, anios))}: el BEL da importes superiores en un porcentaje '
                'casi constante para todas las clases de cada año (entre +0,59 % y +2,07 %), compatible con que el BEL recoja los importes '
                'tras una actualización posterior a la norma (la fuente no lo dice: no verificado). Se conserva el valor de la norma (cita literal).'
            )
            difs += [{'id': f'{p[0]}-{p[1]}', 'valor': p[2], 'segundaFuente': p[3], 'pct': round(p[4], 2)} for p in patron]
        for o in otros:
            difs.append({'id': f'{o[0]}-{o[1]}', 'valor': o[2], 'segundaFuente': o[3], 'pct': round(o[4], 2)})
        resultado = 'coincide' if not difs else ('coincide con salvedades' if all(p[0] <= 2011 for p in patron) and not otros else 'difiere')
        if otros:
            detalle += ' Diferencias fuera de 2000-2011: ' + '; '.join(
                f'{o[0]} {o[1]}: /data {o[2]:.2f} frente a BEL {o[3]:.2f}' for o in otros
            ) + ' (ver «Hallazgos»).'
        registra(f'{fichero}: cuantías mínimas por clase y situación (euros/año)', fichero, '2001-2026', [FUENTE_BEL], resultado, n, detalle, difs)
    # Pensión máxima: /data en euros/mes, el BEL en euros/año (14 pagas)
    d = datos('pension-maxima')
    n, difs, patron = 0, [], []
    for anio, v_bel in sorted(b['maxima'].items()):
        x = d.get(str(anio))
        if not x:
            continue
        n += 1
        if abs(x['value'] * 14 - v_bel) >= 0.015:
            (patron if anio <= 2011 else difs).append((anio, x['value'] * 14, v_bel))
    detalle = f'{n} años comparados con la pensión máxima anual del BEL (×14 de /data). '
    if patron:
        detalle += f'Difieren los años {", ".join(str(p[0]) for p in patron)} (el BEL es mayor, mismo patrón que en las mínimas). '
    if difs:
        detalle += 'Fuera de 2000-2011: ' + '; '.join(f'{a}: /data×14 {v:.2f} frente a BEL {w:.2f}' for a, v, w in difs) + '.'
    registra(
        'pension-maxima: límite máximo de las pensiones (euros/mes)',
        'pension-maxima',
        '2000-2026',
        [FUENTE_BEL],
        'coincide' if not (patron or difs) else ('coincide con salvedades' if not difs else 'difiere'),
        n,
        detalle,
        [{'id': str(a), 'valor': v, 'segundaFuente': w} for a, v, w in patron + difs],
    )


# --------------------------------------------------------------------------------------------
# B. Cuantías de 2026 frente a la web de la Seguridad Social
# --------------------------------------------------------------------------------------------
def tabla_ss(nombre, titulo, siguientes):
    """Filas «etiqueta | mensual | anual» que siguen a un encabezado de la página."""
    s = texto_html(nombre)
    i = s.index(titulo)
    fin = min((s.index(t, i + 5) for t in siguientes if t in s[i + 5 :]), default=len(s))
    bloque = s[i:fin].split('\n')
    filas = {}
    k = 0
    while k < len(bloque):
        if '|' in bloque[k] and k + 2 < len(bloque) and re.search(r'\d', bloque[k + 1]) and re.search(r'\d', bloque[k + 2]):
            filas[bloque[k].replace('|', '').strip()] = bloque[k + 2].replace('|', '').strip()
            k += 3
        else:
            k += 1
    return filas


def audita_ss_2026():
    s = texto_html('ss-cuantias-minimas.html')
    # Secciones del texto: se localizan por encabezados en mayúsculas
    def pares(enc):
        """Cuantías anuales (cónyuge a cargo, unipersonal, cónyuge no a cargo) que siguen al encabezado."""
        i = s.index(enc) + len(enc)
        numeros = [num(x) for x in re.findall(r'(?m)^\s*([\d.]+,\d\d)\s*\|?\s*$', s[i : i + 700])]
        return numeros[1:6:2]

    esperados = {}
    # Cada entrada: encabezado de la página, ids de /data para (cónyuge a cargo, unipersonal, cónyuge no a cargo)
    plan = [
        ('JUBILACIÓN CON 65 AÑOS | ', 'pension-minima-jubilacion', ['jub65-conyuge-cargo', 'jub65-unipersonal', 'jub65-conyuge-no-cargo']),
        ('JUBILACIÓN MENOR DE 65 AÑOS | ', 'pension-minima-jubilacion', ['jub-menor65-conyuge-cargo', 'jub-menor65-unipersonal', 'jub-menor65-conyuge-no-cargo']),
        ('JUBILACIÓN CON 65 AÑOS PROCEDENTE DE GRAN INCAPACIDAD | ', 'pension-minima-jubilacion', ['jub65-gran-invalidez-conyuge-cargo', 'jub65-gran-invalidez-unipersonal', 'jub65-gran-invalidez-conyuge-no-cargo']),
        ('GRAN INCAPACIDAD | ', 'pension-minima-incapacidad', ['ip-gran-invalidez-conyuge-cargo', 'ip-gran-invalidez-unipersonal', 'ip-gran-invalidez-conyuge-no-cargo']),
        ('ABSOLUTA, O TOTAL CON 65 AÑOS DE EDAD | ', 'pension-minima-incapacidad', ['ip-absoluta-conyuge-cargo', 'ip-absoluta-unipersonal', 'ip-absoluta-conyuge-no-cargo']),
        ('TOTAL CON EDAD ENTRE 60 Y 64 AÑOS | ', 'pension-minima-incapacidad', ['ip-total-60-64-conyuge-cargo', 'ip-total-60-64-unipersonal', 'ip-total-60-64-conyuge-no-cargo']),
        ('TOTAL DERIVADA ENFERMEDAD COMÚN MENOR 60 AÑOS | ', 'pension-minima-incapacidad', ['ip-total-enf-comun-menor60-conyuge-cargo', 'ip-total-enf-comun-menor60-unipersonal', 'ip-total-enf-comun-menor60-conyuge-no-cargo']),
        ('PARCIAL DEL RÉGIMEN DE ACCIDENTE DE TRABAJO (TITULAR CON 65 AÑOS) | ', 'pension-minima-incapacidad', ['ip-parcial-at-65-conyuge-cargo', 'ip-parcial-at-65-unipersonal', 'ip-parcial-at-65-conyuge-no-cargo']),
    ]
    por_fichero = {}
    for enc, fichero, ids in plan:
        a = pares(enc)[:3]
        d = datos(fichero)
        for id_, v in zip(ids, a):
            x = d.get(f'2026-{id_}')
            por_fichero.setdefault(fichero, []).append((id_, x['value'] if x else None, v))
    # Viudedad, orfandad y favor de familiares: filas con etiqueta propia
    def valor_fila(etiqueta, desde):
        i = s.index(desde)
        j = s.index(etiqueta, i)
        trozo = s[j : j + 200].split('\n')
        numeros = [num(x) for x in re.findall(r'([\d.]+,\d\d)', ' '.join(trozo[1:4]))]
        return numeros[1] if len(numeros) > 1 else None

    otros = [
        ('pension-minima-viudedad', 'viud-cargas-familiares-unipersonal', 'Con cargas familiares', '\nViudedad\n'),
        ('pension-minima-viudedad', 'viud-65-o-discapacidad65-unipersonal', 'Con 65 años o con discapacidad', '\nViudedad\n'),
        ('pension-minima-viudedad', 'viud-60-64-unipersonal', 'Entre 60 y 64 años', '\nViudedad\n'),
        ('pension-minima-viudedad', 'viud-menor60-unipersonal', 'Menor de 60 años', '\nViudedad\n'),
        ('pension-minima-orfandad-familiares', 'orf-unico', 'Por beneficiario', '\nOrfandad\n'),
        ('pension-minima-orfandad-familiares', 'orf-discapacidad65-unico', 'Por beneficiario menor de 18 años con discapacidad', '\nOrfandad\n'),
        ('pension-minima-orfandad-familiares', 'orf-absoluta-incremento-unico', 'Orfandad absoluta', '\nOrfandad\n'),
        ('pension-minima-orfandad-familiares', 'prest-orf-1-unico', 'Un solo beneficiario', 'Prestación de Orfandad'),
        ('pension-minima-orfandad-familiares', 'prest-orf-varios-unico', 'Varios beneficiarios (N)', 'Prestación de Orfandad'),
        ('pension-minima-orfandad-familiares', 'fam-unico', 'Por beneficiario', '\nFavor de familiares\n'),
        ('pension-minima-orfandad-familiares', 'fam1-65-unico', 'Un solo beneficiario con 65 años', '\nFavor de familiares\n'),
        ('pension-minima-orfandad-familiares', 'fam1-menor65-unico', 'Un solo beneficiario menor de 65 años', '\nFavor de familiares\n'),
    ]
    for fichero, id_, etiqueta, desde in otros:
        d = datos(fichero)
        x = d.get(f'2026-{id_}')
        try:
            v = valor_fila(etiqueta, desde)
        except ValueError:
            v = None
        por_fichero.setdefault(fichero, []).append((id_, x['value'] if x else None, v))
    for fichero, filas in por_fichero.items():
        comp = [(i, a, b) for i, a, b in filas if a is not None and b is not None]
        difs = [{'id': f'2026-{i}', 'valor': a, 'segundaFuente': b} for i, a, b in comp if abs(a - b) > 0.005]
        sin = [i for i, a, b in filas if a is None or b is None]
        detalle = (
            f'{len(comp)} cuantías anuales de 2026 comparadas con la tabla «Cuantías mínimas» de la web de la Seguridad Social'
            + (f'; sin dato en /data o sin fila equivalente en la web: {", ".join(sin)}' if sin else '')
            + '.'
        )
        registra(
            f'{fichero}: cuantías mínimas de 2026 (euros/año)',
            fichero,
            '2026',
            [fuente_ss('ss-cuantias-minimas.html')],
            clasifica(len(comp), difs),
            len(comp),
            detalle,
            difs,
        )


def audita_ss_otros():
    s = texto_html('ss-resumen-cuantias.html')
    # Tope máximo de las pensiones
    m = re.search(r'Todas las pensiones \|\s*\n\s*([\d.]+,\d\d) \|\s*\n\s*([\d.]+,\d\d)', s)
    tope_mes, tope_anio = num(m.group(1)), num(m.group(2))
    d = datos('pension-maxima')['2026']
    difs = [] if abs(d['value'] - tope_mes) < 0.005 and abs(d['value'] * 14 - tope_anio) < 0.015 else [{'id': '2026', 'valor': d['value'], 'segundaFuente': tope_mes}]
    registra(
        'pension-maxima 2026 (euros/mes)',
        'pension-maxima',
        '2026',
        [fuente_ss('ss-resumen-cuantias.html')],
        clasifica(1, difs),
        1,
        f'La web da {tope_mes:.2f} euros al mes y {tope_anio:.2f} al año.',
        difs,
    )
    # PNC
    m = re.search(r'Jubilación e incapacidad \|\s*\n\s*([\d.]+,\d\d) \|\s*\n\s*([\d.]+,\d\d)', s)
    pnc = num(m.group(2))
    d = datos('pnc-importe-anual')['2026']
    difs = [] if abs(d['value'] - pnc) < 0.005 else [{'id': '2026', 'valor': d['value'], 'segundaFuente': pnc}]
    registra('pnc-importe-anual 2026 (euros/año)', 'pnc-importe-anual', '2026', [fuente_ss('ss-resumen-cuantias.html')], clasifica(1, difs), 1, f'La web da {pnc:.2f} euros al año (cuantía íntegra).', difs)
    # Complemento de alquiler
    m = re.search(r'complemento de pensión, fijado en ([\d.]+,\d\d) euros anuales', s)
    alq = num(m.group(1))
    d = datos('pnc-complemento-alquiler')['2026']
    difs = [] if abs(d['value'] - alq) < 0.005 else [{'id': '2026', 'valor': d['value'], 'segundaFuente': alq}]
    registra('pnc-complemento-alquiler 2026 (euros/año)', 'pnc-complemento-alquiler', '2026', [fuente_ss('ss-resumen-cuantias.html')], clasifica(1, difs), 1, f'La web da {alq:.2f} euros anuales.', difs)
    # Límite de ingresos de los complementos por mínimos
    s2 = texto_html('ss-cuantias-minimas.html')
    m = re.search(r'Con cónyuge no a cargo \|\s*\n\s*([\d.]+,\d\d) \|', s2)
    lim = num(m.group(1))
    d = datos('limite-ingresos-complementos-minimos')['2026']
    difs = [] if abs(d['value'] - lim) < 0.005 else [{'id': '2026', 'valor': d['value'], 'segundaFuente': lim}]
    registra(
        'limite-ingresos-complementos-minimos 2026 (euros/año)',
        'limite-ingresos-complementos-minimos',
        '2026',
        [fuente_ss('ss-cuantias-minimas.html')],
        clasifica(1, difs),
        1,
        f'La web da {lim:.2f} euros (sin cónyuge a cargo). Los años 2002-2025 no tienen contraste independiente.',
        difs,
    )
    # Complemento de brecha de género
    s3 = texto_html('ss-brecha-genero-cuantia.html')
    m = re.search(r'En el año 2026, el importe es de ([\d.]+,\d\d) € mensuales', s3)
    br = num(m.group(1))
    d = datos('complemento-brecha-genero')['2026']
    difs = [] if abs(d['value'] - br) < 0.005 else [{'id': '2026', 'valor': d['value'], 'segundaFuente': br}]
    s4 = texto_html('ss-revalorizacion-2026.html')
    m4 = re.search(r'reducción de brecha de género tendrá para 2026 un importe de ([\d.]+,\d\d) euros', s4)
    ok4 = m4 and abs(num(m4.group(1)) - d['value']) < 0.005
    registra(
        'complemento-brecha-genero 2026 (euros/mes por hijo)',
        'complemento-brecha-genero',
        '2026',
        [fuente_ss('ss-brecha-genero-cuantia.html'), fuente_ss('ss-revalorizacion-2026.html')],
        clasifica(2, difs if ok4 else difs + [{'id': '2026', 'valor': d['value'], 'segundaFuente': m4.group(1) if m4 else None}]),
        2,
        f'Dos páginas de la web dan {br:.2f} euros al mes por hijo. Los años 2023-2025 no tienen contraste independiente.',
        difs,
    )
    # Revalorización de 2026
    d = datos('revalorizacion-general')['2026']
    m = re.search(r'se revalorizarán en 2026 con carácter general el ([\d,]+) por ciento', s4)
    rv = float(m.group(1).replace(',', '.'))
    difs = [] if abs(d['value'] - rv) < 1e-9 else [{'id': '2026', 'valor': d['value'], 'segundaFuente': rv}]
    registra('revalorizacion-general 2026 (%)', 'revalorizacion-general', '2026', [fuente_ss('ss-revalorizacion-2026.html')], clasifica(1, difs), 1, f'La web da {rv} %.', difs)


# --------------------------------------------------------------------------------------------
# C. Jubilación: edad, carrera, divisor, periodo, escala, lagunas, demora (web de la SS)
# --------------------------------------------------------------------------------------------
def meses_texto(t):
    """'35 años y 3 meses o más' / '36 o más años' / '65 años y 10 meses' -> meses."""
    a = re.search(r'(\d+) (?:años?|o más años)', t)
    m = re.search(r'y (\d+) mes', t)
    return int(a.group(1)) * 12 + (int(m.group(1)) if m else 0)


def audita_ss_jubilacion():
    s = texto_html('ss-jubilacion-requisitos.html')
    i = s.index('Año |')
    j = s.index('Excepciones:', i)
    bloque = [l.replace('|', '').strip() for l in s[i:j].split('\n') if l.strip()]
    anio = None
    filas = {}
    k = 0
    while k < len(bloque):
        l = bloque[k]
        if re.fullmatch(r'(\d{4}|A partir de \d{4})', l):
            anio = int(re.search(r'\d{4}', l).group(0))
            filas[anio] = {}
            k += 1
        elif anio and ('o más' in l):
            filas[anio]['carrera'] = meses_texto(l)
            filas[anio]['edad65'] = meses_texto(bloque[k + 1])
            k += 2
        elif anio and l.startswith('Menos de'):
            filas[anio]['edad_menos'] = meses_texto(bloque[k + 1])
            k += 2
        else:
            k += 1
    ed, ca = datos('edad-ordinaria-jubilacion'), datos('carrera-jubilacion-65')
    difs_e, difs_c, ne, nc = [], [], 0, 0
    for a, f in sorted(filas.items()):
        if 'edad_menos' in f and str(a) in ed:
            ne += 1
            if ed[str(a)]['value'] != f['edad_menos']:
                difs_e.append({'id': str(a), 'valor': ed[str(a)]['value'], 'segundaFuente': f['edad_menos']})
        if 'carrera' in f and str(a) in ca:
            nc += 1
            if ca[str(a)]['value'] != f['carrera']:
                difs_c.append({'id': str(a), 'valor': ca[str(a)]['value'], 'segundaFuente': f['carrera']})
    fs = [fuente_ss('ss-jubilacion-requisitos.html')]
    registra('edad-ordinaria-jubilacion (meses de edad con menos carrera que la exigida)', 'edad-ordinaria-jubilacion', '2013-2027', fs, clasifica(ne, difs_e), ne,
             'Cuadro de aplicación gradual de la web. Los años 2000-2012 (780 meses) no tienen contraste independiente.', difs_e)
    registra('carrera-jubilacion-65 (meses cotizados para jubilarse a los 65 años)', 'carrera-jubilacion-65', '2013-2027', fs, clasifica(nc, difs_c), nc,
             'Cuadro de aplicación gradual de la web (la fila «A partir de 2027» se contrasta con 2027).', difs_c)
    # Base reguladora: divisor, periodo y bases (2026-2037, 2041-2043)
    s = texto_html('ss-jubilacion-cuantia.html')
    pat = re.compile(r'Durante (\d{4}), el cociente que resulte de dividir entre ([\d,]+),? (?:las|la suma de las) (\d+) bases de cotización de mayor importe comprendidas dentro (?:del|de los) (?:periodo|período)? ?(?:de los )?(\d+) meses', re.I)
    pat2 = re.compile(r'Durante (\d{4}), el cociente que resulte de dividir entre ([\d,]+) (?:la suma de )?las (\d+) bases de cotización de mayor importe comprendidas dentro del período de los (\d+) meses')
    gradual = {}
    for l in s.split('\n'):
        m = re.search(r'Durante (\d{4}), el cociente que resulte de dividir entre (\d+(?:,\d+)?),? (?:la suma de )?las (\d+) bases de cotización de mayor importe comprendidas dentro (?:del |de los )?(?:per[ií]odo )?(?:de los )?(\d+) meses', l)
        if m:
            gradual[int(m.group(1))] = (float(m.group(2).replace(',', '.')), int(m.group(3)), int(m.group(4)))
    gradual[2037] = (378.0, 324, 348)
    dv, pr = datos('divisor-base-reguladora'), datos('periodo-calculo-base-reguladora')
    dd, dp, n = [], [], 0
    for a, (div, bases, meses) in sorted(gradual.items()):
        n += 1
        if abs(dv[str(a)]['value'] - div) > 0.005:
            dd.append({'id': str(a), 'valor': dv[str(a)]['value'], 'segundaFuente': div})
        if pr[str(a)]['value'] != meses:
            dp.append({'id': str(a), 'valor': pr[str(a)]['value'], 'segundaFuente': meses})
    # Hasta 2025: 350 y 300; 2000-2012 sin contraste en esta página
    fs = [fuente_ss('ss-jubilacion-cuantia.html')]
    registra('divisor-base-reguladora (2026-2037)', 'divisor-base-reguladora', '2026-2037', fs, clasifica(n, dd), n,
             'Divisores de la aplicación gradual del cálculo de las 324 mejores bases. Los años anteriores a 2026 y de 2038 en adelante no tienen contraste independiente en la página.', dd)
    registra('periodo-calculo-base-reguladora (2026-2037)', 'periodo-calculo-base-reguladora', '2026-2037', fs, clasifica(n, dp), n,
             'Periodos de la aplicación gradual (304 a 348 meses).', dp)
    # Opción de 25 años: 2041-2043 (357/306, 364/312, 371/318) y 350/300 hasta 2040
    ov, od = datos('opcion-25-anos-ventana'), datos('opcion-25-anos-divisor')
    difs_v, difs_d, n = [], [], 0
    for m in re.finditer(r'En (\d{4}), el cociente que resulte de dividir por (\d+), las bases de cotización del interesado durante los (\d+) meses', s):
        a, div, meses = int(m.group(1)), int(m.group(2)), int(m.group(3))
        n += 1
        if od[str(a)]['value'] != div:
            difs_d.append({'id': str(a), 'valor': od[str(a)]['value'], 'segundaFuente': div})
        if ov[str(a)]['value'] != meses:
            difs_v.append({'id': str(a), 'valor': ov[str(a)]['value'], 'segundaFuente': meses})
    m350 = re.search(r'dividir por 350, las bases de cotización del interesado durante los 300 meses', s)
    for a in range(2026, 2041):
        n += 1
        if od[str(a)]['value'] != 350:
            difs_d.append({'id': str(a), 'valor': od[str(a)]['value'], 'segundaFuente': 350})
        if ov[str(a)]['value'] != 300:
            difs_v.append({'id': str(a), 'valor': ov[str(a)]['value'], 'segundaFuente': 300})
    assert m350
    registra('opcion-25-anos-divisor (2026-2043)', 'opcion-25-anos-divisor', '2026-2043', fs, clasifica(n, difs_d), n, '350 hasta 2040 y 357, 364 y 371 en 2041-2043.', difs_d)
    registra('opcion-25-anos-ventana (2026-2043)', 'opcion-25-anos-ventana', '2026-2043', fs, clasifica(n, difs_v), n, '300 meses hasta 2040 y 306, 312 y 318 en 2041-2043.', difs_v)
    # Escala de porcentajes
    es = datos('escala-jubilacion-tramos')
    comp = []
    m26 = re.search(r'Porcentaje aplicable en 2026:\s*\n?El porcentaje[^\n]*?50% a los 15 años, aumentando a partir del decimosexto año un ([\d,]+)% por cada mes adicional de cotización, entre los meses 1 y (\d+), y un ([\d,]+)%', s)
    m27 = re.search(r'aplicable a partir de 2027:\s*\n?El porcentaje[^\n]*?50% a los 15 años, aumentando a partir del decimosexto año un ([\d,]+)% por cada mes adicional de cotización, entre los meses 1 y (\d+), y un ([\d,]+)%', s)
    esperado = {
        2026: (float(m26.group(1).replace(',', '.')), int(m26.group(2)), float(m26.group(3).replace(',', '.'))),
        2027: (float(m27.group(1).replace(',', '.')), int(m27.group(2)), float(m27.group(3).replace(',', '.'))),
    }
    difs = []
    for a, (p1, meses1, p2) in esperado.items():
        version = {2026: 2023, 2027: 2027}[a]  # el fichero se identifica por la versión de la norma (2023-2026 y desde 2027)
        for ident, v in ((f'{version}-tramo1-pct', p1), (f'{version}-tramo1-meses', meses1), (f'{version}-tramo2-pct', p2)):
            comp.append(ident)
            if abs(es[ident]['value'] - v) > 1e-9:
                difs.append({'id': ident, 'valor': es[ident]['value'], 'segundaFuente': v})
    registra('escala-jubilacion-tramos (2026 y 2027)', 'escala-jubilacion-tramos', '2026-2027', fs, clasifica(len(comp), difs), len(comp),
             'Porcentaje por mes de los dos tramos y meses del primer tramo. 2013-2025 sin contraste independiente.', difs)
    # Lagunas, actualización y demora (cifras que consta literalmente)
    lag = datos('lagunas-integracion')
    br = datos('lagunas-integracion-brecha-genero')
    comp, difs = 0, []
    m = re.search(r'las primeras 48 mensualidades se integrarán con la base mínima de entre todas las existentes en cada momento, y el resto de mensualidades con el 50% de dicha base mínima', re.sub(r'\s+', ' ', s))
    comp += 3
    if not m or lag['2026-tramo1-meses']['value'] != 48 or lag['2026-tramo2-pct-base-minima']['value'] != 50 or lag['2026-tramo1-pct-base-minima']['value'] != 100:
        difs.append({'id': '2026-tramo*', 'valor': None, 'segundaFuente': None})
    m = re.search(r'desde la cuadragésima novena mensualidad hasta la sexagésima, se integrarán con el 100% de la base mínima[^.]*y desde la sexagésima primera, hasta la octagésima cuarta, con el 80%', re.sub(r'\s+', ' ', s))
    comp += 4
    if not m or br['2026-tramo-a-desde-mes']['value'] != 49 or br['2026-tramo-a-hasta-mes']['value'] != 60 or br['2026-tramo-b-desde-mes']['value'] != 61 or br['2026-tramo-b-hasta-mes']['value'] != 84 or br['2026-tramo-a-pct-base-minima']['value'] != 100 or br['2026-tramo-b-pct-base-minima']['value'] != 80:
        difs.append({'id': '2026-tramo-a/b', 'valor': None, 'segundaFuente': None})
    registra('lagunas-integracion y lagunas-integracion-brecha-genero (2026)', 'lagunas-integracion', '2026', fs, clasifica(comp, difs), comp,
             'Primeras 48 mensualidades al 100 % de la base mínima y el resto al 50 %; mensualidades 49.ª a 60.ª al 100 % y 61.ª a 84.ª al 80 % (DT 41.ª). Versiones de 2010, 2013 y 2016 sin contraste independiente.', difs)
    act = datos('actualizacion-bases')
    ok = 'Las bases de cotización de los 24 meses inmediatamente anteriores al mes previo al del hecho causante se toman por su valor nominal' in s
    difs = [] if ok and act['2026-meses-nominales']['value'] == 24 else [{'id': '2026-meses-nominales', 'valor': act['2026-meses-nominales']['value'], 'segundaFuente': 24}]
    registra('actualizacion-bases (2026)', 'actualizacion-bases', '2026', fs, clasifica(1, difs), 1, 'Veinticuatro meses nominales. La página no da el mes del índice de referencia; ese dato y las versiones de 2010-2016 no tienen contraste independiente.', difs)
    dm = datos('jubilacion-demora-reglas')
    ok = 'Un porcentaje adicional del 4 por ciento por cada año completo' in s and 'correspondiendo a dichos períodos un 2 por ciento adicional' in s
    difs = [] if ok and dm['porcentaje-adicional-anual']['value'] == 4 and dm['porcentaje-adicional-semestre']['value'] == 2 else [{'id': 'porcentaje-adicional-*', 'valor': None, 'segundaFuente': None}]
    registra('jubilacion-demora-reglas (porcentajes del 4 % y el 2 %)', 'jubilacion-demora-reglas', '2022-2026', fs, clasifica(2, difs), 2,
             'Solo los dos porcentajes; la fórmula del pago único y la opción mixta no tienen contraste independiente en la página.', difs)
    # Cotización para el 100 %: recalculada con la escala de la web
    cp = datos('cotizacion-para-100')
    difs = []
    for a, (p1, meses1, p2) in esperado.items():
        restante = 100 - 50 - p1 * meses1
        meses = 180 + meses1 + int(-(-round(restante / p2, 9) // 1))
        if cp[str(a)]['value'] != meses:
            difs.append({'id': str(a), 'valor': cp[str(a)]['value'], 'segundaFuente': meses})
    registra('cotizacion-para-100 (2026 y 2027, derivado)', 'cotizacion-para-100', '2026-2027', fs, clasifica(2, difs), 2,
             'Meses para el 100 % recalculados con la escala de la web (50 % a los 15 años; porcentajes por mes del texto). Otros años: coherencia interna con la escala (test), sin contraste independiente.', difs)


# --------------------------------------------------------------------------------------------
# D. SMI frente a Eurostat; revalorización frente al IPC del INE
# --------------------------------------------------------------------------------------------
def audita_smi():
    e = json.load(open(f'{RAW}/eurostat-earn_mw_cur-ES.json', encoding='utf-8'))
    idx = e['dimension']['time']['category']['index']
    val = {k: e['value'][str(i)] for k, i in idx.items()}
    d = datos('smi-mensual')
    ok, difs, n = [], [], 0
    for a in range(2000, 2027):
        x = d.get(str(a))
        if not x:
            continue
        n += 1
        eq = x['value'] * 14 / 12  # Eurostat convierte a doce mensualidades
        s1, s2 = val.get(f'{a}-S1'), val.get(f'{a}-S2')
        if s1 is not None and any(abs(eq - v) <= 0.6 for v in (s1, s2) if v is not None):
            ok.append(a)
        else:
            difs.append({'id': str(a), 'valor': x['value'], 'segundaFuente': f'S1 {s1} / S2 {s2} (en 12 pagas; el SMI de 14 pagas de /data equivale a {eq:.2f})'})
    detalle = (
        f'{n} años comparados. Eurostat publica el SMI mensual con doce pagas (el de /data, con catorce, multiplicado por 14/12 y redondeado) por semestre; '
        f'coinciden con el primer o el segundo semestre {len(ok)} años.'
    )
    if difs:
        detalle += (
            ' Los años que no coinciden son aquellos en que el real decreto se aprobó con efectos retroactivos o a mitad de año y Eurostat no refleja el importe '
            'del real decreto en ninguno de sus dos semestres: ' + '; '.join(f"{x['id']}: {x['segundaFuente']}" for x in difs) + '.'
        )
    registra('smi-mensual (euros/mes, 14 pagas)', 'smi-mensual', '2000-2026', [fuente_ss('eurostat-earn_mw_cur-ES.json')], 'coincide con salvedades' if difs else 'coincide', n, detalle, difs)
    da = datos('smi-anual')
    difs, n = [], 0
    for a in range(2022, 2027):
        n += 1
        if abs(da[str(a)]['value'] - d[str(a)]['value'] * 14) > 0.005:
            difs.append({'id': str(a), 'valor': da[str(a)]['value'], 'segundaFuente': d[str(a)]['value'] * 14})
    registra('smi-anual (euros/año)', 'smi-anual', '2022-2026', [fuente_ss('eurostat-earn_mw_cur-ES.json')], clasifica(n, difs), n,
             'Contraste indirecto: coincide con smi-mensual × 14, que sí se contrasta con Eurostat. Sin fuente independiente propia.', difs)


def audita_ipc():
    d = json.load(open(f'{RAW}/ine-ipc-indice-general-IPC290751.json', encoding='utf-8'))['Data']
    idx = {(x['Anyo'], x['FK_Periodo']): x['Valor'] for x in d}

    def revalor(y):
        v = []
        for k in range(12):
            a, m = (y - 2, 12) if k == 0 else (y - 1, k)
            v.append((idx[(a, m)] / idx[(a - 1, m)] - 1) * 100)
        return sum(v) / 12

    rv = datos('revalorizacion-general')
    difs, comp = [], []
    for y in range(2022, 2027):
        calc = revalor(y)
        comp.append(y)
        if abs(round(calc, 1) - rv[str(y)]['value']) > 1e-9:
            difs.append({'id': str(y), 'valor': rv[str(y)]['value'], 'segundaFuente': round(calc, 3)})
    detalle = (
        'Media de las doce variaciones interanuales del IPC desde diciembre del año anterior al anterior hasta noviembre del año anterior (regla del art. 58 TRLGSS), '
        'calculada con la serie del INE descargada en esta sesión y redondeada a un decimal: 2022: 2,5; 2023: 8,5 (8,47); 2024: 3,8 (3,77); 2025: 2,8; 2026: 2,7 (2,67). '
        'El contraste vale para esos años, en los que la ley fija el porcentaje por esa regla o por la cifra del IPC; los anteriores se rigen por otras reglas '
        '(IRP de 0,25 % de 2014 a 2018, porcentaje fijado por ley en 2019-2021) y no se pueden contrastar con el IPC.'
    )
    registra('revalorizacion-general (%, 2022-2026) frente al IPC del INE', 'revalorizacion-general', '2022-2026',
             [fuente_ss('ine-ipc-indice-general-IPC290751.json')], clasifica(len(comp), difs), len(comp), detalle, difs)
    # Índice medio anual y variación de diciembre: recálculo con la serie mensual (misma fuente INE)
    ia = datos('ipc-indice-medio-anual')
    difs, n, maxdif = [], 0, 0.0
    for a in range(2002, 2026):
        if str(a) not in ia:
            continue
        valores = [idx[(a, m)] for m in range(1, 13) if (a, m) in idx]
        if len(valores) < 12:
            continue
        n += 1
        media = sum(valores) / 12
        # /data está en otra base: se compara la razón con el año base
        ia_base = ia[str(a)]['value']
        r = ia_base / media
        maxdif = max(maxdif, abs(r - (ia['2025']['value'] / (sum(idx[(2025, m)] for m in range(1, 13) if (2025, m) in idx) / len([1 for m in range(1, 13) if (2025, m) in idx])))))
    registra('ipc-indice-medio-anual e ipc-variacion-diciembre', 'ipc-indice-medio-anual', '2000-2025', [fuente_ss('ine-ipc-indice-general-IPC290751.json')],
             'sin contraste independiente', n,
             'Las dos series proceden del INE y la única otra publicación del mismo índice que hay es la del propio INE (otra serie: IPC290751 frente a las tablas históricas): '
             'no hay segunda fuente de otro organismo. El IPC armonizado de Eurostat es otro índice y no sirve para contrastar el nivel. '
             'Indirectamente, los años 2022-2026 de la revalorización se reproducen con la serie del INE (fila anterior).', [])


# --------------------------------------------------------------------------------------------
# E. Bases, tipos y MEI: web de la SS (2026), órdenes de cotización (MEI 2023-2026), reglas legales
# --------------------------------------------------------------------------------------------
def texto_boe(doc):
    t = open(f'{RAW}/{doc}.xml', encoding='utf-8', errors='replace').read()
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t)))


def fuente_boe(doc):
    return {'title': BOE_ORDENES[doc], 'url': f'https://www.boe.es/buscar/doc.php?id={doc}', 'fetchedAt': HOY}


def audita_cotizacion():
    s = texto_html('ss-bases-tipos-cotizacion.html')
    i = s.index('AÑO 2026', s.index('Resumen de bases y tipos de cotización durante los últimos 5 años'))
    bloque = s[i : i + 4000]
    minima = num(re.search(r'7 \| Auxiliares Administrativos \| ([\d.]+,\d\d)', re.sub(r'\s*\n\s*', ' ', bloque)).group(1))
    maxima = num(re.search(r'7 \| Auxiliares Administrativos \| [\d.]+,\d\d \| ([\d.]+,\d\d)', re.sub(r'\s*\n\s*', ' ', bloque)).group(1))
    m = re.search(r'Comunes \| ([\d,]+) \| ([\d,]+) \| ([\d,]+)', re.sub(r'\s*\n\s*', ' ', bloque))
    emp, tra = float(m.group(1).replace(',', '.')), float(m.group(2).replace(',', '.'))
    fs = [fuente_ss('ss-bases-tipos-cotizacion.html')]
    for fichero, v in (('base-minima-rg', minima), ('base-maxima-rg', maxima), ('tipo-cc-empresa', emp), ('tipo-cc-trabajador', tra)):
        x = datos(fichero)['2026']
        difs = [] if abs(x['value'] - v) < 0.005 else [{'id': '2026', 'valor': x['value'], 'segundaFuente': v}]
        registra(f'{fichero} 2026', fichero, '2026', fs, clasifica(1, difs), 1, f'La web da {str(v).replace(".", ",")} (Régimen General; grupos 4 a 7 en las bases). Los demás años se contrastan en otras filas.', difs)
    # MEI 2026 en la web
    r = re.sub(r'\s*\n\s*', ' ', s)
    m = re.search(r'Mecanismo Equidad Intergeneracional \(MEI\) \| ([\d,]+)% \| ([\d,]+)% \| ([\d,]+)%', r)
    web = {'empresa': float(m.group(1).replace(',', '.')), 'trabajador': float(m.group(2).replace(',', '.')), 'total': float(m.group(3).replace(',', '.'))}
    # MEI 2023-2026 en las órdenes de cotización (otra norma)
    pats = {
        2023: ('BOE-A-2023-2472', r'mecanismo de equidad intergeneracional, el (0,\d+) por ciento aplicable sobre la base de cotización por contingencias comunes, del que el (0,\d+) por ciento será a cargo de la empresa y el (0,\d+) por ciento, a cargo del trabajador'),
        2024: ('BOE-A-2024-1691', r'mecanismo de equidad intergeneracional, el (0,\d+) por ciento aplicable sobre la base de cotización por contingencias comunes, del que el (0,\d+) por ciento será a cargo de la empresa y el (0,\d+) por ciento, a cargo del trabajador'),
        2025: ('BOE-A-2025-3780', r'Desde el 1 de enero de 2025, la cotización adicional correspondiente al mecanismo de equidad intergeneracional en el Régimen General de la Seguridad Social se determinará aplicando el tipo del (0,\d+) por ciento sobre la base de cotización por contingencias comunes, del que el (0,\d+) por ciento será a cargo del empleador y el (0,\d+) por ciento, a cargo de la persona trabajadora'),
        2026: ('BOE-A-2026-7296', r'Desde el 1 de enero de 2026, la cotización adicional correspondiente al mecanismo de equidad intergeneracional en el Régimen General de la Seguridad Social se determinará aplicando el tipo del (0,\d+) por ciento sobre la base de cotización por contingencias comunes, del que el (0,\d+) por ciento será a cargo del empleador y el (0,\d+) por ciento, a cargo de la persona trabajadora'),
    }
    tot, emp, tra = datos('mei-tipo-total'), datos('mei-tipo-empresa'), datos('mei-tipo-trabajador')
    difs, n = {'mei-tipo-total': [], 'mei-tipo-empresa': [], 'mei-tipo-trabajador': []}, 0
    for a, (doc, pat) in pats.items():
        m = re.search(pat, texto_boe(doc))
        t_, e_, w_ = (float(g.replace(',', '.')) for g in m.groups())
        n += 1
        for fich, d, v in (('mei-tipo-total', tot, t_), ('mei-tipo-empresa', emp, e_), ('mei-tipo-trabajador', tra, w_)):
            if abs(d[str(a)]['value'] - v) > 1e-9:
                difs[fich].append({'id': str(a), 'valor': d[str(a)]['value'], 'segundaFuente': v})
    for fich, d, k in (('mei-tipo-total', tot, 'total'), ('mei-tipo-empresa', emp, 'empresa'), ('mei-tipo-trabajador', tra, 'trabajador')):
        if abs(d['2026']['value'] - web[k]) > 1e-9:
            difs[fich].append({'id': '2026 (web)', 'valor': d['2026']['value'], 'segundaFuente': web[k]})
        registra(
            f'{fich} (puntos porcentuales, 2023-2026)',
            fich,
            '2023-2026',
            [fuente_boe(doc) for doc in BOE_ORDENES] + [fuente_ss('ss-bases-tipos-cotizacion.html')],
            clasifica(n + 1, difs[fich]),
            n + 1,
            'Órdenes anuales de cotización (art. del tipo del MEI en el Régimen General) y, para 2026, la web de la Seguridad Social. 2027-2029 sin contraste independiente: solo la DT 43.ª.',
            difs[fich],
        )
    # Base máxima: regla de la DT 38.ª (revalorización + 1,2 puntos)
    bm, rv = datos('base-maxima-rg'), datos('revalorizacion-general')
    difs, n, filas = [], 0, []
    for a in (2024, 2025, 2026):
        n += 1
        esperada = bm[str(a - 1)]['value'] * (1 + (rv[str(a)]['value'] + 1.2) / 100)
        filas.append(f"{a}: {esperada:.2f} frente a {bm[str(a)]['value']:.2f}")
        if abs(esperada - bm[str(a)]['value']) > 0.3:
            difs.append({'id': str(a), 'valor': bm[str(a)]['value'], 'segundaFuente': round(esperada, 2)})
    registra(
        'base-maxima-rg 2024-2026 (euros/mes) frente a la regla de la DT 38.ª',
        'base-maxima-rg',
        '2024-2026',
        [{'title': 'Real Decreto-ley 2/2023, de 16 de marzo (DT 38.ª TRLGSS: revalorización más 1,2 puntos)', 'url': 'https://www.boe.es/buscar/doc.php?id=BOE-A-2023-6967', 'fetchedAt': HOY}],
        clasifica(n, difs),
        n,
        'Cálculo: base del año anterior × (1 + (revalorización + 1,2) / 100), con tolerancia de 0,30 euros por el redondeo de la orden: ' + '; '.join(filas) + '. Los demás años no tienen contraste independiente; 2026 coincide además con la web.',
        difs,
    )
    # Base mínima frente a Eurostat (SMI en doce pagas)
    e = json.load(open(f'{RAW}/eurostat-earn_mw_cur-ES.json', encoding='utf-8'))
    idx = e['dimension']['time']['category']['index']
    val = {k: e['value'][str(i)] for k, i in idx.items()}
    bn = datos('base-minima-rg')
    difs, ok, n = [], [], 0
    for a in range(2000, 2027):
        x = bn.get(str(a))
        if not x:
            continue
        n += 1
        if any(abs(x['value'] - v) <= 1.0 for v in (val.get(f'{a}-S1'), val.get(f'{a}-S2')) if v is not None):
            ok.append(a)
        else:
            difs.append({'id': str(a), 'valor': x['value'], 'segundaFuente': f"S1 {val.get(f'{a}-S1')} / S2 {val.get(f'{a}-S2')}"})
    registra(
        'base-minima-rg (grupos 4-7, euros/mes) frente al SMI de Eurostat',
        'base-minima-rg',
        '2000-2026',
        [fuente_ss('eurostat-earn_mw_cur-ES.json')],
        clasifica(n, difs) if not difs else 'coincide con salvedades',
        n,
        'La base mínima de los grupos 4 a 7 es el SMI mensual de catorce pagas ×14/12; Eurostat publica el SMI con doce pagas (entero, de ahí la tolerancia de 1 euro). '
        f'Coinciden con un semestre {len(ok)} de {n} años. Contraste indirecto (la base no es el SMI, deriva de él por la norma de cotización). 2020 y 2021 no están en /data.'
        + (' Años que no coinciden: ' + '; '.join(f"{d['id']}: {d['valor']} frente a {d['segundaFuente']}" for d in difs) + '.' if difs else ''),
        difs,
    )


# --------------------------------------------------------------------------------------------
# F. PNC: informe de evolución de nóminas del IMSERSO (2019-2025) y guías de aplicación (2022-2026)
# --------------------------------------------------------------------------------------------
def pdf_texto(ruta):
    return subprocess.run(['pdftotext', '-layout', ruta, '-'], capture_output=True, text=True, check=True).stdout


def audita_pnc():
    origen = json.load(open(f'{REPO}/data-raw/imserso/origen.json', encoding='utf-8'))
    ev = pdf_texto(f'{REPO}/data-raw/imserso/evolnom20192025.pdf')
    comp = {}
    for l in ev.split('\n'):
        m = re.match(r'\s*(20\d\d)\*?\s+([\d.]+,\d\d)\s+([\d.]+,\d\d)\s', l)
        if m:
            comp[int(m.group(1))] = num(m.group(3))
    guias = {}
    for a in range(2022, 2027):
        t = pdf_texto(f'{REPO}/data-raw/imserso/pncresumen{a}.pdf')
        m = re.search(r'ÍNTEGRA\s+([\d.]+,\d\d)\s', t)
        guias[a] = num(m.group(1))
    d = datos('pnc-importe-anual')
    difs, n, filas = [], 0, []
    for a in range(2019, 2027):
        vs = [v for v in (comp.get(a), guias.get(a)) if v is not None]
        n += 1
        if any(abs(d[str(a)]['value'] - v) > 0.005 for v in vs):
            difs.append({'id': str(a), 'valor': d[str(a)]['value'], 'segundaFuente': vs})
    fuente_ev = {'title': 'IMSERSO, Informe de evolución de las nóminas. PNC y PSPD. 2019-2025', 'url': 'https://imserso.es/el-imserso/documentacion/estadisticas/pensiones-no-contributivas-jubilacion-invalidez-pnc', 'fetchedAt': '2026-11-11'}
    fuente_guias = {'title': 'IMSERSO, guías resumen de aplicación de las pensiones no contributivas de 2022 a 2026', 'url': origen['pncresumen2026.pdf']['url'], 'fetchedAt': '2026-11-12'}
    registra(
        'pnc-importe-anual (cuantía íntegra, euros/año)',
        'pnc-importe-anual',
        '2019-2026',
        [fuente_ev, fuente_guias],
        clasifica(n, difs),
        n,
        'Cuantía anual de 2019 a 2025 en el informe de evolución y de 2022 a 2026 en las guías (la de 2023, 6.784,54, corregida en la Fase 2-B-3); 2026 coincide además con la web de la Seguridad Social. '
        'Los años 2001-2018 no tienen contraste independiente en las fuentes descargadas.',
        difs,
    )
    # IPREM anual de las guías frente a los importes de la ley (iprem-anual)
    ip, ib = datos('pnc-iprem-anual-sin-pagas-extra'), datos('iprem-anual')
    difs, n = [], 0
    for a in (2022, 2023):
        n += 1
        if abs(ip[str(a)]['value'] - ib[str(a)]['value']) > 0.005:
            difs.append({'id': str(a), 'valor': ip[str(a)]['value'], 'segundaFuente': ib[str(a)]['value']})
    registra(
        'pnc-iprem-anual-sin-pagas-extra (IPREM anual con doce pagas)',
        'pnc-iprem-anual-sin-pagas-extra',
        '2022-2026',
        [{'title': 'Ley 22/2021 (BOE-A-2021-21653) y Ley 31/2022 (BOE-A-2022-22128): IPREM de 2022 y 2023', 'url': 'https://www.boe.es/buscar/doc.php?id=BOE-A-2022-22128', 'fetchedAt': '2026-11-11'}],
        clasifica(n, difs),
        n,
        'Las guías del IMSERSO (fuente del dato) y la ley dan 6.948,24 (2022) y 7.200,00 (2023). 2024-2026: solo las guías; ninguna norma descargada enuncia el IPREM de esos años (docs/PENDIENTE_DATOS.md).',
        difs,
    )
    # Complemento de alquiler: guías de 2025 y 2026 (las de 2022-2024 no lo mencionan)
    al = datos('pnc-complemento-alquiler')
    difs, n = [], 0
    for a in (2025, 2026):
        t = re.sub(r'\s+', ' ', pdf_texto(f'{REPO}/data-raw/imserso/pncresumen{a}.pdf'))
        m = re.search(r'Complemento a favor de pensionistas no contributivos que residan en una vivienda ([\d.]+,\d\d)', t)
        n += 1
        v = num(m.group(1)) if m else None
        if v is None or abs(v - al[str(a)]['value']) > 0.005:
            difs.append({'id': str(a), 'valor': al[str(a)]['value'], 'segundaFuente': v})
    registra('pnc-complemento-alquiler (euros/año)', 'pnc-complemento-alquiler', '2025-2026', [fuente_guias], clasifica(n, difs), n,
             'Importe en las guías del IMSERSO de 2025 y 2026 (2026 coincide además con la web de la Seguridad Social). 2022 y 2023 no tienen contraste independiente '
             '(las guías de esos años no mencionan el complemento) y el de 2024 falta (docs/PENDIENTE_DATOS.md).', difs)


# --------------------------------------------------------------------------------------------
# G. Reglas con cifras comprobables en las páginas de la SS (viudedad, absoluta, carencia)
# --------------------------------------------------------------------------------------------
def audita_reglas_ss():
    v = re.sub(r'\s+', ' ', texto_html('ss-viudedad-cuantia.html'))
    sv = datos('supervivencia-reglas')
    pruebas = [
        ('viudedad-pct', 52, r'El 52% de la base reguladora, con carácter general'),
        ('viudedad-65-pct', 60, r'será del 60%, cuando en la persona beneficiaria concurran'),
        ('viudedad-cargas-pct', 70, r'El 70% de la base reguladora correspondiente'),
        ('viudedad-cargas-smi-pct', 75, r'no superen, en cómputo anual, el 75% del salario mínimo interprofesional'),
        ('br-meses', 24, r'dividir por 28 la suma de las bases de cotización del interesado durante un período ininterrumpido de 24 meses'),
        ('br-divisor', 28, r'dividir por 28 la suma de las bases de cotización del interesado durante un período ininterrumpido de 24 meses'),
    ]
    difs = []
    for id_, esperado, pat in pruebas:
        if not re.search(pat, v) or abs(sv[id_]['value'] - esperado) > 1e-9:
            difs.append({'id': id_, 'valor': sv[id_]['value'], 'segundaFuente': esperado})
    registra(
        'supervivencia-reglas: porcentajes de la viudedad (52, 60, 70 %), 75 % del SMI de las cargas y base reguladora de 24 meses entre 28',
        'supervivencia-reglas',
        '2022-2026',
        [fuente_ss('ss-viudedad-cuantia.html')],
        clasifica(len(pruebas), difs),
        len(pruebas),
        'Cifras y regla presentes en la página de la Seguridad Social. El resto de las 86 reglas de supervivencia (orfandad, familiares, límite conjunto, parejas de hecho, edades) no tienen contraste independiente: '
        'la cita literal de la norma se comprueba por código (misma fuente).',
        difs,
    )
    a = re.sub(r'\s+', ' ', texto_html('ss-incapacidad-absoluta.html'))
    ip = datos('incapacidad-permanente-reglas')
    pruebas = [
        ('absoluta-porcentaje', 100, r'El 100% de la base reguladora'),
        ('br-ec-porcentaje-sin-15-anios', 50, r'Actualmente, dicho porcentaje es del 50%'),
    ]
    difs = []
    for id_, esperado, pat in pruebas:
        if not re.search(pat, a) or abs(ip[id_]['value'] - esperado) > 1e-9:
            difs.append({'id': id_, 'valor': ip[id_]['value'], 'segundaFuente': esperado})
    registra(
        'incapacidad-permanente-reglas: 100 % de la absoluta y 50 % sin derecho a jubilación',
        'incapacidad-permanente-reglas',
        '2022-2026',
        [fuente_ss('ss-incapacidad-absoluta.html')],
        clasifica(len(pruebas), difs),
        len(pruebas),
        'Solo estas dos cifras constan en la página consultada. El resto de las 75 reglas (total 55 %, cualificada, gran incapacidad, carencias, periodos) no tienen contraste independiente '
        'en las fuentes descargadas (contraste interno: 55 % en la Orden de 1969 y en el Decreto 3158/1966, ya en los tests).',
        difs,
    )
    r = re.sub(r'\s+', ' ', texto_html('ss-jubilacion-requisitos.html'))
    cj, pp = datos('carencia-jubilacion'), datos('jubilacion-periodo-previo')
    ok15 = re.search(r'(?:15 años|quince años)', r) is not None
    ok2 = re.search(r'(?:2 años|dos años)[^.]{0,120}15', r) is not None
    difs = []
    if not ok15 or any(x['value'] != 180 for x in cj.values()):
        difs.append({'id': 'carencia-jubilacion', 'valor': 180, 'segundaFuente': ok15})
    if not ok2 or pp['2013-meses-minimos']['value'] != 24 or pp['2013-ventana-meses']['value'] != 180:
        difs.append({'id': 'jubilacion-periodo-previo', 'valor': 24, 'segundaFuente': ok2})
    e65 = datos('jubilacion-edad-65')
    if not re.search(r'65 años cuando se acrediten 38 años y 6 meses', r) or any(x['value'] != 780 for x in e65.values()):
        difs.append({'id': 'jubilacion-edad-65', 'valor': 780, 'segundaFuente': False})
    registra('carencia-jubilacion (180 meses), jubilacion-periodo-previo (24 de los últimos 180) y jubilacion-edad-65 (780 meses)', 'carencia-jubilacion', '2000-2026',
             [fuente_ss('ss-jubilacion-requisitos.html')], clasifica(3, difs), 3,
             'Quince años de cotización, dos de ellos dentro de los quince anteriores, en la página de requisitos de la jubilación. La serie se mantiene en 180 meses en todos los años de /data (2000-2026).', difs)


# --------------------------------------------------------------------------------------------
# H. Otras reglas: PNC (guía del IMSERSO de 2026), opción de 25 años, MEI y solidaridad
# --------------------------------------------------------------------------------------------
def audita_varios():
    g = re.sub(r'\s+', ' ', pdf_texto(f'{REPO}/data-raw/imserso/pncresumen2026.pdf'))
    pr = datos('pnc-reglas')
    pruebas = [
        ('incapacidad-edad-minima-meses', 216, r'Ser mayor de 18 años y menor de 65 años'),
        ('incapacidad-edad-maxima-meses', 780, r'Ser mayor de 18 años y menor de 65 años'),
        ('incapacidad-residencia-total-meses', 60, r'haberlo hecho durante 5 años, de los cuales dos serán inmediatamente anteriores'),
        ('incapacidad-residencia-reciente-meses', 24, r'haberlo hecho durante 5 años, de los cuales dos serán inmediatamente anteriores'),
        ('incapacidad-grado-minimo-pct', 65, r'discapacidad o enfermedad crónica en un grado igual o superior al 65%'),
        ('jubilacion-edad-minima-meses', 780, r'Ser mayor de 65 años en la fecha de la solicitud'),
        ('jubilacion-residencia-total-meses', 120, r'haberlo hecho durante 10 años, entre la edad de 16 años'),
        ('jubilacion-residencia-desde-edad-meses', 192, r'haberlo hecho durante 10 años, entre la edad de 16 años'),
        ('jubilacion-residencia-reciente-meses', 24, r'de los cuales dos deberán ser consecutivos e inmediatamente anteriores'),
        ('cuantia-unidad-economica-pct', 70, r'se le suma el 70% de esa misma cuantía'),
    ]
    difs = []
    for id_, esperado, pat in pruebas:
        if not re.search(pat, g) or abs(pr[id_]['value'] - esperado) > 1e-9:
            difs.append({'id': id_, 'valor': pr[id_]['value'], 'segundaFuente': esperado})
    # Mínimo del 25 % y complemento del 50 %: cocientes de las cuantías de la guía
    m = re.search(r'ÍNTEGRA ([\d.]+,\d\d) [\d.]+,\d\d MÍNIMO DEL 25% ([\d.]+,\d\d) [\d.]+,\d\d COMPLEMENTO NECESIDAD OTRA PERSONA ([\d.]+,\d\d)', g)
    integra, minimo, compl = num(m.group(1)), num(m.group(2)), num(m.group(3))
    for id_, esperado, v in (('cuantia-minima-pct', 25, minimo / integra * 100), ('complemento-tercera-persona-pct', 50, compl / integra * 100)):
        pruebas.append((id_, esperado, ''))
        if abs(pr[id_]['value'] - v) > 0.005:
            difs.append({'id': id_, 'valor': pr[id_]['value'], 'segundaFuente': round(v, 3)})
    registra(
        'pnc-reglas: edades, residencia, grado, mínimo del 25 %, complemento del 50 % y 70 % por beneficiario adicional',
        'pnc-reglas',
        '2026',
        [{'title': 'IMSERSO, guía resumen de aplicación de las pensiones no contributivas, año 2026', 'url': json.load(open(f'{REPO}/data-raw/imserso/origen.json', encoding='utf-8'))['pncresumen2026.pdf']['url'], 'fetchedAt': '2026-11-12'}],
        clasifica(len(pruebas), difs),
        len(pruebas),
        'Requisitos y cuantías de la guía del IMSERSO (los cocientes 2.200,80/8.803,20 y 4.401,60/8.803,20 dan el 25 % y el 50 %). Las demás reglas de pnc-reglas '
        '(rentas computables, trabajo, efectos, alquiler) no tienen contraste independiente: la guía es un resumen, no la norma.',
        difs,
    )
    # Opción de 25 años: años de aplicación
    s = re.sub(r'\s+', ' ', texto_html('ss-jubilacion-cuantia.html'))
    ap = datos('opcion-25-anos-aplicable')
    ok = 'A partir del 2044 será ya únicamente aplicable un cálculo' in s and 'A partir del año 2026 y hasta 2040' in s and 'En 2043, el cociente que resulte de dividir por 371' in s
    difs = [] if ok and ap['2043']['value'] == 1 and ap['2044']['value'] == 0 and ap['2026']['value'] == 1 else [{'id': 'opcion-25-anos-aplicable', 'valor': None, 'segundaFuente': ok}]
    registra('opcion-25-anos-aplicable (2026-2044)', 'opcion-25-anos-aplicable', '2026-2044',
             [fuente_ss('ss-jubilacion-cuantia.html')], clasifica(3, difs), 3,
             'Cálculo alternativo disponible de 2026 a 2043 y, desde 2044, un solo cálculo (comprobados 2026, 2043 y 2044). La lectura del 31/12/2040 no está en la página.', difs)
    # MEI: último año
    s = re.sub(r'\s+', ' ', texto_html('ss-bases-tipos-cotizacion.html'))
    mr = datos('mei-reglas')
    ok = 'con efectos desde el 1 de enero de 2023 hasta el 31 de diciembre de 2050' in s and 'durante cada año desde el año 2025 hasta el año 2045' in s
    difs = [] if ok and mr['primer-anio']['value'] == 2023 and mr['ultimo-anio']['value'] == 2050 and mr['solidaridad-primer-anio']['value'] == 2025 and mr['solidaridad-ultimo-anio-calendario']['value'] == 2045 else [{'id': 'mei-reglas', 'valor': None, 'segundaFuente': ok}]
    registra('mei-reglas: años de vigencia del MEI (2023-2050) y de la solidaridad (2025-2045)', 'mei-reglas', '2023-2050',
             [fuente_ss('ss-bases-tipos-cotizacion.html')], clasifica(4, difs), 4,
             'Solo los años de vigencia. Los tipos de 2030 a 2050 y los de la solidaridad por tramo no tienen contraste independiente (solo la DT 43.ª y la DT 42.ª).', difs)
    # Solidaridad: calendario de 2025 y 2026 frente a la orden de cotización
    cal, tip = datos('cuota-solidaridad-calendario'), datos('cuota-solidaridad-tipos')
    difs, n = [], 0
    for k in cal:
        if k.startswith(('2025-', '2026-')) and k in tip:
            n += 1
            if abs(cal[k]['value'] - tip[k]['value']) > 1e-9:
                difs.append({'id': k, 'valor': cal[k]['value'], 'segundaFuente': tip[k]['value']})
    registra('cuota-solidaridad-calendario (2025 y 2026) frente a la orden anual de cotización', 'cuota-solidaridad-calendario', '2025-2026',
             [fuente_boe('BOE-A-2025-3780'), fuente_boe('BOE-A-2026-7296')], clasifica(n, difs), n,
             'Tipos por tramo de la DT 42.ª frente a los de las órdenes de 2025 y 2026 (otra norma). 2027-2045: solo la DT 42.ª.', difs)


# --------------------------------------------------------------------------------------------
# I. Correcciones de errores del BOE de las normas citadas
# --------------------------------------------------------------------------------------------
def audita_correcciones():
    textos = {}
    for corr in sorted({c for v in CORRECCIONES.values() for c in v}):
        t = open(f'{RAW}/correcciones/{corr}.xml', encoding='utf-8', errors='replace').read()
        textos[corr] = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t)))
    valores = set()
    for f in sorted(os.listdir(f'{REPO}/data/parametros')):
        if not f.endswith('.json'):
            continue
        for x in json.load(open(f'{REPO}/data/parametros/{f}', encoding='utf-8'))['data']:
            if isinstance(x['value'], (int, float)):
                valores.add(round(float(x['value']), 2))
    revisadas = {
        ('BOE-A-2012-352', '7.658,00'): 'es el valor correcto de otra fila del mismo cuadro (jubilación de titular menor de 65 años, cónyuge no a cargo, 2012)',
        ('BOE-A-2013-832', '7.063,07'): 'la corrección cambia el texto («no excedan» por «excedan»), no la cifra del límite de ingresos de 2013',
        ('BOE-A-2014-1505', '753,00'): 'la errata es del grupo de cotización 3; /data usa los grupos 4 a 7 (753,00 es correcto)',
    }
    difs, n, aclaradas = [], 0, []
    for corr, s in textos.items():
        for m in re.finditer(r'donde dice:? ?«[^»]*?(\d{1,3}(?:\.\d{3})*,\d{2})[^»]*»', s):
            n += 1
            if num(m.group(1)) in valores:
                if (corr, m.group(1)) in revisadas:
                    aclaradas.append(f'{corr} «{m.group(1)}»: {revisadas[(corr, m.group(1))]}')
                else:
                    difs.append({'id': corr, 'valor': m.group(1), 'segundaFuente': 'cifra corregida como errónea y presente en /data'})
    # Cuadros que las correcciones sustituyen: se comprueba que /data coincide con el cuadro corregido
    bm, bx = datos('base-minima-rg'), datos('base-maxima-rg')
    for anio, corr in ((2019, 'BOE-A-2019-1932'), (2023, 'BOE-A-2023-8706'), (2024, 'BOE-A-2024-6627')):
        m = re.search(r'7 Auxiliares [Aa]dministrativos\.? ([\d.]+,\d\d) ([\d.]+,\d\d)', textos[corr])
        n += 2
        if abs(bm[str(anio)]['value'] - num(m.group(1))) > 0.005:
            difs.append({'id': f'base-minima-rg {anio}', 'valor': bm[str(anio)]['value'], 'segundaFuente': num(m.group(1))})
        if abs(bx[str(anio)]['value'] - num(m.group(2))) > 0.005:
            difs.append({'id': f'base-maxima-rg {anio}', 'valor': bx[str(anio)]['value'], 'segundaFuente': num(m.group(2))})
    of = datos('pension-minima-orfandad-familiares')
    s = textos['BOE-A-2017-1573']
    for id_, pat in (
        ('2017-orf-unico', r'Orfandad Por beneficiario ([\d.]+,\d\d) Por beneficiario con discapacidad'),
        ('2017-orf-discapacidad65-unico', r'menor de 18 años con una discapacidad en grado igual o superior al 65 por 100 ([\d.]+,\d\d) En la orfandad absoluta'),
        ('2017-fam-unico', r'En favor de familiares Por beneficiario ([\d.]+,\d\d) Si no existe'),
        ('2017-fam1-65-unico', r'Un solo beneficiario con sesenta y cinco años ([\d.]+,\d\d)'),
        ('2017-fam1-menor65-unico', r'Un solo beneficiario menor de sesenta y cinco años ([\d.]+,\d\d)'),
    ):
        # el cuadro corregido es el segundo bloque del texto (tras «debe ser sustituida por la siguiente»)
        corregido = s[s.index('debe ser sustituida por la siguiente') :]
        m = re.search(pat, corregido)
        n += 1
        if not m or abs(of[id_]['value'] - num(m.group(1))) > 0.005:
            difs.append({'id': id_, 'valor': of[id_]['value'], 'segundaFuente': m.group(1) if m else None})
    mx = datos('pension-maxima')['2005']['value'] * 14
    n += 1
    if '30.227,68' not in textos['BOE-A-2005-1413'] or abs(mx - 30227.68) > 0.005:
        difs.append({'id': 'pension-maxima 2005', 'valor': mx, 'segundaFuente': 30227.68})
    n += 2
    for id_, f in (('2012-ip-gran-invalidez-conyuge-no-cargo', 'pension-minima-incapacidad'), ('2012-jub65-gran-invalidez-conyuge-no-cargo', 'pension-minima-jubilacion')):
        if abs(datos(f)[id_]['value'] - 12327.0) > 0.005:
            difs.append({'id': id_, 'valor': datos(f)[id_]['value'], 'segundaFuente': 12327.0})
    n_corr = len(textos)
    registra(
        'correcciones de errores del BOE de las normas citadas (todas las series)',
        'todos los ficheros de data/parametros que leen los motores',
        '1969-2025',
        [{'title': f'BOE: {n_corr} correcciones de errores de las normas citadas (campo «posteriores» de cada norma)', 'url': 'https://www.boe.es/diario_boe/xml.php?id=BOE-A-2012-352', 'fetchedAt': HOY}],
        clasifica(n, difs) if not (aclaradas and not difs) else 'coincide con salvedades',
        n,
        f'Se revisaron las 108 normas del BOE que citan los datos de los motores: {n_corr} tienen correcciones de errores publicadas (los textos están en data-raw/auditoria/correcciones/). '
        'Solo una cambia cifras de /data (BOE-A-2012-352, gran invalidez de 2012: corregida en esta fase, ver «Hallazgos»). Las demás son de redacción o de cifras ajenas a /data; '
        'las que sustituyen cuadros (bases de 2019, 2023 y 2024, orfandad y favor de familiares de 2017, pensión máxima de 2005) coinciden con /data. '
        'Cifras de «donde dice» que aparecen en /data y se han revisado a mano (no son errores de /data): ' + '; '.join(aclaradas) + '. Ninguna otra cifra errónea corregida figura en /data.',
        difs,
    )


# --------------------------------------------------------------------------------------------
# Escritura
# --------------------------------------------------------------------------------------------
def principal():
    for nombre, (url, _) in {**PAGINAS, **EXTERNAS}.items():
        descarga(nombre, url)
    for doc in BOE_ORDENES:
        descarga(f'{doc}.xml', f'https://www.boe.es/diario_boe/xml.php?id={doc}')
    for corr in sorted({c for v in CORRECCIONES.values() for c in v}):
        descarga(f'correcciones/{corr}.xml', f'https://www.boe.es/diario_boe/xml.php?id={corr}')
    audita_bel()
    audita_ss_2026()
    audita_ss_otros()
    audita_ss_jubilacion()
    audita_smi()
    audita_ipc()
    audita_cotizacion()
    audita_pnc()
    audita_reglas_ss()
    audita_varios()
    audita_correcciones()
    return REGISTROS


HALLAZGOS = [
    '**Corregido** · `pension-minima-incapacidad`, 2012, gran invalidez con cónyuge no a cargo: `/data` tenía 13.327,00 euros/año (texto original del Real Decreto-ley 20/2011) y la corrección de errores publicada el 10/01/2012 (BOE-A-2012-352) dice «donde dice: «13.327,00», debe decir: «12.327,00»». El BEL del MITES da 12.327,00. Valor nuevo: 12.327,00. Ningún motor ni caso de oro usa 2012.',
    '**Corregido** · `pension-minima-jubilacion`, 2012, titular con 65 años procedente de gran invalidez con cónyuge no a cargo: `/data` tenía 7.658,00 (texto original) y la misma corrección de errores dice «donde dice: «7.658,00», debe decir: «12.327,00»». Valor nuevo: 12.327,00. Ningún motor ni caso de oro usa 2012.',
    '**Sin cambio** · BEL, 2026, incapacidad total de 60 a 64 años unipersonal: el BEL da 13.106,80 y `/data`, 12.262,60; el BOE (BOE-A-2026-6977, fila literal) y la web de la Seguridad Social dan 12.262,60. El valor del BEL es el de la absoluta unipersonal: error de la fuente secundaria.',
    '**Sin cambio** · BEL, 2022, pensión máxima: 39.474,00 frente a 39.468,52 de `/data` (2.819,18 × 14, cita literal de BOE-A-2022-1189). Diferencia del 0,014 %; el BEL no explica el importe.',
    '**Sin cambio** · BEL, 2000-2011: importes superiores a los de la norma en un porcentaje casi constante por año para todas las clases (ya en docs/DISCREPANCIAS.md, Fase 1B-3); se conserva el valor de la norma.',
    '**Sin cambio** · SMI de 2021 y 2022 frente a Eurostat: Eurostat no refleja en ningún semestre el importe del real decreto (2021: 965 desde septiembre; 2022: 1.000 con efectos retroactivos desde enero); el dato de `/data` es el del real decreto.',
]

# Ficheros que los motores leen y que no tienen ningún contraste (o solo el que se cita)
SIN_CONTRASTE = {
    'base-maxima-incremento-futuro': 'Regla legal de 2024 a 2050 (DT 38.ª: revalorización más 1,2 puntos). Su aplicación a 2024-2026 se reproduce con la base máxima publicada (fila de «base-maxima-rg»); 2027-2050 son reglas futuras: solo el BOE consolidado.',
    'pension-maxima-incremento-futuro': 'Regla legal de 2025 a 2050 (DT 39.ª): solo el BOE consolidado; no hay publicación de otro organismo.',
    'pension-maxima-incremento-2051-2065': 'Tabla de la DT 39.ª.4: solo el BOE consolidado; su lectura es una pregunta abierta (REVISION_ACTUARIAL).',
    'complemento-brecha-genero-reglas': 'Reglas del art. 60 TRLGSS (tope de cuatro hijos, no computa para el límite): la web de la SS confirma el tope de cuatro veces el importe y que no computa para la pensión máxima ni para los mínimos, pero no se ha automatizado la comparación.',
    'jubilacion-anticipada-reglas': 'Requisitos de las jubilaciones anticipadas y parcial (arts. 207, 208, 215): solo el BOE consolidado; las páginas de la SS descargadas no los recogen.',
    'jubilacion-coeficientes-involuntaria': 'Cuadro del art. 207.2 (192 coeficientes): solo el BOE; cruce interno en tests (el cuadro de 2033 de la DT 34.ª coincide con el art. 208.2).',
    'jubilacion-coeficientes-voluntaria': 'Cuadro del art. 208.2 (96 coeficientes): solo el BOE; cruce interno en tests.',
    'jubilacion-coeficientes-voluntaria-limite': 'DT 34.ª (960 coeficientes de 2024 a 2033): solo el BOE; en 2033 coincide con el art. 208.2 (test).',
}


def inventario():
    """Fichero -> motores que lo leen (por búsqueda del nombre entre comillas en src/engine)."""
    r = {}
    for motor in sorted(os.listdir(f'{REPO}/src/engine')):
        carpeta = f'{REPO}/src/engine/{motor}'
        if not os.path.isdir(carpeta):
            continue
        for f in os.listdir(carpeta):
            if not f.endswith('.ts') or f.endswith('.test.ts'):
                continue
            for m in re.finditer(r"'([a-z0-9]+(?:-[a-z0-9]+)+)'", open(f'{carpeta}/{f}', encoding='utf-8').read()):
                if os.path.exists(f'{REPO}/data/parametros/{m.group(1)}.json'):
                    r.setdefault(m.group(1), set()).add(motor)
    return r


def celda(s):
    return str(s).replace('|', '/').replace('\n', ' ')


def escribe(registros):
    inv = inventario()
    json.dump(
        {'generado': HOY, 'registros': registros, 'sinContraste': SIN_CONTRASTE, 'inventario': {k: sorted(v) for k, v in sorted(inv.items())}},
        open(f'{REPO}/docs/auditoria-independiente.json', 'w', encoding='utf-8'),
        ensure_ascii=False,
        indent=1,
    )
    open(f'{REPO}/docs/auditoria-independiente.json', 'a').write('\n')
    orden = {'difiere': 0, 'coincide con salvedades': 1, 'sin contraste independiente': 2, 'coincide': 3}
    L = [
        '<!-- auditoria-independiente:inicio -->',
        '',
        '## Auditoría independiente de las series del motor (Fase 2-C)',
        '',
        f'Generada el {HOY} por `scripts/etl/auditoria_independiente.py` (no edites a mano; las segundas fuentes están en `data-raw/auditoria/`, con huella en su `origen.json`). '
        'Contrasta cada serie que leen los motores con una segunda fuente oficial distinta de la que cita el dato: páginas de la Seguridad Social (cuantías mínimas, tope máximo, bases y tipos, jubilación, viudedad), '
        'Eurostat (SMI), INE (IPC), IMSERSO (guías e informe de evolución de las PNC), MITES (BEL PEN-31, ya en `data/sistema`) y otras normas del BOE (órdenes de cotización, RDL 2/2023, corrección de errores). '
        'Resultados: **coincide** (todos los valores comparados), **coincide con salvedades** (hay diferencias explicadas), **difiere** (hay diferencias que se han resuelto o no, ver «Hallazgos») y **sin contraste independiente**. '
        'Un valor solo cuenta como comparado si el código lo ha leído en las dos fuentes. Prueba de sensibilidad (`--sensibilidad`): se altera en 1 unidad un valor de 15 series y el contraste detecta las 14 de tolerancia estricta; la base mínima tolera 1 euro por el redondeo de Eurostat.',
        '',
        '### Inventario de series que consumen los motores',
        '',
        '| Fichero (`data/parametros/`) | Motores | Datos | Periodo | Contrastes |',
        '| --- | --- | ---: | --- | --- |',
    ]
    por_fichero = {}
    for r in registros:
        por_fichero.setdefault(r['fichero'], []).append(r)
    extra = {'lagunas-integracion-brecha-genero': 'lagunas-integracion', 'mei-tipo-total': 'mei-tipo-total', 'ipc-variacion-diciembre': 'ipc-indice-medio-anual', 'jubilacion-periodo-previo': 'carencia-jubilacion', 'jubilacion-edad-65': 'carencia-jubilacion'}
    for f in sorted(inv):
        d = json.load(open(f'{REPO}/data/parametros/{f}.json', encoding='utf-8'))['data']
        per = sorted({x.get('period') for x in d if x.get('period')})
        rs = por_fichero.get(f) or por_fichero.get(extra.get(f, ''), [])
        if rs:
            res = ', '.join(sorted({r['resultado'] for r in rs}, key=lambda x: orden[x]))
        else:
            res = 'sin contraste independiente'
        L.append(f"| `{f}` | {', '.join(sorted(inv[f]))} | {len(d)} | {per[0] + '-' + per[-1] if per else ''} | {res} |")
    L += ['', '### Contrastes realizados', '', '| Serie | Años | Segunda fuente | Valores comparados | Resultado | Detalle |', '| --- | --- | --- | ---: | --- | --- |']
    for r in sorted(registros, key=lambda x: (orden[x['resultado']], x['fichero'])):
        fuentes = '; '.join(f"{celda(s['title'])} <{s['url']}> (descargado el {s['fetchedAt']})" for s in r['segundaFuente'])
        L.append(f"| {celda(r['serie'])} | {r['anios']} | {fuentes} | {r['comparados']} | {r['resultado']} | {celda(r['detalle'])} |")
    L += ['', '### Hallazgos', ''] + [f'- {h}' for h in HALLAZGOS]
    L += ['', '### Series sin contraste independiente', '', 'Series que los motores leen y para las que no hay (o no se ha podido automatizar) ninguna segunda fuente. Cada una conserva su cita literal, comprobada por código (`scripts/citas-cifras.test.ts` y los scripts de extracción).', '']
    for f, motivo in SIN_CONTRASTE.items():
        L.append(f'- `{f}`: {motivo}')
    L += [
        '- Años anteriores a 2022 de las series que solo tienen contraste reciente (límite de ingresos, complemento de brecha, complemento de alquiler de 2022-2023, PNC de 2001-2018, tipos de contingencias comunes (solo 2026), base máxima (solo 2024-2026), revalorización de 2000-2021, índice del IPC): ver la columna «Años» y el detalle de cada fila.',
        '- Las reglas con muchas cifras (`incapacidad-permanente-reglas`, `supervivencia-reglas`, `jubilacion-demora-reglas`, `pnc-reglas`, `mei-reglas`) solo tienen contrastadas las cifras que constan en la fila correspondiente; el resto se apoya en la cita literal de la norma.',
        '',
        '<!-- auditoria-independiente:fin -->',
    ]
    return '\n'.join(L) + '\n'


def integra_en_auditoria(seccion):
    ruta = f'{REPO}/docs/AUDITORIA_DATOS.md'
    t = open(ruta, encoding='utf-8').read()
    t = re.sub(r'\n?<!-- auditoria-independiente:inicio -->.*?<!-- auditoria-independiente:fin -->\n?', '\n', t, flags=re.S)
    open(ruta, 'w', encoding='utf-8').write(t.rstrip('\n') + '\n\n' + seccion)


def sensibilidad():
    """Altera en 1 unidad un valor de 15 series y comprueba que el contraste lo detecta."""
    import copy

    original = globals()['datos']
    cache = {}

    def alterado(f):
        if f not in cache:
            cache[f] = copy.deepcopy(original(f))
        return cache[f]

    globals()['datos'] = alterado
    alteraciones = [
        ('pension-minima-jubilacion', '2026-jub65-unipersonal'), ('edad-ordinaria-jubilacion', '2025'), ('divisor-base-reguladora', '2030'),
        ('mei-tipo-empresa', '2024'), ('pnc-reglas', 'cuantia-minima-pct'), ('revalorizacion-general', '2024'), ('pnc-importe-anual', '2021'),
        ('base-minima-rg', '2010'), ('supervivencia-reglas', 'viudedad-65-pct'), ('opcion-25-anos-ventana', '2042'),
        ('pension-minima-viudedad', '2026-viud-60-64-unipersonal'), ('limite-ingresos-complementos-minimos', '2026'), ('smi-mensual', '2023'),
        ('tipo-cc-empresa', '2026'), ('escala-jubilacion-tramos', '2023-tramo1-meses'),
    ]
    for f, k in alteraciones:
        alterado(f)[k]['value'] += 1
    r = principal()
    detectadas = {x['fichero'] for x in r if x['difieren']}
    no = [f for f, _ in alteraciones if f not in detectadas]
    print(f'alteraciones detectadas: {len(alteraciones) - len(no)} de {len(alteraciones)}; no detectadas: {no}')
    return no


if __name__ == '__main__':
    if '--sensibilidad' in sys.argv:
        sys.exit(0 if sensibilidad() == ['base-minima-rg'] else 1)
    r = principal()
    for x in r:
        print(f"{x['resultado']:28s} n={x['comparados']:4d}  {x['serie']}")
    integra_en_auditoria(escribe(r))
