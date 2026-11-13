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
IP_CLAIMS = [
    ('', ['br-ec-escala-con-anios-hasta-edad', 'br-ec-meses', 'br-ec-divisor', 'br-periodo-corto-coeficiente-divisor', 'br-anl-meses', 'br-anl-divisor'],
     'Base reguladora de la incapacidad permanente: por enfermedad común, bases de 96 meses entre 112 (con menos de ocho años exigidos, tantas bases como meses exigidos y divisor × 1,1666) por el porcentaje de la escala con los años que faltan hasta la edad ordinaria; por accidente no laboral en alta, 24 meses elegidos en siete años entre 28 (arts. 197 TRLGSS, 5 RD 1799/1985 y 7 Decreto 1646/1972).'),
    ('-carencia', ['carencia-general-divisor', 'carencia-joven-divisor', 'carencia-reciente-divisor', 'carencia-redondeo-edad-medio-anio-meses', 'carencia-parcial-dias'],
     'Periodo mínimo de cotización de la incapacidad permanente por enfermedad común: un tercio del tiempo desde los 16 años (menores de 31) o un cuarto desde los 20 (mínimo cinco años, un quinto en los diez últimos); parcial, 1.800 días en diez años; sin alta, quince años (art. 195 TRLGSS y art. 4 RD 1799/1985).'),
    ('-cuantia', ['total-porcentaje', 'absoluta-porcentaje', 'gran-incapacidad-porcentaje', 'total-cualificada-pct', 'gran-incapacidad-complemento-pct-base-minima', 'total-ec-suelo-clase-minima', 'edad-ip-sin-jubilacion-meses', 'br-profesional-salario-real'],
     'Cuantía de la incapacidad permanente: total 55 % (más 20 % la cualificada desde los 55 años), absoluta y gran incapacidad 100 % de la base reguladora; complemento de gran incapacidad del 45 % de la base mínima más el 30 % de la última base (mínimo, 45 % de la pensión); suelo de la total por enfermedad común; regla del art. 196.5 a partir de los 67 años.'),
]
SV_CLAIMS = [
    ('', ['carencia-alta-dias', 'carencia-sin-alta-meses', 'br-meses', 'br-ventana-meses', 'br-divisor', 'br-pensionista-misma-base', 'orfandad-alta-o-pensionista', 'familiares-carencia-alta-dias'],
     'Causante y base reguladora de muerte y supervivencia: en alta, 500 días cotizados en los cinco años anteriores (sin periodo previo si la muerte se debe a un accidente o a una enfermedad profesional; la orfandad no lo exige); sin alta, quince años; base reguladora de 24 meses elegidos en los quince años anteriores entre 28, o la de la pensión del causante pensionista con sus revalorizaciones (arts. 219, 224 y 228 TRLGSS; art. 7 Decreto 1646/1972).'),
    ('-cuantia', ['viudedad-pct', 'viudedad-65-pct', 'viudedad-cargas-pct', 'viudedad-cargas-reduccion-limite', 'orfandad-pct', 'orfandad-absoluta-incremento-pct', 'familiares-cuantia-igual-orfandad', 'familiares-incremento-sin-viudo', 'divorcio-limite-compensatoria', 'concurrencia-garantia-pct'],
     'Cuantía de la viudedad, la orfandad y el favor de familiares: viudedad 52 % de la base reguladora (60 % con 65 o más años sin otras rentas; 70 % con cargas familiares y rentas bajas), orfandad y familiares 20 % por beneficiario, incremento del 52 % repartido en la orfandad absoluta; separados y divorciados hasta la pensión compensatoria y, si concurren varios, en proporción al tiempo convivido con el 40 % garantizado al cónyuge o pareja superviviente.'),
    ('-limites', ['limite-conjunto-pct-br', 'limite-excepcion-viudedad-umbral-pct', 'limite-orfandad-max-pct', 'limite-preferencia-orfandad', 'limite-viudedad-orfandad-orden-1967', 'pareja-convivencia-meses', 'prestacion-temporal-meses'],
     'Límite conjunto de muerte y supervivencia: la suma de las pensiones no excede de la base reguladora (salvo viudedad de más del 52 % con varias orfandades, que pueden llegar al 48 %), con preferencia de la orfandad sobre los familiares y orden nietos y hermanos, padres, abuelos, hijos y hermanos de pensionistas (art. 229 TRLGSS); parejas de hecho y prestación temporal de dos años (arts. 221 y 222).'),
]
PNC_CLAIMS = [
    ('', ['incapacidad-edad-minima-meses', 'incapacidad-grado-minimo-pct', 'incapacidad-residencia-total-meses', 'jubilacion-residencia-total-meses', 'unidad-economica-limite-pct-convivientes', 'rentas-compatibles-pct', 'cuantia-minima-pct', 'complemento-tercera-persona-pct', 'compatibilidad-trabajo-limite-iprem', 'limite-acumulacion-con-tercera-persona'],
     'Pensiones no contributivas: requisitos (mayor de 18 y menor de 65 años con discapacidad de al menos el 65 % y cinco años de residencia en incapacidad; 65 años y diez años de residencia en jubilación), cuantía íntegra anual, reducción de las rentas propias que superan el 35 %, mínimo del 25 %, límite de acumulación de recursos de la unidad económica (70 % por cada conviviente adicional), complemento del 50 % por tercera persona y compatibilidad con el trabajo (arts. 363 a 370 TRLGSS y guías del IMSERSO).'),
]
MEI_CLAIMS = [
    ('', ['tipo-total-2030-2050', 'tipo-empresa-2030-2050', 'ultimo-anio', 'aplicable-contingencia-jubilacion', 'solidaridad-tramo-1-limite-pct', 'solidaridad-tipo-final-tramo-a', 'solidaridad-primer-anio'],
     'MEI y cotización adicional de solidaridad: el MEI se mantiene en 1,2 puntos de 2030 a 2050 (1,00 la empresa y 0,2 el trabajador), es una cotización finalista sin bonificaciones y no computa para prestaciones; la cuota de solidaridad se aplica por tramos a la retribución que supera la base máxima, con los tipos de la DT 42.ª de 2025 a 2045 (art. 127 bis, art. 19 bis, DT 42.ª y DT 43.ª TRLGSS).'),
]
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
PAIS_ISO = {'esp': 'España', 'fra': 'Francia', 'ita': 'Italia', 'swe': 'Suecia', 'pol': 'Polonia', 'deu': 'Alemania', 'prt': 'Portugal', 'nld': 'Países Bajos', 'dnk': 'Dinamarca', 'gbr': 'Reino Unido', 'usa': 'Estados Unidos'}
CONCEPTO_OCDE = {
    'ocde-pag-2025-inflacion-base': 'inflación de precios, escenario base', 'ocde-pag-2025-crecimiento-real-salarios-base': 'crecimiento real de los salarios, escenario base',
    'ocde-pag-2025-crecimiento-nominal-salarios-base': 'crecimiento nominal de los salarios, escenario base', 'ocde-pag-2025-tipo-descuento-real-base': 'tipo de descuento real, escenario base',
    'ocde-pag-2025-rentabilidad-real-fdc-base': 'rentabilidad real de los planes FDC, escenario base', 'ocde-pag-2025-factor-conversion-fdc-base': 'factor de conversión de los planes FDC, escenario base',
    'ocde-pag-2025-inflacion-alternativo': 'inflación de precios, escenario alternativo', 'ocde-pag-2025-crecimiento-real-salarios-alternativo': 'crecimiento real de los salarios, escenario alternativo',
    'ocde-pag-2025-tipo-descuento-real-alternativo': 'tipo de descuento real, escenario alternativo', 'ocde-pag-2025-rentabilidad-real-fdc-alternativo': 'rentabilidad real de los planes FDC, escenario alternativo',
    'ocde-pag-2025-crecimiento-pib-alternativo': 'ajuste del crecimiento del PIB, escenario alternativo',
    'ocde-pag-2025-tasa-bruta-reposicion-alternativo-esp': 'tasa bruta de reposición de España con el escenario alternativo, hombre con carrera completa al salario medio',
    'ocde-pag-2025-tasa-bruta-reposicion-alternativo-gbr': 'tasa bruta de reposición del Reino Unido con el escenario alternativo, hombre con carrera completa al salario medio',
    'ocde-pag-2025-tasa-bruta-reposicion-alternativo-usa': 'tasa bruta de reposición de Estados Unidos con el escenario alternativo, hombre con carrera completa al salario medio',
}
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
            if (d['id'], x['id']) in CLAIMS_DATOS_NUEVOS or (d['id'] == 'ocde-supuestos-reposicion' and x['id'].startswith('ocde-pag-2025-')):
                if d['id'] == 'ocde-supuestos-reposicion' and x['id'] in CONCEPTO_OCDE:
                    texto = f"OCDE, supuesto de la tasa de reposición teórica ({CONCEPTO_OCDE[x['id']]}): {num(x['value'])} ({x['unit']}) en {x['period']}."
                else:
                    texto = x['value'] if isinstance(x['value'], str) else f"{x['notes'].split('. ')[0]}: {num(x['value'])} ({x['unit']}) en {x['period']}."
                añade(f"{carpeta}-{d['id']}-{x['id']}", texto, 'Comparativa internacional (Fase 1C)' if carpeta == 'internacional' else 'Triangulación de la mortalidad (Fase 1B-4)', [f"{rel}#{x['id']}"], x['source'], x['confidence'])
        if d['id'] == 'paises-sistemas':
            for x in d['data']:
                pais = PAIS_ISO[x['id'].split('-')[1]]
                origen = ' (OCDE, Pensions at a Glance 2025)' if x['source']['docId'] == 'OECD-PAG-2025' else ''
                añade(f"internacional-{x['id']}", f"{pais}{origen}: {x['value']}.", 'Comparativa internacional: fichas de país (Fase 1C)', [f"{rel}#{x['id']}"], x['source'], x['confidence'])
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
    if carpeta == 'parametros' and d['id'] == 'incapacidad-permanente-reglas':
        # Fase 2-B-1: tres afirmaciones (base reguladora, periodo mínimo y cuantía) con las lecturas abiertas
        por = {z['id']: z for z in d['data']}
        for sufijo, ids, texto in IP_CLAIMS:
            x = por[ids[0]]
            añade(f"param-{d['id']}{sufijo}", texto, 'Motor de incapacidad permanente (docs/MOTOR_INCAPACIDAD.md)',
                  [f"{rel}#{i}" for i in ids], x['source'], x['confidence'])
    elif carpeta == 'parametros' and d['id'] in ('pnc-reglas', 'mei-reglas'):
        # Fase 2-B-3: una afirmación por fichero de reglas
        por = {z['id']: z for z in d['data']}
        for sufijo, ids, texto in (PNC_CLAIMS if d['id'] == 'pnc-reglas' else MEI_CLAIMS):
            x = por[ids[0]]
            añade(f"param-{d['id']}{sufijo}", texto, 'Motor de pensiones no contributivas y MEI (docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md)',
                  [f"{rel}#{i}" for i in ids], x['source'], x['confidence'])
    elif carpeta == 'parametros' and d['id'] == 'supervivencia-reglas':
        # Fase 2-B-2: tres afirmaciones (causante y base, cuantía, límites y beneficiarios)
        por = {z['id']: z for z in d['data']}
        for sufijo, ids, texto in SV_CLAIMS:
            x = por[ids[0]]
            añade(f"param-{d['id']}{sufijo}", texto, 'Motor de muerte y supervivencia (docs/MOTOR_SUPERVIVENCIA.md)',
                  [f"{rel}#{i}" for i in ids], x['source'], x['confidence'])
    elif carpeta == 'parametros' and d.get('data'):
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
    'param-lagunas-integracion': 'Comprobar la integración de lagunas por versión (48 meses al 100 % de la base mínima y el resto al 50 %; en 2026 cambia la referencia de la base mínima): ejemplo numérico con una carrera con 60 meses de laguna usando data/parametros/lagunas-integracion y base-minima-rg, y contrastar con art. 209.1.b TRLGSS y las versiones 2010, 2013 y 2016. Dudas del motor: (b) en 2026 la base mínima de referencia es «la que corresponda al mes respectivo»: el motor usa por defecto la del mes de la laguna (actualizada con el IPC como el resto de bases) y ofrece la del hecho causante como alternativa; (d) las lagunas se cuentan también en los meses de la ventana anteriores a la primera alta (lectura literal; opción lagunasAnterioresAlPrimerAlta). Confirmar ambas.',
    'param-actualizacion-bases': 'Comprobar la actualización de las bases de cotización por versión (meses sin actualizar e índice de referencia): reproducir la actualización de una carrera de ejemplo con data/parametros/actualizacion-bases y el IPC mensual de data/parametros/ipc-indice-mensual, y verificar que los 24 meses más recientes se computan nominalmente en la versión de 2026. Dos dudas. (1) IPC mensual (Fase 2-D): el motor usa por defecto el índice mensual real del INE (lectura interpolacionIPC = mensual-ine, mejora de datos y no una lectura legal; alternativas: medias anuales interpoladas y escalón anual). De 2002 en adelante es la serie del INE sin transformar; el INE no publica el índice de 2001 en la base vigente y advierte de que no se pueden calcular variaciones entre IPC-92 e IPC-2001, de modo que 2001 se obtiene con las variaciones anuales de 2002 que publica el INE y 1992-2000 con la serie de base 1992 enlazada (confianza media). Confirmar que el autocálculo de la Seguridad Social usa el mismo índice para los meses anteriores a 2002 (sus informes muestran el factor de cada mes). (2) Suelo del factor de actualización (lectura actualizacionFactorMinimo, por defecto suelo-1 desde la Fase 2-E, lectura provisional): los nueve informes del autocálculo aportados nunca muestran un factor inferior a 1,0000000; cuando el índice del mes de referencia es menor que el del mes de la base, el factor sale 1. El art. 209 TRLGSS habla de actualizar «de acuerdo con la evolución del IPC» y no menciona ese suelo: decidir si el motor aplica el suelo de uno (lectura suelo-1) o deja que el factor baje de uno. Efecto medido en docs/INFORME_VERIFICACION.md (Fase 2-D): hasta 0,3 euros al mes (0,014 %) en los casos de Sergio; la evidencia de los informes está en docs/REVISION_PRIORIZADA.md.',
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
REVISION['internacional-ocde-espana-gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024'] = 'Comprobar la comparabilidad de la tasa de reposición teórica bruta de la OCDE (carrera completa desde los 22 años, pensión obligatoria, 100 % del salario medio, parámetros de 2024) con una tasa calculada con las reglas propias (data/parametros: escala de porcentajes, periodo de cálculo, actualización de bases, pensión máxima) y con los cocientes empíricos de data/internacional/contraste-espana; en concreto: los supuestos de crecimiento del salario (real 1,25 % anual), inflación (2 %) y carrera (de los 22 a los 65 años) que hay detrás del 80,4 % ya están en ocde-supuestos-reposicion (elementos ocde-pag-2025-*); falta saber si la tasa neta (86,3 %) usa los mismos impuestos y cotizaciones que el cálculo propio, porque el detalle del IRPF y de las cotizaciones del pensionista está en los «Country Profiles» en línea, aún no descargados.'
REVISION['internacional-contraste-espana-pension-altas-sobre-salario-eaes'] = 'Comprobar que el cociente entre la pensión media de las altas de jubilación (14 pagas) y la ganancia media de la EAES no es una tasa de reposición: mezcla carreras de distinta duración y compara con el salario de todos los trabajadores del ámbito de la EAES. Decidir si debe usarse como referencia empírica de sensibilidad frente a la tasa teórica de la OCDE y con qué definición de salario (EAES, ETCL, Contabilidad Nacional, base media).'
REVISION['internacional-contraste-espana-gasto-pensiones-contributivas-sobre-pib'] = 'Comprobar la delimitación del gasto: la fila «suma de pensiones» de la ejecución (obligaciones reconocidas) excluye Clases Pasivas, pensiones no contributivas y el complemento a mínimos (que va en otra fila, ver docs/INFORME_VERIFICACION.md). Decidir qué delimitación comparable con OCDE, Eurostat y Ageing Report usará el modelo.'
REVISION['demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-hombres-85-2010-2020'] = 'Comprobar que el desfase entre la supervivencia publicada y Π(1 − qx) se debe a la convención de edades: qx es la probabilidad entre las edades exactas x y x+1, y la cohorte con x años cumplidos a 1 de enero pasa durante el año de edad exacta media x+0,5 a x+1,5. Reproducir con data/demografia/triangulacion-cohortes y triangulacion-factor-qx el factor medio (defunciones registradas de la generación / población × qx, 1,04 a 1,08) y compararlo con (qx + qx+1)/2 ÷ qx; decidir si el modelo debe usar qx desplazado, la probabilidad de Lexis o una conversión desde la tasa central mx.'
REVISION['demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020'] = 'Valorar el residuo que queda en hombres de 85 años en 2010-2020 tras la convención de Lexis (supervivencia publicada algo inferior a la de la tabla y a la de las defunciones registradas de la generación): comprobar si se debe al ajuste intercensal de 2012-2020, a la migración o a la población de partida, comparando las ventanas de data/demografia/triangulacion-cohortes (2000-2010, 2010-2020, 2015-2020 y 2021-2024) y decidir si el modelo debe corregir la población de edades altas o solo qx.'
REVISION['demografia-triangulacion-mortalidad-factor-real-sobre-qx-mujeres-85-2010-2019'] = 'Comprobar el factor entre las defunciones registradas de la cohorte y población × qx (mujeres de 85 años, media 2010-2019) y su estabilidad por edad y año (mínimo y máximo en data/demografia/triangulacion-factor-qx); decidir si un factor constante desde los 75 años (como el 1,07 a 1,10 del modelo) es una aproximación aceptable de la corrección de Lexis o si debe variar con la edad (la pendiente de qx).'
REVISION['demografia-triangulacion-mortalidad-muertes-implicitas-pensiones-jubilacion-lexis'] = 'Conciliar las muertes implícitas en las tablas entre las pensiones de jubilación (aproximación con la distribución por edad de octubre de 2026) con las bajas definitivas de jubilación de 2025 de la Seguridad Social: la fuente no desglosa las causas de baja (fallecimiento u otras) y las pensiones no son pensionistas. Determinar qué dato haría falta (pensionistas por edad simple y causa de baja) y si la diferencia restante es relevante para el modelo.'
REVISION['demografia-triangulacion-mortalidad-ine-tablas-recalculo-censo-2021'] = 'Confirmar con el INE qué años de la serie de tablas 1991-2024 cambiaron en la edición de noviembre de 2023 (la metodología indica que se recalcularon las series intercensales de 2012-2020 con el censo de 2021 y que las de 1981-2001 se recalcularon en 2014) y comparar las tablas actuales con la edición anterior para medir el cambio en qx de las edades altas.'
REVISION['internacional-ocde-supuestos-reposicion-ocde-pag-entrada-mercado-laboral-22'] = 'Los metadatos SDMX solo dicen que la tasa de reposición teórica se calcula para quien entra en el mercado laboral a los 22 años; el resto de supuestos (carrera, crecimiento real de los salarios, inflación, impuestos) se han leído del informe «Pensions at a Glance 2025» (elementos ocde-pag-2025-* del mismo fichero). Comprobar que la carrera modelada para España (entrada a los 22 y jubilación a la edad normal de 65 años, es decir, 43 años de carrera) es comparable con los años cotizados que exige el cálculo propio con las reglas de data/parametros antes de contrastar la tasa de la OCDE con una tasa calculada con ellas.'
REVISION['internacional-ocde-supuestos-reposicion-ocde-pag-2025-crecimiento-real-salarios-base'] = 'La OCDE supone para todos los países un crecimiento real del salario del 1,25 % anual, inflación del 2 % y salario individual igual al medio de la economía, y publica la sensibilidad con 0,75 % de crecimiento real y 1 % de inflación. Como España revaloriza los ingresos pasados con los precios y no con los salarios, la tasa bruta del 100 % del salario medio pasa del 80,4 % al 88,0 % con el escenario alternativo (tabla 5.4). Comprobar cómo afectan estos supuestos al cálculo con las reglas propias (periodo de cálculo, actualización de bases con el IPC, escala de porcentajes) y contrastarlos con el crecimiento real observado del salario en data/macro y con las hipótesis del Ageing Report 2024 en data/demografia.'
REVISION['internacional-ocde-supuestos-reposicion-ocde-pag-2025-politica-fiscal-constante'] = 'La tasa neta de la OCDE supone que los tipos del IRPF y las cotizaciones no cambian y que los mínimos exentos y los topes se actualizan con el salario medio; el detalle de lo que pagan los pensionistas está en los «Country Profiles» en línea, que no se han descargado (PENDIENTE_DATOS). Comprobar, cuando estén disponibles, que la tasa neta de España (86,3 % al salario medio) usa la escala del IRPF, los mínimos y las cotizaciones del pensionista que se aplicarían en el cálculo propio; mientras tanto la tasa neta no es comparable con una calculada por separado.'
REVISION['internacional-ocde-supuestos-reposicion-ocde-pag-2025-sensibilidad-espana-valorizacion-precios'] = 'La OCDE atribuye la subida de España en el escenario alternativo (7,6 puntos, la mayor del grupo formado por Bélgica, Portugal, España, Türkiye y Reino Unido) a que los ingresos pasados se valorizan a los precios y el crecimiento real de los salarios es menor. Comprobar que ese mecanismo es coherente con la regla española de actualización de las bases con el IPC dentro del periodo de cálculo (data/parametros) y estimar con las reglas propias la sensibilidad de la tasa a ±0,5 puntos de crecimiento real.'
REVISION['internacional-sistema-esp-9'] = 'Contrastar la proyección de AIReF que cita la OCDE (gasto en pensiones de 16,1 % del PIB en 2050, +3,2 puntos entre 2023 y 2050) con la del Ageing Report 2024 (data/demografia/ageing-report-2024-espana) y con las proyecciones de gasto público de ocde-pag: definición de gasto (pensiones contributivas, Clases Pasivas, PNC), año base y supuestos demográficos y de empleo de cada una.'

# Fase 2-A: preguntas que han surgido al implementar el motor de jubilación (src/engine/jubilacion).
REVISION['param-escala-jubilacion-tramos'] = 'Comprobar que la escala en forma numérica (50 % a los 15 años; 0,21 % y 0,19 % por mes según DT 9.ª hasta 2026; 0,19 % y 0,18 % desde 2027) reproduce el texto de la DT 9.ª y del art. 210.1: con el motor, para 15, 25, 35 y 37 años cotizados en 2026 y en 2027 debe dar 50 %, 77,x %, 95,x % y 100 %; y que los meses para el 100 % coinciden con data/parametros/cotizacion-para-100 (hay un test que lo comprueba).'
REVISION['param-jubilacion-coeficientes-involuntaria'] = 'Comprobar el cuadro del art. 207.2 (coeficientes por mes de anticipación, 1 a 48, y por tramo de periodo cotizado). Dudas de aplicación del motor: (1) «cada mes o fracción de mes que le falte» se aplica como redondeo hacia arriba de los meses entre el hecho causante y la edad legal; (2) la edad legal es la que correspondería «de haber seguido cotizando» hasta cumplirla: el motor proyecta la cotización hasta los 65 años para decidir si la edad legal es 65 años o la de la DT 7.ª de ese año del hecho causante; (3) el tramo se elige con los meses cotizados reales al hecho causante, sin proyectar. Confirmar las tres lecturas.'
REVISION['param-jubilacion-coeficientes-voluntaria'] = 'Comprobar el cuadro del art. 208.2 (1 a 24 meses) y su aplicación: mismas dudas (1) a (3) de la jubilación involuntaria. Además, el art. 208.3 aplica los coeficientes de la involuntaria si al acogerse el trabajador percibe subsidio de desempleo al menos tres meses: el motor lo hace por una opción explícita (mesesSubsidioDesempleo) y añade entonces el tope de la pensión máxima reducida por trimestres (art. 210.4). Confirmar.'
REVISION['param-jubilacion-coeficientes-voluntaria-limite'] = 'Comprobar la aplicación de la DT 34.ª: cuando BR × % supera el límite de pensión, el coeficiente de cada año 2024-2033 se aplica sobre el límite (art. 210.3, párr. 2.º). El motor no aplica la salvaguarda del apartado 1 de la DT 34.ª (pensión no inferior a la que habría correspondido con las normas de 2021, que no están transcritas) y no calcula 2022-2023 (rige la redacción original del art. 210.3). Valorar la magnitud de ambas omisiones.'
REVISION['param-jubilacion-demora-reglas'] = 'Comprobar el complemento por demora: (1) «a partir del segundo año completo de demora» se lee como: las fracciones de más de 6 meses cuentan cuando ya hay al menos dos años completos (opción fraccionDemora: «desde el segundo año» por defecto o «desde el primer año»); (2) en la opción mixta de 2 a 8 años y 6 meses, los años completos se dividen en dos partes y el semestre va al tanto alzado (×0,5); con 9 o más años, cinco años a tanto alzado y el resto a porcentaje; (3) la «pensión inicial anual» del tanto alzado es la reconocida (con el porcentaje adicional de la parte mixta), limitada a la máxima; (4) los años de demora se cuentan con los meses cotizados (no los asimilados al alta). Confirmar las cuatro lecturas.'
REVISION['param-lagunas-integracion-brecha-genero'] = 'Comprobar la DT 41.ª: (1) las «mensualidades» 49.ª a 84.ª son los meses de laguna ordenados desde el hecho causante hacia atrás (no los meses naturales de la ventana); (2) se aplica a la regla general del art. 209.1 y no a la opción de 25 años de la DT 4.ª.7 (que aplica la redacción de 2023), aunque la opción pueda salir menos favorable; (3) mientras la brecha de la DA 37.ª sea superior al 5 %, que no consta en /data: el motor la da por vigente para mujeres (y hombres que acrediten el art. 60.1.b) y permite apagarla. Confirmar.'
REVISION['param-pension-maxima-incremento-2051-2065'] = 'La tabla de la DT 39.ª.4 (3,2 en 2051 hasta 20,0 en 2065) se describe como «incremento anual adicional» pero enlaza con el acumulado de la DT 39.ª.1 (26 × 0,115 = 2,99 en 2050) y la propia DT apunta a «un incremento total de 30 puntos». El motor ofrece dos lecturas: «incremento acumulado» (por defecto: el límite crece la revalorización más la diferencia entre el acumulado de un año y el del anterior) y «anual literal» (se suma el valor de la tabla a la revalorización de ese año). Determinar cuál es la intención y cómo se compone con la lectura de 2025-2050 (la de /data suma 0,115 constante, no creciente).'
REVISION['param-carrera-jubilacion-65'] = 'Comprobar cómo se aplica la DT 7.ª: (1) la carrera que permite jubilarse a los 65 años se mide con los meses cotizados al hecho causante (jubilación ordinaria); (2) en las anticipadas, con los meses que habría cotizado hasta los 65 años (proyección) y el calendario del año del hecho causante, no el del año en que cumpliría la edad; (3) los meses se cuentan completos y sin parte proporcional de pagas extra. Confirmar (2), que es la que decide la anticipación.'
REVISION['param-base-minima-rg'] = 'La base mínima de 2020 (1.108,50, del anexo al informe económico-financiero de los presupuestos de la Seguridad Social de 2021) consta con confianza alta, y la de 2021 es un valor deducido (confianza media: la Ley 11/2020 la incrementa en el porcentaje del SMI, que no cambió hasta el 1-9-2021; desde esa fecha fue 1.125,90, y el fichero guarda un valor por año). La ley no fija su evolución posterior a 2026 en /data: el motor la proyecta con el IPC del escenario desde 2027. Confirmar la cuantía de 2020 y 2021 con una orden o resolución y aportar la regla de evolución (vinculada al SMI).'
REVISION['param-incapacidad-permanente-reglas'] = ('Lecturas abiertas de la base reguladora de la incapacidad permanente (opciones del motor; efecto cuantificado en docs/INFORME_VERIFICACION.md, Fase 2-B-1): '
    '(a) «edad ordinaria de jubilación vigente en cada momento» del art. 197.1.b): por defecto, la del art. 205.1.a) con la cotización proyectada hasta los 65 años y el calendario del año del hecho causante; alternativa, la edad general sin carrera larga (efecto nulo con los parámetros de 2022-2027, porque la carrera que da los 65 años supera la que da el 100 %); '
    '(b) «los años que le resten»: por defecto, meses completos; alternativa, años completos (−1,3 % en el caso típico); '
    '(c) divisor del periodo corto del art. 197.2: por defecto meses × 1,1666 (RD 1799/1985); alternativa meses × 14/12 (−0,01 %); '
    '(d) accidente no laboral en alta: periodo de 24 meses elegido por defecto el más favorable y meses sin cotizar integrados con la base mínima (por defecto desde la Fase 2-E, lectura provisional); alternativa, dejarlos a cero (−23,5 % en un caso con seis meses sin cotizar). '
    'Confirmar las cuatro lecturas y si el periodo corto (art. 197.2) se aplica, como hace el motor, a quien tiene entre 31 y unos 52 años (periodo exigido inferior a 96 meses).')
REVISION['param-incapacidad-permanente-reglas-carencia'] = ('Lecturas abiertas del periodo mínimo de cotización (art. 195 TRLGSS): '
    '(a) el redondeo de la edad a medios años del art. 4.1 del RD 1799/1985 (escrito para la regla de 26 años de la Ley 26/1985), ¿sigue aplicándose con la regla del TRLGSS? Por defecto, no (meses cumplidos; un mes menos o más de periodo exigido); '
    '(b) la quinta parte en los diez últimos años se redondea hacia arriba («al menos»); '
    '(c) parcial: los 1.800 días se cuentan como días naturales de los meses cotizados (alternativa: 30 por mes) y la ventana de diez años desde el hecho causante, que se toma como fecha de extinción de la incapacidad temporal; '
    '(d) los meses que faltaban para agotar la incapacidad temporal (art. 4.4 RD 1799/1985) entran como dato del usuario. Confirmar.')
REVISION['param-incapacidad-permanente-reglas-cuantia'] = ('Preguntas de cuantía de la incapacidad permanente: '
    '(a) art. 196.5 (67 o más años sin derecho a jubilación): el motor sustituye el porcentaje del grado por el de la carencia de la jubilación (50 %) y mantiene el complemento de gran incapacidad; ¿es la lectura correcta? '
    '(b) el suelo de la total por enfermedad común (art. 196.2, párr. 3.º) se aplica sin límite de rentas y sobre la pensión con el incremento de la cualificada; '
    '(c) la cualificada se presume por la edad (55 años) salvo indicación en contra; '
    '(d) la gran incapacidad percibe el 100 % (art. 18 de la Orden de 1969: la prestación de la absoluta) también cuando la incapacidad de base sea total; '
    '(e) contingencias profesionales: la base reguladora del salario real (Reglamento de 1956) no está en /data y el motor solo admite una base calculada fuera. Confirmar (a)-(d) y decidir cómo obtener (e).')
REVISION['param-supervivencia-reglas'] = ('Lecturas abiertas del causante y de la base reguladora de muerte y supervivencia (opciones del motor; efecto en docs/INFORME_VERIFICACION.md, Fase 2-B-2): '
    '(a) ventana de los quince años: el motor la cuenta «anterior al mes previo al del hecho causante» (art. 228 TRLGSS, ley posterior y de rango superior); alternativa, hasta el mes anterior al hecho causante (art. 7.2 Decreto 1646/1972), +1,2 % en un caso con subida de bases en los dos últimos meses; '
    '(b) los 500 días se cuentan con los días naturales de los meses cotizados (alternativa: 30 por mes); '
    '(c) orfandad con causante en alta: el art. 224.1 TRLGSS no exige periodo previo, pero el art. 9.1 del RD 1647/1997 (no actualizado) exige 500 días; el motor sigue la ley (alternativa como opción); '
    '(d) favor de familiares y accidente no laboral: la Orden de 1967 solo exime el accidente de trabajo y la enfermedad profesional; el art. 219.1 exime cualquier accidente en la viudedad; el motor exige los 500 días (literal de la Orden). '
    'Confirmar (a)-(d) y si la base del causante pensionista debe revalorizarse con la revalorización general de cada año posterior a su pensión (como hace el motor).')
REVISION['param-supervivencia-reglas-cuantia'] = ('Preguntas de cuantía de la viudedad, la orfandad y el favor de familiares: '
    '(a) reducción del 70 % por el límite de rendimientos (art. 31.3 Decreto 3158/1966): el motor no baja del 52 % (alternativa, sin suelo: −16,9 % en el caso típico); '
    '(b) la pensión de un excónyuge se compara con la compensatoria en cómputo anual (14 pagas frente a la compensatoria anual; alternativa mensual: +16,7 %) y después recibe el complemento a mínimos si procede; '
    '(c) incremento de familiares sin cónyuge superviviente (art. 23.2 Orden de 1967): el art. 39.Dos del Decreto 3158/1966 remite a un apartado derogado en 2009; el motor aplica el porcentaje de viudedad (52 %) repartido entre nietos y hermanos o, si no los hay ni huérfanos, entre ascendientes (alternativa, sin incremento: −72 %); '
    '(d) el 60 % del RD 900/2018 y el 70 % se comparan y se aplica el mayor; la edad de 65 años y las rentas se miden en el hecho causante; '
    '(e) la prestación temporal de viudedad no recibe complemento a mínimos ni cuenta en el límite conjunto (no es pensión); '
    '(f) el complemento de brecha se reconoce en la viudedad a mujeres con hijos y a hombres con algún hijo con orfandad, salvo que ya se cobre con otra pensión. Confirmar.')
REVISION['param-supervivencia-reglas-limites'] = ('Preguntas del límite conjunto (art. 229 TRLGSS) y de los beneficiarios: '
    '(a) la norma no dice qué pensión se reduce cuando viudedad y orfandad superan la base reguladora; el motor mantiene la viudedad y reduce las orfandades (alternativa proporcional: −24 % en la viudedad con cuatro huérfanos); '
    '(b) el límite se aplica a las cuantías tras la pensión máxima de cada una y antes de los complementos a mínimos; '
    '(c) el reparto entre excónyuges y cónyuge actual (art. 220.2) usa los meses convividos y garantiza el 40 % al cónyuge o pareja actual; el porcentaje no asignado por la compensatoria incrementa la orfandad absoluta (art. 38.1.2.º Decreto 3158/1966); '
    '(d) desde el 21/10/2026 (RDL 31/2026) la pareja de hecho con hijos comunes necesita dos años de convivencia y no la inscripción; antes, solo la inscripción con dos años de antelación; '
    '(e) madre y abuelas: el requisito de estado civil del art. 22.1.2) de la Orden de 1967 se recibe como dato; hijos y hermanos de pensionistas mayores de 45 años (art. 226.2): su desarrollo reglamentario no se ha localizado y el motor exige ingresos no superiores al SMI anual. Confirmar.')
REVISION['param-pnc-reglas'] = ('Lecturas abiertas de las pensiones no contributivas (opciones del motor; efecto en docs/INFORME_VERIFICACION.md, Fase 2-B-3): '
    '(a) art. 364.2: el 35 % de rentas compatibles se calcula sobre la cuantía íntegra (por defecto; es lo que aplica la guía del IMSERSO) o sobre la cuantía por beneficiario de la unidad económica (-7,0 % en el caso típico); '
    '(b) art. 366: el límite de compatibilidad con el trabajo suma el IPREM anual y la cuantía íntegra (por defecto; es el límite que publica el IMSERSO: 16.003,20 en 2026) o la pensión reconocida (-40,8 %); '
    '(c) art. 364.2 in fine («salvo lo dispuesto en el artículo 366»): el motor lee que el límite del art. 366 sustituye a la reducción general por rentas durante los cuatro primeros años de actividad (alternativa: aplicar ambas); '
    '(d) art. 363.2: con derecho al complemento de tercera persona, el límite de acumulación de recursos se calcula sobre la cuantía con el complemento (aplicación del IMSERSO, que no es texto de la ley; por defecto) o solo sobre la íntegra. '
    'Otras decisiones: «mayor de dieciocho» se lee como más de 18 años en la fecha de la solicitud; los efectos económicos son del primer día del mes siguiente a la solicitud (arts. 365 y 371) y la cuantía es la de ese año; la cuantía de 2023 es la del incremento extraordinario del art. 77 del RDL 20/2022 (6.784,54), no la del RD 1058/2022 (6.402,20); el complemento de alquiler de 2024 no consta en el texto descargado. Confirmar (a)-(d).')
REVISION['param-mei-reglas'] = ('Lecturas abiertas del MEI y de la cotización de solidaridad (opciones del motor; efecto en docs/INFORME_VERIFICACION.md, Fase 2-B-3): '
    '(a) el art. 127 bis no nombra la base: el motor aplica el tipo a la base de cotización por contingencias comunes (por defecto) o, alternativamente, a la retribución completa, también la parte que supera la base máxima y cotiza como solidaridad (+17,6 % en el caso típico); '
    '(b) de 2030 a 2050 el reparto del 1,2 se supone igual que en 2029 (1,00 empresa y 0,2 trabajador) por «igual distribución» de la DT 43.ª; '
    '(c) la cuota de solidaridad se reparte con la proporción de los tipos de contingencias comunes de empresa y trabajador (DT 42.ª) y, desde 2045, rigen los tipos del art. 19 bis, que coinciden con los de 2045; '
    '(d) el MEI no se aplica antes de 2023 ni a las contingencias profesionales y lanza NoImplementada después de 2050 (la ley no fija el tipo). Confirmar.')
REVISION_POR_DEFECTO = 'no-requiere'

ORG = {'Boletín Oficial del Estado (BOE)': 'BOE', 'Instituto Nacional de Estadística (INE)': 'INE'}

# Segundas fuentes de la auditoría independiente (Fase 2-C): se registran como fuentes consultadas
_ruta_aud = f'{REPO}/docs/auditoria-independiente.json'
if os.path.exists(_ruta_aud):
    _ORG = {'seg-social.es': 'Seguridad Social', 'ec.europa.eu': 'Eurostat', 'servicios.ine.es': 'INE', 'boe.es': 'BOE', 'imserso.es': 'IMSERSO', 'mites.gob.es': 'MITES'}
    for _r in json.load(open(_ruta_aud, encoding='utf-8'))['registros']:
        for _s in _r['segundaFuente']:
            _dom = next((v for k, v in _ORG.items() if k in _s['url']), 'Otros')
            anota({'title': _s['title'], 'publisher': _dom, 'url': _s['url']}, 'auditoría independiente (docs/AUDITORIA_DATOS.md)', _s['fetchedAt'])
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
      'reglas de evolución futura, reglas de incapacidad permanente y de muerte y supervivencia, definiciones y las definiciones de salario medio. Para cada una: el identificador del claim, qué se afirma y una pregunta concreta sobre qué debe comprobar el actuario y con qué dato o fórmula. '
      'Generado por `scripts/etl/fuentes_claims.py` (diccionario `REVISION`); la pregunta también está en el campo `preguntaActuarial` de `docs/claims.json`.', '',
      f'**Resto de afirmaciones ({len(claims) - len(REVISION)})**: no llevan `revisionActuarial` y heredan `revisionActuarialPorDefecto: "no-requiere"` — no requieren revisión actuarial (transcripción literal de una norma o de una cifra publicada, contrastada con su fuente). '
      'Para cambiar el estado de una afirmación basta con añadirle `revisionActuarial` (`revisada`, `rechazada` o `pendiente` con `preguntaActuarial`); `npm run validate:data` exige la pregunta en las pendientes.', '',
      'Para marcar una revisión: poner `revisionActuarial: "revisada"` (o `"rechazada"`) en la afirmación de `docs/claims.json` y anotar el criterio en `notas`.', '']
grupos = [('Reglas de cálculo de la pensión de jubilación', [i for i in REVISION if i.startswith('param-') and any(k in i for k in ('escala', 'divisor', 'periodo', 'lagunas', 'actualizacion', 'opcion', 'coeficientes', 'demora', 'carrera'))]),
          ('Reglas de evolución (mínimas, revalorización, base y pensión máximas, MEI)', [i for i in REVISION if i.startswith('param-') and not i.startswith('param-mei-reglas') and any(k in i for k in ('minima', 'revalorizacion', 'incremento', 'mei'))]),
          ('Reglas de cálculo de la incapacidad permanente', [i for i in REVISION if i.startswith('param-incapacidad-permanente')]),
          ('Reglas de las pensiones no contributivas y del MEI', [i for i in REVISION if i.startswith(('param-pnc-reglas', 'param-mei-reglas'))]),
          ('Reglas de cálculo de muerte y supervivencia', [i for i in REVISION if i.startswith('param-supervivencia-reglas')]),
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
