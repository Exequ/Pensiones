# Estado de la Fase 3-C1

Rama `feat/fase-3c1-incapacidad`. Hecho: Paso 0 (texto neutro de la opción por defecto) y pasos 1 a 8 (reconocimiento, diseño de la interfaz de «prestación», selector, incapacidad permanente con entrada, mapeo, resultado, explicación y lecturas, textos y claims, tests unitarios, de componentes y Playwright, documentación). Nada a medias.

- **Jubilación**: sin cambios de comportamiento ni de enlace. Los tests anteriores (unitarios, de componentes, Playwright y equivalencias con los casos de Sergio) pasan sin cambiar ninguna aserción; solo se ampliaron el helper `FORMULARIO_BASE` (campos nuevos) y `textos-lecturas.test.ts` (cubre las dos prestaciones).
- **Motor**: sin cambios (`src/engine/` solo cambia `comparar-lecturas.ts`, que se generaliza con parámetros opcionales cuyo valor por defecto es la jubilación).
- **Incapacidad permanente**: grados parcial, total, absoluta y gran incapacidad; orígenes enfermedad común y accidente no laboral (accidente de trabajo y enfermedad profesional, desactivados con explicación: el motor necesita una base reguladora calculada fuera). Sin gráfico de bases: el motor de incapacidad no las expone (decisión en `docs/DECISIONES.md`).
- **Enlace**: parámetro `p=inc`; sin `p` es jubilación y el formato `v=1` no cambia.
- **Lecturas**: las seis `incapacidad.*`; con accidente no laboral se muestra siempre `incapacidad.lagunasAccidenteNoLaboral` (provisional) junto al resultado, con estado, motivo y efecto de la alternativa.
- **Casos de oro**: ocho casos de la incapacidad (incluido uno con carrera por tramos) dan lo mismo por el mapeador y por la llamada directa (±0,01) en `scripts/tu-pension-incapacidad-equivalencia.test.ts`.
- **Pruebas** (local): 1.426 de Vitest y 176 de Playwright (escritorio y móvil, axe incluido) pasan; lint, typecheck y build limpios. Capturas revisadas a 1360 y 390 px.
- **Tamaño del chunk del simulador** (`npm run build`): 2.980,94 kB (245,67 kB comprimido); en la 3-B2 eran 2.949,59 kB (238,56 kB). Paquete principal: 274,14 kB (273,97 kB).
- **Afirmaciones**: 5 nuevas en `docs/claims-web.json` (`docs/claims.json` regenerado). Sin fuentes nuevas.
- **Pendiente de datos** (`docs/PENDIENTE_DATOS.md`): fuente descargada que respalde que el grado lo reconoce el organismo competente (frase del aviso pedida en el encargo); no se registra como afirmación verificada.
- **Pendiente para fases siguientes**: supervivencia (3-C2), no contributivas y MEI (3-C3), reducción del chunk (3-D), exponer `basesPeriodo` en el motor de incapacidad para tener gráfico.
