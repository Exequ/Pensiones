import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import pandas as pd
import pytest
from m4_financiero import DatosM4, proyectar_finanzas
from m4_escenarios import generar, ESCENARIOS, fila_2025

CSV_BASE = Path(__file__).resolve().parents[2] / "data-raw" / "modelos-salidas" / "m4" / "m4_financiero.csv"


@pytest.fixture(scope="module")
def d(): return DatosM4()


@pytest.fixture(scope="module")
def df(d): return generar(d)


def test_cinco_escenarios_con_anios_2025_a_2050(df):
    assert list(ESCENARIOS) == ["base", "g0", "g2", "ipc1", "ipc3"]
    for e in ESCENARIOS:
        a = df[df.escenario == e].anio.tolist()
        assert a == list(range(2025, 2051))


def test_mismas_columnas_que_m4_financiero(df, d):
    esperado = ["escenario", "anio"] + list(proyectar_finanzas(d, anio_fin=2026).columns)
    assert list(df.columns) == esperado


def test_base_reproduce_la_salida_de_m4(df, d):
    ref = proyectar_finanzas(d)
    b = df[(df.escenario == "base") & (df.anio >= 2026)].set_index("anio")
    for c in ref.columns:
        assert b[c].to_numpy() == pytest.approx(ref[c].to_numpy(), rel=1e-12)


@pytest.mark.skipif(not CSV_BASE.exists(), reason="no está el CSV de M4 del repositorio")
def test_base_coincide_con_el_csv_publicado(df):
    pub = pd.read_csv(CSV_BASE).set_index("anio")
    b = df[(df.escenario == "base") & (df.anio >= 2026)].set_index("anio")
    for c in pub.columns:
        assert b[c].to_numpy() == pytest.approx(pub[c].to_numpy(), rel=1e-9)


def test_fila_2025_es_igual_en_todos_los_escenarios(df):
    f = df[df.anio == 2025].drop(columns="escenario")
    assert len(f) == 5
    assert f.nunique(dropna=False).max() == 1


def test_fila_2025_son_datos_observados(d):
    r = fila_2025(d)
    assert r["gasto_pensiones"] == pytest.approx(d.gasto_pens_total_2025)
    assert r["cotizaciones"] == pytest.approx(176794.08, abs=0.01)
    assert r["saldo_no_financiero"] == pytest.approx(-7187.89, abs=1)
    assert r["saldo_no_financiero"] == pytest.approx(r["saldo_sin_transferencias"] + r["transferencias_y_otros"])
    assert r["fondo_reserva"] == 14070
    assert r["gasto_pensiones_pct_pib"] == pytest.approx(10.8, abs=0.05)
    assert pd.isna(r["financiacion_adicional"])


def test_escenarios_ordenados_por_crecimiento_de_salarios(df):
    g = lambda e: df[(df.escenario == e) & (df.anio == 2050)].gasto_pensiones_pct_pib.iloc[0]
    assert g("g0") > g("base") > g("g2")


def test_mas_inflacion_mas_gasto_nominal(df):
    n = lambda e: df[(df.escenario == e) & (df.anio == 2050)].gasto_pensiones.iloc[0]
    assert n("ipc1") < n("base") < n("ipc3")
