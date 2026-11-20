"""Ajustes actuariales 4. Aplica los estados de la cuarta tanda actuarial
(docs/revision-actuarial/aplicacion-tanda4.json, lista «afirmaciones») a los dos ficheros que no
genera scripts/etl/fuentes_claims.py:

  - docs/claims-web.json (afirmaciones de los textos de la web, que se mantenían a mano desde la
    Fase 3-A): filas con destino «claims-web»;
  - data/mitos/afirmaciones-circulantes.json (catálogo de afirmaciones circulantes): filas con clave
    «mito».

Ninguno de los dos se puede regenerar desde su origen sin perder los cambios de voz de la fase R1,
así que este script solo toca los campos de la revisión actuarial (y el texto y las notas cuando la
fila los da) de las afirmaciones listadas. Es idempotente: ejecutarlo dos veces da lo mismo.
Después se ejecuta scripts/etl/fuentes_claims.py, que lee los dos ficheros y escribe docs/claims.json.

Ejecutar desde la raíz del repositorio con `python3 -I scripts/etl/aplicar_tanda4.py`.
"""

import json
import os
import subprocess

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
APLICACION = f'{REPO}/docs/revision-actuarial/aplicacion-tanda4.json'
WEB = f'{REPO}/docs/claims-web.json'
MITOS = f'{REPO}/data/mitos/afirmaciones-circulantes.json'


def main():
    filas = json.load(open(APLICACION, encoding='utf-8'))['afirmaciones']

    web = json.load(open(WEB, encoding='utf-8'))
    por_id = {c['id']: c for c in web['claims']}
    for f in filas:
        if f['destino'] != 'claims-web':
            continue
        c = por_id[f['id']]
        c['revisionActuarial'] = f['estado']
        if f['estado'] == 'revisada':
            c['respuestaActuarial'] = f['respuestaActuarial']
            c.pop('preguntaActuarial', None)
        else:
            c['preguntaActuarial'] = f['preguntaReducida']
            c.pop('respuestaActuarial', None)
        for campo in ('texto', 'notas'):
            if campo in f:
                c[campo] = f[campo]
    # Afirmaciones cuyo estado no cambia: solo se actualizan las notas.
    for f in json.load(open(APLICACION, encoding='utf-8')).get('notas', []):
        if f['destino'] == 'claims-web':
            por_id[f['id']]['notas'] = f['notas']
    with open(WEB, 'w', encoding='utf-8') as s:
        json.dump(web, s, ensure_ascii=False, indent=2)
        s.write('\n')

    catalogo = json.load(open(MITOS, encoding='utf-8'))
    mitos = {m['id']: m for m in catalogo['mitos']}
    for f in filas:
        if 'mito' not in f:
            continue
        m = mitos[f['mito']]
        # Como en la tercera tanda: el catálogo conserva la pregunta y añade la referencia de la respuesta.
        m['revisionActuarial'] = f['estado']
        if f['estado'] == 'revisada':
            m['respuestaActuarial'] = f['respuestaActuarial']
    with open(MITOS, 'w', encoding='utf-8') as s:
        json.dump(catalogo, s, ensure_ascii=False, indent=2)
        s.write('\n')

    prettier = f'{REPO}/node_modules/.bin/prettier'
    subprocess.run([prettier, '--config', f'{REPO}/.prettierrc.json', '--log-level', 'warn', '--write', WEB, MITOS],
                   check=True, cwd=REPO)
    print('claims-web', sum(1 for f in filas if f['destino'] == 'claims-web'), 'mitos', sum(1 for f in filas if 'mito' in f))


if __name__ == '__main__':
    main()
