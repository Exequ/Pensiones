# Pensiones no contributivas y MEI

Fase 2-B-3. Dos librerías puras (`src/engine/no-contributivas/` y `src/engine/mei/`) con el patrón de los demás motores: desglose por pasos con el parámetro de `/data` y el artículo de cada paso, ninguna cifra legal en el código, `NoImplementada` y `DatoNoDisponible` para lo que no se calcula o no hay dato. No se ha tocado la interfaz. Se usan desde la fachada (`docs/MOTOR.md`) o directamente.

## Pensiones no contributivas (arts. 363 a 372 TRLGSS)

```ts
import { calcularPNCInvalidez, calcularPNCJubilacion } from '../engine/no-contributivas/repositorio.ts';

const r = calcularPNCInvalidez(
  { nacimiento: '1980-05-05', fechaSolicitud: '2026-03-10', residenciaLegalMeses: 120, residenciaRecienteMeses: 60,
    gradoDiscapacidad: 80, necesitaTerceraPersona: true, rentasAnuales: 2000 },
  { unidadEconomica: { convivientes: 2, beneficiarios: 1, rentasUnidadAnuales: 12000 }, alquiler: { … }, trabajo: { … } },
);
r.pensionMensual;      // por paga (14 pagas): pensión + complemento de tercera persona
r.complementoAlquilerAnual; r.totalAnual; r.pasos; r.requisitos;
```

### Reglas y parámetros

Referencias `id` = `data/parametros/pnc-reglas.json#id` salvo que se indique otro fichero.

| Paso                             | Regla                                                                                                                                                                                                          | Parámetros                                                                                       | Norma                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Efectos y año                    | Efectos del primer día del mes siguiente a la solicitud; se aplica la cuantía de ese año                                                                                                                       | `efectos-incapacidad-mes-siguiente`, `efectos-jubilacion-mes-siguiente`                          | arts. 365 y 371                                 |
| Edad                             | Incapacidad: más de 18 y menos de 65 años en la solicitud; jubilación: 65 cumplidos                                                                                                                            | `incapacidad-edad-minima-meses`, `incapacidad-edad-maxima-meses`, `jubilacion-edad-minima-meses` | arts. 363.1.a) y 369.1                          |
| Residencia                       | Incapacidad: 5 años (2 inmediatamente anteriores); jubilación: 10 años entre los 16 años y el devengo (2 consecutivos inmediatamente anteriores)                                                               | `incapacidad-residencia-*`, `jubilacion-residencia-*`                                            | arts. 363.1.b) y 369.1                          |
| Discapacidad                     | Grado de al menos el 65 % (incapacidad)                                                                                                                                                                        | `incapacidad-grado-minimo-pct`                                                                   | art. 363.1.c)                                   |
| Carencia de rentas               | Rentas propias inferiores a la cuantía anual; en unidad económica, rentas de la unidad inferiores al límite de acumulación                                                                                     | `rentas-insuficientes-menor-que-cuantia`; `pnc-importe-anual`                                    | art. 363.1.d)                                   |
| Límite de acumulación            | C + 70 % de C por cada conviviente adicional; con descendientes o ascendientes en primer grado, 2,5 veces; con derecho al complemento de tercera persona, sobre la cuantía incrementada (lectura)              | `unidad-economica-*`, `limite-acumulacion-con-tercera-persona`                                   | arts. 363.2 a 363.4; guía del IMSERSO           |
| Cuantía íntegra                  | Anual, fijada cada año (14 pagas)                                                                                                                                                                              | `pnc-importe-anual`; `pagas-anuales`                                                             | art. 364.1; art. 46.2; normas de revalorización |
| Varios beneficiarios             | (C + 70 % de C por beneficiario adicional) / número de beneficiarios                                                                                                                                           | `cuantia-unidad-economica-pct`, `cuantia-unidad-economica-reparto-igual`                         | art. 364.1                                      |
| Rentas propias                   | Se compatibilizan hasta el 35 % de la cuantía; el exceso se deduce                                                                                                                                             | `rentas-compatibles-pct`                                                                         | art. 364.2                                      |
| Convivencia con no beneficiarios | Si rentas de la unidad más pensiones superan el límite, cada pensión se reduce en igual cuantía                                                                                                                | `reduccion-por-limite-acumulacion`                                                               | art. 364.3                                      |
| Mínimo                           | Al menos el 25 % de la cuantía íntegra                                                                                                                                                                         | `cuantia-minima-pct`                                                                             | art. 364.4                                      |
| Tercera persona                  | +50 % de la cuantía íntegra con grado de al menos el 75 % y necesidad de otra persona (solo incapacidad)                                                                                                       | `complemento-tercera-persona-*`                                                                  | art. 364.6                                      |
| Trabajo (incapacidad)            | Cuatro años desde el inicio de la actividad: pensión + ingresos no pueden superar el IPREM anual (sin pagas extra) + la cuantía íntegra; se reduce la pensión, no el complemento                               | `compatibilidad-trabajo-*`; `pnc-iprem-anual-sin-pagas-extra`                                    | art. 366                                        |
| Alquiler                         | Complemento anual para quien no tiene vivienda en propiedad y es titular de un alquiler (contrato de 12 meses y 180 días de residencia; arrendador no familiar hasta el tercer grado; un titular por vivienda) | `alquiler-*`; `pnc-complemento-alquiler`                                                         | RD 1191/2012; normas de revalorización          |

### Fuentes: guías del IMSERSO

Las guías anuales del IMSERSO (`data-raw/imserso/pncresumen2022.pdf` a `2026.pdf`, con huella en `origen.json`) publican las cuantías, los límites de acumulación y el límite del art. 366 de cada año. Se usan como (1) fuente de los 23 casos de oro «independientes», (2) contraste de la cuantía anual (la de 2023 era la del RD 1058/2022, 6.402,20, superada por el incremento extraordinario del art. 77 del RDL 20/2022: 6.784,54; se corrigió el dato y consta en `docs/DISCREPANCIAS.md`), y (3) fuente del IPREM anual de 2024 a 2026 (`pnc-iprem-anual-sin-pagas-extra`). La guía no es norma: la aplicación del límite con tercera persona se recoge como lectura abierta con confianza «media».

### Lecturas abiertas (opciones del motor, `lecturasPNC`)

| Opción                          | Por defecto       | Alternativa                | Pregunta               |
| ------------------------------- | ----------------- | -------------------------- | ---------------------- |
| `baseRentasCompatibles`         | `cuantia-integra` | `cuantia-por-beneficiario` | `param-pnc-reglas` (a) |
| `limiteTrabajo`                 | `cuantia-integra` | `pension-reconocida`       | `param-pnc-reglas` (b) |
| `rentasConTrabajoEnCuatroAnios` | `sustituye-364-2` | `se-suman`                 | `param-pnc-reglas` (c) |
| `limiteConTerceraPersona`       | `con-complemento` | `sin-complemento`          | `param-pnc-reglas` (d) |

El efecto de cada una está en `docs/INFORME_VERIFICACION.md` (Fase 2-B-3).

### Limitaciones (`LIMITACIONES_PNC`)

Complementos autonómicos y haciendas forales (fuera de alcance); años anteriores a 2022 (`NoImplementada`) y posteriores a 2026 (`DatoNoDisponible`: la cuantía la fija cada año una norma); complemento de alquiler de 2024 (sin dato); baremo de discapacidad y de tercera persona (el grado es un dato de entrada); clasificación de las rentas computables (el motor recibe las rentas ya calculadas, incluida la regla de la Ley 4/2026 sobre indemnizaciones por responsabilidad civil, en vigor desde el 23/10/2026); recuperación del derecho, extinción y revisión; varios beneficiarios con rentas distintas (se supone la misma pensión para todos).

## MEI y cotización adicional de solidaridad

```ts
import { cotizacionAdicionalDelAnio, tipoMEIDelAnio } from '../engine/mei/repositorio.ts';

tipoMEIDelAnio(2026); // { total: 0,9; empresa: 0,75; trabajador: 0,15 } puntos porcentuales
const c = cotizacionAdicionalDelAnio(2026, 6000); // retribución mensual de 6.000 euros
c.mei.cuotaTotal;
c.solidaridad.cuotaTotal;
c.cuotaEmpresa;
c.cuotaTrabajador;
```

| Función                                                          | Qué hace                                                                                                                                                                                                                                                                                                        | Norma                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `tipoMEI(params, año, contingencia)`                             | Tipo total, de empresa y de trabajador. 2023-2029: `mei-tipo-total`, `mei-tipo-empresa`, `mei-tipo-trabajador`; 2030-2050: `mei-reglas#tipo-*-2030-2050`. Antes de 2023 y en contingencias profesionales, 0; después de 2050, `NoImplementada`                                                                  | art. 127 bis; DT 43.ª |
| `calcularMEI(params, año, base)`                                 | Cuota mensual sobre la base de cotización por contingencias comunes (sin bonificación, reducción, exención ni deducción; no computa para prestaciones)                                                                                                                                                          | art. 127 bis          |
| `cuotaSolidaridad(params, año, retribución, opciones)`           | Retribución por encima de la base máxima en tres tramos (hasta el 10 % adicional de la base máxima, del 10 % al 50 % y el resto) con los tipos de `cuota-solidaridad-calendario` (2025-2045) y, desde 2045, los del art. 19 bis (5,5, 6 y 7 %); reparto con la proporción de los tipos de contingencias comunes | art. 19 bis; DT 42.ª  |
| `cotizacionAdicionalMensual(params, año, retribución, opciones)` | Una función por año: MEI sobre la base de cotización (retribución limitada a la base máxima) y solidaridad sobre el exceso                                                                                                                                                                                      |                       |

La base máxima es la de `/data` hasta 2026 y, después, la que proyecta el motor de jubilación con el escenario económico (`opciones.escenario`) o la que se indique (`opciones.baseMaximaMensual`). Los tipos de contingencias comunes (para repartir la solidaridad) llegan a 2026; después se indican en `opciones.tiposContingenciasComunes`.

**Contraste con `modelos/`** (solo lectura): M4 lee el mismo `mei-tipo-total`, fija 2050 como último año (como la DT 43.ª), mantiene el 1,2 desde 2029 hasta 2050 (como `mei-reglas`) y pone 0 después; no modela el reparto ni la solidaridad. Sin diferencias de valores (`scripts/contraste-mei-modelos.test.ts`; `docs/DISCREPANCIAS.md`).

### Lectura abierta (`lecturasMEI`)

| Opción    | Por defecto       | Alternativa            | Pregunta               |
| --------- | ----------------- | ---------------------- | ---------------------- |
| `baseMEI` | `base-cotizacion` | `retribucion-completa` | `param-mei-reglas` (a) |

### Limitaciones (`LIMITACIONES_MEI`)

RETA y regímenes especiales (el RETA se hará al final del proyecto); proyecciones; exclusiones del MEI en prácticas formativas y sector marítimo-pesquero; cuota de solidaridad de los trabajadores por cuenta propia y de la actividad compatible con la pensión; tipos de contingencias comunes posteriores a 2026.

## Casos de oro

`docs/INVENTARIO_CASOS_ORO.md`: PNC, 23 «independientes» (guías del IMSERSO, con URL) y 20 «derivados de la norma»; MEI y solidaridad, 13 «derivados de la norma» (no se localizó ningún ejemplo oficial resuelto). Tres ejemplos:

- **Dos beneficiarios en la misma unidad (independiente, guía de 2026)**: (8.803,20 + 70 % × 8.803,20) / 2 = **7.482,72 €/año**, 534,48 al mes.
- **Pensión con trabajo (independiente, guía de 2026)**: límite = IPREM 7.200 + cuantía íntegra 8.803,20 = 16.003,20; con 8.000 € de actividad, la pensión baja a **8.003,20 €/año**.
- **Solidaridad 2026 (derivado)**: base máxima 5.101,20, retribución 6.000: exceso 898,80 = 510,12 al 1,15 % + 388,68 al 1,25 % = **10,72488 €/mes**, repartido 83,39 % empresa (23,60 / 28,30).
