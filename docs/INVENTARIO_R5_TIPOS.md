# Inventario de la fase R5 «Tipos de pensión»

Inventario previo al código. Parte de `origin/main` en `c82922bcee3ef3f5250dc90aa74e1b718b1fe30f` (CI y despliegue en verde, URL pública con 200). Lo que ya está hecho se anota como tal y no se repite.

## 1. Qué hay hoy

Módulo `src/modules/tipos-de-pension`: `Pagina.tsx` (cuadro de panorama, siete fichas, complementos), `FichaPrestacion.tsx`, `SeccionComplementos.tsx`, `datos-tipos.ts` (único módulo que importa `/data`), `ids-datos.ts` (configuración de cada ficha), `cuantias.ts`, `complementos.ts`.

Siete fichas (`FICHAS` en `ids-datos.ts`), de las 16 prestaciones de `data/normativa/prestaciones.json`: jubilación (`jubilacion-ordinaria`), incapacidad permanente, viudedad, orfandad, en favor de familiares, pensión no contributiva de jubilación y de invalidez. Las otras nueve (seis modalidades de jubilación, complemento a mínimos, complemento por brecha de género, Clases Pasivas) no tienen ficha propia.

Datos que usa cada ficha: `prestaciones.json` (texto de la norma), `parametros/pension-minima-*`, `pension-maxima`, `pnc-importe-anual`, `pnc-reglas`, `supervivencia-reglas` (porcentajes de viudedad y orfandad), `sistema/pensiones-vigor-*` e `imserso-pnc-*`.

## 2. Dónde aparecen hoy artículos, normas, citas y ubicaciones en el cuerpo

| Lugar | Qué muestra hoy | Origen en los datos |
| --- | --- | --- |
| `FichaPrestacion`, «Qué es y quién puede cobrarla» | Texto con «(art. 205 TRLGSS)», «arts. 217 y 219»… dentro de la frase | `prestaciones.json`, `aQuienCubre` |
| `FichaPrestacion`, lista de modalidades (solo jubilación) | Nombre de seis modalidades y, entre paréntesis, sus artículos | `modalidades` de la configuración → `prestaciones.json` (`nombre`, `articulos`) |
| `FichaPrestacion`, tabla de requisitos | Columna «Norma» con el artículo de cada requisito; la descripción lleva además citas dentro del texto («art. 205.3», «DT 7.ª») | `requisitos[].articulo` y `requisitos[].descripcion` |
| `FichaPrestacion`, pie de duración y compatibilidades | Citas «(art. 212)», «(art. 213.2)»… | `duracion`, `compatibilidades` |
| `FichaPrestacion`, «Cómo se calcula la cuantía» | Párrafo de `formula` con «art. 209.1», «art. 57», cifras dentro del texto libre | `calculo.formula` |
| `FichaPrestacion`, porcentajes de viudedad y orfandad | Lista con el porcentaje, **la cita literal en un `blockquote` y la ubicación** («art. 31 Decreto 3158/1966…»); su `SourceLine` ya recibe los `Dato` | `supervivencia-reglas` (`quote`, `location`) |
| `FichaPrestacion`, «Límites» | Párrafo con «(art. 57)», «(DT 39.ª)», «(art. 161.2)» | `limites` |
| `FichaPrestacion`, tabla de cuantías mínimas | Columna «Concepto (literal del Anexo I)»: el rótulo de la fila del anexo, sacado de la cita del dato | `quote` de `pension-minima-*` (ya llega a `SourceLine`) |
| `Pagina.tsx`, texto de «Las prestaciones, una a una» | «con el artículo de la norma y el enlace al texto del BOE en la línea de fuente» | texto escrito en el componente |
| `Pagina.tsx`, nota al margen | «Los requisitos, los artículos y las cuantías…» | texto escrito en el componente |
| `secciones.ts`, `previsto` de «Tipos de pensión» (se pinta al final de la página) | «Requisitos principales de cada prestación, con su artículo y el enlace al texto del BOE» | texto del módulo |
| `SeccionComplementos` | Sin artículos, normas ni citas en el cuerpo (la `SourceLine` ya recibe el `Dato`): **ya está hecho, no se toca** | — |

Ya hecho en fases anteriores (R2): el desplegable «Fuentes» (`SourceLine`) muestra título, organismo, identificador, naturaleza, cita y ubicación a partir de `quote` y `location` del `Dato`. La ficha ya tiene una `SourceLine` por bloque de cuantías, de número de pensiones, de porcentajes y una final con la norma de la prestación. No tienen `SourceLine` propia: quién puede cobrarla, requisitos, duración y compatibilidades, cálculo ni límites; sus citas hoy solo viven dentro del texto.

## 3. Fichas con modalidades o grados con artículos

- **Jubilación**: lista de seis modalidades con artículos (anticipada involuntaria, anticipada voluntaria, demorada, activa, flexible, parcial). Es la única ficha con la lista `modalidades` en su configuración.
- **Incapacidad permanente**: no tiene lista de grados; los grados (parcial, total, absoluta, gran incapacidad) solo se nombran dentro del texto de los requisitos, la duración y la compatibilidad, sin artículo propio en una lista. No hay nada que quitar salvo las citas del texto.
- Resto de fichas: sin modalidades.

## 4. Fórmulas hoy (campo `calculo.formula`, texto libre)

| Prestación | ¿Fórmula cerrada en la norma? | Observación |
| --- | --- | --- |
| Jubilación ordinaria | **Sí**: base reguladora (suma de bases con actualización, partida por un divisor) × porcentaje | Cifras dentro del texto: 24, 25, 348 y 378. Cada una está en `data/parametros` (`actualizacion-bases`, `periodo-calculo-base-reguladora`, `divisor-base-reguladora`). El texto describe la regla del art. 209.1; en el calendario transitorio el divisor y el periodo son otros (datos año a año) |
| Incapacidad permanente | Parcial: tanto alzado. Total, absoluta: baremo reglamentario. **Gran incapacidad: el complemento sí es una suma de dos porcentajes** (45 % de la base mínima y 30 % de la última base) | Solo el complemento de la gran incapacidad tiene fórmula cerrada; los porcentajes están en `incapacidad-permanente-reglas` |
| Viudedad, orfandad | No: «porcentaje de la base reguladora fijado reglamentariamente; no consta en el texto consultado» | El porcentaje se muestra aparte con su dato de `supervivencia-reglas` |
| En favor de familiares | No: «la cuantía se fija en las normas de desarrollo» | — |
| PNC de jubilación y de invalidez | Reglas numéricas (importe anual, 70 % por beneficiario adicional, 35 % de rentas) sin una fórmula única de cuantía individual | Se mantiene el texto |
| Modalidades de jubilación (sin ficha) | Sí en varias, pero no se muestran en esta página | Fuera de esta fase (pendiente para «Cómo se calcula») |

## 5. Pruebas que afirman los textos antiguos

- `src/modules/tipos-de-pension/tipos.test.tsx`:
  - «cada ficha trae requisitos con artículo…»: exige la columna de norma (`fila[2]` con «art|DT|disposición»).
  - «la viudedad y la orfandad muestran el porcentaje… con su cita literal»: exige `.tipos-citas blockquote`.
  - «la ficha de jubilación nombra las demás modalidades…»: exige seis `li` y «Jubilación parcial».
  - Las cuantías (columna «Importe anual», posición de las columnas) no cambian.
- `scripts/sistemas-tipos-5c.test.ts`: procedencia de ficheros y ausencia de dígitos en los textos de `secciones.ts` (se mantiene; el texto nuevo no lleva cifras).
- `src/modules/historico/neutralidad.test.tsx`, `src/app/voz-rutas.test.tsx`, `src/app/graficos-rutas.test.tsx` (nombres de «Fuente(s)» únicos en cada ruta): recorren la página y hay que mantenerlos en verde con las líneas de fuente nuevas.
- e2e: `e2e/sistemas-tipos.spec.ts` (siete fichas, una tabla visible y `comprobarFuente` en cada ficha, móvil sin desborde, axe), `e2e/ajustes-actuariales-4.spec.ts` y `e2e/descargas-5a4.spec.ts` (complementos; no cambian).
- `scripts/coherencia-datos.test.ts`: cada prestación cita artículos y fuente (los datos conservan todas las citas).
