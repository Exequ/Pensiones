"""
Compara dos CSV de salida de M4 (por ejemplo, el publicado y el que genera tu ordenador).
Uso: python comparar_csv.py fichero_a.csv fichero_b.csv
Imprime OK si tienen las mismas filas y columnas y todas las cifras coinciden con diferencia relativa <= 1e-9;
si no, imprime qué difiere y en cuánto.
"""
import sys
import numpy as np
import pandas as pd

TOL = 1e-9


def comparar(ruta_a, ruta_b, tol=TOL):
    a, b = pd.read_csv(ruta_a), pd.read_csv(ruta_b)
    if list(a.columns) != list(b.columns):
        return False, f"columnas distintas: {list(a.columns)} frente a {list(b.columns)}"
    if a.shape != b.shape:
        return False, f"tamaño distinto: {a.shape} frente a {b.shape}"
    peor, donde = 0.0, ""
    for c in a.columns:
        if not pd.api.types.is_numeric_dtype(a[c]):
            if not (a[c] == b[c]).all():
                return False, f"la columna de texto «{c}» difiere"
            continue
        x, y = a[c].to_numpy(float), b[c].to_numpy(float)
        if not (np.isnan(x) == np.isnan(y)).all():
            return False, f"hay celdas vacías distintas en «{c}»"
        m = ~np.isnan(x)
        dif = np.abs(x[m] - y[m]) / np.maximum(np.abs(x[m]), 1.0)
        if dif.size and dif.max() > peor:
            peor, donde = float(dif.max()), c
    return peor <= tol, f"diferencia relativa máxima {peor:.2e}" + (f" (columna «{donde}»)" if donde else "")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Uso: python comparar_csv.py fichero_a.csv fichero_b.csv")
    ok, msg = comparar(sys.argv[1], sys.argv[2])
    print(("OK: " if ok else "NO COINCIDEN: ") + msg)
    sys.exit(0 if ok else 1)
