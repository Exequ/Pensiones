import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { formatearNumero } from '../../engine/formato';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import type { DatosFinanciero } from './datos-financiero';
import { MODELO } from './ids-datos';

const factor = (v: number): string => formatearNumero(v, { decimales: 3 });

/**
 * Del número de pensiones al gasto: el factor de calibración (devengo) de M4. Se calcula aquí con los
 * ficheros de /data del último año observado (la ejecución del presupuesto, el número de pensiones y la
 * pensión media), no se copia de la descripción del modelo. Lo que la descripción atribuye a los
 * complementos a mínimos se presenta como una hipótesis de su autor sin verificar.
 */
export function FinancieroCalibracion({ d }: { d: DatosFinanciero }) {
  const c = d.calibracion;
  const filas = [...c.clases, c.total].map((f) => ({
    clase: f.clase,
    pensiones: f.pensiones,
    media: f.pensionMediaMes,
    gasto: f.gastoEjecucion,
    nominal: f.gastoNominal,
    factor: f.factor,
  }));
  const exceso = (c.total.gastoNominal / c.total.gastoEjecucion - 1) * 100;

  return (
    <>
      <h3 id="proy-fin-calibracion">Del número de pensiones al gasto: el factor de calibración</h3>
      <p>
        La descripción de {MODELO.m4} dice que el gasto en pensiones es el número de pensiones de
        cada clase por la pensión media, por catorce pagas y por un factor de calibración de cada
        clase, que se obtiene con el último año observado y se mantiene constante. Este factor
        existe porque el producto de pensiones por pensión media por pagas no coincide con el gasto
        que declara la ejecución del presupuesto. La tabla calcula el cociente de {c.anio} con los
        datos descargados.
      </p>
      <DataTable
        titulo={`Gasto de la ejecución del presupuesto de ${c.anio} frente a pensiones por pensión media por catorce pagas`}
        columnas={[
          { clave: 'clase', titulo: 'Clase' },
          {
            clave: 'pensiones',
            titulo: 'Pensiones',
            tipo: 'numero',
            decimales: 0,
          },
          { clave: 'media', titulo: 'Media (€/mes)', tipo: 'numero', decimales: 2 },
          {
            clave: 'gasto',
            titulo: 'Gasto (M€)',
            tipo: 'numero',
            decimales: 1,
          },
          {
            clave: 'nominal',
            titulo: 'Producto (M€)',
            tipo: 'numero',
            decimales: 1,
          },
          {
            clave: 'factor',
            titulo: 'Cociente',
            tipo: 'numero',
            decimales: 3,
          },
        ]}
        filas={filas}
        filaDestacada={filas.length - 1}
        pie={`Pensiones en vigor y pensión media mensual, a primero de diciembre. «Gasto» es el de la ejecución del presupuesto y «Producto», pensiones por pensión media por catorce pagas, ambos en millones de euros (M€); el cociente es el gasto entre el producto. El producto supera al gasto de la ejecución en ${formatearNumero(exceso, { decimales: 1 })} % en el conjunto. La ejecución trae además ${formatearNumero(c.gastoSinClase, { decimales: 2 })} millones de euros de pensiones derivadas de la DANA que no pertenecen a ninguna de las cinco clases y solo figuran en el total.`}
      />
      <SourceLine datos={c.fuentes} />
      <p>
        Los complementos a mínimos de las pensiones contributivas figuran en la ejecución como una
        partida aparte, fuera de la suma de pensiones:{' '}
        {formatearNumero(c.complementos.importe, { decimales: 2 })} millones de euros en {c.anio}.
        Si se sumaran al gasto en pensiones, el cociente del conjunto sería{' '}
        {factor(c.complementos.factorConComplementos)} en lugar de {factor(c.total.factor)}.
      </p>
      <SourceLine datos={[c.complementos.dato]} />
      <ComoLeerlo>
        <p>
          Un cociente menor que uno quiere decir que el gasto que declara la ejecución es menor que
          el producto de pensiones por pensión media por pagas. La salida de {MODELO.m4} mantiene un
          cociente casi constante en el conjunto de los años que calcula.
        </p>
        <p>
          La descripción del modelo atribuye la diferencia a los complementos a mínimos, que la
          ejecución contabiliza aparte, y supone que la pensión media estadística los incluye. Es
          una hipótesis de su autor que no se ha verificado contra la metodología de la fuente: que
          el cociente se acerque a uno al sumar los complementos es una coincidencia aritmética, no
          una confirmación. Tampoco se ha verificado el origen del resto de la diferencia.
        </p>
        <p>
          Lo que sí consta en los datos es que los complementos a mínimos no están en la suma de
          pensiones de la ejecución y sí en el resto de gastos del año base (el gasto no financiero
          menos esa suma), que en el modelo evoluciona con el PIB y no con el número de pensiones.
        </p>
      </ComoLeerlo>
    </>
  );
}
