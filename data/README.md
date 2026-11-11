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

Fase 0: todavía no hay datos reales. Los ejemplos de los tests están en
`scripts/fixtures/` y **no** deben copiarse aquí.

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
