# Plantilla de casos de oro de Sergio

Los casos de oro de Sergio son resultados que él da por buenos (una resolución real anonimizada, el simulador oficial, un cálculo propio) y con los que se contrasta el motor. Se escriben en **`data-raw/casos-oro/casos-sergio.md`** (el fichero lo crea Sergio; no existe todavía) como **una tabla Markdown con una fila por caso** y estas siete columnas, en este orden:

| id  | tipo | fecha del hecho causante | datos personales | carrera o bases | resultado esperado | fuente o método |
| --- | ---- | ------------------------ | ---------------- | --------------- | ------------------ | --------------- |

Un script convierte la tabla en tests ejecutables y valida el formato:

```bash
npx tsx scripts/casos-sergio.ts            # valida y ejecuta (o avisa de que no hay fichero)
npx vitest run scripts/casos-sergio.test.ts # lo mismo, un test por caso
```

Mientras el fichero no exista, nada falla. Si existe y el formato no es válido, el error dice la línea, la columna y qué corregir. Si un caso no coincide, dice qué cifra da el motor y cuál se esperaba. El motor no se ajusta para coincidir: una diferencia es una pregunta para `docs/REVISION_ACTUARIAL.md`.

## Columnas

| Columna                    | Qué lleva                                                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                       | Identificador único, sin espacios (p. ej. `jub-ordinaria-2026-01`).                                                                                                                                                   |
| `tipo`                     | `jubilacion`, `incapacidad-permanente`, `viudedad`, `orfandad`, `favor-familiares`, `supervivencia` (las tres prestaciones juntas, con el límite conjunto), `pnc-jubilacion`, `pnc-incapacidad` o `mei`.              |
| `fecha del hecho causante` | `AAAA-MM-DD`: jubilación, hecho causante de la incapacidad, fallecimiento, solicitud de la PNC o, en el MEI, cualquier día del año.                                                                                   |
| `datos personales`         | Objeto JSON con los datos del caso (véase abajo). `{}` si no hay.                                                                                                                                                     |
| `carrera o bases`          | Lista JSON de periodos `[{"desde":"AAAA-MM","hasta":"AAAA-MM","baseMensual":2000}]` (también `basesPorAnio` y `basesPorMes`); en el MEI, `{"retribucionMensual": 6000}`; `-` en las PNC y en un causante pensionista. |
| `resultado esperado`       | Objeto JSON con las cifras esperadas (véase abajo) y, opcionalmente, `"tolerancia"` en euros (por defecto, 0,01).                                                                                                     |
| `fuente o método`          | De dónde sale el resultado: «independiente: resolución X (url)», «independiente: simulador de la Seguridad Social, fecha», «derivado: cálculo a mano, hoja adjunta»… Obligatoria (al menos diez caracteres).          |

Las celdas JSON pueden ir entre comillas invertidas (así una barra «|» dentro de un JSON no rompe la tabla).

## Datos personales por tipo

- **jubilacion**: `nacimiento` (`AAAA-MM-DD`), `modalidad` (`ordinaria`, `anticipada-voluntaria`, `anticipada-involuntaria`, `demorada`, `parcial`; por defecto `ordinaria`), `opciones` (las del motor: `sexo`, `hijos`, `escenario`…).
- **incapacidad-permanente**: `nacimiento`, `grado` (`parcial`, `total`, `absoluta`, `gran-incapacidad`), `origen` (`enfermedad-comun`, `accidente-no-laboral`, `accidente-trabajo`, `enfermedad-profesional`), `opciones`.
- **viudedad**, **orfandad**, **favor-familiares**, **supervivencia**: `causa`, `situacion` (`alta`, `alta-sin-obligacion`, `sin-alta`, `pensionista`), los beneficiarios (`viudos`, `huerfanos`, `familiares`), `causante` (campos extra del causante: `pension`, `finObligacionCotizar`…) y `opciones`.
- **pnc-jubilacion**, **pnc-incapacidad**: `nacimiento`, `residenciaLegalMeses`, `residenciaRecienteMeses`, `gradoDiscapacidad`, `necesitaTerceraPersona`, `rentasAnuales` y `opciones` (`unidadEconomica`, `trabajo`, `alquiler`).
- **mei**: `{}`.
- En cualquier tipo: `configuracion` (`{"lecturas": {"jubilacion.baseMaxima": "sobre-cifra-inicial"}, "escenario": {"ipc": 0.02}}`) para fijar lecturas abiertas (identificadores en `src/engine/lecturas.ts` y `docs/MOTOR.md`) y el escenario económico.

## Resultado esperado

`{"pensionMensual": 1234.56}` es la suma de las pagas de todas las prestaciones del caso; `{"pensionAnual": 17283.84}`, la anual. Para varias prestaciones: `{"prestaciones": [{"clase": "viudedad", "indice": 0, "pensionMensual": 891.43}]}`. Otras claves: `cumpleRequisitos` (`true` o `false`), `cuotaTotal`, `cuotaEmpresa` y `cuotaTrabajador` (MEI), y `error` (`NoImplementada`, `DatoNoDisponible` o `EntradaInvalida`) si el resultado esperado es precisamente que el motor no lo calcula.

## Ejemplo (solo para comprobar el formato; no es un caso de Sergio)

Estas filas se validan por formato en `scripts/casos-sergio.test.ts`, pero no se ejecutan ni tienen valor de referencia.

| id                 | tipo           | fecha del hecho causante | datos personales                                                                                               | carrera o bases                                                   | resultado esperado          | fuente o método                                                       |
| ------------------ | -------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| ejemplo-mei-2026   | mei            | 2026-06-01               | `{}`                                                                                                           | `{"retribucionMensual": 2000}`                                    | `{"cuotaTotal": 18}`        | ejemplo de formato: cálculo a mano del tipo de 2026 sobre 2.000 euros |
| ejemplo-pnc-2026   | pnc-jubilacion | 2026-03-10               | `{"nacimiento": "1955-03-03", "residenciaLegalMeses": 240, "residenciaRecienteMeses": 60, "rentasAnuales": 0}` | -                                                                 | `{"pensionMensual": 628.8}` | ejemplo de formato: importe de la guía del IMSERSO de 2026            |
| ejemplo-jubilacion | jubilacion     | 2026-02-01               | `{"nacimiento": "1958-01-15", "modalidad": "ordinaria", "opciones": {"escenario": {"ipc": 0.02}}}`             | `[{"desde": "2000-01", "hasta": "2026-02", "baseMensual": 2000}]` | `{"pensionMensual": 1500}`  | ejemplo de formato: el valor no es una referencia                     |
