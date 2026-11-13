"""Tests de M5 v2. Las cuentas esperadas están hechas a mano (fórmulas cerradas o sumas explícitas)."""
from pathlib import Path
import pytest
import m5_v1
from m5_v2 import ParamsV2, simular, edad_jubilacion, _version_lagunas

RUTA = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data",
                         Path(__file__).resolve().parents[2] / "data") if p.exists()) / "parametros")
P = ParamsV2.desde_repo(RUTA)
P1 = m5_v1.ParamsV1.desde_repo(RUTA)
REF = P.salario_ref_mensual                      # EAES 2024 / 12
BMIN = P.base_min
SIN = dict(topes=False, minima=False, actualizar=False)


def bm(anio):
    """Base mínima de un año; si /data no la tiene (2020-2021 hoy), la del último año anterior con dato."""
    return BMIN[anio] if anio in BMIN else BMIN[max(y for y in BMIN if y < anio)]


# ---------- 1. Mes previo ----------------------------------------------------------------------------------
def test_ventana_empieza_en_el_mes_anterior_al_mes_previo_formula_cerrada():
    # T=2045: ventana 348, mejores 324, divisor 378, sin opción de 25 años. Crecimiento nominal q = 1,01 (ipc 0).
    # Con salarios crecientes las 324 mejores son las 324 más recientes de la ventana: k = 2..325.
    q, T, n = 1.01, 2045, 324
    x = q ** (-1 / 12)
    esperado = REF * q ** (T - 2024) * x**2 * (1 - x**n) / (1 - x) / 378
    r = simular(1.0, 0.01, 22, T, P, ipc=0.0, **SIN)
    assert r["base_reguladora_mensual"] == pytest.approx(esperado, rel=1e-10)


def test_v2_es_v1_desplazada_un_mes_cuando_la_carrera_es_larga():
    q = 1.01
    a = simular(1.0, 0.01, 22, 2045, P, ipc=0.0, **SIN)["base_reguladora_mensual"]
    b = m5_v1.simular(1.0, 0.01, 22, 2045, P1, ipc=0.0, **SIN)["base_reguladora_mensual"]
    assert a / b == pytest.approx(q ** (-1 / 12), rel=1e-10)


def test_el_mes_previo_cuenta_como_cotizado():
    r = simular(1.0, 0.01, 22, 2045, P)
    assert r["meses_cotizados"] == 516          # (65 - 22) * 12, incluido el mes previo


def test_actualizacion_cuenta_desde_el_inicio_de_la_ventana():
    # g=0, ipc=2 %: tras actualizar, las bases con i >= 25 valen todas lo mismo (la del mes i = 25),
    # y las 24 más recientes (i = 1..24, k = 2..25) valen S * c * q^(-k/12), con c = q^(T-2024).
    q, T = 1.02, 2045
    y = q ** (-1 / 12)
    c = q ** (T - 2024)
    esperado = REF * c * (y**2 * (1 - y**24) / (1 - y) + 300 * y**26) / 378
    r = simular(1.0, 0.0, 22, T, P, ipc=0.02, topes=False, minima=False, actualizar=True)
    assert r["base_reguladora_mensual"] == pytest.approx(esperado, rel=1e-10)


def test_lagunas_finales_dentro_de_la_ventana_son_una_menos():
    # 12 meses de laguna al final: el primero (k = 1) es el mes previo y queda fuera de la ventana.
    r = simular(1.0, 0.01, 22, 2045, P, lagunas_meses=12)
    assert r["lagunas_en_ventana"] == 11 and r["lagunas_previas_primera_alta"] == 0


def test_pension_topada_y_minima_no_dependen_del_mes_previo():
    for rel, ini, T in ((3.0, 22, 2045), (0.4, 22, 2030)):
        a, b = simular(rel, 0.01, ini, T, P), m5_v1.simular(rel, 0.01, ini, T, P1)
        assert a["estado"] == b["estado"] and a["estado"] in ("maxima", "minima")
        assert a["pension_final"] == pytest.approx(b["pension_final"], rel=1e-12)


# ---------- 2. Lagunas anteriores a la primera alta ----------------------------------------------------------
def test_integracion_de_lagunas_finales_suma_explicita():
    # T=2045, entrada a los 22, 60 meses de laguna: cotizados a los 65 = 456 < 462, así que se jubila a los 67
    # (540 meses de carrera). Ventana 348 = k = 2..349: lagunas k = 2..60 (59), bases k = 61..349 (289).
    # Con g=0 e ipc=0 todas las bases valen REF; las 324 mejores son las 289 bases y las 35 mejores lagunas.
    # Las 48 primeras lagunas valen el 100 % de la base mínima de 2026 en adelante (1424,4); las demás, el 50 %.
    r = simular(1.0, 0.0, 22, 2045, P, ipc=0.0, **SIN, lagunas_meses=60)
    assert r["edad_jubilacion"] == 67 and r["meses_cotizados"] == 480
    esperado = (289 * REF + 35 * BMIN[2026]) / 378
    assert r["base_reguladora_mensual"] == pytest.approx(esperado, rel=1e-12)


def test_lagunas_previas_a_la_primera_alta_suma_explicita():
    # Entrada a los 45, T=2045: se jubila a los 67 con 264 meses (k = 1..264). Ventana k = 2..349:
    # 263 bases (k = 2..264) y 85 lagunas previas (k = 265..349), todas al ser anteriores a la primera alta.
    # Años (T - ceil(k/12)): 2022 (k 265-276), 2021 (277-288), 2020 (289-300), 2019 (301-312), 2018 (313-324),
    # 2017 (325-336), 2016 (337-348), 2015 (k = 349). Si /data no tiene 2020 o 2021 se usa el último año con dato.
    # Las 48 primeras (k 265-312) al 100 %, el resto al 50 %. Se suman las 324 mejores: 263 bases, las 48 al 100 %
    # y las 13 mejores al 50 % (12 de 2018 y 1 de 2017).
    r = simular(1.0, 0.0, 45, 2045, P, ipc=0.0, **SIN)
    assert r["meses_cotizados"] == 264 and r["lagunas_previas_primera_alta"] == 85
    cien = 12 * bm(2022) + 12 * bm(2021) + 12 * bm(2020) + 12 * bm(2019)
    cincuenta = 12 * 0.5 * bm(2018) + 1 * 0.5 * bm(2017)
    esperado = (263 * REF + cien + cincuenta) / 378
    assert r["base_reguladora_mensual"] == pytest.approx(esperado, rel=1e-12)


def test_ignorar_lagunas_previas_reproduce_la_lectura_de_v1():
    # Con ceros en lugar de lagunas previas, la base es (suma de las bases existentes) / divisor.
    r = simular(1.0, 0.0, 45, 2045, P, ipc=0.0, **SIN, lagunas_previas="ignorar")
    assert r["base_reguladora_mensual"] == pytest.approx(263 * REF / 378, rel=1e-12)
    assert r["lagunas_previas_primera_alta"] == 0


def test_integrar_lagunas_previas_nunca_baja_la_base():
    for ini, T in ((50, 2030), (45, 2040), (35, 2050), (49, 2040)):
        a = simular(1.0, 0.01, ini, T, P)["base_reguladora_mensual"]
        b = simular(1.0, 0.01, ini, T, P, lagunas_previas="ignorar")["base_reguladora_mensual"]
        assert a >= b


def test_hueco_de_la_base_minima_2020_2021():
    if 2020 in BMIN and 2021 in BMIN:
        pytest.skip("/data ya tiene la base mínima de 2020 y 2021: no hay hueco que probar")
    simular(1.0, 0.0, 49, 2040, P)                                    # por defecto usa el último año con dato
    with pytest.raises(ValueError, match="sin dato"):
        simular(1.0, 0.0, 49, 2040, P, hueco_base_minima="error")


def test_carrera_corta_coincide_con_el_motor():
    # Contraste con el motor TypeScript (docs/CONTRASTE_M5.md): base reguladora de 1.717 €/mes (opción de 25 años).
    r = simular(1.0, 0.01, 50, 2030, P)
    assert r["base_reguladora_mensual"] == pytest.approx(1717, abs=1)
    assert r["opcion_25_mejor"] and r["estado"] == "minima"


# ---------- 3. Edad de jubilación -----------------------------------------------------------------------------
def test_umbral_de_65_anios_2027_son_462_meses():
    # T=2045, calendario cerrado: 462 meses cotizados hasta los 65 -> 65; 461 -> 67.
    assert edad_jubilacion(2045, 65 - 462 / 12, 0, P)[0] == 780
    assert edad_jubilacion(2045, 65 - 461 / 12, 0, P)[0] == 804
    assert simular(1.0, 0.01, 65 - 462 / 12, 2045, P)["edad_jubilacion"] == 65
    assert simular(1.0, 0.01, 65 - 461 / 12, 2045, P)["edad_jubilacion"] == 67


def test_umbral_de_65_anios_2026_son_459_meses_y_edad_ordinaria_66_10():
    assert edad_jubilacion(2026, 65 - 459 / 12, 0, P)[0] == 780
    assert edad_jubilacion(2026, 65 - 458 / 12, 0, P)[0] == 802          # 66 años y 10 meses


def test_las_lagunas_restan_a_los_meses_cotizados_para_los_65():
    # Entrada a los 22: 516 meses potenciales. Con 54 lagunas quedan 462 (65 años); con 55, 461 (67 años).
    assert simular(1.0, 0.01, 22, 2045, P, lagunas_meses=54)["edad_jubilacion"] == 65
    r = simular(1.0, 0.01, 22, 2045, P, lagunas_meses=55)
    assert r["edad_jubilacion"] == 67 and r["meses_cotizados"] == 540 - 55
    assert r["meses_cotizados_a_65"] == 461 and r["meses_exigidos_para_65"] == 462


def test_456_meses_cotizados_no_permiten_jubilarse_a_los_65():
    # El defecto de v1: 456 meses cotizados a los 65 con la exigencia de 462 desde 2027.
    r = simular(1.0, 0.01, 22, 2045, P, lagunas_meses=60)
    assert r["meses_cotizados_a_65"] == 456 and r["edad_jubilacion"] == 67 and not r["edad_65_por_carrera"]


# ---------- Requisitos de acceso ------------------------------------------------------------------------------
def test_sin_carencia_no_causa_derecho():
    r = simular(1.0, 0.01, 55, 2045, P)                    # 144 meses cotizados < 180
    assert r["estado"] == "no-causa-derecho" and r["pension_final"] == 0 and not r["causa_derecho"]


def test_periodo_previo_24_meses_en_los_180_anteriores():
    # Entrada a los 22, T=2045, se jubila a los 67 (540 meses). Con 156 lagunas finales quedan 24 meses
    # cotizados en los 180 previos: causa derecho; con 157, 23: no causa derecho (aunque cotizó 383 meses).
    assert simular(1.0, 0.01, 22, 2045, P, lagunas_meses=156)["causa_derecho"]
    r = simular(1.0, 0.01, 22, 2045, P, lagunas_meses=157)
    assert not r["causa_derecho"] and r["meses_cotizados"] == 540 - 157


# ---------- Reglas de lagunas por versión e integración reforzada -------------------------------------------------
def test_version_de_la_regla_de_lagunas():
    assert _version_lagunas(P, 2023) == (48, 1.0, 0.5)
    assert _version_lagunas(P, 2045) == (48, 1.0, 0.5)


def test_integracion_reforzada_suma_explicita():
    # T=2045, entrada a los 22, 84 lagunas: 432 cotizados a los 65 -> 67 (540 meses). Ventana k = 2..349:
    # lagunas k = 2..84 (83), bases k = 85..349 (265). 324 mejores = 265 bases + 59 lagunas.
    # Sin refuerzo: 48 al 100 % y 35 al 50 % -> mejores: 48 x 1424,4 + 11 x 712,2.
    # Con refuerzo (49-60 al 100 %, 61-84 al 80 %): 60 al 100 % -> las 59 mejores valen 1424,4.
    kw = dict(ipc=0.0, **SIN, lagunas_meses=84)
    sin = simular(1.0, 0.0, 22, 2045, P, **kw)["base_reguladora_mensual"]
    con = simular(1.0, 0.0, 22, 2045, P, integracion_reforzada=True, **kw)["base_reguladora_mensual"]
    assert sin == pytest.approx((265 * REF + 48 * BMIN[2026] + 11 * 0.5 * BMIN[2026]) / 378, rel=1e-12)
    assert con == pytest.approx((265 * REF + 59 * BMIN[2026]) / 378, rel=1e-12)


# ---------- Suelo de la base mínima -----------------------------------------------------------------------------
def test_suelo_de_la_base_minima_formula_cerrada():
    # T=2056: ventana k = 2..349 -> años 2055..2027, todos con la base mínima de 2026 (ipc 0). Con rel 0,4 el salario
    # (0,4 x REF = 985 EUR/mes) queda por debajo: con suelo las 324 mejores bases valen 1.424,4 cada una.
    kw = dict(ipc=0.0, **SIN)
    con = simular(0.4, 0.0, 22, 2056, P, **kw)["base_reguladora_mensual"]
    sin = simular(0.4, 0.0, 22, 2056, P, suelo_base_minima=False, **kw)["base_reguladora_mensual"]
    assert con == pytest.approx(324 * BMIN[2026] / 378, rel=1e-12)
    assert sin == pytest.approx(324 * 0.4 * REF / 378, rel=1e-12)


def test_con_suelo_las_lagunas_no_suben_la_base():
    # Las lagunas se integran a base mínima y ninguna base del modelo baja de ese suelo: con lagunas la base no sube.
    for rel in (0.4, 0.5, 0.6):
        a = simular(rel, 0.01, 22, 2030, P, minima=False)["base_reguladora_mensual"]
        b = simular(rel, 0.01, 22, 2030, P, minima=False, lagunas_meses=36)["base_reguladora_mensual"]
        assert b <= a + 1e-9


def test_el_suelo_no_cambia_salarios_normales():
    a = simular(1.0, 0.01, 22, 2045, P)["pension_final"]
    b = simular(1.0, 0.01, 22, 2045, P, suelo_base_minima=False)["pension_final"]
    assert a == pytest.approx(b, rel=1e-12)


# ---------- Cosas que no deben cambiar respecto a v1 ----------------------------------------------------------
def test_topes_y_minima_siguen_funcionando():
    assert simular(3.0, 0.01, 22, 2045, P)["estado"] == "maxima"
    assert simular(0.4, 0.01, 22, 2030, P)["estado"] == "minima"


def test_sin_lagunas_ni_ventana_corta_v2_solo_difiere_del_orden_de_un_mes():
    # En 37 casos tipo de v1 la pensión contributiva baja entre 0,05 % y 0,5 % (un mes de crecimiento nominal).
    for T in (2035, 2043, 2050):
        for g in (0.0, 0.015):
            a = simular(1.0, g, 22, T, P)["pension_final"]
            b = m5_v1.simular(1.0, g, 22, T, P1)["pension_final"]
            assert 0.994 < a / b <= 1.0 + 1e-12
