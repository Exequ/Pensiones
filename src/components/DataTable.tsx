import { useId, type ReactNode } from 'react';
import { formatearCelda, type TipoColumna, type ValorCelda } from './formatoCeldas';
import './DataTable.css';

export type { TipoColumna, ValorCelda };

export interface Columna<F extends Record<string, ValorCelda>> {
  readonly clave: keyof F & string;
  readonly titulo: string;
  /** Por defecto, «texto». Los demás tipos se alinean a la derecha con cifras tabulares. */
  readonly tipo?: TipoColumna;
  /** Decimales fijos para números, euros y porcentajes. */
  readonly decimales?: number;
}

interface DataTableProps<F extends Record<string, ValorCelda>> {
  /** Título de la tabla (caption). Obligatorio por accesibilidad. */
  titulo: string;
  columnas: readonly Columna<F>[];
  filas: readonly F[];
  /** Oculta el título visualmente (sigue disponible para lectores de pantalla). */
  ocultarTitulo?: boolean;
  /** Índice de la fila que se quiere destacar. */
  filaDestacada?: number;
  /** Notas al pie de la tabla. */
  pie?: ReactNode;
}

/**
 * Tabla de datos real (<table>) con cabeceras de columna y de fila. Las cifras
 * van alineadas a la derecha y con números tabulares.
 */
export function DataTable<F extends Record<string, ValorCelda>>({
  titulo,
  columnas,
  filas,
  ocultarTitulo = false,
  filaDestacada,
  pie,
}: DataTableProps<F>) {
  const idTitulo = useId();
  return (
    <div className="tabla-datos">
      <div
        className="tabla-datos-desplazable"
        role="region"
        aria-labelledby={idTitulo}
        tabIndex={0}
      >
        <table>
          <caption id={idTitulo} className={ocultarTitulo ? 'visualmente-oculto' : undefined}>
            {titulo}
          </caption>
          <thead>
            <tr>
              {columnas.map((columna) => (
                <th
                  key={columna.clave}
                  scope="col"
                  className={(columna.tipo ?? 'texto') === 'texto' ? undefined : 'num'}
                >
                  {columna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i} className={i === filaDestacada ? 'destacada' : undefined}>
                {columnas.map((columna, j) => {
                  const tipo = columna.tipo ?? 'texto';
                  const contenido = formatearCelda(
                    fila[columna.clave] ?? null,
                    tipo,
                    columna.decimales,
                  );
                  const clase = tipo === 'texto' ? undefined : 'num';
                  return j === 0 ? (
                    <th key={columna.clave} scope="row" className={clase}>
                      {contenido}
                    </th>
                  ) : (
                    <td key={columna.clave} className={clase}>
                      {contenido}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pie ? <div className="tabla-datos-pie">{pie}</div> : null}
    </div>
  );
}
