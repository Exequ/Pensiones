import { DataTable, type Columna } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { TablaVista } from './datos-reformas';

type Fila = Record<string, string>;

/**
 * Tabla de una ficha: tabla real con su título, nota de definición (la descripción del dato en /data),
 * línea de fuente generada de los datos y «Cómo leerlo». No resalta ninguna fila.
 */
export function TablaReforma({
  tabla,
  norma,
}: {
  readonly tabla: TablaVista;
  /** Nombre de la norma de la ficha: la misma tabla puede estar en varias fichas. */
  readonly norma: string;
}) {
  const columnas: Columna<Fila>[] = tabla.columnas.map((titulo, i) => ({
    clave: `c${String(i)}`,
    titulo,
  }));
  const filas: Fila[] = tabla.filas.map((celdas) =>
    Object.fromEntries(celdas.map((c, i) => [`c${String(i)}`, c])),
  );
  return (
    <div className="ref-tabla">
      <DataTable
        titulo={tabla.titulo}
        columnas={columnas}
        filas={filas}
        pie={
          <>
            Definición: {tabla.definicion}
            {tabla.nota === undefined ? null : <> {tabla.nota}</>}
          </>
        }
      />
      <SourceLine datos={tabla.datos} titulo={`${tabla.titulo} (${norma})`} />
      <details className="ref-lectura">
        <summary>Cómo leerlo</summary>
        {tabla.tipo === 'calendario' ? (
          <p>
            Cada fila es un año y cada columna, el valor que fija la norma para ese año, con el
            lugar de la norma donde figura. Los años futuros del calendario son valores que fija la
            norma, no observaciones. La tabla no dice cómo afecta cada valor a la pensión de una
            persona ni valora el calendario.
          </p>
        ) : (
          <p>
            La tabla recoge el valor que consta para el año indicado y el lugar de la norma donde
            figura. No lo compara con otros años ni con otras normas, ni dice cómo afecta a la
            pensión de una persona.
          </p>
        )}
      </details>
    </div>
  );
}
