import math
from pathlib import Path
from m5_reposicion import Parametros
from m6_nocional import *
from m6_nocional import _B, TARGET_E65

RUTA = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "parametros")
P = Parametros.desde_repo(RUTA)

def test_calibracion_e65():
    for s in ("H", "M"):
        S = supervivencia(65, ANIO_REF, s, 0.0)
        assert abs((sum(S) - 0.5) - TARGET_E65[s]) < 0.15, (s, sum(S) - 0.5)

def test_mujeres_viven_mas_y_mejora_alarga():
    h = sum(supervivencia(65, 2045, "H", 0.0)); m = sum(supervivencia(65, 2045, "M", 0.0))
    assert m > h
    assert sum(supervivencia(65, 2045, "H", 0.01)) > h

def test_supervivencia_monotona():
    S = supervivencia(65, 2045, "H", 0.01)
    assert all(S[i] >= S[i + 1] for i in range(len(S) - 1)) and S[0] == 1.0

def test_ndc_g0_formula_cerrada():
    r = comparar(P, 1.0, 0.0, 22, 2030, c=0.16, sexo="H", mejora=0.0)
    esperado = 0.16 * r["anios_cot"] * 12 / r["divisor_G"] / 12
    assert math.isclose(r["rr_ndc"], esperado, rel_tol=1e-9), (r["rr_ndc"], esperado)

def test_ndc_es_actuarialmente_justo():
    """Con r = g la TIR del sistema nocional debe ser ≈ r (por construcción)."""
    for g in (0.0, 0.01, 0.02):
        r = comparar(P, 1.0, g, 22, 2045, c=0.16, sexo="H", mejora=0.01)
        assert abs(r["tir_ndc"] - g) < 0.003, (g, r["tir_ndc"])

def test_ndc_ajusta_a_longevidad_y_espana_no():
    a = comparar(P, 1.0, 0.01, 22, 2045, c=0.16, sexo="H", mejora=0.0)
    b = comparar(P, 1.0, 0.01, 22, 2045, c=0.16, sexo="H", mejora=0.02)
    assert b["rr_ndc"] < a["rr_ndc"]               # más longevidad, menos pensión inicial
    assert math.isclose(a["rr_es"], b["rr_es"])    # el sistema español no se mueve

def test_tipo_cc_total_del_repo():
    assert 0.2 < tipo_cc_total(RUTA) < 0.4

if __name__ == "__main__":
    n = 0
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); n += 1; print("OK", k)
    print(f"{n} tests pasan")
