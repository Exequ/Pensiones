# Estado de la Fase 1B

## 1B-1 Sistema: hecha y fusionada

Pensiones, pensionistas, altas y bajas, mínimos, afiliación y razones (ver `data/README.md`).

## 1A-bis: hecha y fusionada

Reglas de evolución futura y de cálculo (`data/parametros/`).

## 1B-2 Financiación (rama `feat/fase-1b-2-financiacion`)

Hecho: pensiones por edad (foto de octubre de 2026), ejecución trimestral del presupuesto 2018-2026, Fondo de Reserva 2009-2025, límite de desembolso, destino del MEI, préstamos, saldos y definiciones de déficit, tests, verificación y docs.
Pendiente: `docs/PENDIENTE_DATOS.md` y `docs/DESCARGAS_MANUALES.md` (liquidación 2005-2017 en PDF, IGAE, AIReF, «gastos impropios», histórico por edades).
Siguiente paso: merge del PR de 1B-2 y empezar 1B-3 (demografía y macro).

## 1B-3 Demografía, macro y salarios (rama `claude/eloquent-einstein-6i526z`, un PR)

Hecha: bloques A, B y C completos salvo lo anotado en `docs/PENDIENTE_DATOS.md`.

- **A (demografía, `data/demografia/`)**: población por edad simple y sexo 1971-2026; tablas de mortalidad 1975-2024 y proyectadas 2026-2075; esperanza de vida a 0 y 65 años; fecundidad 1975-2024; migraciones exteriores 2008-2024 (dos series no homogéneas); proyecciones del INE 2026-2076 con hipótesis; Eurostat (población 1960-2025, EUROPOP2025) y Ageing Report 2024 para España.
- **B (macro, `data/macro/`)**: PIB 1995-2025 (corriente, volumen, deflactor); EPA trimestral 2002-T1 a 2026-T3 y media anual 2002-2025; cuatro definiciones de salario medio lado a lado y sus razones con la base máxima; rendimiento de la deuda a 10 años (Eurostat).
- **C**: Alternativa 1 de la relación afiliados/pensiones (2008-2025); descargas manuales del autor procesadas (MITES, IMSERSO, gastos impropios) y contrastadas; `docs/REVISION_ACTUARIAL.md` (23 afirmaciones) y estado por defecto «no-requiere» en `docs/claims.json`.
- **Verificación**: `scripts/etl/verificacion_1b3.py` (34 comprobaciones, 0 fallos; resultados en `docs/INFORME_VERIFICACION.md` y `docs/verificacion-1b3.json`) y `scripts/coherencia-demografia-macro.test.ts`.

Scripts: `scripts/etl/ine.py` (descarga de tablas Tempus), `ine_paginas.py`, `ine_demografia.py`, `ine_macro.py`, `eurostat_ce.py`, `ss_enero.py`, `mites_bel.py`, `imserso_pnc.py`, `fuentes_claims.py`, `verificacion_1b3.py`.
Siguiente paso: revisión actuarial de `docs/REVISION_ACTUARIAL.md` y fase 2.
