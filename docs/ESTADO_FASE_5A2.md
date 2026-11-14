# Estado de la Fase 5-A2

Rama `feat/fase-5a2-hucha-transferencias`. Hecho: la página «Hucha» sitúa el Fondo de Reserva frente a las transferencias del Estado, sin proyecciones, sin tocar el motor ni «Tu pensión». Inventario en `docs/INVENTARIO_HUCHA_TRANSFERENCIAS.md`, decisiones en `docs/DECISIONES.md` («Fase 5-A2»).

## Qué se muestra y de qué ficheros

1. **De dónde procede el dinero** (`SeccionOrigen`): transferencias (`normativa/trlgss-financiacion`), préstamos (`sistema/prestamos-transferencias-tribunal-cuentas`, `parametros/prestamos-estado-seguridad-social`), gastos impropios (Tribunal de Cuentas y `sistema/gastos-impropios`) y tabla con el mismo periodo según la ejecución y según el Tribunal de Cuentas.
2. **Transferencias en el tiempo** (`SeccionTransferencias`; `sistema/presupuesto-ss-ejecucion`): flujo por año, por trimestre y acumulado desde un año de inicio elegible; cifras por finalidad del Tribunal de Cuentas.
3. **El Fondo frente a las transferencias** (`SeccionFondoTransferencias`; `sistema/fondo-reserva-series` y la ejecución): meses o trimestres de transferencias con dos definiciones de periodo.
4. **Construcción ilustrativa** (`SeccionPosicion`, `GraficoPosicion`; Fondo, `sistema/deuda-pde-seguridad-social`, transferencias): barras, línea de suma, casillas, año de inicio, y serie de deuda con anotaciones.

## Descargado en esta fase

`sistema/deuda-pde-seguridad-social` (Banco de España, `scripts/etl/bde_deuda_ss.py`), `sistema/prestamos-transferencias-tribunal-cuentas` (BOE-A-2025-25090, `scripts/etl/tc_cge2022_seguridad_social.py`) y `normativa/trlgss-financiacion` (`scripts/etl/trlgss_financiacion.py`, sobre el texto consolidado del 2026-11-11).

## Qué no se pudo

Ver `docs/PENDIENTE_DATOS.md` («Fase 5-A2») y `docs/DESCARGAS_MANUALES.md`: pauta de las transferencias, desglose anual por finalidad, años anteriores a 2017, transferencias de capital por origen, Fondo más frecuente que el anual y Declaración del Tribunal de Cuentas sobre la Cuenta General de 2023 (el servidor devuelve HTML).

## Pruebas

- Unitarias: `src/engine/transferencias.test.ts` (flujos trimestrales, acumulada desde un año de inicio, meses de flujo, suma con componentes seleccionables, casos hechos a mano).
- Datos: `scripts/hucha-5a2.test.ts` (procedencia, continuidad de la serie del Banco de España, coherencia con el Tribunal de Cuentas y con la ejecución, citas presentes en el texto del BOE).
- Componentes: `src/modules/hucha/hucha.test.tsx` (secciones, casillas con teclado, año de inicio, unidad, tabla y fuente de cada gráfico) y `src/modules/historico/paginas.test.tsx` (existente).
- Neutralidad y cifras: `scripts/neutralidad-5a2.test.ts`, `src/modules/historico/neutralidad.test.tsx` y `scripts/historico-5a.test.ts` (existente, ampliado a los módulos nuevos).
- Playwright: `e2e/hucha.spec.ts` (consola, peticiones externas, casillas que cambian la línea, teclado, año de inicio, móvil y 44 px, axe) y las rutas existentes de `e2e/sitio.spec.ts` y `e2e/historico.spec.ts`.
