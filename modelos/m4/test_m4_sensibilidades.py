import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import pandas as pd
import pytest
from m4_financiero import DatosM4, proyectar_finanzas
from m4_sensibilidades import generar, CASOS
from comparar_csv import comparar


@pytest.fixture(scope="module")
def d(): return DatosM4()


@pytest.fixture(scope="module")
def df(d): return generar(d)


def v(df, caso, col, anio=2050):
    return df[(df.escenario == caso) & (df.anio == anio)][col].iloc[0]


def test_casos_con_anios_2025_a_2050(df):
    assert len(CASOS) == 10
    for e in CASOS:
        assert df[df.escenario == e].anio.tolist() == list(range(2025, 2051))


def test_fila_2025_igual_en_todos(df):
    f = df[df.anio == 2025].drop(columns="escenario")
    assert len(f) == len(CASOS) and f.nunique(dropna=False).max() == 1


def test_un_caso_equivale_a_llamar_al_modelo(df, d):
    ref = proyectar_finanzas(d, g=0.015).loc[2050]
    assert v(df, "g1_5", "gasto_pensiones") == pytest.approx(ref.gasto_pensiones, rel=1e-12)


def test_valores_de_referencia_2050(df):
    esperado = {  # (gasto % PIB, saldo no financiero % PIB)
        "g1_5": (15.15, -4.64), "g1_8": (14.61, -4.10), "reval_menos_0_5": (15.19, -4.68),
        "cotizacion_mas_1": (16.13, -5.26), "altas_topadas_20": (15.90, -5.39), "sin_enlace_m5": (16.18, -5.67),
        "sin_migracion": (21.39, -10.92), "fecundidad_mas_20": (16.00, -5.52),
        "mujeres_convergen": (15.48, -5.16), "empleo_55_64_mas_10": (15.83, -5.32)}
    for e, (g, s) in esperado.items():
        assert v(df, e, "gasto_pensiones_pct_pib") == pytest.approx(g, abs=0.006)
        assert v(df, e, "saldo_no_financiero_pct_pib") == pytest.approx(s, abs=0.006)


def test_signos_de_las_palancas(df):
    gp = lambda e: v(df, e, "gasto_pensiones_pct_pib")
    base = proyectar_finanzas(DatosM4()).loc[2050].gasto_pensiones_pct_pib
    assert gp("g1_8") < gp("g1_5") < base < gp("sin_migracion")
    assert gp("reval_menos_0_5") < base and gp("altas_topadas_20") < base and gp("mujeres_convergen") < base
    assert v(df, "cotizacion_mas_1", "saldo_no_financiero_pct_pib") > proyectar_finanzas(DatosM4()).loc[2050].saldo_no_financiero_pct_pib


def test_comparar_detecta_diferencias(tmp_path, df):
    a, b = tmp_path / "a.csv", tmp_path / "b.csv"
    df.to_csv(a, index=False)
    df.to_csv(b, index=False)
    assert comparar(a, b)[0]
    df2 = df.copy(); df2.loc[10, "gasto_pensiones"] *= 1.001
    df2.to_csv(b, index=False)
    assert not comparar(a, b)[0]
