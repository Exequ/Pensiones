import { useState } from 'react';
import { DataTable, type Columna } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { entero } from '../historico/formatos';
import type { Complemento, FilaTerritorio, Sexo } from './complementos';
import { datosTipos } from './datos-tipos';
import { APARTADOS } from './apartados';

const NOMBRE: Readonly<Record<Complemento, string>> = {
  brecha: 'Complemento para la reducción de la brecha de género',
  maternidad: 'Complemento por maternidad',
};
const ROTULO_SEXO: Readonly<Record<Sexo, string>> = {
  ambos: 'Ambos sexos',
  hombres: 'Hombres',
  mujeres: 'Mujeres',
};

type FilaTabla = Record<string, string | number | null>;

/** Fila de la tabla de territorios: número e importe medio por sexo. */
function filaDeTerritorio(f: FilaTerritorio, rotulo: string): FilaTabla {
  return {
    territorio: rotulo,
    numeroAmbos: f.porSexo.ambos.numero,
    numeroHombres: f.porSexo.hombres.numero,
    numeroMujeres: f.porSexo.mujeres.numero,
    importeAmbos: f.porSexo.ambos.importeMedio,
    importeHombres: f.porSexo.hombres.importeMedio,
    importeMujeres: f.porSexo.mujeres.importeMedio,
  };
}

const COLUMNAS_NUMERO: readonly Columna<FilaTabla>[] = [
  { clave: 'territorio', titulo: 'Territorio' },
  { clave: 'numeroAmbos', titulo: 'Ambos sexos', tipo: 'numero', decimales: 0 },
  { clave: 'numeroHombres', titulo: 'Hombres', tipo: 'numero', decimales: 0 },
  { clave: 'numeroMujeres', titulo: 'Mujeres', tipo: 'numero', decimales: 0 },
];
const COLUMNAS_IMPORTE: readonly Columna<FilaTabla>[] = [
  { clave: 'territorio', titulo: 'Territorio' },
  { clave: 'importeAmbos', titulo: 'Ambos sexos', tipo: 'euros', decimales: 2 },
  { clave: 'importeHombres', titulo: 'Hombres', tipo: 'euros', decimales: 2 },
  { clave: 'importeMujeres', titulo: 'Mujeres', tipo: 'euros', decimales: 2 },
];

/**
 * «Complementos por brecha de género y por maternidad»: cuántas pensiones en vigor llevan cada
 * complemento, su importe medio y el desglose por hijos, por comunidad y provincia (Fase 5-A4). Es un
 * recuento a una fecha: no es la brecha de género de las pensiones de jubilación causadas cada año.
 */
export function SeccionComplementos() {
  const d = datosTipos().complementos;
  const [complemento, setComplemento] = useState<Complemento>('brecha');
  const filas = d.filas[complemento];
  const total = filas.find((f) => f.nivel === 'total');
  if (!total) throw new Error('Falta la fila de total de los complementos');
  const comunidades = filas.filter((f) => f.nivel === 'comunidad');
  const provincias = filas.filter((f) => f.nivel === 'provincia');
  const etiquetas = d.etiquetasTramos[complemento];

  const filasComunidades: FilaTabla[] = [
    filaDeTerritorio(total, 'Total'),
    ...comunidades.map((f) => filaDeTerritorio(f, f.territorio)),
  ];
  const filasProvincias: FilaTabla[] = provincias.map((f) =>
    filaDeTerritorio(f, `${f.territorio} (${f.comunidad})`),
  );
  const filasTramos: FilaTabla[] = etiquetas.map((etiqueta, i) => ({
    tramo: etiqueta,
    ambos: total.porSexo.ambos.tramos[i] ?? null,
    hombres: total.porSexo.hombres.tramos[i] ?? null,
    mujeres: total.porSexo.mujeres.tramos[i] ?? null,
  }));
  const sinHijos = d.sinHijos[complemento];
  const filasVariacion: FilaTabla[] = d.variaciones
    .filter((v) => v.complemento === complemento)
    .map((v) => ({
      sexo: ROTULO_SEXO[v.sexo],
      mesAbsoluta: v.mesAbsoluta,
      mesPorcentaje: v.mesPorcentaje / 100,
      anioAbsoluta: v.anioAbsoluta,
      anioPorcentaje: v.anioPorcentaje / 100,
    }));

  return (
    <section className="seccion prosa" aria-labelledby={APARTADOS.complementos.destino}>
      <h2 id={APARTADOS.complementos.destino} tabIndex={-1}>
        {APARTADOS.complementos.titulo}
      </h2>
      <p>
        Una parte de las pensiones contributivas en vigor lleva un complemento ligado al número de
        hijos: el complemento para la reducción de la brecha de género y el complemento por
        maternidad. La Seguridad Social publica, para una fecha, cuántas pensiones llevan cada uno,
        su importe medio mensual y su desglose por número de hijos, por comunidad autónoma,
        provincia y sexo. Las cifras son de la fecha de la fuente: el recuento de pensiones con
        complemento, no el de personas.
      </p>
      <SegmentedPills<Complemento>
        leyenda="Complemento"
        opciones={[
          { valor: 'brecha', etiqueta: 'Brecha de género' },
          { valor: 'maternidad', etiqueta: 'Maternidad' },
        ]}
        valor={complemento}
        onCambio={setComplemento}
      />
      <h3>{NOMBRE[complemento]}: por comunidad autónoma</h3>
      <DataTable
        titulo={`${NOMBRE[complemento]}: número de pensiones en vigor con el complemento por comunidad autónoma y ciudad autónoma`}
        columnas={COLUMNAS_NUMERO}
        filas={filasComunidades}
        pie="El número cuenta pensiones con el complemento, no personas."
      />
      <DataTable
        titulo={`${NOMBRE[complemento]}: importe medio mensual del complemento por comunidad autónoma y ciudad autónoma`}
        columnas={COLUMNAS_IMPORTE}
        filas={filasComunidades}
        pie="El importe medio es el del complemento, no el de la pensión."
      />
      <SourceLine datos={d.dato} />
      <details className="mito-fuentes">
        <summary>{`Ver las provincias de las comunidades con más de una (${entero(provincias.length)} filas)`}</summary>
        <DataTable
          titulo={`${NOMBRE[complemento]}: número de pensiones en vigor con el complemento por provincia`}
          columnas={COLUMNAS_NUMERO}
          filas={filasProvincias}
          pie="Las comunidades de una sola provincia figuran solo en la tabla de comunidades."
        />
        <DataTable
          titulo={`${NOMBRE[complemento]}: importe medio mensual del complemento por provincia`}
          columnas={COLUMNAS_IMPORTE}
          filas={filasProvincias}
        />
        <SourceLine datos={d.dato} />
      </details>
      <h3>{NOMBRE[complemento]}: por número de hijos</h3>
      <DataTable
        titulo={`${NOMBRE[complemento]}: pensiones en vigor por número de hijos, total nacional`}
        columnas={[
          { clave: 'tramo', titulo: 'Número de hijos' },
          { clave: 'ambos', titulo: 'Ambos sexos', tipo: 'numero', decimales: 0 },
          { clave: 'hombres', titulo: 'Hombres', tipo: 'numero', decimales: 0 },
          { clave: 'mujeres', titulo: 'Mujeres', tipo: 'numero', decimales: 0 },
        ]}
        filas={filasTramos}
        pie={
          <>
            La suma de los tramos es menor que el total en {entero(sinHijos.ambos)} pensiones de
            ambos sexos ({entero(sinHijos.hombres)} de hombres y {entero(sinHijos.mujeres)} de
            mujeres): la fuente indica que no ha sido posible determinar su número de hijos.
          </>
        }
      />
      <SourceLine datos={d.dato} />
      <h3>{NOMBRE[complemento]}: variación publicada por la fuente</h3>
      <DataTable
        titulo={`${NOMBRE[complemento]}: variación del número de pensiones con el complemento en el último mes y en el último año`}
        columnas={[
          { clave: 'sexo', titulo: 'Sexo' },
          { clave: 'mesAbsoluta', titulo: 'Último mes, pensiones', tipo: 'numero', decimales: 0 },
          { clave: 'mesPorcentaje', titulo: 'Último mes, %', tipo: 'porcentaje', decimales: 2 },
          { clave: 'anioAbsoluta', titulo: 'Último año, pensiones', tipo: 'numero', decimales: 0 },
          { clave: 'anioPorcentaje', titulo: 'Último año, %', tipo: 'porcentaje', decimales: 2 },
        ]}
        filas={filasVariacion}
        pie="La fuente publica estas variaciones sin explicarlas y esta página no les atribuye una causa. Los porcentajes están redondeados como en la fuente."
      />
      <SourceLine datos={d.datoIndicadores} />
      <ComoLeerlo>
        <p>
          Las tablas dicen cuántas pensiones en vigor llevan cada complemento en la fecha de la
          fuente y cuál es el importe medio mensual de ese complemento, por sexo y por territorio.
          La fuente publica los números de cada sexo; no se suman con los de otras fechas.
        </p>
        <p>
          No miden la brecha de género de las pensiones de jubilación causadas cada año, que es la
          diferencia entre el importe medio de las pensiones de mujeres y de hombres que usa la ley
          como umbral: esa brecha, publicada por año, no está en este fichero. Tampoco dividen por
          la población ni por el total de pensiones de cada territorio, por lo que las diferencias
          entre comunidades reflejan también su tamaño y la composición de sus pensiones. El importe
          medio del complemento no es el importe de la pensión.
        </p>
        <p>
          Las dos tablas son recuentos distintos y la fuente no indica si una misma pensión figura
          en las dos, por lo que sus números no se suman.
        </p>
      </ComoLeerlo>
    </section>
  );
}
