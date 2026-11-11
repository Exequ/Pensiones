"""B de la Fase 1C: catálogo de afirmaciones circulantes sobre las pensiones (sin veredictos).

Escribe data/mitos/afirmaciones-circulantes.json. Cada afirmación remite a datos de /data (el validador comprueba que existan),
lista las definiciones alternativas que condicionan el resultado y dice lo que NO se puede concluir con los datos.
Ejecutar con `python3 -I scripts/etl/mitos.py`.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO

OUT = f'{REPO}/data/mitos'


def M(id_, enunciado, datos, definiciones, no_concluir, pregunta, faltan=None):
    m = {'id': id_, 'enunciado': enunciado, 'datos': datos,
         'definiciones': [{'nombre': n, 'literal': l, **({'datos': d} if d else {})} for n, l, d in definiciones],
         'noSePuedeConcluir': no_concluir}
    if faltan:
        m['faltan'] = faltan
    m['revisionActuarial'] = 'pendiente'
    m['preguntaActuarial'] = pregunta
    return m


MITOS = [
    M('hucha-vaciada', '«La hucha de las pensiones se ha vaciado.»',
      ['sistema/fondo-reserva-series.json#valor-fin-ano', 'sistema/fondo-reserva-series.json#disposiciones-anuales', 'sistema/fondo-reserva-anual.json', 'parametros/fondo-reserva-desembolso-maximo.json', 'parametros/mei-destino.json#destino-fondo-reserva'],
      [('Valor del Fondo de Reserva a 31 de diciembre', 'Valor acumulado que publican los informes a las Cortes (a precio de adquisición, no a precio de mercado), con las dotaciones, rendimientos y disposiciones de cada año.', ['sistema/fondo-reserva-series.json#valor-fin-ano']),
       ('Disposiciones del Fondo', 'Importes que se han retirado del Fondo para pagar prestaciones, por año.', ['sistema/fondo-reserva-series.json#disposiciones-anuales']),
       ('Reservas de la Seguridad Social en sentido amplio', 'La afirmación puede referirse al Fondo de Reserva o a otros activos de la Seguridad Social; en /data solo está el Fondo de Reserva.', None)],
      ['Si el nivel actual del Fondo es o no suficiente: no hay en /data un criterio de suficiencia ni los pagos futuros previstos.', 'El valor a precio de mercado, que puede diferir del valor de adquisición.', 'Qué parte de la evolución se debe a disposiciones y cuál a otros motivos más allá de las series publicadas.'],
      'Comprobar el criterio de valoración (precio de adquisición) y la secuencia dotaciones, rendimientos y disposiciones del Fondo de Reserva; decidir con qué referencia (valor máximo, saldo actual, años de gasto cubiertos) se formula «vaciado» y calcular los meses de gasto en pensiones que cubre el valor de cada año.'),
    M('pensiones-con-impuestos', '«Las pensiones se pagan con los impuestos.»',
      ['sistema/deficit-presupuestario-seguridad-social.json#transferencias-estado-corrientes', 'sistema/presupuesto-ss-ejecucion.json', 'sistema/gastos-impropios.json#transferencia-prevista-pge-2021', 'parametros/prestamos-estado-seguridad-social.json#2021-importe-maximo'],
      [('Transferencias corrientes del Estado', 'Transferencias del Estado y organismos autónomos a la Seguridad Social que recoge la ejecución presupuestaria, clasificadas por origen.', ['sistema/deficit-presupuestario-seguridad-social.json#transferencias-estado-corrientes']),
       ('Financiación por cotizaciones', 'Cotizaciones sociales como capítulo de ingresos de la ejecución del presupuesto del Sistema de la Seguridad Social.', ['sistema/presupuesto-ss-ejecucion.json']),
       ('Gastos «impropios»', 'Expresión de una fuente institucional para prestaciones no contributivas, reducciones de cuotas y otras partidas que el Pacto de Toledo propone financiar con impuestos; su cuantía depende de qué partidas se incluyan.', ['sistema/gastos-impropios.json#transferencia-prevista-pge-2021']),
       ('Préstamos del Estado', 'Operaciones financieras (no son transferencias corrientes) autorizadas a la Seguridad Social.', ['parametros/prestamos-estado-seguridad-social.json#2021-importe-maximo'])],
      ['Qué parte exacta de las pensiones contributivas se paga con impuestos: la ejecución no desglosa las transferencias por finalidad (pendiente).', 'Si las transferencias financian pensiones contributivas o prestaciones de otro tipo.'],
      'Comprobar la separación de fuentes de financiación (contributivas frente a no contributivas) y el desglose de las transferencias por finalidad; decidir cómo se atribuyen los complementos a mínimos y las reducciones de cuotas al calcular la proporción financiada con cotizaciones.',
      ['Desglose de las transferencias del Estado por finalidad (ver docs/PENDIENTE_DATOS.md).']),
    M('menos-cotizantes-por-pensionista', '«Hay cada vez menos cotizantes por pensionista.»',
      ['sistema/relacion-afiliados-pensiones.json#afiliados-diciembre-por-pensionista', 'sistema/relacion-afiliados-pensiones.json#afiliados-media-anual-por-pension', 'sistema/relacion-afiliados-pensiones-alternativa-1.json#afiliados-por-pension-alternativa-1', 'demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-84', 'demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-59'],
      [('Afiliados por pensionista', 'Afiliados (relaciones laborales en alta, con pluriempleo) entre pensionistas (personas), con afiliados medios de diciembre o media anual.', ['sistema/relacion-afiliados-pensiones.json#afiliados-diciembre-por-pensionista']),
       ('Afiliados por pensión', 'Los mismos afiliados entre pensiones (una persona puede cobrar varias).', ['sistema/relacion-afiliados-pensiones.json#afiliados-media-anual-por-pension']),
       ('Alternativa 1', 'Afiliados a último día de diciembre entre pensiones en vigor a 1 de enero siguiente, sin desfase temporal.', ['sistema/relacion-afiliados-pensiones-alternativa-1.json#afiliados-por-pension-alternativa-1']),
       ('Ratio de apoyo del Ageing Report 2024', 'Cotizantes por cada 100 pensionistas públicos, proyección de la Comisión Europea.', ['demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-84']),
       ('Tasa de dependencia de mayores', 'Población de 65 o más años entre población de 20 a 64 años (proyección).', ['demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-59'])],
      ['El signo de la tendencia depende de la definición y del periodo elegido: las cinco medidas no están definidas igual.', 'Las definiciones sin doble cómputo (ocupados más desempleados con prestación, convenios especiales, pensionistas sin doble cómputo) no están en /data.'],
      'Comprobar qué es un «cotizante» frente a un afiliado (pluriempleo, regímenes especiales, situaciones sin cotización) y un «pensionista» frente a una pensión; elegir la definición coherente con el uso en el modelo y valorar el efecto del doble cómputo sobre el nivel y la tendencia.',
      ['Relación cotizantes/pensionistas sin doble cómputo (ver docs/PENDIENTE_DATOS.md).']),
    M('jubilados-cobran-mas-de-lo-cotizado', '«Los jubilados de ahora cobran más de lo que cotizaron.»',
      ['sistema/pensiones-vigor-pension-media.json#jubilacion-ambos', 'demografia/esperanza-vida-anual.json#esperanza-vida-65-hombres', 'demografia/esperanza-vida-anual.json#esperanza-vida-65-mujeres', 'parametros/tipo-cc-empresa.json', 'parametros/escala-porcentajes-jubilacion.json', 'internacional/ocde-espana.json'],
      [('Equilibrio actuarial individual', 'Valor actual de las cotizaciones por contingencias comunes frente al valor actual de las pensiones esperadas, con un tipo de descuento y una tabla de mortalidad.', None),
       ('Cotizaciones pagadas por el trabajador', 'Solo la parte del trabajador, o también la de la empresa (en el tipo de cotización de contingencias comunes de data/parametros).', ['parametros/tipo-cc-empresa.json']),
       ('Riqueza de pensiones de la OCDE', 'Valor actual de las prestaciones esperadas expresado en múltiplos del salario anual (medidas GPW y NPW) para una carrera completa teórica.', ['internacional/ocde-espana.json'])],
      ['No hay datos de historiales de cotización individuales ni de valor actual de las cotizaciones por cohorte, por lo que no se puede comparar lo cotizado con lo cobrado.', 'La respuesta depende del descuento, de la inclusión de la cotización de la empresa y de qué prestaciones se cuentan (viudedad, mínimos).'],
      'Definir el cociente valor actual de prestaciones / valor actual de cotizaciones por cohorte (tipo de descuento, mortalidad de data/demografia, cotización de trabajador y de empresa) y decidir qué datos de historiales de cotización harían falta; comparar con la riqueza de pensiones de la OCDE.',
      ['Historiales de cotización por cohorte (Muestra Continua de Vidas Laborales), ver docs/PENDIENTE_DATOS.md.']),
    M('sistema-en-deficit', '«El sistema de pensiones está en déficit.»',
      ['sistema/deficit-presupuestario-seguridad-social.json#saldo-presupuestario-no-financiero', 'sistema/deficit-presupuestario-seguridad-social.json#saldo-presupuestario-total', 'sistema/deficit-sec-fondos-seguridad-social.json#b9-mio-eur', 'sistema/deficit-sec-fondos-seguridad-social.json#b9-pc-gdp', 'sistema/deficit-definiciones.json', 'sistema/gastos-impropios.json#deficit-estimado-2023'],
      [('Saldo presupuestario no financiero', 'Derechos reconocidos netos menos obligaciones reconocidas por operaciones no financieras del Sistema de la Seguridad Social (incluye las transferencias del Estado).', ['sistema/deficit-definiciones.json#saldo-presupuestario-no-financiero']),
       ('Saldo presupuestario total', 'El anterior más las operaciones financieras (activos y pasivos financieros, como préstamos).', ['sistema/deficit-definiciones.json#saldo-presupuestario-total']),
       ('Capacidad o necesidad de financiación SEC 2010', 'Saldo B.9 del subsector Fondos de la Seguridad Social según la contabilidad nacional (Eurostat), con criterio de devengo.', ['sistema/deficit-definiciones.json#necesidad-financiacion-sec-s1314']),
       ('Saldo del sistema contributivo sin transferencias', 'Cotizaciones menos prestaciones contributivas sin transferencias del Estado (definición que usan algunos informes; no está en /data).', None)],
      ['Que haya o no déficit: el signo y la cuantía cambian con la definición y con el año.', 'El saldo sin transferencias del Estado y el «saldo contributivo ajustado» no se pueden calcular con los datos descargados.'],
      'Comprobar las definiciones de déficit (presupuestario no financiero, total, SEC 2010 y saldo contributivo ajustado de la AIReF) y su reconciliación (criterio de caja o devengo, sectorización, tratamiento de transferencias y préstamos); decidir cuál se usa en cada magnitud del modelo.',
      ['Saldo contributivo ajustado (AIReF) y capacidad de financiación según la IGAE (ver docs/PENDIENTE_DATOS.md).']),
    M('edad-real-de-jubilacion-65', '«La edad de jubilación real es 65.»',
      ['parametros/edad-ordinaria-jubilacion.json#2025', 'parametros/carrera-jubilacion-65.json#2025', 'sistema/edad-media-altas-jubilacion.json#edad-media-altas-jubilacion', 'internacional/ocde-espana.json#crplf22-hombres-z-z-y-2024', 'internacional/ocde-espana.json#elmea-hombres-z-z-y', 'internacional/contraste-espana.json#meses-carrera-completa-desde-22-hasta-65'],
      [('Edad ordinaria legal', 'Edad a partir de la cual se accede a la pensión de jubilación sin reducción cuando no se alcanza el periodo cotizado de la jubilación a los 65 años (data/parametros).', ['parametros/edad-ordinaria-jubilacion.json#2025']),
       ('Jubilación a los 65 con carrera larga', 'Periodo cotizado, en meses, que permite jubilarse a los 65 años sin reducción en cada año.', ['parametros/carrera-jubilacion-65.json#2025']),
       ('Edad media de las altas de jubilación', 'Edad media de las altas iniciales de pensión de jubilación del año, según la estadística de altas de la Seguridad Social (data/sistema).', ['sistema/edad-media-altas-jubilacion.json#edad-media-altas-jubilacion']),
       ('Edad efectiva de salida del mercado laboral (OCDE)', 'Medida ELMEA de la OCDE; literal de la fuente: «Effective labour market exit age». El método de estimación es el de la OCDE y no se ha descargado.', ['internacional/ocde-espana.json#elmea-hombres-z-z-y']),
       ('Edad de jubilación actual de la OCDE', 'Edad a la que puede jubilarse sin penalización quien entró en el mercado laboral a los 22 años con carrera ininterrumpida (CRPLF22).', ['internacional/ocde-espana.json#crplf22-hombres-z-z-y-2024'])],
      ['No hay una única edad «real»: las cinco medidas responden a preguntas distintas y dan cifras distintas.', 'No hay en /data la distribución de edades de alta ni el peso de las distintas modalidades de jubilación.'],
      'Comprobar qué mide cada edad (legal, de alta, efectiva de salida del mercado laboral, de la OCDE para carrera completa), con la dependencia de la carrera cotizada y las modalidades anticipadas, y decidir cuál debe alimentar la edad de jubilación del modelo.'),
    M('pensiones-publicas-insostenibles', '«Las pensiones públicas son insostenibles.»',
      ['demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-64', 'demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-74', 'internacional/ocde-espana.json#ppep-no-aplica-z-z-pt-b1gq', 'demografia/proyecciones-hipotesis.json#tasa-dependencia-proyectada', 'parametros/mei-tipo-total.json', 'internacional/eurostat-espana.json#gasto-old-srv-no-aplica-no-aplica-pc-gdp'],
      [('Gasto en pensiones públicas sobre el PIB proyectado', 'Gasto bruto de las pensiones públicas en porcentaje del PIB, según el Ageing Report 2024 (escenario de referencia y variantes) y la OCDE (PPEP).', ['demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-64', 'internacional/ocde-espana.json#ppep-no-aplica-z-z-pt-b1gq']),
       ('Balance del sistema de pensiones', 'Cotizaciones menos gasto bruto de pensiones, en % del PIB, según el Ageing Report 2024.', ['demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-74']),
       ('Sostenibilidad', 'No hay una definición única: puede referirse al gasto sobre PIB, al saldo financiero, a la adecuación de las prestaciones o a la capacidad de financiación con las reglas vigentes.', None)],
      ['Que el sistema sea o no sostenible: depende de la definición, de las hipótesis demográficas y económicas y de las reformas futuras.', 'Las proyecciones no son predicciones: son escenarios con hipótesis explícitas.'],
      'Comprobar los criterios de sostenibilidad aplicables (gasto/PIB, saldo, ratio de dependencia, mecanismos automáticos como el MEI), la sensibilidad a las hipótesis de fecundidad, mortalidad y migración (INE, EUROPOP2025, Ageing Report) y las reglas vigentes de revalorización y base máxima.'),
    M('mayores-en-pobreza', '«Los pensionistas españoles viven en la pobreza.»',
      ['internacional/eurostat-espana.json#pobreza-o-exclusion-total-y-ge65-pc', 'internacional/ocde-espana.json#oaip-total-y-ge66-z-pt-pop-sex-age', 'parametros/pension-minima-jubilacion.json', 'parametros/pnc-importe-anual.json'],
      [('Riesgo de pobreza o exclusión social (AROPE) de los mayores de 65', 'Personas de 65 o más años en riesgo de pobreza o exclusión social según el indicador de Eurostat (ilc_peps01n); la definición detallada del indicador es la de Eurostat y no se ha descargado en esta fase.', ['internacional/eurostat-espana.json#pobreza-o-exclusion-total-y-ge65-pc']),
       ('Pobreza de renta de los mayores (OCDE)', 'Medida OAIP de la OCDE; literal de la fuente: «Old age income poverty rate below 50% of median income», referida a personas de 66 o más años.', ['internacional/ocde-espana.json#oaip-total-y-ge66-z-pt-pop-sex-age']),
       ('Pensión mínima o no contributiva frente a un umbral', 'Cuantía mínima de la pensión o de la PNC frente a un umbral de pobreza (la regla de las mínimas usa el umbral de pobreza de un hogar de dos adultos).', ['parametros/pension-minima-jubilacion.json'])],
      ['Que la población pensionista sea pobre o no: el resultado depende del indicador (renta relativa o AROPE), del umbral, de la edad (65 o 66) y de lo que se compute como renta.', 'La distribución de las pensiones por cuantía no está en /data.'],
      'Comprobar la sensibilidad de las tasas de pobreza al umbral y a la escala de equivalencia, el tratamiento de la vivienda en propiedad y otro patrimonio, y la comparabilidad del indicador AROPE de Eurostat con el OAIP de la OCDE.'),
    M('pensiones-sustituyen-casi-todo-el-salario', '«En España la pensión sustituye casi todo el último salario.»',
      ['internacional/ocde-espana.json#gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024', 'internacional/ocde-espana.json#nprr100-hombres-z-m-pt-earn-n-pre-ret-inc-2024', 'internacional/ocde-espana.json#gprr200-hombres-z-m-pt-earn-g-pre-ret-inc-2024', 'internacional/contraste-espana.json#pension-altas-sobre-salario-eaes', 'internacional/contraste-espana.json#pension-vigor-sobre-salario-eaes', 'internacional/ocde-pag.json'],
      [('Tasa de reposición bruta teórica (OCDE)', 'Pensión bruta de una persona con carrera completa desde los 22 años como porcentaje de sus ingresos brutos antes de jubilarse a ese mismo nivel de renta (GPRR), con parámetros de 2024.', ['internacional/ocde-espana.json#gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024']),
       ('Tasa de reposición neta teórica (OCDE)', 'Pensión neta de impuestos y cotizaciones como porcentaje del ingreso neto previo (NPRR).', ['internacional/ocde-espana.json#nprr100-hombres-z-m-pt-earn-n-pre-ret-inc-2024']),
       ('Cociente empírico pensión media / salario medio', 'Pensión media de las altas de jubilación o de las pensiones en vigor (14 pagas) entre un salario medio anual: compara colectivos, no una carrera.', ['internacional/contraste-espana.json#pension-altas-sobre-salario-eaes', 'internacional/contraste-espana.json#pension-vigor-sobre-salario-eaes'])],
      ['Que los pensionistas reales perciban esa proporción: la tasa de la OCDE es teórica, para una carrera completa y un nivel de renta dado.', 'Las diferencias entre la tasa teórica y el cociente empírico no se pueden descomponer con los datos: las carreras reales son más cortas, hay mínimos y topes y la media de salarios no es la renta de quien se jubila.'],
      'Comprobar la comparabilidad de la tasa de reposición teórica de la OCDE (carrera completa desde los 22, indexación de ingresos y supuestos de crecimiento) con una tasa calculada a partir de las reglas propias (escala de porcentajes, base reguladora, actualización de bases) y con los cocientes empíricos; reproducir el 100 % del salario medio con la fórmula vigente.'),
    M('espana-gasta-mas-que-europa', '«España gasta en pensiones más que la media europea.»',
      ['internacional/eurostat-espana.json#gasto-old-srv-no-aplica-no-aplica-pc-gdp', 'internacional/eurostat-indicadores.json', 'internacional/ocde-espana.json#pep-no-aplica-z-z-pt-b1gq', 'internacional/ocde-pag.json', 'internacional/contraste-espana.json#gasto-pensiones-contributivas-sobre-pib'],
      [('Prestaciones de vejez y supervivencia sobre el PIB (Eurostat, ESSPROS)', 'Gasto en prestaciones de las funciones vejez y supervivencia en porcentaje del PIB, para España y la UE-27.', ['internacional/eurostat-espana.json#gasto-old-srv-no-aplica-no-aplica-pc-gdp']),
       ('Gasto público en pensiones sobre el PIB (OCDE)', 'Gasto público en pensiones (medida PEP, literal «Public expenditure on pensions») según la OCDE; su delimitación es la de la OCDE.', ['internacional/ocde-espana.json#pep-no-aplica-z-z-pt-b1gq']),
       ('Pensiones contributivas del Sistema de la Seguridad Social sobre el PIB', 'Obligaciones por «suma de pensiones» de la ejecución del presupuesto, sin Clases Pasivas ni PNC.', ['internacional/contraste-espana.json#gasto-pensiones-contributivas-sobre-pib'])],
      ['Que el gasto sea alto o bajo «para España»: depende de la definición, del PIB y de la estructura de edades; los datos no ajustan por envejecimiento ni por tasa de reposición.', 'La media europea depende de qué países entran (UE-27, OCDE, los once de data/internacional).'],
      'Comprobar la comparabilidad de las definiciones de gasto (ESSPROS vejez y supervivencia, gasto público en pensiones de la OCDE, pensiones contributivas del Sistema) y plantear una comparación ajustada por estructura de edades (por ejemplo, gasto por mayor de 65 años o relativo al PIB por trabajador).'),
    M('pensiones-siempre-con-el-ipc', '«Las pensiones se revalorizan siempre con el IPC.»',
      ['parametros/revalorizacion-general.json', 'parametros/revalorizacion-regla.json#2024-ultimo-mes-medicion', 'parametros/ipc-variacion-media-anual.json', 'parametros/ipc-variacion-diciembre.json'],
      [('IPC medio anual', 'Variación de la media anual del índice de precios de consumo (INE).', ['parametros/ipc-variacion-media-anual.json']),
       ('IPC de diciembre', 'Variación interanual del índice en diciembre (INE).', ['parametros/ipc-variacion-diciembre.json']),
       ('Regla vigente del artículo 58', 'Media de los IPC interanuales de los meses que fija la regla hasta un último mes de medición, con las reglas de suelo e indicadores de data/parametros.', ['parametros/revalorizacion-regla.json#2024-ultimo-mes-medicion']),
       ('Revalorización aplicada cada año', 'Porcentaje con el que se revalorizaron las pensiones cada año, según la norma de ese año.', ['parametros/revalorizacion-general.json'])],
      ['Si la revalorización igualó al IPC en cada año: depende de qué IPC y de qué periodo se compare y de las reglas de cada año (en algunos años la revalorización publicada es distinta de las variaciones del IPC de data/parametros).', 'El poder adquisitivo de una persona concreta depende de su cesta de consumo y de los complementos que perciba.'],
      'Comprobar año a año la diferencia entre el porcentaje de revalorización de data/parametros/revalorizacion-general y las distintas medidas de IPC (media anual, diciembre, media de 12 meses hasta noviembre), identificar los años con regla distinta y calcular el efecto acumulado sobre el poder adquisitivo con cada medida.'),
    M('sin-nacimientos-no-hay-pensiones', '«Con menos nacimientos no se podrán pagar las pensiones.»',
      ['demografia/fecundidad-indicadores.json#icf-ambas', 'demografia/proyecciones-hipotesis.json#icf-proyectado', 'demografia/proyecciones-hipotesis.json#tasa-dependencia-proyectada', 'demografia/europop2025-indicadores.json#europop2025-olddep1', 'macro/pib-ine.json#pib-corriente', 'demografia/migraciones-exterior-anual.json#saldo-exterior-ambos-publicado-emcr'],
      [('Indicador coyuntural de fecundidad', 'Número medio de hijos por mujer según las tasas de fecundidad por edad del año (INE) y su proyección.', ['demografia/fecundidad-indicadores.json#icf-ambas', 'demografia/proyecciones-hipotesis.json#icf-proyectado']),
       ('Tasa de dependencia demográfica', 'Población fuera de las edades de trabajo entre población en edad de trabajar; hay variantes (15-64 o 20-64, solo mayores o mayores y menores de edad) y proyecciones del INE y de Eurostat.', ['demografia/proyecciones-hipotesis.json#tasa-dependencia-proyectada', 'demografia/europop2025-indicadores.json#europop2025-olddep1']),
       ('Dependencia económica', 'Relaciones entre población inactiva y empleada que publica el Ageing Report 2024 (tablas II.1.61 a II.1.63), que incorporan hipótesis de empleo.', None)],
      ['Que los nacimientos determinen por sí solos la sostenibilidad: el gasto depende también de la mortalidad, la migración, el empleo, la productividad y las reglas de cálculo.', 'El efecto de una variación de la fecundidad en el PIB no se puede estimar con los datos de /data sin un modelo.'],
      'Comprobar la contribución relativa de fecundidad, mortalidad, migración y empleo a la tasa de dependencia y al gasto en pensiones (análisis de sensibilidad del Ageing Report y variantes de EUROPOP2025) y qué hipótesis de empleo y productividad hacen falta para pasar de la dependencia demográfica a la económica.'),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {'tipo': 'mitos', 'id': 'afirmaciones-circulantes', 'title': 'Catálogo de afirmaciones frecuentes sobre las pensiones en España: datos y definiciones, sin veredicto',
           'description': 'Doce afirmaciones que circulan sobre las pensiones, formuladas de forma neutral. Para cada una: los datos de /data que permiten contrastarla, las definiciones alternativas que condicionan el resultado y lo que NO se puede concluir con los datos disponibles. '
                          'El catálogo no emite veredictos (verdadero o falso). Todas están pendientes de revisión actuarial, con una pregunta concreta.',
           'mitos': MITOS}
    json.dump(out, open(f'{OUT}/afirmaciones-circulantes.json', 'w'), ensure_ascii=False, indent=2)
    open(f'{OUT}/afirmaciones-circulantes.json', 'a').write('\n')
    print('mitos', len(MITOS))


if __name__ == '__main__':
    main()
