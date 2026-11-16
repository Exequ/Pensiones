"""Pruebas unitarias de las validaciones del ETL de la Fase 5-A3 (casos hechos a mano, sin PDF).

Se ejecutan con `python3 -I scripts/etl/test_etl_5a3.py` (y desde Vitest en scripts/etl-5a3.test.ts)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ssf_liquidacion_pdf as liq  # noqa: E402
import tc_cge2023_seguridad_social as tc  # noqa: E402


def fila(n, seccion, etiqueta, *valores):
    return {'fila': n, 'seccion': seccion, 'etiqueta': etiqueta, 'valores': list(valores), 'linea': etiqueta, 'pagina': 1}


class Numeros(unittest.TestCase):
    def test_formato_es(self):
        self.assertEqual(liq.num('3.425,70'), 3425.7)
        self.assertEqual(liq.num('-12,34%'), -12.34)
        self.assertEqual(liq.num('0,00'), 0.0)
        self.assertIsNone(liq.num('-'))
        self.assertIsNone(liq.num('--'))

    def test_tribunal_conserva_decimales(self):
        self.assertEqual(tc.num('116.166,4'), 116166.4)
        self.assertEqual(tc.num('7,75'), 7.75)
        self.assertEqual(tc.num('52.213'), 52213.0)


class Paginas(unittest.TestCase):
    def test_tabla_por_titulo(self):
        self.assertEqual(liq.tabla_de_pagina('CAPITULOS 1 Y 4 DEL PRESUPUESTO DE INGRESOS'), 'ingresos-cap1-cap4')
        self.assertEqual(liq.tabla_de_pagina('CAPITULO 4 DEL PRESUPUESTO DE GASTOS'), 'gastos-cap4')
        self.assertEqual(liq.tabla_de_pagina('PRESUPUESTO DE INGRESOS'), 'ingresos')
        self.assertEqual(liq.tabla_de_pagina('PRESUPUESTO DE GASTOS'), 'gastos')
        self.assertIsNone(liq.tabla_de_pagina('otra cosa'))

    def test_tipo_por_cabecera_y_no_por_titulo(self):
        # El PDF de 2015 titula «ejercicio 2014» una página cuyas columnas son 2014 y 2015: manda la cabecera.
        t = 'LIQUIDACIÓN DEL EJERCICIO 2014\nEJERCICIO 2014   EJERCICIO 2015   ABSOLUTO'
        self.assertEqual(liq.tipo_de_pagina(t), ('comparacion', (2014, 2015)))
        self.assertEqual(liq.tipo_de_pagina('PRESUPUESTO  INICIAL   OB.REC./\nPTO.TOTAL')[0], 'liquidacion')
        self.assertEqual(liq.tipo_de_pagina('PREVISIONES   DE   INGRESOS')[0], 'liquidacion')
        with self.assertRaises(ValueError):
            liq.tipo_de_pagina('sin cabecera')

    def test_filas_con_etiqueta_en_la_linea_anterior(self):
        texto = (
            'OPERACIONES CORRIENTES\n'
            '1. Gastos de personal                 2.482,65     53,88     2.536,53    2.403,00   94,74%\n'
            'TOTAL GASTOS\n'
            'SISTEMA DE LA SEGURIDAD SOCIAL        124.628,67   9.283,54  133.912,21  131.327,36  98,07%\n'
        )
        filas = liq.filas_de_pagina(texto)
        self.assertEqual([f['etiqueta'] for f in filas], ['1. Gastos de personal', 'TOTAL GASTOS SISTEMA DE LA SEGURIDAD SOCIAL'])
        self.assertEqual(filas[0]['valores'], [2482.65, 53.88, 2536.53, 2403.0, 94.74])
        self.assertEqual(filas[0]['seccion'], 'OPERACIONES CORRIENTES')

    def test_etiquetas_comparables(self):
        self.assertEqual(liq.norm('Prestac.y entreg únicas'), liq.norm('Prestac. y entreg. únicas'))
        self.assertEqual(liq.norm_sec('C) OTRAS TRANSF. CORRIENTES'), liq.norm_sec('C) OTRAS TRANSFERENCIAS CORRIENTES'))


class Sumas(unittest.TestCase):
    COLUMNAS = ['ejercicio_anterior', 'ejercicio_actual', 'incremento_absoluto', 'incremento_relativo']

    def tabla(self, estado=100.0, otros=20.0, total=120.0):
        return [
            fila(1, '1. COTIZACIONES SOCIALES', 'Régimen general', 50.0, 50.0, 0.0, 0.0),
            fila(2, '1. COTIZACIONES SOCIALES', 'Desempleados', 10.0, 10.0, 0.0, 0.0),
            fila(3, '1. COTIZACIONES SOCIALES', 'TOTAL COTIZACIONES SOCIALES', 60.0, 60.0, 0.0, 0.0),
            fila(4, '4. TRANSFERENCIAS CTES.', 'Del Estado', estado, estado, 0.0, 0.0),
            fila(5, '4. TRANSFERENCIAS CTES.', 'Del Exterior', otros, otros, 0.0, 0.0),
            fila(6, '4. TRANSFERENCIAS CTES.', 'TOTAL TRANSFERENCIAS CORRIENTES', total, total, 0.0, 0.0),
        ]

    def test_una_tabla_que_cuadra_pasa(self):
        res = liq.comprobar_sumas('ingresos-cap1-cap4', self.tabla(), self.COLUMNAS, [0, 1])
        self.assertEqual(len(res), 4)
        self.assertTrue(all(r['ok'] for r in res))

    def test_una_tabla_que_no_cuadra_se_detecta(self):
        res = liq.comprobar_sumas('ingresos-cap1-cap4', self.tabla(total=125.0), self.COLUMNAS, [1])
        malas = [r for r in res if not r['ok']]
        self.assertEqual(len(malas), 1)
        self.assertEqual(malas[0]['diferencia'], -5.0)

    def test_la_tolerancia_de_redondeo_es_la_declarada(self):
        # Con tres cifras (dos partidas y el total), la tolerancia es 0,02; un céntimo cuadra y cinco, no.
        self.assertAlmostEqual(liq.tolerancia(3), 0.015)
        self.assertEqual(liq.tolerancia(1), 0.01)
        ok = liq.comprobar_sumas('ingresos-cap1-cap4', self.tabla(total=120.01), self.COLUMNAS, [1])
        self.assertTrue(all(r['ok'] for r in ok))
        mal = liq.comprobar_sumas('ingresos-cap1-cap4', self.tabla(total=120.05), self.COLUMNAS, [1])
        self.assertFalse(all(r['ok'] for r in mal))

    def test_gastos_cap4_suma_pensiones_y_total(self):
        cols = ['presupuesto_inicial', 'modificaciones', 'presupuesto_total', 'obligaciones_reconocidas', 'porcentaje']
        f = lambda n, sec, et, v: fila(n, sec, et, 0.0, 0.0, v, v, 0.0)  # noqa: E731
        filas = [
            f(1, '1.PENSIONES', 'Jubilación', 70.0),
            f(2, '1.PENSIONES', 'Viudedad', 30.0),
            f(3, '1.PENSIONES', 'SUMA PENSIONES', 100.0),
            f(4, '2. SUBSIDIOS Y OTRAS PRESTACIONES', 'Incapacidad temporal', 10.0),
            f(5, '2. SUBSIDIOS Y OTRAS PRESTACIONES', 'SUMA SUBSIDIOS Y OTRAS PRESTACIONES', 10.0),
            f(6, 'A) PRESTACIONES CONTRIBUTIVAS', 'TOTAL PRESTACIONES CONTRIBUTIVAS', 110.0),
            f(7, 'B) PRESTACIONES NO CONTRIBUTIVAS', 'Pensiones de invalidez', 5.0),
            f(8, 'B) PRESTACIONES NO CONTRIBUTIVAS', 'SUMA PREST. NO CONTRIBUTIVAS', 5.0),
            f(9, 'C) OTRAS TRANSFERENCIAS CORRIENTES', 'Al exterior', 2.0),
            f(10, 'C) OTRAS TRANSFERENCIAS CORRIENTES', 'SUMA OTRAS TRANSF. CORRIENTES', 2.0),
            f(11, 'C) OTRAS TRANSFERENCIAS CORRIENTES', 'TOTAL TRANSFERENCIAS CORRIENTES', 117.0),
        ]
        res = liq.comprobar_sumas('gastos-cap4', filas, cols, [3])
        self.assertTrue(all(r['ok'] for r in res), [r for r in res if not r['ok']])
        filas[10] = f(11, 'C) OTRAS TRANSFERENCIAS CORRIENTES', 'TOTAL TRANSFERENCIAS CORRIENTES', 118.0)
        res = liq.comprobar_sumas('gastos-cap4', filas, cols, [3])
        self.assertEqual([r['regla'] for r in res if not r['ok']], ['TOTAL TRANSFERENCIAS CORRIENTES = contributivas + no contributivas + otras'])

    def test_una_partida_ausente_o_repetida_es_un_error_y_no_un_cero(self):
        with self.assertRaises(LookupError):
            liq.buscar(self.tabla(), r'^Inexistente')
        repetida = self.tabla() + [fila(7, '4. TRANSFERENCIAS CTES.', 'Del Estado', 1.0, 1.0, 0.0, 0.0)]
        with self.assertRaises(LookupError):
            liq.buscar(repetida, r'^Del Estado$')


class SerieDerivada(unittest.TestCase):
    def test_pensiones_con_complemento_suma_desde_el_ano_en_que_figura_aparte(self):
        series = [
            {'id': 'gastos-suma-pensiones-contributivas', 'points': [{'period': '2014', 'value': 100.0}, {'period': '2015', 'value': 90.0}]},
            {'id': 'gastos-complemento-a-minimos', 'points': [{'period': '2015', 'value': 8.0}]},
        ]
        ok = [{'ok': True}]
        puntos = liq.serie_derivada_pensiones(series, ok)
        self.assertEqual([(p['period'], p['value']) for p in puntos], [('2014', 100.0), ('2015', 98.0)])

    def test_sin_complemento_aparte_desde_2015_no_se_publica_ese_ano(self):
        series = [
            {'id': 'gastos-suma-pensiones-contributivas', 'points': [{'period': '2015', 'value': 90.0}]},
        ]
        self.assertEqual(liq.serie_derivada_pensiones(series, [{'ok': True}]), [])

    def test_si_la_reclasificacion_no_cuadra_no_se_publica_nada(self):
        series = [{'id': 'gastos-suma-pensiones-contributivas', 'points': [{'period': '2014', 'value': 100.0}]}]
        self.assertIsNone(liq.serie_derivada_pensiones(series, [{'ok': False}]))


class Tribunal(unittest.TestCase):
    def test_limpia_quita_llamadas_a_nota(self):
        self.assertEqual(tc.limpia('transferencias corrientes63 por 81.829,3 millones'), 'transferencias corrientes por 81.829,3 millones')
        self.assertEqual(tc.limpia('el PIB de 2023  y   más'), 'el PIB de 2023 y más')

    def test_correspondencia_de_paginas(self):
        self.assertEqual(len(tc.PAGINAS_ORIGINAL), 42)
        self.assertEqual(tc.PAGINAS_ORIGINAL[:5], [1, 2, 3, 15, 35])
        self.assertEqual(tc.PAGINAS_ORIGINAL[-3:], [467 + 3, 511, 553])
        self.assertEqual(sorted(tc.PAGINAS_ORIGINAL), tc.PAGINAS_ORIGINAL)


if __name__ == '__main__':
    unittest.main(verbosity=1)
