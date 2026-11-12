import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import pytest
from m2_cotizantes import DatosM2, proyectar_cotizantes, relacion_con_pensiones, contraste_ageing, ANIO_REF
from m3_pensiones import FotoPensiones, proyectar_pensiones, resumen_pensiones

@pytest.fixture(scope="module")
def d(): return DatosM2()

@pytest.fixture(scope="module")
def base(d): return proyectar_cotizantes(d)[0]

def test_2026_cerca_de_2025(d, base):
    # afiliados de dic. 2025 de la estadística (tramos 16+) frente a dic. 2026 del modelo: variación < 3 %
    a25 = sum(v.sum() for v in d.afil.values())
    assert abs(base.afiliados_dic[2026] / a25 - 1) < 0.03

def test_base_2026_crece_con_salarios(d, base):
    esperado = d.base_total_rg_2025 * 1.01 * 1.02
    assert abs(base.base_total_rg_meur[2026] * 1e6 / esperado - 1) < 0.06

def test_recaudacion_es_tipo_por_base(d, base):
    assert base.recaudacion_cc_rg_meur[2030] == pytest.approx(base.base_total_rg_meur[2030] * d.tipo_cc)

def test_g_y_ipc_solo_cambian_importes(d, base):
    b2, _ = proyectar_cotizantes(d, g=0.02)
    assert b2.cotizantes_rg[2040] == pytest.approx(base.cotizantes_rg[2040])
    assert b2.base_total_rg_meur[2040] > base.base_total_rg_meur[2040]

def test_palancas_sentido(d, base):
    for kw in ({"convergencia_mujeres": 1.0}, {"mult_tasa_55_64": 1.1}, {"mult_tasa": 1.05}):
        b2, _ = proyectar_cotizantes(d, **kw)
        assert b2.afiliados_dic[2050] > base.afiliados_dic[2050]
        assert b2.afiliados_dic[2026] == pytest.approx(base.afiliados_dic[2026], rel=0.02)
    b3, _ = proyectar_cotizantes(d, mult_migracion=0.0)
    assert b3.afiliados_dic[2050] < base.afiliados_dic[2050]

def test_contraste_ageing(d, base):
    foto = FotoPensiones()
    pens, _ = proyectar_pensiones(foto, d.m1, anio_fin=2050)
    rel = relacion_con_pensiones(base, resumen_pensiones(pens, foto.ratio_pensionistas))
    c = contraste_ageing(rel)
    assert c.dif_pp.abs().max() < 6
