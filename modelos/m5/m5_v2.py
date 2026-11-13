"""
M5 v2 · Tasa de reposición bruta por cohortes (jubilación ordinaria, legislación vigente congelada).

Corrige tres defectos de M5 v1 (m5_v1.py) que destapó el contraste con el motor TypeScript de la Fase 2-A
(docs/CONTRASTE_M5.md). Todo lo demás (salario relativo, IPC constante, topes, mínima, opción de 25 años)
se mantiene igual que en v1.

Correcciones de v2
  1. MES PREVIO. La base reguladora toma los meses «inmediatamente anteriores al mes previo al del hecho
     causante» (art. 209.1 TRLGSS). Con jubilación el 1 de enero del año T, el mes previo es diciembre de T-1
     y la ventana empieza en noviembre de T-1. v1 incluía diciembre. El mes previo SÍ cuenta como mes
     cotizado para el porcentaje y los requisitos; solo queda fuera de la ventana de la base reguladora.
     La actualización por IPC cuenta los meses desde el inicio de la ventana: i = k - 1.
  2. LAGUNAS ANTERIORES A LA PRIMERA ALTA. Los meses de la ventana en los que no hubo obligación de cotizar,
     también los anteriores al primer alta (carreras más cortas que la ventana), se integran con la base
     mínima de cada mes: los 48 más próximos al hecho causante al 100 % y el resto al 50 %. v1 los dejaba fuera
     (equivalía a rellenarlos con ceros). Opción lagunas_previas="ignorar" reproduce la lectura de v1.
  3. EDAD DE JUBILACIÓN. Se jubila a los 65 solo si los meses COTIZADOS hasta los 65 (descontadas las lagunas)
     alcanzan los exigidos por la DT 7.ª (459 en 2026; 462 desde 2027). v1 comparaba los meses potenciales
     hasta los 65, sin descontar lagunas. Si no llega, se jubila a la edad ordinaria del año (66 años y 10
     meses en 2026; 67 desde 2027) y las lagunas se sitúan en los últimos meses de esa carrera más larga.

Añadidos menores (no cambian los casos de oro de v1 salvo lo indicado)
  - Requisitos de acceso leídos de /data: carencia de 180 meses y 24 meses cotizados dentro de los 180 anteriores
    (art. 205.1.b). Si no se cumplen: estado "no-causa-derecho", pensión 0. v1 solo aplicaba la carencia.
  - Base mínima: un año sin dato en la serie (2020 y 2021 en /data) usa el último valor anterior con dato
    (hueco_base_minima="anterior", como el motor con huecoBaseMinima). Con "error" lanza ValueError.
  - La regla de lagunas se lee con la versión que rige: la del año T para la regla general y la de 2023
    para la opción de 25 años (DT 4.ª.7), como el motor.
  - Suelo de la base mínima: un trabajador no puede cotizar por menos de la base mínima de cada año, así que
    la base mensual del modelo es max(salario, base mínima) antes de aplicar la base máxima
    (suelo_base_minima=True por defecto). Con salarios relativos bajos (hasta ~0,6 en los primeros años) corrige que las
    bases quedaran por debajo del mínimo legal y que las lagunas, integradas a base mínima, subieran la pensión.
  - Integración reforzada de lagunas (DT 41.ª): opcional, apagada por defecto. Meses 49 a 60 al 100 % y 61 a 84 al
    80 % de la base mínima. Solo en la regla general, como el motor.

Convenciones que se mantienen (declaradas)
  - Hecho causante = 1 de enero de T; el último mes trabajado es diciembre de T-1. Coherente con la STS de
    17-10-2024 (si el último día de trabajo es fin de mes, el hecho causante es el día siguiente).
  - Euros nominales, IPC constante; salario individual = rel x salario medio (EAES 2024 / 12) que crece
    (1+g)(1+ipc); revalorización = IPC; lagunas al final de la carrera.
  - Antes de 2026 se usan las series reales de base máxima y mínima aunque el salario se deflacte con el IPC
    del escenario. Mínimas y base mínima posteriores a 2026 crecen solo con el IPC.
  - Sin jubilación anticipada ni demorada, sin test de ingresos del hogar. Solo T >= 2026.
"""
from __future__ import annotations
import sys
from dataclasses import dataclass, field, fields
from pathlib import Path

from m5_reposicion import porcentaje, _valor
from m5_v1 import (ParamsV1, ANIO_REF, SALARIO_MEDIO_REF_DEFECTO, _proyecta, _por_anio, _por_id,
                   pension_minima_anual)

EDAD_65_MESES = 780


@dataclass
class ParamsV2(ParamsV1):
    carencia: dict = field(default_factory=dict)        # año -> meses cotizados exigidos
    previo_min: int = 24                                  # meses cotizados exigidos en el periodo previo
    previo_ventana: int = 180                             # meses del periodo previo
    lagunas_brecha: dict = field(default_factory=dict)  # DT 41.ª (integración reforzada)

    @classmethod
    def desde_repo(cls, dir_param) -> "ParamsV2":
        d = Path(dir_param)
        v1 = ParamsV1.desde_repo(d)
        previo = _por_id(d, "jubilacion-periodo-previo")
        extra = dict(
            carencia=_por_anio(d, "carencia-jubilacion"),
            previo_min=int(previo["2013-meses-minimos"]),
            previo_ventana=int(previo["2013-ventana-meses"]),
            lagunas_brecha=_por_id(d, "lagunas-integracion-brecha-genero"),
        )
        return cls(**{f.name: getattr(v1, f.name) for f in fields(ParamsV1)}, **extra)


def _serie_anual(serie: dict, inc: dict | None, ipc: float, anio: int, hueco: str, nombre: str) -> float:
    """Serie anual con histórico, hueco interior (p. ej. 2020-2021) y proyección posterior con el IPC (+ inc)."""
    ult, prim = max(serie), min(serie)
    if anio > ult:
        return _proyecta(serie, inc or {}, ipc, anio)
    if anio in serie:
        return serie[anio]
    if anio < prim:
        return serie[prim]
    if hueco == "anterior":
        return serie[max(y for y in serie if y < anio)]
    raise ValueError(f"{nombre}: sin dato para {anio} (use hueco_base_minima='anterior')")


def _version_lagunas(p: ParamsV2, anio: int) -> tuple[int, float, float]:
    """(meses del primer tramo, % primer tramo, % resto) de la versión de la regla vigente en `anio`."""
    ys = sorted({int(k[:4]) for k in p.lagunas if k.endswith("tramo1-meses")})
    y = max([v for v in ys if v <= anio] or [ys[0]])
    t1 = int(p.lagunas[f"{y}-tramo1-meses"])
    f1 = p.lagunas[f"{y}-tramo1-pct-base-minima"] / 100
    f2 = p.lagunas.get(f"{y}-tramo2-pct-base-minima", p.lagunas[f"{y}-tramo1-pct-base-minima"]) / 100
    return t1, f1, f2


def _pct_laguna(orden: int, p: ParamsV2, anio_version: int, reforzada: bool) -> float:
    t1, f1, f2 = _version_lagunas(p, anio_version)
    b = p.lagunas_brecha
    if reforzada and b:
        if b["2026-tramo-a-desde-mes"] <= orden <= b["2026-tramo-a-hasta-mes"]:
            return b["2026-tramo-a-pct-base-minima"] / 100
        if b["2026-tramo-b-desde-mes"] <= orden <= b["2026-tramo-b-hasta-mes"]:
            return b["2026-tramo-b-pct-base-minima"] / 100
    return f1 if orden <= t1 else f2


def edad_jubilacion(anio: int, edad_inicio: float, lagunas_meses: int, p: ParamsV2) -> tuple[int, int, int]:
    """(edad en meses, meses cotizados hasta los 65, meses exigidos para los 65). Cotizados = potenciales - lagunas."""
    meses_65 = max(0, int(round((65 - edad_inicio) * 12)))
    cot_65 = max(0, meses_65 - lagunas_meses)
    exigidos = int(_valor(p.base.carrera65, anio))
    edad = EDAD_65_MESES if cot_65 >= exigidos else int(_valor(p.base.edad, anio))
    return edad, cot_65, exigidos


def simular(rel: float, g: float, edad_inicio: float, anio_jub: int, p: ParamsV2, *,
            ipc: float = 0.02, lagunas_meses: int = 0, salario_medio_ref: float | None = None,
            tipo_minima: str = "jub65-unipersonal", topes: bool = True, minima: bool = True,
            actualizar: bool = True, suelo_base_minima: bool = True, lagunas_previas: str = "integrar",
            hueco_base_minima: str = "anterior", integracion_reforzada: bool = False) -> dict:
    if anio_jub < 2026:
        raise ValueError("v2 solo admite jubilaciones desde 2026")
    if lagunas_previas not in ("integrar", "ignorar"):
        raise ValueError("lagunas_previas: 'integrar' o 'ignorar'")
    T = anio_jub
    edad_ret, cot_65, exigidos_65 = edad_jubilacion(T, edad_inicio, lagunas_meses, p)
    meses = max(0, int(round(edad_ret - edad_inicio * 12)))    # meses de carrera, incluidas las lagunas finales
    L = min(max(lagunas_meses, 0), meses)                       # lagunas: los L últimos meses antes del hecho causante
    cot = meses - L

    ref = salario_medio_ref if salario_medio_ref is not None else (
        p.salario_ref_mensual if p.salario_ref_mensual is not None else SALARIO_MEDIO_REF_DEFECTO)

    def nominal_medio(k):  # salario medio nominal k meses antes del 1 de enero de T (referencia: ANIO_REF)
        return ref * ((1 + g) * (1 + ipc)) ** (T - k / 12 - ANIO_REF)

    def anio_de(k):  # año natural del mes k (k = 1 es diciembre de T-1)
        return T - -(-k // 12)

    def base_minima(k):
        return _serie_anual(p.base_min, None, ipc, anio_de(k), hueco_base_minima, "base-minima-rg")

    # --- Requisitos de acceso (art. 205.1.b): carencia y 24 meses cotizados en los 180 previos al hecho causante
    carencia = int(_valor(p.carencia, T)) if p.carencia else 180
    cot_previo = max(0, min(meses, p.previo_ventana) - L)       # k = 1..180; las lagunas son k <= L
    causa_derecho = cot >= carencia and cot_previo >= p.previo_min

    # --- Bases de cada mes de la carrera (k = 1 es el mes previo; las lagunas finales no tienen base)
    base_k = {}
    for k in range(L + 1, meses + 1):
        b = rel * nominal_medio(k)
        if suelo_base_minima:
            b = max(b, base_minima(k))
        if topes:
            b = min(b, _serie_anual(p.base_max, p.inc_base_max, ipc, anio_de(k), "anterior", "base-maxima-rg"))
        base_k[k] = b

    def factor(i):  # actualización por IPC; i = meses desde el inicio de la ventana (i = k - 1)
        return (1 + ipc) ** ((i - 25) / 12) if (actualizar and i >= 25) else 1.0

    def br_regla(ventana: int, n_mejores: int, divisor: float, anio_version: int, reforzada: bool):
        valores, lagunas = [], []
        for i in range(1, int(ventana) + 1):   # i = 1 es el mes anterior al mes previo
            k = i + 1
            if L < k <= meses:
                valores.append(base_k[k] * factor(i))
            elif k > meses and lagunas_previas == "ignorar":
                valores.append(0.0)
            else:
                lagunas.append((i, k))
        previas = 0
        for orden, (i, k) in enumerate(lagunas, start=1):
            pct = _pct_laguna(orden, p, anio_version, reforzada)
            valores.append(pct * base_minima(k) * factor(i))
            previas += k > meses
        mejores = sorted(valores, reverse=True)[:n_mejores]
        return sum(mejores) / divisor, len(lagunas), previas

    div_gen = float(_valor(p.base.divisor, T))
    br_gen, n_lag_gen, previas_gen = br_regla(int(_valor(p.base.periodo, T)), round(div_gen * 12 / 14), div_gen,
                                              T, integracion_reforzada)
    if p.op25_aplica.get(T, 0):
        v25, d25 = int(p.op25_ventana.get(T, 300)), float(p.op25_divisor.get(T, 350))
        br_25, n_lag_25, previas_25 = br_regla(v25, v25, d25, 2023, False)
    else:
        br_25, n_lag_25, previas_25 = 0.0, 0, 0
    br_ok = max(br_gen, br_25)
    usa_25 = br_25 > br_gen
    pct = porcentaje(cot, _valor(p.base.escala, T)) if causa_derecho else 0.0
    pension = 14 * br_ok * pct / 100 if causa_derecho else 0.0
    tope = 14 * _proyecta(p.pension_max, p.inc_pension_max, ipc, T) if topes else float("inf")
    min_anual = pension_minima_anual(p, T, tipo_minima, ipc) if (minima and causa_derecho) else 0.0
    pension_final = min(max(pension, min_anual), tope) if causa_derecho else 0.0
    if not causa_derecho:
        estado = "no-causa-derecho"
    else:
        estado = "maxima" if pension > tope else ("minima" if pension < min_anual else "contributiva")
    ultimo = rel * nominal_medio(1 + L) * 12
    medio = 12 * nominal_medio(0)
    return {
        "anio_jubilacion": T, "rel": rel, "g": g, "ipc": ipc, "edad_inicio": edad_inicio,
        "edad_jubilacion": edad_ret / 12, "edad_65_por_carrera": edad_ret == EDAD_65_MESES,
        "meses_cotizados_a_65": cot_65, "meses_exigidos_para_65": exigidos_65,
        "meses_cotizados": cot, "lagunas_meses": L, "causa_derecho": causa_derecho,
        "lagunas_en_ventana": n_lag_25 if usa_25 else n_lag_gen,
        "lagunas_previas_primera_alta": previas_25 if usa_25 else previas_gen,
        "porcentaje": pct, "base_reguladora_mensual": br_ok if causa_derecho else 0.0,
        "base_reguladora_general": br_gen, "base_reguladora_opcion_25": br_25, "opcion_25_mejor": usa_25,
        "pension_calculada": pension, "pension_final": pension_final, "estado": estado,
        "rr_ultimo_salario": pension_final / ultimo, "rr_salario_medio": pension_final / medio,
    }


if __name__ == "__main__":
    import pandas as pd
    ruta = sys.argv[1] if len(sys.argv) > 1 else str(
        (next(q for q in (Path(__file__).resolve().parent.parent / "Pensiones" / "data",
                          Path(__file__).resolve().parents[2] / "data") if q.exists()) / "parametros"))
    P = ParamsV2.desde_repo(ruta)
    filas = [simular(r, 0.01, 22, T, P, ipc=0.02, lagunas_meses=lg)
             for T in (2030, 2045, 2060) for r in (0.5, 1.0, 1.5, 3.0) for lg in (0, 36)]
    df = pd.DataFrame(filas)
    print(df[["anio_jubilacion", "rel", "lagunas_meses", "edad_jubilacion", "porcentaje",
              "pension_final", "estado", "rr_ultimo_salario", "rr_salario_medio"]].round(3).to_string(index=False))
    df.to_csv("m5_v2_resultados.csv", index=False)
