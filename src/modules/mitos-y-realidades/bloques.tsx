/** Piezas de maquetación de las tarjetas de «Mitos y realidades». Sin cifras. */
import type { ReactNode } from 'react';
import { DataTable, type Columna, type ValorCelda } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';

/** Fuente de una serie cuyos años proceden de normas distintas: se despliega para no alargar la página. */
export function FuentesDesplegables({
  datos,
  resumen,
}: {
  readonly datos: readonly Dato[];
  readonly resumen: string;
}) {
  return (
    <details className="mito-fuentes">
      <summary>{resumen}</summary>
      <SourceLine datos={datos} />
    </details>
  );
}

/** Tabla de datos con su línea de fuente debajo. */
export function TablaConFuente<F extends Record<string, ValorCelda>>({
  titulo,
  columnas,
  filas,
  fuentes,
  pie,
}: {
  readonly titulo: string;
  readonly columnas: readonly Columna<F>[];
  readonly filas: readonly F[];
  readonly fuentes: Dato | readonly Dato[];
  readonly pie?: ReactNode;
}) {
  return (
    <div className="mito-tabla">
      <DataTable titulo={titulo} columnas={columnas} filas={filas} {...(pie ? { pie } : {})} />
      <SourceLine datos={fuentes} />
    </div>
  );
}
