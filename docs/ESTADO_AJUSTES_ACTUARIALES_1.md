# Estado de los ajustes actuariales 1

Rama `feat/ajustes-actuariales-1`. Revisión actuarial del 14-11-2026, primera parte: estados de lecturas, cambio de un valor por defecto, textos «qué cambia», incapacidad por contingencias profesionales, nota de lecturas de jubilación, persona de ejemplo y afirmación sobre el grado. Las decisiones y sus motivos están en `docs/DECISIONES.md` («Ajustes actuariales 1»); las discrepancias con el motor, en `docs/DISCREPANCIAS.md`.

## Hecho

- **Paso 0**: PR #26 de la rama `datos/descargas-manuales` fusionado con squash tras el CI en verde; sin procesar sus contenidos ni tocar `.gitignore`.
- **Estados** (fecha 2026-11-14; ningún valor cambia salvo el de `incapacidad.lagunasAccidenteNoLaboral`). Total: 17 decididas, 10 provisionales, 1 pendiente.

| Lectura                                              | De          | A           | Valor por defecto          |
| ---------------------------------------------------- | ----------- | ----------- | -------------------------- |
| `jubilacion.referenciaBaseMinimaLagunas`             | pendiente   | decidida    | `mes-de-la-laguna`         |
| `jubilacion.opcion25EnUltimoDia2040`                 | pendiente   | decidida    | `incluida`                 |
| `jubilacion.lagunasAnterioresAlPrimerAlta`           | provisional | provisional | `integrar`                 |
| `jubilacion.interpolacionIPC`                        | pendiente   | decidida    | `mensual-ine`              |
| `jubilacion.actualizacionFactorMinimo`               | provisional | provisional | `suelo-1`                  |
| `jubilacion.fraccionDemora`                          | pendiente   | decidida    | `desde-segundo-anio`       |
| `incapacidad.computoFiccion`                         | pendiente   | provisional | `meses`                    |
| `incapacidad.divisorPeriodoCorto`                    | pendiente   | decidida    | `coeficiente-rd-1799-1985` |
| `incapacidad.lagunasAccidenteNoLaboral`              | provisional | pendiente   | `sin-integrar`             |
| `incapacidad.redondeoEdadCarencia`                   | pendiente   | provisional | `sin-redondeo`             |
| `incapacidad.diasCotizadosParcial`                   | pendiente   | provisional | `naturales`                |
| `supervivencia.ventanaBaseReguladora`                | pendiente   | decidida    | `anterior-al-mes-previo`   |
| `supervivencia.diasCotizados`                        | pendiente   | provisional | `naturales`                |
| `supervivencia.carenciaFamiliaresAccidenteNoLaboral` | provisional | provisional | `exigir`                   |
| `supervivencia.comparacionCompensatoria`             | provisional | provisional | `anual`                    |
| `supervivencia.reduccionLimiteConjunto`              | provisional | provisional | `orfandad`                 |
| `no-contributivas.limiteConTerceraPersona`           | provisional | provisional | `con-complemento`          |

Las seis que siguen provisionales y la que pasa a pendiente reciben el motivo nuevo; las demás de la tabla cambian de estado.

- **Valor por defecto**: `incapacidad.lagunasAccidenteNoLaboral` pasa de `integrar` a `sin-integrar` (pendiente). Efecto medido: 530,36 frente a 693,14 €/mes con «integrar» en el caso de oro de accidente no laboral con 6 meses sin cotizar (`docs/INFORME_VERIFICACION.md`).
- **Textos «qué cambia»**: revisados por la revisión actuarial del 14-11-2026 (`pensionMaxima`, `maximaDesde2051`, `opcion25EnUltimoDia2040`, `baseMaxima`, `referenciaBaseMinimaLagunas`, `fraccionDemora`, `lagunasAccidenteNoLaboral`); `redondeoEdadCarencia` sin cambios, como se pidió.
- **Incapacidad por accidente de trabajo y enfermedad profesional**: activada con el campo «Base reguladora mensual (€)».
- **Nota plegable** «Qué lecturas de jubilación se aplican aquí» en la pantalla de incapacidad.
- **Persona de ejemplo**: «salario medio ilustrativo» y nota de cobertura (la nota difiere de lo pedido: véase `docs/DISCREPANCIAS.md`).
- **Afirmación del grado** registrada en `docs/claims-web.json` (`web-tu-pension-incapacidad-grado-organismo`).
- **Documentos regenerados con sus scripts**: `REVISION_PRIORIZADA.md`, `triage-actuarial.json`, `INVENTARIO_CASOS_ORO.md`, `claims.json`, `REVISION_ACTUARIAL.md`.

## Límites conocidos

- Los cambios de lecturas de jubilación hechos en la pantalla de jubilación no pasan a la incapacidad.
- La base reguladora de las contingencias profesionales la escribe la persona; el simulador no la comprueba.
- Antes de 2018 el «salario medio ilustrativo» por defecto no tiene serie: no se completa con otra (calibración propuesta en `docs/PENDIENTE_DATOS.md`).
- No se tocan las páginas «Cotizantes y pensionistas», «Financiación y déficit» ni «Hucha», ni supervivencia, no contributivas, MEI o la carrera por tramos.
