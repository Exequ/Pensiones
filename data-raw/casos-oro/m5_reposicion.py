"""
M5 v0 · Tasa de reposición bruta por cohortes (jubilación ordinaria, legislación vigente).

Qué hace
  Para una carrera tipo (salario relativo al medio, edad de inicio, crecimiento real de los
  salarios) y un año de jubilación T, calcula la pensión inicial con las reglas del TRLGSS
  leídas de los ficheros de /data/parametros del repositorio y devuelve dos tasas de reposición:
    - sobre el último salario individual
    - sobre el salario medio de la economía (definición tipo OCDE, en bruto)

Supuestos de esta versión (v0). Cada uno se retirará en versiones siguientes.
  1. Todo en euros constantes del año T: la actualización de bases por IPC se da por neutra.
  2. Sin topes: no se aplica base máxima de cotización ni pensión máxima (series 2013+ pendientes).
  3. Sin lagunas ni integración de lagunas; carrera continua desde la edad de inicio.
  4. Jubilación a la edad ordinaria; sin coeficientes de anticipación ni demora.
  5. Salario relativo constante (supuesto OCDE) y crecimiento real constante g.
  6. Cohortes T >= 2013 (la escala por meses rige desde 2013).
  7. Más allá del último año de cada serie se mantiene el último valor.

Convención: base de cotización mensual (incluye prorrata de pagas extra). La base reguladora
se divide entre el divisor del fichero (que recoge 14 pagas): BR = suma(bases) / divisor.
La pensión se cobra en 14 pagas; el salario anual equivale a 12 bases.
"""
from __future__ import annotations
import json
import re
from dataclasses import dataclass
from pathlib import Path

ANIO_FIN_OPCION_25 = 2040  # DT 4.ª.7 TRLGSS (según notas de periodo-calculo-base-reguladora.json)
VENTANA_25, DIVISOR_25 = 300, 350  # regla de 25 años (art. 209.1, redacción de 1-1-2023)
CARENCIA_MESES = 180


def _serie(dir_param: Path, nombre: str) -> dict[int, object]:
    d = json.loads((dir_param / f"{nombre}.json").read_text(encoding="utf-8"))
    return {int(x["period"]): x["value"] for x in d["data"]}


def _valor(serie: dict[int, object], anio: int):
    """Valor del año; fuera de rango, el del último (o primero) año disponible."""
    if anio in serie:
        return serie[anio]
    return serie[max(serie)] if anio > max(serie) else serie[min(serie)]


@dataclass
class Parametros:
    edad: dict          # meses de edad
    carrera65: dict     # meses de cotización para jubilarse a los 65
    periodo: dict       # meses de la ventana de cálculo
    divisor: dict
    escala: dict        # texto de la regla

    @classmethod
    def desde_repo(cls, dir_param: str | Path) -> "Parametros":
        d = Path(dir_param)
        return cls(
            edad=_serie(d, "edad-ordinaria-jubilacion"),
            carrera65=_serie(d, "carrera-jubilacion-65"),
            periodo=_serie(d, "periodo-calculo-base-reguladora"),
            divisor=_serie(d, "divisor-base-reguladora"),
            escala=_serie(d, "escala-porcentajes-jubilacion"),
        )


_RE_ESCALA = re.compile(
    r"0,(\d+) % por cada mes entre el 1 y el (\d+) y 0,(\d+) % por cada uno de los (\d+) meses"
)


def porcentaje(meses_cotizados: int, texto_escala: str) -> float:
    """Porcentaje (0-100) sobre la base reguladora según meses cotizados (regla 2013+)."""
    if meses_cotizados < CARENCIA_MESES:
        return 0.0
    m = _RE_ESCALA.search(texto_escala)
    if not m:
        raise ValueError(f"Escala no reconocida (¿regla anterior a 2013?): {texto_escala!r}")
    c1, n1 = float("0." + m[1]), int(m[2])
    c2, n2 = float("0." + m[3]), int(m[4])
    extra = meses_cotizados - CARENCIA_MESES
    p = 50 + c1 * min(extra, n1) + c2 * min(max(extra - n1, 0), n2)
    return min(p, 100.0)


def base_reguladora(bases: list[float], ventana: int, divisor: float) -> float:
    """Toma las bases de la ventana y las N mejores, con N = divisor·12/14; divide entre el divisor."""
    ventana_bases = bases[-int(ventana):]
    n = round(divisor * 12 / 14)
    mejores = sorted(ventana_bases, reverse=True)[:n]
    return sum(mejores) / divisor


def base_reguladora_con_opcion(bases: list[float], anio: int, p: Parametros) -> float:
    br = base_reguladora(bases, _valor(p.periodo, anio), _valor(p.divisor, anio))
    if anio <= ANIO_FIN_OPCION_25:
        br = max(br, base_reguladora(bases, VENTANA_25, DIVISOR_25))
    return br


def edad_jubilacion_meses(anio: int, edad_inicio: float, p: Parametros) -> int:
    meses_a_65 = int(round((65 - edad_inicio) * 12))
    if meses_a_65 >= _valor(p.carrera65, anio):
        return 780
    return int(_valor(p.edad, anio))


def simular(rel: float, g: float, edad_inicio: float, anio_jub: int, p: Parametros) -> dict:
    """rel: salario / salario medio. g: crecimiento real anual de los salarios (0,01 = 1 %)."""
    if anio_jub < 2013:
        raise ValueError("v0 solo admite cohortes de jubilación desde 2013")
    edad_ret = edad_jubilacion_meses(anio_jub, edad_inicio, p)
    meses = int(round(edad_ret - edad_inicio * 12))
    # Base mensual k meses antes de jubilarse (k = meses..1), en euros del año T; salario medio = 1.
    bases = [rel * (1 + g) ** (-(k / 12)) for k in range(meses, 0, -1)]
    br = base_reguladora_con_opcion(bases, anio_jub, p)
    pct = porcentaje(meses, _valor(p.escala, anio_jub))
    pension_mensual = br * pct / 100          # por paga
    pension_anual = 14 * pension_mensual
    ultimo_salario_anual = 12 * bases[-1]
    return {
        "anio_jubilacion": anio_jub, "rel": rel, "g": g, "edad_inicio": edad_inicio,
        "edad_jubilacion": edad_ret / 12, "anios_cotizados": meses / 12,
        "porcentaje": pct, "base_reguladora_mensual": br,
        "pension_anual": pension_anual,
        "rr_ultimo_salario": pension_anual / ultimo_salario_anual,
        "rr_salario_medio": pension_anual / 12,   # salario medio anual = 12 · 1
    }


def tabla(p: Parametros, anios, rels=(0.5, 1.0, 1.5), gs=(0.0, 0.01, 0.02), edad_inicio=22):
    import pandas as pd
    filas = [simular(r, g, edad_inicio, t, p) for t in anios for r in rels for g in gs]
    return pd.DataFrame(filas)


if __name__ == "__main__":
    import sys
    ruta = sys.argv[1] if len(sys.argv) > 1 else str(
        Path(__file__).resolve().parent.parent / "Pensiones" / "data" / "parametros")
    p = Parametros.desde_repo(ruta)
    df = tabla(p, range(2026, 2061, 5))
    out = df.pivot_table(index="anio_jubilacion", columns=["rel", "g"], values="rr_ultimo_salario")
    print("Tasa de reposición bruta sobre el último salario (carrera desde los 22):")
    print((out * 100).round(1).to_string())
    df.to_csv("m5_resultados.csv", index=False)
    print("\nGuardado en m5_resultados.csv")