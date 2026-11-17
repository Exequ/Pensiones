"""Cronología normativa: añade a cada norma la entrada en vigor (con su base y su cita) y el fichero de
texto descargado, y sustituye los resúmenes con calificativos por descripciones neutras.

Se ejecuta DESPUÉS de `cronologia.py` (que regenera el fichero sin estos campos) y es idempotente.
Comprueba que cada cita consta: en el texto descargado de `data-raw/boe/` cuando hay (con los espacios
normalizados) o, si no, en las notas y las transiciones de la propia cronología. No inventa fechas:
las normas sin texto ni dato quedan con `base: sin-texto` (véase docs/PENDIENTE_DATOS.md).
Después hay que ejecutar `npx prettier --write data/normativa/cronologia.json` (el repositorio comprueba el formato)."""

import json
import os
import re
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RUTA = f'{REPO}/data/normativa/cronologia.json'

SIN_TEXTO = (
    'No consta en los textos ni en los datos descargados del repositorio; la descarga está '
    'anotada en docs/PENDIENTE_DATOS.md.'
)
CRON = 'data/normativa/cronologia.json'

# id -> (fecha, base, cita, ubicación, texto descargado o None)
VIGOR = {
    'ley-26-1985': (None, 'sin-texto', None, SIN_TEXTO, None),
    'rdleg-1-1994': ('1994-09-01', 'metadatos-boe', 'Metadatos BOE: vigencia 1994-09-01',
                     f'{CRON}, notas de la norma (metadatos del BOE descargados el 2026-11-11).', None),
    'ley-24-1997': (None, 'sin-texto', None, SIN_TEXTO, None),
    'ley-24-2001': ('2002-01-01', 'cronologia', 'Vigencia 1-1-2002',
                    f'{CRON}, transición de los cambios de la norma (fecha de los artículos que recoge la cronología).', None),
    'ley-35-2002': ('2002-07-14', 'metadatos-boe', 'vigencia 2002-07-14',
                    f'{CRON}, notas de la norma (metadatos del BOE descargados el 2026-11-11).', None),
    'ley-28-2003': ('2003-10-01', 'regla-sobre-publicacion', 'Entrada en vigor al día siguiente de su publicación',
                    f'{CRON}, transición del cambio de la norma; la fecha es el día siguiente a la publicación (2003-09-30).', None),
    'ley-40-2007': ('2008-01-01', 'metadatos-boe', 'metadatos BOE: vigencia 2008-01-01',
                    f'{CRON}, notas de la norma (metadatos del BOE descargados el 2026-11-11); la cronología señala una excepción (disposición adicional cuarta).', None),
    'ley-27-2011': ('2013-01-01', 'cronologia', 'Entrada en vigor general el 1-1-2013 (disp. final 12ª), con excepciones.',
                    f'{CRON}, notas de la norma; la cronología señala excepciones y la transición de cada cambio indica su fecha.', None),
    'rdl-28-2012': (None, 'sin-texto', None, SIN_TEXTO, None),
    'rdl-5-2013': (None, 'sin-texto', None, SIN_TEXTO, None),
    'ley-23-2013': (None, 'sin-texto', None, SIN_TEXTO, None),
    'rdleg-8-2015': ('2016-01-02', 'disposicion-final',
                     'El presente real decreto legislativo y el Texto Refundido que aprueba entrarán en vigor el 2 de enero de 2016.',
                     'data-raw/boe/trlgss-2015-consolidado.txt, disposición final única (texto original).',
                     'data-raw/boe/trlgss-2015-consolidado.txt'),
    'rdl-28-2018': (None, 'sin-texto', None, SIN_TEXTO, None),
    'rdl-3-2021': (None, 'sin-texto', None, SIN_TEXTO, None),
    'ley-21-2021': ('2022-01-01', 'disposicion-final', 'La presente ley entrará en vigor el 1 de enero de 2022.',
                    'data-raw/boe/ley-21-2021.txt, disposición final octava.', 'data-raw/boe/ley-21-2021.txt'),
    'rdl-2-2023': ('2023-04-01', 'disposicion-final',
                   'Este real decreto-ley entrará en vigor el día primero del mes siguiente al de su publicación en el «Boletín Oficial del Estado», excepto los siguientes preceptos:',
                   'data-raw/boe/rdl-2-2023.txt, disposición final décima (con excepciones); la fecha es la de vigencia de los metadatos del BOE de ese fichero.',
                   'data-raw/boe/rdl-2-2023.txt'),
    'rdl-11-2024': (None, 'sin-texto', None, SIN_TEXTO, None),
    'rd-316-2025': ('2025-04-16', 'disposicion-final',
                    'El presente real decreto entrará en vigor el día de su publicación en el «Boletín Oficial del Estado», con efectos económicos desde el día 1 de enero de 2025.',
                    'data-raw/boe/BOE-A-2025-7660.txt, disposición final tercera; la fecha es la de publicación.',
                    'data-raw/boe/BOE-A-2025-7660.txt'),
    'rd-241-2026': ('2026-03-26', 'disposicion-final',
                    'El presente real decreto entrará en vigor el día de su publicación en el «Boletín Oficial del Estado», con efectos económicos desde el día 1 de enero de 2026.',
                    'data-raw/boe/BOE-A-2026-6977.txt, disposición final tercera; la fecha es la de publicación.',
                    'data-raw/boe/BOE-A-2026-6977.txt'),
}

# Resúmenes sin calificativos: dicen qué cambia la norma, sin valorarla ni ordenarla.
RESUMENES = {
    'ley-26-1985': 'Eleva la carencia de jubilación a quince años, amplía el periodo de cálculo de la base reguladora a los últimos ocho años (96 meses entre 112) y establece la revalorización anual según el IPC previsto.',
    'ley-24-1997': 'Separa las fuentes de financiación, prevé un Fondo de Reserva, amplía el periodo de cálculo a 15 años, fija por ley la escala de porcentajes (50 % a los 15 años, 100 % a los 35) y establece la revalorización según el IPC previsto con cláusula de desviación.',
    'ley-40-2007': 'Desarrolla el Acuerdo de 13 de julio de 2006: exige que los 15 años de carencia sean días efectivos (sin pagas extra), fija el incentivo por demora en el 2 % o el 3 % anual, modifica los requisitos de la jubilación parcial (61 años, 6 de antigüedad, 30 cotizados), fija el coeficiente reductor del 7,5 % para 30-34 años cotizados y reconoce la viudedad a parejas de hecho.',
    'ley-27-2011': 'Eleva gradualmente la edad ordinaria de 65 a 67 años (65 con 38 años y 6 meses cotizados), amplía el periodo de cálculo de 15 a 25 años, fija en 37 los años para el 100 %, modifica la jubilación anticipada y prevé un factor de sostenibilidad a partir de 2027.',
    'rdl-5-2013': 'Regula la compatibilidad entre pensión de jubilación y trabajo, modifica los requisitos de la jubilación anticipada y modifica la jubilación parcial.',
    'rdl-11-2024': 'Modifica la compatibilidad de la pensión de jubilación con el trabajo (jubilación activa) y el complemento por demora.',
}


# (id, parámetro) -> `despues` sin finalidades ni calificativos que no constan en la cita literal.
DESPUES = {
    ('ley-26-1985', 'revalorizacion'): 'Las pensiones causadas conforme a la Ley se revalorizan al comienzo de cada año según el IPC previsto para ese año.',
    ('rdleg-1-1994', 'revalorizacion'): 'Pensiones de jubilación e invalidez calculadas con los arts. 162.1 y 140 se revalorizan al comienzo de cada año según el IPC previsto.',
    ('ley-35-2002', 'edad-ordinaria'): 'Se habilita a reducir por Real Decreto la edad mínima de jubilación de personas con discapacidad igual o superior al 65 %.',
    ('ley-21-2021', 'coeficientes-reductores'): 'Se revisan los coeficientes reductores aplicables a la jubilación anticipada voluntaria.',
}


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def main():
    with open(RUTA, encoding='utf-8') as f:
        d = json.load(f)
    ids = [n['id'] for n in d['normas']]
    assert set(ids) == set(VIGOR), (set(ids) ^ set(VIGOR))
    errores = []
    for n in d['normas']:
        fecha, base, cita, ubic, texto = VIGOR[n['id']]
        if base != 'sin-texto':
            if texto is not None:
                with open(f'{REPO}/{texto}', encoding='utf-8') as f:
                    fuente = norm(f.read())
            else:
                fuente = norm(n.get('notas', '') + ' ' + ' '.join(c['transicion'] for c in n['cambios']))
            if norm(cita) not in fuente:
                errores.append((n['id'], cita[:80]))
        n['entradaEnVigor'] = {'fecha': fecha, 'base': base, 'cita': cita, 'ubicacion': ubic}
        n.pop('textoDescargado', None)
        if texto is not None:
            n['textoDescargado'] = texto
        for c in n['cambios']:
            if (n['id'], c['parametro']) in DESPUES:
                c['despues'] = DESPUES[(n['id'], c['parametro'])]
        if n['id'] in RESUMENES:
            n['resumen'] = RESUMENES[n['id']]
        # orden estable de las claves
        orden = ['id', 'titulo', 'rango', 'fecha', 'fechaPublicacion', 'boeId', 'fetchedAt', 'confidence',
                 'resumen', 'entradaEnVigor', 'textoDescargado', 'cambios', 'modulos', 'estado', 'notas', 'source']
        resto = [k for k in n if k not in orden]
        assert not resto, resto
        for k in list(n):
            v = n.pop(k)
            n[k] = v
        reorden = {k: n[k] for k in orden if k in n}
        n.clear()
        n.update(reorden)
    if errores:
        print('CITAS NO ENCONTRADAS', errores)
        sys.exit(1)
    with open(RUTA, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('normas', len(d['normas']), 'con fecha de entrada en vigor',
          sum(1 for n in d['normas'] if n['entradaEnVigor']['fecha']))


main()
