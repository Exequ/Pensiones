import { quitarCitas } from '../../engine/citas-normativas';
import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { formatearEuros, formatearNumero } from '../../engine/formato';
import { datosDeUbicacion, ejemplosCalculo } from './datos-como';
import { ETIQUETA_ESTADO_PENSION, type EjemploCalculado } from './ejemplos';
import type { Esquema } from './esquemas';
import { valorConUnidad } from './formato-pasos';

const euros2 = (v: number): string => formatearEuros(v, { decimales: 2 });

/** Números (1-based) de los pasos del esquema que cubren un paso del motor. */
function pasosDelEsquema(esquema: Esquema, idMotor: string): string {
  const numeros = esquema.pasos.flatMap((p, i) => (p.pasosMotor.includes(idMotor) ? [i + 1] : []));
  return numeros.length === 0 ? '—' : numeros.map((n) => formatearNumero(n)).join(', ');
}

/**
 * Un ejemplo calculado por el motor, paso a paso: qué entra, qué requisitos se comprueban, cada paso
 * con su resultado, su norma y los parámetros de /data que usa, y la pensión inicial.
 */
export function EjemploPasoAPaso({
  ejemplo,
  esquema,
  abierto = false,
}: {
  readonly ejemplo: EjemploCalculado;
  readonly esquema: Esquema;
  readonly abierto?: boolean;
}) {
  const idBase = `ejemplo-${ejemplo.id}`;
  const referencias = ejemplo.pasos.flatMap((p) => p.parametros.map((r) => ({ paso: p, ref: r })));
  const datosFuente = referencias.flatMap(({ paso, ref }) =>
    ref.dato === undefined ? [] : [{ ...ref.dato, rotulo: quitarCitas(paso.titulo) }],
  );
  // Las normas de cada requisito y de cada paso no se ven en las tablas: van a su «Fuentes».
  const normasRequisitos = ejemplo.requisitos.flatMap((r) =>
    datosDeUbicacion(quitarCitas(r.descripcion), r.articulo),
  );
  const normasPasos = ejemplo.pasos.flatMap((p) =>
    datosDeUbicacion(quitarCitas(p.titulo), p.articulo),
  );
  return (
    <details className="como-ejemplo" id={idBase} {...(abierto ? { open: true } : {})}>
      <summary>
        <span className="como-ejemplo-titulo">{ejemplo.titulo}</span>
        <span className="como-ejemplo-resumen">
          {' '}
          · pensión inicial {euros2(ejemplo.pensionMensual)} por paga
        </span>
      </summary>
      <div className="como-ejemplo-cuerpo">
        <p>{ejemplo.descripcion}</p>
        <p className="como-ilustrativo">{ejemplosCalculo().nota}</p>

        <h5>Qué entra</h5>
        <DataTable
          titulo={`Datos de entrada: ${ejemplo.titulo}`}
          ocultarTitulo
          columnas={[
            { clave: 'etiqueta', titulo: 'Dato' },
            { clave: 'valor', titulo: 'Valor' },
          ]}
          filas={[...ejemplo.entradas, ...ejemplo.supuestos].map((f) => ({
            etiqueta: f.etiqueta,
            valor: f.valor,
          }))}
        />

        <h5>Requisitos que se comprueban</h5>
        <DataTable
          titulo={`Requisitos: ${ejemplo.titulo}`}
          ocultarTitulo
          columnas={[
            { clave: 'descripcion', titulo: 'Requisito' },
            { clave: 'valor', titulo: 'Acredita' },
            { clave: 'exigido', titulo: 'Se exige' },
            { clave: 'cumple', titulo: '¿Cumple?' },
          ]}
          filas={ejemplo.requisitos.map((r) => ({
            descripcion: quitarCitas(r.descripcion),
            valor: quitarCitas(r.valor),
            exigido: quitarCitas(r.exigido),
            cumple: r.cumple ? 'Sí' : 'No',
          }))}
        />
        <SourceLine
          datos={normasRequisitos}
          titulo={`Normas de los requisitos: ${ejemplo.titulo}`}
        />

        <h5>Cálculo paso a paso</h5>
        <DataTable
          titulo={`Pasos del cálculo: ${ejemplo.titulo}`}
          ocultarTitulo
          columnas={[
            { clave: 'esquema', titulo: 'Paso del esquema' },
            { clave: 'paso', titulo: 'Paso del motor' },
            { clave: 'resultado', titulo: 'Resultado' },
          ]}
          filas={ejemplo.pasos.map((p) => ({
            esquema: pasosDelEsquema(esquema, p.id),
            paso: quitarCitas(p.detalle === undefined ? p.titulo : `${p.titulo}. ${p.detalle}`),
            resultado: quitarCitas(p.valor),
          }))}
        />
        <SourceLine
          datos={normasPasos}
          titulo={`Normas de los pasos del cálculo: ${ejemplo.titulo}`}
        />

        <details className="como-parametros-paso">
          <summary>Parámetros que sostienen cada paso</summary>
          <ul className="como-lista-parametros">
            {referencias.map(({ paso, ref }) => (
              <li key={`${paso.id}-${ref.referencia}`}>
                <span className="como-etiqueta">{quitarCitas(paso.titulo)}:</span> {ref.fichero} ·{' '}
                {ref.id}
                {ref.valor === undefined ? '' : ` = ${valorConUnidad(ref.valor, ref.unidad ?? '')}`}
              </li>
            ))}
          </ul>
          <SourceLine
            datos={datosFuente}
            titulo={`Parámetros que sostienen cada paso: ${ejemplo.titulo}`}
          />
        </details>

        <p className="como-resultado">
          <strong>Resultado.</strong> {ETIQUETA_ESTADO_PENSION[ejemplo.estado] ?? ejemplo.estado}:{' '}
          <span className="como-importe">{euros2(ejemplo.pensionMensual)}</span> por paga, es decir,{' '}
          {euros2(ejemplo.pensionAnual)} al año en {formatearNumero(ejemplo.pagas)} pagas.
        </p>
        {ejemplo.avisos.length > 0 ? (
          <>
            <h5>Avisos del motor</h5>
            <ul className="como-avisos">
              {ejemplo.avisos.map((a) => (
                <li key={a}>{quitarCitas(a)}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="como-pie-ejemplo">
          Este ejemplo reproduce el caso de oro «{ejemplo.casoOro.id}» del motor, cuyas cuentas
          están hechas a mano.
        </p>
      </div>
    </details>
  );
}
