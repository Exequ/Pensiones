import { useEffect, useMemo, useState } from 'react';
import { SourceLine } from '../../components/SourceLine';
import type { MotorOfrecido } from '../../engine/comparar-lecturas';
import { filasDelPanel, type LecturaVista } from '../tu-pension/supuestos';
import {
  filasLecturasJubilacionEnIncapacidad,
  LECTURAS_JUBILACION_EN_SUPERVIVENCIA,
} from '../tu-pension/lecturas-jubilacion-en-incapacidad';
import { idLectura } from './apartados';
import { datosDeUbicacion } from './datos-como';
import type { EfectosLectura, EjemploCalculado } from './ejemplos';
import { sinCitasDeLectura, ubicacionDeLectura } from './lecturas-sin-citas';

/** Todo el texto de una lectura que puede llevar citas de la norma (para su desplegable «Fuentes»). */
const textoDeLectura = (l: LecturaVista): string =>
  [l.titulo, l.motivo ?? '', l.explicacionEstado, ...l.opciones.map((o) => o.queCambia)].join(' ');

const ORDEN_ESTADO = { pendiente: 0, provisional: 1, decidida: 2 } as const;

interface FilaLectura {
  readonly lectura: LecturaVista;
  /** Ejemplos en los que cambiar la lectura cambia el resultado, con el texto del efecto. */
  readonly efectos: readonly { readonly ejemplo: string; readonly texto: string }[];
}

/**
 * Lecturas abiertas que condicionan el cálculo de la prestación, con su estado, su motivo, qué
 * cambia cada alternativa y el efecto medido con el motor en los ejemplos de la sección. Las que
 * cambian algún ejemplo van primero; después, las pendientes y las provisionales.
 */
export function LecturasQueInfluyen({
  motor,
  ejemplos,
}: {
  readonly motor: MotorOfrecido;
  readonly ejemplos: readonly EjemploCalculado[];
}) {
  // El efecto de cada lectura se mide volviendo a llamar al motor; se calcula después de pintar la
  // sección para que la página no espere a esas llamadas.
  const [medidos, setMedidos] = useState<
    readonly { titulo: string; efectos: EfectosLectura }[] | undefined
  >();
  useEffect(() => {
    const id = setTimeout(() => {
      setMedidos(ejemplos.map((e) => ({ titulo: e.titulo, efectos: e.efectoLecturas() })));
    }, 0);
    return () => {
      clearTimeout(id);
    };
  }, [ejemplos]);

  const filas = useMemo((): readonly FilaLectura[] => {
    const lecturas = filasDelPanel(undefined, undefined, motor);
    return lecturas
      .map((lectura) => ({
        lectura,
        efectos: (medidos ?? []).flatMap((e) => {
          const ef = e.efectos.get(lectura.id);
          return ef?.afecta === true ? [{ ejemplo: e.titulo, texto: ef.texto }] : [];
        }),
      }))
      .toSorted(
        (a, b) =>
          Number(b.efectos.length > 0) - Number(a.efectos.length > 0) ||
          ORDEN_ESTADO[a.lectura.estado] - ORDEN_ESTADO[b.lectura.estado],
      );
  }, [motor, medidos]);

  const aplicadasDeJubilacion = useMemo(() => {
    if (motor === 'incapacidad') return filasLecturasJubilacionEnIncapacidad();
    if (motor === 'viudedad' || motor === 'orfandad')
      return filasLecturasJubilacionEnIncapacidad(LECTURAS_JUBILACION_EN_SUPERVIVENCIA);
    return [];
  }, [motor]);

  return (
    <div className="como-lecturas">
      <p>
        Una lectura abierta es una duda de interpretación de la norma. El cálculo usa su valor por
        defecto y el estado dice cuánta firmeza tiene esa decisión. Se muestran todas las lecturas
        de esta prestación; el efecto en los ejemplos está medido con el motor, cambiando solo esa
        lectura.
      </p>
      <ul className="como-lecturas-lista">
        {filas.map(({ lectura: l, efectos }) => (
          <li key={l.id} className={`como-lectura como-lectura-${l.estado}`}>
            <h4 id={idLectura(motor, l.id)} tabIndex={-1}>
              {sinCitasDeLectura(l.titulo)}
            </h4>
            <dl className="como-lectura-datos">
              <div>
                <dt>Estado</dt>
                <dd>
                  <span className="como-etiqueta-estado">{l.etiquetaEstado}.</span>{' '}
                  {sinCitasDeLectura(l.explicacionEstado)}
                </dd>
              </div>
              <div>
                <dt>Motivo de la decisión</dt>
                <dd>
                  {l.motivo === null ? (
                    'Sin decidir todavía.'
                  ) : (
                    <>
                      {sinCitasDeLectura(l.motivo)} (
                      <time dateTime={l.fechaEstado}>{l.fechaEstado}</time>)
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Opciones</dt>
                <dd>
                  <ul className="como-opciones">
                    {l.opciones.map((o) => (
                      <li key={o.valor}>
                        <strong>{o.etiqueta}</strong>
                        {o.esPorDefecto ? ' (valor por defecto)' : ''}.{' '}
                        {sinCitasDeLectura(o.queCambia)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Efecto en los ejemplos</dt>
                <dd>
                  {medidos === undefined ? (
                    'Calculando el efecto en los ejemplos…'
                  ) : efectos.length === 0 ? (
                    'No cambia el resultado de ninguno de los ejemplos de esta sección.'
                  ) : (
                    <ul className="como-opciones">
                      {efectos.map((e) => (
                        <li key={e.ejemplo}>
                          <strong>{e.ejemplo}.</strong> {e.texto}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
            <SourceLine
              datos={datosDeUbicacion(
                sinCitasDeLectura(l.titulo),
                ubicacionDeLectura(textoDeLectura(l)),
              )}
              titulo={`Normas de la lectura: ${sinCitasDeLectura(l.titulo)} (${motor})`}
            />
          </li>
        ))}
      </ul>
      {aplicadasDeJubilacion.length > 0 ? (
        <div className="como-lecturas-jubilacion">
          <h4>Lecturas de la jubilación que también rigen aquí</h4>
          <p>
            El motor de esta prestación comparte con el de la jubilación el contexto de límites y,
            en la incapacidad, la actualización de las bases. Estas lecturas se aplican con su valor
            por defecto y no se pueden cambiar en este cálculo.
          </p>
          <ul className="como-opciones">
            {aplicadasDeJubilacion.map((f) => (
              <li key={f.id}>
                <strong>{sinCitasDeLectura(f.titulo)}.</strong> Valor aplicado: {f.valorAplicado}.
                Estado:{' '}
                {f.estado === 'decidida'
                  ? 'decidida'
                  : f.estado === 'provisional'
                    ? 'provisional'
                    : 'pendiente de decidir'}
                .
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
