# Estado de la Fase 1C

Rama `claude/fase-1c-internacional`, un PR. Hecho:

- **A. Comparativa internacional (`data/internacional/`)**: OCDE «Pensions at a Glance» por API SDMX (13 áreas, todos los indicadores del flujo, con literal de cada código) y datos de España; Eurostat (gasto en pensiones, pobreza o exclusión de mayores, empleo de 55 a 64 años y duración de la vida laboral); estructura de nueve sistemas de pensiones con citas literales de las fichas del Ageing Report 2024; contraste de España (OCDE frente a datos propios).
- **B. Catálogo de afirmaciones circulantes (`data/mitos/`)**: 12 afirmaciones sin veredicto, con referencias a /data validadas por `validate:data`.
- **C. Auditoría**: `docs/AUDITORIA_DATOS.md`; cruces entre carpetas (el complemento a mínimos explica la diferencia del gasto con número × pensión media × 14); comprobación de 30 URLs; `docs/REVISION_ACTUARIAL.md` ampliado (38 afirmaciones).
- **Verificación**: `scripts/etl/verificacion_1c.py` (12 comprobaciones, 0 fallos; `docs/INFORME_VERIFICACION.md` y `docs/verificacion-1c.json`) y `scripts/coherencia-internacional.test.ts`.

Scripts nuevos: `ocde_pag.py`, `eurostat_int.py`, `paises_fichas.py`, `contraste_espana.py`, `mitos.py`, `auditoria.py`, `comprobar_urls.py`, `verificacion_1c.py` (y `fuentes_claims.py` ampliado).

Pendiente (ver `docs/PENDIENTE_DATOS.md` y `docs/DESCARGAS_MANUALES.md`): perfiles de país de la OCDE (403), Reino Unido y Estados Unidos sin descripción del sistema, tasa de reposición al 150 %, historiales de cotización (MCVL).
