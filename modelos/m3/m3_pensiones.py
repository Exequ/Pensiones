"""
M3 v0 · Pensiones contributivas en vigor: cuántas habrá por clase, sexo y edad.

Qué hace
  Toma la foto de pensiones en vigor de octubre de 2026 (Seguridad Social, por clase, sexo y grupo de
  edad quinquenal) y la proyecta con la población de M1:
      pensiones(clase, sexo, grupo, año) = prevalencia(clase, sexo, grupo) · población(sexo, grupo, año)
  donde la prevalencia es el número de pensiones por persona del grupo en 2026 y se mantiene constante.
  Así el envejecimiento y los cambios de tamaño de cada generación (M1) se trasladan al número de pensiones.

Qué NO hace (v0)
  - No modela cambios de comportamiento: la prevalencia es constante. La palanca `convergencia_mujeres`
    permite probar que, con el tiempo, las mujeres de 65 o más cobren jubilación como los hombres.
  - No calcula importes (eso es M4). Solo números de pensiones y de pensionistas.
  - Las edades de la foto vienen en grupos de cinco años; dentro del grupo se reparte como la población.
  - Las 85 pensiones de edad «no consta» se ignoran.

Datos: data/sistema (pensiones en vigor por edad, pensionistas y pensiones) y data/demografia (vía M1).
"""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "m1"))
from m1_demografia import Datos as DatosM1, proyectar, SEXOS  # noqa: E402

RAIZ = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()))
GRUPOS = [(0, 4), (5, 9), (10, 14), (15, 19), (20, 24), (25, 29), (30, 34), (35, 39), (40, 44), (45, 49),
          (50, 54), (55, 59), (60, 64), (65, 69), (70, 74), (75, 79), (80, 84), (85, 100)]
ETIQ = [f"{a}-{b}" if b < 100 else "85-y-más" for a, b in GRUPOS]
CLASES = ("jubilacion", "viudedad", "incapacidad", "orfandad", "favor-familiares")
FRAC_OCT = 0.75  # octubre está a ~3/4 del camino entre el 1 de enero de t y el de t+1


def _grupos(pob: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    return {s: np.array([pob[s][a:b + 1].sum() for a, b in GRUPOS]) for s in SEXOS}


class FotoPensiones:
    def __init__(self, ruta=RAIZ):
        r = Path(ruta)
        df = pd.read_csv(r / "sistema" / "pensiones-vigor-edad-clase-sexo.csv")
        df = df[(df.grupo_edad.isin(ETIQ)) & (df.clase.isin(CLASES)) & (df.sexo.isin(SEXOS))]
        self.mes = df.mes.iloc[0]
        self.stock = {c: {s: df[(df.clase == c) & (df.sexo == s)].set_index("grupo_edad").numero
                          .reindex(ETIQ).fillna(0).to_numpy(float) for s in SEXOS} for c in CLASES}
        self.pension_media = {c: float(pd.read_csv(r / "sistema" / "pensiones-vigor-edad-clase-sexo.csv")
                              .query("grupo_edad=='total' and sexo=='ambos' and clase==@c").pension_media_eur_mes.iloc[0])
                              for c in CLASES}
        self.ratio_pensionistas = self._ratio(r)

    @staticmethod
    def _ratio(r: Path) -> float:
        import json
        d = json.loads((r / "sistema" / "pensionistas-pensiones-historico.json").read_text(encoding="utf-8"))
        ser = {s["id"]: {int(p["period"]): p["value"] for p in s["points"]} for s in d["series"]}
        a = ser["historico-pensionistas"] if "historico-pensionistas" in ser else next(v for k, v in ser.items() if "pensionistas" in k)
        b = ser["historico-pensiones"] if "historico-pensiones" in ser else next(v for k, v in ser.items() if k.endswith("pensiones"))
        y = max(set(a) & set(b))
        return a[y] / b[y]


def proyectar_pensiones(foto: FotoPensiones | None = None, datos: DatosM1 | None = None, anio_fin=2050,
                        convergencia_mujeres=0.0, **kw_m1):
    """Devuelve (DataFrame largo año-clase-sexo-grupo-pensiones, población proyectada de M1).
    convergencia_mujeres: 0 = prevalencia constante. 1 = en 2050 la prevalencia de jubilación de las mujeres
    de 65 o más iguala la de los hombres de su grupo, con avance lineal. Valores intermedios, proporcionales.
    kw_m1: palancas de M1 (mult_fecundidad, mejora_extra, mult_migracion, ajuste_q_75mas)."""
    foto = foto or FotoPensiones()
    datos = datos or DatosM1(RAIZ / "demografia")
    ph, _ = proyectar(datos, 2026, max(anio_fin, 2027) + 1, **kw_m1)
    pob_oct = lambda t: {s: ph[t][s] + FRAC_OCT * (ph[t + 1][s] - ph[t][s]) for s in SEXOS}
    base = _grupos(pob_oct(2026))
    prev = {c: {s: np.divide(foto.stock[c][s], base[s], out=np.zeros(len(GRUPOS)), where=base[s] > 0) for s in SEXOS}
            for c in CLASES}
    filas = []
    for t in range(2026, anio_fin + 1):
        g = _grupos(pob_oct(t))
        k = min(1.0, (t - 2026) / 24)
        for c in CLASES:
            for s in SEXOS:
                p = prev[c][s].copy()
                if c == "jubilacion" and s == "mujeres" and convergencia_mujeres:
                    idx = [i for i, (a, _) in enumerate(GRUPOS) if a >= 65]
                    p[idx] = p[idx] + convergencia_mujeres * k * (prev[c]["hombres"][idx] - p[idx])
                n = p * g[s]
                for i, e in enumerate(ETIQ):
                    filas.append((t, c, s, e, n[i]))
    return pd.DataFrame(filas, columns=["anio", "clase", "sexo", "grupo_edad", "pensiones"]), ph


def resumen_pensiones(df: pd.DataFrame, ratio_pensionistas: float) -> pd.DataFrame:
    t = df.groupby(["anio", "clase"]).pensiones.sum().unstack()
    t["total"] = t.sum(axis=1)
    t["pensionistas_aprox"] = t["total"] * ratio_pensionistas
    return t


def contraste_ageing(resumen: pd.DataFrame, ruta=RAIZ) -> pd.DataFrame:
    """Índice de crecimiento (2026 = 100) del total de pensiones frente al de pensionistas del Ageing Report 2024."""
    import json
    d = json.loads((Path(ruta) / "demografia" / "ageing-report-2024-espana.json").read_text(encoding="utf-8"))
    ser = next(s for s in d["series"] if s["id"].endswith("ii-1-76"))
    ar = {int(p["period"]): p["value"] for p in ser["points"]}
    out = pd.DataFrame({"m3_indice": 100 * resumen["total"] / resumen["total"].loc[2026]})
    out["ageing_indice"] = [100 * ar[t] / ar[2026] if t in ar else np.nan for t in out.index]
    out["dif_pp"] = out.m3_indice - out.ageing_indice
    return out


def bajas_implicitas(foto: FotoPensiones, datos: DatosM1, anio=2025, ajuste_q_75mas=1.0) -> dict:
    """Muertes esperadas entre los pensionistas de jubilación y viudedad con la mortalidad de la población,
    frente a las bajas definitivas observadas en el año. Es una comprobación de orden de magnitud."""
    q = datos.q_hist(2024)
    pob = datos.poblacion(2025)
    out = {}
    for c in ("jubilacion", "viudedad"):
        esp = 0.0
        for s in SEXOS:
            qs = q[s].copy(); qs[75:] *= ajuste_q_75mas
            for i, (a, b) in enumerate(GRUPOS):
                if a < 65:
                    continue
                w = pob[s][a:b + 1]
                esp += foto.stock[c][s][i] * float((qs[a:b + 1] * w).sum() / w.sum())
        out[c] = esp
    return out


if __name__ == "__main__":
    foto = FotoPensiones(); datos = DatosM1(RAIZ / "demografia")
    df, ph = proyectar_pensiones(foto, datos, anio_fin=2050)
    r = resumen_pensiones(df, foto.ratio_pensionistas)
    print("PENSIONES EN VIGOR (octubre de cada año, millones)")
    print((r.loc[[2026, 2030, 2035, 2040, 2050]] / 1e6).round(2).to_string())
    c = contraste_ageing(r)
    print("\nCONTRASTE con el Ageing Report 2024 (índice 2026 = 100)")
    print(c.loc[[2030, 2035, 2040, 2050]].round(1).to_string())
    print("\nBajas esperadas por mortalidad (2025) frente a las observadas:")
    b = bajas_implicitas(foto, datos)
    obs = {"jubilacion": 269250, "viudedad": 135860}
    for k in b: print(f"  {k}: esperadas {b[k]:,.0f} | bajas definitivas observadas {obs[k]:,.0f}".replace(",", "."))
    df.to_csv("m3_pensiones.csv", index=False); r.to_csv("m3_resumen.csv")
