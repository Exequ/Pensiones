"""Cronología normativa: incorpora las normas recogidas (brutos) y las añadidas aquí, comprobando que cada
cita literal («evidencia») consta en el texto del documento del BOE descargado."""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DESCARGAS, HOY, REPO, fuente, texto  # noqa: E402

BRUTO = os.path.join(DESCARGAS, '..', 'brutos', 'cronologia.json')
EXTRA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cronologia_extra.json')


def norm(s):
    s = re.sub(r'\s*\|\s*', ' ', s)
    return re.sub(r'\s+', ' ', s).strip(' «»…."')


def en_texto(doc, ev):
    base = norm(texto(doc))
    for trozo in re.split(r'\s*(?:\|\||…|\.\.\.|\[\.\.\.\])\s*', ev):
        t = norm(trozo)
        if len(t) > 12 and t not in base:
            return False
    return True


def prepara(n, fallos):
    n = dict(n)
    doc = n['boeId']
    n.pop('url', None)
    n['source'] = fuente(doc)
    m = re.search(r'Boletín Oficial del Estado (\d{4})(\d\d)(\d\d)', texto(doc))
    if m:  # fecha de publicación tomada de los metadatos del documento
        n['fechaPublicacion'] = f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
    n['fetchedAt'] = HOY
    for c in n['cambios']:
        if not en_texto(doc, c['evidencia']):
            fallos.append((n['id'], c['parametro'], c['evidencia'][:80]))
    return n


if __name__ == '__main__':
    fallos = []
    with open(BRUTO, encoding='utf-8') as f:
        normas = [prepara(n, fallos) for n in json.load(f)['normas']]
    from cronologia_normas import NORMAS_EXTRA
    normas += [prepara(n, fallos) for n in NORMAS_EXTRA]
    ids = [n['id'] for n in normas]
    assert len(ids) == len(set(ids)), 'ids repetidos'
    normas.sort(key=lambda n: n['fecha'])
    obj = {'tipo': 'cronologia', 'id': 'cronologia-reformas',
           'title': 'Cronología de las reformas de las pensiones públicas (1985-2026)',
           'description': 'Normas que han modificado los parámetros de las pensiones contributivas del sistema de la Seguridad Social: qué cambió, antes y después, y con qué transición. Cada cambio lleva la cita literal del BOE.',
           'normas': normas}
    os.makedirs(f'{REPO}/data/normativa', exist_ok=True)
    with open(f'{REPO}/data/normativa/cronologia.json', 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('normas', len(normas), 'cambios', sum(len(n['cambios']) for n in normas))
    print('CITAS NO ENCONTRADAS', len(fallos))
    for x in fallos:
        print(' ', x)
