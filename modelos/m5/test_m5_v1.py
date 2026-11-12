from pathlib import Path
import pytest
import m5_reposicion as v0
from m5_v1 import ParamsV1, simular, _proyecta

RUTA = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "parametros")
P = ParamsV1.desde_repo(RUTA)
SIN = dict(ipc=0.0, topes=False, minima=False, actualizar=False)


@pytest.mark.parametrize("T,g,ini", [(2045, 0.01, 25), (2050, 0.02, 22), (2035, 0.0, 30)])
def test_coincide_con_v0(T, g, ini):
    a = simular(1.0, g, ini, T, P, **SIN)
    b = v0.simular(1.0, g, ini, T, P.base)
    assert a["rr_ultimo_salario"] == pytest.approx(b["rr_ultimo_salario"], rel=1e-6)


def test_base_maxima_crece_ipc_mas_1_2pp():
    a, b = _proyecta(P.base_max, P.inc_base_max, 0.02, 2026), _proyecta(P.base_max, P.inc_base_max, 0.02, 2027)
    assert b / a == pytest.approx(1.032)


def test_pension_maxima_crece_ipc_mas_0_115pp():
    a, b = _proyecta(P.pension_max, P.inc_pension_max, 0.02, 2026), _proyecta(P.pension_max, P.inc_pension_max, 0.02, 2027)
    assert b / a == pytest.approx(1.02115)


def test_salario_alto_topado():
    assert simular(3.0, 0.01, 22, 2045, P)["estado"] == "maxima"


def test_salario_bajo_minima():
    assert simular(0.4, 0.01, 22, 2030, P)["estado"] == "minima"


def test_lagunas_reducen_pension():
    a = simular(1.0, 0.01, 22, 2045, P)
    b = simular(1.0, 0.01, 22, 2045, P, lagunas_meses=36)
    assert b["pension_final"] < a["pension_final"]


def test_integracion_mejor_que_cero():
    # Con integración, 36 meses de laguna cuestan mucho menos que perder 36 meses de base plena
    a = simular(1.0, 0.0, 22, 2045, P, ipc=0.0, topes=False, minima=False)
    b = simular(1.0, 0.0, 22, 2045, P, ipc=0.0, topes=False, minima=False, lagunas_meses=36)
    assert b["pension_final"] > a["pension_final"] * (1 - 36 / 350)


def test_opcion_25_anos_solo_hasta_2043():
    assert P.op25_aplica[2043] == 1 and P.op25_aplica.get(2045, 0) == 0


def test_actualizacion_eleva_pension_con_inflacion():
    kw = dict(ipc=0.03, topes=False, minima=False)
    assert simular(1.0, 0.0, 22, 2045, P, actualizar=True, **kw)["pension_final"] > \
           simular(1.0, 0.0, 22, 2045, P, actualizar=False, **kw)["pension_final"]
