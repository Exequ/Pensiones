"""Pruebas unitarias de las validaciones de los ETL de la Fase 5-A4 (casos hechos a mano, sin PDF).

Se ejecutan con `python3 -I scripts/etl/test_etl_5a4.py` (y desde Vitest en scripts/extraccion-pdf-5a4.test.ts)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boe_revalorizacion_2011 as boe  # noqa: E402
import ss_complementos_genero as gen  # noqa: E402
import ssf_liquidacion_2025 as liq  # noqa: E402


def fila(n, seccion, etiqueta, *valores):
    return {'fila': n, 'seccion': seccion, 'etiqueta': etiqueta, 'valores': list(valores), 'linea': etiqueta, 'pagina': 1}


class Liquidacion2025(unittest.TestCase):
    def test_tabla_por_titulo_con_tilde(self):
        self.assertEqual(liq.tabla_de_pagina('CAPÍTULO 4 DEL PRESUPUESTO DE GASTOS'), 'gastos-cap4')
        self.assertEqual(liq.tabla_de_pagina('CAPÍTULO 4 PRESUPUESTO DE GASTOS'), 'gastos-cap4')
        self.assertEqual(liq.tabla_de_pagina('CAPITULOS 1 Y 4 DEL PRESUPUESTO DE INGRESOS'), 'ingresos-cap1-cap4')
        self.assertEqual(liq.tabla_de_pagina('PRESUPUESTO DE INGRESOS'), 'ingresos')
        self.assertEqual(liq.tabla_de_pagina('PRESUPUESTO DE GASTOS'), 'gastos')
        self.assertIsNone(liq.tabla_de_pagina('otra cosa'))

    def test_une_total_en_dos_lineas(self):
        t = 'TOTAL GASTOS\n                  231.866,86   244.816,94   12.950,08   5,59%\nSISTEMA'
        self.assertIn('TOTAL GASTOS    231.866,86', liq.une_lineas(t))

    def test_une_rotulo_partido_con_cifras_en_medio(self):
        t = 'Desempleados y Benef. Prest. Erte, Mec, Red, Cese Activ y\n   9.672,16   10.213,33   541,17   5,60%\nBonif. Fomento Empleo\nTOTAL'
        u = liq.une_lineas(t)
        self.assertIn('Desempleados y Benef. Prest. Erte, Mec, Red, Cese Activ y Bonif. Fomento Empleo    9.672,16', u)
        self.assertNotIn('\nBonif. Fomento Empleo\n', u)

    def test_mapa_de_cap4_manda_la_seccion(self):
        # «Farmacia» y «Prestaciones sociales» están en la sección contributiva y en la no contributiva
        self.assertIs(liq.mapa_de('gastos-cap4', {'seccion': 'B) PRESTAC. NO CONTRIBUTIVAS', 'etiqueta': 'Farmacia'}), liq.MAPA_CAP4_NOCON)
        self.assertIs(liq.mapa_de('gastos-cap4', {'seccion': 'SUBSIDIOS Y OTRAS PRESTACIONES', 'etiqueta': 'Farmacia'}), liq.MAPA_CAP4)
        self.assertIs(liq.mapa_de('gastos-cap4', {'seccion': 'C) OTRAS TRANSF. CORRIENTES', 'etiqueta': 'A la Seguridad Social'}), liq.MAPA_CAP4_NOCON)

    def test_normaliza_rotulos_de_la_ejecucion(self):
        self.assertEqual(liq.norm_ej('SUMA DE OPERACIONES CORRIENTES'), liq.norm_ej('SUMA OPERACIONES CORRIENTES'))
        self.assertEqual(liq.norm_ej('2. GASTOS CORRIENTES BIENES Y SERVICIOS'), liq.norm_ej('2. Gastos corrientes en bienes y servicios'))
        self.assertEqual(liq.norm_ej('TOTAL INGRESOS SISTEMA DE LA SEGURIDAD SOCIAL'), liq.norm_ej('TOTAL INGRESOS'))
        self.assertNotEqual(liq.norm_ej('JUBILACIÓN'), liq.norm_ej('INVALIDEZ'))

    def test_registra_marca_la_suma_que_no_cuadra(self):
        res = []
        liq.registra(res, 'gastos', 'comparacion', [1], 'suma', 'ejercicio_actual', 100.0, [60.0, 40.0])
        liq.registra(res, 'gastos', 'comparacion', [1], 'suma', 'ejercicio_actual', 100.0, [60.0, 39.0])
        liq.registra(res, 'gastos', 'comparacion', [1], 'suma', 'ejercicio_actual', 100.0, [60.0, 40.01])
        self.assertEqual([r['ok'] for r in res], [True, False, True])
        self.assertEqual(res[1]['diferencia'], -1.0)

    def test_contraste_detecta_una_diferencia(self):
        por = {
            ('gastos', 'comparacion'): {'paginas': [1], 'tabla': 'gastos', 'tipo': 'comparacion', 'filas': [
                {**fila(1, '', '1. Gastos de personal', 2795.52, 2797.84, 2.32), 'pagina': 1},
            ]},
        }
        for t in ('gastos-cap4', 'ingresos', 'ingresos-cap1-cap4'):
            por[(t, 'comparacion')] = {'paginas': [1], 'tabla': t, 'tipo': 'comparacion', 'filas': []}
        ejec = [
            {'ejercicio': '2025', 'periodo': '2025-T4', 'tabla': 'gastos', 'concepto': '1. GASTOS DE PERSONAL', 'columna': 'principal',
             'prevision_o_presupuesto_meur': '3003.78', 'derechos_u_obligaciones_meur': '2797.84', 'recaudacion_o_pagos_meur': ''},
            {'ejercicio': '2024', 'periodo': '2024-T4', 'tabla': 'gastos', 'concepto': '1. GASTOS DE PERSONAL', 'columna': 'principal',
             'prevision_o_presupuesto_meur': '1', 'derechos_u_obligaciones_meur': '2800.00', 'recaudacion_o_pagos_meur': ''},
        ]
        filas, sin = liq.contrasta(por, ejec)
        estados = {f['ejercicio']: (f['estado'], f['diferencia_meur']) for f in filas}
        self.assertEqual(estados[2025][0], 'coincide')
        self.assertEqual(estados[2024], ('difiere', 4.48))
        self.assertEqual(sin, [])


class ComplementosGenero(unittest.TestCase):
    def test_formatos_de_cifra(self):
        self.assertEqual(gen.entero('1.736.331'), 1736331)
        self.assertEqual(gen.decimal('76,68'), 76.68)
        self.assertEqual(gen.decimal('1.076,68'), 1076.68)

    def test_fila_de_tabla_brecha(self):
        t = ' Almería                      23.187      83,48      4.033     11.101    5.339    2.713\nTotal   1.736.331   76,68   409.534   885.787   302.895   138.113\nnota sin cifras'
        filas = gen.filas_de_tabla(t, 'brecha')
        self.assertEqual([f['etiqueta'] for f in filas], ['Almería', 'Total'])
        self.assertEqual(filas[0]['valores'], [23187, 83.48, 4033, 11101, 5339, 2713])

    def test_fila_de_maternidad_tiene_una_columna_menos(self):
        t = 'Total   1.005.202   85,19   601.562   264.972   138.620'
        self.assertEqual(len(gen.filas_de_tabla(t, 'maternidad')[0]['valores']), 5)
        self.assertEqual(gen.filas_de_tabla(t, 'brecha'), [])

    def test_cabecera_de_importes(self):
        self.assertEqual(gen.cabecera_importes('(36,90€) (73,80€) (110,70€) (147,60€)', 'brecha'), [36.9, 73.8, 110.7, 147.6])
        self.assertEqual(gen.cabecera_importes('(5%) (10%) (15%)', 'maternidad'), [5.0, 10.0, 15.0])

    def test_clasifica_comunidades_y_provincias_por_suma_exacta(self):
        def f(et, *v):
            return {'etiqueta': et, 'valores': list(v), 'linea': et}
        filas = [
            f('Aragón', 30, 70.0, 10, 20),
            f('Huesca', 10, 71.0, 4, 6),
            f('Zaragoza', 20, 69.0, 6, 14),
            f('Asturias', 12, 60.0, 5, 7),  # uniprovincial: las siguientes no suman 12
            f('Galicia', 50, 70.0, 20, 30),
            f('Lugo', 25, 70.0, 10, 15),
            f('Ourense', 25, 70.0, 10, 15),
        ]
        r = gen.clasifica_territorios(filas)
        self.assertEqual([(x['etiqueta'], x['nivel'], x['comunidad']) for x in r], [
            ('Aragón', 'comunidad', 'Aragón'), ('Huesca', 'provincia', 'Aragón'), ('Zaragoza', 'provincia', 'Aragón'),
            ('Asturias', 'comunidad', 'Asturias'), ('Galicia', 'comunidad', 'Galicia'), ('Lugo', 'provincia', 'Galicia'),
            ('Ourense', 'provincia', 'Galicia')])

    def test_valor_de_indicador(self):
        self.assertEqual(gen.valor_ind('1.736.331'), (1736331, 'entero'))
        self.assertEqual(gen.valor_ind('76,68'), (76.68, 'decimal'))
        self.assertEqual(gen.valor_ind('-0,34%'), (-0.34, '%'))
        self.assertEqual(gen.valor_ind('-3.454'), (-3454, 'entero'))


class RevalorizacionBoe(unittest.TestCase):
    def test_normaliza_espacios_y_saltos(self):
        self.assertEqual(boe.normaliza('a   b\n  c'), 'a b c')

    def test_pagina_boe(self):
        self.assertEqual(boe.pagina_boe('Núm. 318 Viernes 31 de diciembre de 2010 Sec. I. Pág. 109387'), 109387)
        self.assertIsNone(boe.pagina_boe('sin numeración'))

    def test_localiza_cita_en_una_pagina_y_falla_si_no_esta(self):
        docs = {'X': {'paginas': ['uno dos tres', 'cuatro cinco seis cve: BOE-A-2010-1'], 'boe': [1, 2], 'sha256': 'x'}}
        self.assertEqual(boe.localiza(docs, 'X', 'dos  tres'), 1)
        self.assertEqual(boe.localiza(docs, 'X', 'cinco seis'), 2)
        with self.assertRaises(SystemExit):
            boe.localiza(docs, 'X', 'siete')

    def test_localiza_cita_que_cruza_de_pagina(self):
        docs = {'X': {'paginas': ['uno dos cve: BOE-A-2010-1', 'BOLETÍN OFICIAL DEL ESTADO Núm. 1 Lunes 1 de enero de 2010 Sec. I. Pág. 2 tres cuatro'], 'boe': [1, 2], 'sha256': 'x'}}
        self.assertEqual(boe.localiza(docs, 'X', 'dos tres'), 1)

    def test_cita_repetida_falla(self):
        docs = {'X': {'paginas': ['uno dos', 'uno dos'], 'boe': [1, 2], 'sha256': 'x'}}
        with self.assertRaises(SystemExit):
            boe.localiza(docs, 'X', 'uno dos')


if __name__ == '__main__':
    unittest.main(verbosity=1)
