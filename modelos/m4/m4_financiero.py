"""
M4 v1 · Modelo financiero del sistema: gasto en pensiones, ingresos, saldo y Fondo de Reserva.

Une los modelos anteriores:
  M1 población  ->  M3 número de pensiones por clase  ->  gasto = pensiones × pensión media × 14 pagas
  M1 población  ->  M2 cotizantes y masa de bases       ->  cotizaciones
  saldo = ingresos - gastos; el Fondo de Reserva (alimentado por el MEI) cubre déficit desde 2033 con el límite legal.

Pensión media por clase (efecto sustitución): cada año todas las pensiones se revalorizan (IPC + reval_extra);
salen las bajas (con la pensión relativa que tenían en 2025) y entran las altas (con la pensión de alta de 2025
actualizada por salarios, (1+g)(1+IPC)). Así la pensión media crece algo más que los precios.

Calibración con 2025 (ejecución presupuestaria de la Seguridad Social, obligaciones reconocidas):
  - gasto por clase = pensiones × pensión media × 14 × factor de devengo de la clase (2025);
  - cotizaciones totales 2025 (176.794 M€) escaladas con la masa de bases de M2; el MEI, aparte, con su tipo legal;
  - resto de gastos (IT, maternidad, no contributivas, IMV, personal...) y otros ingresos (transferencias del Estado...)
    de 2025, que crecen con el PIB proxy (palanca).
No hay ningún dato de memoria: todo sale de data/ del repositorio.

Limitaciones (v0): legislación actual congelada; sin RETA por separado; sin ciclo económico; PIB proxy = afiliados × salario
nominal (no una previsión macroeconómica); el resto de gastos e ingresos no depende de la demografía; MEI solo hasta 2050.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

AQUI = Path(__file__).resolve().parent
for m in ("m1", "m2", "m3", "m5"):
    sys.path.insert(0, str(AQUI.parent / m))
from m2_cotizantes import DatosM2, proyectar_cotizantes, TRAMOS_AFIL, ANIO_REF  # noqa: E402
from m5_v1 import ParamsV1, simular as simular_m5  # noqa: E402
from m3_pensiones import FotoPensiones, proyectar_pensiones, resumen_pensiones, CLASES  # noqa: E402

RAIZ = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()))
PAGAS = 14
CONCEPTO_GASTO = {"jubilacion": "JUBILACIÓN", "viudedad": "VIUDEDAD", "incapacidad": "INCAPACIDAD PERMANENTE",
                  "orfandad": "ORFANDAD", "favor-familiares": "A FAVOR DE FAMILIARES"}


def _por_anio(ruta: Path, clave="data") -> dict[int, float]:
    d = json.loads(ruta.read_text(encoding="utf-8"))[clave]
    return {int(x["period"]): float(x["value"]) for x in d}


class DatosM4:
    def __init__(self, ruta=RAIZ):
        r = Path(ruta)
        e = pd.read_csv(r / "sistema" / "presupuesto-ss-ejecucion.csv")
        e = e[(e.ejercicio == ANIO_REF) & (e.periodo == f"{ANIO_REF}-T4") & (e.columna == "principal")]
        ob = lambda tabla, c: float(e[(e.tabla == tabla) & (e.concepto == c)].derechos_u_obligaciones_meur.iloc[0])
        self.gasto_pens_2025 = {c: ob("gastos-cap4", n) for c, n in CONCEPTO_GASTO.items()}
        self.gasto_pens_total_2025 = ob("gastos-cap4", "SUMA DE PENSIONES")
        self.gasto_total_nofin_2025 = ob("gastos", "SUMA DE OPERACIONES NO FINANCIERAS")
        self.ingreso_total_nofin_2025 = ob("ingresos", "SUMA DE OPERACIONES NO FINANCIERAS")
        self.cotizaciones_2025 = ob("ingresos", "1. COTIZACIONES SOCIALES")
        self.mei_2025 = ob("ingresos-cap1-cap4", "MECANISMO DE EQUIDAD INTERGENERACIONAL")
        self.compl_minimos_2025 = ob("gastos-cap4-no-contributivas", "COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS")
        v = pd.read_csv(r / "sistema" / "pensiones-vigor-regimen-clase-sexo.csv")
        v = v[(v.anio == ANIO_REF) & (v.sexo == "ambos") & (v.regimen == "total-sistema") & v.clase.isin(CLASES)].set_index("clase")
        self.n_2025 = v.numero.astype(float).to_dict()
        self.pm_2025 = v.pension_media_eur_mes.astype(float).to_dict()
        self.factor_devengo = {c: self.gasto_pens_2025[c] * 1e6 / (self.n_2025[c] * self.pm_2025[c] * PAGAS) for c in CLASES}
        ab = pd.read_csv(r / "sistema" / "altas-bajas-anual-clase-sexo.csv")
        ab = ab[(ab.anio == ANIO_REF) & (ab.sexo == "ambos") & ab.clase.isin(CLASES)]
        a = ab[ab.movimiento == "alta-inicial"].set_index("clase")
        b = ab[ab.movimiento == "baja-definitiva"].set_index("clase")
        self.tasa_baja = {c: float(b.numero[c]) / self.n_2025[c] for c in CLASES}
        self.pension_alta_2025 = a.pension_media_eur_mes.astype(float).to_dict()
        self.rel_baja = {c: float(b.pension_media_eur_mes[c]) / self.pm_2025[c] for c in CLASES}
        self.mei_tipo = _por_anio(r / "parametros" / "mei-tipo-total.json")
        self.mei_ultimo_anio = 2050  # DT 43.ª TRLGSS: efectos hasta el 31/12/2050
        self.limite_fondo = _por_anio(r / "parametros" / "fondo-reserva-desembolso-maximo.json")
        fr = pd.read_csv(r / "sistema" / "fondo-reserva-anual.csv").set_index("anio")
        self.fondo_2025 = float(fr.valor_fondo_meur[2025])
        self.dotacion_mei_2025 = float(fr.dotaciones_mei_anuales_meur[2025])
        pib = json.loads((r / "macro" / "pib-ine.json").read_text(encoding="utf-8"))
        self.pib_2025 = next(s["points"][-1]["value"] for s in pib["series"] if s["id"] == "pib-corriente")
        ag = json.loads((r / "demografia" / "ageing-report-2024-espana.json").read_text(encoding="utf-8"))
        self.ageing_gasto = next({int(p["period"]): p["value"] for p in s["points"]} for s in ag["series"] if s["id"].endswith("ii-1-64"))
        self.ageing_saldo = next({int(p["period"]): p["value"] for p in s["points"]} for s in ag["series"] if s["id"].endswith("ii-1-74"))
        self.m2 = DatosM2(r)
        self.params_m5 = ParamsV1.desde_repo(r / "parametros")


def indice_altas_m5(d: "DatosM4", g: float, ipc: float, anios, *, frac_topadas=0.0, rel_central=1.0,
                    rel_topada=3.0, edad_inicio=25) -> dict[int, float]:
    """Evolución de la pensión de alta de jubilación relativa a 2026, calculada con M5 (reglas de cálculo actuales):
    por encima de lo que explican salarios e IPC. Mezcla una carrera central (rel_central veces el salario medio) y una
    carrera con salarios altos (rel_topada) que llega a la pensión máxima, con peso frac_topadas. Índice 1 en 2026."""
    p = d.params_m5

    def serie(rel):
        w = ((1 + g) * (1 + ipc))
        b = simular_m5(rel, g, edad_inicio, 2026, p, ipc=ipc)["pension_final"]
        return {t: simular_m5(rel, g, edad_inicio, t, p, ipc=ipc)["pension_final"] / b / w ** (t - 2026) for t in anios}
    c = serie(rel_central)
    if frac_topadas <= 0:
        return c
    h = serie(rel_topada)
    return {t: (1 - frac_topadas) * c[t] + frac_topadas * h[t] for t in anios}


def _tipo_mei(d: DatosM4, t: int) -> float:
    if t > d.mei_ultimo_anio:
        return 0.0
    return d.mei_tipo[min(t, max(d.mei_tipo))]


def proyectar_finanzas(d: DatosM4 | None = None, anio_fin=2050, *, g=0.01, ipc=0.02, reval_extra=0.0,
                       mult_pension_alta=1.0, enlace_m5=True, frac_altas_topadas=0.0, cotizacion_extra_pp=0.0, rend_fondo=0.02,
                       transf_pct_pib=None, resto_gastos="pib", usar_fondo=True,
                       kw_m1=None, kw_m2=None, kw_m3=None):
    """Devuelve DataFrame anual (M€ nominales salvo indicación).
    g, ipc: crecimiento real de salarios e inflación (como M2/M5). reval_extra: puntos sobre el IPC en la revalorización.
    mult_pension_alta: factor sobre la pensión de las altas (1,05 = altas un 5 % más altas).
    enlace_m5: la pensión de las altas de jubilación evoluciona según las reglas de M5 (opción de 25 años hasta 2043, topes,
    revalorización de bases); False reproduce la v0 (altas crecen solo con salarios e IPC).
    frac_altas_topadas: parte de las altas de jubilación con carrera de salarios altos que llega a la pensión máxima (0 a 1).
    cotizacion_extra_pp: puntos de cotización adicionales sobre la base (de 2027 en adelante, lineal hasta 2030).
    rend_fondo: rentabilidad nominal del Fondo de Reserva. transf_pct_pib: transferencias y otros ingresos como % del PIB
    (None = el de 2025). resto_gastos: 'pib' (constante en % del PIB) o 'precios' (constante en términos reales).
    usar_fondo: el Fondo cubre déficit desde 2033 hasta el límite legal.
    kw_m1: palancas de población (M1) usadas en M2 y M3; kw_m2 y kw_m3: palancas propias de M2 y M3."""
    d = d or DatosM4()
    kw_m1, kw_m2, kw_m3 = kw_m1 or {}, kw_m2 or {}, kw_m3 or {}
    m2, _ = proyectar_cotizantes(d.m2, anio_fin, g=g, ipc=ipc, **kw_m1, **kw_m2)
    foto = FotoPensiones()
    pens, _ = proyectar_pensiones(foto, d.m2.m1, anio_fin, **kw_m1, **kw_m3)
    n = pens.groupby(["anio", "clase"]).pensiones.sum().unstack()[list(CLASES)]
    w = (1 + g) * (1 + ipc)
    reval = ipc + reval_extra
    idx_m5 = indice_altas_m5(d, g, ipc, range(2026, anio_fin + 1), frac_topadas=frac_altas_topadas) if enlace_m5 else None
    pm = {c: foto.pension_media[c] for c in CLASES}
    afil25 = sum(v.sum() for v in d.m2.afil.values())
    base25 = d.m2.base_total_rg_2025 / 1e6
    base_sistema25 = d.mei_2025 / (d.mei_tipo[2025] / 100)  # base de todos los regímenes implícita en el MEI de 2025
    fondo = d.fondo_2025
    filas = []
    for t in range(2026, anio_fin + 1):
        if t > 2026:
            for c in CLASES:
                n0, n1 = n.loc[t - 1, c], n.loc[t, c]
                bajas = d.tasa_baja[c] * n0
                altas = max(0.0, n1 - n0 + bajas)
                pa = d.pension_alta_2025[c] * mult_pension_alta * w ** (t - ANIO_REF)
                if idx_m5 is not None and c == "jubilacion":
                    pa *= idx_m5[t]
                masa = (n0 * pm[c] - bajas * pm[c] * d.rel_baja[c]) * (1 + reval) + altas * pa
                pm[c] = masa / n1
        gasto_c = {c: n.loc[t, c] * pm[c] * PAGAS * d.factor_devengo[c] / 1e6 for c in CLASES}
        gasto_pens = sum(gasto_c.values())
        pib = d.pib_2025 * (m2.afiliados_dic[t] / afil25) * w ** (t - ANIO_REF)
        idx_base = m2.base_total_rg_meur[t] / base25
        k = min(1.0, max(0.0, (t - 2026) / 4))
        extra = cotizacion_extra_pp / 100 * base_sistema25 * idx_base * k
        mei = d.mei_2025 * (_tipo_mei(d, t) / d.mei_tipo[2025]) * idx_base
        cot_sin_mei = (d.cotizaciones_2025 - d.mei_2025) * idx_base
        cot = cot_sin_mei + mei + extra
        otros_g25 = d.gasto_total_nofin_2025 - d.gasto_pens_total_2025
        crec_g = pib / d.pib_2025 if resto_gastos == "pib" else (1 + ipc) ** (t - ANIO_REF)
        otros_g = otros_g25 * crec_g
        tp = (d.ingreso_total_nofin_2025 - d.cotizaciones_2025) / d.pib_2025 if transf_pct_pib is None else transf_pct_pib / 100
        otros_i = tp * pib
        saldo_cot_pens = cot - gasto_pens
        saldo_sin_transf = cot - gasto_pens - otros_g
        saldo = saldo_sin_transf + otros_i
        dotacion = mei * d.dotacion_mei_2025 / d.mei_2025
        necesidad = max(0.0, -(saldo - dotacion)) if t >= 2026 else 0.0
        limite = d.limite_fondo.get(t, 0.0) / 100 * pib
        disp = min(necesidad, limite, fondo + dotacion) if (usar_fondo and t >= 2033) else 0.0
        fondo = fondo * (1 + rend_fondo) + dotacion - disp
        filas.append({"anio": t, "pensiones_oct": n.loc[t].sum(), "pension_media_jub": pm["jubilacion"],
                      "pension_media_total": sum(n.loc[t, c] * pm[c] for c in CLASES) / n.loc[t].sum(),
                      "gasto_pensiones": gasto_pens, "cotizaciones": cot, "mei": mei,
                      "otros_gastos": otros_g, "transferencias_y_otros": otros_i,
                      "saldo_cotizaciones_menos_pensiones": saldo_cot_pens,
                      "saldo_sin_transferencias": saldo_sin_transf, "saldo_no_financiero": saldo,
                      "dotacion_fondo": dotacion, "disposicion_fondo": disp, "fondo_reserva": fondo,
                      "financiacion_adicional": max(0.0, necesidad - disp), "pib_proxy": pib,
                      "gasto_pensiones_pct_pib": 100 * gasto_pens / pib,
                      "saldo_cot_pens_pct_pib": 100 * saldo_cot_pens / pib,
                      "saldo_no_financiero_pct_pib": 100 * saldo / pib,
                      "fondo_pct_pib": 100 * fondo / pib,
                      "afiliados_por_pension": m2.afiliados_dic[t] / n.loc[t].sum()})
    return pd.DataFrame(filas).set_index("anio")


def contraste_ageing(df: pd.DataFrame, d: DatosM4) -> pd.DataFrame:
    """Gasto en % del PIB (índice 2026 = 100) frente al Ageing Report 2024. Niveles no comparables:
    el Ageing Report incluye clases pasivas y otros sistemas públicos."""
    o = pd.DataFrame({"m4_indice": 100 * df.gasto_pensiones_pct_pib / df.gasto_pensiones_pct_pib.loc[2026]})
    o["ageing_indice"] = [100 * d.ageing_gasto[t] / d.ageing_gasto[2026] for t in o.index]
    o["dif_pp"] = o.m4_indice - o.ageing_indice
    return o


if __name__ == "__main__":
    d = DatosM4()
    df = proyectar_finanzas(d)
    cols = ["pensiones_oct", "pension_media_total", "gasto_pensiones", "cotizaciones", "gasto_pensiones_pct_pib",
            "saldo_cot_pens_pct_pib", "saldo_no_financiero_pct_pib", "fondo_reserva", "financiacion_adicional"]
    print("MODELO FINANCIERO (g = 1 %, IPC = 2 %, legislación congelada)")
    print(df.loc[[2026, 2030, 2035, 2040, 2045, 2050], cols].round(2).to_string())
    print("\nCONTRASTE gasto en pensiones / PIB (índice 2026 = 100) con el Ageing Report 2024")
    print(contraste_ageing(df, d).loc[[2030, 2035, 2040, 2050]].round(1).to_string())
    df.to_csv("m4_financiero.csv")
