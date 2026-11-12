"""Fase 2-B-3: guías resumen de las pensiones no contributivas del IMSERSO (2022-2026) y su contraste.

Las guías anuales del IMSERSO («Guía resumen de aplicación de las pensiones no contributivas de la
Seguridad Social») publican la cuantía íntegra de cada año, el mínimo del 25 %, el complemento de
tercera persona, la cuantía individual con varios beneficiarios, los límites de acumulación de
recursos y el límite de la compatibilidad con el trabajo (IPREM + cuantía íntegra). Son la fuente
oficial de los casos de oro «independientes» del motor de PNC y permiten:

  1. contrastar la cuantía anual de /data: la de 2023 era la del RD 1058/2022 (6.402,20, revalorización
     del 8,5 %), superada por el incremento extraordinario hasta el 15 % del art. 77 del RDL 20/2022
     (6.784,54, que publica la guía de 2023). Se corrige el dato de 2023 (docs/DISCREPANCIAS.md); el
     script comprueba por código que 5.899,60 × 1,15 = 6.784,54 y que el RDL dice «hasta alcanzar un
     porcentaje total del 15 por ciento»;
  2. escribir pnc-iprem-anual-sin-pagas-extra (IPREM de 2022 a 2026 con el que cada guía calcula el
     límite del art. 366: cubre el IPREM de 2024 a 2026 que faltaba en /data);
  3. añadir a pnc-reglas la aplicación del límite de acumulación con el complemento de tercera persona.

Cada cifra se comprueba en el texto de la guía (`pdftotext -layout`) y, donde hay norma, contra ella.
Ejecutar con `python3 -I scripts/etl/pnc_imserso.py` (descarga las guías; `MODO=local` si ya están en
data-raw/imserso). Requiere `pdftotext`.
"""
import hashlib
import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, fusionar  # noqa: E402

HOY = os.environ.get('FECHA_DESCARGA', '2026-11-12')
MODO = os.environ.get('MODO', 'descargar')
IMS = f'{REPO}/data-raw/imserso'
ORIGEN_RUTA = f'{IMS}/origen.json'
ORIGEN = json.load(open(ORIGEN_RUTA, encoding='utf-8')) if os.path.exists(ORIGEN_RUTA) else {}
PUBLICADOR = 'Instituto de Mayores y Servicios Sociales (IMSERSO)'
GUIAS = {
    2022: 'https://imserso.es/documents/20123/98526/pncresumen2022.pdf/5ca7393f-30e3-4c31-dcaa-90ee082dea6a',
    2023: 'https://imserso.es/documents/20123/1595507/pncresumen2023.pdf/0d138a8e-b367-38b9-7826-11238afb437f',
    2024: 'https://imserso.es/documents/20123/1595507/pncresumen2024.pdf/62e24a0f-cede-5580-326e-2baebbf2ad3c',
    2025: 'https://blogceadac.imserso.es/documents/d/global/pncresumen2025',
    2026: 'https://imserso.es/documents/20123/1595507/pncresumen2026.pdf/c4b41c80-63fe-942d-7231-f3ee20e28694',
}
RDL20 = ('BOE-A-2022-22685', 'Real Decreto-ley 20/2022, de 27 de diciembre, de medidas de respuesta a las consecuencias económicas y sociales de la Guerra de Ucrania y de apoyo a la reconstrucción de la isla de La Palma y a otras situaciones de vulnerabilidad')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def numero(s):
    return float(s.replace('.', '').replace(',', '.'))


def obtener_guia(anio):
    pdf = f'{IMS}/pncresumen{anio}.pdf'
    if not os.path.exists(pdf):
        if MODO == 'local':
            raise SystemExit(f'falta {pdf} (modo local)')
        datos = subprocess.run(['curl', '-sS', '-L', '--fail', '-m', '90', '-A', 'Mozilla/5.0', GUIAS[anio]], check=True, capture_output=True).stdout
        if not datos.startswith(b'%PDF'):
            raise SystemExit(f'la guía de {anio} no es un PDF')
        open(pdf, 'wb').write(datos)
    sha = hashlib.sha256(open(pdf, 'rb').read()).hexdigest()
    ORIGEN[f'pncresumen{anio}.pdf'] = {
        'url': GUIAS[anio], 'sha256_original': sha, 'fetchedAt': HOY,
        'nota': f'Guía resumen de aplicación de las pensiones no contributivas de la Seguridad Social, año {anio} (IMSERSO), PDF original'}
    texto = subprocess.run(['pdftotext', '-layout', pdf, '-'], check=True, capture_output=True).stdout.decode('utf-8')
    return norm(texto)


def fuente(anio):
    return {'title': f'Guía resumen de aplicación de las pensiones no contributivas de la Seguridad Social, año {anio}', 'publisher': PUBLICADOR,
            'url': GUIAS[anio], 'docId': f'pncresumen{anio}'}


def buscar(texto, patron, que):
    m = re.search(patron, texto)
    if not m:
        raise SystemExit(f'no encontrado en la guía: {que}')
    return m


guias = {a: obtener_guia(a) for a in GUIAS}

# ---------------------------------------------------------------------------------------------
# 1. IPREM anual sin pagas extra (límite del art. 366) y límite publicado por cada guía
# ---------------------------------------------------------------------------------------------
iprem = []
for anio, t in guias.items():
    m = buscar(t, r'indicador público de renta de efectos múltiples \(IPREM\), que se cifra en (\d{1,3}(?:\.\d{3})*,\d{2}) euros y para la pensión de (?:invalidez|incapacidad) no contributiva, que es de (\d{1,3}(?:\.\d{3})*,\d{2})', f'IPREM de {anio}')
    pension = numero(m.group(2))
    limite = numero(buscar(t, r'El límite indicado de (\d{1,3}(?:\.\d{3})*,\d{2}) es el resultado de sumar', f'límite de {anio}').group(1))
    valor = numero(m.group(1))
    if abs(valor + pension - limite) > 0.005:
        raise SystemExit(f'{anio}: IPREM {valor} + pensión {pension} no suma el límite {limite}')
    cita = m.group(0)
    iprem.append({'id': str(anio), 'value': valor, 'unit': 'euros/año', 'period': str(anio), 'source': fuente(anio), 'fetchedAt': HOY, 'confidence': 'alta',
                  'notes': f'IPREM anual excluidas las pagas extraordinarias (12 mensualidades) con el que la guía calcula el límite de compatibilidad con el trabajo del art. 366 TRLGSS: {limite:.2f} euros = IPREM + pensión íntegra de {pension:.2f}. '
                           'Comprobado por código que la suma coincide con el límite que publica la guía.',
                  'quote': cita, 'location': 'Guía resumen: pensión de incapacidad que inicia una actividad laboral'})
fusionar('parametros', 'pnc-iprem-anual-sin-pagas-extra', iprem, 'IPREM anual sin pagas extraordinarias (límite del art. 366 TRLGSS)',
         'IPREM anual de 12 mensualidades que usa el IMSERSO en su guía de cada año para el límite de compatibilidad de la pensión de incapacidad no contributiva con una actividad laboral (art. 366 TRLGSS). '
         'En 2022 y 2023 coincide con el IPREM mensual de /data × 12.')

# ---------------------------------------------------------------------------------------------
# 2. Cuantía íntegra: contraste de 2022 a 2026 y corrección de 2023
# ---------------------------------------------------------------------------------------------
ruta = f'{REPO}/data/parametros/pnc-importe-anual.json'
imp = json.load(open(ruta, encoding='utf-8'))
por_id = {d['id']: d for d in imp['data']}
guia_integra = {}
for anio, t in guias.items():
    m = buscar(t, r'ÍNTEGRA (\d{1,3}(?:\.\d{3})*,\d{2}) (\d{1,3}(?:\.\d{3})*,\d{2}) MÍNIMO DEL 25%', f'cuantía íntegra de {anio}')
    guia_integra[anio] = (numero(m.group(1)), m.group(0))
discrepancias = []
for anio, (valor, _) in guia_integra.items():
    if abs(por_id[str(anio)]['value'] - valor) > 0.005:
        discrepancias.append((anio, por_id[str(anio)]['value'], valor))
print('discrepancias de la cuantía íntegra (dato de /data, guía):', discrepancias)
if [a for a, _, _ in discrepancias] not in ([], [2023]):
    raise SystemExit(f'discrepancias inesperadas: {discrepancias}')
if discrepancias:
    # RDL 20/2022, art. 77: incremento extraordinario hasta el 15 % sobre el importe de 1/1/2022
    ruta_rdl = f'{REPO}/data-raw/boe/{RDL20[0]}.txt'
    if not os.path.exists(ruta_rdl):
        if MODO == 'local':
            raise SystemExit(f'falta {ruta_rdl} (modo local)')
        url = f'https://www.boe.es/diario_boe/xml.php?id={RDL20[0]}'
        xml = subprocess.run(['curl', '-sS', '--fail', url], check=True, capture_output=True).stdout
        x = xml.decode('utf-8')
        x = re.sub(r'</t[dh]>', ' | ', x)
        x = re.sub(r'</p>|</tr>|<br\s*/?>', '\n', x)
        lineas = [norm(html.unescape(re.sub(r'<[^>]+>', ' ', l))) for l in x.split('\n')]
        open(ruta_rdl, 'w', encoding='utf-8').write('\n'.join(l for l in lineas if l) + '\n')
        boe_origen = json.load(open(f'{REPO}/data-raw/boe/origen.json', encoding='utf-8'))
        boe_origen[f'{RDL20[0]}.txt'] = {'url': f'https://www.boe.es/buscar/doc.php?id={RDL20[0]}', 'urlDescarga': url, 'sha256_original': hashlib.sha256(xml).hexdigest(),
                                         'fetchedAt': HOY, 'nota': f'{RDL20[1]}. Texto plano del XML del BOE (etiquetas eliminadas).'}
        json.dump(boe_origen, open(f'{REPO}/data-raw/boe/origen.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    texto_rdl = norm(open(ruta_rdl, encoding='utf-8').read())
    frase = 'hasta alcanzar un porcentaje total del 15 por ciento'
    if 'Artículo 77. Incremento extraordinario de las pensiones de jubilación e invalidez' not in texto_rdl or frase not in texto_rdl:
        raise SystemExit('art. 77 del RDL 20/2022 no encontrado')
    base_2022 = por_id['2022']['value']
    esperado = round(base_2022 * 1.15, 2)
    valor_guia, cita_guia = guia_integra[2023]
    if abs(esperado - valor_guia) > 0.005:
        raise SystemExit(f'15 % sobre {base_2022} = {esperado}, la guía dice {valor_guia}')
    antiguo = por_id['2023']
    nuevo = {
        'id': '2023', 'value': valor_guia, 'unit': 'euros/año', 'period': '2023', 'source': fuente(2023), 'fetchedAt': HOY, 'confidence': 'alta',
        'notes': 'Importe anual íntegro de la pensión no contributiva de jubilación e invalidez en 2023 (14 pagas) con el incremento extraordinario del art. 77 del RDL 20/2022 '
                 f'(hasta el 15 % sobre el importe de 1 de enero de 2022: {base_2022:.2f} × 1,15 = {esperado:.2f}). Sustituye a {antiguo["value"]:.2f}, que fijaba el RD 1058/2022 con la revalorización del 8,5 % '
                 'y que este incremento superó (docs/DISCREPANCIAS.md, Fase 2-B-3). Fuente de la cifra: guía del IMSERSO; la norma la confirma sin escribirla.',
        'quote': cita_guia, 'location': 'Guía resumen: cuantías',
        'crossCheck': {'source': {'title': RDL20[1], 'publisher': 'Boletín Oficial del Estado (BOE)', 'url': f'https://www.boe.es/buscar/doc.php?id={RDL20[0]}', 'docId': RDL20[0]},
                       'fetchedAt': HOY, 'matches': True,
                       'notes': f'Artículo 77: «{frase}»; {base_2022:.2f} × 1,15 = {esperado:.2f} (comprobado por código).'},
    }
    fusionar('parametros', 'pnc-importe-anual', [nuevo])

# ---------------------------------------------------------------------------------------------
# 3. Límite de acumulación con el complemento de tercera persona (aplicación del IMSERSO)
# ---------------------------------------------------------------------------------------------
t26 = guias[2026]
m = buscar(t26, r'Cuando el solicitante o titular de una pensión de incapacidad no contributiva reúne los requisitos exigidos para causar derecho al complemento por necesidad de tercera persona, los importes del límite de acumulación de recursos aplicable en función del número de personas que integran la unidad económica son los siguientes', 'límite con tercera persona')
fila = buscar(t26, r'2 13\.204,80 \+ 9\.243,36 22\.448,16', 'fila de dos convivientes con tercera persona')
if abs(13204.80 * 1.7 - 22448.16) > 0.005:
    raise SystemExit('el límite con tercera persona no es 1,7 × 13.204,80')
regla = {'id': 'limite-acumulacion-con-tercera-persona', 'value': 1, 'unit': 'indicador (1 = el límite usa la cuantía íntegra incrementada con el complemento de tercera persona)', 'period': '2026',
         'source': fuente(2026), 'fetchedAt': HOY, 'confidence': 'media',
         'notes': 'Aplicación del IMSERSO, no texto de la ley: con derecho al complemento del art. 364.6, la cuantía del límite del art. 363.2 es 13.204,80 (8.803,20 + 4.401,60) y no 8.803,20 (para dos convivientes, 22.448,16 = 13.204,80 + 70 % × 13.204,80). '
                  'El motor la sigue por defecto (lectura limiteConTerceraPersona).',
         'quote': m.group(0)[:300] + ' [...] ' + fila.group(0), 'location': 'Guía resumen: requisitos de rentas, unidad económica con complemento de tercera persona'}
regla['quote'] = regla['quote'].replace(' [...] ', ' […] ')
fusionar('parametros', 'pnc-reglas', [regla])

json.dump(ORIGEN, open(ORIGEN_RUTA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('IPREM:', [(d['id'], d['value']) for d in iprem])
