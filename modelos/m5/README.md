# M5 v0 · Tasa de reposición por cohortes

## Preparación (una sola vez)
1. Clona el repositorio junto a esta carpeta:  `git clone https://github.com/Exequ/Pensiones`
   (más adelante: `git pull` para traer los datos nuevos de Claude Code).
2. Instala pandas:  `pip install pandas`

Estructura esperada:
```
trabajo/
├── Pensiones/          <- repositorio (los datos están en Pensiones/data/parametros)
└── m5/                 <- esta carpeta (m5_reposicion.py, test_m5.py)
```

## Uso
```
cd m5
python m5_reposicion.py ../Pensiones/data/parametros      # tabla de ejemplo y m5_resultados.csv
python test_m5.py                                         # tests
```

## Cómo usarlo desde Python
```python
from m5_reposicion import Parametros, simular, tabla
p = Parametros.desde_repo("../Pensiones/data/parametros")
simular(rel=1.0, g=0.01, edad_inicio=25, anio_jub=2045, p=p)
```

## Qué lee de /data/parametros
edad-ordinaria-jubilacion, carrera-jubilacion-65, periodo-calculo-base-reguladora,
divisor-base-reguladora, escala-porcentajes-jubilacion. Nada de las reglas está escrito a mano,
salvo el fin de la opción de 25 años (2040), que Claude Code aún no ha estructurado en /data.

## Limitaciones de la v0 (ver cabecera de m5_reposicion.py)
Sin topes (base máxima, pensión máxima y mínima), sin lagunas, sin jubilación anticipada o demorada,
euros constantes. Por eso el resultado no depende todavía del salario relativo: es lineal.
Los topes y la pensión mínima (Fase 1A parte 2) son los que harán aparecer las diferencias entre niveles.
