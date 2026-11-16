# Estado de Ajustes de M4 (sensibilidades)

Rama `feat/ajustes-m4-sensibilidades`, creada desde `main` actualizado (`2c4e79b`: salidas de sensibilidades y descripción corregida). Hecho: verificación reproducible del CSV de sensibilidades, ETL y esquema, tabla «Sensibilidades» en el bloque financiero de «Proyecciones», afirmaciones, fuentes y pendientes. No se tocan el motor de prestaciones, «Tu pensión» ni otras secciones; no se ejecutan modelos ni se editan `docs/modelos/` ni `data-raw/`. Decisiones en `docs/DECISIONES.md` («Ajustes de M4, sensibilidades»); resultados de la verificación en `docs/DISCREPANCIAS.md`; huecos en `docs/PENDIENTE_DATOS.md`.

## Paso 0

Presentes `m4_sensibilidades.csv` (260 filas: diez casos × 2025-2050), `LEEME_m4_sensibilidades.txt` y la descripción corregida (sección 7 con referencia al CSV; secciones 8 y 9 sin «un solo escenario»). No hubo que parar.

## Paso 1: verificación (`scripts/verificacion-m4-sensibilidades.ts`)

| Comprobación                                                                                                | Resultado                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) Caso base: el CSV no trae filas del base; el `base` de `m4_escenarios.csv` frente a `m4_financiero.csv` | Coincide: diferencia relativa máxima 6,3 × 10⁻¹⁶ (tolerancia declarada 10⁻¹²)                                                                     |
| (a) Fila de 2025                                                                                            | Igual en los diez casos y a la del base                                                                                                           |
| (a) Caso de +1 punto de cotización                                                                          | Reproduce el gasto del base en 25 años y las cotizaciones de 2026                                                                                 |
| (b) Gasto y saldo de 2050 de cada caso frente al LEEME y a la sección 7                                     | Sin diferencias mayores que el redondeo (máximas 0,0043 con el LEEME y 0,0496 con la descripción); nada que registrar como discrepancia           |
| (c) Columnas «\_pct_pib»                                                                                    | Importe entre PIB por cien (2,8 × 10⁻¹⁶)                                                                                                          |
| (d) Cifras de la sección 3 que dependen de las sensibilidades                                               | Sin enlace con M5: 0,046 puntos (< 0,1); índice del gasto con g = 1,8 %: 134,0 en 2050 (la descripción dice 134)                                  |

El caso de empleo de 55 a 64 años usa el parámetro del LEEME (×1,1 en 2050, avance lineal); la descripción antigua no lo especificaba. No se ha verificado el año de partida del avance ni la magnitud a la que se aplica el factor (pendiente).

## Paso 2: ETL y esquema

- `scripts/etl/modelos_salidas.py` lee `m4/m4_sensibilidades.csv` y su LEEME y escribe `data/proyecciones/m4-sensibilidades.json` (250 filas calculadas; la fila de 2025, aparte). Naturaleza «proyección de modelo», huella SHA-256 del CSV, `commitModelos` (commit que añade el script), confianza `media`, parámetros de cada caso tomados literalmente del LEEME. Falla si los casos del CSV no son los del LEEME, si falta un año o si la fila de 2025 no es la del base. Los demás JSON se regeneran idénticos.
- Esquema: campos opcionales `sensibilidades` y `reproduccionLocalPorAutor` (el ETL lo fija en `false`).

## Paso 3: interfaz

Apartado «Sensibilidades: una palanca cada vez» (`FinancieroSensibilidades.tsx`) tras los escenarios: selector de año (por defecto, el último de la salida), tabla con el caso base y los diez casos en el orden del LEEME (palanca y valor del LEEME, gasto en pensiones y saldo no financiero en % del PIB aproximado, diferencia con el base calculada sin redondear), fuente, definiciones, apartado plegable con lo común a todos los casos, «Cómo leerlo» y nota de procedencia (que muestra el estado de `reproduccionLocalPorAutor`: «no, todavía no»). Sin gráfico de barras (decisión documentada), sin resaltar ninguna fila.

## Pruebas

`scripts/verificacion-m4-sensibilidades.test.ts`, `scripts/proyecciones-m4-sensibilidades.test.ts`, `src/modules/proyecciones/financiero-sensibilidades.test.tsx`, casos de `diferenciasConBase` en `src/engine/proyecciones.test.ts` y `e2e/proyecciones-sensibilidades.spec.ts`. Único cambio en un test existente: `scripts/proyecciones-5b1.test.ts` lista también `m4-sensibilidades`.

## Tamaños (`npm run build`, kB sin comprimir / gzip)

| Trozo                                               | Antes          | Ahora          |
| --------------------------------------------------- | -------------- | -------------- |
| Bloque financiero (`Financiero-*.js`, bajo demanda) | 116,57 / 44,06 | 233,53 / 87,64 |

El trozo se duplica porque lleva la salida de los diez casos (250 filas de 23 columnas) además de la de los escenarios; sigue cargándose solo al visitar «Proyecciones». Se anota como posible mejora cargar las sensibilidades de forma diferida.

## Afirmaciones y pendientes

Tres afirmaciones nuevas en `docs/claims-web.json` (dos verificadas y una pendiente con pregunta actuarial: el parámetro del caso de empleo); pendientes en total, 69 (tope del test, 70). Pendientes para el autor en `docs/PENDIENTE_DATOS.md`: reproducción local de las sensibilidades y aclaración del parámetro de empleo de 55 a 64 años.

## CI y despliegue

(Se completa tras el merge.)
