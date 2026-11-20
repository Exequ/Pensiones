# Estado de la fase RA «Ajustes actuariales 4»

Rama `feat/ra-ajustes-actuariales-4`, creada desde `origin/main` (`01b0b4fad83de41fca857bc8083721a067e08064`, PR [Exequ/Pensiones#52](https://github.com/Exequ/Pensiones/pull/52); CI y despliegue de ese commit en verde, run 137 de cada flujo). Aplica las respuestas del chat actuarial del 19-11-2026, bloque A (`docs/revision-actuarial/respuestas-tanda4-A.md`, opinión experta, no fuente), solo en lo comprobado en una norma descargada en el repo o recalculado desde `/data`. Tabla por punto: `docs/revision-actuarial/aplicacion-tanda4.json` (la comprueba `scripts/verificacion-ajustes-4.test.ts`, que busca cada cita «…» en el texto descargado). Decisiones: `docs/DECISIONES.md` («Fase RA») y `docs/DECISIONES_ACTUARIALES.md`.

No se ha tocado `modelos/`, `docs/modelos/` ni `data-raw/`. En `docs/DISCREPANCIAS.md` solo se ha añadido una discrepancia nueva (confianza de M4). Nada del bloque B.

## Qué se aplicó, por punto

1. **Confianza**: criterio en tres conceptos (dato, lectura normativa, salidas de modelos) en `DECISIONES.md` y en «Metodología» (apartado de confianza y de modelos; respaldo actualizado), sin mostrar la confianza junto a cada fuente. Salidas: M1 y M3 «media» (tolerancias escritas en `modelos/m1/test_m1.py` y `modelos/m3/test_m3.py`), M2 «baja» y **M4 de «media» a «baja»** (su contraste con el Ageing Report solo comprueba la tendencia y usa salidas de M2), en `data/proyecciones/m4-*.json` y en su generador. Auditoría del resto de `/data` en `docs/AUDITORIA_CONFIANZA.md`: ningún caso inequívoco más; dudosos listados.
2. **Orden de los límites**: redacción «se deduce de los arts. 229.1 y 59.1; ningún artículo lo fija expresamente». Efecto medido con 3, 4 y 5 orfandades sin cambiar el motor (`src/engine/supervivencia/orden-limites.test.ts`, tabla en `docs/MOTOR_SUPERVIVENCIA.md`): **no es nulo** (13 de 15 casos dan menos con el orden inverso; solo coinciden con base de 3.000 € y tres o cuatro huérfanos). El art. 60.1.e que cita el revisor es el 60.3.e del texto consolidado.
3. **Opción de 25 años**: «periodo más largo» corregido en el registro de lecturas, en los textos del selector y en el comentario de las lecturas de jubilación en incapacidad; texto del revisor con todas las cifras de `/data` (`src/modules/tu-pension/texto-opcion25.ts`, desde `resumenOpcion25` del motor) y rótulo nuevo de `jubilacion.opcion25EnUltimoDia2040`, en «Tu pensión» y en «Cómo se calcula» (que deja su texto propio). Las cifras de `/data` coinciden con las del texto propuesto.
4. **DT 34.ª**: A por defecto, pendiente. El motor calcula las dos lecturas (`src/engine/jubilacion/salvaguarda-dt34.ts`); el resultado de la anticipada voluntaria por encima de la máxima se da como rango «entre X (lectura B) y Y (lectura A)» con la frase del revisor. **No se ve hoy en la página**: el formulario solo ofrece la jubilación ordinaria (probado con la entrada del motor).
5. **IPC de 2001**: prueba hecha con los factores de los informes y la serie IPC2401 del repo: **no coinciden** (más del 1 % de diferencia; el enlace actual, menos del 0,05 %). Se mantiene el enlace (`scripts/ipc-2001-informes.test.ts`); descarga del criterio en `DESCARGAS_MANUALES.md`.
6. **N.º 44 y n.º 46**: brecha de la DA 37.ª calculada en el motor (`brecha-da37.ts`, (hombres − mujeres) ÷ hombres con las altas iniciales) y mostrada en «Tipos de pensión» con su fuente; diferencia acumulada del MEI calculada en el motor (`mei-conciliacion.ts`) y texto de «La hucha» reformulado sin afirmar el desfase.
7. **Lecturas**: los diez motivos de las provisionales citan su norma y su alternativa; `incapacidad.redondeoEdadCarencia` pasa a decidida (art. 195.3, «tiempo transcurrido»). Estado: 18 decididas, 10 provisionales y 1 pendiente. Ningún valor por defecto cambia.
8. **Afirmaciones**: 12 cerradas con la cuarta tanda (de 20 pendientes a 9). Generadores: `scripts/etl/fuentes_claims.py` (claims.json) y el nuevo `scripts/etl/aplicar_tanda4.py` (claims-web.json y catálogo de mitos, que no tenían generador reproducible: los dos los había retocado la fase R1).

## Qué no se aplicó y por qué

- M4 en «media» (lo aprobaba el revisor): falta la tolerancia escrita del contraste; manda la verificación.
- IPC2401 para 2001: la prueba no se cumple.
- Corrección de la confianza de la serie de préstamos por año de concesión (año inferido, en «alta»): es del bloque B (R13 y R14).
- Siguen pendientes: DT 34.ª (`param-jubilacion-coeficientes-voluntaria-limite`), supervivencia (b) y (e), la parte (2) del n.º 44, `param-pnc-reglas` (d), el recálculo del censo de 2021, la política fiscal constante de la OCDE y la pobreza (`mito-mayores-en-pobreza`, `web-mitos-pobreza`).

## Casos de oro

Ninguno cambia. El único cambio en un texto del motor es el detalle del paso `demora-mixta`, que rotula como lectura propia la pensión inicial anual de la opción mixta (sin cambiar el cálculo).

## Pendientes para Sergio

- **Actuariales**: criterio de la entidad gestora sobre la DT 34.ª; excónyuge con compensatoria y complemento a mínimos; desarrollo del art. 226.2; DT 41.ª y opción de 25 años; tercera persona en las PNC; los dudosos de `docs/AUDITORIA_CONFIANZA.md`.
- **Descargas manuales**: índice del IPC de 2001 que usa la Seguridad Social; brecha de la DA 37.ª publicada por año; recaudación mensual del MEI (ya anotadas).
- **Modelos**: tolerancia escrita del contraste de M4 o fiabilidad «baja» en su descripción (`DISCREPANCIAS.md`).
- **Otros**: decidir si «Tu pensión» debe ofrecer la jubilación anticipada (sin ella, el rango de la DT 34.ª no se ve).

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`: 163 ficheros) en verde.
- `npx tsc -b --force` sin errores.
- `npm test`: 154 ficheros y 3.152 pruebas en verde.
- `npm run build` correcto. Trozo principal `index-*.js`: 280.218 bytes (88.321 comprimidos con `gzip -c`); en `main`, 279.990: +228 bytes.
- Playwright completo en local: 704 en verde y 8 en rojo, **los mismos ocho de `e2e/sitio.spec.ts`** («sin sombras, degradados, radios > 2 px…» en `/diseno`, `/cotizantes-y-pensionistas`, `/financiacion-y-deficit` y `/hucha`, escritorio y móvil). Spec nuevo `e2e/ajustes-actuariales-4.spec.ts` (8 pruebas, 1360 y 390 px) en verde.
- Capturas a 1360 y 390 px revisadas: panel de la opción de 25 años en «Tu pensión», lectura en «Cómo se calcula», brecha en «Tipos de pensión», MEI en «La hucha» y confianza en «Metodología». Sin desbordes ni errores de consola.
