"""Genera docs/FUENTES.md (todas las fuentes usadas en /data) y docs/claims.json (afirmaciones para revisión actuarial)."""

import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import HOY, REPO  # noqa: E402

fuentes = {}


def anota(src, fichero, fecha=HOY):
    url = src['url']
    e = fuentes.setdefault(url, {'src': src, 'ficheros': set(), 'fecha': fecha})
    e['ficheros'].add(fichero)


claims = []
huellas = []
MITO_PREGUNTAS = {}
CLAIMS_SERIES_NUEVAS = {
    ('salario-medio-definiciones', 'eaes-ambos'), ('salario-medio-definiciones', 'etcl-coste-salarial-total'),
    ('salario-medio-definiciones', 'cn-remuneracion-por-asalariado-puesto'), ('salario-medio-definiciones', 'base-media-cotizacion-rg-ambos'),
    ('pib-ine', 'pib-corriente'), ('esperanza-vida-anual', 'esperanza-vida-65-hombres'), ('esperanza-vida-anual', 'esperanza-vida-65-mujeres'),
    ('fecundidad-indicadores', 'icf-ambas'), ('proyecciones-hipotesis', 'icf-proyectado'), ('ageing-report-2024-espana', 'ageing-report-2024-ii-1-64'),
    ('migraciones-exterior-anual', 'saldo-exterior-ambos-publicado-emcr'),
    ('eurostat-espana', 'gasto-old-srv-no-aplica-no-aplica-pc-gdp'), ('eurostat-espana', 'pobreza-o-exclusion-total-y-ge65-pc'),
    ('ocde-espana', 'pep-no-aplica-z-z-pt-b1gq'), ('ocde-espana', 'elmea-hombres-z-z-y'),
    ('contraste-espana', 'pension-altas-sobre-salario-eaes'), ('contraste-espana', 'gasto-pensiones-contributivas-sobre-pib'),
}
CLAIMS_DATOS_NUEVOS = {('triangulacion-mortalidad', 'supervivencia-publicada-sobre-qx-hombres-85-2010-2020'), ('triangulacion-mortalidad', 'supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020'), ('triangulacion-mortalidad', 'factor-real-sobre-qx-mujeres-85-2010-2019'), ('triangulacion-mortalidad', 'muertes-implicitas-pensiones-jubilacion-lexis'), ('triangulacion-mortalidad', 'ine-tablas-recalculo-censo-2021'), ('ocde-supuestos-reposicion', 'ocde-pag-entrada-mercado-laboral-22'), ('ocde-espana', 'gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024'), ('ocde-espana', 'nprr100-hombres-z-m-pt-earn-n-pre-ret-inc-2024'), ('ocde-espana', 'crplf22-hombres-z-z-y-2024')}
SERIES_CLAIM = {'pensionistas', 'pensiones', 'total-ambos', 'jubilacion-ambos', 'media-anual-total-sistema', 'diciembre-total-sistema', 'afiliados-diciembre-por-pensionista', 'afiliados-media-anual-por-pension', 'edad-media-altas-jubilacion', 'valor-fin-ano', 'saldo-presupuestario-no-financiero', 'b9-mio-eur', 'pasivos-financieros', 'transferencias-estado-corrientes', 'afiliados-por-pension-alternativa-1'}


def añade(id_, texto, ubic, datos, src, conf):
    claims.append({'id': id_, 'texto': texto, 'ubicacion': ubic, 'datos': datos, 'fuentes': [src], 'fetchedAt': HOY,
                   'estado': 'verificada' if conf == 'alta' else 'pendiente', 'revisionActuarial': 'pendiente'})


def num(v):
    return str(v).replace('.', ',')


for ruta in sorted(glob.glob(f'{REPO}/data/*/*.json')):
    rel = os.path.relpath(ruta, f'{REPO}/data')
    with open(ruta, encoding='utf-8') as f:
        d = json.load(f)
    for x in d.get('data', []):
        anota(x['source'], rel, x.get('fetchedAt', HOY))
        if x.get('crossCheck'):
            anota(x['crossCheck']['source'], rel)
    for s in d.get('series', []):
        anota(s['source'], rel)
    if d.get('tipo') == 'tabla':
        anota(d['source'], rel, d.get('fetchedAt', HOY))
        for o in d.get('origenes', []):
            anota({'title': f"{d['source']['title']} (fichero del periodo {o['period']})", 'publisher': d['source']['publisher'], 'url': o['url']}, rel, d.get('fetchedAt', HOY))
            huellas.append((d['id'], o['period'], o['url'], o['sha256']))
    for n in d.get('normas', []):
        anota(n['source'], rel)
    for p in d.get('prestaciones', []):
        anota(p['source'], rel)
        for a in p.get('fuentesAdicionales', []):
            anota(a, rel)
    carpeta = rel.split('/')[0]
    if carpeta == 'sistema':
        for sr in d.get('series', []):
            if sr['id'] in SERIES_CLAIM:
                u = sr['points'][-1]
                v = u['value']
                txt = f"{sr['title']}: {num(round(v, 2) if isinstance(v, float) else v)} ({sr['unit']}) en {u['period']}."
                añade(f"sistema-{d['id']}-{sr['id']}", txt, 'Datos del sistema (módulos «Financiación y déficit», «Cotizantes por pensionista»)',
                      [f"{rel}#{sr['id']}"], sr['source'], sr['confidence'])
    if carpeta in ('macro', 'demografia', 'internacional'):
        for sr in d.get('series', []):
            if (d['id'], sr['id']) in CLAIMS_SERIES_NUEVAS:
                u = sr['points'][-1]
                v = u['value']
                txt = f"{sr['title']}: {num(round(v, 2) if isinstance(v, float) else v)} ({sr['unit']}) en {u['period']}."
                añade(f"{carpeta}-{d['id']}-{sr['id']}", txt, 'Datos demográficos y macroeconómicos (Fase 1B-3)', [f"{rel}#{sr['id']}"], sr['source'], sr['confidence'])
    if carpeta in ('internacional', 'demografia'):
        for x in d.get('data', []):
            if (d['id'], x['id']) in CLAIMS_DATOS_NUEVOS:
                texto = x['value'] if isinstance(x['value'], str) else f"{x['notes'].split('. ')[0]}: {num(x['value'])} ({x['unit']}) en {x['period']}."
                añade(f"{carpeta}-{d['id']}-{x['id']}", texto, 'Comparativa internacional (Fase 1C)' if carpeta == 'internacional' else 'Triangulación de la mortalidad (Fase 1B-4)', [f"{rel}#{x['id']}"], x['source'], x['confidence'])
        if d['id'] == 'paises-sistemas':
            for x in d['data']:
                añade(f"internacional-{x['id']}", f"{x['source']['title'].split('for ')[-1]}: {x['value']}.", 'Comparativa internacional: fichas de país (Fase 1C)', [f"{rel}#{x['id']}"], x['source'], x['confidence'])
    if carpeta == 'mitos':
        for m in d['mitos']:
            refs = [r for r in m['datos'] if '#' in r]
            fich, ide = refs[0].split('#')
            o = json.load(open(f'{REPO}/data/{fich}', encoding='utf-8'))
            el = next(e for e in o.get('data', []) + o.get('series', []) if e['id'] == ide)
            añade(f"mito-{m['id']}", f"Afirmación circulante: {m['enunciado']} El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.", 'Catálogo de afirmaciones circulantes (Fase 1C)', refs, el['source'], 'media')
            claims[-1]['estado'] = 'pendiente'
            MITO_PREGUNTAS[f"mito-{m['id']}"] = m['preguntaActuarial']
    if carpeta == 'sistema' and d['id'] == 'gastos-impropios':
        x = d['data'][0]
        añade('sistema-gastos-impropios-previstos-2023', f"{x['quote'][0].upper()}{x['quote'][1:]} (previsión de 2020, no dato observado).", 'Financiación y déficit (Fase 1B-3)', [f"{rel}#{x['id']}"], x['source'], x['confidence'])
    if carpeta == 'parametros' and d.get('data'):
        # una afirmación por serie: el dato más reciente
        x = sorted(d['data'], key=lambda z: (z['period'], z['id']))[-1]
        añade(f"param-{d['id']}", f"{d['title']}: {num(x['value'])} ({x['unit']}) en {x['period']}.", 'Datos de parámetros (módulo «Cómo se calcula» y «Metodología»)',
              [f"{rel}#{x['id']}"], x['source'], x['confidence'])
    for n in d.get('normas', []):
        añade(f"norma-{n['id']}", n['resumen'], 'Módulo «Reformas» (cronología)', [f"{rel}#{n['id']}"], n['source'], n['confidence'])
    for p in d.get('prestaciones', []):
        añade(f"prest-{p['id']}", p['aQuienCubre'], 'Módulo «Tipos de pensión»', [f"{rel}#{p['id']}"], p['source'], p['confidence'])

# ---------------------------------------------------------------------------------------------
# Revisión actuarial (C3 de la Fase 1B-3). Solo las afirmaciones de esta lista requieren criterio
# actuarial; el resto no lleva `revisionActuarial` y hereda `revisionActuarialPorDefecto` = «no-requiere»
# (transcripción literal de una norma o de una cifra publicada, contrastada con su fuente).
# ---------------------------------------------------------------------------------------------
REVISION = {
    # Reglas de cálculo de la pensión de jubilación
    'param-escala-porcentajes-jubilacion': 'Comprobar que la escala de porcentajes por años cotizados vigente en 2027 reproduce el art. 210 TRLGSS. Fórmula: recalcular el porcentaje con data/parametros/escala-porcentajes-jubilacion (50 % a los 15 años; 0,19 % por mes del 1 al 248 y 0,18 % por los 16 siguientes) para 15, 25, 35 y 38,5 años y verificar que el 100 % se alcanza en el número de meses que fija la norma y que cuadra con carrera-jubilacion-65.',
    'param-divisor-base-reguladora': 'Comprobar la relación entre el divisor y el número de bases computadas: divisor = meses computados × 14 / 12 (378 = 324 × 14/12 en 2037). Verificar año a año (data/parametros/divisor-base-reguladora y periodo-calculo-base-reguladora) que cada divisor sale de esa fórmula y que el redondeo es el de la norma.',
    'param-periodo-calculo-base-reguladora': 'Comprobar la regla «ventana de N meses de la que se toman las M bases de mayor importe» (en 2037, ventana de 348 meses y 324 bases): confirmar con el art. 209 TRLGSS y la DT 4.ª que N y M de cada año son los de la norma y que los meses descartados (24) se elijen por mayor base, no por antigüedad.',
    'param-lagunas-integracion': 'Comprobar la integración de lagunas por versión (48 meses al 100 % de la base mínima y el resto al 50 %; en 2026 cambia la referencia de la base mínima): ejemplo numérico con una carrera con 60 meses de laguna usando data/parametros/lagunas-integracion y base-minima-rg, y contrastar con art. 209.1.b TRLGSS y las versiones 2010, 2013 y 2016.',
    'param-actualizacion-bases': 'Comprobar la actualización de las bases de cotización por versión (meses sin actualizar e índice de referencia): reproducir la actualización de una carrera de ejemplo con data/parametros/actualizacion-bases y el IPC de data/parametros/ipc-*, y verificar que los 24 meses más recientes se computan nominalmente en la versión de 2026.',
    'param-opcion-25-anos-ventana': 'Comprobar la opción de 25 años de la DT 4.ª.7 TRLGSS: que la ventana (en 2043, 318 meses) y su divisor (371) son los de la norma, la regla de 2041-2043 y qué ocurre con el 31/12/2040, que la DT deja ambiguo (decisión documentada en docs/DECISIONES.md). Fórmula: divisor = ventana × 14/12 cuando se computan todas las bases.',
    'param-opcion-25-anos-divisor': 'Comprobar el divisor de la opción de 25 años (en 2043, 371) frente a ventana × 14/12 (318 × 14/12 = 371) y frente a lo que dice literalmente la DT 4.ª.7; confirmar el redondeo y los años 2026-2040 (300 meses, divisor 350).',
    # Reglas de evolución
    'param-pension-minima-regla': 'Comprobar la regla de la DA 53.ª TRLGSS: reducción de la brecha entre la cuantía de referencia y el umbral de pobreza de un hogar de dos adultos (20 %, 30 %, 50 % y 100 % en 2024-2027 según data/parametros/pension-minima-regla). Verificar que esos porcentajes, el multiplicador del umbral unipersonal (1,5) y el factor del resto de mínimas (50 %) son los de la norma, y recalcular la mínima de jubilación con cónyuge a cargo de 2027 con la fórmula.',
    'param-revalorizacion-regla': 'Comprobar el art. 58 TRLGSS vigente: meses de IPC, último mes de medición (noviembre), suelo e indicadores de data/parametros/revalorizacion-regla; recalcular la revalorización de 2024, 2025 y 2026 con data/parametros/ipc-variacion-* y comparar con revalorizacion-general.',
    'param-base-maxima-incremento-futuro': 'Comprobar la DT 38.ª TRLGSS: la base máxima crece cada año el porcentaje de revalorización más 1,2 puntos (2024-2050). Verificar que la base máxima de 2026 de data/parametros/base-maxima-rg es la de 2025 × (1 + (revalorización + 1,2)/100) y la lectura «acumulativa» (efecto compuesto) frente a la alternativa de sumar siempre sobre la cifra inicial.',
    'param-pension-maxima-incremento-futuro': 'Comprobar la DT 39.ª TRLGSS: la pensión máxima inicial crece el porcentaje de revalorización más 0,115 puntos (2025-2050). Verificar con data/parametros/pension-maxima que 2025 y 2026 cuadran y justificar la lectura compuesta frente a la lineal (decisión documentada en docs/DECISIONES.md).',
    'param-mei-tipo-total': 'Comprobar la senda del Mecanismo de Equidad Intergeneracional (0,6 puntos en 2023 hasta 1,2 en 2029; empresa 0,5 a 1,0 y trabajador 0,1 a 0,2): que data/parametros/mei-tipo-total, mei-tipo-empresa y mei-tipo-trabajador suman y se reparten como dice el art. 127 bis TRLGSS y sobre qué base de cotización se aplica (contingencias comunes, con topes).',
    'param-mei-destino': 'Comprobar la afirmación sobre el destino del MEI (art. 127 bis: nutre el Fondo de Reserva y no computa a efectos de prestaciones). Contrastar la recaudación (derechos reconocidos de «Mecanismo de Equidad Intergeneracional» en la ejecución del presupuesto) con las dotaciones anuales del Fondo de data/sistema/fondo-reserva-series y explicar la diferencia.',
    # Definiciones
    'sistema-relacion-afiliados-pensiones-afiliados-diciembre-por-pensionista': 'Comprobar el significado de la relación afiliados/pensionistas: el numerador son afiliados (relaciones laborales, con pluriempleo, y media mensual de diciembre) y el denominador pensionistas (personas) a 1 de diciembre; no son cotizantes ni personas ocupadas. Comparar las cuatro definiciones de data/sistema/relacion-afiliados-pensiones y la Alternativa 1 (último día de diciembre entre pensiones a 1 de enero) y decidir cuál se usa en el modelo; las alternativas sin doble cómputo están en PENDIENTE_DATOS.',
    'sistema-relacion-afiliados-pensiones-alternativa-1-afiliados-por-pension-alternativa-1': 'Comprobar la definición de la Alternativa 1: afiliados a último día de diciembre del año t entre pensiones en vigor a 1 de enero de t+1 (data/sistema/relacion-afiliados-pensiones-alternativa-1). Verificar que el numerador es el total del sistema a último día (incluye empleados de hogar y regímenes especiales) y que las pensiones de enero (fichero REG) son un stock a 1 de enero; calcular la diferencia con la definición con datos de diciembre.',
    'sistema-pensionistas-pensiones-historico-pensionistas': 'Comprobar la diferencia entre pensionistas (personas) y pensiones (una persona puede percibir varias: 10.434.856 pensiones para 9.438.579 pensionistas en 2025, 1,11 pensiones por pensionista, según data/sistema/pensionistas-pensiones-historico): qué denominador corresponde a cada uso (gasto por persona, ratio de dependencia, tasa de reposición) y cómo se trata la acumulación de viudedad con jubilación.',
    'sistema-deficit-presupuestario-seguridad-social-saldo-presupuestario-no-financiero': 'Comprobar la definición de déficit presupuestario: derechos reconocidos netos menos obligaciones reconocidas por operaciones no financieras (excluye pasivos financieros y préstamos del Estado), frente al saldo con transferencias del Estado y al saldo contributivo ajustado. Contrastar con data/sistema/deficit-definiciones y deficit-presupuestario-seguridad-social.',
    'sistema-deficit-sec-fondos-seguridad-social-b9-mio-eur': 'Comprobar la definición SEC 2010 (B.9, capacidad o necesidad de financiación del subsector Fondos de la Seguridad Social, S.1314): criterios de devengo y de sectorización frente al saldo presupuestario; ruptura de 2002 por la sanidad (docs/DISCREPANCIAS.md). Contrastar 2025 con data/sistema/deficit-presupuestario-seguridad-social.',
    'sistema-fondo-reserva-series-valor-fin-ano': 'Comprobar el criterio de valoración del Fondo de Reserva: el informe a las Cortes lo da a precio de adquisición (no a mercado). Contrastar el valor de 31 de diciembre con dotaciones, rendimientos y disposiciones de data/sistema/fondo-reserva-series (diferencias por redondeo de hasta 2 millones) y decidir qué valoración usa el modelo.',
    'macro-salario-medio-definiciones-eaes-ambos': 'Comprobar el concepto y la cobertura de la ganancia media anual de la EAES (devengos brutos anuales por asalariado, centros de cotización de industria, construcción y servicios con alta todo el mes de octubre; excluye agricultura y parte de las Administraciones Públicas) y su idoneidad como proxy del salario de la carrera; calcular su razón con la base máxima (data/macro/salario-medio-razon-base-maxima).',
    'macro-salario-medio-definiciones-etcl-coste-salarial-total': 'Comprobar el concepto de la ETCL (coste salarial por trabajador y mes, media de trimestres) y la conversión a año (12 veces la media mensual, sin pagas aparte porque los pagos extraordinarios van en el trimestre en que se pagan); verificar frente a la EAES en los años comunes (2008-2024) y su cobertura sectorial.',
    'macro-salario-medio-definiciones-cn-remuneracion-por-asalariado-puesto': 'Comprobar que la remuneración de asalariados de la Contabilidad Nacional incluye cotizaciones sociales del empleador (no es salario bruto) y que dividida por asalariados (puestos, ETC o personas) da tres cifras distintas; decidir qué denominador y qué ajuste (restar cotizaciones empresariales) se necesita para compararla con la EAES o con la base media.',
    'macro-salario-medio-definiciones-base-media-cotizacion-rg-ambos': 'Comprobar que la base media de cotización (Régimen General, contingencias comunes, personas físicas con al menos un día cotizado, topada por la base máxima y sin agrario, hogar ni artistas) no es un salario: está topada, mezcla jornadas y meses parciales y solo existe desde 2018 en el fichero descargado. Valorar su uso para la tasa de reposición y el efecto del tope (razón con la base máxima).',
}
REVISION['internacional-ocde-espana-gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024'] = 'Comprobar la comparabilidad de la tasa de reposición teórica bruta de la OCDE (carrera completa desde los 22 años, pensión obligatoria, 100 % del salario medio, parámetros de 2024) con una tasa calculada con las reglas propias (data/parametros: escala de porcentajes, periodo de cálculo, actualización de bases, pensión máxima) y con los cocientes empíricos de data/internacional/contraste-espana; en concreto, qué supuestos de crecimiento del salario y de indexación hay detrás del 80,4 % y si la tasa neta (86,3 %) usa los mismos impuestos y cotizaciones que el cálculo propio.'
REVISION['internacional-contraste-espana-pension-altas-sobre-salario-eaes'] = 'Comprobar que el cociente entre la pensión media de las altas de jubilación (14 pagas) y la ganancia media de la EAES no es una tasa de reposición: mezcla carreras de distinta duración y compara con el salario de todos los trabajadores del ámbito de la EAES. Decidir si debe usarse como referencia empírica de sensibilidad frente a la tasa teórica de la OCDE y con qué definición de salario (EAES, ETCL, Contabilidad Nacional, base media).'
REVISION['internacional-contraste-espana-gasto-pensiones-contributivas-sobre-pib'] = 'Comprobar la delimitación del gasto: la fila «suma de pensiones» de la ejecución (obligaciones reconocidas) excluye Clases Pasivas, pensiones no contributivas y el complemento a mínimos (que va en otra fila, ver docs/INFORME_VERIFICACION.md). Decidir qué delimitación comparable con OCDE, Eurostat y Ageing Report usará el modelo.'
REVISION['demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-hombres-85-2010-2020'] = 'Comprobar que el desfase entre la supervivencia publicada y Π(1 − qx) se debe a la convención de edades: qx es la probabilidad entre las edades exactas x y x+1, y la cohorte con x años cumplidos a 1 de enero pasa durante el año de edad exacta media x+0,5 a x+1,5. Reproducir con data/demografia/triangulacion-cohortes y triangulacion-factor-qx el factor medio (defunciones registradas de la generación / población × qx, 1,04 a 1,08) y compararlo con (qx + qx+1)/2 ÷ qx; decidir si el modelo debe usar qx desplazado, la probabilidad de Lexis o una conversión desde la tasa central mx.'
REVISION['demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020'] = 'Valorar el residuo que queda en hombres de 85 años en 2010-2020 tras la convención de Lexis (supervivencia publicada algo inferior a la de la tabla y a la de las defunciones registradas de la generación): comprobar si se debe al ajuste intercensal de 2012-2020, a la migración o a la población de partida, comparando las ventanas de data/demografia/triangulacion-cohortes (2000-2010, 2010-2020, 2015-2020 y 2021-2024) y decidir si el modelo debe corregir la población de edades altas o solo qx.'
REVISION['demografia-triangulacion-mortalidad-factor-real-sobre-qx-mujeres-85-2010-2019'] = 'Comprobar el factor entre las defunciones registradas de la cohorte y población × qx (mujeres de 85 años, media 2010-2019) y su estabilidad por edad y año (mínimo y máximo en data/demografia/triangulacion-factor-qx); decidir si un factor constante desde los 75 años (como el 1,07 a 1,10 del modelo) es una aproximación aceptable de la corrección de Lexis o si debe variar con la edad (la pendiente de qx).'
REVISION['demografia-triangulacion-mortalidad-muertes-implicitas-pensiones-jubilacion-lexis'] = 'Conciliar las muertes implícitas en las tablas entre las pensiones de jubilación (aproximación con la distribución por edad de octubre de 2026) con las bajas definitivas de jubilación de 2025 de la Seguridad Social: la fuente no desglosa las causas de baja (fallecimiento u otras) y las pensiones no son pensionistas. Determinar qué dato haría falta (pensionistas por edad simple y causa de baja) y si la diferencia restante es relevante para el modelo.'
REVISION['demografia-triangulacion-mortalidad-ine-tablas-recalculo-censo-2021'] = 'Confirmar con el INE qué años de la serie de tablas 1991-2024 cambiaron en la edición de noviembre de 2023 (la metodología indica que se recalcularon las series intercensales de 2012-2020 con el censo de 2021 y que las de 1981-2001 se recalcularon en 2014) y comparar las tablas actuales con la edición anterior para medir el cambio en qx de las edades altas.'
REVISION['internacional-ocde-supuestos-reposicion-ocde-pag-entrada-mercado-laboral-22'] = 'Los metadatos accesibles de la OCDE solo dicen que la tasa de reposición teórica se calcula para trabajadores que entran en el mercado laboral a los 22 años; no figuran el crecimiento real de los salarios, la inflación ni la carrera. Obtener la metodología de «Pensions at a Glance» y comprobar esos supuestos antes de comparar la tasa teórica de la OCDE con una tasa calculada con las reglas propias.'
REVISION_POR_DEFECTO = 'no-requiere'

ORG = {'Boletín Oficial del Estado (BOE)': 'BOE', 'Instituto Nacional de Estadística (INE)': 'INE'}
filas = ['# Fuentes', '',
         'Registro de las fuentes consultadas. Cada fila corresponde a un documento descargado en una sesión de trabajo; nunca a datos recordados. La fecha es la de descarga (`fetchedAt`). Generado por `scripts/etl/fuentes_claims.py` a partir de `/data`.', '',
         '| Organismo | Documento | URL | Descargado | Ficheros de `/data` que lo usan |', '| --------- | --------- | --- | ---------- | ------------------------------- |']
for url, e in sorted(fuentes.items(), key=lambda kv: (kv[1]['src']['publisher'], kv[0])):
    s = e['src']
    t = s['title'].replace('|', '/')
    filas.append(f"| {ORG.get(s['publisher'], s['publisher'])} | {t} | <{url}> | {e['fecha'][:10]} | {', '.join(sorted(e['ficheros']))} |")
filas += ['', '## Huellas de los ficheros brutos (tablas)', '',
          'SHA-256 de cada fichero descargado que alimenta una tabla de `/data` (los ficheros de hasta 5 MB están en `data-raw/`; los mayores no se versionan y se localizan por URL y huella).', '',
          '| Tabla | Periodo | URL | SHA-256 |', '| ----- | ------- | --- | ------- |']
for tabla, per, url, sha in huellas:
    filas.append(f'| {tabla} | {per} | <{url}> | `{sha}` |')
with open(f'{REPO}/docs/FUENTES.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(filas) + '\n')
REVISION.update(MITO_PREGUNTAS)
ids = {c['id'] for c in claims}
faltan = sorted(set(REVISION) - ids)
assert not faltan, f'Ids de REVISION sin afirmación: {faltan}'
for c in claims:
    if c['id'] in REVISION:
        c['revisionActuarial'] = 'pendiente'
        c['preguntaActuarial'] = REVISION[c['id']]
    else:
        c.pop('revisionActuarial', None)   # hereda revisionActuarialPorDefecto
with open(f'{REPO}/docs/claims.json', 'w', encoding='utf-8') as f:
    json.dump({'version': 1,
               'descripcion': 'Registro de afirmaciones factuales con sus fuentes. Lo valida npm run validate:data. Generado por scripts/etl/fuentes_claims.py a partir de /data. '
                              'Las afirmaciones con revisionActuarial «pendiente» llevan preguntaActuarial (lista en docs/REVISION_ACTUARIAL.md); el resto hereda revisionActuarialPorDefecto: '
                              '«no-requiere» (no requiere revisión actuarial: transcripción literal de una norma o de una cifra publicada, contrastada con su fuente).',
               'revisionActuarialPorDefecto': REVISION_POR_DEFECTO, 'claims': claims}, f, ensure_ascii=False, indent=2)
    f.write('\n')

por_id = {c['id']: c for c in claims}
md = ['# Revisión actuarial', '',
      'Lista de las afirmaciones de `docs/claims.json` que requieren criterio actuarial (no son la transcripción literal de una norma o de una cifra publicada): reglas de cálculo de la pensión de jubilación, '
      'reglas de evolución futura, definiciones y las definiciones de salario medio. Para cada una: el identificador del claim, qué se afirma y una pregunta concreta sobre qué debe comprobar el actuario y con qué dato o fórmula. '
      'Generado por `scripts/etl/fuentes_claims.py` (diccionario `REVISION`); la pregunta también está en el campo `preguntaActuarial` de `docs/claims.json`.', '',
      f'**Resto de afirmaciones ({len(claims) - len(REVISION)})**: no llevan `revisionActuarial` y heredan `revisionActuarialPorDefecto: "no-requiere"` — no requieren revisión actuarial (transcripción literal de una norma o de una cifra publicada, contrastada con su fuente). '
      'Para cambiar el estado de una afirmación basta con añadirle `revisionActuarial` (`revisada`, `rechazada` o `pendiente` con `preguntaActuarial`); `npm run validate:data` exige la pregunta en las pendientes.', '',
      'Para marcar una revisión: poner `revisionActuarial: "revisada"` (o `"rechazada"`) en la afirmación de `docs/claims.json` y anotar el criterio en `notas`.', '']
grupos = [('Reglas de cálculo de la pensión de jubilación', [i for i in REVISION if i.startswith('param-') and any(k in i for k in ('escala', 'divisor', 'periodo', 'lagunas', 'actualizacion', 'opcion'))]),
          ('Reglas de evolución (mínimas, revalorización, base y pensión máximas, MEI)', [i for i in REVISION if i.startswith('param-') and any(k in i for k in ('minima', 'revalorizacion', 'incremento', 'mei'))]),
          ('Definiciones (ratio afiliados/pensionistas, pensionistas y pensiones, déficit, Fondo de Reserva)', [i for i in REVISION if i.startswith('sistema-')]),
          ('Definiciones de salario medio', [i for i in REVISION if i.startswith('macro-')]),
          ('Comparativa internacional (comparabilidad de la tasa de reposición y del gasto)', [i for i in REVISION if i.startswith('internacional-') and not i.startswith('internacional-ocde-supuestos')]),
          ('Afirmaciones circulantes (definiciones de cada una)', [i for i in REVISION if i.startswith('mito-')]),
          ('Mortalidad en edades altas y supuestos de la OCDE', [i for i in REVISION if i.startswith(('demografia-', 'internacional-ocde-supuestos'))])]
n = 0
for tit, lista in grupos:
    md += [f'## {tit}', '']
    for i in lista:
        n += 1
        md += [f'### {n}. `{i}`', '', f'**Afirmación**: {por_id[i]["texto"]}', '', f'**Qué debe comprobar el actuario**: {REVISION[i]}', '',
               f'**Datos**: {", ".join(por_id[i]["datos"])}', '']
assert n == len(REVISION), (n, len(REVISION))
with open(f'{REPO}/docs/REVISION_ACTUARIAL.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(md))
print('fuentes', len(fuentes), 'claims', len(claims), 'a revisar', len(REVISION))
