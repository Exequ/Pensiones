# Estado de la fase R10 «Otros sistemas»

Rama `feat/r10-otros-sistemas`, creada desde `origin/main` (`c92643c845587db6552e3527efe1f50e2908614a`, PR [Exequ/Pensiones#58](https://github.com/Exequ/Pensiones/pull/58), fase R8; «CI» y «Despliegue en GitHub Pages» de ese commit en verde). Inventario: `docs/INVENTARIO_R10_OTROS.md`. Decisiones: `docs/DECISIONES.md` («Fase R10») y `docs/DECISIONES_ACTUARIALES.md` («Fase R10»). Versión acotada a los datos del repositorio: no toca «Reformas», «Mitos y realidades», «Financiación y déficit», «La hucha», «Proyecciones», `modelos/`, `docs/modelos/`, `data-raw/`, `docs/DISCREPANCIAS.md` ni ningún fichero de `/data`; sin interpretaciones, sin descargas, sin ampliar el lenguaje de fórmulas y sin dependencias nuevas.

## Qué se hizo

- **Citas, literales y ubicaciones a «Fuentes»**: los nombres de las medidas en la fuente (el literal de ELMEA, «Public expenditure on pensions», los de las edades y los de las tasas de reposición) y el código de la base de datos de Eurostat salen de las descripciones y las notas de los gráficos y van a la cita y la ubicación de su `Dato` (`datoMedida` y `datoGasto`, en `datos-sistemas.ts`, sin cambiar los ficheros de datos). Las citas literales en inglés de las fichas por país y su ubicación salen del cuerpo y van a «Fuentes» de cada país, con la etiqueta en español como «Se refiere a». La ubicación («tabla …, panel …») que encabezaba tres etiquetas se quita de la frase que se ve (`rasgos.ts`). Los supuestos y el escenario alternativo llevan «Se refiere a». Los títulos de las series de los cocientes de España («× … pagas», códigos de salario) se sustituyen por etiquetas con el nombre de cada definición de salario.
- **Definiciones del módulo**: doce nuevas (grupo `comparacion-internacional`): edad normal de jubilación (OCDE), edad efectiva de salida del mercado laboral (OCDE, ELMEA), tasa de reposición teórica bruta y neta (OCDE), reparto, capitalización, cuentas nocionales, pilares, los dos ejes de clasificación y los tres cálculos propios con fórmula. Se reutilizan sin cambios las de R7 (`gasto-pensiones-ocde`, `gasto-pensiones-esspros-vejez-supervivientes`, `gasto-pensiones-contributivas-sin-complemento`, `gasto-sobre-pib`, `gasto-frente-a-financiacion`). Sustituyen los duplicados que R7 dejó para esta página (`SeccionGasto`, `SeccionEdad` con el literal de ELMEA en el cuerpo) y las notas «Definición de la OCDE: …» y el glosario.
- **Fórmulas** con `Formula` y leyenda, sin cifras: diferencia con España, cociente entre pensión media y salario medio, y carrera ininterrumpida hasta la edad menor de la normativa (la del gasto sobre el PIB ya estaba). Caben todas en el lenguaje existente.
- **Criterios actuariales de la tanda B (19-11-2026)** (detalle en `docs/DECISIONES_ACTUARIALES.md`): verificados los tres: las medidas de ESSPROS, de la OCDE y del Ageing Report son distintas y no se mezclan (cada gráfico toma una sola fuente; la página no usa el Ageing Report; el apartado del gasto se titula «según cada fuente» y su apertura deja de decir que miden lo mismo); el gasto en pensiones y la financiación son cosas distintas (definición ya en el módulo, ahora mostrada); el perímetro de cada fuente no se afirma (las definiciones declaran «sin detalle en las fuentes»).
- **Lo corregido por verificación**: «tres edades que suelen llamarse…», «la diferencia depende de las vías de salida» (ELMEA), «primera pensión», «según la fiscalidad de cada país», «pensiones mínimas y topes» y «catorce pagas» salen o se sustituyen por lo que consta; «La OCDE publica la tasa bruta con el escenario alternativo solo para tres países» pasa a «Los datos de esta web recogen…»; el glosario deja de definir los tres conceptos con palabras que ninguna fuente respalda y pasa a decir lo que las fuentes dicen de cada término.
- **Afirmaciones**: diecinueve nuevas en `docs/claims-web.json` (a mano; dieciocho verificadas y una pendiente, `web-def-glosario-conceptos-generales`); `docs/claims.json` regenerado por su generador, que solo las añade. `docs/PENDIENTE_DATOS.md` recoge los huecos.
- **Pruebas**: `src/modules/otros-sistemas/r10.test.tsx` (20 pruebas: ninguna ubicación, código ni nombre de fichero en el cuerpo; ninguna cita literal, tampoco las inglesas, ni el literal de ELMEA en el cuerpo; el literal y la ubicación en «Fuentes» de cada gráfico de países y de cada país; cada definición una vez con su ancla; fuente de cada referencia; ninguna serie mezcla ESSPROS, OCDE y Ageing Report; las cuatro fórmulas reproducen la tabla o las series), `e2e/otros-sistemas-r10.spec.ts` (5 pruebas, 1360 y 390 px, con axe). Actualizadas sin quitar comprobaciones: `otros-sistemas.test.tsx`, `scripts/definiciones.test.ts`, `scripts/verificacion-ajustes-3.test.ts` (una pendiente más) y `e2e/sistemas-tipos.spec.ts` (el encabezado del apartado del gasto).

## Qué quedó fuera y por qué

- **Detalle de Suecia, Italia, Estados Unidos y Canadá, tabla de los cinco principios de diseño, lista de países con ajuste automático y comparación de fondos de reserva**: van a R10b, con las referencias y descargas que aporte Sergio (por encargo; no se descarga nada).
- **Perímetro de ESSPROS, de la OCDE y de la «Table 9» del Ageing Report**: el manual de ESSPROS y la tabla no están en el repositorio; no se afirma (pendiente de R10b).
- **Definición general de reparto, capitalización y cuentas nocionales**: ninguna fuente del repositorio los define; no se escribe (afirmación pendiente).
- **Escenario alternativo menos escenario base**: resta de dos cifras publicadas; conserva su columna sin fórmula propia.
- **«Reformas», «Mitos y realidades», «Financiación y déficit», «La hucha» y «Proyecciones»**: no se tocan. Los duplicados de definiciones de «Mitos y realidades» y «Proyecciones» siguen para R11 y para la fase de proyecciones.

## Qué necesita R10b (descargas y referencias concretas)

1. **Eurostat, manual de ESSPROS** (clasificación de las funciones «vejez» y «supervivientes» y su perímetro): para poder escribir `perimetro.incluye` y `noIncluye` en `gasto-pensiones-esspros-vejez-supervivientes`. Eurostat: https://ec.europa.eu/eurostat/databrowser/view/spr_exp_func/default/table?lang=en (la base ya está descargada; faltan los metadatos de perímetro).
2. **Ageing Report 2024, volumen completo con la «Table 9»** y la definición de la medida del gasto en pensiones públicas (https://economy-finance.ec.europa.eu/publications/2024-ageing-report-economic-and-budgetary-projections-eu-member-states-2022-2070_en): para mostrar `gasto-pensiones-ageing-report` en esta página sin mezclarlo.
3. **«Country Profiles» de «Pensions at a Glance 2025»** de España, Reino Unido y Estados Unidos (http://oe.cd/pag): impuestos y cotizaciones de las personas pensionistas, para explicar la diferencia entre la tasa bruta y la neta.
4. **Fichas por país del Ageing Report 2024 y de «Pensions at a Glance 2025»** de Suecia, Italia, Estados Unidos y Canadá (las de Suecia, Italia y Estados Unidos ya están en `paises-sistemas` con una a tres frases; faltan las secciones detalladas y las de Canadá), más la fuente de la tabla de los cinco principios de diseño, la lista de países con ajuste automático y los datos de fondos de reserva de otros países (referencias que aporta Sergio).
5. **Una fuente que defina reparto, capitalización y cuentas nocionales** (OCDE, Comisión Europea o Banco Mundial): para escribir las definiciones generales y cerrar `web-def-glosario-conceptos-generales`.
6. **Documento de Boulhol y Keese (2021)** al que remite la OCDE para el método de la edad efectiva de salida: para completar el perímetro de ELMEA.

## Pendientes para Sergio

- **Actuariales**: (1) la pregunta de `web-def-glosario-conceptos-generales` (¿se acepta que la web defina los tres términos solo con el uso que hacen las fuentes, o se aporta una fuente que los defina?); (2) confirmar la redacción de las doce definiciones nuevas, en particular el título del apartado del gasto («según cada fuente»), «se refiere a la salida de la población activa» y la leyenda de las tres fórmulas; (3) confirmar que el criterio 1 de la tanda B se acepta verificado como criterio de presentación y no como comparación numérica entre perímetros; (4) siguen pendientes los de R7 y R8 (`web-def-sec-sin-clases-pasivas`, `web-def-mutuas-cada-anio`).
- **Descargas manuales**: las seis de la lista de R10b.
- **Modelos**: ninguno.
- **Otros**: decidir en qué fase se sustituyen los duplicados que quedan de «Mitos y realidades» y «Proyecciones».

## Batería local

Se completa tras el último cambio (véase el informe final de la sesión y el PR).

## CI y despliegue

Constan en el informe final de la sesión y en el PR (como en R3 a R8).
