"""
M4 · Escenarios de sensibilidad en un único CSV largo.

Ejecuta M4 (m4_financiero.proyectar_finanzas) con cinco combinaciones de crecimiento real de salarios (g) e
inflación (IPC) y escribe m4_escenarios.csv: una fila por escenario y año, con la columna «escenario» delante y las
mismas columnas que m4_financiero.csv. El resto de palancas queda en su valor por defecto en todos los escenarios.

La primera fila de cada escenario es 2025 y NO sale del modelo: son los datos observados (ejecución presupuestaria de
2025, pensiones en vigor a 1 de diciembre de 2025, Fondo de Reserva a 31 de diciembre de 2025, PIB corriente del INE).
Es idéntica en los cinco escenarios. Las columnas sin equivalente observado (financiación adicional) van vacías.

Uso: python m4_escenarios.py [carpeta_de_salida]   (por defecto, la carpeta actual)
"""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
import pandas as pd

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from m4_financiero import DatosM4, proyectar_finanzas, CLASES, ANIO_REF  # noqa: E402

ESCENARIOS = {
    "base": {"g": 0.01, "ipc": 0.02},
    "g0": {"g": 0.00, "ipc": 0.02},
    "g2": {"g": 0.02, "ipc": 0.02},
    "ipc1": {"g": 0.01, "ipc": 0.01},
    "ipc3": {"g": 0.01, "ipc": 0.03},
}
# Palancas de proyectar_finanzas que no cambian entre escenarios (valores por defecto del modelo).
OTRAS_PALANCAS = {"reval_extra": 0.0, "mult_pension_alta": 1.0, "enlace_m5": True, "frac_altas_topadas": 0.0,
                  "cotizacion_extra_pp": 0.0, "rend_fondo": 0.02, "transf_pct_pib": None, "resto_gastos": "pib",
                  "usar_fondo": True, "anio_fin": 2050}


def fila_2025(d: DatosM4) -> dict:
    """Fila de 2025 con datos observados, con las mismas columnas que la salida de M4."""
    pib = d.pib_2025
    n_tot = sum(d.n_2025[c] for c in CLASES)
    masa = sum(d.n_2025[c] * d.pm_2025[c] for c in CLASES)
    afiliados = sum(v.sum() for v in d.m2.afil.values())
    gasto = d.gasto_pens_total_2025
    cot = d.cotizaciones_2025
    otros_g = d.gasto_total_nofin_2025 - gasto
    otros_i = d.ingreso_total_nofin_2025 - cot
    saldo_cp = cot - gasto
    saldo_st = cot - gasto - otros_g
    saldo = saldo_st + otros_i
    fondo = d.fondo_2025
    return {"anio": ANIO_REF, "pensiones_oct": n_tot, "pension_media_jub": d.pm_2025["jubilacion"],
            "pension_media_total": masa / n_tot, "gasto_pensiones": gasto, "cotizaciones": cot, "mei": d.mei_2025,
            "otros_gastos": otros_g, "transferencias_y_otros": otros_i,
            "saldo_cotizaciones_menos_pensiones": saldo_cp, "saldo_sin_transferencias": saldo_st,
            "saldo_no_financiero": saldo, "dotacion_fondo": d.dotacion_mei_2025, "disposicion_fondo": 0.0,
            "fondo_reserva": fondo, "financiacion_adicional": np.nan, "pib_proxy": pib,
            "gasto_pensiones_pct_pib": 100 * gasto / pib, "saldo_cot_pens_pct_pib": 100 * saldo_cp / pib,
            "saldo_no_financiero_pct_pib": 100 * saldo / pib, "fondo_pct_pib": 100 * fondo / pib,
            "afiliados_por_pension": afiliados / n_tot}


def generar(d: DatosM4 | None = None) -> pd.DataFrame:
    d = d or DatosM4()
    f25 = fila_2025(d)
    partes = []
    for nombre, p in ESCENARIOS.items():
        df = proyectar_finanzas(d, **p, **OTRAS_PALANCAS).reset_index()
        df = pd.concat([pd.DataFrame([f25])[df.columns], df], ignore_index=True)
        df.insert(0, "escenario", nombre)
        partes.append(df)
    return pd.concat(partes, ignore_index=True)


if __name__ == "__main__":
    salida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    salida.mkdir(parents=True, exist_ok=True)
    df = generar()
    df.to_csv(salida / "m4_escenarios.csv", index=False)
    cols = ["escenario", "anio", "gasto_pensiones_pct_pib", "saldo_no_financiero_pct_pib", "fondo_reserva"]
    print(df[df.anio.isin([2025, 2026, 2040, 2050])][cols].round(2).to_string(index=False))
