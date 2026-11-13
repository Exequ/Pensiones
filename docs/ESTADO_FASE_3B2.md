# Estado de la Fase 3-B2

Rama `feat/fase-3b2-lecturas-enlace`. Hecho: Paso 0 (nota del caso `jub-ord-2026-carrera-20a`) y pasos 1 a 8 (capa de lecturas, selector interactivo, bloque de comparación, enlace compartible, textos, claims, pruebas unitarias, de componentes y Playwright, documentación). Nada a medias.

- **Motor**: sin cambios. Ninguna regla, valor por defecto, estado ni motivo de las lecturas se ha tocado. Los ocho casos de Sergio coinciden (`npx tsx scripts/casos-sergio.ts`).
- **Lecturas que se pueden cambiar**: las nueve de `jubilacion.*` del registro (todas con al menos dos valores): base máxima, pensión máxima, base mínima de las lagunas, último día de la opción de contar más años, lagunas anteriores al primer alta, índice de precios (tres valores), suelo del factor de actualización, fracción de la demora y pensión máxima de los últimos años del calendario legal.
- **Enlace**: formato `#/tu-pension?v=1&…` (`docs/SIMULADOR.md`). Con 100 tramos (el máximo) y las nueve lecturas cambiadas ocupa unos 2.800 caracteres; ~23 por tramo.
- **Tamaño del chunk del simulador** (`npm run build`): 2.949,59 kB (238,56 kB comprimido); en la 3-B1 eran 2.926,65 kB (231,90 kB). Paquete principal: 273,97 kB (sin cambios).
- **Afirmaciones**: 3 nuevas en `docs/claims-web.json` (`docs/claims.json` regenerado con `scripts/etl/fuentes_claims.py`). Sin fuentes nuevas: `docs/FUENTES.md` no cambia.
- **Pruebas**: 1.365 tests de Vitest y 156 de Playwright (escritorio y móvil, axe incluido) pasan en local.
- **Pendiente para fases siguientes**: otras prestaciones (3-C) y reducción del chunk (3-D). Decisiones y puntos para revisión de Sergio: `docs/DECISIONES.md` (Fase 3-B2).
