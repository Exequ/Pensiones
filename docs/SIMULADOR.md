# Simulador «Tu pensión»: capa de entrada y presentación

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

Formulario (nacimiento, sexo, hijos si es mujer, jubilación, inicio de cotización, meses sin cotizar, base, opciones, IPC supuesto con su fuente) → cifras principales (pensión mensual y anual, base reguladora, porcentaje, tiempo cotizado, edad ordinaria y edad a la jubilación), requisitos, «Cómo se ha calculado» en siete pasos, avisos del motor, panel de lecturas y limitaciones del motor de jubilación. No hay gráfico: las bases actualizadas por mes no las expone el motor (habría que ampliar su resultado) y las cifras de cada paso se leen mejor como texto en móvil.

## Supuestos del simulador (no de la ley)

Jubilación ordinaria; carrera de base constante; hecho causante el día 1; sin otros ingresos (el motor aplica sus valores por defecto: situación unipersonal, sin rentas); un solo régimen (General). Las cuatro decisiones de forma están en `docs/DECISIONES.md` (Fase 3-A).
