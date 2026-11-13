# Simulador «Tu pensión»: capa de entrada y presentación

Fases 3-A y 3-B1 (la carrera por tramos, las personas-ejemplo y el gráfico están en la sección «Fase 3-B1», al final).

Fase 3-A. La página `#/tu-pension` calcula la **jubilación ordinaria con carrera simple** con el motor de `src/engine/` (sin cambiarlo) y explica el cálculo con las cifras reales del motor. Todo el código está en `src/modules/tu-pension/`; la única pieza nueva del sistema de diseño es `src/components/Field.tsx` (etiqueta, ayuda y error con `aria-live` asociados a un control).

## Flujo

```
formulario (texto) ──mapeador──▶ EntradaJubilacion + ConfiguracionMotor ──fachada.jubilacion──▶ ResultadoOk
                                                                                  │
                         ┌──────────────── presentador ◀──────────────────────────┤
                         ▼                                                         ▼
                 ModeloResultado (cifras formateadas)               supuestos (efecto de cada lectura)
```

| Archivo          | Qué hace                                                                                                                                                                                                                                                                                                | Qué **no** hace                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `mapeador.ts`    | Valida el formulario (mensajes en español) y lo traduce a la entrada del motor: nacimiento y jubilación el día 1 del mes, carrera de base constante con un bloque de meses sin cotizar (en mitad de la carrera o justo antes de jubilarse), IPC supuesto en % → fracción.                               | No calcula nada de la pensión; no toca ninguna lectura abierta. |
| `calcular.ts`    | Orquesta: mapeo → motor → presentador → panel de lecturas. Recibe el motor y la lectura de datos por inyección (se prueba sin navegador).                                                                                                                                                               |                                                                 |
| `presentador.ts` | Resultado del motor → modelo de vista con las cifras formateadas con `src/engine/formato.ts`; lee los pasos y requisitos de la fachada (formato de los pasos fijado por un test). Las cifras de reglas (meses nominales, tramos de lagunas) se leen de `/data` por la referencia que ya trae cada paso. | No recalcula nada.                                              |
| `errores.ts`     | `EntradaInvalida`, `DatoNoDisponible` y `NoImplementada` → mensaje, acción que puede hacer la persona y campo al que llevar el foco. Cada código tiene su test.                                                                                                                                         |                                                                 |
| `supuestos.ts`   | Panel «Supuestos y lecturas»: lecturas de `jubilacion.*` con valor actual, estado, motivo y efecto en el resultado (se vuelve a llamar al motor con cada alternativa, cambiando solo esa lectura).                                                                                                      | Sin selector: cambiarlas es de la Fase 3-B.                     |
| `datos.ts`       | Valor inicial de la base (base media de cotización del Régimen General, último año completo) y del IPC supuesto (escenario base de «Pensions at a Glance 2025»), con su `Dato` para `SourceLine`.                                                                                                       |                                                                 |
| `motor.ts`       | Único punto que usa `import.meta.glob` (vía `repositorio.ts`): se carga con la página.                                                                                                                                                                                                                  |                                                                 |

## Carga perezosa

`src/modules/paginas.ts` carga `tu-pension` con `React.lazy`; `App.tsx` envuelve cada página en `Suspense`. El motor y los ficheros de `data/parametros` (`import.meta.glob` eager de `parametros-datos.ts`) quedan en el chunk de la página: no engordan el resto de la web. Medida (`npm run build`): chunk del simulador 2.889,62 kB (219,89 kB comprimido); paquete principal 273,97 kB (antes 273,65 kB; +0,32 kB).

## Qué se ve

Formulario (nacimiento, sexo, hijos si es mujer, jubilación, inicio de cotización, meses sin cotizar, base, opciones, IPC supuesto con su fuente) → cifras principales (pensión mensual y anual, base reguladora, porcentaje, tiempo cotizado, edad ordinaria y edad a la jubilación), requisitos, «Cómo se ha calculado» en siete pasos, avisos del motor, panel de lecturas y limitaciones del motor de jubilación. El gráfico de las bases actualizadas llegó en la Fase 3-B1 (véase abajo).

## Supuestos del simulador (no de la ley)

Jubilación ordinaria; carrera de base constante; hecho causante el día 1; sin otros ingresos (el motor aplica sus valores por defecto: situación unipersonal, sin rentas); un solo régimen (General). Las cuatro decisiones de forma están en `docs/DECISIONES.md` (Fase 3-A).

## Fase 3-B1: carrera por tramos, personas-ejemplo y gráfico

El conmutador «Carrera simple / Carrera por tramos» (`FormularioTuPension.tipoCarrera`) elige entre la carrera de la 3-A (sin cambios) y una tabla de tramos. Nada de esto cambia ninguna regla del motor.

### Exposición de las bases del motor

`ResultadoJubilacion.basesPeriodo` (solo lectura): lista mes a mes de la ventana de la regla aplicada, con base nominal, factor de actualización, base actualizada y si el mes cuenta (`usado`) o es laguna integrada. Detalle en `docs/MOTOR_JUBILACION.md`. El gráfico y su tabla salen de aquí (`grafico-bases.ts`, `GraficoBases.tsx`); el presentador no recalcula nada.

### Archivos nuevos (`src/modules/tu-pension/`)

| Archivo                                                                                                  | Qué hace                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tramos.ts`                                                                                              | Lógica pura: lee y valida los tramos (errores en español y avisos de límites), expande las referencias a series año a año, resume la carrera (meses cotizados, sin cotizar, huecos) y la traduce a la carrera del motor.                                                              |
| `referencias.ts` / `referencias-datos.ts`                                                                | Catálogo de referencias de base: base mínima y máxima (`data/parametros`) y cuatro definiciones de «base media» (`data/macro/salario-medio-definiciones.json`), con fuente y cobertura. `referencias.ts` es puro (recibe los ficheros); `referencias-datos.ts` los importa con Vite.  |
| `personas.ts` / `personas-datos.ts`                                                                      | Personas-ejemplo de `data/ejemplos/personas.json`: validación con el esquema, descripción con cifras del fichero y carga sobre las fechas de la persona usuaria con recorte a la cobertura de los datos.                                                                              |
| `TablaTramos.tsx`, `ResumenTramos.tsx`, `ReferenciasBase.tsx`, `PersonasEjemplo.tsx`, `GraficoBases.tsx` | Interfaz. La tabla es una `<table>` con controles etiquetados, operable con teclado (añadir y duplicar llevan el foco al tramo nuevo; quitar, al vecino), errores por tramo en regiones `aria-live` y objetivos de 44 px; por debajo de 820 px cada fila se apila como tarjeta (CSS). |

`mapeador.ts` valida el formulario según el tipo de carrera y, en tramos, delega en `procesarTramos`; `formularioAEntrada(f, catalogo)` necesita el catálogo en modo tramos. `calcular.ts` devuelve además las `bases` y el resumen de tramos.

### Reglas de los tramos

Un tramo es «desde» (mes y año), «hasta» (mes y año) y una base: importe en euros o referencia a una serie (mínima, media, máxima), que se expande año a año con `basesPorAnio` del motor. Los meses sin tramo son lagunas. Errores (impiden calcular): fechas incompletas, importe no válido, desde posterior a hasta, tramo anterior al nacimiento o posterior al mes previo a la jubilación, solapes, años sin dato de la serie. Avisos (no bloquean): meses por debajo de la base mínima (el cálculo no la sube), por encima de la máxima (la reduce) y años sin límites en `/data`.

### Personas-ejemplo

Cinco perfiles ilustrativos, siempre rotulados así, definidos como tramos de referencias a series (nunca importes) con sus cifras en `data/ejemplos/personas.json`. Al elegir una persona se cargan sus tramos (editables), se explican los recortes por cobertura de datos y se calcula. Si faltan las fechas de nacimiento o jubilación, lo pide.

### Pruebas

`tramos.test.ts`, `personas.test.ts`, `grafico-bases.test.ts`, `tramos-motor.test.ts` (qué hace el motor con bases fuera de los límites), `TablaTramos.test.tsx` (tabla y página), `scripts/tramos-equivalencia.test.ts` (los casos `jub-ord-2026-plana-40a`, `jub-ord-2026-bases-crecientes` y `jub-ord-2026-carrera-20a` expresados como tramos coinciden con el motor a ±0,01 €), `scripts/bases-periodo.test.ts` (la lista reproduce los totales del motor) y Playwright (`e2e/tu-pension.spec.ts`).
