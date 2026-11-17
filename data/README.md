# Datos versionados

Cada fichero JSON de esta carpeta sigue el esquema `ArchivoDatos` de
[`src/engine/esquema-datos.ts`](../src/engine/esquema-datos.ts) y se comprueba con
`npm run validate:data`, que falla si algún valor numérico no tiene una fuente con URL y
fecha de descarga (`fetchedAt`).

| Carpeta          | Contenido                                                            |
| ---------------- | -------------------------------------------------------------------- |
| `normativa/`     | Parámetros fijados por ley o reglamento (con referencia al BOE).     |
| `parametros/`    | Parámetros anuales del sistema: bases, topes, revalorización…        |
| `sistema/`       | Estadísticas del sistema: pensiones, gasto, ingresos, afiliación.    |
| `demografia/`    | Población, mortalidad, fecundidad, migraciones y proyecciones.       |
| `macro/`         | PIB, mercado de trabajo, salarios y tipos de interés.                |
| `internacional/` | Comparativa internacional (OCDE y Eurostat) y contraste de España.   |
| `mitos/`         | Catálogo de afirmaciones circulantes, con datos y definiciones.      |
| `ejemplos/`      | Personas-ejemplo ilustrativas del simulador (elaboración propia).    |
| `proyecciones/`  | Salidas de los modelos propios M1, M2 y M3 (proyecciones de modelo). |

Los ejemplos de los tests están en `scripts/fixtures/` y **no** deben copiarse aquí.

## Contenido (Fase 1A)

| Fichero (carpeta `parametros/`)                                                                                                                                                                   | Contenido                                                                                                                               | Periodo                          | Unidad               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------- |
| `edad-ordinaria-jubilacion`, `carencia-jubilacion`, `periodo-calculo-base-reguladora`, `divisor-base-reguladora`, `escala-porcentajes-jubilacion`, `carrera-jubilacion-65`, `cotizacion-para-100` | Reglas de la jubilación contributiva                                                                                                    | 2000-2040 aprox.                 | meses / reglas       |
| `ipc-*`                                                                                                                                                                                           | IPC del INE (índice medio, variación media y de diciembre; `ipc-indice-mensual`: índice mensual de 1992 a 2026, id `AAAA-MM`, Fase 2-D) | 2002-2025 (diciembre desde 2000) | índice / %           |
| `base-maxima-rg`, `base-minima-rg`                                                                                                                                                                | Bases de cotización del Régimen General (mínima: grupos 4-7)                                                                            | 2000-2026                        | euros/mes            |
| `tipo-cc-empresa`, `tipo-cc-trabajador`                                                                                                                                                           | Tipo de contingencias comunes                                                                                                           | 2000-2026                        | %                    |
| `mei-tipo-*`                                                                                                                                                                                      | Mecanismo de Equidad Intergeneracional (total, empresa y trabajador)                                                                    | 2023-2029                        | puntos porcentuales  |
| `cuota-solidaridad-tipos`                                                                                                                                                                         | Cotización adicional de solidaridad, por tramo                                                                                          | 2025-2026                        | %                    |
| `revalorizacion-general`                                                                                                                                                                          | Revalorización anual de las pensiones                                                                                                   | 2000-2026                        | %                    |
| `pension-maxima`                                                                                                                                                                                  | Límite máximo de percepción                                                                                                             | 2000-2026                        | euros/mes (14 pagas) |
| `pension-minima-{jubilacion,incapacidad,viudedad,orfandad-familiares}`                                                                                                                            | Cuantías mínimas por clase y situación familiar (id: `año-clase-situación`)                                                             | 2001-2026                        | euros/año            |
| `limite-ingresos-complementos-minimos`                                                                                                                                                            | Límite de ingresos de los complementos por mínimos                                                                                      | 2012-2026                        | euros/año            |
| `pnc-importe-anual`                                                                                                                                                                               | Pensión no contributiva                                                                                                                 | 2001-2026                        | euros/año            |
| `complemento-brecha-genero`                                                                                                                                                                       | Complemento por hijo                                                                                                                    | 2023-2026                        | euros/mes            |
| `smi-diario`, `smi-mensual`                                                                                                                                                                       | Salario mínimo interprofesional                                                                                                         | 2000-2026                        | euros/día, euros/mes |
| `iprem-*`                                                                                                                                                                                         | IPREM                                                                                                                                   | 2004-2023 (con huecos)           | euros/día, mes, año  |

`normativa/cronologia.json` (19 normas, 1985-2026, con antes/después/transición) y `normativa/prestaciones.json` (16 prestaciones: a quién cubre, requisitos, fórmula, límites, duración y compatibilidades, con artículo del TRLGSS).

Los huecos y lo que no se pudo descargar están en [`docs/PENDIENTE_DATOS.md`](../docs/PENDIENTE_DATOS.md). Toda la extracción de tablas la hacen los scripts de [`scripts/etl/`](../scripts/etl) (Python, con `python3 -I`) a partir de los documentos descargados; salvo el orden indicado en la cabecera de cada script (por ejemplo, `cotizacion_2013_2026.py` antes que `base_minima_2020_2021.py`), el orden de ejecución no importa; cada dato lleva la cita literal (`quote`) y su localización. `docs/INFORME_VERIFICACION.md` y `docs/DISCREPANCIAS.md` recogen el contraste con segundas fuentes.

## Contenido (Fase 1A-bis: reglas de evolución futura y de cálculo, en `parametros/`)

| Fichero                                      | Contenido                                                                                          | Periodo                          | Unidad                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------- |
| `base-maxima-incremento-futuro`              | Puntos que se suman al porcentaje de revalorización para fijar la base máxima (DT 38.ª)            | 2024-2050                        | puntos porcentuales       |
| `pension-maxima-incremento-futuro`           | Puntos que se suman al porcentaje de revalorización para fijar la pensión máxima inicial (DT 39.ª) | 2025-2050                        | puntos porcentuales       |
| `revalorizacion-regla`                       | Regla del art. 58: meses de IPC, último mes, suelo, indicadores                                    | desde 2024                       | meses; %; indicador       |
| `pension-minima-regla`                       | DA 53.ª: brecha reducida por año, multiplicadores del umbral y factor del resto de mínimas         | 2024-2027                        | %; veces                  |
| `opcion-25-anos-{ventana,divisor,aplicable}` | Opción de 25 años (DT 4.ª.7): ventana, divisor y disponibilidad por año del hecho causante         | 2026-2044                        | meses; divisor; indicador |
| `lagunas-integracion`                        | Integración de lagunas: meses y porcentaje de la base mínima por versión (id `AAAA-parámetro`)     | versiones 2010, 2013, 2016, 2026 | meses; %                  |
| `actualizacion-bases`                        | Actualización de bases: meses nominales e índice de referencia por versión                         | versiones 2010, 2013, 2016, 2026 | meses                     |

En los ficheros por versión, `period` es el año desde el que rige y el `id` empieza por ese año. Cada dato lleva cita literal verificada por código y, cuando existe, contraste con una segunda norma (`crossCheck`). Los textos de partida están en `data-raw/boe/` con su hash en `origen.json`.

## Contenido (Fase 1B-2: financiación, en `sistema/` y `parametros/`)

| Fichero                                                                         | Contenido                                                                                                                                                  | Periodo           | Unidad                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------ |
| `pensiones-vigor-edad-clase-sexo` (tabla)                                       | Pensiones en vigor por grupo de edad, clase y sexo (foto de un mes)                                                                                        | octubre de 2026   | pensiones; euros/mes           |
| `presupuesto-ss-ejecucion` (tabla)                                              | Ejecución acumulada a fin de trimestre del Sistema de la Seguridad Social: ingresos y gastos por clasificación económica, capítulo 4 y pensiones por clase | 2018-T1 a 2026-T3 | millones de euros              |
| `fondo-reserva-anual` (tabla), `fondo-reserva-series`                           | Valor, dotaciones (excedentes y MEI), rendimientos y disposiciones del Fondo de Reserva                                                                    | 2009-2025         | millones de euros              |
| `deficit-presupuestario-seguridad-social`                                       | Derechos y obligaciones por operaciones no financieras y totales, saldos derivados, pasivos financieros y transferencias del Estado                        | 2017-2025         | millones de euros              |
| `deficit-sec-fondos-seguridad-social`                                           | Capacidad o necesidad de financiación SEC 2010, ingresos y gastos de los fondos de la Seguridad Social (Eurostat)                                          | 2000-2025         | millones de euros; % del PIB   |
| `deficit-definiciones`                                                          | Definiciones con su literal y la fuente que las usa (no se elige ninguna)                                                                                  | —                 | texto                          |
| `parametros/fondo-reserva-desembolso-maximo`                                    | Límite del desembolso anual del Fondo (art. 121.2 TRLGSS)                                                                                                  | 2033-2053         | % del PIB                      |
| `parametros/mei-destino`                                                        | Destino de la cotización del MEI (art. 127 bis TRLGSS)                                                                                                     | desde 2023        | indicador                      |
| `parametros/prestamos-estado-seguridad-social`, `prestamos-plazo-ampliado-2026` | Autorizaciones de préstamos del Estado (PGE 2021-2023) y nuevo plazo de préstamos antiguos (RDL 3/2026)                                                    | 2021-2026         | millones de euros; euros; años |

La ejecución del presupuesto usa los rótulos de la fuente, que cambian entre años; «T4» es el ejercicio completo. Las cifras derivadas (saldos, flujos anuales del Fondo) están marcadas como tales en sus notas. Los CSV pueden llevar celdas entre comillas con comas.

## Contenido (Fase 5-A2: la hucha frente a las transferencias del Estado)

| Fichero                                             | Qué contiene                                                                                                                                                                                                                                                                                                              | Periodo           | Unidad                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------ |
| `sistema/deuda-pde-seguridad-social`                | Deuda PDE de las Administraciones de Seguridad Social (Banco de España, serie `DTNPDE2010_P00000_PS_ASG`): saldo trimestral y a fin de año. Script `scripts/etl/bde_deuda_ss.py`                                                                                                                                          | 1994-T4 a 2026-T2 | millones de euros        |
| `sistema/prestamos-transferencias-tribunal-cuentas` | Cifras y citas del Tribunal de Cuentas (BOE-A-2025-25090): endeudamiento frente al Estado a 31-12-2022 y su composición, transferencias por finalidad, aportaciones no contributivas, recomendaciones. Script `scripts/etl/tc_cge2022_seguridad_social.py`                                                                | 1991-2025         | millones de euros; citas |
| `normativa/trlgss-financiacion`                     | Frases literales del artículo 109 del TRLGSS sobre las aportaciones del Estado y la naturaleza de las prestaciones. Script `scripts/etl/trlgss_financiacion.py`                                                                                                                                                           | 2023              | citas                    |
| `normativa/revalorizacion-2011-regla`               | Regla de revalorización de 2011 del RDL 8/2010 y del RD 1794/2010: suspensión, 1 % de las excluidas, cuantía mantenida del resto y pago único ligado a 2010, con cita literal, artículo, página del BOE y huella. No cubre 2012 ni la paga por desviación de 2001 a 2009. Script `scripts/etl/boe_revalorizacion_2011.py` | 2011              | %, indicador             |

## Contenido (Fase 5-A3: datos de los PDF para la hucha)

| Fichero                                                               | Qué contiene                                                                                                                                                                                                                                                                                                                                | Periodo    | Unidad                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------- |
| `sistema/liquidacion-ss-extraccion` (tabla `extraccion-pdf`)          | Cada cifra de las cuatro tablas de los siete PDF de las liquidaciones del presupuesto de la Seguridad Social (gastos, capítulo 4 de gastos, ingresos, capítulos 1 y 4 de ingresos), con PDF, huella SHA-256, página, fila y columna, y el resultado de las validaciones. Script `scripts/etl/ssf_liquidacion_pdf.py`                        | 2010-2016  | millones de euros            |
| `sistema/liquidacion-ss-series`                                       | Series anuales de las partidas que superan las validaciones (transferencias por origen, cotizaciones, pasivos y activos financieros, pensiones, complemento a mínimos…) y la serie derivada «pensiones con complemento a mínimos». La referencia de cada punto está en su nota. Son series de la liquidación: no se unen a la ejecución     | 2010-2016  | millones de euros            |
| `sistema/liquidacion-ss-2025-extraccion` (tabla `extraccion-pdf`)     | Cada cifra de las cuatro tablas del PDF de la liquidación de 2025 (gastos, capítulo 4 de gastos, ingresos, capítulos 1 y 4 de ingresos), con PDF, huella SHA-256, página, fila y columna. Sin las columnas de incremento. Script `scripts/etl/ssf_liquidacion_2025.py`                                                                      | 2024-2025  | millones de euros            |
| `sistema/liquidacion-ss-2025-contraste` (tabla)                       | Cada partida de la liquidación de 2025 (ejercicio 2025, comparativa de 2024 y presupuesto o previsión) frente a la ejecución al cierre de diciembre, con la diferencia y la referencia de ambas. La definición es la de la ejecución: no se une a `liquidacion-ss-series`                                                                   | 2024-2025  | millones de euros            |
| `sistema/complementos-genero-territorio` (tabla `extraccion-pdf`)     | Pensiones en vigor a 1-10-2026 con complemento por brecha de género y por maternidad: número, importe medio y desglose por hijos, por sexo, comunidad y provincia (seis tablas de 63 filas). Es un recuento a una fecha, **no** la brecha de la DA 37.ª. Script `scripts/etl/ss_complementos_genero.py`                                     | 2026-10-01 | pensiones; euros al mes      |
| `sistema/complementos-genero-indicadores` (tabla `extraccion-pdf`)    | Indicadores básicos de los dos complementos: número, importe medio y variación en el último mes y en el último año, por sexo                                                                                                                                                                                                                | 2026-10-01 | pensiones; euros al mes; %   |
| `sistema/tribunal-cuentas-cge2023-ss`                                 | Cifras y citas literales del extracto de la Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2023 (préstamos, transferencias por finalidad, aportaciones no contributivas, Fondo de Reserva) y la serie derivada de préstamos por año de concesión (inferido). Script `scripts/etl/tc_cge2023_seguridad_social.py` | 1991-2024  | millones de euros; % del PIB |
| `sistema/tribunal-cuentas-cge2023-prestamos` (tabla `extraccion-pdf`) | Anexo 10 de esa declaración línea a línea, con subtotales y total, huella y página                                                                                                                                                                                                                                                          | 1992-2024  | millones de euros            |

Las tablas de tipo **`extraccion-pdf`** (CSV + JSON hermano) llevan en cada fila el fichero, la huella SHA-256, la página y la localización de la cifra; el JSON, la fuente, la fecha de descarga, la confianza, la naturaleza («observado»), la tolerancia de redondeo, los PDF de origen y el resumen de las validaciones. `validate:data` las comprueba. Los scripts se ejecutan con `python3 -I` (necesitan `pdftotext`, de poppler) y después `npx prettier --write` sobre los JSON; no escriben marcas de tiempo: dos ejecuciones dan la misma salida.

## Contenido (Fase 1B-1: `sistema/`)

| Fichero                                                   | Contenido                                                                       | Periodo   | Unidad                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- | --------- | ----------------------- |
| `pensiones-vigor-regimen-clase-sexo` (tabla)              | Pensiones en vigor y pensión media, por régimen, clase y sexo, a 1 de diciembre | 2008-2025 | pensiones; euros/mes    |
| `pensiones-vigor-numero`, `pensiones-vigor-pension-media` | Series del total del sistema por clase y sexo                                   | 2008-2025 | pensiones; euros/mes    |
| `pensionistas-pensiones-historico`                        | Pensionistas (personas) y pensiones a diciembre                                 | 2006-2025 | personas; pensiones     |
| `altas-bajas-anual-clase-sexo` (tabla)                    | Altas iniciales y bajas definitivas del año, con pensión media                  | 2021-2025 | pensiones; euros/mes    |
| `edad-media-altas-jubilacion`                             | Edad media de las altas iniciales de jubilación                                 | 2022-2025 | años                    |
| `complementos-minimos-regimen-clase-sexo` (tabla)         | Pensiones con complemento por mínimos, porcentaje, pensión y complemento medios | 2022-2025 | pensiones; %; euros/mes |
| `afiliacion-media-mensual-regimen` (tabla)                | Afiliados medios mensuales por régimen                                          | 2001-2026 | afiliados               |
| `afiliacion-anual`                                        | Afiliados: media anual (derivada) y diciembre                                   | 2001-2025 | afiliados               |
| `afiliados-sexo-edad` (tabla)                             | Afiliados de diciembre por sexo y tramo de edad                                 | 2021-2025 | afiliados               |
| `relacion-afiliados-pensiones`                            | Cuatro definiciones de afiliados por pensionista o por pensión                  | 2006-2025 | razón                   |

Las **tablas** (`tipo: "tabla"`) son un CSV más un JSON hermano con el mismo nombre (título, descripción, columnas y unidades, fuente, `fetchedAt`, confianza y SHA-256 de cada fichero de origen). `validate:data` comprueba ambos. Las definiciones de cada dato están en las notas de su JSON; las limitaciones, en `docs/DECISIONES.md` y `docs/PENDIENTE_DATOS.md`.

## Contenido (Fase 1B-3: `demografia/`, `macro/` y `sistema/`)

Detalle fichero a fichero en [demografia/README.md](demografia/README.md) y [macro/README.md](macro/README.md). En `sistema/` se añaden: `relacion-afiliados-pensiones-alternativa-1` (afiliados a último día de diciembre entre pensiones en vigor a 1 de enero siguiente, 2008-2025), `mites-bel-pensiones` y `mites-bel-pen31-cuantias` (BEL del MITES, descarga manual), `mites-anuario-pen1-sexo-clase`, `imserso-pnc-evolucion`, `imserso-pnc-perfil-2025` y `gastos-impropios` (previsiones de 2020, confianza media o baja).

## Contenido (Fase 1C: `internacional/` y `mitos/`)

Detalle en [internacional/README.md](internacional/README.md) y [mitos/README.md](mitos/README.md): OCDE «Pensions at a Glance» (11 países, media OCDE y UE-27), Eurostat (gasto en pensiones, pobreza o exclusión de mayores, empleo de 55 a 64 años), estructura de nueve sistemas de pensiones con cita literal, series derivadas de contraste de España y un catálogo de 12 afirmaciones circulantes (de tipo `mitos`) sin veredicto.

## Contenido (Fase 2-A: reglas de la jubilación para el motor, en `parametros/`)

Generados por `scripts/etl/jubilacion_reglas.py` (cita literal comprobada por código en el artículo o la disposición); detalle en [`docs/MOTOR_INVENTARIO.md`](../docs/MOTOR_INVENTARIO.md).

| Fichero                                                                      | Contenido                                                                            | Periodo                          | Unidad                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------ |
| `escala-jubilacion-tramos`                                                   | Escala por meses cotizados: porcentaje base, tramos y máximo (DT 9.ª, art. 210.1)    | versiones 2013, 2020, 2023, 2027 | %; meses                       |
| `jubilacion-periodo-previo`, `jubilacion-edad-65`                            | Dos años en los quince anteriores; edad de 65 años                                   | desde 2013                       | meses                          |
| `jubilacion-coeficientes-involuntaria`, `jubilacion-coeficientes-voluntaria` | Cuadros de los arts. 207.2 y 208.2 (id `tramo-meses`) y umbrales de periodo cotizado | desde 2022                       | % de reducción; meses          |
| `jubilacion-coeficientes-voluntaria-limite`                                  | DT 34.ª: coeficientes sobre el límite de pensión (id `año-tramo-meses`)              | 2024-2033                        | % de reducción                 |
| `jubilacion-anticipada-reglas`                                               | Requisitos numéricos de las anticipadas y de la parcial                              | 2022 y 2025                      | meses; %                       |
| `jubilacion-demora-reglas`                                                   | Porcentaje adicional, pago único (800, 880, 500, 1,65) y opción mixta                | 2022 y 2026                      | %; euros; meses; años          |
| `lagunas-integracion-brecha-genero`                                          | DT 41.ª: mensualidades 49.ª a 84.ª y porcentajes de la base mínima                   | 2026                             | mensualidad; %                 |
| `pension-maxima-incremento-2051-2065`                                        | Tabla de la DT 39.ª.4                                                                | 2051-2065                        | puntos porcentuales            |
| `complemento-brecha-genero-reglas`                                           | Art. 60: hijos, tope de 4 veces, límite máximo, mínimas, parcial, número de pagas    | desde 2023                       | hijos; veces; indicador; pagas |

## Contenido (Fase 5-B1: `proyecciones/`)

Salidas de los modelos propios M1, M2 y M3, **proyecciones de modelo y no datos observados** (`tipo: "proyeccion"`, `naturaleza: "proyeccion-de-modelo"`). Detalle, escenario, procedencia y cómo regenerarlas en [proyecciones/README.md](proyecciones/README.md).

## Formato

```jsonc
{
  "id": "identificador-del-fichero",
  "title": "Título legible",
  "description": "Qué contiene y cómo se ha obtenido",
  "data": [
    {
      "id": "identificador-del-dato",
      "value": 0, // número o texto
      "unit": "euros/mes",
      "period": "2025", // o "2025-T1"
      "source": { "title": "…", "publisher": "…", "url": "https://…", "docId": "opcional" },
      "fetchedAt": "AAAA-MM-DD", // o fecha y hora ISO con zona
      "confidence": "alta", // alta | media | baja
      "notes": "opcional",
    },
  ],
  "series": [
    {
      "id": "…",
      "title": "…",
      "unit": "…",
      "source": { "title": "…", "publisher": "…", "url": "https://…" },
      "fetchedAt": "AAAA-MM-DD",
      "confidence": "alta",
      "points": [{ "period": "2024", "value": 0 }],
    },
  ],
}
```
