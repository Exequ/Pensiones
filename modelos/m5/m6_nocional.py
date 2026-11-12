"""
M6 v0 · Cuentas nocionales (estilo sueco) frente al sistema español, para la misma carrera.

Qué hace
  Para la misma carrera tipo de M5 (salario relativo, edad de inicio, crecimiento real g, año de
  jubilación T) calcula:
    - la pensión inicial en un sistema de cuentas nocionales (NDC): saldo = cotizaciones
      capitalizadas al tipo nocional r; pensión inicial = saldo / divisor de anualidad.
    - la pensión inicial del sistema español (reutiliza simular() de M5).
    - la TIR real implícita de cada sistema (tipo al que el valor actual de lo cotizado iguala
      al valor actual de lo esperado cobrar), con la misma tabla de mortalidad.

SUPUESTOS DE ESTA VERSIÓN (v0): cada uno se sustituye en versiones siguientes
  1. MORTALIDAD PROVISIONAL, no oficial: ley de Gompertz calibrada a una esperanza de vida a los
     65 de PRUEBA (hombres 19, mujeres 23) con mejora anual constante. Se sustituirá por las
     tablas del INE (subfase 1B-3). Todos los resultados dependen de ello.
  2. Sin lagunas, sin topes y sin mortalidad antes de la jubilación (condicionado a llegar vivo).
  3. NDC: tipo nocional r (por defecto r = g, salario por trabajador); divisor con tipo "norma" n
     (convención sueca, por defecto 1,6 %); pensión indexada a (1+r)/(1+n)-1 en términos reales.
     Pensión española indexada a precios (real constante), como marca la ley.
  4. Cotización: por defecto el mismo esfuerzo en ambos sistemas (tipo CC total del año más
     reciente en /data). OJO: ese tipo financia también IT, maternidad y otras prestaciones, así
     que es un límite superior de lo que "corresponde" a pensiones; se ofrece 16 % como contraste.
  5. Prestaciones de supervivencia, complementos y mínimos fuera de alcance.
  6. Pagos anuales anticipados (sin ajuste por pagos mensuales).
"""
from __future__ import annotations
import math
from pathlib import Path
from m5_reposicion import Parametros, simular, _serie

TARGET_E65 = {"H": 19.0, "M": 23.0}     # calibración de PRUEBA, no oficial
SLOPE = 0.095                           # pendiente de Gompertz (ln c), supuesto
ANIO_REF = 2025
OMEGA = 110


def _q(B: float, y: int, mejora: float, t_cal: int) -> float:
    mu = B * math.exp(SLOPE * y) * (1 - mejora) ** max(t_cal - ANIO_REF, 0)
    return 1 - math.exp(-mu)


def _e65_sin_mejora(B: float) -> float:
    s, e = 1.0, 0.0
    for y in range(65, OMEGA):
        s *= 1 - _q(B, y, 0.0, ANIO_REF)
        e += s
    return e + 0.5   # aproximación de la esperanza completa a los 65


def _calibrar(sexo: str) -> float:
    lo, hi = 1e-7, 1e-2
    for _ in range(80):
        mid = math.sqrt(lo * hi)
        if _e65_sin_mejora(mid) > TARGET_E65[sexo]:
            lo = mid
        else:
            hi = mid
    return math.sqrt(lo * hi)


_B = {s: _calibrar(s) for s in ("H", "M")}


def supervivencia(edad_ini: int, anio_ini: int, sexo: str, mejora: float) -> list[float]:
    """S_k = P(vivo a edad_ini+k | vivo a edad_ini), tabla generacional. k = 0..OMEGA-edad_ini."""
    s, out = 1.0, []
    for k in range(0, OMEGA - edad_ini + 1):
        out.append(s)
        s *= 1 - _q(_B[sexo], edad_ini + k, mejora, anio_ini + k)
    return out


def anualidad(S: list[float], i: float, idx: float = 0.0) -> float:
    """Σ S_k ((1+idx)/(1+i))^k (pagos anuales anticipados)."""
    return sum(sk * ((1 + idx) / (1 + i)) ** k for k, sk in enumerate(S))


def tipo_cc_total(dir_param: str | Path) -> float:
    d = Path(dir_param)
    emp, tra = _serie(d, "tipo-cc-empresa"), _serie(d, "tipo-cc-trabajador")
    a = max(set(emp) & set(tra))
    return (emp[a] + tra[a]) / 100


def _bases(rel: float, g: float, meses: int) -> list[float]:
    return [rel * (1 + g) ** (-(k / 12)) for k in range(meses, 0, -1)]


def _tir(contrib_anuales: list[float], pension: float, S: list[float], idx: float) -> float:
    Y = len(contrib_anuales)

    def npv(i):
        pv_c = sum(c / (1 + i) ** (j + 1) for j, c in enumerate(contrib_anuales))
        pv_b = sum(pension * sk * (1 + idx) ** k / (1 + i) ** (Y + k) for k, sk in enumerate(S))
        return pv_c - pv_b
    lo, hi = -0.08, 0.20
    if npv(lo) * npv(hi) > 0:
        return float("nan")
    for _ in range(100):
        mid = (lo + hi) / 2
        if npv(lo) * npv(mid) <= 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def comparar(p: Parametros, rel: float, g: float, edad_inicio: float, anio_jub: int,
             c: float, sexo: str = "H", mejora: float = 0.01,
             r_real: float | None = None, norma: float = 0.016) -> dict:
    r = g if r_real is None else r_real
    es = simular(rel, g, edad_inicio, anio_jub, p)
    edad_ret = int(round(es["edad_jubilacion"]))
    meses = int(round(es["anios_cotizados"] * 12))
    bases = _bases(rel, g, meses)
    # Saldo nocional (capitalización mensual) y cotizaciones anuales para la TIR
    f = (1 + r) ** (1 / 12)
    saldo = 0.0
    for b in bases:
        saldo = saldo * f + c * b
    anuales = [c * sum(bases[j * 12:(j + 1) * 12]) for j in range(meses // 12)]
    S = supervivencia(edad_ret, anio_jub, sexo, mejora)
    G = anualidad(S, norma)
    pension_ndc = saldo / G
    idx_ndc = (1 + r) / (1 + norma) - 1
    ultimo = 12 * bases[-1]
    return {
        "g": g, "c": c, "sexo": sexo, "mejora": mejora, "anio_jub": anio_jub,
        "edad_jub": es["edad_jubilacion"], "anios_cot": es["anios_cotizados"],
        "e_ret": sum(S) - 0.5, "divisor_G": G,
        "rr_es": es["rr_ultimo_salario"], "rr_ndc": pension_ndc / ultimo,
        "tir_es": _tir(anuales, es["pension_anual"], S, 0.0),
        "tir_ndc": _tir(anuales, pension_ndc, S, idx_ndc),
    }


if __name__ == "__main__":
    import pandas as pd
    ruta = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "parametros")
    p = Parametros.desde_repo(ruta)
    c_cc = tipo_cc_total(ruta)
    filas = []
    for g in (0.0, 0.01, 0.02):
        for c in (0.16, c_cc):
            for mejora in (0.0, 0.01):
                filas.append(comparar(p, 1.0, g, 22, 2045, c, "H", mejora))
    df = pd.DataFrame(filas)
    pd.set_option("display.width", 200)
    mostrar = df[["g", "c", "mejora", "e_ret", "rr_es", "rr_ndc", "tir_es", "tir_ndc"]].copy()
    for col in ("rr_es", "rr_ndc"):
        mostrar[col] = (mostrar[col] * 100).round(1)
    for col in ("tir_es", "tir_ndc"):
        mostrar[col] = (mostrar[col] * 100).round(2)
    mostrar["e_ret"] = mostrar["e_ret"].round(1)
    print("Hombre, carrera desde los 22, jubilación en 2045 (mortalidad PROVISIONAL)")
    print("rr = tasa de reposición bruta s/ último salario (%) · tir = TIR real implícita (%)")
    print(mostrar.to_string(index=False))
    df.to_csv("m6_resultados.csv", index=False)
