"""Fase 2-D: IPC mensual real (índice general nacional del INE). Escribe data/parametros/ipc-indice-mensual.json.

Tramos (todos de series del INE descargadas en la sesión; datos de partida en data-raw/ine/ipc-mensual/):
 A. 2002-01 en adelante: serie IPC290751 (base 2025), tal cual (confianza alta).
 B. 2001-01 a 2001-12 (enlazado, confianza media): índice de 2002 del mismo mes ÷ (1 + variación anual de ese mes de 2002),
    con las variaciones anuales publicadas por el INE (serie IPC290750, un decimal).
 C. 1992-01 a 2000-12 (enlazado, confianza media): serie IPC2401 (base 1992) multiplicada por el coeficiente que la
    iguala al tramo B en enero de 2001.
Entre la base 1992 (termina en 2001-12) y las demás bases (empiezan en 2002-01) no hay ningún mes de solape, y el propio INE
advierte (nota de la tabla 249, base 2001) de que no se pueden calcular variaciones entre los índices de los sistemas
IPC-92 e IPC-2001. Por eso el puente entre 2001 y 2002 son las variaciones publicadas por el INE (tramo B) y no un cociente
de índices. Las bases 2001 y 2006 empiezan también en 2002-01 (las tablas de índices nacionales del catálogo de la operación empiezan en 2002): no amplían la cobertura. Se comprueba que las
series de las bases 2001 y 2006 son proporcionales a la de base 2025 en 2002-2006 y 2002-2011 (cociente constante hasta el
quinto decimal): la base 2025 ya recoge su historia. Alternativa descartada y documentada (docs/DECISIONES.md): un único
coeficiente con la tasa mensual de enero de 2002 (serie IPC290752). Ejecutar con `python3 -I` y después `npx prettier --write`
sobre el JSON generado (el repositorio comprueba su formato).
"""
import hashlib, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, INE

RAW = f'{REPO}/data-raw/ine/ipc-mensual'
SALIDA = f'{REPO}/data/parametros/ipc-indice-mensual.json'
FECHA = '2026-11-13'


def cargar(cod):
    ruta = f'{RAW}/{cod}.json'
    with open(ruta, 'rb') as f:
        bruto = f.read()
    origen = json.load(open(f'{RAW}/origen.json'))[f'{cod}.json']
    if hashlib.sha256(bruto).hexdigest() != origen['sha256']:
        raise SystemExit(f'{cod}: el SHA-256 no coincide con origen.json')
    d = json.loads(bruto)
    serie = {(e['Anyo'], e['FK_Periodo']): e['Valor'] for e in d['Data'] if e['Valor'] is not None}
    return d['Nombre'].strip(), serie, origen['url']


def mes_ant(a, m):
    return (a, m - 1) if m > 1 else (a - 1, 12)


def mes_sig(a, m):
    return (a, m + 1) if m < 12 else (a + 1, 1)


def comprobar_proporcionalidad(i25):
    """Cociente base 2025 / base 2001 (2002-2006) y / base 2006 (2002-2011): constante hasta el 5.º decimal."""
    informe = {}
    for cod, hasta in (('IPC4191', 2006), ('IPC77344', 2011)):
        _, s, _ = cargar(cod)
        cs = [i25[k] / s[k] for k in sorted(s) if k[0] <= hasta]
        dif = max(cs) - min(cs)
        if dif > 5e-5:
            raise SystemExit(f'{cod}: no proporcional a la base 2025 (dif. {dif})')
        informe[cod] = (len(cs), min(cs), max(cs))
    return informe


def coma(x):
    return str(x).replace('.', ',')


def main():
    nom25, i25, url25 = cargar('IPC290751')
    nomm, vmen, urlm = cargar('IPC290752')
    noma, vanu, urla = cargar('IPC290750')
    nom92, i92, url92 = cargar('IPC2401')
    ult = max(i25)
    k = (2002, 1)
    while k < ult:
        k = mes_sig(*k)
        if k not in i25:
            raise SystemExit(f'hueco en IPC290751: {k}')
    for m in range(1, 13):
        if (2002, m) not in vanu:
            raise SystemExit(f'falta la variación anual de 2002-{m:02d} (IPC290750)')
    for a in range(1992, 2002):
        for m in range(1, 13):
            if (a, m) not in i92:
                raise SystemExit(f'hueco en IPC2401: {a}-{m:02d}')
    prop = comprobar_proporcionalidad(i25)

    # Tramo B: 2001 con las variaciones anuales de 2002 (puente publicado por el INE entre IPC-92 e IPC-2001)
    tramo_b = {m: i25[(2002, m)] / (1 + vanu[(2002, m)] / 100) for m in range(1, 13)}
    # Tramo C: base 1992 igualada al tramo B en enero de 2001
    coef = tramo_b[1] / i92[(2001, 1)]
    # Alternativa descartada: un único coeficiente con la tasa mensual de enero de 2002
    coef_alt = i25[(2002, 1)] / (1 + vmen[(2002, 1)] / 100) / i92[(2001, 12)]

    f25 = {'title': 'Índice de Precios de Consumo (IPC). Nacional, índice general (serie IPC290751, base 2025)',
           'publisher': INE, 'url': url25, 'docId': 'IPC290751'}
    fb = {'title': 'Índice de Precios de Consumo (IPC). Nacional, índice general, variación anual (serie IPC290750), aplicada al índice de la serie IPC290751 (base 2025)',
          'publisher': INE, 'url': urla, 'docId': 'IPC290750'}
    fc = {'title': 'Índice de Precios de Consumo (IPC). Nacional, índice general, base 1992 (serie IPC2401)',
          'publisher': INE, 'url': url92, 'docId': 'IPC2401'}
    datos = []
    for a in range(1992, 2001):
        for m in range(1, 13):
            v = i92[(a, m)]
            datos.append({
                'id': f'{a}-{m:02d}',
                'value': round(v * coef, 3),
                'unit': 'índice (base 2025)',
                'period': str(a),
                'source': fc,
                'fetchedAt': FECHA,
                'confidence': 'media',
                'notes': f'Tramo C, enlazado: índice base 1992 por el coeficiente {coef:.8f}, redondeado a 3 decimales. '
                         'Coeficiente = índice de enero de 2001 del tramo B ÷ índice base 1992 de enero de 2001. '
                         'Sin mes de solape entre las bases: incertidumbre del redondeo de la variación anual de enero de 2002 (± 0,05 puntos).',
                'quote': f'Base 1992, {a}M{m:02d}: {coma(v)}; enlace: base 1992 de 2001M01 {coma(i92[(2001, 1)])}, tramo B de 2001M01 {coma(round(tramo_b[1], 3))}',
                'location': 'serie IPC2401 (Tempus3)',
            })
    for m in range(1, 13):
        v = tramo_b[m]
        datos.append({
            'id': f'2001-{m:02d}',
            'value': round(v, 3),
            'unit': 'índice (base 2025)',
            'period': '2001',
            'source': fb,
            'fetchedAt': FECHA,
            'confidence': 'media',
            'notes': 'Tramo B, enlazado: índice de 2002 del mismo mes ÷ (1 + variación anual de ese mes de 2002 publicada por el INE, un decimal), redondeado a 3 decimales. '
                     'El INE no publica el índice de 2001 en la base 2025 y advierte de que no se pueden calcular variaciones entre los índices de IPC-92 e IPC-2001. '
                     'Incertidumbre del redondeo de la variación anual (± 0,05 puntos).',
            'quote': f'2002M{m:02d}: índice {coma(i25[(2002, m)])}; variación anual {coma(vanu[(2002, m)])} %',
            'location': 'series IPC290751 e IPC290750 (Tempus3)',
        })
    for (a, m) in sorted(i25):
        v = i25[(a, m)]
        datos.append({
            'id': f'{a}-{m:02d}',
            'value': v,
            'unit': 'índice (base 2025)',
            'period': str(a),
            'source': f25,
            'fetchedAt': FECHA,
            'confidence': 'alta',
            'quote': f'Índice general {a}M{m:02d}: {coma(v)}',
            'location': 'serie IPC290751 del INE (Tempus3)',
        })
    datos.sort(key=lambda d: d['id'])
    ultimo = max(i25)
    archivo = {
        'tipo': 'datos',
        'id': 'ipc-indice-mensual',
        'title': 'IPC: índice general nacional mensual (base 2025)',
        'description': (
            'Índice mensual del índice general nacional del IPC del INE (base 2025 = 100), con el identificador AAAA-MM (el campo period es el año). '
            f'Tres tramos: de enero de 2002 a {ultimo[0]}-{ultimo[1]:02d}, la serie IPC290751 sin transformar (confianza alta); 2001, enlazado con las variaciones anuales de 2002 '
            'publicadas por el INE (serie IPC290750); de enero de 1992 a diciembre de 2000, la serie IPC2401 (base 1992) enlazada con un coeficiente (confianza media en los dos tramos enlazados). '
            'Es la serie que usa el motor para actualizar las bases de cotización (lectura jubilacion.interpolacionIPC = mensual-ine). '
            'La serie de medias anuales (ipc-indice-medio-anual) se mantiene para la conversión a euros constantes. '
            'Generado por scripts/etl/ipc_mensual.py; datos de partida en data-raw/ine/ipc-mensual/.'
        ),
        'data': datos,
    }
    with open(SALIDA, 'w', encoding='utf-8') as f:
        json.dump(archivo, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{len(datos)} meses: 1992-01..{ultimo[0]}-{ultimo[1]:02d}; coeficiente tramo C {coef:.8f}; alternativa descartada (tasa mensual de ene-2002): {coef_alt:.8f}')
    print('índice de 2001-12 en la base 2025: tramo B', round(tramo_b[12], 3), '; alternativa', round(coef_alt * i92[(2001, 12)], 3))
    print('proporcionalidad:', prop)


if __name__ == '__main__':
    main()
