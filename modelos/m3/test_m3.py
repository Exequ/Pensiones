import numpy as np
import pytest
from m3_pensiones import (FotoPensiones, DatosM1, RAIZ, proyectar_pensiones, resumen_pensiones, contraste_ageing,
                          bajas_implicitas, CLASES)

FOTO = FotoPensiones()
D = DatosM1(RAIZ / "demografia")


def test_foto_suma_total_publicado():
    import pandas as pd
    df = pd.read_csv(RAIZ / "sistema" / "pensiones-vigor-edad-clase-sexo.csv")
    tot = df[(df.grupo_edad == "total") & (df.sexo == "ambos") & (df.clase.isin(CLASES))].numero.sum()
    mio = sum(v.sum() for c in CLASES for v in FOTO.stock[c].values())
    assert mio == pytest.approx(tot, rel=1e-3)   # difieren las 85 pensiones «no consta»


def test_primer_anio_reproduce_la_foto():
    df, _ = proyectar_pensiones(FOTO, D, anio_fin=2030)
    r = resumen_pensiones(df, FOTO.ratio_pensionistas)
    mio = sum(v.sum() for c in CLASES for v in FOTO.stock[c].values())
    assert r.loc[2026, "total"] == pytest.approx(mio, rel=1e-9)


def test_crecen_las_pensiones_y_el_envejecimiento_las_empuja():
    df, _ = proyectar_pensiones(FOTO, D, anio_fin=2050)
    r = resumen_pensiones(df, FOTO.ratio_pensionistas)
    assert r.loc[2050, "total"] > r.loc[2026, "total"]
    assert r.loc[2050, "jubilacion"] / r.loc[2026, "jubilacion"] > r.loc[2050, "incapacidad"] / r.loc[2026, "incapacidad"]


def test_contraste_ageing_en_banda():
    df, _ = proyectar_pensiones(FOTO, D, anio_fin=2050)
    c = contraste_ageing(resumen_pensiones(df, FOTO.ratio_pensionistas))
    assert c.dif_pp.abs().max() < 10


def test_sin_migracion_hay_menos_pensiones_a_largo_plazo():
    b, _ = proyectar_pensiones(FOTO, D, anio_fin=2050)
    s, _ = proyectar_pensiones(FOTO, D, anio_fin=2050, mult_migracion=0.0)
    rb, rs = (resumen_pensiones(x, 1) for x in (b, s))
    assert rs.loc[2050, "total"] < rb.loc[2050, "total"]


def test_convergencia_mujeres_aumenta_jubilacion():
    b, _ = proyectar_pensiones(FOTO, D, anio_fin=2050)
    c, _ = proyectar_pensiones(FOTO, D, anio_fin=2050, convergencia_mujeres=1.0)
    rb, rc = (resumen_pensiones(x, 1) for x in (b, c))
    assert rc.loc[2050, "jubilacion"] > rb.loc[2050, "jubilacion"]


def test_bajas_esperadas_mismo_orden_que_las_observadas():
    b = bajas_implicitas(FOTO, D)
    assert 0.7 < b["jubilacion"] / 269250 < 1.3
