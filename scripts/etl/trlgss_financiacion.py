"""Fase 5-A2: artículo 109 del TRLGSS (recursos de la Seguridad Social y naturaleza de las prestaciones).

Fuente: texto consolidado del Real Decreto Legislativo 8/2015 (BOE-A-2015-11724) que ya está en
data-raw/boe/trlgss-2015-consolidado.txt (lo genera boe_consolidado.py; fecha de descarga de ese
texto: 2026-11-11, que es la fecha que consta en los datos). Extrae del bloque del artículo 109 las
frases que respaldan las afirmaciones de la página «Hucha» sobre el origen de las aportaciones del
Estado. Falla si una frase no aparece literalmente. Escribe data/normativa/trlgss-financiacion.json.
`python3 -I`."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO

TXT = f'{REPO}/data-raw/boe/trlgss-2015-consolidado.txt'
FECHA = '2026-11-11'
FUENTE = {
    'title': 'Real Decreto Legislativo 8/2015, de 30 de octubre, por el que se aprueba el texto refundido de la Ley General de la Seguridad Social (texto consolidado)',
    'publisher': 'Boletín Oficial del Estado (BOE)',
    'url': 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724',
    'docId': 'BOE-A-2015-11724',
}


def bloque_109():
    with open(TXT, encoding='utf-8') as f:
        t = f.read()
    i = t.find('#a109]')
    if i < 0:
        raise SystemExit('sin bloque del artículo 109')
    j = t.find('[Bloque', i)
    return t[i:j]


def main():
    b = bloque_109()
    lineas = b.split('\n')
    datos = []

    def dato(id_, patron, ubicacion, notas):
        m = re.search(patron, b)
        if not m:
            raise SystemExit(f'SIN COINCIDENCIA {id_}: {patron}')
        cita = m.group(0).strip()
        datos.append({'id': id_, 'value': cita, 'unit': 'cita literal', 'period': '2023', 'source': FUENTE, 'fetchedAt': FECHA,
                      'confidence': 'alta', 'notes': notas + ' Texto vigente desde el 1 de enero de 2023 según el consolidado del BOE.', 'quote': cita,
                      'location': ubicacion})

    dato('aportaciones-estado-presupuestos', r'Las aportaciones progresivas del Estado, que se consignarán con carácter permanente en sus Presupuestos Generales, y las que se acuerden para atenciones especiales o resulten precisas por exigencia de la coyuntura',
         'art. 109.1.a', 'El TRLGSS incluye entre los recursos de la Seguridad Social las aportaciones del Estado consignadas en los Presupuestos Generales del Estado.')
    dato('no-contributiva-aportaciones-estado', r'La acción protectora de la Seguridad Social, en su modalidad no contributiva y universal, se financiará mediante aportaciones del Estado al Presupuesto de la Seguridad Social',
         'art. 109.2, primer párrafo', 'La modalidad no contributiva y universal se financia con aportaciones del Estado (con la excepción de la asistencia sanitaria y los servicios sociales transferidos a las comunidades autónomas).')
    dato('contributivas-financiacion-basica', r'Las prestaciones contributivas, los gastos derivados de su gestión y los de funcionamiento de los servicios correspondientes a las funciones de afiliación, recaudación y gestión económico-financiera y patrimonial serán financiadas básicamente con los recursos a que se refieren las letras b\), c\), d\) y e\) del apartado anterior, así como, en su caso, por las aportaciones del Estado que se acuerden para atenciones específicas',
         'art. 109.2, segundo párrafo', 'Las prestaciones contributivas se financian básicamente con cuotas y otros recursos propios, y en su caso con aportaciones del Estado para atenciones específicas.')
    dato('naturaleza-no-contributiva-minimos', r'4\.ª Los complementos por mínimos de las pensiones de la Seguridad Social\.',
         'art. 109.3.b.4.ª', 'La ley clasifica los complementos por mínimos de las pensiones entre las prestaciones de naturaleza no contributiva (a efectos de la financiación del apartado 2).')
    dato('naturaleza-no-contributiva-familiares-imv', r'5\.ª Las prestaciones familiares reguladas en el capítulo I del título VI\.\n6\.ª El ingreso mínimo vital\.',
         'art. 109.3.b.5.ª y 6.ª', 'La ley clasifica las prestaciones familiares y el ingreso mínimo vital entre las de naturaleza no contributiva.')
    if len(lineas) < 5:
        raise SystemExit('bloque demasiado corto')
    obj = {
        'tipo': 'datos', 'id': 'trlgss-financiacion',
        'title': 'TRLGSS, artículo 109: recursos de la Seguridad Social y naturaleza de las prestaciones',
        'description': 'Frases literales del artículo 109 del texto refundido de la Ley General de la Seguridad Social sobre las aportaciones del Estado y la clasificación de las prestaciones como contributivas o no contributivas.',
        'data': datos,
    }
    with open(f'{REPO}/data/normativa/trlgss-financiacion.json', 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('escrito normativa/trlgss-financiacion', len(datos))


if __name__ == '__main__':
    main()
