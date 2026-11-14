# data/proyecciones

Salidas de los modelos propios **M1** (demografía), **M2** (cotizantes y bases de cotización) y **M3** (pensiones contributivas en vigor), ejecutados por Sergio en local. Son **proyecciones de modelo, no datos observados ni previsiones**: calculan qué ocurriría con la legislación actual congelada y supuestos explícitos. M4 (modelo financiero) no está aquí: es la fase 5-B2.

Formato: `tipo: "proyeccion"` (esquema `ArchivoProyeccion` de [`src/engine/esquema-datos.ts`](../../src/engine/esquema-datos.ts)). Cada fichero lleva:

- `naturaleza: "proyeccion-de-modelo"` (obligatoria; `validate:data` la exige y exige que todo fichero de esta carpeta sea de este tipo).
- `modelo`: identificador, nombre y descripción del modelo en `docs/modelos/`; en M1, el `horizontePresentacion` (último año presentado como resultado; lo posterior es ilustrativo), y en M2, el `anioBaseReal` de los euros reales.
- `escenario`: `g` e IPC (fracciones), `legislacion: "congelada"`, la frase del LEEME que lo describe y `aplicacion` (qué parte influye en esa salida).
- `source`: el script del modelo en GitHub, en el commit indicado por el LEEME; `publisher`: «Elaboración propia: modelo de proyección». `fetchedAt`: fecha de ejecución de los modelos (del LEEME). `confidence`: `media` (M1 y M3) o `baja` (M2, versión v0); criterio en `docs/DECISIONES.md`, «Fase 5-B1».
- `origen`: ruta del CSV de `data-raw/modelos-salidas/`, su SHA-256, el hash completo del último commit que modifica `modelos/`, el LEEME y la fecha de ejecución.
- `columnas` (id, descripción, tipo, unidad) y `filas` (una lista de celdas por fila, en el orden de las columnas).

| Fichero                 | CSV de origen                  | Contenido                                                                                        | Periodo                |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------- |
| `m1-contraste-ine`      | `m1/m1_contraste_ine.csv`      | Población por grandes grupos de edad del modelo y de la proyección del INE, con los errores      | 2026-2076              |
| `m1-backtest`           | `m1/m1_backtest.csv`           | Prueba hacia atrás: población del modelo y observada, con los errores                            | 2011-2025              |
| `m1-escenarios`         | `m1/m1_escenarios.csv`         | Seis escenarios demográficos (INE base, fecundidad, migración, mortalidad) en cuatro años        | 2026, 2035, 2050, 2076 |
| `m2-cotizantes`         | `m2/m2_cotizantes.csv`         | Afiliados de diciembre, cotizantes y base del Régimen General (corrientes y reales), recaudación | 2026-2050              |
| `m2-relacion-pensiones` | `m2/m2_relacion_pensiones.csv` | Afiliados de diciembre entre pensiones de octubre (M3)                                           | 2026-2050              |
| `m3-pensiones`          | `m3/m3_pensiones.csv`          | Pensiones por clase, sexo y grupo de edad de cinco años (octubre)                                | 2026-2050              |
| `m3-resumen`            | `m3/m3_resumen.csv`            | Pensiones por clase, total y pensionistas aproximados (octubre)                                  | 2026-2050              |

Las columnas «_ine» de M1 son las de la proyección del INE (`data/demografia/proyecciones-poblacion`); el escenario «INE (base)» de `m1-escenarios` es el modelo con las hipótesis base del INE, no la proyección publicada.

## Cómo regenerarlos

1. Colocar las salidas de los modelos en `data-raw/modelos-salidas/` (`m1/`, `m2/`, `m3/`) con su `LEEME.txt` (fecha de ejecución, commit de `modelos/` y escenario). No se modifican a mano.
2. Desde la raíz del repositorio: `python3 -I scripts/etl/modelos_salidas.py` (lee el LEEME, calcula las huellas y escribe estos JSON; después ejecuta Prettier).
3. `npm run validate:data` y `npx vitest run scripts/proyecciones-5b1.test.ts` (procedencia, huellas, coherencias internas y comprobación de que el JSON reproduce el CSV).

Si cambia el código de `modelos/`, hay que volver a ejecutar los modelos, actualizar el LEEME y regenerar; el test comprueba que el hash del commit y el SHA-256 de cada CSV coinciden con los del LEEME y los CSV.
