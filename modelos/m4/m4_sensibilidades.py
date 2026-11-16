"""
M4 · Sensibilidades de la sección 7 de la descripción, en un CSV largo.

Cada fila es un caso y un año (2025 a 2050), con la columna «escenario» y las mismas columnas que m4_financiero.csv.
La fila de 2025 es el dato observado (igual que en m4_escenarios.csv). Cada caso cambia UNA palanca respecto al
escenario base (g = 1 %, IPC = 2 %); el resto queda en su valor por defecto.

Uso: python m4_sensibilidades.py [carpeta_de_salida]   (por defecto, la carpeta actual)
"""
from __future__ import annotations
import sys
from pathlib import Path
import pandas as pd

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from m4_financiero import DatosM4, proyectar_finanzas  # noqa: E402
from m4_escenarios import fila_2025  # noqa: E402

# nombre: (descripción, argumentos de proyectar_finanzas)
CASOS = {
    "g1_5": ("g = 1,5 %", dict(g=0.015)),
    "g1_8": ("g = 1,8 % (productividad a largo plazo del Ageing Report)", dict(g=0.018)),
    "reval_menos_0_5": ("revalorización: IPC − 0,5 puntos", dict(reval_extra=-0.005)),
    "cotizacion_mas_1": ("+1 punto de cotización (gradual hasta 2030)", dict(cotizacion_extra_pp=1.0)),
    "altas_topadas_20": ("20 % de las altas de jubilación con carrera de salarios altos (pensión máxima)", dict(frac_altas_topadas=0.2)),
    "sin_enlace_m5": ("sin enlace con M5 (v0: las altas crecen con salarios e IPC)", dict(enlace_m5=False)),
    "sin_migracion": ("M1: sin migración (saldo migratorio × 0)", dict(kw_m1=dict(mult_migracion=0.0))),
    "fecundidad_mas_20": ("M1: fecundidad × 1,2", dict(kw_m1=dict(mult_fecundidad=1.2))),
    "mujeres_convergen": ("M2: en 2050, las tasas de empleo de las mujeres de 25 a 64 años igualan a las de los hombres", dict(kw_m2=dict(convergencia_mujeres=1.0))),
    "empleo_55_64_mas_10": ("M2: tasas de empleo de 55 a 64 años × 1,1 en 2050", dict(kw_m2=dict(mult_tasa_55_64=1.1))),
}


def generar(d: DatosM4 | None = None) -> pd.DataFrame:
    d = d or DatosM4()
    f25 = fila_2025(d)
    partes = []
    for nombre, (_, kw) in CASOS.items():
        df = proyectar_finanzas(d, **kw).reset_index()
        df = pd.concat([pd.DataFrame([f25])[df.columns], df], ignore_index=True)
        df.insert(0, "escenario", nombre)
        partes.append(df)
    return pd.concat(partes, ignore_index=True)


if __name__ == "__main__":
    salida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    salida.mkdir(parents=True, exist_ok=True)
    df = generar()
    df.to_csv(salida / "m4_sensibilidades.csv", index=False)
    r = df[df.anio == 2050].set_index("escenario")[["gasto_pensiones_pct_pib", "saldo_no_financiero_pct_pib", "fondo_reserva"]]
    print(r.round(2).to_string())
