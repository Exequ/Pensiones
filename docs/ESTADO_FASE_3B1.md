# Estado de la Fase 3-B1

Rama `feat/fase-3b1-carrera-tramos`. Hecho: Paso 0 (corrección de la explicación del caso `jub-ord-2026-carrera-20a`) y pasos 1 a 10 (exposición de las bases del motor, carrera por tramos en el mapeador y en la interfaz, personas-ejemplo, gráfico, textos y claims, tests unitarios, de componentes y Playwright, `chunkSizeWarningLimit`, documentación). Nada a medias.

- **Motor**: único cambio, `basesPeriodo` (solo lectura). Los 500 tests del motor y los 121 de `src/engine/jubilacion` existentes pasan sin tocarse; los ocho casos de Sergio coinciden.
- **Tamaño del chunk del simulador** (`npm run build`): 2.926,65 kB (231,90 kB comprimido); en la 3-A eran 2.889,62 kB (219,89 kB). Paquete principal: 273,97 kB (sin cambios). No se ha dividido el chunk (decisión de la fase).
- **Datos nuevos**: `data/ejemplos/personas.json` (cinco personas ilustrativas, esquema `ArchivoPersonas`, fuente «elaboración propia», confianza baja). Ninguna cifra de datos nueva en la interfaz; las bases salen de las series de `/data` ya existentes.
- **Afirmaciones**: 2 nuevas en `docs/claims-web.json` (límites de base y definiciones de salario no intercambiables); `docs/claims.json` y `docs/FUENTES.md` regenerados con `scripts/etl/fuentes_claims.py`.
- **Pendiente para fases siguientes**: selector de lecturas alternativas y enlace compartible (3-B2); otras prestaciones (3-C). Pendientes de revisión de Sergio: véase el informe final de la fase y `docs/DECISIONES.md` (Fase 3-B1).
