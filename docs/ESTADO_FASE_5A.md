# Estado de la Fase 5-A

Rama `feat/fase-5a-historico`. Hecho: tres páginas con datos históricos y de situación actual, sin proyecciones, sin tocar el motor ni «Tu pensión». Inventario en `docs/INVENTARIO_5A.md`, decisiones en `docs/DECISIONES.md` («Fase 5-A»).

## Qué se muestra y de qué ficheros

**Cotizantes y pensionistas** (`src/modules/cotizantes-y-pensionistas`; datos: `sistema/afiliacion-anual`, `pensionistas-pensiones-historico`, `pensiones-vigor-numero`, `pensiones-vigor-pension-media`, `parametros/ipc-indice-medio-anual`, `relacion-afiliados-pensiones`, `relacion-afiliados-pensiones-alternativa-1`, `pensiones-vigor-edad-clase-sexo`, `afiliados-sexo-edad`, `altas-bajas-anual-clase-sexo`, `edad-media-altas-jubilacion`):

1. Afiliados de diciembre por régimen. 2. Pensiones y pensionistas. 3. Pensiones por clase. 4. Crecimiento comparado (índice base 100).
2. Pensión media por clase, en euros corrientes o constantes. 6. Tabla de definiciones de la relación afiliados/pensiones y dos gráficos (por pensión y por pensionista).
3. Pensiones por edad y sexo y 8. pensión media por edad y sexo (foto de octubre de 2026, selector de clase). 9. Afiliados por edad y sexo. Cuadro por clase y sexo del último año.
4. Altas y bajas (selector de clase), pensión media de altas y bajas y edad media de las altas de jubilación.

**Financiación y déficit** (`src/modules/financiacion-y-deficit`; datos: `sistema/presupuesto-ss-ejecucion`, `deficit-presupuestario-seguridad-social`, `deficit-sec-fondos-seguridad-social`, `deficit-definiciones`, `gastos-impropios`, `macro/pib-ine`, `internacional/eurostat-espana`, `internacional/ocde-espana`): ingresos y gastos no financieros (millones de euros o % del PIB); composición de los ingresos; gasto en pensiones por clase; definiciones de saldo y su gráfico (tres definiciones) más la serie larga SEC; saldo con y sin transferencias del Estado; cuatro lecturas del saldo del año de la previsión de gastos impropios; tabla de cifras de gastos impropios con su confianza; gasto en pensiones sobre el PIB según cinco medidas.

**Hucha** (`src/modules/hucha`; datos: `sistema/fondo-reserva-series`, `fondo-reserva-anual`, `parametros/fondo-reserva-desembolso-maximo`, `mei-destino`, `normativa/cronologia`, `pensiones-vigor-*`, la ejecución y el PIB): valor del Fondo; dotaciones y disposiciones anuales; meses de gasto con dos definiciones de gasto; normas que regulan el Fondo y límite de desembolso desde el primer año fijado por ley, en % del PIB.

Todos los gráficos llevan título, descripción de qué mide y unidad, tabla de datos, línea de fuente y «Cómo leerlo»; los derivados llevan su cálculo en la nota.

## Qué no se pudo

Ver `docs/PENDIENTE_DATOS.md`, sección «Fase 5-A»: evolución por edades antes de 2026, altas y bajas antes de 2021 y causa de las bajas, relación sin doble cómputo, ejecución anterior a 2017 y Fondo anterior a 2009, saldo contributivo ajustado y gastos impropios observados, transferencias por finalidad, Clases Pasivas, proyecciones (fase 5-B).

## Pruebas

- Unitarias: `src/engine/series-historicas.test.ts`, `sistema-historico.test.ts`, `src/modules/historico/grafico-series.test.ts`.
- Datos y componentes: `src/modules/historico/datos.test.ts` (cobertura de la ejecución, coherencia con `contraste-espana`, sumas) y `paginas.test.tsx` (cada página renderiza; cada gráfico tiene imagen, tabla, fuente y «Cómo leerlo»; selectores).
- Procedencia y cifras: `scripts/historico-5a.test.ts`.
- Playwright: `e2e/historico.spec.ts` (consola, peticiones externas, gráficos y tablas, móvil, axe) y las rutas nuevas en `e2e/sitio.spec.ts`.
