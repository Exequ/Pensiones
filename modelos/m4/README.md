# M4 · Modelo financiero (v0)
Instalación: carpeta `m4` junto a `m1`, `m2`, `m3`, `m5` (repo en `../Pensiones/data`; `git pull` antes).
Ejecutar: `python m4_financiero.py` y `python -m pytest -q`. Salida: `m4_financiero.csv`. Importa M1, M2 y M3 de las carpetas vecinas.
Escenarios de sensibilidad: `python m4_escenarios.py <carpeta>` genera `m4_escenarios.csv` (un CSV largo con la columna `escenario`: base, g0, g2, ipc1, ipc3; 2025 observado como primera fila de cada uno). Tests: `python -m pytest -q` (20 en total).
