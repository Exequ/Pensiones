# Decisiones

Registro de decisiones tomadas cuando algo era ambiguo o había que elegir. La más reciente,
arriba dentro de cada fase.

## Fase 2-A · Motor de cálculo de la jubilación

### Proceso y datos

- **Rama y base**: `feat/fase-2a-motor-jubilacion`, creada desde `origin/main` (que ya contiene los casos de oro y los ficheros de M5 de `data-raw/casos-oro`), como pidió el encargo y no la rama de trabajo que asigna el entorno.
- **Datos que faltaban** (`scripts/etl/jubilacion_reglas.py`, citas literales de `data-raw/boe` comprobadas por código **dentro del artículo o disposición**): escala numérica de la DT 9.ª; periodo previo; cuadros de los arts. 207.2 y 208.2; DT 34.ª (960 coeficientes, con la comprobación de que en 2033 coinciden con el art. 208.2); requisitos de las anticipadas y de la parcial; demora (art. 210.2, fórmula del pago único del texto del PDF de la Ley 21/2021, opción mixta del RD 371/2023); DT 41.ª; tabla de la DT 39.ª.4; reglas del art. 60; edad de 65 años y número de pagas. Los valores escritos con letras o en años pasan a números (meses) en `value`; la conversión consta en `notes`.
- **RD 371/2023** (texto consolidado al 28/05/2026): se descargó en esta fase (`data-raw/boe/rd-371-2023.txt`, huella en `origen.json`) porque la opción mixta de la demora solo estaba descrita en prosa. La redacción es la vigente desde el 28/08/2026 (RD 416/2026); la anterior no se transcribe y los hechos causantes previos a esa fecha lanzan `NoImplementada`.
- **Corrección de `PENDIENTE_DATOS.md`**: la fila «Incrementos de la base máxima y de la pensión máxima a partir de 2051» decía que la ley no fija incremento más allá de 2050. La DT 39.ª.4 sí fija una tabla para 2051-2065 (se recoge en `pension-maxima-incremento-2051-2065`); sigue sin haberlos para la base máxima y para las mínimas.
- **Tests de Node en `scripts/`**: los que leen ficheros (contraste con M5, verificación, casos de Sergio) están en `scripts/`, porque `tsconfig.app.json` no tiene tipos de Node. Los parámetros se leen con `construirParametros` y `readFileSync` (`scripts/lib/motor-jubilacion.ts`); en `src/` se leen con `import.meta.glob` (`parametros-datos.ts`).
- **Generación de claims**: `fuentes_claims.py` genera una afirmación por fichero nuevo y ocho preguntas actuariales nuevas (más dos preguntas ampliadas); el límite superior de afirmaciones pendientes del test pasa de 50 a 60.
- **Límite de uso**: no se alcanzó; no hizo falta parada.

### Estructura del motor

- **Funciones puras con un contexto**: `crearContexto(params, opciones)` agrupa las magnitudes que dependen del año (IPC mensual, bases, pensión máxima, mínimas…) y acumula `avisos`; el resto son funciones que reciben el contexto o las tablas. `calcularJubilacionConParametros` recibe los parámetros (sin `import.meta.glob`) para poder usarse en Node; `repositorio.ts` es el envoltorio para Vite.
- **Entrada de carrera**: periodos con base constante, por año o por mes; huecos = meses sin obligación de cotizar; solapes = pluriempleo (se suman, con el tope de la base máxima). Cada mes cuenta como cotización efectiva (sin parte proporcional de pagas extra).
- **Fechas con día**: la normativa es la del año del hecho causante; la víspera y el día del cambio de normativa dan resultados distintos (test).
- **Paso de «a partir de»**: el último año de una serie legal se extiende hacia delante (`valorEn` marca `extendido`): edad y carrera de la DT 7.ª (2027), periodo y divisor de la DT 40.ª (2037), escala (2027), opción de 25 años (sin opción desde 2044).
- **Escenario económico explícito**: el IPC y las magnitudes que dependen de él después de los últimos datos salen de `opciones.escenario`; sin escenario, un año sin dato lanza `DatoNoDisponible`. La base mínima de 2020 y 2021 (sin dato) también falla por defecto; `huecoBaseMinima: 'anterior'` es una concesión explícita.
- **IPC mensual**: `/data` solo tiene medias anuales. Se interpola en logaritmos entre medias anuales situadas a mitad de año; antes de mediados de 2002 se usa la variación de diciembre a diciembre del INE. Es una aproximación declarada (opción `interpolacionIPC`; efecto del orden de ±1 % en la base reguladora).
- **Mínimas y base mínima desde 2027**: solo se revalorizan con el IPC del escenario (la DA 53.ª de 2027 exige el umbral de pobreza, no descargado). Es lo que hace M5.

### Interpretaciones adoptadas (la opción más sencilla, con la alternativa como opción cuando afecta al resultado)

- **Lagunas**: se cuentan los meses de la ventana sin cotización, también los anteriores a la primera alta (lectura literal del art. 209.1.b); la primera laguna es la más próxima al hecho causante; se integran con la base mínima del mes de la laguna y se actualizan con el IPC como las demás bases. Las bases integradas entran en la selección de las mejores bases.
- **DT 41.ª**: se aplica a la regla general y no a la opción de 25 años (que aplica la redacción de 2023); por defecto, a las mujeres (la brecha de la DA 37.ª no consta en `/data`: se da por vigente) y a los hombres que acrediten el art. 60.1.b); se puede forzar con `integracionReforzadaLagunas`.
- **Opción de 25 años**: se calcula también la regla general y se aplica la mayor base reguladora; el 31/12/2040 se trata como cubierto (lectura de `/data`), con `opcion25EnUltimoDia2040: 'excluida'` como alternativa. Ese último día se deduce de `/data` (último año con ventana de 300 meses), no está escrito en el código.
- **Edad legal de las anticipadas y la parcial con relevo**: la que correspondería «de haber seguido cotizando» hasta los 65 años, con el calendario del año del hecho causante. En la ordinaria y la demorada se usan los meses cotizados reales. Los coeficientes se eligen con los meses cotizados reales.
- **Anticipación**: cada mes o fracción de mes cuenta como un mes (redondeo hacia arriba entre el hecho causante y la fecha en que cumpliría la edad legal).
- **Voluntaria**: se exige además (art. 208.1.c) que la pensión reducida supere la mínima de los 65 años; con 3 meses de subsidio se usan los coeficientes y el tope de la involuntaria (art. 208.3); sobre el límite de pensión se aplica la DT 34.ª (sin la salvaguarda del apartado 1: no hay normas de 2021 transcritas).
- **Involuntaria**: si no se informa de la demanda de empleo ni de la causa del cese, se suponen cumplidas y se avisa.
- **Demora**: la fracción de más de 6 meses cuenta desde el segundo año completo (opción `fraccionDemora`); los años de demora son meses cotizados tras la fecha en que se cumplió la edad ordinaria; el pago único usa la pensión anual reconocida limitada a la máxima; con la opción por porcentaje, el porcentaje no usado al topar se paga como cantidad anual (redondeada al euro por exceso y con el tope de 12 veces la base máxima).
- **Parcial**: pensión proporcional a la reducción de jornada (sobre la pensión ya limitada a la máxima), sin coeficientes reductores, con mínima proporcional y sin complemento de brecha; solo desde la redacción vigente desde el 1/4/2025.
- **Brecha de género** (art. 60): el complemento no cuenta para el límite de pensión máxima y se suma a la mínima; máximo de 4 hijos; un hombre solo con las condiciones del art. 60.1.b).
- **Complemento a mínimos**: clase `jub65` si la edad al hecho causante es de al menos 65 años (si no, `jub-menor65`); con cónyuge a cargo y rentas el motor avisa y no aplica el complemento, porque falta el límite correspondiente.
- **Pensión máxima desde 2051** (tabla de la DT 39.ª.4): por defecto, como incremento acumulado total que enlaza con 26 × 0,115 de 2050; alternativa: incremento anual literal. Es una duda sin resolver (`REVISION_ACTUARIAL.md`).
- **Lecturas de «acumulativos»**: por defecto, la compuesta de `/data` (confirmada con 2025 y 2026); alternativas: base máxima con los 1,2 puntos sumados sobre la cifra inicial, y pensión máxima con un incremento que crece 0,115 puntos cada año.
- **Contraste con M5**: el adaptador construye la carrera de M5 mes a mes; el motor no se ajustó para coincidir. Los 37 casos coinciden dentro del 0,5 %; la diferencia sistemática (−0,05 % a −0,41 %) es el mes previo, que la ley excluye y M5 incluye.

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

## Fase 1B-1: datos estadísticos del sistema

- **Fuente principal**: portal de estadísticas de la Seguridad Social (ficheros xlsx de «Pensiones contributivas en vigor», «Altas y bajas», «Pensionistas» y «Afiliación»). Se rastrea con `ss_rastreo.py` y cada fichero se descarga con `ss_descarga_reg.py` (prefijos REG y MIN), `ss_evo.py`, `ss_afiliacion*.py` y `ss_pensionistas.py`, todos con modo `descargar` y `local`.
- **Tipo «tabla»**: CSV en `/data` más JSON hermano (título, descripción, columnas con unidad, fuente, `fetchedAt`, confianza y huella SHA-256 de cada fichero de origen). `validate:data` falla si falta el JSON, si la cabecera o el número de filas no coinciden o si falta procedencia.
- **Cobertura y límites**: pensiones en vigor por clase, régimen y sexo 2008-2025 (el histórico de la Seguridad Social empieza en 2008; 2000-2007 queda para descarga manual de MITES); altas y bajas anuales 2021-2025; mínimos 2022-2025; afiliados mensuales 2001-2026 y por sexo y edad 2021-2025; pensionistas 2006-2025.
- **Dato a 1 de diciembre**: las pensiones en vigor son las del 1 de diciembre de cada año, como las publica la fuente. El «último año completo» es 2025.
- **Afiliados medios anuales**: la fuente publica medias mensuales; la media anual es la media aritmética de los doce meses (dato derivado, confianza «media», marcado en las notas). También se publica el valor de diciembre (confianza alta).
- **Relación afiliados/pensionistas**: se publican cuatro definiciones (afiliados de diciembre o media anual, entre pensionistas o pensiones), con numerador y denominador literales. Son datos derivados (confianza «media»). La fuente no ofrece «cotizantes» distintos de «afiliados» en los ficheros descargados.
- **Totales de «ambos sexos»**: hasta 2023 el fichero da hombres, mujeres y «no consta»; «ambos» es su suma y la pensión media se pondera. En 2024-2025 la fuente da «ambos».
- **Regímenes agrario y de hogar**: existen hasta 2011 y la Ley 28/2011 los integró en el General en 2012; se conservan con su nombre.
- **PNC e IMSERSO**: bloqueado (HTTP 403): no se evade la protección; a descarga manual.
- **Segunda fuente**: no hay fuente independiente accesible (MITES no responde); se contrasta con otras publicaciones de la misma Seguridad Social (27 comprobaciones) y se dice así en el informe.
- **Ficheros brutos**: `data-raw/` contiene los xlsx de hasta 5 MB. Los ficheros anuales de afiliación (~4 MB cada uno) no se versionan: URL y huella en `data-raw/seg-social/AFI/origen-edad.json` y `docs/FUENTES.md`.
- **Rama**: se usa `feat/fase-1b-1-sistema` como pidió el encargo.

## Fase 1A-bis: reglas de evolución futura y de cálculo

- **Estructura numérica**: un fichero por magnitud en `data/parametros/` con un dato por año (o por versión) y unidad explícita. Base máxima: +1,2 pp sobre el porcentaje del art. 58.2, 2024-2050 (DT 38.ª); pensión máxima inicial: +0,115 pp, 2025-2050 (DT 39.ª); revalorización: doce meses de IPC hasta noviembre, suelo 0 %, sin techo (art. 58); mínimas: DA 53.ª (brecha reducida 20/30/50/100 % en 2024-2027, 50 % de esos porcentajes para el resto de mínimas, umbral 1,5 × unipersonal, 0,75 para PNC).
- **Verificación de las citas por código**: `reglas_futuras.py` falla si una cita literal no aparece en el texto de `data-raw/boe/`; los textos de la Fase 1A (TRLGSS consolidado y RDL 2/2023) se copiaron a `data-raw/boe/` (con hash en `origen.json`) para que el ETL sea reproducible.
- **«Acumulativos» (DT 39.ª)**: se interpreta como efecto compuesto año a año (cuantía del año anterior × (1 + (revalorización + 0,115 pp)/100)); lo corroboran los datos de 2025 y 2026 (test de coherencia). Alternativa descartada: sumar 0,115 más en cada año sucesivo.
- **Opción de 25 años**: la DT 4.ª.7 dice «con posterioridad al 31 de diciembre de 2025 y antes de 31 de diciembre de 2040»; literalmente el 31/12/2040 no está cubierto y 2041 aparece aparte. Se modela 2026-2040 completo (300 meses, divisor 350), 2041 (306/357), 2042 (312/364), 2043 (318/371) y sin opción desde 2044; la nota del dato lo explica. Los datos de `periodo-calculo-base-reguladora` y `divisor-base-reguladora` se verificaron contra la DT 5.ª y la DT 40.ª (test) y solo se retocó el texto de las notas.
- **Lagunas**: desde 2013 (art. 162.1 TRLGSS 1994 tras la Ley 27/2011 y la Ley 3/2012), 2016 (art. 209) y 2026 (art. 209.1.b) la regla es 48 meses al 100 % de la base mínima y el resto al 50 %; solo cambia la referencia de la base mínima en 2026. La regla de tres tramos del texto original de la Ley 27/2011 nunca llegó a aplicarse (la Ley 3/2012 la sustituyó antes del 01/01/2013). Hasta 2012 (versión leída de 2010), todas las lagunas al 100 %.
- **Jubilación demorada**: la fórmula del tanto alzado (800 y 880, exponente 1/1,65, divisor 500) estaba leída de imágenes del BOE. Se ha contrastado con el texto del PDF oficial de la Ley 21/2021 (art. 1.Ocho), donde sí es texto; se mantiene en los datos con esa evidencia y no se retira. Limitación: el consolidado del TRLGSS la tiene como imagen, así que una modificación posterior de la fórmula no se detectaría por texto.
- **Tests**: los tests genéricos de series de `data/parametros` admiten ahora ficheros por versión o con varias unidades (`POR_VERSION`, `VARIAS_UNIDADES`).

## Fase 1B-2: financiación

- **Comprobación previa (pensiones por edad)**: existe en el portal el fichero «Por edades» (ED) con número y pensión media por grupo de edad quinquenal, clase y sexo, pero **solo para el mes en curso** (octubre de 2026): los años anteriores no están archivados. Se añadió la foto como tabla (`pensiones-vigor-edad-clase-sexo`, en la rama de 1B-2 porque la de 1B-1 ya estaba fusionada) y el histórico queda en `PENDIENTE_DATOS.md`.
- **Presupuesto**: el fichero «Resumen Ejecución» de cada mes (hojas de ingresos, gastos y capítulo 4) acumulado a fin de trimestre es la fuente del presupuesto trimestral y, en T4, del anual (liquidado). Cobertura 2018-2026 en xlsx; antes, solo PDF (pendiente). Cada fichero trae el ejercicio y su comparativo del año anterior; se conserva el principal y solo se usa la comparativa si no existe el principal. Los rótulos son los de la fuente y cambian entre años.
- **Transferencias del Estado «desglosadas como las clasifica la fuente»**: por origen (del Estado y organismos autónomos, de la Seguridad Social, de comunidades, de empresas). El desglose por finalidad no existe en los ficheros descargados (pendiente); el complemento a mínimos de pensiones contributivas figura en gastos (tabla `gastos-cap4-no-contributivas`, según la clasificación de la fuente).
- **Préstamos**: se registran las autorizaciones de las leyes de PGE de 2021-2023 (importe máximo, diez años, sin interés), los pasivos financieros efectivos de la ejecución y el nuevo plazo de diez años desde 2026 de préstamos de 1992-1995 (RDL 3/2026). El tratamiento posterior de los préstamos recientes no consta en lo descargado.
- **Fondo de Reserva**: valores acumulados a 31 de diciembre de los informes a las Cortes de 2017, 2024 y 2025 (se contrastan donde se solapan); las cifras anuales son diferencias de las acumuladas (derivadas). La identificación de filas del PDF se hace por el primer valor de cada fila, porque los rótulos cambian entre informes.
- **MEI**: recaudación (derechos reconocidos de «MECANISMO DE EQUIDAD INTERGENERACIONAL» en cotizaciones, 2023-2025) y destino (art. 127 bis: nutre el Fondo de Reserva; dotaciones anuales del Fondo). La recaudación y la dotación anual no coinciden (razón 0,81-0,96); no se interpreta la diferencia.
- **Déficit**: catálogo de definiciones con su literal (`deficit-definiciones`): capacidad o necesidad de financiación SEC 2010 del subsector S.1314 (Eurostat; con la ruptura de 2002 por la sanidad) y saldos presupuestarios derivados de la ejecución (no financiero y total, marcados como derivados). No se elige ninguna como «la buena». «Gastos impropios», saldo contributivo ajustado y la capacidad de financiación de la IGAE/AIReF quedan sin datos por falta de acceso (descargas manuales).
- **CSV con comillas**: `validate:data` interpreta las comas entre comillas (los rótulos de la fuente pueden contenerlas).
- **Segunda fuente**: la liquidación del presupuesto (otra publicación) frente a la ejecución a diciembre, 2020-2024; no hay fuente independiente accesible (IGAE, AIReF y Hacienda).

## Fase 1B-3: demografía, macro y salarios

- **Descarga del INE**: `scripts/etl/ine.py` baja cada tabla de la API Tempus (`DATOS_TABLA/<id>?tip=AM`, que redirige a `jsCache`) y la guarda comprimida (`data-raw/ine/tablas/<id>.json.gz`, unos 5 MB en total) con URL, fecha y SHA-256 en `data-raw/ine/origen.json`; con `MODO=local` solo lee lo guardado. Las páginas de metodología de INEbase y los PDF de metodología (necesarios para citar definiciones y rupturas) están en `data-raw/ine/paginas/` y `data-raw/ine/metodologia/`.
- **Población por edad simple**: 1981-2026 de la tabla 59583 (ECP) y 1971-1980 de la 56934, porque la 59583 no trae el tramo abierto en esos años (solo 0-84); las dos coinciden en todas las fechas comunes. Solo se guarda el 1 de enero (el INE da también 1 de abril, julio y octubre). Columna `tramo_abierto`: 85 en 1971-1980 y 100 desde 1981. Ruptura de serie: el INE declara que desde el 1 de enero de 2021 la ECP (basada en registros) sustituye a las estimaciones intercensales, que se corrigen con cada censo.
- **Mortalidad**: se publican las dos ediciones del INE sin armonizar (1975-1990 con tramo abierto en 90 y 1991-2024 con tramo abierto en 100; columna `edicion`). Las tablas proyectadas (36659) vienen con mx y qx en tanto por uno aunque la etiqueta dice «por mil»: se multiplican por 1.000 (comprobado con l(x+1) = lx (1 − qx)) y se documenta en `docs/DISCREPANCIAS.md`. La serie de esperanza de vida a 65 años por sexo es la función ex publicada, no un cálculo propio.
- **Proyecciones**: la edición vigente es la «2026-2076» (publicada el 17/06/2026). Las tablas de Tempus conservan el código PROY24 y, en las de hipótesis, una fecha de modificación de 2024; se ha considerado de la edición vigente por el horizonte (2026-2075/2076) y porque la población de partida cuadra con la ECP de 1-1-2026 (diferencia de 6.277 personas, en DISCREPANCIAS). Solo el escenario principal y el total nacional.
- **Migraciones**: dos series del INE que no se empalman (Estadística de Migraciones 2008-2021 y EMCR 2021-2024); el saldo exterior de la EMCR por edad es inmigración menos emigración (derivado, marcado en el nombre del flujo) y coincide con el saldo publicado.
- **Eurostat y Comisión Europea**: contraste con `demo_pjan`, EUROPOP2025 (escenario de referencia BSL) y las tablas horizontales del Ageing Report 2024 (la edición vigente en esta fecha; ficha de España y anexo estadístico). El anexo (12 MB) no se versiona: URL y huella en `data-raw/ce-ageing/origen.json`. Del anexo se guardan las tablas II.1.1 a II.1.84 y la II.1.135; la unidad se deduce del título de cada tabla y se advierte en las notas.
- **PIB**: la Contabilidad Nacional anual no figura en Tempus (la operación 344 solo devuelve series ODS); se lee de los ficheros xlsx de la Revisión Estadística 2024 que publica INEbase (`pib95_25.xlsx`, `rem_empleo95_25.xlsx`), con series desde 1995. El volumen el INE lo da solo como índice encadenado (2020 = 100); el nivel en euros de 2020 y el deflactor son derivados (marcados, confianza «media»).
- **EPA**: se descargan las tablas trimestrales de activos, ocupados, parados y tasas por sexo y grupo de edad. Se publica también la **media anual de los cuatro trimestres** (dato derivado) y no el IV trimestre, porque elimina la estacionalidad y es la magnitud anual comparable con la Contabilidad Nacional; el IV trimestre se lee en la tabla trimestral. Las tasas anuales son la media de las trimestrales. Ruptura documentada por el INE en 2021-T1 (Reglamento (UE) 2019/1700).
- **Salario medio (B3)**: cuatro definiciones en `salario-medio-definiciones`, cada una con su literal en las notas, y sus razones con la base máxima en `salario-medio-razon-base-maxima`: EAES (ganancia bruta anual por asalariado, 2008-2024), ETCL (coste salarial por trabajador y mes; media de los cuatro trimestres, 2008-2025; también ×12), remuneración de asalariados de la Contabilidad Nacional entre asalariados por puestos, por puestos equivalentes a tiempo completo y por personas (1995-2025; incluye cotizaciones del empleador) y base media de cotización del Régimen General (2018-2025; media ponderada por cotizantes de las bases mensuales). Razón = definición anual ÷ (12 × base máxima mensual) o definición mensual ÷ base máxima mensual. No se elige ninguna.
- **Base media de cotización**: de la estadística «Bases de Cotización y Cotizantes» de la TGSS (fichero «CNAE25», hoja DATOS_EDAD): total = suma de tramos de edad (derivado). No se procesan los ficheros del RETA (bases «regularizadas») ni de Hogar: no son salario de asalariados del Régimen General.
- **C1 Alternativa 1**: afiliados a último día de diciembre de t (serie «Afiliados último día», total sistema) ÷ pensiones en vigor a 1 de enero de t+1 (ficheros REG de enero, 2009-2026). Por pensionista solo 2025 (enero de 2026), porque PTAS solo da meses del año en curso. Las pensiones de enero de 2026 coinciden entre REG y PTAS (comprobado en el script).
- **C2**: se procesan los BEL PEN-1, 2, 10 a 13 y 31, el PEN-1 de los anuarios, el total España del informe del IMSERSO y las cuatro cifras de la página de gastos impropios (confianza media o baja: son previsiones de 2020 de una fuente secundaria). Los ficheros de `data-raw/mites`, `imserso` y `ministerio` los aportó el autor y están versionados. PEN-31: el BEL da importes por encima de las normas en 2001-2011 con un porcentaje constante por año (hipótesis no verificada: actualización por desviación del IPC) y el BOE de 2012 parece tener un error de transcripción (13.327,00 frente a 12.327,00 del BEL); se mantiene el valor del BOE.
- **C3**: `docs/claims.json` pasa a tener `revisionActuarialPorDefecto: "no-requiere"` y el campo opcional `preguntaActuarial`; `revisionActuarial` se vuelve opcional y solo las 23 afirmaciones de `docs/REVISION_ACTUARIAL.md` lo llevan en «pendiente» (el esquema exige su pregunta). El generador es `scripts/etl/fuentes_claims.py` (diccionario `REVISION`).
- **Dependencia nueva solo para el entorno de ETL**: `xlrd` (lectura de los .xls del BEL), instalado con pip en esta sesión; no es dependencia de la web.
- **Rama**: se usó la rama de trabajo `claude/eloquent-einstein-6i526z` (creada desde `main`), no `feat/fase-1b-3-*`, porque el entorno la asigna.

## Fase 1C: comparativa internacional, afirmaciones circulantes y auditoría

- **OCDE por API SDMX**: el flujo `OECD.ELS.SPD,DSD_PAG@DF_PAG,1.0` de `sdmx.oecd.org` responde desde el entorno y contiene todos los flujos «Pensions at a Glance» (los de reposición, diseño, contexto, renta de mayores y riqueza de pensiones se comprobaron y son subconjuntos: mismas claves y valores). Se descarga entero (con etiquetas) y se guarda comprimido en `data-raw/oecd/` con huella; en `data/internacional/ocde-pag` se publican 13 áreas (los once países pedidos, la media OCDE `OECD_REP` y la UE-27 `EU27`) con el literal de cada código en `ocde-pag-codigos`. La edición vigente tiene datos de 2024 (parámetros de pensiones de 2024) y proyecciones hasta 2084.
- **Niveles de renta de la tasa de reposición**: la OCDE publica el 50 %, el 100 % y el 200 % del salario medio, no el 150 % que pedía el encargo; se publican los tres y el 150 % queda en PENDIENTE_DATOS (no se interpola). Hombres y mujeres tienen la misma cifra para España en la fuente. Se publican las opcionalidades «obligatoria» (M) y «obligatoria y voluntaria» (MV) tal como las da la OCDE.
- **Eurostat**: gasto en prestaciones de vejez y supervivencia (ESSPROS, `spr_exp_func`), riesgo de pobreza o exclusión de mayores de 65 (`ilc_peps01n`), tasa de empleo de 55 a 64 años (`lfsi_emp_a`) y duración de la vida laboral (`lfsi_dwl_a`) para diez países y la UE-27. Estados Unidos no está en Eurostat (solo en la OCDE). La edad media de salida del mercado laboral no se ofrece por la API probada; se usa la ELMEA de la OCDE.
- **Fichas de país (A3)**: el sitio de la OCDE devuelve 403 a las descargas automáticas del texto de los perfiles, así que la estructura de cada sistema sale de las fichas por país del Ageing Report 2024 de la Comisión Europea (equivalente oficial; nueve de los once países). Para cada país se guardan una o dos citas literales en inglés, comprobadas por el script contra el texto del PDF, y una etiqueta en español que la cita sustenta. Reino Unido y Estados Unidos quedan sin ficha (PENDIENTE_DATOS). Los PDF (1 MB cada uno) no se versionan: URL y huella en `data-raw/ce-ageing/fichas/origen.json`.
- **Contraste con España (A4)**: `data/internacional/contraste-espana` reúne series derivadas. Tres comparaciones, ninguna equiparada a otra: (1) tasa de reposición teórica de la OCDE frente a cociente empírico pensión media × 14 / salario medio con cuatro definiciones de salario y dos pensiones (altas y en vigor): se presentan lado a lado y se dice que el cociente propio no es una tasa de reposición; (2) edad de jubilación: la OCDE da 65 años para quien entra a los 22 con carrera completa y las reglas propias dan 66 años y 8 meses con menos de 459 meses cotizados: son compatibles (una carrera de los 22 a los 65 son 516 meses); (3) gasto sobre PIB con cuatro delimitaciones (OCDE, Eurostat, Ageing Report y propia, solo pensiones contributivas del Sistema). No se calcula una tasa de reposición propia con las reglas de data/parametros: exigiría supuestos de carrera y de crecimiento de salarios que el encargo no fija; queda como pregunta actuarial.
- **Catálogo de afirmaciones circulantes (B)**: nuevo tipo de fichero `mitos` (esquema `ArchivoMitos`) en `data/mitos/`. Doce afirmaciones, formuladas entre comillas angulares, con referencias a /data (el validador comprueba que cada referencia exista), definiciones alternativas con su literal, lo que no se puede concluir y una pregunta actuarial; todas «pendiente». Un test impide que los textos contengan veredictos («verdadero», «falso»…). Las afirmaciones se dan de alta también en `docs/claims.json` (estado «pendiente», porque no son hechos verificados sino enunciados circulantes) y en `docs/REVISION_ACTUARIAL.md`. Las definiciones que mencionan indicadores de Eurostat o la OCDE solo reproducen lo que dice el nombre de la medida descargada (los metadatos detallados quedan en PENDIENTE_DATOS).
- **Auditoría (C1)**: `scripts/etl/auditoria.py` genera `docs/AUDITORIA_DATOS.md` (matriz de cobertura, huecos, confianza baja, derivados, unidades, duplicados) y `docs/auditoria-datos.json`. Las claves de dimensión de las tablas se infieren de las columnas sin unidad más las de año, mes y edad. Los huecos de series de la OCDE son años sin publicar. Tres series «duplicadas» son duplicados explicables (misma magnitud de dos conjuntos de Eurostat; saldo migratorio derivado igual al publicado; razón mensual y anual del coste salarial).
- **Cruces entre carpetas (C2)**: el cociente entre el gasto en pensiones de la ejecución y número × pensión media × 14 (0,93 a 0,97) pasa a 1,00-1,02 al sumar el complemento a mínimos de las pensiones contributivas, que la ejecución registra en otra fila (tabla «gastos-cap4-no-contributivas»); el 2 % restante no se puede atribuir con los datos. En 2008-2011 la pensión media total de los ficheros REG es hasta 2,24 euros/mes superior a la media ponderada de las clases (sin explicación en los datos). Todo en `docs/DISCREPANCIAS.md`.
- **URLs (C3)**: muestra de 30 URLs de fuentes (mínimo 4 por carpeta, semilla fija) comprobadas con curl y verificación TLS activa: 28 responden; una recibe 429 y la del MITES falla por certificado desde este entorno. No se desactiva TLS.
- **Rama**: se usó `claude/fase-1c-internacional` (creada desde `main`).

## Fase 1B-4: triangulación de la mortalidad en edades altas

- **Defunciones (A)**: tabla 6547 del INE (Movimiento Natural de la Población, por lugar de residencia, sexo y edad simple, 1975-2024); es idéntica a la 58700 (por nacionalidad, 2009-2024, total de nacionalidades) y a la 48871. Para 2025 no hay defunciones definitivas: se usa solo el total estimado por el INE en la estadística semanal (EDeS, tabla 35177, acumulado de la última semana de 2025) como dato provisional. De Eurostat se bajan `demo_magec` (por edad al fallecer) y `demo_mager` (por año de nacimiento, «edad alcanzada»).
- **Convenciones de edad**: la población está por edad cumplida a 1 de enero; la cohorte con x años a 1 de enero tiene generación (año de nacimiento) Y − x − 1 y alcanza x + 1 años durante el año Y, de modo que sus defunciones del año son las de `demo_mager` con edad alcanzada x + 1. La tasa de supervivencia publicada es población(x + k, Y + k) / población(x, Y) sin ajustar por migración, como en el modelo del encargo.
- **Qué se compara**: (1) defunciones registradas por edad frente a las de las tablas, con dos construcciones (tasa central × población media, y qx × población a 1 de enero); (2) supervivencia de la cohorte publicada frente a Π(1 − qx), a la corrección de Lexis Π(1 − (qx + qx+1)/2) y a la deducida de las defunciones registradas de cada generación, en varias ventanas (1995-2005, 2000-2010, 2005-2010, 2010-2020, 2015-2020 y 2021-2024); (3) población de 85 o más y 90 o más años del INE frente a Eurostat y frente a las pensiones por edad de octubre de 2026 (población de 1 de julio de 2026); (4) población de 100 o más años (INE y Eurostat) y defunciones de 100 o más años frente a la tasa de la tabla.
- **Conclusión que permiten los datos**: el desfase que ve el modelo es, en su mayor parte, una convención de edades (qx aplicado a la población de 1 de enero), no un error de la población ni de las tablas: el factor entre las defunciones registradas de la cohorte y población × qx es de 1,04 a 1,08 y coincide con el de Lexis. El residuo después de ese ajuste es pequeño (≤ 1 % en mujeres) salvo en hombres de 85 años en 2010-2020 (alrededor de un 3 a 5 % menos de efectivos en la población publicada que en la tabla y que en las defunciones registradas), que no se puede atribuir con los datos a la población, la migración o el ajuste intercensal de 2012-2020. No se emiten más conclusiones.
- **Pensionistas**: la comparación de 242.000 frente a 269.000 se reproduce de forma aproximada (247.621 con qx de 2024 y la distribución por edad de octubre de 2026): con la corrección de Lexis son 263.776. Es una aproximación (pensiones no son pensionistas, años distintos, solo cinco grupos de edad); la Seguridad Social no desglosa las causas de baja.
- **Metodología del INE (F)**: las citas literales están en `data/demografia/triangulacion-mortalidad` (con el número de página del PDF omitido). La fuente dice que las tablas publicadas en noviembre de 2023 se calcularon sobre la base poblacional de las nuevas intercensales (2012-2020 recalculadas en 2023 con el censo de 2021) y los censos anuales; no dice qué años de la serie 1991-2024 cambiaron.
- **OCDE (H)**: el flujo SDMX solo dice que los indicadores se calculan para quien entra en el mercado laboral a los 22 años; la edad de jubilación considerada para España es 65 (medidas CRPLF22 y FRPLF22). El crecimiento real de los salarios y la inflación no están en los metadatos accesibles (PENDIENTE_DATOS).
- **Rama**: `claude/fase-1b-4-mortalidad`.

## OCDE: informe «Pensions at a Glance 2025» en PDF (modo local)

- **Fuente**: `data-raw/oecd/Pensions at a Glance 2025 OCDE.pdf` (aportado a mano por el autor; 248 páginas). `source.url` es el DOI que figura en los metadatos del propio PDF (<https://doi.org/10.1787/e40274c1-en>), no la URL del sitio de la OCDE (HTTP 403 desde el entorno). `fetchedAt` es 2026-11-12, la fecha en que el PDF entró en el repositorio (no consta la fecha de descarga del autor). Huella SHA-256 y fecha en `data-raw/oecd/origen.json`. Ninguna cifra procede de la memoria: cada cita se busca en el texto del PDF (`pdftotext`) y el script se detiene si no aparece; la página que se anota es la del informe (la del PDF menos dos).
- **El PDF no contiene los «Country Profiles»**: sus tablas 3.1 a 3.6 y 4.3 remiten a la versión en línea (oe.cd/pag). Lectura razonable de «completa las fichas de país con citas literales del documento»: la ficha de cada país reúne **las frases del propio informe** sobre ese país (prosa, notas de tabla y filas de tabla), no una descripción completa del sistema. Así, Reino Unido tiene 5 elementos, Estados Unidos 8 y España 8 (más el de la Comisión Europea que ya había). Los perfiles quedan en PENDIENTE_DATOS y DESCARGAS_MANUALES.
- **Filas de tabla**: las marcas «✓» del texto extraído no indican a qué columna pertenecen. Para la tabla 3.1 (estructura) y la 4.3 (tratamiento fiscal del pensionista) la cita es la fila tal como sale del PDF y la etiqueta en español recoge la columna **comprobada sobre la imagen de la página**; esos elementos llevan `confidence: media` y la nota lo dice. Las cifras de las tablas 4.1 y 4.4 (tasas bruta y neta) no se vuelven a copiar: ya están en `ocde-pag` por la API SDMX y coinciden con las del PDF para España, Reino Unido y Estados Unidos (se comprobó 0,5, 1 y 2 veces el salario medio).
- **Supuestos de la tasa de reposición** (`ocde-supuestos-reposicion`, elementos `ocde-pag-2025-*`): escenario base (inflación 2 %, crecimiento real de los salarios 1,25 %, nominal 3,275 %, tipo de descuento real 1,5 %, rentabilidad real de los planes FDC 2,5 %, factor de conversión 90 %), escenario alternativo de la tabla 5.3 (inflación 1 %, salarios 0,75 %, descuento 1 %, rentabilidad 2 %, PIB −0,5 puntos) con su efecto en la tasa bruta de España, Reino Unido y Estados Unidos (tabla 5.4), carrera (entrada a los 22 años y jubilación a la edad normal del país; la duración de 43, 46 y 45 años para 65, 68 y 67 años es aritmética de esa regla y así consta en la nota), salario relativo constante, mortalidad de Naciones Unidas, y la regla de impuestos y cotizaciones de la tasa neta (política constante: «valores» indexados al salario medio, «tipos» sin cambio). Los **impuestos y cotizaciones concretos de los pensionistas** de cada país no están en el informe; solo la tabla 4.3 cualitativa (registrada con la lectura de columnas) y la frase que remite a los perfiles.
- **Definiciones registradas**: edad normal de jubilación de la OCDE (acceso a todos los componentes obligatorios en 2024 con entrada a los 22 y carrera ininterrumpida) y edad efectiva de salida del mercado laboral (ELMEA). La edad de 65 años de España en `ocde-espana` es la primera, no la edad ordinaria de la normativa española (ver DISCREPANCIAS).
- **Neutralidad**: no se reproduce ninguna valoración de la OCDE ni del FMI. De la frase de la OCDE sobre España y AIReF solo se recoge la proyección (gasto del 16,1 % del PIB en 2050), atribuida a AIReF; la frase del FMI que la sigue no se usa. La caída de la tasa bruta de España con el escenario alternativo se presenta como sensibilidad a los supuestos, no como error del modelo.
- **Generación**: `scripts/etl/ocde_pdf.py` (lectura y comprobación del PDF), `paises_fichas.py` y `ocde_supuestos.py` (este último, con `MODO=local`). `fuentes_claims.py` genera 21 afirmaciones nuevas de fichas y 32 de supuestos (`ocde-pag-2025-*`), con cinco preguntas actuariales nuevas; el límite superior de afirmaciones pendientes del test pasa de 45 a 50.
- **Rama**: `feat/ocde-perfiles-supuestos` (desde `main`).
