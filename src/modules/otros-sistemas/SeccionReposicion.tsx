import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { seleccionarPaises, valorEnAnio } from '../../engine/comparativa-internacional';
import type { Dato } from '../../engine/esquema-datos';
import { formatearNumero } from '../../engine/formato';
import { aniosOcde, serieOcde, valoresOcde } from './consultas';
import { datosSistemas } from './datos-sistemas';
import { GraficoBarrasPaises } from './GraficoPaises';
import {
  CONTRASTE,
  NIVEL_ESCENARIO,
  NIVEL_INICIAL,
  NIVELES_REPOSICION,
  SUPUESTO_DEFINICION,
  SUPUESTO_ESCENARIO_PAIS,
  SUPUESTOS_NUMERICOS,
  SUPUESTOS_TEXTO,
  UNIDAD_REPOSICION_BRUTA,
  UNIDAD_REPOSICION_NETA,
  medidaReposicion,
  type CodigoNivel,
} from './ids-datos';
import { CODIGOS_PAISES, CODIGO_ESPANA, nombrePais } from './paises';
import { APARTADOS } from './apartados';

type Sexo = 'hombres' | 'mujeres';
type Obligatoriedad = 'M' | 'MV';

const ETIQUETA_SUPUESTO: Readonly<Record<string, string>> = {
  'ocde-pag-2025-trabajador-que-entra-en-2024': 'Persona modelo',
  'ocde-pag-2025-carrera-completa': 'Carrera',
  'ocde-pag-2025-duracion-carrera': 'Duración de la carrera',
  'ocde-pag-2025-salario-relativo-constante': 'Salario',
  'ocde-pag-2025-salario-medio-definicion': 'Salario medio',
  'ocde-pag-2025-mortalidad': 'Mortalidad',
  'ocde-pag-2025-renta-vitalicia-indexada': 'Planes de aportación definida',
  'ocde-pag-2025-politica-fiscal-constante': 'Impuestos y cotizaciones',
  'ocde-pag-2025-tasa-neta-definicion': 'Tasa neta',
  'ocde-pag-2025-cotizaciones-pensionistas-general': 'Cotizaciones de los pensionistas',
  'ocde-pag-2025-impuestos-pensionistas-en-perfiles': 'Impuestos de los pensionistas',
};

/** Tasa de reposición teórica de la OCDE: bruta y neta lado a lado, con sus supuestos a la vista. */
export function SeccionReposicion({ seleccion }: { readonly seleccion: ReadonlySet<string> }) {
  const d = datosSistemas();
  const [nivel, setNivel] = useState<CodigoNivel>(NIVEL_INICIAL);
  const [sexo, setSexo] = useState<Sexo>('hombres');
  const [obligatoriedad, setObligatoriedad] = useState<Obligatoriedad>('M');
  // La OCDE solo publica «obligatoria y voluntaria» para hombres: con mujeres se usa «obligatoria».
  const opcionalidad: Obligatoriedad = sexo === 'mujeres' ? 'M' : obligatoriedad;
  const veces = NIVELES_REPOSICION.find((n) => n.codigo === nivel)?.veces ?? 1;

  const filtroBruta = {
    medida: medidaReposicion('bruta', nivel),
    unidad: UNIDAD_REPOSICION_BRUTA,
    sexo,
    opcionalidad,
  };
  const filtroNeta = {
    medida: medidaReposicion('neta', nivel),
    unidad: UNIDAD_REPOSICION_NETA,
    sexo,
    opcionalidad,
  };
  const anio =
    aniosOcde(d.ocde.observaciones, { medida: medidaReposicion('bruta', nivel) }).at(-1) ?? 0;

  const { bruta, neta } = useMemo(() => {
    const valores = (f: typeof filtroBruta) =>
      seleccionarPaises(valoresOcde(d.ocde.observaciones, f, anio, CODIGOS_PAISES), seleccion);
    return { bruta: valores(filtroBruta), neta: valores(filtroNeta) };
    // Los filtros se reconstruyen en cada render; solo importan estos valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, nivel, sexo, opcionalidad, anio, seleccion]);
  const espanaBruta = valorEnAnio(
    serieOcde(d.ocde.observaciones, filtroBruta, CODIGO_ESPANA),
    anio,
  );
  const espanaNeta = valorEnAnio(serieOcde(d.ocde.observaciones, filtroNeta, CODIGO_ESPANA), anio);

  const datoOcde = d.ocde.dato(String(anio));
  const textoNivel = `${formatearNumero(veces)} ${veces === 1 ? 'vez' : 'veces'} el salario medio`;
  const definicionNeta = d.supuesto(SUPUESTO_DEFINICION.tasaNeta);
  const fuenteSupuestos = d.supuesto(SUPUESTOS_TEXTO[0]).dato.source.title;
  const sinMujeresVoluntaria = sexo === 'mujeres' && obligatoriedad === 'MV';

  // Tabla de supuestos
  const filasTexto = SUPUESTOS_TEXTO.map((id) => {
    const s = d.supuesto(id);
    return { supuesto: ETIQUETA_SUPUESTO[id] ?? id, valor: String(s.valor), dato: s.dato };
  });
  const filasNumericas = SUPUESTOS_NUMERICOS.map((fila) => {
    const base = d.supuesto(fila.base);
    const alt = d.supuesto(fila.alternativo);
    return {
      concepto: fila.concepto,
      base: typeof base.valor === 'number' ? base.valor : null,
      alternativo: typeof alt.valor === 'number' ? alt.valor : null,
      unidad: base.unidad,
      datos: [base.dato, alt.dato],
    };
  });
  const datosSupuestos: Dato[] = [
    ...filasTexto.map((f) => f.dato),
    ...filasNumericas.flatMap((f) => f.datos),
  ];

  // Sensibilidad al escenario alternativo (tabla 5.4 de la OCDE): solo tres países.
  const baseNivel = NIVEL_ESCENARIO;
  const filasEscenario = (
    Object.keys(SUPUESTO_ESCENARIO_PAIS) as (keyof typeof SUPUESTO_ESCENARIO_PAIS)[]
  ).map((pais) => {
    const alt = d.supuesto(SUPUESTO_ESCENARIO_PAIS[pais]);
    const base = valorEnAnio(
      serieOcde(
        d.ocde.observaciones,
        {
          medida: medidaReposicion('bruta', baseNivel),
          unidad: UNIDAD_REPOSICION_BRUTA,
          sexo: 'hombres',
          opcionalidad: 'M',
        },
        pais,
      ),
      anio,
    );
    const valorAlt = typeof alt.valor === 'number' ? alt.valor : null;
    return {
      pais: nombrePais(pais),
      base,
      alternativo: valorAlt,
      diferencia: base === null || valorAlt === null ? null : valorAlt - base,
      dato: alt.dato,
    };
  });

  // España: tasa teórica y cocientes empíricos propios.
  const cocientes = CONTRASTE.cocientes.map((id) => d.contraste.cifra(id));
  const filasEspana = [
    { medida: 'OCDE: tasa bruta teórica', valor: espanaBruta, anio: String(anio) },
    { medida: 'OCDE: tasa neta teórica', valor: espanaNeta, anio: String(anio) },
    ...cocientes.map((c) => ({
      medida: c.titulo,
      valor: c.valor * 100,
      anio: String(c.anio),
    })),
  ];

  return (
    <section
      className="seccion prosa sistemas-seccion ancho-completo"
      aria-labelledby={APARTADOS.reposicion.destino}
    >
      <h2 id={APARTADOS.reposicion.destino} tabIndex={-1}>
        {APARTADOS.reposicion.titulo}
      </h2>
      <p>
        La tasa de reposición compara la primera pensión con el salario previo a la jubilación. La
        OCDE la calcula de forma teórica para una persona modelo y publica dos versiones del mismo
        concepto: sobre ingresos brutos y sobre ingresos netos de impuestos y cotizaciones. Se
        muestran las dos, lado a lado, sin elegir una.
      </p>
      <div className="sistemas-controles">
        <SegmentedPills<CodigoNivel>
          leyenda="Nivel de salario de la persona modelo"
          opciones={NIVELES_REPOSICION.map((n) => ({
            valor: n.codigo,
            etiqueta: `${formatearNumero(n.veces)} ${n.veces === 1 ? 'vez' : 'veces'} el salario medio`,
          }))}
          valor={nivel}
          onCambio={setNivel}
        />
        <SegmentedPills<Sexo>
          leyenda="Sexo"
          opciones={[
            { valor: 'hombres', etiqueta: 'Hombres' },
            { valor: 'mujeres', etiqueta: 'Mujeres' },
          ]}
          valor={sexo}
          onCambio={setSexo}
        />
        <SegmentedPills<Obligatoriedad>
          leyenda="Planes que se incluyen"
          opciones={[
            { valor: 'M', etiqueta: 'Solo obligatorios' },
            {
              valor: 'MV',
              etiqueta: 'Obligatorios y voluntarios',
              deshabilitada: sexo === 'mujeres',
            },
          ]}
          valor={opcionalidad}
          onCambio={setObligatoriedad}
        />
      </div>
      {sinMujeresVoluntaria ? (
        <p className="hist-aviso">
          La OCDE publica la versión con planes voluntarios solo para hombres; se muestra la de
          planes obligatorios.
        </p>
      ) : null}

      <div className="paneles-dos">
        <GraficoBarrasPaises
          titulo={`Tasa de reposición bruta teórica, ${textoNivel}, ${anio}`}
          descripcion={`Porcentaje de los ingresos brutos previos a la jubilación. Medida «${d.ocde.literalMedida(medidaReposicion('bruta', nivel))}».`}
          unidadEje="% de los ingresos brutos"
          decimales={1}
          valores={bruta}
          valorEspana={espanaBruta}
          tituloDiferencia="Diferencia con España (puntos porcentuales)"
          fuentes={datoOcde}
          nota="Parámetros de pensiones de la edición vigente de la OCDE; los supuestos están en la tabla de más abajo."
          comoLeerlo={
            <>
              <p>
                Cada barra es la pensión bruta de la persona modelo, como porcentaje de sus ingresos
                brutos antes de jubilarse, para el nivel de salario elegido. El orden es de mayor a
                menor.
              </p>
              <p>
                No es la pensión real de nadie: supone una carrera completa sin interrupciones, un
                salario que crece como el medio y los parámetros del año de la fuente. Los países no
                son directamente comparables porque sus sistemas calculan la pensión de forma
                distinta (por ejemplo, con distintos periodos de cálculo o con planes privados) y
                porque cambia con los supuestos económicos.
              </p>
            </>
          }
        />
        <GraficoBarrasPaises
          titulo={`Tasa de reposición neta teórica, ${textoNivel}, ${anio}`}
          descripcion={`Porcentaje de los ingresos netos previos a la jubilación. Medida «${d.ocde.literalMedida(medidaReposicion('neta', nivel))}».`}
          unidadEje="% de los ingresos netos"
          decimales={1}
          valores={neta}
          valorEspana={espanaNeta}
          tituloDiferencia="Diferencia con España (puntos porcentuales)"
          fuentes={datoOcde}
          nota={<>Definición de la OCDE: {String(definicionNeta.valor)}</>}
          comoLeerlo={
            <>
              <p>
                Cada barra es la pensión neta como porcentaje de los ingresos netos previos, tras
                descontar los impuestos y cotizaciones que pagan la persona activa y la pensionista.
                El orden es de mayor a menor en esta medida.
              </p>
              <p>
                La tasa neta puede ser mayor o menor que la bruta según la fiscalidad de cada país:
                los impuestos y cotizaciones concretos que se aplican a los pensionistas de cada
                país no están en los datos consultados. Por eso la diferencia entre la tasa bruta y
                la neta no se puede atribuir a una causa con estos datos.
              </p>
            </>
          }
        />
      </div>

      <h3 id="reposicion-supuestos">Supuestos de la OCDE a la vista</h3>
      <p>
        Estos son los supuestos con los que la OCDE calcula las tasas anteriores, tal como constan
        en «{fuenteSupuestos}». El escenario alternativo se usa solo para comprobar cómo cambia el
        resultado con otros supuestos económicos.
      </p>
      <div className="sistemas-tabla">
        <DataTable
          titulo="Supuestos del cálculo de la tasa de reposición teórica de la OCDE"
          columnas={[
            { clave: 'supuesto', titulo: 'Supuesto' },
            { clave: 'valor', titulo: 'Qué supone' },
          ]}
          filas={filasTexto.map(({ supuesto, valor }) => ({ supuesto, valor }))}
        />
      </div>
      <div className="sistemas-tabla">
        <DataTable
          titulo="Supuestos económicos del escenario base y del escenario alternativo de la OCDE"
          columnas={[
            { clave: 'concepto', titulo: 'Supuesto económico (unidad)' },
            { clave: 'base', titulo: 'Base', tipo: 'numero' },
            { clave: 'alternativo', titulo: 'Alternativo', tipo: 'numero' },
          ]}
          filas={filasNumericas.map(({ concepto, base, alternativo, unidad }) => ({
            concepto: `${concepto} (${unidad})`,
            base,
            alternativo,
          }))}
        />
        <SourceLine
          datos={datosSupuestos}
          titulo="Supuestos económicos del escenario base y del escenario alternativo de la OCDE"
        />
      </div>

      <h3 id="reposicion-sensibilidad">Cuánto cambia la tasa bruta con el escenario alternativo</h3>
      <p>
        La OCDE publica la tasa bruta con el escenario alternativo solo para tres países. La cifra
        de cada país depende de cómo revaloriza los ingresos pasados y, por tanto, de los supuestos
        de crecimiento. {String(d.supuesto(SUPUESTO_DEFINICION.sensibilidadEspana).valor)}
      </p>
      <div className="sistemas-tabla">
        <DataTable
          titulo="Tasa bruta de reposición del escenario base y del alternativo, hombres, carrera completa al salario medio"
          columnas={[
            { clave: 'pais', titulo: 'País' },
            {
              clave: 'base',
              titulo: 'Base (%)',
              tipo: 'numero',
              decimales: 1,
            },
            {
              clave: 'alternativo',
              titulo: 'Alternativo (%)',
              tipo: 'numero',
              decimales: 1,
            },
            {
              clave: 'diferencia',
              titulo: 'Diferencia (puntos)',
              tipo: 'numero',
              decimales: 1,
            },
          ]}
          filas={filasEscenario.map(({ pais, base, alternativo, diferencia }) => ({
            pais,
            base,
            alternativo,
            diferencia,
          }))}
        />
        <SourceLine
          datos={[datoOcde, ...filasEscenario.map((f) => f.dato)]}
          titulo="Tasa bruta de reposición del escenario base y del alternativo, hombres, carrera completa al salario medio"
        />
      </div>

      <h3 id="reposicion-espana">
        España: la tasa teórica de la OCDE y los cocientes empíricos propios
      </h3>
      <p>
        La tasa teórica de la OCDE no equivale a los cocientes que se pueden calcular con datos
        reales de España (pensión media por catorce pagas entre salario medio): estos mezclan
        colectivos con carreras de distinta duración, pensiones mínimas y topes, y varían según la
        definición de salario medio. Se ponen juntos para ver el orden de magnitud, no para decidir
        cuál de ellas es la tasa de reposición.
      </p>
      <div className="sistemas-tabla">
        <DataTable
          titulo="Tasa de reposición de la OCDE para España y cocientes entre pensión media y salario medio de datos propios"
          columnas={[
            { clave: 'medida', titulo: 'Medida' },
            { clave: 'anio', titulo: 'Año' },
            { clave: 'valor', titulo: '%', tipo: 'numero', decimales: 1 },
          ]}
          filas={filasEspana}
          pie="Los valores de la OCDE son los del sexo, el nivel de salario y los planes elegidos arriba; los cocientes propios son de ambos sexos. Los datos consultados no permiten descomponer la diferencia entre ellos."
        />
        <SourceLine
          datos={[datoOcde, ...cocientes.map((c) => c.dato)]}
          titulo="Tasa de reposición de la OCDE para España y cocientes entre pensión media y salario medio de datos propios"
        />
      </div>
    </section>
  );
}
