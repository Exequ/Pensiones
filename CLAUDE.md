# CLAUDE.md · Reglas permanentes del proyecto

Web interactiva y didáctica, en español de España, sobre el sistema público de pensiones
español. Sitio estático en <https://exequ.github.io/Pensiones/> (ruta base `/Pensiones/`).
El autor es actuario: **el rigor técnico es prioritario**. Tono divulgativo y neutral.

Estas reglas son obligatorias en todas las fases. Si una regla y una petición chocan, pregunta
o documenta la decisión en `docs/DECISIONES.md`.

## a) Ninguna cifra escrita a mano en la interfaz

- Toda cifra que vea el usuario sale de `/data` (y se formatea con `src/engine/formato.ts`).
- Prohibido escribir números de datos en JSX, CSS o textos (cuantías, porcentajes, años de
  reformas, ratios…). Los textos de `src/modules/secciones.ts` no contienen dígitos (lo
  comprueba un test).
- **Única excepción**: el laboratorio de diseño (`src/design-lab/`, ruta `/diseno`), cuyos datos
  están en `src/design-lab/muestra.json`, marcados como **ficticios**.

## b) Ningún dato sin fuente verificable

- Cada dato procede de una fuente **descargada en la sesión de trabajo** (BOE, Seguridad Social,
  INE, AIReF, Eurostat, OCDE…). **Nunca de la memoria del modelo.**
- Cada dato lleva `source.url`, `fetchedAt` (fecha de descarga) y `confidence`.
- Si una fuente no es accesible, se anota en `docs/PENDIENTE_DATOS.md` con la **URL exacta**,
  la fecha y el motivo. No se rellena el hueco con estimaciones.
- Cada fuente nueva se añade a `docs/FUENTES.md`. Cada afirmación factual del texto, a
  `docs/claims.json`.
- `npm run validate:data` debe pasar siempre.

## c) Neutralidad

- Mostrar las definiciones alternativas con sus datos cuando el resultado depende de cómo se
  mida (p. ej., distintas definiciones de déficit o de la ratio cotizantes/pensionistas).
- Sin adjetivos valorativos ni tono panfletario. Explicar, no persuadir.
- No usar símbolos institucionales (escudos, colores oficiales): no es una web del Gobierno.

## d) Idioma y formato

- Español de España en textos, código (nombres de variables y funciones) y commits. Los nombres
  de componentes del sistema de diseño están en inglés por especificación.
- Formato es-ES con `src/engine/formato.ts`: punto de miles (también en cuatro cifras: `1.680 €`),
  coma decimal, espacio de no separación antes de `€` y `%`, fechas de fuente `AAAA-MM-DD`.
- Comillas angulares («»).

## e) Sistema de diseño «Editorial» (obligatorio)

**Identidad**: sobria, editorial, de periodismo de datos. Ni plantilla, ni aspecto de web
generada por IA, ni aspecto de web oficial.

**Tokens** (`src/styles/tokens.css`, único sitio con literales de color):

| Token                   | Valor     | Uso                                 |
| ----------------------- | --------- | ----------------------------------- |
| `--color-papel`         | `#F6F1E7` | Fondo                               |
| `--color-tinta`         | `#1B1A17` | Texto, ejes, filetes                |
| `--color-tinta-2`       | `#3A372F` | Texto secundario                    |
| `--color-apagado`       | `#6B6458` | Metadatos, fuentes                  |
| `--color-filete`        | `#CFC7B6` | Filetes suaves, «resto» en gráficos |
| `--color-acento`        | `#8C2F1B` | Kicker, enlaces, foco, resaltado    |
| `--color-acento-oscuro` | `#5E1E10` | Enlaces al pasar el ratón           |

- Categórica (en este orden): `--color-cat-1` granate `#8C2F1B`, `-2` azul tinta `#173658`,
  `-3` ocre `#B4811E`, `-4` verde `#4F6D3C`, `-5` gris `#7E7667`. Para **texto** en color de
  categoría usa `--color-cat-ocre-texto` y `--color-cat-gris-texto`.
- Secuencial: `--color-sec-1` … `--color-sec-5` (de papel a granate).
- Resaltado: **un único** elemento en `--color-resaltado` (acento); el resto en
  `--color-resto` (filete).
- Si añades un par de colores nuevo, añádelo a `PARES` en `scripts/lib/paleta.ts`.

**Tipografía**: Newsreader (titulares y lectura) y Public Sans (interfaz, etiquetas, pies,
fuentes), instaladas en local con `@fontsource-variable`. Cifras con
`font-variant-numeric: tabular-nums`. Escala en tokens (`--texto-h1` 56/1,05 peso 500 tracking
−0,02em; `--texto-h2` 28 peso 600; `--texto-lead` 22/1,5; `--texto-cuerpo` 20/1,6; etiquetas
12–14; kicker en mayúsculas con tracking 0,14em en acento), todas con `clamp()` para móvil.

**Maquetación**: contenedor máx. 1232 px con margen lateral de 64 px (24 px en móvil); columna de
texto máx. 760 px; notas al margen de 280 px a la derecha (en línea en móvil, < 960 px).
Separaciones generosas; filetes de 1 px en tinta entre secciones. Responsive de 360 a 1440 px.

**Prohibido**: sombras, degradados, glassmorphism/desenfoques, radios > 2 px (usa
`var(--radio)` = 0), tarjetas con borde izquierdo de color, hero centrado gigante con eslogan,
iconos decorativos, emojis, animaciones y transiciones, estilos en línea (`style=`), colores o
fuentes fuera de los tokens, recursos de dominios externos. Prohibidas también las librerías
Tailwind, shadcn/ui, Material, Chakra, Radix, Recharts o cualquier librería de componentes con
estilo propio (ESLint bloquea sus importaciones). Respeta `prefers-reduced-motion`.

**Accesibilidad**: foco visible de 3 px en acento; objetivos táctiles ≥ 44 px; contraste AA;
HTML semántico (`button`, `a`, `label`, `table` con `th scope`); las tablas son siempre
`<table>`; cada gráfico es un `<figure>` con `<figcaption>` y su tabla de datos alternativa
(el componente `Chart` lo hace por ti).

**Componentes** (`src/components`; úsalos en vez de crear variantes): `DevBanner` (bandera
`MOSTRAR_BANNER_DESARROLLO` en `src/config.ts`; se quita en la Fase 8), `Header`, `Kicker`,
`Lead`, `InteractiveSentence` + `SentenceSelect` + `SentenceValue`, `SegmentedPills`, `Chart`
(Observable Plot con estilo de la casa: ejes en tinta de 1 px, rejilla tenue o ninguna,
etiquetas directas en vez de leyendas, colores con `token()`), `SourceLine` (recibe `Dato`s y
genera «Fuente: título (organismo) · descargado el AAAA-MM-DD · confianza: alta»),
`Definition`, `DataTable`, `MarginNote`, `Footer`, `UnderConstruction`. D3 solo si un gráfico
concreto lo exige, y siempre dentro de `Chart`.

Las comprobaciones automáticas están en `npm run lint` (`check:estilos`, `check:contraste`) y en
Playwright (colores calculados, sombras, radios, foco, 44 px, axe).

## f) Convenciones de código

- TypeScript estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- `src/engine/`: lógica pura, sin React ni DOM, con tests unitarios. Los cálculos van aquí.
- `src/components/`: sistema de diseño; un `.tsx` y un `.css` por componente, clases en español.
- `src/modules/<slug>/`: una carpeta por sección. `src/app/`: estructura y páginas generales.
- `scripts/`: validación y utilidades (se ejecutan con `tsx`).
- Prettier (comillas simples, 100 columnas). ESLint con reglas de tipos estrictas y jsx-a11y.

**Añadir un dato**

1. Descarga la fuente en la sesión y anota la URL exacta y la fecha.
2. Añade el dato o la serie a un JSON de `/data/<carpeta>/` con el formato de `data/README.md`.
3. Registra la fuente en `docs/FUENTES.md` (y la afirmación en `docs/claims.json` si procede).
4. `npm run validate:data`.
5. En la interfaz, importa el JSON, valídalo con el esquema y muestra la cifra con
   `formato.ts` y su `SourceLine`.

**Añadir un módulo (sección)**

1. Añade la sección a `src/modules/secciones.ts` (sin cifras en los textos).
2. Crea `src/modules/<slug>/Pagina.tsx` y regístrala en `src/modules/paginas.ts`.
3. Si tiene cálculos, ponlos en `src/engine/` con tests.
4. La ruta se crea sola; Playwright la recorrerá al añadirla a `SECCIONES`.

## g) Flujo de trabajo

- Una rama y un PR por fase (`feat/fase-N-nombre`), commits pequeños con mensajes claros.
- El PR describe qué se hizo, cómo se probó y las limitaciones conocidas.
- CI en cada PR: lint, typecheck, tests, validate:data, build y Playwright.
- Con el CI en verde y todos los criterios de aceptación cumplidos: merge (squash) a `main` y
  borrado de la rama. El push a `main` despliega en GitHub Pages; hay que comprobar que el
  despliegue termina y que la URL responde.
- Decisiones ante ambigüedades: la opción más sencilla, documentada en `docs/DECISIONES.md`.

## h) Definición de «hecho»

Una fase está hecha solo si:

1. `npm run lint`, `npm run typecheck`, `npm test`, `npm run validate:data` y `npm run build`
   pasan en local y en CI.
2. `npm run test:e2e` pasa (cero errores de consola, cero peticiones externas, sin desbordes,
   axe sin infracciones WCAG AA, todas las rutas recargan bajo `/Pensiones/`).
3. Se han revisado capturas a 1360 px y 390 px de las páginas nuevas o cambiadas.
4. Todo dato nuevo tiene fuente verificable descargada en la sesión, y los huecos están en
   `docs/PENDIENTE_DATOS.md`.
5. Las decisiones están en `docs/DECISIONES.md`.
6. El PR está fusionado, el despliegue ha terminado y la URL pública responde.

## Comandos

```bash
npm run dev            # servidor de desarrollo
npm run lint           # ESLint + Prettier + auditoría de estilos + contraste
npm run typecheck      # tsc -b
npm test               # Vitest
npm run validate:data  # valida /data y docs/claims.json
npm run build          # compilación de producción en dist/
npm run test:e2e       # Playwright (compila y sirve dist/ en :4173)
```
