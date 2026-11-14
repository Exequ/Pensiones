"""Fase 5-A2: préstamos y transferencias del Estado a la Seguridad Social según el Tribunal de Cuentas.

Fuente: BOE-A-2025-25090, Resolución de 20 de noviembre de 2024 de las Presidencias del Congreso y
del Senado, que publica el Dictamen de la Comisión Mixta y la Declaración definitiva del Tribunal de
Cuentas sobre la Cuenta General del Estado de 2022 (apartado 4.28 y nota 65 a 69, y apartado de
seguimiento de las resoluciones, nota 102). Modo `descargar` (PDF del BOE en data-raw/boe/pdf/, no
versionado; se guarda el texto en data-raw/boe/BOE-A-2025-25090.txt) o `local` (usa ese texto).
Cada cifra se extrae del texto con una expresión que falla si no hay coincidencia, y lleva la cita
literal. Escribe data/sistema/prestamos-transferencias-tribunal-cuentas.json. `python3 -I`."""
import hashlib, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import HOY, REPO, escribe_series, num  # noqa: F401  (escribe_series se mantiene por simetría)
import json

DOC = 'BOE-A-2025-25090'
RAW = f'{REPO}/data-raw/boe'
PDF = f'{RAW}/pdf/{DOC}.pdf'
TXT = f'{RAW}/{DOC}.txt'
URL_PDF = 'https://boe.es/boe/dias/2025/12/09/pdfs/BOE-A-2025-25090.pdf'
MODO = os.environ.get('MODO', 'descargar')
FUENTE = {
    'title': 'Resolución de 20 de noviembre de 2024 (publicación del Dictamen de la Comisión Mixta y de la Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2022)',
    'publisher': 'Boletín Oficial del Estado (BOE), Cortes Generales',
    'url': f'https://www.boe.es/buscar/doc.php?id={DOC}',
    'docId': DOC,
}
UNIDAD = 'millones de euros'


def limpia(cita):
    """Quita de la cita el pie de página del BOE y las llamadas a nota pegadas al texto por la extracción del PDF."""
    cita = cita.replace(' cve: BOE-A-2025-25090', '')
    return re.sub(r'(corrientes|millones)(6[5-9])\b', r'\1', cita).strip()


def texto():
    if MODO == 'descargar' and not os.path.exists(TXT):
        os.makedirs(f'{RAW}/pdf', exist_ok=True)
        if not os.path.exists(PDF):
            subprocess.run(['curl', '-sSL', '--max-time', '300', '-o', PDF, URL_PDF], check=True)
        salida = subprocess.run(['pdftotext', '-layout', PDF, '-'], capture_output=True, text=True, check=True).stdout
        with open(TXT, 'w', encoding='utf-8') as f:
            f.write(salida)
    with open(TXT, encoding='utf-8') as f:
        return re.sub(r'\s+', ' ', f.read())


def main():
    t = texto()
    huella = hashlib.sha256(open(PDF, 'rb').read()).hexdigest() if os.path.exists(PDF) else 'no disponible (modo local sin PDF)'
    datos = []

    def cifra(id_, periodo, patron, localizacion, notas, conf='alta', unidad=UNIDAD):
        m = re.search(patron, t)
        if not m:
            raise SystemExit(f'SIN COINCIDENCIA {id_}: {patron}')
        datos.append({'id': id_, 'value': num(m.group(1)), 'unit': unidad, 'period': periodo, 'source': FUENTE, 'fetchedAt': HOY,
                      'confidence': conf, 'notes': f'{notas} PDF del BOE sha256 {huella}.', 'quote': limpia(m.group(0)), 'location': localizacion})

    def texto_literal(id_, periodo, patron, localizacion, notas, unidad='cita literal'):
        m = re.search(patron, t)
        if not m:
            raise SystemExit(f'SIN COINCIDENCIA {id_}: {patron}')
        cita = limpia(m.group(0))
        datos.append({'id': id_, 'value': cita, 'unit': unidad, 'period': periodo, 'source': FUENTE, 'fetchedAt': HOY,
                      'confidence': 'alta', 'notes': f'{notas} PDF del BOE sha256 {huella}.', 'quote': cita, 'location': localizacion})

    L = 'Declaración del Tribunal de Cuentas sobre la CGE de 2022, apartado 4.28'
    cifra('deuda-ss-con-estado-2022', '2022',
          r'acumulando la Seguridad Social un endeudamiento frente al Estado, a 31 de diciembre de 2022, de ([\d.]+,\d) millones',
          L, 'Saldo a 31 de diciembre de 2022 del endeudamiento de la Seguridad Social frente al Estado (préstamos), según el Tribunal de Cuentas.')
    cifra('prestamos-concedidos-2017-2022', '2022',
          r'desde 2017 hasta 2022, han ascendido a ([\d.]+) millones',
          L, 'Suma de los préstamos a largo plazo concedidos por el Estado a la TGSS entre 2017 y 2022 (acumulado, no un dato anual).')
    cifra('prestamos-1992-1999', '1999',
          r'se suman los ([\d.]+,\d) millones que derivan de los préstamos concedidos entre 1992 y 1999',
          L, 'Importe de los préstamos concedidos entre 1992 y 1999, que forman parte del saldo de 2022.')
    cifra('transferencias-corrientes-2018-2022', '2022',
          r'entre 2018 y 2022, el Estado ha aportado a la Seguridad Social transferencias corrientes\d* por ([\d.]+,\d) millones',
          L, 'Transferencias corrientes del Estado a la Seguridad Social, acumulado 2018-2022, en el concepto del Tribunal de Cuentas (apoyo al equilibrio presupuestario y costes que el Informe del Pacto de Toledo considera ajenos al ámbito de la Seguridad Social). No coincide con la suma de «transferencias del Estado y organismos autónomos» de la ejecución del presupuesto, que incluye además otras aportaciones (por ejemplo, las de naturaleza no contributiva).')
    cifra('transferencias-equilibrio-2018-2021', '2021',
          r'De este total, ([\d.]+,\d) millones\d* de las transferencias recibidas entre 2018 y 2021, han tenido por finalidad apoyar su equilibrio presupuestario',
          L, 'Parte de las transferencias de 2018-2021 con finalidad de apoyar el equilibrio presupuestario (acumulado 2018-2021).')
    cifra('transferencias-covid-2020', '2020',
          r'25\.014,6 millones de euros se han concedido para equilibrar el impacto derivado del COVID-19 en las cuentas de la Seguridad Social, de los que ([\d.]+,\d) millones corresponden a 2020',
          'nota 68 al apartado 4.28', 'Transferencias concedidas en 2020 para equilibrar el impacto de la COVID-19 en las cuentas de la Seguridad Social (parte del total de 25.014,6 millones de 2020 y 2021).')
    cifra('transferencias-covid-2021', '2021',
          r'20\.002,6 millones corresponden a 2020 y ([\d.]+) millones a 2021',
          'nota 68 al apartado 4.28', 'Transferencias concedidas en 2021 con la misma finalidad (parte del total de 25.014,6 millones de 2020 y 2021).')
    cifra('transferencias-costes-impropios-2021-2022', '2022',
          r'otorgadas en 2021 y 2022 por ([\d.]+) millones, se fundamentan en la modificación normativa que la LPGE para 2021 ha introducido en el TRLGSS',
          L, 'Transferencias de 2021 y 2022 (acumulado) basadas en la modificación del TRLGSS por la LPGE para 2021, con la base del Informe de Evaluación y Reforma del Pacto de Toledo de 3 de noviembre de 2020.')
    cifra('transferencias-previstas-lpge-2023', '2023',
          r'la LPGE para 2023 prevé también la concesión, con idéntica finalidad, de transferencias a la Seguridad Social por ([\d.]+) millones',
          L, 'Previsión de la LPGE para 2023 (no un dato de ejecución).', conf='alta')
    cifra('aportaciones-no-contributivas-2022', '2022',
          r'para 2022, ascienden a ([\d.]+) millones',
          'apartado 4.28', 'Aportaciones del Estado en 2022 para la financiación de conceptos de naturaleza no contributiva, según el Tribunal de Cuentas (cifra de 2022 que cita el texto).')
    cifra('prestamo-previsto-lpge-2023', '2023',
          r'prevé la concesión de un nuevo préstamo con las mismas condiciones por ([\d.]+,\d) millones de euros',
          'nota 65 al apartado 4.28', 'Previsión de la LPGE para 2023 (no un dato de ejecución).')
    cifra('prestamos-insalud-1991', '1991',
          r'tres préstamos concedidos para la cancelación de obligaciones pendientes de pago a 31 de diciembre de 1991 del extinto INSALUD, por un importe conjunto de ([\d.]+,\d) millones',
          'nota 102 (seguimiento de las resoluciones)', 'Parte de los préstamos de 1992-1999: tres préstamos para obligaciones pendientes del INSALUD a 31 de diciembre de 1991.')
    cifra('prestamos-equilibrio-presupuestario-90', '1999',
          r'seis préstamos otorgados para la financiación de obligaciones de la Seguridad Social y posibilitar su equilibrio presupuestario, por un total (?:cve: BOE-A-2025-25090 )?de ([\d.]+,\d) millones',
          'nota 102 (seguimiento de las resoluciones)', 'Parte de los préstamos de 1992-1999: seis préstamos para financiar obligaciones y posibilitar el equilibrio presupuestario.')
    cifra('prestamos-desfases-tesoreria-90', '1999',
          r'dos préstamos concedidos para cubrir desfases de tesorería por ([\d.]+,\d) millones',
          'nota 102 (seguimiento de las resoluciones)', 'Parte de los préstamos de 1992-1999: dos préstamos para cubrir desfases de tesorería.')
    texto_literal('condiciones-prestamos-recientes', '2022',
                  r'Todos estos préstamos se han concedido sin devengo de intereses y con cancelación en un plazo máximo de 10 años, a partir del año siguiente al de su concesión',
                  'nota 65 al apartado 4.28', 'Condiciones de los préstamos de 2017 a 2022 según el Tribunal de Cuentas.')
    texto_literal('recomendacion-amortizacion-insalud', '2022',
                  r'recoge una recomendación para que el Estado asuma la amortización \(bien por condonación o por la concesión de transferencias\) de tres de estos préstamos concedidos a la Seguridad Social, por [\d.]+ millones',
                  L, 'Recomendación del Tribunal de Cuentas (Resolución de la Comisión Mixta de 19 de mayo de 2022). Es una recomendación, no una decisión de condonación o conversión.')
    texto_literal('prestamos-sin-devolver-y-prorrogados', '2022',
                  r'no han sido devueltos, ya que los que carecen de plazo de vencimiento continúan sin ser reintegrados y los que sí lo tienen han sido sistemáticamente prorrogados',
                  L, 'Estado de los préstamos antiguos descrito por el Tribunal de Cuentas.')
    texto_literal('objetivo-transferencias-pacto-toledo', '2022',
                  r'La realización anual de estas transferencias a la Seguridad Social tiene por objeto, según consta en el mencionado Informe del pacto de Toledo, la asunción progresiva por el Estado de estos costes impropios, y terminar así, en el corto plazo, con el déficit financiero del sistema, reforzando su sostenibilidad a largo plazo y acabando definitivamente con la política de préstamos en un plazo que no podrá exceder de 2023',
                  'apartado 4.28', 'Finalidad de las transferencias anuales según el Tribunal de Cuentas, que cita el Informe del Pacto de Toledo.')
    texto_literal('acuerdo-cortes-endeudamiento', '2025',
                  r'Adoptar las medidas legislativas necesarias para resolver la situación financiera del endeudamiento del Sistema de la Seguridad Social frente al Estado, en particular la de los préstamos y deudas pendientes de amortización desde la década de los años 90',
                  'Acuerdos de la Comisión Mixta publicados en el BOE de 9 de diciembre de 2025', 'Acuerdo de la Comisión Mixta para las Relaciones con el Tribunal de Cuentas (publicado en 2025). Pide medidas legislativas; no establece ninguna cancelación o conversión.')
    texto_literal('origen-prestamos-gestion-ordinaria', '2022',
                  r'La solución adoptada inicialmente para cubrir estos gastos de gestión ordinaria ha sido la concesión de sucesivos préstamos a largo plazo por el Estado a la TGSS',
                  L, 'Cómo describe el Tribunal de Cuentas el origen de los préstamos de 2017 a 2022 (antecedente: recursos propios insuficientes para los gastos de gestión ordinaria).')
    texto_literal('definicion-costes-impropios-pacto-toledo', '2022',
                  r'las cotizaciones sociales siguen sufragando prestaciones, políticas o partidas de gastos que no pertenecen estrictamente al ámbito de la Seguridad Social y que, por tanto, deberían ser objeto de financiación por la fiscalidad general',
                  L, 'Constatación del Informe de Evaluación y Reforma del Pacto de Toledo (3 de noviembre de 2020) tal como la recoge el Tribunal de Cuentas; base de las transferencias por costes «impropios».')
    texto_literal('transferencias-forma-preferida-tribunal', '2022',
                  r'Esta fórmula de financiación ha sido propuesta por el Tribunal de Cuentas como la más idónea, para evitar recurrir a nuevos préstamos',
                  'nota 67 al apartado 4.28', 'Opinión del Tribunal de Cuentas sobre la forma de financiación mediante transferencias corrientes.')

    obj = {
        'tipo': 'datos', 'id': 'prestamos-transferencias-tribunal-cuentas',
        'title': 'Préstamos y transferencias del Estado a la Seguridad Social según la Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2022',
        'description': 'Cifras y citas del Tribunal de Cuentas publicadas en el BOE (BOE-A-2025-25090): saldo de endeudamiento de la Seguridad Social frente al Estado a 31-12-2022 y su composición, transferencias corrientes 2018-2022 por finalidad, aportaciones no contributivas y recomendaciones sobre los préstamos antiguos.',
        'data': sorted(datos, key=lambda d: (d['period'], d['id'])),
    }
    with open(f'{REPO}/data/sistema/prestamos-transferencias-tribunal-cuentas.json', 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('escrito sistema/prestamos-transferencias-tribunal-cuentas', len(datos))


if __name__ == '__main__':
    main()
