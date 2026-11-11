"""C1 de la Fase 1C: auditoría global de /data. Genera docs/AUDITORIA_DATOS.md.

Recorre todos los JSON (y los CSV hermanos de las tablas) y resume: matriz de cobertura (series por carpeta, primer y último periodo, huecos),
elementos sin fuente o sin fecha, confianza baja, datos derivados, unidades inconsistentes y duplicados. Ejecutar con `python3 -I`.
"""
import collections, csv, glob, hashlib, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

D = f'{REPO}/data'


def es_anual(p):
    return re.fullmatch(r'\d{4}', p) is not None


def huecos(periodos):
    """Años que faltan entre el primero y el último de una serie anual (o trimestres de una trimestral)."""
    an = sorted({int(p) for p in periodos if es_anual(p)})
    if len(an) >= 2:
        return [y for y in range(an[0], an[-1] + 1) if y not in set(an)]
    tr = sorted({(int(p[:4]), int(p[-1])) for p in periodos if re.fullmatch(r'\d{4}-T[1-4]', p)})
    if len(tr) >= 2:
        s = set(tr)
        out = []
        y, q = tr[0]
        while (y, q) != tr[-1]:
            q += 1
            if q == 5:
                y, q = y + 1, 1
            if (y, q) not in s:
                out.append(f'{y}-T{q}')
        return out
    return []


def norm_unidad(u):
    return re.sub(r'[^a-z0-9%]', '', u.lower().replace('euros', 'eur').replace('millones de', 'm'))


def main():
    ficheros = sorted(glob.glob(f'{D}/*/*.json'))
    filas_cob = []            # carpeta, fichero, tipo, elementos, primero, ultimo, huecos
    sin_fuente, sin_fecha, baja, derivadas = [], [], [], []
    unidades = collections.defaultdict(set)
    por_prefijo = collections.defaultdict(lambda: collections.defaultdict(set))
    huecos_series = []
    hashes = collections.defaultdict(list)
    dup_filas = []
    tablas = []
    for f in ficheros:
        carpeta, nombre = f.split('/')[-2], os.path.basename(f)[:-5]
        j = json.load(open(f, encoding='utf-8'))
        tipo = j.get('tipo', 'datos')
        rel = f'{carpeta}/{nombre}'
        elementos = 0
        periodos = set()
        if tipo == 'tabla':
            filas = list(csv.DictReader(open(f[:-5] + '.csv', encoding='utf-8')))
            elementos = len(filas)
            cols = j['columnas']
            claves_dim = [c['id'] for c in cols if c['unidad'] is None or c['id'] in ('anio', 'mes', 'edad', 'edad_madre', 'periodo', 'ejercicio')]
            col_anio = next((c for c in ('anio', 'ejercicio', 'periodo') if c in filas[0]), None)
            if col_anio:
                periodos = {x[col_anio][:7] if col_anio == 'periodo' else x[col_anio] for x in filas}
                if col_anio == 'periodo':
                    periodos = {x[col_anio] for x in filas}
            if not j.get('source', {}).get('url'):
                sin_fuente.append(rel)
            if not j.get('fetchedAt'):
                sin_fecha.append(rel)
            if j.get('confidence') == 'baja':
                baja.append(f'{rel} (tabla)')
            if 'derivad' in (j.get('description', '') + j.get('notes', '')).lower():
                derivadas.append(f'{rel} (tabla; contiene datos derivados indicados en su descripción o notas)')
            # duplicados de clave de dimensiones
            if claves_dim:
                cnt = collections.Counter(tuple(x.get(c, '') for c in claves_dim) for x in filas)
                dups = [k for k, v in cnt.items() if v > 1]
                if dups:
                    dup_filas.append((rel, len(dups), dups[0]))
            tablas.append(rel)
            for c in cols:
                if c['unidad']:
                    unidades[c['unidad']].add(f'{rel}#{c["id"]}')
        for s in j.get('series', []):
            elementos += 1
            pts = [p['period'] for p in s['points']]
            periodos |= set(pts)
            h = huecos(pts)
            if h:
                huecos_series.append((rel, s['id'], h))
            if not s.get('source', {}).get('url'):
                sin_fuente.append(f'{rel}#{s["id"]}')
            if not s.get('fetchedAt'):
                sin_fecha.append(f'{rel}#{s["id"]}')
            if s.get('confidence') == 'baja':
                baja.append(f'{rel}#{s["id"]}')
            if 'derivad' in (s.get('notes', '') + s.get('title', '')).lower():
                derivadas.append(f'{rel}#{s["id"]}')
            unidades[s['unit']].add(f'{rel}#{s["id"]}')
            hashes[hashlib.md5(json.dumps([s['unit'], [(p['period'], p['value']) for p in s['points']]]).encode()).hexdigest()].append(f'{rel}#{s["id"]}')
        for d in j.get('data', []):
            elementos += 1
            periodos.add(d['period'])
            if not d.get('source', {}).get('url'):
                sin_fuente.append(f'{rel}#{d["id"]}')
            if not d.get('fetchedAt'):
                sin_fecha.append(f'{rel}#{d["id"]}')
            if d.get('confidence') == 'baja':
                baja.append(f'{rel}#{d["id"]}')
            if 'derivad' in (d.get('notes', '') or '').lower():
                derivadas.append(f'{rel}#{d["id"]}')
            unidades[d['unit']].add(f'{rel}#{d["id"]}')
            por_prefijo[rel][re.sub(r'^\d{4}-', '', d['id'])].add(d['unit'])
        for x in j.get('normas', []) + j.get('prestaciones', []) + j.get('mitos', []):
            elementos += 1
        ps = sorted(p for p in periodos if re.match(r'\d{4}', p))
        gap = ''
        if tipo == 'datos' and j.get('series'):
            gap = str(sum(1 for r in huecos_series if r[0] == rel))
        filas_cob.append((carpeta, nombre, tipo, elementos, ps[0] if ps else '', ps[-1] if ps else '', gap))
    # unidades inconsistentes: mismo identificador de dato con unidades distintas dentro de un fichero, y grafías casi iguales
    incons = [(rel, pre, sorted(u)) for rel, m in por_prefijo.items() for pre, u in m.items() if len(u) > 1]
    grafias = collections.defaultdict(set)
    for u in unidades:
        grafias[norm_unidad(u)].add(u)
    grafias = {k: sorted(v) for k, v in grafias.items() if len(v) > 1}
    dup_series = [v for v in hashes.values() if len(v) > 1]
    L = ['# Auditoría de los datos', '', f'Generada el {HOY} por `scripts/etl/auditoria.py`: no edites a mano. Recorre {len(ficheros)} ficheros JSON de `/data` y sus CSV hermanos.', '',
         '## Resumen', '']
    por_car = collections.defaultdict(lambda: [0, 0, 0])
    for c, n, t, e, a, b, g in filas_cob:
        por_car[c][0] += 1
        por_car[c][1] += e
    L += ['| Carpeta | Ficheros | Elementos (series, datos, filas de tabla, normas, prestaciones, afirmaciones) |', '| --- | ---: | ---: |']
    for c, v in sorted(por_car.items()):
        L.append(f'| {c} | {v[0]} | {v[1]} |')
    L += ['', f'- Elementos sin fuente con URL: **{len(sin_fuente)}**. Sin fecha de descarga: **{len(sin_fecha)}**. (El esquema ya los rechaza: `validate:data` falla.)',
          f'- Con confianza baja: **{len(baja)}**. Derivados (marcados en título, descripción o notas): **{len(derivadas)}**.',
          f'- Series anuales o trimestrales con huecos: **{len(huecos_series)}**. Unidades con grafías casi iguales: **{len(grafias)}**. Identificadores de dato con unidades distintas en un fichero: **{len(incons)}**.',
          f'- Series duplicadas (misma unidad y mismos puntos) entre ficheros: **{len(dup_series)}**. Tablas con claves de dimensión repetidas: **{len(dup_filas)}**.', '',
          '## Matriz de cobertura', '', 'Primer y último periodo de cada fichero (años, o años de la primera columna de periodo de las tablas) y número de series con huecos (años o trimestres que faltan entre el primero y el último de la serie).', '',
          '| Carpeta | Fichero | Tipo | Elementos | Primer periodo | Último periodo | Series con huecos |', '| --- | --- | --- | ---: | --- | --- | ---: |']
    for c, n, t, e, a, b, g in filas_cob:
        L.append(f'| {c} | {n} | {t} | {e} | {a} | {b} | {g} |')
    L += ['', '## Huecos en series', '']
    if huecos_series:
        L += ['| Fichero | Serie | Periodos que faltan |', '| --- | --- | --- |']
        for rel, sid, h in huecos_series[:80]:
            L.append(f'| {rel} | {sid} | {", ".join(map(str, h[:12]))}{" …" if len(h) > 12 else ""} ({len(h)}) |')
        if len(huecos_series) > 80:
            L.append(f'| … | {len(huecos_series) - 80} series más | |')
        L.append('')
        L.append('Los huecos de `internacional/ocde-espana` son años en que la OCDE no publica la medida (varias se publican con periodicidad irregular: las series de renta de los mayores solo tienen años pares desde 2014 y el gasto sobre PIB, algunos años). Los de otras carpetas, si los hubiera, estarían explicados en `docs/PENDIENTE_DATOS.md`.')
    else:
        L.append('Ninguno.')
    L += ['', '## Confianza baja', ''] + ([f'- {x}' for x in baja] or ['Ninguno.'])
    L += ['', '## Datos derivados', '', 'Calculados por este proyecto a partir de datos publicados (no publicados por la fuente). Conviene tratarlos como cálculos propios.', '']
    L += [f'- {x}' for x in derivadas[:200]] + ([f'- … {len(derivadas) - 200} más'] if len(derivadas) > 200 else [])
    L += ['', '## Unidades', '', 'Grafías de unidad que solo difieren en mayúsculas, espacios o signos (candidatas a unificar si las series se combinan):', '']
    L += ([f'- {" | ".join(v)}' for v in grafias.values()] or ['Ninguna.'])
    L += ['', 'Identificadores de dato (sin el año inicial) con más de una unidad dentro del mismo fichero:', '']
    L += ([f'- {rel}: `{pre}` → {", ".join(u)}' for rel, pre, u in incons[:60]] or ['Ninguno.'])
    L += ['', '## Duplicados', '', 'Series con la misma unidad y los mismos puntos en ficheros distintos:', '']
    EXPLICA = {'europop2025-migracion-neta-total': 'misma magnitud (migración neta) de dos conjuntos de Eurostat (proj_25nanmig y proj_25ndbi)', 'saldo-exterior-derivado': 'el saldo derivado de la tabla por edad coincide con el publicado por la EMCR (comprobación de la verificación 1B-3)',
               'razon-etcl-coste-salarial-total': 'la razón del coste salarial mensual con la base máxima mensual es igual a la del coste anual (×12) con la base máxima anual: dos formas de expresar la misma razón'}
    for v in dup_series:
        ex = next((t for k, t in EXPLICA.items() if any(k in x for x in v)), 'sin explicación registrada')
        L.append(f'- {" = ".join(v)} — {ex}')
    if not dup_series:
        L.append('Ninguna.')
    L += ['', 'Tablas con claves de dimensión repetidas:', '']
    L += ([f'- {rel}: {n} claves repetidas (por ejemplo {k})' for rel, n, k in dup_filas] or ['Ninguna.'])
    open(f'{REPO}/docs/AUDITORIA_DATOS.md', 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    resumen = {'ficheros': len(ficheros), 'sin_fuente': len(sin_fuente), 'sin_fecha': len(sin_fecha), 'baja': len(baja), 'derivadas': len(derivadas), 'huecos': len(huecos_series),
               'grafias': len(grafias), 'incons': len(incons), 'dup_series': len(dup_series), 'dup_tablas': len(dup_filas)}
    json.dump(resumen, open(f'{REPO}/docs/auditoria-datos.json', 'w'), indent=1)
    print(resumen)
    for x in dup_series[:5]:
        print('dup', x)
    for x in dup_filas[:5]:
        print('dupfilas', x)
    for x in incons[:5]:
        print('incons', x)
    for v in list(grafias.values())[:8]:
        print('grafia', v)


if __name__ == '__main__':
    main()
