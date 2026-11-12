from pathlib import Path
import numpy as np
import pytest
from m1_demografia import Datos, SEXOS, paso, proyectar, contraste, backtest, resumen

RUTA = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "demografia")
D = Datos(RUTA)


def test_sin_mortalidad_ni_migracion_ni_nacimientos_conserva_poblacion():
    pob = D.poblacion(2020)
    cero = {s: np.zeros(101) for s in SEXOS}
    nueva, nac = paso(pob, cero, np.zeros(101), cero)
    assert sum(nueva[s][1:].sum() for s in SEXOS) == pytest.approx(sum(pob[s].sum() for s in SEXOS))
    assert nac == 0


def test_mortalidad_total_elimina_poblacion():
    pob = D.poblacion(2020)
    uno = {s: np.ones(101) for s in SEXOS}
    cero = {s: np.zeros(101) for s in SEXOS}
    nueva, _ = paso(pob, uno, np.zeros(101), cero)
    assert sum(nueva[s].sum() for s in SEXOS) == pytest.approx(0, abs=1e-6)


def test_poblacion_inicial_cuadra_con_ine():
    t = resumen(D.poblacion(2026, proy=True))["total"]
    assert t == pytest.approx(resumen(D.poblacion(2026))["total"], rel=1e-3)


def test_contraste_con_ine_dentro_de_tolerancia():
    c = contraste(D)
    assert c["err_total_%"].abs().max() < 1.0
    assert c["err_65_mas_%"].abs().max() < 2.5
    assert c["err_dep_pp"].abs().max() < 3.5


def test_backtest_total_dentro_de_tolerancia():
    b = backtest(D)
    assert b["err_total_%"].abs().max() < 1.0
    assert b["err_65_mas_%"].abs().max() < 1.0


def test_palancas_van_en_el_sentido_esperado():
    base, nb = proyectar(D, 2026, 2060)
    alta, na = proyectar(D, 2026, 2060, mult_fecundidad=1.2)
    sinm, _ = proyectar(D, 2026, 2060, mult_migracion=0.0)
    mej, _ = proyectar(D, 2026, 2060, mejora_extra=0.01)
    assert na[2040] > nb[2040]
    assert resumen(sinm[2060])["total"] < resumen(base[2060])["total"]
    assert resumen(mej[2060])["65_mas"] > resumen(base[2060])["65_mas"]


def test_ajuste_mortalidad_75mas_reduce_mayores():
    base, _ = proyectar(D, 2026, 2050)
    cal, _ = proyectar(D, 2026, 2050, ajuste_q_75mas=1.08)
    assert resumen(cal[2050])["80_mas"] < resumen(base[2050])["80_mas"]
    assert resumen(cal[2050])["0_15"] == pytest.approx(resumen(base[2050])["0_15"], rel=1e-3)
