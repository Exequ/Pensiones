import math, os
from m5_reposicion import *
from m5_reposicion import _valor

from pathlib import Path
# Por defecto busca ../Pensiones/data/parametros (carpeta hermana de m5). PARAM_DIR la sustituye.
RUTA = os.environ.get("PARAM_DIR") or str((next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "parametros"))
P = Parametros.desde_repo(RUTA)

def casi(a, b, tol=1e-6): assert math.isclose(a, b, abs_tol=tol), (a, b)

def test_escala_basica():
    t = P.escala[2023]
    casi(porcentaje(179, t), 0)
    casi(porcentaje(180, t), 50)
    casi(porcentaje(180 + 49, t), 50 + 49 * 0.21)
    casi(porcentaje(180 + 49 + 209, t), 100)
    casi(porcentaje(900, t), 100)           # tope 100 %

def test_escala_100_coincide_con_serie():
    """Los años necesarios para el 100 % de la serie cotizacion-para-100 deben dar 100."""
    import json
    d = json.load(open(f"{RUTA}/cotizacion-para-100.json", encoding="utf-8"))
    for x in d["data"]:
        a = int(x["period"])
        if a >= 2013:
            casi(porcentaje(int(x["value"]), P.escala[a]), 100, 1e-6)

def test_divisor_coherente():
    for a, v in P.divisor.items():
        n = v * 12 / 14
        assert abs(n - round(n)) < 0.02, (a, v)           # nº entero de bases
        assert round(n) <= P.periodo[a], (a, n, P.periodo[a])

def test_g0_carrera_larga_da_100_por_cien():
    r = simular(1.0, 0.0, 20, 2030, P)
    casi(r["porcentaje"], 100); casi(r["edad_jubilacion"], 65)
    casi(r["rr_ultimo_salario"], 1.0)                       # 14 pagas = 12 bases

def test_carrera_corta_retira_a_edad_ordinaria():
    r = simular(1.0, 0.0, 30, 2026, P)
    casi(r["edad_jubilacion"] * 12, P.edad[2026])
    casi(r["anios_cotizados"] * 12, P.edad[2026] - 360)

def test_opcion_25_anios_es_mas_favorable_con_crecimiento():
    meses = 480
    bases = [(1.02) ** (-(k / 12)) for k in range(meses, 0, -1)]
    general = base_reguladora(bases, P.periodo[2030], P.divisor[2030])
    assert base_reguladora_con_opcion(bases, 2030, P) >= general
    # fuera de la opción (2041+) solo rige la regla general
    casi(base_reguladora_con_opcion(bases, 2045, P),
         base_reguladora(bases, _valor(P.periodo, 2045), _valor(P.divisor, 2045)))

def test_mas_crecimiento_menos_reposicion_sobre_ultimo_salario():
    a = simular(1.0, 0.00, 22, 2035, P)["rr_ultimo_salario"]
    b = simular(1.0, 0.02, 22, 2035, P)["rr_ultimo_salario"]
    assert b < a

if __name__ == "__main__":
    n = 0
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); n += 1; print("OK", k)
    print(f"{n} tests pasan")
