import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { anioVigente, resolverParametro } from './datos-como';
import type { ParametroConfig } from './ids-datos';

/** Parámetros vigentes de /data que intervienen en el cálculo, con su ubicación en la norma y su fuente. */
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
          { clave: 'ubicacion', titulo: 'Dónde está en la norma' },
        ]}
        filas={resueltos.map((r) => ({
          parametro: r.rotulo,
          valor: r.valor,
          desde: r.periodo,
          ubicacion: r.ubicacion ?? '',
        }))}
        pie={
          <>
            Valores vigentes en el año {anioVigente()}, el último con dato de la pensión máxima. La
            columna «Versión de la norma» indica el año desde el que rige cada valor.
          </>
        }
      />
      <SourceLine datos={resueltos.map((r) => r.dato)} titulo={titulo} />
    </div>
  );
}
