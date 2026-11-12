"""
M2 v0 · Cotizantes y bases de cotización: cuántos habrá y cuánto se cotiza.

Qué hace
  1. Afiliados a la Seguridad Social (todos los regímenes), por sexo y tramo de edad:
        afiliados(sexo, tramo, t) = tasa de afiliación(sexo, tramo) · población(sexo, tramo, t)
     con la tasa de diciembre de 2025 (afiliados / población a 1 de enero de 2026), constante por defecto.
  2. Cotizantes del Régimen General con su base media (estadística «Bases de cotización»), 2025:
        base total(t) = cotizantes(sexo, tramo, t) · base media(t) · 12,
     con la base media creciendo con el salario real (g) y los precios (ipc).
     Recaudación de contingencias comunes del Régimen General = base total · tipo de cotización (data/parametros).
  3. Relación entre afiliados y pensiones, uniendo M3 (octubre) y M2 (media anual).

Qué NO hace (v0)
  - No modela autónomos (RETA) ni el resto de regímenes por separado: entran en los afiliados totales, pero la
    recaudación solo se calcula para el Régimen General.
  - No aplica topes de base máxima: la base media crece de forma uniforme; los topes los recoge M5 para casos individuales.
  - No modela el ciclo económico, ni la tasa de paro, ni la productividad: las tasas de afiliación son constantes
    salvo las palancas.

Datos: data/sistema (afiliados por sexo y edad), data/macro (base media de cotización), data/parametros (tipo de cotización).
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "m1"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "m3"))
from m1_demografia import Datos as DatosM1, proyectar, SEXOS  # noqa: E402

RAIZ = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()))
ANIO_REF = 2025
# tramos de la estadística de afiliados (edad mínima, máxima); el último es abierto
TRAMOS_AFIL = {"Entre 16 y 19 años": (16, 19), "Entre 20 y 24 años": (20, 24), "Entre 25 y 29 años": (25, 29),
               "Entre 30 y 34 años": (30, 34), "Entre 35 y 39 años": (35, 39), "Entre 40 y 44 años": (40, 44),
               "Entre 45 y 49 años": (45, 49), "Entre 50 y 54 años": (50, 54), "Entre 55 y 59 años": (55, 59),
               "Entre 60 y 64 años": (60, 64), "Mas de 64 años": (65, 100)}
# tramos de la estadística de bases de cotización
TRAMOS_BASE = {"inferior a 24 años": (16, 24), "entre 25 y 29 años": (25, 29), "entre 30 y 34 años": (30, 34),
               "entre 35 y 39 años": (35, 39), "entre 40 y 44 años": (40, 44), "entre 45 y 49 años": (45, 49),
               "entre 50 y 54 años": (50, 54), "entre 55 y 59 años": (55, 59), "entre 60 y 64 años": (60, 64),
               "superior o igual a 65 años": (65, 100)}


def _pob_tramos(pob: dict, tramos: dict) -> dict:
    return {s: np.array([pob[s][a:b + 1].sum() for a, b in tramos.values()]) for s in SEXOS}


class DatosM2:
    def __init__(self, ruta=RAIZ):
        r = Path(ruta)
        af = pd.read_csv(r / "sistema" / "afiliados-sexo-edad.csv")
        af = af[(af.anio == ANIO_REF) & af.sexo.isin(SEXOS) & af.tramo_edad.isin(TRAMOS_AFIL)]
        self.afil = {s: af[af.sexo == s].set_index("tramo_edad").afiliados_diciembre.reindex(list(TRAMOS_AFIL)).to_numpy(float)
                     for s in SEXOS}
        b = pd.read_csv(r / "macro" / "base-media-cotizacion-rg-mensual.csv")
        b = b[(b.anio == ANIO_REF) & b.sexo.isin(SEXOS) & b.tramo_edad.isin(TRAMOS_BASE)]
        g = b.groupby(["sexo", "tramo_edad"]).agg(c=("cotizantes", "mean"), base=("base_total_eur", "sum"))
        self.cot = {s: g.loc[s].reindex(list(TRAMOS_BASE)).c.to_numpy(float) for s in SEXOS}
        self.base_media = {s: (g.loc[s].reindex(list(TRAMOS_BASE)).base / g.loc[s].reindex(list(TRAMOS_BASE)).c / 12).to_numpy(float)
                           for s in SEXOS}
        tt = pd.read_csv(r / "macro" / "base-media-cotizacion-rg-mensual.csv")
        tt = tt[(tt.anio == ANIO_REF) & (tt.sexo == "ambos") & (tt.tramo_edad == "total")]
        self.base_total_rg_2025 = float(tt.base_total_eur.sum())
        e = json.loads((r / "parametros" / "tipo-cc-empresa.json").read_text(encoding="utf-8"))["data"]
        w = json.loads((r / "parametros" / "tipo-cc-trabajador.json").read_text(encoding="utf-8"))["data"]
        self.tipo_cc = (next(x["value"] for x in e if x["period"] == "2026") + next(x["value"] for x in w if x["period"] == "2026")) / 100
        rel = json.loads((r / "sistema" / "relacion-afiliados-pensiones.json").read_text(encoding="utf-8"))
        self.afiliados_media_2025 = next(s["points"][-1]["value"] for s in json.loads(
            (r / "sistema" / "afiliacion-anual.json").read_text(encoding="utf-8"))["series"] if s["id"] == "media-anual-total-sistema")
        self.m1 = DatosM1(r / "demografia")


def proyectar_cotizantes(d: DatosM2 | None = None, anio_fin=2050, *, g=0.01, ipc=0.02, mult_tasa=1.0,
                         convergencia_mujeres=0.0, mult_tasa_55_64=1.0, **kw_m1):
    """Devuelve (DataFrame anual, población de M1).
    g: crecimiento real anual de la base media; ipc: inflación (euros nominales).
    mult_tasa: factor sobre todas las tasas de afiliación y cotización en 2050 (avance lineal; 1,05 = +5 %).
    convergencia_mujeres (0 a 1): en 2050 las tasas de las mujeres de 25 a 64 años se acercan a las de los hombres de su tramo.
    mult_tasa_55_64: factor sobre las tasas de 55 a 64 años en 2050 (avance lineal; 1,1 = +10 %), p. ej. por retraso de la jubilación.
    kw_m1: palancas de M1."""
    d = d or DatosM2()
    ph, _ = proyectar(d.m1, 2026, anio_fin + 1, **kw_m1)
    pa0 = _pob_tramos(ph[2026], TRAMOS_AFIL)
    pb0 = _pob_tramos(ph[2026], TRAMOS_BASE)
    tasa_a = {s: np.divide(d.afil[s], pa0[s]) for s in SEXOS}
    tasa_b = {s: np.divide(d.cot[s], pb0[s]) for s in SEXOS}
    idx_a_55_64 = [i for i, (a, b) in enumerate(TRAMOS_AFIL.values()) if 55 <= a <= 60]
    idx_b_55_64 = [i for i, (a, b) in enumerate(TRAMOS_BASE.values()) if 55 <= a <= 60]
    idx_a_adultos = [i for i, (a, b) in enumerate(TRAMOS_AFIL.values()) if 25 <= a <= 60]
    idx_b_adultos = [i for i, (a, b) in enumerate(TRAMOS_BASE.values()) if 25 <= a <= 60]
    filas = []
    for t in range(2026, anio_fin + 1):
        k = min(1.0, (t - 2026) / 24)
        pa = _pob_tramos(ph[t + 1], TRAMOS_AFIL)  # población al 31 de dic de t = 1 de ene de t+1
        pb = _pob_tramos(ph[t + 1], TRAMOS_BASE)
        factor = 1 + (mult_tasa - 1) * k
        afil = {}; cot = {}
        for s in SEXOS:
            ra, rb = tasa_a[s].copy(), tasa_b[s].copy()
            if s == "mujeres" and convergencia_mujeres:
                ra[idx_a_adultos] += convergencia_mujeres * k * (tasa_a["hombres"][idx_a_adultos] - ra[idx_a_adultos])
                rb[idx_b_adultos] += convergencia_mujeres * k * (tasa_b["hombres"][idx_b_adultos] - rb[idx_b_adultos])
            f55 = 1 + (mult_tasa_55_64 - 1) * k
            ra[idx_a_55_64] *= f55; rb[idx_b_55_64] *= f55
            afil[s] = ra * factor * pa[s]; cot[s] = rb * factor * pb[s]
        escala = ((1 + g) * (1 + ipc)) ** (t - ANIO_REF)
        base_total = sum((cot[s] * d.base_media[s]).sum() * 12 * escala for s in SEXOS)
        filas.append({"anio": t, "afiliados_dic": sum(v.sum() for v in afil.values()),
                      "cotizantes_rg": sum(v.sum() for v in cot.values()),
                      "base_total_rg_meur": base_total / 1e6,
                      "recaudacion_cc_rg_meur": base_total * d.tipo_cc / 1e6,
                      "base_total_rg_meur_reales_2025": base_total / ((1 + ipc) ** (t - ANIO_REF)) / 1e6})
    return pd.DataFrame(filas).set_index("anio"), ph


def relacion_con_pensiones(df_m2: pd.DataFrame, resumen_m3: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({"afiliados_dic": df_m2.afiliados_dic, "pensiones_oct": resumen_m3.total.reindex(df_m2.index)})
    out["afiliados_por_pension"] = out.afiliados_dic / out.pensiones_oct
    return out


def contraste_ageing(rel: pd.DataFrame, ruta=RAIZ) -> pd.DataFrame:
    ser = next(s for s in json.loads((Path(ruta) / "demografia" / "ageing-report-2024-espana.json").read_text(encoding="utf-8"))["series"]
               if s["id"].endswith("ii-1-84"))
    ar = {int(p["period"]): p["value"] for p in ser["points"]}
    o = pd.DataFrame({"m2_indice": 100 * rel.afiliados_por_pension / rel.afiliados_por_pension.loc[2026]})
    o["ageing_indice"] = [100 * ar[t] / ar[2026] for t in o.index]
    o["dif_pp"] = o.m2_indice - o.ageing_indice
    return o


if __name__ == "__main__":
    from m3_pensiones import FotoPensiones, proyectar_pensiones, resumen_pensiones
    d = DatosM2()
    df, _ = proyectar_cotizantes(d)
    foto = FotoPensiones()
    pens, _ = proyectar_pensiones(foto, d.m1, anio_fin=2050)
    r3 = resumen_pensiones(pens, foto.ratio_pensionistas)
    rel = relacion_con_pensiones(df, r3)
    print("COTIZANTES Y BASES (g = 1 %, IPC = 2 %)")
    print(df.loc[[2026, 2030, 2035, 2040, 2050]].round(0).to_string())
    print("\nAFILIADOS POR PENSIÓN")
    print(rel.loc[[2026, 2030, 2035, 2040, 2050]].round(3).to_string())
    print("\nCONTRASTE con el Ageing Report 2024 (cotizantes por pensionista, índice 2026 = 100)")
    print(contraste_ageing(rel).loc[[2030, 2035, 2040, 2050]].round(1).to_string())
    print(f"\nComprobación 2025: base total RG de la estadística {d.base_total_rg_2025/1e9:.1f} mil M€; "
          f"modelo (tasas 2025 con población 2025) ver tests.")
    df.to_csv("m2_cotizantes.csv"); rel.to_csv("m2_relacion_pensiones.csv")
