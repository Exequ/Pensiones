"""C1 de la Fase 1B-3: «Alternativa 1» de la relación afiliados/pensiones.

Afiliados a último día de diciembre del año t (serie mensual de afiliados a último día, Seguridad Social)
entre las pensiones contributivas en vigor a 1 de enero de t+1 (fichero REG de enero de t+1) y, solo
donde la fuente lo publica, entre los pensionistas de enero de t+1 (hoja «Pnes y ptas» del fichero PTAS).
Modo `descargar` (por defecto) o `local` (ficheros en data-raw/seg-social/REG-ENE/AAAA.xlsx y AFI-UD/).
Ejecutar con `python3 -I scripts/etl/ss_enero.py`.
"""
import hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
import ss_reg
from comun import REPO, HOY, escribe_series

RAW = f'{REPO}/data-raw/seg-social'
DIR = f'{RAW}/REG-ENE'
MODO = os.environ.get('MODO', 'descargar')
SS = 'Seguridad Social (Ministerio de Inclusión, Seguridad Social y Migraciones)'
MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']


def mes_anio(n, a):
    for m in (re.fullmatch(r'REG3?(\d{4})(\d{2})\.xlsx', n), re.fullmatch(r'REG3?(\d{2})(\d{4})\.xlsx', n)):
        if m:
            x, y = int(m.group(1)), int(m.group(2))
            if x == a:
                return x, y
            if y == a:
                return y, x
    return None


def descarga_enero():
    ix = json.load(open(f'{RAW}/indice.json'))
    os.makedirs(DIR, exist_ok=True)
    origen = {}
    for a in range(2009, 2027):
        for n, v in ix[str(a)].items():
            r = mes_anio(n, a)
            if r and r[0] == a and r[1] == 1:
                f = f'{DIR}/{a}.xlsx'
                if not os.path.exists(f):
                    if MODO == 'local':
                        raise SystemExit('falta ' + f)
                    subprocess.run(['curl', '-sS', '--max-time', '90', '-o', f, v['url'] + '?MOD=AJPERES&CONVERT_TO=linktext'], check=True)
                origen[str(a)] = {'url': v['url'], 'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest(), 'fichero': n}
    json.dump(origen, open(f'{DIR}/origen.json', 'w'), indent=1)
    return origen


def pensiones_enero(origen):
    ss_reg.RAW = DIR
    out = {}
    for a in sorted(origen, key=int):
        v = [f for f in ss_reg.filas_anio(int(a)) if f[1] == 'total-sistema' and f[2] == 'total' and f[3] in ('ambos', 'hombres', 'mujeres', 'no-consta')]
        d = {f[3]: f[4] for f in v}
        out[int(a)] = d['ambos'] if 'ambos' in d else sum(d.get(s, 0) or 0 for s in ('hombres', 'mujeres', 'no-consta'))
    return out


def afiliados_ultimo_dia():
    ws = openpyxl.load_workbook(f'{RAW}/AFI-UD/serie-afiliados-ultimo-dia-regimenes.xlsx', read_only=True, data_only=True).worksheets[0]
    out = {}
    for r in ws.iter_rows(values_only=True):
        if r[0] and re.match(r'^Diciembre\s+(\d{4})$', str(r[0]).strip()):
            a = int(str(r[0]).split()[-1])
            out[a] = int(r[15])
    return out


def pensionistas_enero_2026():
    ws = openpyxl.load_workbook(f'{RAW}/PTAS/PTAS202610.xlsx', read_only=True, data_only=True)['Pnes y ptas']
    anio = None
    for r in ws.iter_rows(values_only=True):
        if isinstance(r[0], (int, str)) and str(r[0]).isdigit():
            anio = int(r[0])
        if anio == 2026 and r[1] == 'Enero':
            return int(r[2]), int(r[3])


def main():
    origen = descarga_enero()
    pen = pensiones_enero(origen)           # {año de enero: pensiones a 1 de enero}
    afi = afiliados_ultimo_dia()            # {año de diciembre: afiliados a último día}
    ptas26, pens26 = pensionistas_enero_2026()
    assert pen[2026] == pens26, ('las pensiones de enero de 2026 de REG y de PTAS no coinciden', pen[2026], pens26)
    anios = [t for t in range(2008, 2026) if (t + 1) in pen and t in afi]
    S_AFI = {'title': 'Afiliados último día: serie de afiliados a último día por regímenes 1985-septiembre 2026 (fila de diciembre, columna TOTAL SISTEMA)', 'publisher': SS,
             'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8/EST10/EST305/EST306', 'docId': 'SS-afiliados-ultimo-dia'}
    S_REG = {'title': 'Pensiones contributivas en vigor (fichero REG de enero de cada año: número de pensiones, total sistema)', 'publisher': SS,
             'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST24', 'docId': 'SS-REG-enero'}
    S_PTAS = {'title': 'Pensionistas: serie histórica de pensionistas y pensiones (hoja «Pnes y ptas», fila de enero de 2026)', 'publisher': SS,
              'url': 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/26bce586-014b-4c4e-9484-009cee21e271', 'docId': 'SS-PTAS'}
    nota = ('Período t = año de los afiliados (último día de diciembre de t); las pensiones y los pensionistas son los vigentes a 1 de enero de t+1. '
            'Dato derivado (cociente) a partir de datos publicados.')
    series = [
        {'id': 'afiliados-ultimo-dia-diciembre', 'title': 'Afiliados en alta a último día de diciembre, total sistema', 'unit': 'afiliados', 'source': S_AFI, 'confidence': 'alta',
         'notes': 'Dato publicado de la serie «Afiliados último día» (total sistema, incluye el Sistema Especial de Empleados de Hogar y los regímenes especiales; no es la afiliación media mensual).',
         'points': [{'period': str(t), 'value': afi[t]} for t in anios]},
        {'id': 'pensiones-vigor-1-enero-siguiente', 'title': 'Pensiones contributivas en vigor a 1 de enero del año siguiente, total sistema', 'unit': 'pensiones', 'source': S_REG, 'confidence': 'alta',
         'notes': 'Dato publicado del fichero REG de enero de t+1 (número de pensiones, total del sistema). Período = t (año anterior al del fichero).',
         'points': [{'period': str(t), 'value': pen[t + 1]} for t in anios]},
        {'id': 'afiliados-por-pension-alternativa-1', 'title': 'Alternativa 1: afiliados a último día de diciembre ÷ pensiones en vigor a 1 de enero siguiente', 'unit': 'afiliados por pensión', 'source': S_AFI, 'confidence': 'media',
         'notes': nota + ' Elimina el desfase temporal de las cuatro definiciones anteriores (afiliados medios o de diciembre frente a pensiones a 1 de diciembre).',
         'points': [{'period': str(t), 'value': round(afi[t] / pen[t + 1], 4)} for t in anios]},
        {'id': 'afiliados-por-pensionista-alternativa-1', 'title': 'Alternativa 1: afiliados a último día de diciembre ÷ pensionistas de enero siguiente', 'unit': 'afiliados por pensionista', 'source': S_PTAS, 'confidence': 'media',
         'notes': nota + ' Solo existe un año: la Seguridad Social publica el número de pensionistas por mes únicamente para el año en curso (2026); para años anteriores solo el de diciembre (ver docs/PENDIENTE_DATOS.md).',
         'points': [{'period': '2025', 'value': round(afi[2025] / ptas26, 4)}]},
        {'id': 'pensionistas-enero-2026', 'title': 'Pensionistas (personas) de enero de 2026', 'unit': 'personas', 'source': S_PTAS, 'confidence': 'alta',
         'notes': 'Dato publicado: hoja «Pnes y ptas», fila de enero de 2026. Período = 2025 por coherencia con la serie de afiliados (año t del cociente).',
         'points': [{'period': '2025', 'value': ptas26}]},
    ]
    escribe_series('sistema', 'relacion-afiliados-pensiones-alternativa-1',
        'Relación afiliados/pensiones, Alternativa 1: afiliados a último día de diciembre entre pensiones a 1 de enero siguiente (2008-2025)',
        'Quinta definición de la relación entre afiliados y pensiones, que se suma a las cuatro de relacion-afiliados-pensiones sin sustituirlas: afiliados a último día de diciembre del año t '
        'entre las pensiones contributivas en vigor a 1 de enero de t+1 (y entre los pensionistas, solo para t = 2025). Literal: «afiliados en alta a último día del mes de diciembre ÷ número de pensiones contributivas en vigor el día 1 del mes de enero siguiente». '
        'El numerador es un stock a una fecha y el denominador otro stock a la fecha inmediatamente posterior, por lo que no hay desfase de medio año entre ambos.', series)
    print('Alt.1', anios[0], anios[-1], [round(afi[t] / pen[t + 1], 4) for t in anios][:3])


if __name__ == '__main__':
    main()
