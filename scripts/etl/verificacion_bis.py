"""Resumen del contraste con segunda fuente de las reglas de la Fase 1A-bis (sección en
docs/INFORME_VERIFICACION.md). Los contrastes los hace reglas_futuras.py al generar los datos
(la cita de la segunda fuente se busca en su texto) y quedan en `crossCheck` de cada dato."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

FICHEROS = ['base-maxima-incremento-futuro', 'pension-maxima-incremento-futuro', 'revalorizacion-regla', 'pension-minima-regla',
            'opcion-25-anos-ventana', 'opcion-25-anos-divisor', 'opcion-25-anos-aplicable', 'lagunas-integracion', 'actualizacion-bases']
filas, total, ok = [], 0, 0
for f in FICHEROS:
    d = json.load(open(f'{REPO}/data/parametros/{f}.json', encoding='utf-8'))['data']
    con = [x for x in d if x.get('crossCheck')]
    bien = [x for x in con if x['crossCheck']['matches']]
    sin = [x['id'] for x in d if not x.get('crossCheck')]
    segundas = sorted({x['crossCheck']['source']['url'].split('id=')[-1].split('&')[0] for x in con})
    filas.append(f"| `{f}` | {len(d)} | {len(bien)} de {len(con)} | {', '.join(segundas) or '—'} | {', '.join(sin) if sin and len(sin) < 8 else (str(len(sin)) + ' datos' if sin else '—')} |")
    total += len(con); ok += len(bien)
md = ['## Fase 1A-bis: reglas de evolución futura y de cálculo', '',
      f'Fecha: {HOY}. Método: cada dato se contrasta con una segunda fuente descargada (RDL 2/2023 en su texto original para los puntos 1, 2 y 5; el art. 209 de 2016 para 300/350; la Ley 3/2012 para las lagunas de 2013) buscando la cita literal en su texto, '
      'y los resultados numéricos se comprueban contra los datos observados (test `scripts/coherencia-reglas-futuras.test.ts`: la base máxima de 2024-2026 crece la revalorización más 1,2 puntos y la pensión máxima de 2025-2026 la revalorización más 0,115 puntos).', '',
      f'Resultado: **{ok} de {total}** contrastes con segunda fuente coinciden.', '',
      '| Fichero | Datos | Contraste con segunda fuente | Segunda fuente (BOE) | Sin segunda fuente |', '| ------- | ----- | ---------------------------- | -------------------- | ------------------ |'] + filas + [
      '', 'Sin segunda fuente: la versión de 2010 de la integración de lagunas y las versiones de 2010, 2013 y 2016 de la actualización de bases (cada una consta solo en su texto consolidado; los textos de 2010 y 2013 coinciden entre sí en los 24 meses nominales), el suelo del art. 58.3 y los indicadores de aplicación de la revalorización (el RDL 2/2023 no modificó el apartado 3), y el factor sobre la mínima del art. 58.2.', '']
p = f'{REPO}/docs/INFORME_VERIFICACION.md'
inf = open(p, encoding='utf-8').read()
inf = re.sub(r'\n## Fase 1A-bis.*?(?=\n## |\Z)', '\n', inf, flags=re.S).rstrip() + '\n\n' + '\n'.join(md)
open(p, 'w', encoding='utf-8').write(inf)
print(ok, total)
