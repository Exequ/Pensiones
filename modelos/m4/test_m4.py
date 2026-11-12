import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import pytest
from m4_financiero import DatosM4, proyectar_finanzas, contraste_ageing, CLASES

@pytest.fixture(scope="module")
def d(): return DatosM4()

@pytest.fixture(scope="module")
def base(d): return proyectar_finanzas(d)

def test_calibracion_2025_por_clase(d):
    for c in CLASES:
        assert d.n_2025[c] * d.pm_2025[c] * 14 * d.factor_devengo[c] / 1e6 == pytest.approx(d.gasto_pens_2025[c])
        assert 0.8 < d.factor_devengo[c] < 1.02

def test_saldo_2025_reproduce_el_presupuesto(d):
    assert d.ingreso_total_nofin_2025 - d.gasto_total_nofin_2025 == pytest.approx(-7187.89, abs=1)

def test_2026_cerca_de_2025(d, base):
    assert 0.03 < base.gasto_pensiones[2026] / d.gasto_pens_total_2025 - 1 < 0.09

def test_saldo_es_suma_de_partes(base):
    r = base.loc[2040]
    assert r.saldo_no_financiero == pytest.approx(r.cotizaciones - r.gasto_pensiones - r.otros_gastos + r.transferencias_y_otros)

def test_fondo_sin_disposiciones_antes_de_2033(base):
    assert base.loc[:2032].disposicion_fondo.sum() == 0
    assert (base.fondo_reserva.loc[2026:2032].diff().dropna() > 0).all()

def test_disposicion_respeta_limite_y_saldo_del_fondo(d, base):
    for t, r in base.iterrows():
        if t >= 2033:
            assert r.disposicion_fondo <= d.limite_fondo[t] / 100 * r.pib_proxy + 1e-6
    assert (base.fondo_reserva >= 0).all()

def test_mei_se_acaba_en_2050(d):
    assert d.mei_tipo[2029] == 1.2
    from m4_financiero import _tipo_mei
    assert _tipo_mei(d, 2051) == 0 and _tipo_mei(d, 2040) == 1.2

def test_palancas_sentido(d, base):
    assert proyectar_finanzas(d, reval_extra=0.01).gasto_pensiones[2040] > base.gasto_pensiones[2040]
    assert proyectar_finanzas(d, cotizacion_extra_pp=1.0).saldo_no_financiero[2040] > base.saldo_no_financiero[2040]
    assert proyectar_finanzas(d, kw_m1={"mult_migracion": 0.0}).saldo_no_financiero_pct_pib[2050] < base.saldo_no_financiero_pct_pib[2050]
    assert proyectar_finanzas(d, mult_pension_alta=1.1).gasto_pensiones[2040] > base.gasto_pensiones[2040]

def test_g_alto_reduce_el_gasto_sobre_pib(d, base):
    assert proyectar_finanzas(d, g=0.018).gasto_pensiones_pct_pib[2050] < base.gasto_pensiones_pct_pib[2050]

def test_contraste_ageing_tendencia(d, base):
    c = contraste_ageing(base, d)
    assert (c.m4_indice.diff().dropna() > 0).all() and c.m4_indice[2050] > 115

def test_enlace_m5_central_casi_neutro(d, base):
    v0 = proyectar_finanzas(d, enlace_m5=False)
    assert abs(base.gasto_pensiones[2050] / v0.gasto_pensiones[2050] - 1) < 0.01

def test_altas_topadas_reducen_el_gasto(d, base):
    t = proyectar_finanzas(d, frac_altas_topadas=0.2)
    assert t.gasto_pensiones[2050] < base.gasto_pensiones[2050]
    assert t.gasto_pensiones[2030] == pytest.approx(base.gasto_pensiones[2030], rel=0.01)
