"""Reglas de prestaciones (data/normativa/prestaciones.json): incorpora la recogida de jubilación (brutos) y las
prestaciones añadidas en prestaciones_extra.py, verificando que cada cita literal consta en el texto descargado."""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DESCARGAS, HOY, REPO, texto  # noqa: E402

BRUTO = os.path.join(DESCARGAS, '..', 'brutos', 'prestaciones.json')


def norm(s):
    s = re.sub(r'\s*\|\s*', ' ', s)
    s = s.replace(' ', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def texto_doc(doc):
    ruta = f'{DESCARGAS}/{doc}_act.txt'
    if os.path.exists(ruta):
        with open(ruta, encoding='utf-8') as f:
            return norm(f.read())
    return norm(texto(doc))


def citas(ev):
    inner = re.findall(r'«([^»]+)»', ev)
    return inner if inner else [ev]


def verifica(p, fallos):
    docs = [p['source']['docId']] + [x['docId'] for x in p.get('fuentesAdicionales', [])]
    bases = []
    for d in docs:
        try:
            bases.append(texto_doc(d))
        except FileNotFoundError:
            pass
    for ev in p['evidencia']:
        for c in citas(ev):
            c = norm(c).strip('….[] ')
            trozos = [t.strip(' .…,;') for t in re.split(r'\s*(?:\[…\]|\.\.\.|…|\[\.\.\.\]|[\[\]])\s*', c)]
            for t in trozos:
                if len(t) > 15 and not any(t in b for b in bases):
                    fallos.append((p['id'], t[:90]))


if __name__ == '__main__':
    fallos = []
    with open(BRUTO, encoding='utf-8') as f:
        pres = json.load(f)['prestaciones']
    try:
        from prestaciones_extra import PRESTACIONES_EXTRA
        pres += PRESTACIONES_EXTRA
    except ImportError:
        pass
    PERMITIDAS = {'id', 'nombre', 'familia', 'modalidad', 'aQuienCubre', 'requisitos', 'calculo', 'limites', 'duracion',
                  'extincion', 'compatibilidades', 'articulos', 'source', 'fuentesAdicionales', 'fetchedAt', 'confidence',
                  'evidencia', 'modulos', 'notas'}
    for p in pres:
        extra = {k: p.pop(k) for k in list(p) if k not in PERMITIDAS}
        if extra:  # tablas auxiliares: se conservan como texto en las notas
            p['notas'] = (p.get('notas', '') + ' ' + ' '.join(f'[{k}] {json.dumps(v, ensure_ascii=False)}' for k, v in extra.items())).strip()
        p.setdefault('modulos', ['Tipos de pensión', 'Cómo se calcula'] if p['id'] in ('jubilacion-ordinaria', 'jubilacion-anticipada-involuntaria', 'jubilacion-anticipada-voluntaria', 'jubilacion-demorada') else ['Tipos de pensión'])
        p['fetchedAt'] = HOY
        verifica(p, fallos)
    ids = [p['id'] for p in pres]
    assert len(ids) == len(set(ids))
    obj = {'tipo': 'prestaciones', 'id': 'prestaciones-reglas', 'title': 'Reglas de las prestaciones contributivas y no contributivas',
           'description': 'A quién cubre cada prestación, requisitos, fórmula, límites, duración y compatibilidades, con el artículo del texto refundido de la Ley General de la Seguridad Social. Cada regla lleva citas literales del BOE.',
           'vigenteA': HOY, 'prestaciones': pres}
    with open(f'{REPO}/data/normativa/prestaciones.json', 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('prestaciones', len(pres), 'citas no encontradas', len(fallos))
    for x in fallos[:40]:
        print(' ', x)
