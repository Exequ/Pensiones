# Estado de la Fase 5-C

Rama `feat/fase-5c-sistemas-tipos`, creada desde `origin/main`. Hecho: el paso 0 (nota en «Hucha»), el inventario y las dos páginas, «Otros sistemas» y «Tipos de pensión», sin tocar el motor, «Tu pensión» ni «Proyecciones». Inventario en `docs/INVENTARIO_5C.md`, decisiones en `docs/DECISIONES.md` («Fase 5-C»), huecos en `docs/PENDIENTE_DATOS.md` («Fase 5-C»). No se ha descargado ningún dato nuevo.

## Qué se muestra y de qué ficheros

**Paso 0, Hucha.** Nota `#origen-clasificacion`: la ejecución clasifica las transferencias por origen y el Tribunal de Cuentas por finalidad; la causa completa de la diferencia no está verificada. Se retira la frase que atribuía una causa («porque cada fuente delimita las partidas de un modo»).

**«Otros sistemas»** (`src/modules/otros-sistemas`; datos: `internacional/ocde-pag`, `ocde-pag-codigos`, `eurostat-indicadores`, `paises-sistemas`, `ocde-supuestos-reposicion`, `contraste-espana`). Selector de países común a toda la página.

1. Gasto público en pensiones sobre el PIB, barras ordenadas, OCDE (`PEP`) y Eurostat (`gasto-old-srv`) lado a lado, con selector de año.
2. Tabla de España con tres delimitaciones del gasto (OCDE, Eurostat y propia).
3. Evolución del gasto: líneas con etiquetas directas, OCDE y Eurostat lado a lado.
4. Edad normal de jubilación actual y futura (`CRPLF22`, `FRPLF22`), lado a lado, con selector de sexo.
5. Edad efectiva de salida del mercado laboral (`ELMEA`), 1970 a 2024.
6. Tabla de España: edad de la OCDE y edad de la normativa propia.
7. Tasa de reposición bruta y neta (`GPRR`, `NPRR`) lado a lado; selectores de nivel de salario, sexo y planes obligatorios o voluntarios.
8. Tablas: supuestos de la OCDE, escenario base y alternativo, sensibilidad (España, Reino Unido y Estados Unidos) y España frente a los cocientes empíricos propios.
9. Estructura de los sistemas (rasgos y citas literales) y glosario conceptual, para los países elegidos.

**«Tipos de pensión»** (`src/modules/tipos-de-pension`; datos: `normativa/prestaciones`, `parametros/pension-minima-*`, `pension-maxima`, `pnc-importe-anual`, `pnc-reglas`, `supervivencia-reglas`, `sistema/pensiones-vigor-numero`, `pensiones-vigor-pension-media`, `imserso-pnc-evolucion`, `imserso-pnc-perfil-2025`). Cuadro resumen de número y pensión media, y siete fichas (jubilación, incapacidad permanente, viudedad, orfandad, en favor de familiares, PNC de jubilación y de invalidez) con requisitos y artículo, cálculo según la norma, cuantías mínimas y máximas de 2026, número de pensiones y pensión media. Enlace a «Tu pensión» solo en jubilación e incapacidad permanente.

## Definiciones y perímetros

Se muestran las dos medidas de cada concepto sin elegir una (gasto OCDE y Eurostat; tasa bruta y neta; edad actual y futura; edad normal y efectiva) y los supuestos de la OCDE. El **perímetro del gasto de la OCDE y de Eurostat consta como «no verificado en las fuentes descargadas»**. Las dos cifras de pensionistas de las PNC del IMSERSO (nómina y perfil) se muestran y se avisa de que no coinciden.

## Qué no se pudo

Ver `docs/PENDIENTE_DATOS.md`, «Fase 5-C»: perímetros del gasto, tasas de reposición en otros niveles o carreras, impuestos de los pensionistas, estructura detallada de Reino Unido y Estados Unidos, glosario sin fuente descargada, proyecciones de la OCDE (no mostradas), complementos, Clases Pasivas, número por grado o modalidad, cuantía de favor de familiares y requisitos detallados de las modalidades de jubilación.

## Pruebas

- Unitarias: `src/engine/comparativa-internacional.test.ts` (ordenar, seleccionar, diferencias con España, separar etiquetas, casos hechos a mano) y `src/modules/tipos-de-pension/cuantias.test.ts`.
- Componentes: `src/modules/otros-sistemas/otros-sistemas.test.tsx` (cada gráfico con imagen, tabla, fuente y «Cómo leerlo»; selector de países, año, nivel y sexo) y `src/modules/tipos-de-pension/tipos.test.tsx` (cifras contrastadas con `/data`).
- Procedencia y cifras: `scripts/sistemas-tipos-5c.test.ts` (fuente, fecha y confianza de cada fichero; los módulos de datos importan exactamente lo que declaran; sin dígitos en los textos).
- Neutralidad: `scripts/neutralidad-5c.test.ts` y `src/modules/historico/neutralidad.test.tsx` (ahora recorre las dos páginas nuevas).
- Playwright: `e2e/sistemas-tipos.spec.ts` (consola, peticiones externas, selector, móvil con las tablas abiertas, 44 px, axe).

## Tamaño de los trozos de las páginas nuevas

«Otros sistemas»: 547,8 kB (77,7 kB comprimido; incluye los CSV de la OCDE y Eurostat). «Tipos de pensión»: 131,0 kB (30,7 kB comprimido).

## Batería local

`npm run lint`, `npx tsc -b --force`, `npm test` (2.086 pruebas) y `npm run build` pasan; `npm run test:e2e`: 332 pruebas pasan.
