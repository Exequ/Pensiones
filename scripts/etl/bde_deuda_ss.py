"""Fase 5-A2: deuda PDE de las Administraciones de Seguridad Social (Banco de España).

Serie trimestral `DTNPDE2010_P00000_PS_ASG` del Boletín Estadístico (BIE), «Deuda PDE. Admón.
Seguridad Social», en millones de euros, desde 1994-T4. El Banco de España atribuye la variación
reciente de esta deuda a los préstamos del Estado a la TGSS (nota de prensa trimestral, nota 5).
Modo `descargar` (API REST del BIE; guarda el JSON en data-raw/bde/) o `local` (usa ese JSON).
La fecha de cada observación del BIE es el primer día del trimestre (2025-10-01 = 2025-T4).
Escribe data/sistema/deuda-pde-seguridad-social.json. `python3 -I`."""
import hashlib, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, escribe_series

SERIE = 'DTNPDE2010_P00000_PS_ASG'
RAW = f'{REPO}/data-raw/bde'
FICHERO = f'{RAW}/{SERIE}.json'
MODO = os.environ.get('MODO', 'descargar')
API = f'https://app.bde.es/bierest/resources/srdatosapp/listaSeries?idioma=es&series={SERIE}&rango=MAX'
URL_SERIE = f'https://app.bde.es/bie_www?SERIE={SERIE}'
BDE = 'Banco de España'


def leer():
    if MODO == 'descargar' and not os.path.exists(FICHERO):
        os.makedirs(RAW, exist_ok=True)
        subprocess.run(['curl', '-sS', '--compressed', '--max-time', '90', '-o', FICHERO, API], check=True)
    with open(FICHERO, 'rb') as f:
        crudo = f.read()
    return json.loads(crudo), hashlib.sha256(crudo).hexdigest()


def trimestre(fecha):
    """'2025-10-01T08:15:00Z' -> '2025-T4' (la marca del BIE es el primer día del trimestre)."""
    anio, mes = int(fecha[:4]), int(fecha[5:7])
    if mes not in (1, 4, 7, 10) or fecha[8:10] != '01':
        raise SystemExit(f'fecha de trimestre inesperada: {fecha}')
    return f'{anio}-T{(mes - 1) // 3 + 1}'


def main():
    d, huella = leer()
    s = d[0]
    if s['serie'] != SERIE or s['codFrecuencia'] != 'Q':
        raise SystemExit('serie o frecuencia inesperadas')
    trimestral = sorted((trimestre(f), v) for f, v in zip(s['fechas'], s['valores']))
    if len({t for t, _ in trimestral}) != len(trimestral):
        raise SystemExit('trimestres repetidos')
    # Control de continuidad: ningún trimestre intermedio sin dato.
    esperados = (int(trimestral[-1][0][:4]) - int(trimestral[0][0][:4])) * 4 + int(trimestral[-1][0][-1]) - int(trimestral[0][0][-1]) + 1
    if esperados != len(trimestral):
        raise SystemExit(f'faltan trimestres: {esperados} esperados, {len(trimestral)} recibidos')
    fin_ano = [(t[:4], v) for t, v in trimestral if t.endswith('T4')]
    fuente = {
        'title': f'Boletín Estadístico: {s["descripcion"]} ({SERIE}), serie trimestral',
        'publisher': BDE,
        'url': URL_SERIE,
    }
    nota = (
        f'Banco de España, BIE, serie {SERIE} («{s["descripcion"]}»; unidad: millones de euros; frecuencia trimestral), '
        f'descargada de la API del BIE ({API}); sha256 del JSON: {huella}. Deuda según el Protocolo de Déficit Excesivo (PDE): '
        'pasivos en efectivo y depósitos, valores y préstamos a valor nominal; la del subsector Seguridad Social no se consolida con la '
        'de otros subsectores. La nota de prensa trimestral del Banco de España explica que la variación de esta deuda se debe a '
        'los préstamos concedidos por el Estado a la Tesorería General de la Seguridad Social, que no afectan a la deuda del total '
        'de las Administraciones Públicas por ser operaciones entre subsectores. La serie no desglosa por acreedor.'
    )
    series = [
        {'id': 'deuda-pde-trimestral', 'title': 'Deuda PDE de las Administraciones de Seguridad Social, saldo al final de cada trimestre', 'unit': 'millones de euros',
         'source': fuente, 'confidence': 'alta', 'notes': nota,
         'points': [{'period': t, 'value': v} for t, v in trimestral]},
        {'id': 'deuda-pde-fin-ano', 'title': 'Deuda PDE de las Administraciones de Seguridad Social, saldo a 31 de diciembre', 'unit': 'millones de euros',
         'source': fuente, 'confidence': 'alta', 'notes': 'Valor del cuarto trimestre de la serie trimestral (selección, sin cálculo). ' + nota,
         'points': [{'period': a, 'value': v} for a, v in fin_ano]},
    ]
    escribe_series('sistema', 'deuda-pde-seguridad-social', f'Deuda PDE de las Administraciones de Seguridad Social ({trimestral[0][0]} a {trimestral[-1][0]})',
                   'Saldo de la deuda según el PDE del subsector Seguridad Social, trimestral y a fin de año, publicado por el Banco de España.', series)


if __name__ == '__main__':
    main()
