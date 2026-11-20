# Auditoría de la confianza de los datos (Ajustes actuariales 4)

Auditoría de la confianza de cada dato de `/data` con el criterio de la cuarta revisión actuarial (punto 1 de `docs/revision-actuarial/respuestas-tanda4-A.md`, escrito en `docs/DECISIONES.md`, apartado «Criterio de confianza en tres conceptos»). Fecha: 2026-11-20.

## Método

Se recorren todos los JSON de `/data` y se toma cada objeto con `confidence` (4.242 en total: 3.931 «alta», 286 «media» y 25 «baja» antes de los cambios de esta fase). Para cada uno se buscan, **solo en sus propios campos** (`notes`, `title`, `description`, `unit`; no en las notas del fichero que lo contiene), estas marcas:

- lectura por reconocimiento de caracteres (`OCR`): **ninguna** en `/data` (los textos por OCR están en `data-raw/` y no se han convertido en datos);
- dato derivado con un supuesto (interpolación, enlace, estimación, reparto, conversión, asignación);
- cálculo propio (cociente, media, recalculado);
- convención ilustrativa o valor ficticio;
- organismo «elaboración propia» con confianza alta: **ninguno**.

Las coincidencias se revisan una a una. Muchas son falsos positivos: palabras de la norma transcrita («impacto medio anual estimado», «se prorratea»), conversiones exactas de años a meses o notas que explican una diferencia de definición.

## Corregidos (casos inequívocos)

| Fichero                                    | Dato            | Antes | Después | Motivo                                                                                                                                                                                                                    |
| ------------------------------------------ | --------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/proyecciones/m4-financiero.json`     | todo el fichero | media | baja    | Salida de modelo: el contraste de M4 con el Ageing Report 2024 solo comprueba la tendencia (`modelos/m4/test_m4.py`, `test_contraste_ageing_tendencia`), sin tolerancia escrita, y M4 usa salidas de M2 (baja). Paso 8 b. |
| `data/proyecciones/m4-escenarios.json`     | todo el fichero | media | baja    | Mismo modelo y mismo motivo.                                                                                                                                                                                              |
| `data/proyecciones/m4-sensibilidades.json` | todo el fichero | media | baja    | Mismo modelo y mismo motivo.                                                                                                                                                                                              |

El generador (`scripts/etl/modelos_salidas.py`) recoge el mismo valor y la misma nota, para que una regeneración no lo revierta. No se toca `modelos/` ni `docs/modelos/` (la descripción de M4 sigue diciendo «Fiabilidad de M4: media»; la diferencia queda en `docs/DISCREPANCIAS.md`).

Salidas que **no** cambian: M1 (media: contraste con la proyección del INE y prueba hacia atrás con tolerancias escritas en `modelos/m1/test_m1.py`: población total por debajo del 1 %, mayores de 65 por debajo del 2,5 %), M3 (media: contraste con el Ageing Report en una banda de diez puntos, `modelos/m3/test_m3.py`, `test_contraste_ageing_en_banda`) y M2 (baja: versión preliminar). Ninguna salida de modelo está en «alta».

## Dudosos (para Sergio; no se cambian)

| Fichero                                                                                                               | Dato                                  | Confianza | Por qué es dudoso                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/sistema/tribunal-cuentas-cge2023-ss.json`                                                                       | serie `prestamos-concedidos-por-anio` | alta      | Sus notas dicen que el año de concesión es «inferido» (cada línea se asigna al año anterior al de inicio del plazo): con el criterio sería «media». No se corrige en esta fase porque es del perímetro de los préstamos del Estado (bloque B, fases R13 y R14) y cambiaría el estado de `web-hucha-prestamos-por-anio`. |
| `data/sistema/imserso-pnc-perfil-2025.json`                                                                           | nueve datos del perfil de 2025        | alta      | La nota dice que no coincide con el número de pensiones de la nómina (`imserso-pnc-evolucion`) porque son registros distintos. Si la diferencia es de definición, «alta» encaja; si se considera discrepancia sin resolver, sería «media».                                                                              |
| `data/sistema/relacion-afiliados-pensiones.json` y `relacion-afiliados-pensiones-alternativa-1.json`                  | cocientes                             | media     | Cociente exacto de dos series de confianza alta: con el criterio podría ser «alta» si una prueba automática comprueba la operación. Hoy lo marcan como «dato derivado».                                                                                                                                                 |
| `data/parametros/ipc-variacion-media-anual.json`                                                                      | 23 variaciones medias anuales         | media     | Cálculo propio desde los índices; la nota admite una diferencia de una décima con la tasa publicada en su momento: «media» encaja (discrepancia menor), salvo que se sustituya por la tasa publicada.                                                                                                                   |
| `data/demografia/triangulacion-*.json`, `data/internacional/contraste-espana.json`, `data/macro/salario-medio-*.json` | cálculos de contraste                 | media     | Derivados con supuestos (convención de edades, definiciones de salario): «media» encaja; quedan listados por si alguno es una operación exacta con prueba.                                                                                                                                                              |

## Encajan con el criterio (sin cambios)

- Conversiones exactas escritas en la norma (años a meses de la escala, de los coeficientes y de la demora; sesenta años a meses): «alta».
- Tramos enlazados del IPC mensual (2001 y 1992-2000): «media»; desde 2002, «alta» (serie sin transformar).
- Ejemplos ilustrativos de «Cómo se calcula» (`data/ejemplos/como-se-calcula.json`): «baja».
- Salidas de M1 y M3: «media»; de M2 y M4: «baja».

`npm run validate:data` en verde después de los cambios.
