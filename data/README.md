# Datos versionados

Cada fichero JSON de esta carpeta sigue el esquema `ArchivoDatos` de
[`src/engine/esquema-datos.ts`](../src/engine/esquema-datos.ts) y se comprueba con
`npm run validate:data`, que falla si algún valor numérico no tiene una fuente con URL y
fecha de descarga (`fetchedAt`).

| Carpeta          | Contenido                                                         |
| ---------------- | ----------------------------------------------------------------- |
| `normativa/`     | Parámetros fijados por ley o reglamento (con referencia al BOE).  |
| `parametros/`    | Parámetros anuales del sistema: bases, topes, revalorización…     |
| `sistema/`       | Estadísticas del sistema: pensiones, gasto, ingresos, afiliación. |
| `demografia/`    | Población, esperanza de vida y proyecciones.                      |
| `internacional/` | Indicadores comparables de otros países.                          |

Los ejemplos de los tests están en `scripts/fixtures/` y **no** deben copiarse aquí.

## Contenido (Fase 1A)

| Fichero (carpeta `parametros/`)                                                                                                                                                                   | Contenido                                                                   | Periodo                          | Unidad               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------- | -------------------- |
| `edad-ordinaria-jubilacion`, `carencia-jubilacion`, `periodo-calculo-base-reguladora`, `divisor-base-reguladora`, `escala-porcentajes-jubilacion`, `carrera-jubilacion-65`, `cotizacion-para-100` | Reglas de la jubilación contributiva                                        | 2000-2040 aprox.                 | meses / reglas       |
| `ipc-*`                                                                                                                                                                                           | IPC del INE (índice medio, variación media y de diciembre)                  | 2002-2025 (diciembre desde 2000) | índice / %           |
| `base-maxima-rg`, `base-minima-rg`                                                                                                                                                                | Bases de cotización del Régimen General (mínima: grupos 4-7)                | 2000-2026                        | euros/mes            |
| `tipo-cc-empresa`, `tipo-cc-trabajador`                                                                                                                                                           | Tipo de contingencias comunes                                               | 2000-2026                        | %                    |
| `mei-tipo-*`                                                                                                                                                                                      | Mecanismo de Equidad Intergeneracional (total, empresa y trabajador)        | 2023-2029                        | puntos porcentuales  |
| `cuota-solidaridad-tipos`                                                                                                                                                                         | Cotización adicional de solidaridad, por tramo                              | 2025-2026                        | %                    |
| `revalorizacion-general`                                                                                                                                                                          | Revalorización anual de las pensiones                                       | 2000-2026                        | %                    |
| `pension-maxima`                                                                                                                                                                                  | Límite máximo de percepción                                                 | 2000-2026                        | euros/mes (14 pagas) |
| `pension-minima-{jubilacion,incapacidad,viudedad,orfandad-familiares}`                                                                                                                            | Cuantías mínimas por clase y situación familiar (id: `año-clase-situación`) | 2001-2026                        | euros/año            |
| `limite-ingresos-complementos-minimos`                                                                                                                                                            | Límite de ingresos de los complementos por mínimos                          | 2012-2026                        | euros/año            |
| `pnc-importe-anual`                                                                                                                                                                               | Pensión no contributiva                                                     | 2001-2026                        | euros/año            |
| `complemento-brecha-genero`                                                                                                                                                                       | Complemento por hijo                                                        | 2023-2026                        | euros/mes            |
| `smi-diario`, `smi-mensual`                                                                                                                                                                       | Salario mínimo interprofesional                                             | 2000-2026                        | euros/día, euros/mes |
| `iprem-*`                                                                                                                                                                                         | IPREM                                                                       | 2004-2023 (con huecos)           | euros/día, mes, año  |

`normativa/cronologia.json` (19 normas, 1985-2026, con antes/después/transición) y `normativa/prestaciones.json` (16 prestaciones: a quién cubre, requisitos, fórmula, límites, duración y compatibilidades, con artículo del TRLGSS).

Los huecos y lo que no se pudo descargar están en [`docs/PENDIENTE_DATOS.md`](../docs/PENDIENTE_DATOS.md). Toda la extracción de tablas la hacen los scripts de [`scripts/etl/`](../scripts/etl) (Python, con `python3 -I`) a partir de los documentos descargados; cada dato lleva la cita literal (`quote`) y su localización. `docs/INFORME_VERIFICACION.md` y `docs/DISCREPANCIAS.md` recogen el contraste con segundas fuentes.

## Formato

```jsonc
{
  "id": "identificador-del-fichero",
  "title": "Título legible",
  "description": "Qué contiene y cómo se ha obtenido",
  "data": [
    {
      "id": "identificador-del-dato",
      "value": 0, // número o texto
      "unit": "euros/mes",
      "period": "2025", // o "2025-T1"
      "source": { "title": "…", "publisher": "…", "url": "https://…", "docId": "opcional" },
      "fetchedAt": "AAAA-MM-DD", // o fecha y hora ISO con zona
      "confidence": "alta", // alta | media | baja
      "notes": "opcional",
    },
  ],
  "series": [
    {
      "id": "…",
      "title": "…",
      "unit": "…",
      "source": { "title": "…", "publisher": "…", "url": "https://…" },
      "fetchedAt": "AAAA-MM-DD",
      "confidence": "alta",
      "points": [{ "period": "2024", "value": 0 }],
    },
  ],
}
```
