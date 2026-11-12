"""Genera casos_oro_m5.json: escenarios de M5 v1 con su resultado, para validar el motor TypeScript."""
import json, itertools, sys
from pathlib import Path
from m5_v1 import ParamsV1, simular

ruta = sys.argv[1] if len(sys.argv) > 1 else str((next(p for p in (Path(__file__).resolve().parent.parent / "Pensiones" / "data", Path(__file__).resolve().parents[2] / "data") if p.exists()) / "parametros"))
P = ParamsV1.desde_repo(ruta)
casos = []
def add(nombre, rel, g, ini, T, **kw):
    r = simular(rel, g, ini, T, P, **kw)
    casos.append({"nombre": nombre, "entrada": {"rel": rel, "g": g, "edad_inicio": ini, "anio_jubilacion": T, **kw},
                  "salida": {k: r[k] for k in ("edad_jubilacion", "meses_cotizados", "porcentaje", "base_reguladora_mensual",
                             "pension_calculada", "pension_final", "estado", "rr_ultimo_salario", "rr_salario_medio")}})
for T, rel, g in itertools.product((2026, 2035, 2043, 2050), (0.5, 1.0, 2.0), (0.0, 0.015)):
    add(f"base T{T} rel{rel} g{g}", rel, g, 22, T)
add("carrera corta 15 anios", 1.0, 0.01, 50, 2030)
add("inicio tardio 35", 1.0, 0.01, 35, 2040)
add("topada maxima", 3.0, 0.01, 22, 2045)
add("minima", 0.4, 0.01, 22, 2030)
for lg in (12, 48, 60):
    add(f"lagunas {lg}", 1.0, 0.01, 22, 2045, lagunas_meses=lg)
add("ipc 0", 1.0, 0.01, 22, 2045, ipc=0.0)
add("ipc 4", 1.0, 0.01, 22, 2045, ipc=0.04)
add("sin topes", 3.0, 0.01, 22, 2045, topes=False)
add("sin actualizar", 1.0, 0.01, 22, 2045, actualizar=False)
add("opcion25 2040", 1.0, 0.02, 22, 2040)
add("salario medio de referencia 2000", 1.0, 0.01, 22, 2045, salario_medio_ref=2000.0)
Path("casos_oro_m5.json").write_text(json.dumps({"modelo": "M5 v1", "tolerancia_relativa": 1e-9, "casos": casos}, indent=1, ensure_ascii=False), encoding="utf-8")
print(len(casos), "casos")
