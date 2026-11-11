# data/mitos

Catálogo de afirmaciones frecuentes sobre las pensiones (Fase 1C), de tipo `mitos` (esquema `ArchivoMitos` en `src/engine/esquema-datos.ts`). Generado por `scripts/etl/mitos.py`.

`afirmaciones-circulantes.json` contiene 12 afirmaciones, formuladas literalmente y de forma neutral. Para cada una:

- `datos`: referencias a `/data` (`carpeta/fichero.json` o `carpeta/fichero.json#id`) que permiten contrastarla; `npm run validate:data` comprueba que existan.
- `definiciones`: definiciones alternativas que condicionan el resultado, con su literal.
- `noSePuedeConcluir`: lo que los datos no permiten afirmar.
- `faltan`: datos que harían falta y no están (también en `docs/PENDIENTE_DATOS.md`).
- `revisionActuarial: "pendiente"` y `preguntaActuarial`.

El catálogo **no emite veredictos** (verdadero o falso): muestra datos y definiciones. Un test comprueba que los textos no contienen esas calificaciones.
