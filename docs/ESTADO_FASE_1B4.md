# Estado de la Fase 1B-4

Rama `claude/fase-1b-4-mortalidad`, un PR. Hecho:

- **A. Defunciones** (`data/demografia/`): INE 1975-2024 por edad simple y sexo, Eurostat por edad y por generación, y total estimado de 2025 (EDeS).
- **B a E. Triangulación**: tablas derivadas `triangulacion-defunciones`, `triangulacion-cohortes` y `triangulacion-factor-qx`; resultados clave en `triangulacion-mortalidad`; informe en `docs/INFORME_VERIFICACION.md` y diferencias en `docs/DISCREPANCIAS.md`.
- **F. Metodología del INE**: citas literales sobre la revisión con el censo de 2021 y las tablas.
- **G. Claims y revisión actuarial**: seis afirmaciones nuevas en `docs/claims.json` (pendientes, con pregunta) y `docs/REVISION_ACTUARIAL.md` ampliado a 44.
- **H. OCDE**: supuestos accesibles en `data/internacional/ocde-supuestos-reposicion`; el resto, en PENDIENTE_DATOS.
- Verificación: `scripts/etl/verificacion_1b4.py` y `scripts/coherencia-mortalidad.test.ts`.

Resultado: ver el informe final de la fase en la conversación y `docs/DECISIONES.md` (sección 1B-4).
