# Simulador «Tu pensión»: capa de entrada y presentación

Fases 3-A, 3-B1, 3-B2 y 3-C1 (la carrera por tramos, las personas-ejemplo y el gráfico están en «Fase 3-B1»; las lecturas alternativas y el enlace compartible, en «Fase 3-B2»; el selector de prestación y la incapacidad permanente, en «Fase 3-C1», al final).

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
| `supuestos.ts`   | Panel «Supuestos y lecturas»: lecturas de `jubilacion.*` con valor elegido, estado, motivo y efecto en el resultado (se vuelve a llamar al motor con cada alternativa, cambiando solo esa lectura). Desde la 3-B2 es interactivo (véase «Fase 3-B2»).                                                   | Sin selector hasta la Fase 3-B2.                                |
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

## Fase 3-B2: lecturas alternativas y enlace compartible

Nada de esto cambia una regla del motor ni un valor por defecto, estado o motivo de las lecturas. Decisiones: `docs/DECISIONES.md` (Fase 3-B2).

### Lecturas alternativas

`src/engine/comparar-lecturas.ts` (lógica pura, sin React):

| Función                                         | Qué hace                                                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lecturasOfrecidas()`                           | Lecturas de la jubilación con al menos dos valores en el registro. Hoy las nueve; no se inventa ninguna alternativa.                                                            |
| `normalizarEleccion(e)` / `valoresElegidos`     | Deja solo lo ofrecido, válido y distinto del valor por defecto / valor efectivo de cada lectura.                                                                                |
| `lecturasCambiadas(e)`                          | `{ id, valor, porDefecto }` de las cambiadas, en el orden del registro.                                                                                                         |
| `compararLecturas(entrada, config, e, fabrica)` | Calcula con la elección y con todo por defecto y devuelve `sin-cambios`, `comparado` (con la diferencia en euros al mes y en % de pensión y base reguladora) o `no-comparable`. |

La elección vive en `FormularioTuPension.lecturas`. `textos-lecturas.ts` da, por lectura y valor, una etiqueta y una frase de «qué cambia» (sin cifras ni consejo). `PanelSupuestos.tsx` es un grupo de botones de opción por lectura (con estado, motivo y efecto) y el botón «Restablecer lecturas»; `ComparacionLecturas.tsx` es el bloque junto al resultado («Con tus lecturas» frente a «Con las lecturas por defecto», tabla y frase en una región `aria-live`).

### Enlace compartible (`enlace.ts`, `EnlaceCompartible.tsx`)

`#/tu-pension?v=1&…` (HashRouter). Todo es local: el enlace es la única forma de compartir.

| Parámetro            | Contenido                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `v`                  | Versión del formato (`1`); obligatorio                                                                            |
| `nac`, `jub`, `ini`  | Nacimiento, jubilación e inicio de la cotización (carrera simple), `AAAA-MM`                                      |
| `sex`, `hij`         | `h` o `m`; hijos (solo con `m`)                                                                                   |
| `car`                | `s` (simple) o `t` (tramos)                                                                                       |
| `lag`, `ubi`, `base` | Meses sin cotizar, ubicación (`m` o `f`) y base de la carrera simple, tal como se escribió                        |
| `tr`                 | Tramos separados por `~`; cada uno `desde:hasta:base` con fechas `AAAA-MM` y base = importe o `min`, `med`, `max` |
| `med`, `pe`          | Definición de la «base media» y persona-ejemplo cargada                                                           |
| `min`, `max`         | Complemento a mínimos y pensión máxima (`1` o `0`)                                                                |
| `ipc`                | IPC supuesto en %, tal como se escribió; vacío = sin escenario                                                    |
| `lec`                | Lecturas cambiadas, `id:valor` separadas por comas (solo las que difieren del valor por defecto)                  |

Ejemplo (carrera simple, una lectura cambiada): `#/tu-pension?v=1&nac=1961-11&jub=2026-11&sex=h&car=s&ini=1986-11&lag=0&ubi=m&base=2500&med=media-cotizacion-rg&min=1&max=1&ipc=2&lec=jubilacion.actualizacionFactorMinimo:sin-suelo`.

**Lectura**: se valida cada campo contra rangos de sensatez (`LIMITES_ENLACE`) y contra el registro (lecturas, valores, ids de media y de persona). Lo inválido se ignora y la página muestra un aviso con qué se ha ignorado; sin versión, con versión desconocida o con más de 12.000 caracteres, el enlace se descarta entero. Nunca falla. **Escritura**: solo lo válido y completo.

**Tamaño**: unos 23 caracteres por tramo; con 100 tramos (el máximo) y las nueve lecturas cambiadas, unos 2.800 caracteres (la parte de hash no se envía al servidor). Con más de 100 tramos, el enlace omite los últimos y la página lo avisa.

### Pruebas

`scripts/lecturas-usuario.test.ts` (capa de lecturas con tres casos de Sergio: elección por defecto idéntica a la llamada directa, alternativas idénticas a la llamada directa con esa lectura, elegir y restablecer), `enlace.test.ts` (ida y vuelta en modo simple, tramos y con lecturas; malformado, versión desconocida, fuera de rango, lectura inexistente; tamaño), `textos-lecturas.test.ts`, `comparacion-texto.test.ts`, `Lecturas.test.tsx` (selector, restablecer, comparación, copiar enlace, aviso) y `e2e/lecturas-enlace.spec.ts` (escritorio y móvil, axe, pestaña nueva con el mismo resultado).

## Fase 3-C1: selector de prestación e incapacidad permanente

La página calcula ahora dos prestaciones: **jubilación ordinaria** (sin ningún cambio de comportamiento ni de enlace) e **incapacidad permanente**. Supervivencia (3-C2) y no contributivas y MEI (3-C3) aparecen como «próximamente». Decisiones: `docs/DECISIONES.md` (Fase 3-C1).

### Diseño de la generalización

```
FormularioTuPension (prestacion, datos, carrera, opciones, lecturas)
        │
        ▼  prestacionDe(f.prestacion)  →  Prestacion { id, etiqueta, motorLimitaciones, etiquetasComparacion, calcular }
        │                                                      │
        ▼                                                      ▼
 calcularConReceta(receta, f, deps)  ◀── Receta<E, R> { motorLecturas, importeEfecto, mapear, ejecutar, presentar, bases }
        │
        ├─ receta.mapear(f)            → Entrada del motor + ConfiguracionMotor (o errores de formulario)
        ├─ receta.ejecutar(motor, e)   → Resultado de la fachada (o error del motor → mensaje en español)
        ├─ receta.presentar(r, f, deps)→ ModeloResultado (cifras formateadas, requisitos, pasos)
        ├─ compararLecturas(...)       → con tus lecturas frente a las de por defecto (genérico)
        └─ efectoPorLectura(...)       → efecto de cada alternativa de cada lectura (genérico)
```

| Archivo                                                   | Qué hace                                                                                                                                                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prestaciones.ts`                                         | `Prestacion` y `Receta` de la jubilación y de la incapacidad, lista de prestaciones y de «próximamente», `calcularTuPension` (despacha por prestación).                                      |
| `receta.ts`                                               | Orquestación común (era `calcular.ts`): mapear, motor, presentador, comparación y efectos. `calcular.ts` reexporta `calcularTuPension` y los tipos: los importes anteriores siguen valiendo. |
| `incapacidad-mapeador.ts`                                 | Valida y traduce a `EntradaIncapacidad`: grado y origen (con los que el motor soporta), alta, trabajo; la carrera es la de la jubilación (`carreraSimple`, `analizarTramos`).                |
| `incapacidad-presentador.ts`                              | Resultado del motor → cifras, requisitos y «Cómo se ha calculado» (carrera, periodo mínimo, base reguladora, grado, límites y complementos, trabajo, pensión inicial). Sin gráfico de bases. |
| `textos-incapacidad.ts`, `textos.ts` (`TextosPrestacion`) | Textos propios de cada prestación (fecha final de la carrera, aviso, introducciones) y de la incapacidad. Sin dígitos (test).                                                                |
| `SelectorPrestacion.tsx`                                  | Grupo de botones de opción: jubilación, incapacidad y las demás desactivadas «(próximamente)».                                                                                               |
| `Formulario.tsx`                                          | Mismo formulario para las dos prestaciones; con incapacidad cambia el nombre de la fecha y se añade el grupo «Tu incapacidad» (grado, origen, alta, trabajo).                                |
| `LecturasQueIntervienen.tsx`, `intervienen.ts`            | Bloque junto al resultado: lecturas sin decidir con firmeza que cambian el resultado y, con accidente no laboral, siempre la de los meses sin cotizar.                                       |
| `src/engine/comparar-lecturas.ts`                         | `lecturasOfrecidas(motor)`, `normalizarEleccion(e, motor)`, `compararLecturas(…, ejecutor, motor)`: la jubilación es el valor por defecto de todos los parámetros nuevos.                    |

La jubilación pasa por la misma receta que la incapacidad. Condición cumplida: los tests anteriores de jubilación (unitarios, de componentes, Playwright y equivalencias con los casos de Sergio) pasan sin cambiar ni una aserción; solo cambió el helper `FORMULARIO_BASE` (campos nuevos) y la lista de textos de lecturas que comprueba `textos-lecturas.test.ts` (ahora cubre las dos prestaciones).

### Incapacidad permanente: entrada y resultado

- **Entrada**: nacimiento y hecho causante (mes y año; el hecho causante está en los campos `jubilacion*` del formulario), sexo e hijos (complemento por hijos), grado, origen, alta, trabajo, carrera simple o por tramos con personas-ejemplo, mínimos, máxima e IPC supuesto.
- **Grados**: parcial, total, absoluta y gran incapacidad. **Orígenes** (ajustes actuariales 1): los cuatro están activos; con accidente de trabajo o enfermedad profesional el formulario pide el campo obligatorio «Base reguladora mensual (€)» (la de la resolución o la calculada por la persona; la web no la calcula) y se pasa al motor como `baseReguladoraProfesional` (como `baseReguladoraIT` en la parcial); solo se calcula en alta. Antes estaban desactivados porque el motor exige una base reguladora calculada fuera (véase limitaciones).
- **Resultado**: cuantía mensual y anual por paga (o cantidad a tanto alzado en la parcial), base reguladora, porcentaje aplicable, complementos (total cualificada, gran incapacidad, hijos), importe en suspenso, periodo mínimo exigido, tiempo cotizado y meses añadidos hasta la edad ordinaria. Requisitos en tabla.
- **Limitaciones del motor** (`LIMITACIONES_MOTOR`, motor `incapacidad`) siempre visibles al final.
- **Lecturas**: las seis `incapacidad.*` se pueden cambiar, con comparación frente a las de por defecto y efecto por lectura. El bloque «Lecturas abiertas que intervienen en tu resultado» enseña estado y motivo y el efecto de la alternativa; con accidente no laboral muestra siempre `incapacidad.lagunasAccidenteNoLaboral`.

### Enlace con `p=`

| Parámetro | Contenido (solo incapacidad, salvo `p`)                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| `p`       | `inc`. Sin `p`, jubilación: el enlace de jubilación no cambia en nada y los enlaces antiguos valen.                         |
| `hc`      | Fecha del hecho causante, `AAAA-MM` (en lugar de `jub`).                                                                    |
| `gr`      | Grado: `par`, `tot`, `abs`, `gin`.                                                                                          |
| `or`      | Origen: `ec` (enfermedad común), `anl` (accidente no laboral), `at` (accidente de trabajo) o `ep` (enfermedad profesional). |
| `br`      | Base reguladora mensual, tal como se escribió; solo con `or=at` o `or=ep`.                                                  |
| `alt`     | En alta o situación asimilada: `1` o `0`.                                                                                   |
| `trb`     | Trabaja tras el reconocimiento: `1` o `0`.                                                                                  |

Se mantienen `nac`, `sex`, `hij`, `car`, `ini`, `lag`, `ubi`, `base`, `tr`, `med`, `pe`, `min`, `max`, `ipc` y `lec` (con las lecturas `incapacidad.*`). Ejemplo: `#/tu-pension?v=1&p=inc&nac=1981-03&hc=2026-03&gr=tot&or=ec&alt=1&trb=0&sex=h&car=s&ini=2000-01&lag=0&ubi=m&base=2000&med=media-cotizacion-rg&min=1&max=1&ipc=2`. Los parámetros de una prestación en el enlace de la otra se ignoran con aviso.

### Pruebas

`incapacidad-mapeador.test.ts`, `incapacidad-presentador.test.ts`, `enlace-incapacidad.test.ts` (incluida la compatibilidad con los enlaces `v=1` de jubilación), `errores.test.ts`, `Incapacidad.test.tsx` (selector, formulario, panel de lecturas, enlaces), `scripts/tu-pension-incapacidad-equivalencia.test.ts` (ocho casos de oro de la incapacidad, también con carrera por tramos, ±0,01 € frente a la llamada directa al motor) y `e2e/incapacidad.spec.ts` (flujo completo, selector con teclado, lectura del accidente no laboral, comparación, enlace en pestaña nueva, enlace antiguo de jubilación, errores, parcial, móvil y axe).

## Ajustes actuariales 1 (2026-11-14)

- **Lecturas**: el valor por defecto de `incapacidad.lagunasAccidenteNoLaboral` es `sin-integrar` (estado pendiente); el bloque «Lecturas abiertas que intervienen» muestra siempre, con accidente no laboral, su estado, su motivo y el efecto de la alternativa «integrar». Los estados de las demás lecturas cambian según `docs/DECISIONES_ACTUARIALES.md`. Los textos «qué cambia» están revisados (`docs/DECISIONES.md`).
- **Nota plegable «Qué lecturas de jubilación se aplican aquí»** en el panel de supuestos de la incapacidad: siete lecturas `jubilacion.*` con su valor aplicado (el del registro) y su estado; no son editables y los cambios de la pantalla de jubilación no pasan a la incapacidad. Componente `LecturasJubilacionEnIncapacidad`; lista en `lecturas-jubilacion-en-incapacidad.ts`, comprobada contra el motor por `scripts/lecturas-jubilacion-incapacidad.test.ts`.
- **Personas-ejemplo**: la referencia «media» se rotula «salario medio ilustrativo» y una nota (`notaSalarioMedioIlustrativo`) explica la cobertura de la definición elegida.
- **Pruebas nuevas**: componentes (`Incapacidad.test.tsx`: origen profesional, nota), mapeador, presentador y enlace de incapacidad, `personas.test.ts`, equivalencia con el motor (`scripts/tu-pension-incapacidad-equivalencia.test.ts`) y Playwright (`e2e/incapacidad.spec.ts`: accidente no laboral con el nuevo valor por defecto y su alternativa, enlace antiguo, origen profesional, nota, móvil y axe).
