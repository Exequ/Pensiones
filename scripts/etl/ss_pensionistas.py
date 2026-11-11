"""Pensionistas y pensiones (serie histórica a diciembre, 2006-2025) y relaciones
afiliados/pensionista y afiliados/pensión. Fuente: fichero PTAS («Pensionistas») de la Seguridad
Social, hoja «Pnes y ptas»; afiliados de data/sistema/afiliacion-anual.json (ss_afiliacion.py).
Modo `descargar` (URL en origen.json) o `local` (fichero en data-raw/seg-social/PTAS/). `python3 -I`."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from comun import REPO, escribe_series

RAW = f'{REPO}/data-raw/seg-social/PTAS'
MODO = os.environ.get('MODO', 'descargar')
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'


def main():
    origen = json.load(open(f'{RAW}/origen.json'))
    f = f'{RAW}/PTAS202610.xlsx'
    if MODO == 'descargar' and not os.path.exists(f):
        subprocess.run(['curl', '-sS', '--max-time', '90', '-o', f, origen['url'] + '?MOD=AJPERES&CONVERT_TO=linktext'], check=True)
    ws = openpyxl.load_workbook(f, read_only=True, data_only=True)['Pnes y ptas']
    ptas, pnes = {}, {}
    anio = None
    for r in ws.iter_rows(values_only=True):
        if isinstance(r[0], int):
            anio = r[0]
        if anio and anio <= 2025 and r[1] == 'Diciembre' and isinstance(r[2], (int, float)):
            ptas[str(anio)], pnes[str(anio)] = int(r[2]), int(r[3])
    fuente = {'title': 'Pensionistas: serie histórica de pensionistas y pensiones (hoja «Pnes y ptas»)', 'publisher': SS,
              'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/26bce586-014b-4c4e-9484-009cee21e271'}
    def pts(d):
        return [{'period': a, 'value': v} for a, v in sorted(d.items())]
    series = [
        {'id': 'pensionistas', 'title': 'Pensionistas del sistema contributivo (personas) a diciembre', 'unit': 'personas', 'source': fuente, 'confidence': 'alta',
         'notes': 'Personas que perciben al menos una pensión contributiva. Nota (1) de la fuente en la hoja original.', 'points': pts(ptas)},
        {'id': 'pensiones', 'title': 'Pensiones contributivas en vigor a diciembre', 'unit': 'pensiones', 'source': fuente, 'confidence': 'alta',
         'notes': 'Número de pensiones; un pensionista puede percibir varias. Difiere en decenas de unidades del fichero REG de diciembre (revisión posterior de la fuente): ver docs/DISCREPANCIAS.md.', 'points': pts(pnes)},
    ]
    escribe_series('sistema', 'pensionistas-pensiones-historico', 'Pensionistas y pensiones contributivas, serie histórica a diciembre (2006-2025)',
                   'Número de pensionistas (personas) y de pensiones contributivas a diciembre de cada año, según la serie histórica de la Seguridad Social.', series)
    afi = json.load(open(f'{REPO}/data/sistema/afiliacion-anual.json'))
    ser = {s['id']: {p['period']: p['value'] for p in s['points']} for s in afi['series']}
    def razon(num, den, sid, title, notes, conf='media'):
        puntos = [{'period': a, 'value': round(num[a] / den[a], 4)} for a in sorted(den) if a in num]
        return {'id': sid, 'title': title, 'unit': 'razón (afiliados por pensionista o por pensión)', 'source': fuente, 'confidence': conf, 'notes': notes, 'points': puntos}
    base = ' Dato derivado (cociente de dos series de /data/sistema); la Seguridad Social no publica esta razón como tal en los ficheros descargados.'
    rs = [
        razon(ser['diciembre-total-sistema'], ptas, 'afiliados-diciembre-por-pensionista',
              'Afiliados medios de diciembre (total sistema) por pensionista (personas) a diciembre',
              'Numerador: afiliados medios en alta del mes de diciembre, total sistema (incluye todos los regímenes y sistemas especiales). Denominador: pensionistas (personas) con pensión contributiva.' + base),
        razon(ser['diciembre-total-sistema'], pnes, 'afiliados-diciembre-por-pension',
              'Afiliados medios de diciembre (total sistema) por pensión contributiva a diciembre',
              'Numerador: afiliados medios en alta de diciembre, total sistema. Denominador: número de pensiones contributivas (no personas).' + base),
        razon(ser['media-anual-total-sistema'], ptas, 'afiliados-media-anual-por-pensionista',
              'Afiliados medios del año (media de doce meses, total sistema) por pensionista a diciembre',
              'Numerador: media aritmética de los afiliados medios mensuales del año. Denominador: pensionistas a diciembre.' + base),
        razon(ser['media-anual-total-sistema'], pnes, 'afiliados-media-anual-por-pension',
              'Afiliados medios del año (media de doce meses, total sistema) por pensión contributiva a diciembre',
              'Numerador: media aritmética de los afiliados medios mensuales del año. Denominador: pensiones contributivas a diciembre.' + base),
    ]
    escribe_series('sistema', 'relacion-afiliados-pensiones', 'Relación afiliados/pensionistas y afiliados/pensiones (2006-2025)',
                   'Cuatro definiciones de la relación entre afiliados en alta y pensionistas o pensiones contributivas, con la definición exacta de numerador y denominador.', rs)


if __name__ == '__main__':
    main()
