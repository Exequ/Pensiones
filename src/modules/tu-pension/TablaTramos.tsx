import { Fragment, useEffect, useRef } from 'react';
import { MESES, TEXTOS } from './textos';
import {
  nuevoIdTramo,
  tramoVacio,
  type CampoTramo,
  type ErrorTramo,
  type ReferenciaTramo,
  type TramoFormulario,
} from './tramos';

interface TablaTramosProps {
  tramos: readonly TramoFormulario[];
  /** Errores a mostrar (los de la última comprobación; se retiran al editar el tramo). */
  errores: readonly ErrorTramo[];
  onCambio: (tramos: readonly TramoFormulario[]) => void;
}

const OPCIONES_REFERENCIA: readonly { valor: ReferenciaTramo; etiqueta: string }[] = [
  { valor: 'importe', etiqueta: 'Importe en euros' },
  { valor: 'minima', etiqueta: 'Base mínima' },
  { valor: 'media', etiqueta: 'Base media' },
  { valor: 'maxima', etiqueta: 'Base máxima' },
];

/** Campo del tramo al que se asocia cada error (los de todo el tramo van al año de inicio). */
const CAMPO_MARCADO: Record<CampoTramo, CampoTramo> = {
  desdeMes: 'desdeMes',
  desdeAnio: 'desdeAnio',
  hastaMes: 'hastaMes',
  hastaAnio: 'hastaAnio',
  importe: 'importe',
  referencia: 'referencia',
  tramo: 'desdeAnio',
};

/**
 * Tabla editable de tramos de cotización: añadir, duplicar y quitar fila, todo con teclado (controles
 * nativos, con etiqueta). En pantallas estrechas cada fila se apila como una tarjeta (CSS). Los
 * errores de cada tramo van en una región `aria-live`.
 */
export function TablaTramos({ tramos, errores, onCambio }: TablaTramosProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const botonAnadir = useRef<HTMLButtonElement>(null);
  // Tras añadir o duplicar, el foco va al primer control del tramo nuevo; tras quitar, al siguiente.
  const foco = useRef<{ tramoId: string } | { botonAnadir: true } | undefined>(undefined);

  useEffect(() => {
    const destino = foco.current;
    if (!destino) return;
    foco.current = undefined;
    if ('botonAnadir' in destino) {
      botonAnadir.current?.focus();
      return;
    }
    contenedor.current
      ?.querySelector<HTMLElement>(
        `[data-tramo="${destino.tramoId}"] select, [data-tramo="${destino.tramoId}"] input`,
      )
      ?.focus();
  }, [tramos]);

  const cambiar = (id: string, cambios: Partial<TramoFormulario>) => {
    onCambio(tramos.map((t) => (t.id === id ? { ...t, ...cambios } : t)));
  };
  const anadir = () => {
    const nuevo = tramoVacio();
    foco.current = { tramoId: nuevo.id };
    onCambio([...tramos, nuevo]);
  };
  const duplicar = (indice: number) => {
    const original = tramos[indice];
    if (!original) return;
    const copia = { ...original, id: nuevoIdTramo() };
    foco.current = { tramoId: copia.id };
    onCambio([...tramos.slice(0, indice + 1), copia, ...tramos.slice(indice + 1)]);
  };
  const quitar = (indice: number) => {
    const siguiente = tramos[indice + 1] ?? tramos[indice - 1];
    foco.current = siguiente ? { tramoId: siguiente.id } : { botonAnadir: true };
    onCambio(tramos.filter((_, i) => i !== indice));
  };

  return (
    <div className="tp-tramos-contenedor" ref={contenedor}>
      <table className="tp-tramos">
        <caption className="visualmente-oculto">{TEXTOS.tramosTitulo}</caption>
        <thead>
          <tr>
            <th scope="col">Tramo</th>
            <th scope="col">Desde</th>
            <th scope="col">Hasta</th>
            <th scope="col">Base mensual</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tramos.map((t, i) => {
            const numero = i + 1;
            const delTramo = errores.filter((e) => e.tramoId === t.id);
            const invalido = (campo: CampoTramo) =>
              delTramo.some((e) => CAMPO_MARCADO[e.campo] === campo);
            const nombre = `Tramo ${String(numero)}`;
            const etiqueta = (texto: string) => (
              <>
                <span className="visualmente-oculto">{nombre},</span> {texto}
              </>
            );
            return (
              <Fragment key={t.id}>
                <tr data-tramo={t.id} className="tp-tramo">
                  <th scope="row" className="tp-tramo-numero">
                    {nombre}
                  </th>
                  <td data-celda="Desde">
                    <div className="tp-tramo-par">
                      <div className="campo">
                        <label className="campo-etiqueta tp-etiqueta-celda" htmlFor={`${t.id}-dm`}>
                          {etiqueta('Desde: mes')}
                        </label>
                        <select
                          id={`${t.id}-dm`}
                          value={t.desdeMes}
                          aria-invalid={invalido('desdeMes')}
                          onChange={(e) => {
                            cambiar(t.id, { desdeMes: e.target.value });
                          }}
                        >
                          <option value="">Mes</option>
                          {MESES.map((m, j) => (
                            <option key={m} value={String(j + 1)}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="campo">
                        <label className="campo-etiqueta tp-etiqueta-celda" htmlFor={`${t.id}-da`}>
                          {etiqueta('Desde: año')}
                        </label>
                        <input
                          id={`${t.id}-da`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={t.desdeAnio}
                          aria-invalid={invalido('desdeAnio')}
                          onChange={(e) => {
                            cambiar(t.id, { desdeAnio: e.target.value });
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td data-celda="Hasta">
                    <div className="tp-tramo-par">
                      <div className="campo">
                        <label className="campo-etiqueta tp-etiqueta-celda" htmlFor={`${t.id}-hm`}>
                          {etiqueta('Hasta: mes')}
                        </label>
                        <select
                          id={`${t.id}-hm`}
                          value={t.hastaMes}
                          aria-invalid={invalido('hastaMes')}
                          onChange={(e) => {
                            cambiar(t.id, { hastaMes: e.target.value });
                          }}
                        >
                          <option value="">Mes</option>
                          {MESES.map((m, j) => (
                            <option key={m} value={String(j + 1)}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="campo">
                        <label className="campo-etiqueta tp-etiqueta-celda" htmlFor={`${t.id}-ha`}>
                          {etiqueta('Hasta: año')}
                        </label>
                        <input
                          id={`${t.id}-ha`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={t.hastaAnio}
                          aria-invalid={invalido('hastaAnio')}
                          onChange={(e) => {
                            cambiar(t.id, { hastaAnio: e.target.value });
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td data-celda="Base mensual">
                    <div className="tp-tramo-par">
                      <div className="campo">
                        <label className="campo-etiqueta tp-etiqueta-celda" htmlFor={`${t.id}-ref`}>
                          {etiqueta('Base: referencia')}
                        </label>
                        <select
                          id={`${t.id}-ref`}
                          value={t.referencia}
                          aria-invalid={invalido('referencia')}
                          onChange={(e) => {
                            cambiar(t.id, { referencia: e.target.value as ReferenciaTramo });
                          }}
                        >
                          {OPCIONES_REFERENCIA.map((o) => (
                            <option key={o.valor} value={o.valor}>
                              {o.etiqueta}
                            </option>
                          ))}
                        </select>
                      </div>
                      {t.referencia === 'importe' ? (
                        <div className="campo">
                          <label
                            className="campo-etiqueta tp-etiqueta-celda"
                            htmlFor={`${t.id}-imp`}
                          >
                            {etiqueta('Base: importe en euros')}
                          </label>
                          <input
                            id={`${t.id}-imp`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={t.importe}
                            aria-invalid={invalido('importe')}
                            onChange={(e) => {
                              cambiar(t.id, { importe: e.target.value });
                            }}
                          />
                        </div>
                      ) : (
                        <p className="tp-base-serie">{TEXTOS.baseSegunSerie}</p>
                      )}
                    </div>
                  </td>
                  <td data-celda="Acciones" className="tp-tramo-acciones">
                    <button
                      type="button"
                      className="tp-boton-secundario"
                      onClick={() => {
                        duplicar(i);
                      }}
                    >
                      {TEXTOS.duplicarTramo}{' '}
                      <span className="visualmente-oculto">el {nombre.toLowerCase()}</span>
                    </button>
                    <button
                      type="button"
                      className="tp-boton-secundario"
                      onClick={() => {
                        quitar(i);
                      }}
                    >
                      {TEXTOS.quitarTramo}{' '}
                      <span className="visualmente-oculto">el {nombre.toLowerCase()}</span>
                    </button>
                  </td>
                </tr>
                <tr className="tp-tramo-errores-fila">
                  <td colSpan={5} className="tp-tramo-errores" aria-live="polite">
                    {delTramo.length > 0 ? (
                      <ul>
                        {delTramo.map((e) => (
                          <li key={e.mensaje}>
                            <span className="campo-error-prefijo">Error: </span>
                            {e.mensaje}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {tramos.length === 0 ? <p className="tp-sin-tramos">{TEXTOS.tramosSinTramos}</p> : null}
      <button type="button" className="tp-boton-secundario" onClick={anadir} ref={botonAnadir}>
        {TEXTOS.anadirTramo}
      </button>
    </div>
  );
}
