"""
M5 v1 · Tasa de reposición bruta por cohortes, con topes, lagunas, actualización de bases y mínimas.

Amplía M5 v0 (m5_reposicion.py). Trabaja en EUROS NOMINALES con un escenario de IPC constante.
Todos los parámetros legales se leen de /data/parametros del repositorio.

Qué incorpora respecto a v0
  1. Base máxima de cotización: serie 2000-2026 y, después, crecimiento = IPC + 1,2 pp (hasta 2050).
  2. Pensión máxima: serie 2000-2026 y, después, crecimiento = IPC + 0,115 pp (hasta 2050).
  3. Actualización de bases por IPC: las bases anteriores a los últimos 24 meses se actualizan
     hasta el mes 25 anterior a la jubilación (con IPC constante: (1+ipc)^((k-25)/12)).
  4. Lagunas: meses sin cotizar inmediatamente antes de la jubilación (paro sin prestación).
     Los primeros 48 se integran al 100 % de la base mínima y el resto al 50 % (valores del fichero).
  5. Pensión mínima (jubilación a 65+, tipo elegible), sin test de ingresos del hogar.
  6. Opción de 25 años leída de opcion-25-anos-aplicable/ventana/divisor.

Supuestos que SIGUEN vigentes (declarados)
  - IPC constante; la revalorización general es igual al IPC; salario medio crece (1+g)(1+ipc).
  - Retiro a 1 de enero del año T, a la edad ordinaria. Sin anticipada ni demorada.
  - Salario individual = rel x salario medio, constante en términos relativos.
  - Salario medio: EAES (INE) 2024, ambos sexos, bruto anual / 12 (data/macro), proyectado con (1+g)(1+ipc).
    Es una de las cuatro definiciones del repositorio; ver salario-medio-definiciones.json.
  - Base mínima y pensiones mínimas posteriores a 2026 crecen con el IPC (la regla real es más
    favorable: ver pension-minima-regla). Antes de 2026, base máxima y mínima reales de la serie,
    aunque el salario pasado se deflacte con el IPC del escenario.
  - Lagunas al final de la carrera; no cuentan como meses cotizados para el porcentaje.
  - Solo T >= 2026.
"""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from pathlib import Path

from m5_reposicion import (Parametros, porcentaje, base_reguladora, edad_jubilacion_meses,
                           _valor, CARENCIA_MESES)

ANIO_REF = 2024
SALARIO_MEDIO_REF_DEFECTO = 2400.0 * 12 / 12  # solo si no hay datos de data/macro (€/mes, provisional)


def _por_id(d: Path, nombre: str) -> dict[str, float]:
    j = json.loads((d / f"{nombre}.json").read_text(encoding="utf-8"))
    return {x["id"]: x["value"] for x in j["data"]}


def _por_anio(d: Path, nombre: str) -> dict[int, float]:
    j = json.loads((d / f"{nombre}.json").read_text(encoding="utf-8"))
    return {int(x["period"]): x["value"] for x in j["data"]}


@dataclass
class ParamsV1:
    base: Parametros
    base_max: dict
    base_min: dict
    pension_max: dict
    inc_base_max: dict
    inc_pension_max: dict
    op25_aplica: dict
    op25_ventana: dict
    op25_divisor: dict
    lagunas: dict
    minimas: dict
    salario_ref_mensual: float | None = None   # EAES (ambos sexos) del año ANIO_REF, €/mes

    @classmethod
    def desde_repo(cls, dir_param) -> "ParamsV1":
        d = Path(dir_param)
        return cls._construir(d)

    @classmethod
    def _construir(cls, d: Path) -> "ParamsV1":
        sal = None
        f = d.parent / "macro" / "salario-medio-definiciones.json"
        if f.exists():
            for serie in json.loads(f.read_text(encoding="utf-8"))["series"]:
                if serie["id"] == "eaes-ambos":
                    sal = {int(x["period"]): x["value"] for x in serie["points"]}[ANIO_REF] / 12
        return cls(Parametros.desde_repo(d), _por_anio(d, "base-maxima-rg"), _por_anio(d, "base-minima-rg"),
                   _por_anio(d, "pension-maxima"), _por_anio(d, "base-maxima-incremento-futuro"),
                   _por_anio(d, "pension-maxima-incremento-futuro"),
                   _por_anio(d, "opcion-25-anos-aplicable"), _por_anio(d, "opcion-25-anos-ventana"),
                   _por_anio(d, "opcion-25-anos-divisor"), _por_id(d, "lagunas-integracion"),
                   _por_id(d, "pension-minima-jubilacion"), sal)


def _proyecta(serie: dict, inc: dict, ipc: float, anio: int) -> float:
    """Valor nominal de una serie con histórico hasta 2026 y después (1+ipc+inc pp)."""
    ult = max(serie)
    if anio <= ult:
        return serie[max(anio, min(serie))]
    v = serie[ult]
    for y in range(ult + 1, anio + 1):
        v *= 1 + ipc + _valor(inc, y) / 100 if inc else 1 + ipc
    return v


def _lagunas_params(p: ParamsV1, anio: int):
    ys = sorted(int(k[:4]) for k in p.lagunas if k.endswith("tramo1-meses"))
    y = max([v for v in ys if v <= anio] or [ys[0]])
    return (int(p.lagunas[f"{y}-tramo1-meses"]), p.lagunas[f"{y}-tramo1-pct-base-minima"] / 100,
            p.lagunas[f"{y}-tramo2-pct-base-minima"] / 100)


def pension_minima_anual(p: ParamsV1, anio: int, tipo: str, ipc: float) -> float:
    v = p.minimas[f"2026-{tipo}"]
    return v * (1 + ipc) ** (anio - 2026) if anio >= 2026 else p.minimas[f"{anio}-{tipo}"]


def simular(rel: float, g: float, edad_inicio: float, anio_jub: int, p: ParamsV1, *,
            ipc: float = 0.02, lagunas_meses: int = 0, salario_medio_ref: float | None = None,
            tipo_minima: str = "jub65-unipersonal", topes: bool = True, minima: bool = True,
            actualizar: bool = True) -> dict:
    if anio_jub < 2026:
        raise ValueError("v1 solo admite jubilaciones desde 2026")
    T = anio_jub
    edad_ret = edad_jubilacion_meses(T, edad_inicio, p.base)
    meses = int(round(edad_ret - edad_inicio * 12))
    L = min(lagunas_meses, meses)
    cot_meses = meses - L

    ref = salario_medio_ref if salario_medio_ref is not None else (
        p.salario_ref_mensual if p.salario_ref_mensual is not None else SALARIO_MEDIO_REF_DEFECTO)

    def nominal_medio(k):  # salario medio nominal k meses antes de T (año de referencia: ANIO_REF)
        t = T - k / 12
        return ref * ((1 + g) * (1 + ipc)) ** (t - ANIO_REF)

    t1, f1, f2 = _lagunas_params(p, T)
    bases = {}  # k -> base nominal (actualizada si procede)
    for k in range(1, meses + 1):
        anio_k = T - -(-k // 12)
        if k <= L:
            bmin = _proyecta(p.base_min, {}, ipc, anio_k)
            b = bmin * (f1 if k <= t1 else f2)
        else:
            b = rel * nominal_medio(k)
            if topes:
                b = min(b, _proyecta(p.base_max, p.inc_base_max, ipc, anio_k))
        if actualizar and k >= 25:
            b *= (1 + ipc) ** ((k - 25) / 12)
        bases[k] = b

    def br(ventana, divisor):
        v = [bases[k] for k in range(1, min(int(ventana), meses) + 1)]
        n = round(divisor * 12 / 14)
        return sum(sorted(v, reverse=True)[:n]) / divisor

    br_gen = br(_valor(p.base.periodo, T), _valor(p.base.divisor, T))
    br_25 = br(p.op25_ventana.get(T, 300), p.op25_divisor.get(T, 350)) if p.op25_aplica.get(T, 0) else 0.0
    br_ok = max(br_gen, br_25)
    pct = porcentaje(cot_meses, _valor(p.base.escala, T))
    pension = 14 * br_ok * pct / 100
    tope_pension = 14 * _proyecta(p.pension_max, p.inc_pension_max, ipc, T) if topes else float("inf")
    min_anual = pension_minima_anual(p, T, tipo_minima, ipc) if minima and cot_meses >= CARENCIA_MESES else 0.0
    pension_final = min(max(pension, min_anual), tope_pension)
    estado = "maxima" if pension > tope_pension else ("minima" if pension < min_anual else "contributiva")
    ultimo = rel * nominal_medio(1 + L) * 12
    return {
        "anio_jubilacion": T, "rel": rel, "g": g, "ipc": ipc, "edad_inicio": edad_inicio,
        "edad_jubilacion": edad_ret / 12, "meses_cotizados": cot_meses, "lagunas_meses": L,
        "porcentaje": pct, "base_reguladora_mensual": br_ok, "opcion_25_mejor": br_25 > br_gen,
        "pension_calculada": pension, "pension_final": pension_final, "estado": estado,
        "rr_ultimo_salario": pension_final / ultimo, "rr_salario_medio": pension_final / (12 * nominal_medio(0)),
    }


if __name__ == "__main__":
    import sys
    import pandas as pd
    ruta = sys.argv[1] if len(sys.argv) > 1 else str(
        (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "parametros"))
    p = ParamsV1.desde_repo(ruta)
    filas = [simular(r, 0.01, 22, T, p, ipc=0.02, lagunas_meses=lg)
             for T in (2030, 2045, 2060) for r in (0.5, 1.0, 1.5, 3.0) for lg in (0, 36)]
    df = pd.DataFrame(filas)
    print(df[["anio_jubilacion", "rel", "lagunas_meses", "edad_jubilacion", "porcentaje",
              "pension_final", "estado", "rr_ultimo_salario", "rr_salario_medio"]].round(3).to_string(index=False))
    df.to_csv("m5_v1_resultados.csv", index=False)
