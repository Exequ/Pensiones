# Modelos de proyección (Python)

Código de los modelos M1 a M6 de la web de pensiones. Lo ejecuta Sergio en local; no forma parte de la web ni de su CI.

| Carpeta | Modelo |
|---|---|
| `m1/` | Demografía (cohortes-componentes) |
| `m2/` | Cotizantes y bases de cotización |
| `m3/` | Pensiones en vigor |
| `m4/` | Modelo financiero (gasto, ingresos, saldo, Fondo de Reserva) |
| `m5/` | Tasa de reposición individual (M5) y cuentas nocionales (M6: `m6_nocional.py`) |

Los textos de descripción de cada modelo están en `docs/modelos/`.

Los modelos leen los datos de `data/` del propio repositorio. Se enlazan entre sí por las carpetas vecinas (M2, M3 y M4 importan M1; M4 importa también M2, M3 y M5).

Ejecución (desde la carpeta de cada modelo): `python -m pip install pytest pandas numpy`, `python <modelo>.py` y `python -m pytest -q`. Las salidas `.csv` se regeneran y no se versionan.
