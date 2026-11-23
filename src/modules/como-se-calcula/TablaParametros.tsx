import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { anioVigente, resolverParametro } from './datos-como';
import type { ParametroConfig } from './ids-datos';

/** Parámetros vigentes de /data que intervienen en el cálculo, con su fuente; la ubicación en la norma está en «Fuentes». */
export function TablaParametros({
  titulo,
  parametros,
}: {
  readonly titulo: string;
  readonly parametros: readonly ParametroConfig[];
}) {
  const resueltos = parametros.flatMap((p) => {
    const r = resolverParametro(p);
    return r === undefined ? [] : [r];
  });
  return (
    <div className="como-parametros">
      <DataTable
        titulo={titulo}
        columnas={[
          { clave: 'parametro', titulo: 'Parámetro' },
          { clave: 'valor', titulo: 'Valor' },
          { clave: 'desde', titulo: 'Versión de la norma' },
        ]}
        filas={resueltos.map((r) => ({
          parametro: r.rotulo,
          valor: r.valor,
          desde: r.periodo,
        }))}
        pie={
          <>
            Valores vigentes en el año {anioVigente()}, el último con dato de la pensión máxima. La
            columna «Versión de la norma» indica el año desde el que rige cada valor.
          </>
        }
      />
      <SourceLine datos={resueltos.map((r) => ({ ...r.dato, rotulo: r.rotulo }))} titulo={titulo} />
    </div>
  );
}
