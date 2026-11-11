# Decisiones

Registro de decisiones tomadas cuando algo era ambiguo o había que elegir. La más reciente,
arriba dentro de cada fase.

## Fase 1A · Normativa y parámetros

### Estructura de los datos

- **Una serie por fichero** en `data/parametros/`, con un «Dato» por año en `data` (id = año).
  Cada año lleva su propia fuente, porque la mayoría de parámetros se fijan en una norma anual
  distinta (Orden de cotización, Real Decreto de revalorización, Real Decreto del SMI…). El
  formato `series` (fuente única) se mantiene en el esquema pero no se usa en esta fase.
- **Series anuales sin huecos**: el valor de cada año es el vigente el 1 de enero. Los cambios a
  mitad de año (p. ej., la base mínima de julio de 2004) se explican en `notes` del año, no como
  datos trimestrales, para que las series sean comparables y los tests de huecos tengan sentido.
- **Campos nuevos opcionales en «Dato»**: `quote` (cita literal del documento), `location`
  (artículo, anexo o tabla) y `crossCheck` (segunda fuente independiente, con `matches`). Los nombres
  van en inglés, como el resto del esquema «Dato».
- **Ficheros de normativa con tipo propio**: `tipo: "cronologia"` (normas con sus cambios
  antes/después/transición) y `tipo: "prestaciones"` (reglas por prestación). Cada norma o prestación
  lleva su fuente y fecha de descarga, de modo que cualquier número que contenga queda amparado.
- **Unidades exactas**: edades y periodos de cotización en **meses** (780 = 65 años) para evitar
  decimales inexactos; importes en euros/mes con la precisión de la norma; porcentajes en «%».
- **Calendarios legales futuros**: cuando la ley fija valores para años posteriores a 2026 (edad
  en 2027, periodo de cálculo hasta 2037), se incluyen con una nota de «calendario legal vigente».
- **Pesetas (2000-2001)**: se registran los euros de la tabla de equivalencias de la propia norma;
  el importe legal en pesetas se indica en `notes`.
- **claims.json**: cada afirmación lleva `datos` (referencias `carpeta/fichero.json#id`, que el
  validador comprueba que existan) y `revisionActuarial` (`pendiente` en esta fase).
- **`npm run lint` incluye `validate:data`**.

### Fuentes y método

- **BOE como fuente primaria**: textos originales (`doc.php`) y consolidados (`act.php`). Para el
  derecho histórico se usan las **redacciones anteriores** que ofrece el texto consolidado del BOE
  (parámetro `p=AAAAMMDD` de cada artículo); así la edad y la carencia de 2000-2012 se citan con la
  redacción vigente en cada tramo de años.
- **IPC**: API del INE (Tempus3), serie IPC290751 (índice general nacional, base 2025), disponible
  desde enero de 2002. El índice medio anual es la media aritmética de los 12 meses (el INE no lo
  publica como serie propia en esta base) y la variación media anual se calcula a partir de él
  (confianza «media»: puede diferir en una décima de la tasa publicada en su momento). La variación
  de diciembre a diciembre se toma directamente de la serie IPC290750.
- **Segunda fuente**: para bases, tipos, pensión máxima y mínimas se contrasta la norma anual con la
  Ley de PGE del año (norma distinta e independiente en su tramitación); para edades, con la página de
  requisitos de la Seguridad Social. Las diferencias se recogen en `docs/DISCREPANCIAS.md`.
- **Subagentes**: la recogida se repartió por bloques; cada valor lleva la cita literal y el
  documento descargado. Un subagente independiente verificó una muestra aleatoria
  (`docs/INFORME_VERIFICACION.md`).
- **Sitios no accesibles desde el entorno** (MITES, AIReF, Hacienda: la conexión se corta; Inclusión
  e IMSERSO: 403): no se usan; se anotan en `docs/PENDIENTE_DATOS.md` cuando hacían falta.

## Fase 0 · Cimientos

### Herramientas y versiones

- **Versiones con al menos dos semanas de antigüedad.** Las dependencias se instalaron con
  `npm install --before=2026-10-27` y quedan fijadas en `package-lock.json`.
- **TypeScript 6.0 y no 7.** `typescript-eslint` (8.72) solo admite TypeScript `< 6.1`.
- **ESLint 9 y no 10.** `eslint-plugin-jsx-a11y` (reglas de accesibilidad) aún no admite ESLint 10.
- **Playwright 1.63.0 fijado** (con `overrides` de `playwright-core`) para que coincida con el
  Chromium preinstalado en el entorno de desarrollo; en CI se instala con
  `npx playwright install --with-deps chromium`.
- **`npm audit`**: 7 avisos moderados en `minimatch` (ReDoS) arrastrados por
  `typescript-eslint`. Solo afectan a herramientas de desarrollo, no al sitio publicado; la
  corrección automática obliga a bajar de versión. Se acepta y se revisará en fases siguientes.
- **Fuentes variables** (`@fontsource-variable/newsreader` con eje `opsz` y
  `@fontsource-variable/public-sans`): el eje de tamaño óptico mejora los titulares grandes. Se
  empaquetan con Vite; el navegador solo descarga los subconjuntos que necesita
  (`unicode-range`). No hay ninguna petición a dominios externos (lo comprueba Playwright).
- **Favicon vacío** (`data:,`) para evitar una petición a `/favicon.ico` hasta que haya identidad
  gráfica.

### Datos

- **Nombres de campo en inglés** en el esquema «Dato» (`value`, `unit`, `period`, `source`,
  `fetchedAt`, `confidence`, `notes`), tal como se especificó. El resto del código, en español.
- **`period`** es un texto: año (`2024`) o trimestre (`2024-T1` … `2024-T4`).
- **`fetchedAt`** admite fecha (`AAAA-MM-DD`) o fecha y hora ISO 8601 con zona; no puede ser
  futura.
- **`value`** puede ser número finito o texto (para datos cualitativos con fuente).
- **Ficheros de `/data`**: `{ id, title, description, data?: DatoConId[], series?: Serie[] }`.
  Una «Serie» comparte fuente, unidad, fecha y confianza entre todos sus puntos, para no repetir
  la fuente en cada año de una serie larga. Los ids son únicos dentro de cada fichero.
- **Regla adicional del validador**: además del esquema Zod, recorre el JSON y marca cualquier
  número que no cuelgue de un objeto con `source.url` http(s) y `fetchedAt`.
- **`docs/claims.json`** también se valida (esquema `RegistroAfirmaciones`).
- **Euros constantes**: `importe × IPC(base) / IPC(año)` con índices anuales. El adaptador desde
  `/data` rechaza series trimestrales.

### Formato

- **Separador de miles también en cuatro cifras** (`1.680 €`) por defecto en todas las cifras
  (`useGrouping: 'always'`). La norma CLDR de es-ES no agrupa cuatro cifras; quien quiera ese
  comportamiento en texto corrido puede pasar `agruparCuatroCifras: false`.
- **Espacio de no separación** entre cifra y símbolo (`1.680 €`, `12,5 %`), como hace `Intl`.
- Porcentajes a partir de fracciones (`0,125 → 12,5 %`), un decimal como máximo por defecto.
- El signo negativo es el guion de `Intl` (`-1.500 €`).

### Paleta y contraste

Criterios (comprobados por `npm run check:contraste`, que forma parte de `npm run lint`):

- Texto ≥ 4,5:1 y marcas gráficas y controles ≥ 3:1 (WCAG 2.x AA) sobre papel.
- Colores categóricos distinguibles por luminosidad: ΔL\* ≥ 7 entre cualquier par.
- Colores categóricos distinguibles con daltonismo simulado (Machado, Oliveira y Fernandes,
  2009, severidad 1): ΔE (CIE76) ≥ 12 en protanopia, deuteranopia y tritanopia.

La paleta de partida fallaba el criterio de luminosidad:

| Par            | ΔL\* original | Problema                                   |
| -------------- | ------------- | ------------------------------------------ |
| ocre / gris    | 1,4           | Indistinguibles en escala de grises        |
| granate / azul | 2,0           | Indistinguibles en escala de grises        |
| ocre (texto)   | —             | 3,22:1 sobre papel: no vale para etiquetas |
| gris (texto)   | —             | 3,38:1 sobre papel: no vale para etiquetas |

Ajustes (se mantiene el tono y la saturación; se cambia la luminosidad L\*):

| Token                 | Propuesto | Ajustado   | L\*  | Contraste sobre papel |
| --------------------- | --------- | ---------- | ---- | --------------------- |
| `--color-cat-granate` | `#8C2F1B` | sin cambio | 33,3 | 7,35:1                |
| `--color-cat-azul`    | `#2F4B6E` | `#173658`  | 22,0 | 10,94:1               |
| `--color-cat-ocre`    | `#B07D1A` | `#B4811E`  | 57,6 | 3,06:1 (solo marcas)  |
| `--color-cat-verde`   | `#4D6B3A` | `#4F6D3C`  | 42,7 | 5,20:1                |
| `--color-cat-gris`    | `#8A8273` | `#7E7667`  | 49,9 | 3,99:1 (solo marcas)  |

Resultado: ΔL\* mínimo 7,3 (verde/gris); ΔE mínimo 26,6 en visión típica, 15,7 en protanopia,
14,7 en deuteranopia y 19,1 en tritanopia.

- **Variantes para texto**: `--color-cat-ocre-texto` `#875A00` (5,34:1) y
  `--color-cat-gris-texto` `#6B6458` (= apagado, 5,20:1) para etiquetas directas.
- **Orden de uso**: granate, azul, ocre, verde, gris (`--color-cat-1` … `-5`). Con dos o tres
  series, la separación de luminosidad es mucho mayor que el mínimo.
- **Secuencial**: cinco pasos interpolados en CIELAB de papel a granate
  (`#E5C9BA`, `#D2A28F`, `#BD7B66`, `#A6563F`, `#8C2F1B`).
- **Resaltado**: acento sobre filete (4,93:1 entre ellos). Las barras «resto» en filete tienen
  1,49:1 frente al papel, por debajo de 3:1. Se mantiene por ser una decisión de diseño cerrada:
  la información clave es el elemento resaltado, cada barra lleva su etiqueta directa en tinta 2
  (10,55:1) y los datos están en la tabla alternativa.
- No hay modo oscuro: la identidad es «papel». Se declara `color-scheme: light`.

### Maquetación y componentes

- **Contenedor de 1232 px incluido el margen**: 1232 − 2 × 64 = 1104 = 760 (texto) + 64
  (separación) + 280 (notas). Margen lateral fluido `clamp(24px, 5vw, 64px)`.
- **Punto de ruptura de 960 px**: por debajo, una sola columna, las notas al margen van tras el
  párrafo y la navegación pasa a un menú desplegable («Menú»).
- **Notas al margen** por colocación automática de la rejilla: una `MarginNote` situada tras un
  elemento se coloca en la columna derecha a su altura.
- **Navegación**: las diez secciones; «Metodología» alineada a la derecha. «Fuentes» y
  «Registro de cambios» son páginas propias enlazadas desde el pie.
- **Antetítulo de las secciones en construcción**: «Sección N de 10», calculado.
- **Nombre provisional del sitio**: «Pensiones, con datos» (`src/config.ts`).
- **Chart**: los colores se pasan a Plot como `var(--color-…)` (sin literales). Se eliminan los
  `aria-label` internos que pone Plot en los `<g>` porque el SVG es `role="img"` con nombre y
  tabla alternativa (axe los marcaba como no permitidos). La tabla va en un `<details>`.
- **InteractiveSentence**: `<select>` nativo; el objetivo táctil de 44 px se consigue con
  márgenes negativos (`1lh`) para no alterar el interlineado. El resultado va en `<output>`.
- **SegmentedPills**: botones de opción nativos (navegación con flechas incluida).
- **DataTable**: la primera columna es cabecera de fila (`<th scope="row">`); las tablas anchas
  se desplazan dentro de una región enfocable con teclado.
- **Enlace «Saltar al contenido»**: con HashRouter un ancla cambiaría de ruta, así que mueve el
  foco por JavaScript.
- **Desplazamiento suave** solo con `prefers-reduced-motion: no-preference`. No hay animaciones
  ni transiciones (la auditoría de estilos las prohíbe).
- **Laboratorio de diseño** cargado bajo demanda: Observable Plot no entra en el paquete de la
  portada mientras ningún módulo publicado tenga gráficos.

### Flujo de trabajo

- Rama `feat/fase-0-cimientos`, como se pidió para esta fase.

## Fase 1A, parte 2: método y decisiones

- **Extracción con scripts**: las tablas (órdenes de cotización, revalorización, mínimas, SMI, IPREM) se extraen con scripts de `scripts/etl/` desde los documentos descargados. Los datos que el parser no resuelve se completan solo con la recogida manual previa si la cita literal consta en el documento (se comprueba por código); si no, quedan en `docs/PENDIENTE_DATOS.md`.
- **Unidades**: las cuantías mínimas se guardan en euros/año (como figuran en el Anexo I); la pensión máxima y las bases, en euros/mes. Se descartan los importes de 2000 en pesetas sin equivalencia en euros en el texto.
- **Varias normas por año**: cuando dos normas del mismo año fijan el mismo importe (Ley de PGE, real decreto-ley y real decreto) se toma la posterior y las demás figuran como contraste; si difieren (viudedad menor de 60 años en 2013) se documenta en `docs/DISCREPANCIAS.md`.
- **Modificaciones de las órdenes de cotización**: para 2023 y 2024 la base mínima es la de la orden modificadora (PCM/313/2023 y PJC/281/2024), con efectos desde el 1 de enero.
- **Prórrogas presupuestarias**: sin orden anual en 2020; la base máxima de 2020 se toma por remisión del RDL 18/2019 al RDL 28/2018 (confianza media) y las bases mínimas y tipos de 2020 quedan pendientes.
- **Series retiradas por incompletas**: el límite de ingresos con cónyuge a cargo no se publica hasta ampliar el extractor.
- **Cronología y prestaciones**: `antes` es `null` cuando el documento descargado no recoge el régimen anterior (no se completa de memoria). El RETA queda fuera.
- **Tests**: el test de series sin huecos admite solo los huecos listados en el propio test, cada uno documentado en `PENDIENTE_DATOS.md`.
- **Tests (aclaración)**: el recuento de pruebas pasó de 68 a 63 en un resumen anterior por una ejecución parcial; revisando el historial de git no se eliminó ninguna prueba (68 al inicio de la Fase 1A y 79 antes de esta parte, contando bloques `it`). Ahora hay más por la cobertura de datos.
