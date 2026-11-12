"""
M1 · Modelo demográfico de cohortes-componentes (España, por sexo y edad simple).

Qué hace
  Parte de la población residente a 1 de enero (INE) y la avanza año a año:
    población(x+1, t+1) = (población(x,t) + saldo(x,t)/2) · (1 - q(x,t)) + saldo(x,t)/2
    nacimientos(t)      = suma de tasa de fecundidad(edad,t) · mujeres expuestas(edad,t)
  con qx de las tablas de mortalidad del INE, fecundidad por edad de la madre y migración
  exterior (inmigración - emigración) por sexo y edad. Edad 100 = tramo abierto (100 y más).

Dos usos
  1. contraste(): arranca en 2026 con las hipótesis del INE (edición 2026-2076) y compara con sus
     proyecciones: valida el motor.
  2. backtest(): arranca en un año pasado con las tasas OBSERVADAS y compara con la población
     realmente publicada: mide cuánto se equivoca el método con datos perfectos de tasas.
  3. proyectar(): escenarios propios con palancas (fecundidad, mejora de mortalidad, migración).

Todos los datos se leen de data/demografia del repositorio.
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
import pandas as pd

SEXOS = ("hombres", "mujeres")
EDADES = np.arange(101)
RUTA_DEFECTO = (next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "demografia")


class Datos:
    def __init__(self, ruta=RUTA_DEFECTO):
        d = Path(ruta)
        self.pob = pd.read_csv(d / "poblacion-edad-sexo.csv")
        self.mort = pd.read_csv(d / "mortalidad-ine.csv")
        self.fec = pd.read_csv(d / "fecundidad-tasas-edad.csv")
        self.mig = pd.read_csv(d / "migraciones-exterior-edad-sexo.csv")
        self.pproj = pd.read_csv(d / "proyecciones-poblacion.csv")
        self.mproj = pd.read_csv(d / "proyecciones-mortalidad.csv")
        self.fproj = pd.read_csv(d / "proyecciones-fecundidad-edad.csv")
        self.iproj = pd.read_csv(d / "proyecciones-inmigracion-edad.csv")
        self.eproj = pd.read_csv(d / "proyecciones-emigracion-edad.csv")

    def prop_hombres_edad0(self, desde=2015, hasta=2025) -> float:
        p = self.pob[(self.pob.edad == 0) & (self.pob.anio.between(desde, hasta))]
        h = p[p.sexo == "hombres"].poblacion.sum(); m = p[p.sexo == "mujeres"].poblacion.sum()
        return h / (h + m)

    # ---------- población ----------
    def poblacion(self, anio: int, proy=False) -> dict[str, np.ndarray]:
        df = self.pproj if proy else self.pob
        out = {}
        for s in SEXOS:
            v = df[(df.anio == anio) & (df.sexo == s)].set_index("edad").poblacion.reindex(EDADES)
            out[s] = v.to_numpy(float)
        return out

    # ---------- mortalidad: q(x) en tanto por uno ----------
    def q_hist(self, anio: int) -> dict[str, np.ndarray]:
        m = self.mort[(self.mort.anio == anio) & (self.mort.edicion == "1991-2024")] if anio >= 1991 else \
            self.mort[(self.mort.anio == anio)]
        return {s: self._q(m[m.sexo == s]) for s in SEXOS}

    def q_proy(self, anio: int) -> dict[str, np.ndarray]:
        m = self.mproj[self.mproj.anio == anio]
        return {s: self._q(m[m.sexo == s]) for s in SEXOS}

    @staticmethod
    def _q(df) -> np.ndarray:
        df = df.set_index("edad").reindex(EDADES)
        q = (df.qx_por_mil / 1000).to_numpy(float).copy()
        # tramo abierto (100 y más): la tabla da q=1; se usa la esperanza de vida a esa edad
        q[100] = 1 - np.exp(-1 / float(df.ex.iloc[100]))
        # Convención de edades: q[x] es la probabilidad entre las edades EXACTAS x y x+1, pero quien tiene x años
        # cumplidos a 1 de enero va, durante el año, de la edad exacta x+0,5 a x+1,5. Se usa la media de q[x] y q[x+1]
        # (factor de Lexis); esto explica el desfase que mostraba la prueba hacia atrás (ver M1_descripcion).
        if LEXIS:
            q[:100] = (q[:100] + q[1:101]) / 2
        return q

    # ---------- fecundidad: tasa por mujer (tanto por uno), edades 15-49 ----------
    def f_hist(self, anio: int) -> np.ndarray:
        d = self.fec[(self.fec.anio == anio) & (self.fec.nacionalidad == "ambas")].set_index("edad_madre").tasa_por_mil
        f = np.zeros(101); f[15:50] = d.reindex(range(15, 50)).to_numpy(float) / 1000
        return f

    def f_proy(self, anio: int) -> np.ndarray:
        d = self.fproj[self.fproj.anio == anio].set_index("edad_madre").tasa_por_mil
        f = np.zeros(101); f[15:50] = d.reindex(range(15, 50)).to_numpy(float) / 1000
        return f

    # ---------- migración: saldo (inmigración - emigración) por sexo y edad ----------
    def saldo_hist(self, anio: int) -> dict[str, np.ndarray]:
        serie = "EM-2008-2021" if anio <= 2020 else "EMCR-2021-2024"
        m = self.mig[(self.mig.anio == anio) & (self.mig.serie == serie)]
        out = {}
        for s in SEXOS:
            i = m[(m.flujo == "inmigracion") & (m.sexo == s)].set_index("edad").personas.reindex(EDADES).fillna(0)
            e = m[(m.flujo == "emigracion") & (m.sexo == s)].set_index("edad").personas.reindex(EDADES).fillna(0)
            out[s] = (i - e).to_numpy(float)
        return out

    def saldo_proy(self, anio: int) -> dict[str, np.ndarray]:
        out = {}
        for s in SEXOS:
            i = self.iproj[(self.iproj.anio == anio) & (self.iproj.sexo == s)].set_index("edad").personas.reindex(EDADES).fillna(0)
            e = self.eproj[(self.eproj.anio == anio) & (self.eproj.sexo == s)].set_index("edad").personas.reindex(EDADES).fillna(0)
            out[s] = (i - e).to_numpy(float)
        return out


LEXIS = True  # False reproduce la versión inicial de M1 (qx de la tabla sin corregir)
PROP_HOMBRES_NAC = 0.5143  # varones entre los de edad 0 en la proyección del INE 2026-2076; ver prop_hombres_edad0()


def paso(pob, q, f, saldo, prop_h=PROP_HOMBRES_NAC):
    """Avanza un año. pob, q, saldo: dict sexo -> array(101). f: array(101) tasa de fecundidad."""
    nueva = {}
    for s in SEXOS:
        p, qq, m = pob[s], q[s], saldo[s]
        base = (p + m / 2) * (1 - qq)
        n = np.zeros(101)
        n[1:] = base[:-1] + m[:-1] / 2
        n[100] += base[100] + m[100] / 2          # el tramo abierto acumula
        nueva[s] = n
    # nacimientos: mujeres expuestas = media de las de edad x a 1-ene t y a 1-ene t+1
    expuestas = (pob["mujeres"] + nueva["mujeres"]) / 2
    nac = float((f * expuestas).sum())
    for s, sh in (("hombres", prop_h), ("mujeres", 1 - prop_h)):
        n0 = nac * sh * (1 - q[s][0] / 2) + saldo[s][0] / 4
        nueva[s][0] = n0
    return nueva, nac


def resumen(pob) -> dict:
    t = pob["hombres"] + pob["mujeres"]
    return {"total": t.sum(), "0_15": t[:16].sum(), "16_64": t[16:65].sum(), "65_mas": t[65:].sum(),
            "80_mas": t[80:].sum(), "dep_65": t[65:].sum() / t[16:65].sum()}


def proyectar(d: Datos, anio0=2026, anio_fin=2076, *, mult_fecundidad=1.0, mejora_extra=0.0,
              mult_migracion=1.0, ajuste_q_75mas=1.0, prop_h=PROP_HOMBRES_NAC):
    """Escenario propio a partir de las hipótesis del INE.
    mult_fecundidad: factor sobre las tasas de fecundidad del INE.
    mejora_extra: reducción anual adicional (0,01 = 1 %) de qx sobre la del INE, acumulada desde anio0.
    mult_migracion: factor sobre el saldo migratorio del INE.
    ajuste_q_75mas: factor sobre qx desde los 75 años, para probar la sensibilidad a la mortalidad de edades altas
    (1,0 = tablas del INE con la convención de edades de Lexis)."""
    pob = d.poblacion(anio0, proy=True)
    pob_h, filas, nacs = {anio0: pob}, [], {}
    for t in range(anio0, anio_fin):
        ta = min(t, 2075)
        q = d.q_proy(ta)
        k = (1 - mejora_extra) ** (t - anio0 + 1)
        q = {s: np.clip(q[s] * k, 0, 1) for s in SEXOS}
        for s in SEXOS:
            q[s][75:] = np.clip(q[s][75:] * ajuste_q_75mas, 0, 1)
        sal = {s: v * mult_migracion for s, v in d.saldo_proy(ta).items()}
        pob, nac = paso(pob, q, d.f_proy(ta) * mult_fecundidad, sal, prop_h)
        pob_h[t + 1], nacs[t] = pob, nac
    return pob_h, nacs


def contraste(d: Datos, prop_h=PROP_HOMBRES_NAC):
    """Motor con hipótesis del INE frente a la población proyectada por el INE."""
    pob_h, nacs = proyectar(d, prop_h=prop_h)
    filas = []
    for t, p in pob_h.items():
        ine = d.poblacion(t, proy=True)
        a, b = resumen(p), resumen(ine)
        filas.append({"anio": t, **{f"{k}_m1": a[k] for k in a}, **{f"{k}_ine": b[k] for k in b},
                      "err_total_%": 100 * (a["total"] / b["total"] - 1),
                      "err_65_mas_%": 100 * (a["65_mas"] / b["65_mas"] - 1),
                      "err_0_15_%": 100 * (a["0_15"] / b["0_15"] - 1),
                      "err_dep_pp": 100 * (a["dep_65"] - b["dep_65"])})
    return pd.DataFrame(filas)


def backtest(d: Datos, anio0=2010, anio_fin=2025, prop_h=PROP_HOMBRES_NAC, usar_migracion=True):
    """Arranca en anio0 con la población publicada y avanza con las tasas observadas."""
    pob = d.poblacion(anio0)
    filas = []
    for t in range(anio0, anio_fin):
        q = d.q_hist(min(t, 2024))
        f = d.f_hist(min(t, 2024))
        sal = d.saldo_hist(min(max(t, 2008), 2024)) if usar_migracion else {s: np.zeros(101) for s in SEXOS}
        pob, _ = paso(pob, q, f, sal, prop_h)
        real = d.poblacion(t + 1)
        a, b = resumen(pob), resumen(real)
        filas.append({"anio": t + 1, "total_m1": a["total"], "total_real": b["total"],
                      "err_total_%": 100 * (a["total"] / b["total"] - 1),
                      "err_65_mas_%": 100 * (a["65_mas"] / b["65_mas"] - 1),
                      "err_16_64_%": 100 * (a["16_64"] / b["16_64"] - 1),
                      "err_0_15_%": 100 * (a["0_15"] / b["0_15"] - 1)})
    return pd.DataFrame(filas)


if __name__ == "__main__":
    import sys
    d = Datos(sys.argv[1] if len(sys.argv) > 1 else RUTA_DEFECTO)
    c = contraste(d)
    print("CONTRASTE con proyecciones del INE (hipótesis del INE, motor propio)")
    print(c[c.anio.isin([2027, 2030, 2040, 2050, 2060, 2076])][["anio", "err_total_%", "err_65_mas_%", "err_0_15_%", "err_dep_pp"]].round(2).to_string(index=False))
    b = backtest(d)
    print("\nBACKTEST 2010 -> 2025 con tasas observadas")
    print(b[["anio", "err_total_%", "err_65_mas_%", "err_16_64_%", "err_0_15_%"]].round(2).to_string(index=False))
    c.to_csv("m1_contraste_ine.csv", index=False); b.to_csv("m1_backtest.csv", index=False)
    escenarios = {"INE (base)": {}, "fecundidad -20 %": {"mult_fecundidad": 0.8}, "fecundidad +20 %": {"mult_fecundidad": 1.2},
                  "sin migración": {"mult_migracion": 0.0}, "migración -50 %": {"mult_migracion": 0.5},
                  "mortalidad -1 % anual extra": {"mejora_extra": 0.01}}
    filas = []
    for nombre, kw in escenarios.items():
        ph, _ = proyectar(d, **kw)
        for t in (2026, 2035, 2050, 2076):  # hasta 2050 es el horizonte de presentación; 2076 es ilustrativo
            r = resumen(ph[t]); filas.append({"escenario": nombre, "anio": t, **{k: round(v, 3 if k == "dep_65" else 0) for k, v in r.items()}})
    es = pd.DataFrame(filas); es.to_csv("m1_escenarios.csv", index=False)
    print("\nESCENARIOS (resumen)"); print(es.pivot_table(index="escenario", columns="anio", values="dep_65").round(3).to_string())
