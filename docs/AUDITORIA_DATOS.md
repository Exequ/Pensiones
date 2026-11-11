# Auditoría de los datos

Generada el 2026-11-11 por `scripts/etl/auditoria.py`: no edites a mano. Recorre 109 ficheros JSON de `/data` y sus CSV hermanos.

## Resumen

| Carpeta | Ficheros | Elementos (series, datos, filas de tabla, normas, prestaciones, afirmaciones) |
| --- | ---: | ---: |
| demografia | 18 | 151546 |
| internacional | 7 | 9452 |
| macro | 11 | 27702 |
| mitos | 1 | 12 |
| normativa | 2 | 35 |
| parametros | 45 | 1472 |
| sistema | 25 | 12978 |

- Elementos sin fuente con URL: **0**. Sin fecha de descarga: **0**. (El esquema ya los rechaza: `validate:data` falla.)
- Con confianza baja: **1**. Derivados (marcados en título, descripción o notas): **84**.
- Series anuales o trimestrales con huecos: **16**. Unidades con grafías casi iguales: **0**. Identificadores de dato con unidades distintas en un fichero: **1**.
- Series duplicadas (misma unidad y mismos puntos) entre ficheros: **5**. Tablas con claves de dimensión repetidas: **0**.

## Matriz de cobertura

Primer y último periodo de cada fichero (años, o años de la primera columna de periodo de las tablas) y número de series con huecos (años o trimestres que faltan entre el primero y el último de la serie).

| Carpeta | Fichero | Tipo | Elementos | Primer periodo | Último periodo | Series con huecos |
| --- | --- | --- | ---: | --- | --- | ---: |
| demografia | ageing-report-2024-espana | datos | 84 | 2022 | 2070 | 0 |
| demografia | esperanza-vida-anual | datos | 6 | 1975 | 2024 | 0 |
| demografia | europop2025-indicadores | datos | 18 | 2025 | 2100 | 0 |
| demografia | europop2025-poblacion | tabla | 22800 | 2025 | 2100 |  |
| demografia | eurostat-poblacion-edad-sexo | tabla | 16245 | 1960 | 2025 |  |
| demografia | eurostat-poblacion-total | datos | 3 | 1960 | 2025 | 0 |
| demografia | fecundidad-indicadores | datos | 7 | 1975 | 2024 | 0 |
| demografia | fecundidad-tasas-edad | tabla | 5250 | 1975 | 2024 |  |
| demografia | migraciones-exterior-anual | datos | 21 | 2008 | 2024 | 0 |
| demografia | migraciones-exterior-edad-sexo | tabla | 14742 | 2008 | 2024 |  |
| demografia | mortalidad-ine | tabla | 14670 | 1975 | 2024 |  |
| demografia | poblacion-edad-sexo | tabla | 16518 | 1971 | 2026 |  |
| demografia | proyecciones-emigracion-edad | tabla | 13650 | 2026 | 2075 |  |
| demografia | proyecciones-fecundidad-edad | tabla | 1750 | 2026 | 2075 |  |
| demografia | proyecciones-hipotesis | datos | 29 | 2026 | 2076 | 0 |
| demografia | proyecciones-inmigracion-edad | tabla | 15150 | 2026 | 2075 |  |
| demografia | proyecciones-mortalidad | tabla | 15150 | 2026 | 2075 |  |
| demografia | proyecciones-poblacion | tabla | 15453 | 2026 | 2076 |  |
| internacional | contraste-espana | datos | 13 | 2008 | 2025 | 0 |
| internacional | eurostat-espana | datos | 16 | 1990 | 2025 | 0 |
| internacional | eurostat-indicadores | tabla | 4335 | 1990 | 2025 |  |
| internacional | ocde-espana | datos | 71 | 1950 | 2084 | 16 |
| internacional | ocde-pag-codigos | tabla | 79 |  |  |  |
| internacional | ocde-pag | tabla | 4923 | 1950 | 2084 |  |
| internacional | paises-sistemas | datos | 15 | 2024 | 2024 |  |
| macro | base-media-cotizacion-rg-mensual | tabla | 2346 | 2018 | 2026 |  |
| macro | cn-remuneracion-empleo | datos | 5 | 1995 | 2025 | 0 |
| macro | eaes-salario-sexo-edad | tabla | 608 | 2008 | 2024 |  |
| macro | epa-anual-media | tabla | 4621 | 2002 | 2025 |  |
| macro | epa-trimestral | tabla | 19202 | 2002-T1 | 2026-T3 |  |
| macro | etcl-coste-salarial-trimestral | tabla | 888 | 2008-T1 | 2026-T2 |  |
| macro | eurostat-pib | datos | 3 | 1995 | 2025 | 0 |
| macro | pib-ine | datos | 6 | 1995 | 2025 | 0 |
| macro | rendimiento-deuda-10-anios | datos | 1 | 1978 | 2025 | 0 |
| macro | salario-medio-definiciones | datos | 11 | 1995 | 2025 | 0 |
| macro | salario-medio-razon-base-maxima | datos | 11 | 2000 | 2025 | 0 |
| mitos | afirmaciones-circulantes | mitos | 12 |  |  |  |
| normativa | cronologia | cronologia | 19 |  |  |  |
| normativa | prestaciones | prestaciones | 16 |  |  |  |
| parametros | actualizacion-bases | datos | 8 | 2010 | 2026 |  |
| parametros | base-maxima-incremento-futuro | datos | 27 | 2024 | 2050 |  |
| parametros | base-maxima-rg | datos | 27 | 2000 | 2026 |  |
| parametros | base-minima-rg | datos | 25 | 2000 | 2026 |  |
| parametros | carencia-jubilacion | datos | 27 | 2000 | 2026 |  |
| parametros | carrera-jubilacion-65 | datos | 15 | 2013 | 2027 |  |
| parametros | complemento-brecha-genero | datos | 4 | 2023 | 2026 |  |
| parametros | cotizacion-para-100 | datos | 28 | 2000 | 2027 |  |
| parametros | cuota-solidaridad-tipos | datos | 6 | 2025 | 2026 |  |
| parametros | divisor-base-reguladora | datos | 38 | 2000 | 2037 |  |
| parametros | edad-ordinaria-jubilacion | datos | 28 | 2000 | 2027 |  |
| parametros | escala-porcentajes-jubilacion | datos | 28 | 2000 | 2027 |  |
| parametros | fondo-reserva-desembolso-maximo | datos | 21 | 2033 | 2053 |  |
| parametros | ipc-indice-medio-anual | datos | 24 | 2002 | 2025 |  |
| parametros | ipc-variacion-diciembre | datos | 26 | 2000 | 2025 |  |
| parametros | ipc-variacion-media-anual | datos | 23 | 2003 | 2025 |  |
| parametros | iprem-anual | datos | 18 | 2004 | 2023 |  |
| parametros | iprem-diario | datos | 18 | 2004 | 2023 |  |
| parametros | iprem-mensual | datos | 18 | 2004 | 2023 |  |
| parametros | lagunas-integracion | datos | 11 | 2010 | 2026 |  |
| parametros | limite-ingresos-complementos-minimos | datos | 25 | 2002 | 2026 |  |
| parametros | mei-destino | datos | 2 | 2023 | 2023 |  |
| parametros | mei-tipo-empresa | datos | 7 | 2023 | 2029 |  |
| parametros | mei-tipo-total | datos | 7 | 2023 | 2029 |  |
| parametros | mei-tipo-trabajador | datos | 7 | 2023 | 2029 |  |
| parametros | opcion-25-anos-aplicable | datos | 19 | 2026 | 2044 |  |
| parametros | opcion-25-anos-divisor | datos | 18 | 2026 | 2043 |  |
| parametros | opcion-25-anos-ventana | datos | 18 | 2026 | 2043 |  |
| parametros | pension-maxima-incremento-futuro | datos | 26 | 2025 | 2050 |  |
| parametros | pension-maxima | datos | 26 | 2000 | 2026 |  |
| parametros | pension-minima-incapacidad | datos | 265 | 2001 | 2026 |  |
| parametros | pension-minima-jubilacion | datos | 181 | 2001 | 2026 |  |
| parametros | pension-minima-orfandad-familiares | datos | 126 | 2001 | 2026 |  |
| parametros | pension-minima-regla | datos | 9 | 2024 | 2027 |  |
| parametros | pension-minima-viudedad | datos | 99 | 2001 | 2026 |  |
| parametros | periodo-calculo-base-reguladora | datos | 38 | 2000 | 2037 |  |
| parametros | pnc-importe-anual | datos | 26 | 2001 | 2026 |  |
| parametros | prestamos-estado-seguridad-social | datos | 9 | 2021 | 2023 |  |
| parametros | prestamos-plazo-ampliado-2026 | datos | 8 | 2026 | 2026 |  |
| parametros | revalorizacion-general | datos | 25 | 2000 | 2026 |  |
| parametros | revalorizacion-regla | datos | 5 | 2024 | 2024 |  |
| parametros | smi-diario | datos | 27 | 2000 | 2026 |  |
| parametros | smi-mensual | datos | 27 | 2000 | 2026 |  |
| parametros | tipo-cc-empresa | datos | 26 | 2000 | 2026 |  |
| parametros | tipo-cc-trabajador | datos | 26 | 2000 | 2026 |  |
| sistema | afiliacion-anual | datos | 6 | 2001 | 2025 | 0 |
| sistema | afiliacion-media-mensual-regimen | tabla | 3183 |  |  |  |
| sistema | afiliados-sexo-edad | tabla | 180 | 2021 | 2025 |  |
| sistema | altas-bajas-anual-clase-sexo | tabla | 180 | 2021 | 2025 |  |
| sistema | complementos-minimos-regimen-clase-sexo | tabla | 576 | 2022 | 2025 |  |
| sistema | deficit-definiciones | datos | 4 | 2025 | 2026 |  |
| sistema | deficit-presupuestario-seguridad-social | datos | 8 | 2017 | 2025 | 0 |
| sistema | deficit-sec-fondos-seguridad-social | datos | 4 | 2000 | 2025 | 0 |
| sistema | edad-media-altas-jubilacion | datos | 1 | 2022 | 2025 | 0 |
| sistema | fondo-reserva-anual | tabla | 17 | 2009 | 2025 |  |
| sistema | fondo-reserva-series | datos | 3 | 2009 | 2025 | 0 |
| sistema | gastos-impropios | datos | 4 | 2016 | 2023 |  |
| sistema | imserso-pnc-evolucion | tabla | 57 | 2019 | 2025-12 |  |
| sistema | imserso-pnc-perfil-2025 | datos | 9 | 2025 | 2025 |  |
| sistema | mites-anuario-pen1-sexo-clase | tabla | 64 | 2021 | 2025 |  |
| sistema | mites-bel-pen31-cuantias | tabla | 720 | 1990 | 2026 |  |
| sistema | mites-bel-pensiones | tabla | 1202 | 2016 | 2026-ene-sep |  |
| sistema | pensiones-vigor-edad-clase-sexo | tabla | 302 |  |  |  |
| sistema | pensiones-vigor-numero | datos | 18 | 2008 | 2025 | 0 |
| sistema | pensiones-vigor-pension-media | datos | 18 | 2008 | 2025 | 0 |
| sistema | pensiones-vigor-regimen-clase-sexo | tabla | 3083 | 2008 | 2025 |  |
| sistema | pensionistas-pensiones-historico | datos | 2 | 2006 | 2025 | 0 |
| sistema | presupuesto-ss-ejecucion | tabla | 3328 | 2017 | 2026 |  |
| sistema | relacion-afiliados-pensiones-alternativa-1 | datos | 5 | 2008 | 2025 | 0 |
| sistema | relacion-afiliados-pensiones | datos | 4 | 2006 | 2025 | 0 |

## Huecos en series

| Fichero | Serie | Periodos que faltan |
| --- | --- | --- |
| internacional/ocde-espana | ciop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65 | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | ediop-no-aplica-y66t75-z-pt-b6n-a | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | ediop-no-aplica-y-ge66-z-pt-b6n-a | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | ediop-no-aplica-y-ge76-z-pt-b6n-a | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | eiop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65 | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | oaip-mujeres-y-ge66-z-pt-pop-sex-age | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | oaip-hombres-y-ge66-z-pt-pop-sex-age | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | oaip-total-y66t75-z-pt-pop-sex-age | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | oaip-total-y-ge66-z-pt-pop-sex-age | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | oaip-total-y-ge76-z-pt-pop-sex-age | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | oaip-total-t-z-pt-pop-sex-age | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | oawar-no-aplica-y-ge65-z-pt-pop-y20t64 | 1952, 1962, 1990, 1992, 1995, 2000, 2005, 2006, 2007, 2008, 2009, 2010 … (83) |
| internacional/ocde-espana | ocop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65 | 2015, 2017, 2019, 2021 (4) |
| internacional/ocde-espana | pep-no-aplica-z-z-pt-b1gq | 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2001, 2002, 2003 … (27) |
| internacional/ocde-espana | ppep-no-aplica-z-z-pt-b1gq | 2024, 2026, 2027, 2028, 2029, 2031, 2032, 2033, 2034, 2036, 2037, 2038 … (29) |
| internacional/ocde-espana | ptop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65 | 2015, 2017, 2019, 2021 (4) |

Los huecos de `internacional/ocde-espana` son años en que la OCDE no publica la medida (varias se publican con periodicidad irregular: las series de renta de los mayores solo tienen años pares desde 2014 y el gasto sobre PIB, algunos años). Los de otras carpetas, si los hubiera, estarían explicados en `docs/PENDIENTE_DATOS.md`.

## Confianza baja

- sistema/gastos-impropios#transferencia-prevista-pge-2021

## Datos derivados

Calculados por este proyecto a partir de datos publicados (no publicados por la fuente). Conviene tratarlos como cálculos propios.

- demografia/esperanza-vida-anual#esperanza-vida-0-ambos
- demografia/esperanza-vida-anual#esperanza-vida-0-hombres
- demografia/esperanza-vida-anual#esperanza-vida-0-mujeres
- demografia/esperanza-vida-anual#esperanza-vida-65-ambos
- demografia/esperanza-vida-anual#esperanza-vida-65-hombres
- demografia/esperanza-vida-anual#esperanza-vida-65-mujeres
- demografia/migraciones-exterior-anual#inmigracion-ambos-em-2008-2021
- demografia/migraciones-exterior-anual#inmigracion-hombres-em-2008-2021
- demografia/migraciones-exterior-anual#inmigracion-mujeres-em-2008-2021
- demografia/migraciones-exterior-anual#emigracion-ambos-em-2008-2021
- demografia/migraciones-exterior-anual#emigracion-hombres-em-2008-2021
- demografia/migraciones-exterior-anual#emigracion-mujeres-em-2008-2021
- demografia/migraciones-exterior-anual#saldo-exterior-ambos-em-2008-2021
- demografia/migraciones-exterior-anual#saldo-exterior-hombres-em-2008-2021
- demografia/migraciones-exterior-anual#saldo-exterior-mujeres-em-2008-2021
- demografia/migraciones-exterior-anual#inmigracion-ambos-emcr-2021-2024
- demografia/migraciones-exterior-anual#inmigracion-hombres-emcr-2021-2024
- demografia/migraciones-exterior-anual#inmigracion-mujeres-emcr-2021-2024
- demografia/migraciones-exterior-anual#emigracion-ambos-emcr-2021-2024
- demografia/migraciones-exterior-anual#emigracion-hombres-emcr-2021-2024
- demografia/migraciones-exterior-anual#emigracion-mujeres-emcr-2021-2024
- demografia/migraciones-exterior-anual#saldo-exterior-derivado-ambos-emcr-2021-2024
- demografia/migraciones-exterior-anual#saldo-exterior-derivado-hombres-emcr-2021-2024
- demografia/migraciones-exterior-anual#saldo-exterior-derivado-mujeres-emcr-2021-2024
- demografia/migraciones-exterior-edad-sexo (tabla; contiene datos derivados indicados en su descripción o notas)
- internacional/contraste-espana#gasto-pensiones-contributivas-sobre-pib
- internacional/contraste-espana#pension-altas-sobre-salario-eaes
- internacional/contraste-espana#pension-altas-sobre-salario-etcl-x12
- internacional/contraste-espana#pension-altas-sobre-salario-cn-puesto
- internacional/contraste-espana#pension-altas-sobre-salario-base-media-x12
- internacional/contraste-espana#pension-vigor-sobre-salario-eaes
- internacional/contraste-espana#pension-vigor-sobre-salario-etcl-x12
- internacional/contraste-espana#pension-vigor-sobre-salario-cn-puesto
- internacional/contraste-espana#pension-vigor-sobre-salario-base-media-x12
- internacional/contraste-espana#meses-carrera-completa-desde-22-hasta-65
- macro/base-media-cotizacion-rg-mensual (tabla; contiene datos derivados indicados en su descripción o notas)
- macro/epa-anual-media (tabla; contiene datos derivados indicados en su descripción o notas)
- macro/pib-ine#pib-volumen-derivado-2020
- macro/pib-ine#pib-deflactor-derivado-2020
- macro/salario-medio-definiciones#etcl-coste-salarial-total
- macro/salario-medio-definiciones#etcl-coste-salarial-total-x12
- macro/salario-medio-definiciones#cn-remuneracion-por-asalariado-puesto
- macro/salario-medio-definiciones#cn-remuneracion-por-asalariado-etc
- macro/salario-medio-definiciones#cn-remuneracion-por-asalariado-persona
- macro/salario-medio-definiciones#base-media-cotizacion-rg-ambos
- macro/salario-medio-definiciones#base-media-cotizacion-rg-hombres
- macro/salario-medio-definiciones#base-media-cotizacion-rg-mujeres
- macro/salario-medio-razon-base-maxima#razon-eaes-ambos
- macro/salario-medio-razon-base-maxima#razon-eaes-hombres
- macro/salario-medio-razon-base-maxima#razon-eaes-mujeres
- macro/salario-medio-razon-base-maxima#razon-etcl-coste-salarial-total
- macro/salario-medio-razon-base-maxima#razon-etcl-coste-salarial-total-x12
- macro/salario-medio-razon-base-maxima#razon-cn-remuneracion-por-asalariado-puesto
- macro/salario-medio-razon-base-maxima#razon-cn-remuneracion-por-asalariado-etc
- macro/salario-medio-razon-base-maxima#razon-cn-remuneracion-por-asalariado-persona
- macro/salario-medio-razon-base-maxima#razon-base-media-cotizacion-rg-ambos
- macro/salario-medio-razon-base-maxima#razon-base-media-cotizacion-rg-hombres
- macro/salario-medio-razon-base-maxima#razon-base-media-cotizacion-rg-mujeres
- sistema/afiliacion-anual#media-anual-total-sistema
- sistema/afiliacion-anual#media-anual-general
- sistema/afiliacion-anual#media-anual-autonomos
- sistema/deficit-definiciones#saldo-presupuestario-no-financiero
- sistema/deficit-definiciones#saldo-presupuestario-total
- sistema/deficit-presupuestario-seguridad-social#saldo-presupuestario-no-financiero
- sistema/deficit-presupuestario-seguridad-social#saldo-presupuestario-total
- sistema/fondo-reserva-anual (tabla; contiene datos derivados indicados en su descripción o notas)
- sistema/fondo-reserva-series#disposiciones-anuales
- sistema/fondo-reserva-series#dotaciones-mei-anuales
- sistema/imserso-pnc-perfil-2025#jubilacion-hombres-2025
- sistema/imserso-pnc-perfil-2025#jubilacion-mujeres-2025
- sistema/imserso-pnc-perfil-2025#jubilacion-total-2025
- sistema/imserso-pnc-perfil-2025#invalidez-hombres-2025
- sistema/imserso-pnc-perfil-2025#invalidez-mujeres-2025
- sistema/imserso-pnc-perfil-2025#invalidez-total-2025
- sistema/imserso-pnc-perfil-2025#total-hombres-2025
- sistema/imserso-pnc-perfil-2025#total-mujeres-2025
- sistema/imserso-pnc-perfil-2025#total-total-2025
- sistema/presupuesto-ss-ejecucion (tabla; contiene datos derivados indicados en su descripción o notas)
- sistema/relacion-afiliados-pensiones-alternativa-1#afiliados-por-pension-alternativa-1
- sistema/relacion-afiliados-pensiones-alternativa-1#afiliados-por-pensionista-alternativa-1
- sistema/relacion-afiliados-pensiones#afiliados-diciembre-por-pensionista
- sistema/relacion-afiliados-pensiones#afiliados-diciembre-por-pension
- sistema/relacion-afiliados-pensiones#afiliados-media-anual-por-pensionista
- sistema/relacion-afiliados-pensiones#afiliados-media-anual-por-pension

## Unidades

Grafías de unidad que solo difieren en mayúsculas, espacios o signos (candidatas a unificar si las series se combinan):

Ninguna.

Identificadores de dato (sin el año inicial) con más de una unidad dentro del mismo fichero:

- parametros/lagunas-integracion: `tramo1-meses` → meses (los primeros con laguna, contados desde el hecho causante hacia atrás), meses (todos los de la ventana de 180)

## Duplicados

Series con la misma unidad y los mismos puntos en ficheros distintos:

- demografia/europop2025-indicadores#europop2025-migracion-neta-total = demografia/europop2025-indicadores#europop2025-nmigrat — misma magnitud (migración neta) de dos conjuntos de Eurostat (proj_25nanmig y proj_25ndbi)
- demografia/migraciones-exterior-anual#saldo-exterior-derivado-ambos-emcr-2021-2024 = demografia/migraciones-exterior-anual#saldo-exterior-ambos-publicado-emcr — el saldo derivado de la tabla por edad coincide con el publicado por la EMCR (comprobación de la verificación 1B-3)
- demografia/migraciones-exterior-anual#saldo-exterior-derivado-hombres-emcr-2021-2024 = demografia/migraciones-exterior-anual#saldo-exterior-hombres-publicado-emcr — el saldo derivado de la tabla por edad coincide con el publicado por la EMCR (comprobación de la verificación 1B-3)
- demografia/migraciones-exterior-anual#saldo-exterior-derivado-mujeres-emcr-2021-2024 = demografia/migraciones-exterior-anual#saldo-exterior-mujeres-publicado-emcr — el saldo derivado de la tabla por edad coincide con el publicado por la EMCR (comprobación de la verificación 1B-3)
- macro/salario-medio-razon-base-maxima#razon-etcl-coste-salarial-total = macro/salario-medio-razon-base-maxima#razon-etcl-coste-salarial-total-x12 — la razón del coste salarial mensual con la base máxima mensual es igual a la del coste anual (×12) con la base máxima anual: dos formas de expresar la misma razón

Tablas con claves de dimensión repetidas:

Ninguna.
