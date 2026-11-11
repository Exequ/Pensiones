"""Fondo de Reserva de la Seguridad Social: valor, dotaciones, rendimientos y disposiciones.

Fuente: informes anuales a las Cortes Generales (Seguridad Social, Fondo de Reserva): el de 2017
(tabla de 2009 a 2017), el de 2024 y el de 2025 (tabla de 2018 a 2025). Modo `descargar`
(URL de cada informe) o `local` (PDF en data-raw/seg-social-fin/fondo-reserva/<nombre>.pdf; no se
versionan: pesan hasta 12 MB; se guarda la huella). Texto con `pdftotext -layout`.
Escribe data/sistema/fondo-reserva-anual.{csv,json} (millones de euros). `python3 -I`."""
import csv, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, escribe_tabla, escribe_series

RAW = f'{REPO}/data-raw/seg-social-fin/fondo-reserva'
MODO = os.environ.get('MODO', 'descargar')
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
INFORMES = {
    '2017': ('Report to Parliament 2017', 'https://www.seg-social.es/descarga/en/20180719FR2017DI'),
    '2024': ('Report to Parliament 2024', 'https://www.seg-social.es/descarga/en/15072025_Report%20to%20Parliament%202024'),
    '2025': ('Report to Parliament 2025', 'https://www.seg-social.es/descarga/en/Report%20to%20Parliament%202025'),
}


def texto(clave):
    pdf = f'{RAW}/{clave}.pdf'
    if MODO == 'descargar' and not os.path.exists(pdf):
        os.makedirs(RAW, exist_ok=True)
        subprocess.run(['curl', '-sSL', '--max-time', '300', '-o', pdf, INFORMES[clave][1]], check=True)
    t = re.sub(r'[\x00-\x08]', '', subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout)
    return t, hashlib.sha256(open(pdf, 'rb').read()).hexdigest()


def numeros(linea):
    m = list(re.finditer(r'[A-Za-zÁÉÍÓÚáéíóú*]', linea))
    if m:  # se descarta el rótulo (puede contener «1.», «3.»)
        linea = linea[m[-1].end():]
    return [int(x.replace(',', '')) for x in re.findall(r'-?\d{1,3}(?:,\d{3})+|-?\d+', linea.replace('−', '-'))]


# Cada informe: años de las columnas (la primera es un acumulado hasta ese año) y primer valor de cada fila,
# que la identifica sin depender de rótulos partidos en varias líneas (cambian entre informes).
REPORTES = {
    '2017': dict(anios=[2009] + list(range(2010, 2018)), ancla=dict(dot=50750, exc=50373, mut=377, rend=9272, valor=60022), disp=(2012, [-7003, -18651, -33951, -47201, -67337, -74437]), mei={}),
    '2024': dict(anios=[2016] + list(range(2017, 2025)), ancla=dict(dot=53598, exc=52113, mut=1485, rend=28759, disp=-67337, valor=15020), mei={2023: 2218, 2024: 5794}),
    '2025': dict(anios=[2017] + list(range(2018, 2026)), ancla=dict(dot=53600, exc=52113, mut=1487, rend=28932, disp=-74437, valor=8095), mei={2023: 2218, 2024: 5794, 2025: 10150}),
}


def leer(t, cfg):
    filas = [numeros(l) for l in t.splitlines()]
    n = len(cfg['anios'])
    res = {}
    for k, ancla in cfg['ancla'].items():
        v = next((f for f in filas if len(f) == n and f[0] == ancla), None)
        if v is None:
            raise SystemExit(f'fila {k} (ancla {ancla}) no encontrada')
        res[k] = v
    if 'disp' not in res:  # informe de 2017: disposiciones solo desde 2012
        desde, vals = cfg['disp']
        f = next((f for f in filas if f == vals), None)
        if f is None:
            raise SystemExit('fila de disposiciones no encontrada')
        res['disp'] = [0] * (n - len(vals)) + vals
    for anio, v in cfg['mei'].items():  # el MEI debe aparecer en el texto del informe
        if v not in [x for f in filas for x in f]:
            raise SystemExit(f'MEI {anio}: {v} no aparece en el informe')
    return res


def main():
    out, origenes = {}, []
    for clave, cfg in REPORTES.items():
        t, h = texto(clave)
        origenes.append({'period': clave, 'url': INFORMES[clave][1], 'sha256': h})
        r = leer(t, cfg)
        for k, a in enumerate(cfg['anios']):
            nuevo = {'valor': r['valor'][k], 'dot': r['dot'][k], 'exc_eg': r['exc'][k], 'exc_mut': r['mut'][k], 'mei': cfg['mei'].get(a, 0), 'rend': r['rend'][k], 'disp': r['disp'][k]}
            if a in out and out[a] != nuevo:
                raise SystemExit(f'incoherencia entre informes en {a}: {out[a]} {nuevo}')
            out[a] = nuevo
    anios = sorted(out)
    filas = []
    for a in anios:
        o = out[a]
        anual = lambda c: (o[c] - out[a - 1][c]) if a - 1 in out else ''
        filas.append((a, o['valor'], o['dot'], o['exc_eg'], o['exc_mut'], o['mei'], o['rend'], o['disp'], anual('dot'), anual('mei'), anual('disp')))
    with open(f'{REPO}/data/sistema/fondo-reserva-anual.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['anio', 'valor_fondo_meur', 'dotaciones_acumuladas_meur', 'dotaciones_excedentes_entidades_acum_meur', 'dotaciones_excedentes_mutuas_acum_meur', 'dotaciones_mei_acum_meur', 'rendimientos_netos_acum_meur', 'disposiciones_acum_meur', 'dotaciones_anuales_meur', 'dotaciones_mei_anuales_meur', 'disposiciones_anuales_meur'])
        w.writerows(filas)
    fuente = {'title': 'Fondo de Reserva de la Seguridad Social: informes anuales a las Cortes Generales (tabla «Reserve Fund general performance» y «FRSS performance»)', 'publisher': SS,
              'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/FondoReserva/39728/1726/1727'}
    escribe_tabla('sistema', 'fondo-reserva-anual',
        'Fondo de Reserva de la Seguridad Social: valor, dotaciones, rendimientos y disposiciones a 31 de diciembre (2009-2025), millones de euros',
        'Datos acumulados desde 2000 a 31 de diciembre de cada año, tal como los publican los informes a las Cortes Generales (valor a precio de adquisición). '
        'Las disposiciones son negativas. Las columnas «anuales» son la diferencia entre dos años consecutivos de las acumuladas publicadas (dato derivado; la primera fila no tiene diferencia). '
        'Los años 2009-2017 proceden del informe de 2017 (2009 acumula desde 2000), 2018-2025 de los informes de 2024 y 2025 (coinciden entre sí y con el de 2017 en 2017).',
        [('anio', 'Año (a 31 de diciembre)', None), ('valor_fondo_meur', 'Valor del Fondo de Reserva', 'millones de euros'), ('dotaciones_acumuladas_meur', 'Dotaciones acumuladas desde 2000', 'millones de euros'),
         ('dotaciones_excedentes_entidades_acum_meur', 'Dotaciones acumuladas de excedentes de entidades gestoras y servicios comunes (acuerdo de Consejo de Ministros)', 'millones de euros'),
         ('dotaciones_excedentes_mutuas_acum_meur', 'Dotaciones acumuladas de excedentes de las mutuas', 'millones de euros'),
         ('dotaciones_mei_acum_meur', 'Dotaciones acumuladas con cargo a la cotización finalista del MEI', 'millones de euros'),
         ('rendimientos_netos_acum_meur', 'Rendimientos netos acumulados (tras ajustes por amortización/desinversión)', 'millones de euros'),
         ('disposiciones_acum_meur', 'Disposiciones acumuladas (negativas)', 'millones de euros'),
         ('dotaciones_anuales_meur', 'Dotaciones del año (derivado)', 'millones de euros'), ('dotaciones_mei_anuales_meur', 'Dotaciones del año con cargo al MEI (derivado)', 'millones de euros'),
         ('disposiciones_anuales_meur', 'Disposiciones del año (derivado, negativas)', 'millones de euros')],
        len(filas), fuente, origenes, confidence='alta',
        notes='Las dotaciones de excedentes de entidades no varían desde 2010 (52.113); las de mutuas siguen la gestión de la incapacidad temporal por contingencias comunes y de las contingencias profesionales. Datos anteriores a 2009 solo por año acumulado en los informes antiguos (ver docs/PENDIENTE_DATOS.md).')
    pts = lambda i, f=lambda x: x: [{'period': str(r[0]), 'value': f(r[i])} for r in filas if r[i] != '']
    nota = 'Valor a 31 de diciembre a precio de adquisición, tal como lo publican los informes a las Cortes Generales; detalle y procedencia por año en data/sistema/fondo-reserva-anual.json.'
    escribe_series('sistema', 'fondo-reserva-series', 'Fondo de Reserva de la Seguridad Social: valor y flujos anuales (2009-2025)', 'Series derivadas de la tabla fondo-reserva-anual.',
        [{'id': 'valor-fin-ano', 'title': 'Valor del Fondo de Reserva a 31 de diciembre', 'unit': 'millones de euros', 'source': fuente, 'confidence': 'alta', 'notes': nota, 'points': pts(1)},
         {'id': 'disposiciones-anuales', 'title': 'Disposiciones anuales del Fondo de Reserva (negativas)', 'unit': 'millones de euros', 'source': fuente, 'confidence': 'media', 'notes': nota + ' Dato derivado: diferencia de las disposiciones acumuladas publicadas.', 'points': pts(10)},
         {'id': 'dotaciones-mei-anuales', 'title': 'Dotaciones anuales al Fondo de Reserva con cargo al MEI', 'unit': 'millones de euros', 'source': fuente, 'confidence': 'media', 'notes': nota + ' Dato derivado: diferencia de las dotaciones MEI acumuladas publicadas.', 'points': pts(9)}])
    print('años', anios[0], anios[-1], len(filas))


if __name__ == '__main__':
    main()
