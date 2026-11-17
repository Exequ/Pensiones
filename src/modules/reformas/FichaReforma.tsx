import { Link } from 'react-router-dom';
import { SourceLine } from '../../components/SourceLine';
import type { ReformaVista, TablaVista } from './datos-reformas';
import { ETIQUETA_DESTINO, RUTA_DESTINO } from './ids-datos';
import { TablaReforma } from './TablaReforma';

const BASE_VIGOR = {
  'metadatos-boe': 'según los metadatos del BOE descargados',
  'disposicion-final': 'según la disposición final del texto descargado',
  cronologia: 'según la cronología de /data, que recoge el texto de la norma',
  'regla-sobre-publicacion': 'calculada con la regla sobre la publicación que recoge la cronología',
  'sin-texto': 'no consta en los textos ni en los datos descargados',
} as const;

export const ID_FICHA = (id: string): string => `ref-${id}`;

/** Una ficha por norma, con la misma estructura en todas (la comprueba `pagina.test.tsx`). */
export function FichaReforma({ reforma }: { readonly reforma: ReformaVista }) {
  const id = ID_FICHA(reforma.id);
  const { norma } = reforma;
  const vigor = norma.entradaEnVigor;
  const tablasPorParametro = (p: string): readonly TablaVista[] =>
    reforma.tablas.filter((t) => t.parametro === p);
  return (
    <article className="ref-ficha" id={id} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} tabIndex={-1}>
        {reforma.nombre}
      </h2>
      <p className="ref-titulo-oficial">{norma.titulo}</p>

      <h3 id={`${id}-norma`}>La norma</h3>
      <dl className="ref-datos">
        <div>
          <dt>Rango</dt>
          <dd>{norma.rango}</dd>
        </div>
        <div>
          <dt>Aprobación</dt>
          <dd>
            <time dateTime={norma.fecha}>{reforma.aprobacion}</time>
          </dd>
        </div>
        <div>
          <dt>Publicación en el BOE</dt>
          <dd>
            <time dateTime={norma.fechaPublicacion}>{reforma.publicacion}</time>
          </dd>
        </div>
        <div>
          <dt>Entrada en vigor</dt>
          <dd>
            {reforma.entradaEnVigor === null ? (
              <>No consta en los textos descargados</>
            ) : (
              <time dateTime={vigor.fecha ?? undefined}>{reforma.entradaEnVigor}</time>
            )}{' '}
            <span className="ref-base">({BASE_VIGOR[vigor.base]})</span>
            <br />
            <span className="ref-base">
              {vigor.cita === null ? null : (
                <>
                  Cita: <span className="ref-literal">«{vigor.cita}»</span>.{' '}
                </>
              )}
              {vigor.ubicacion}
            </span>
          </dd>
        </div>
        <div>
          <dt>Texto completo en el repositorio</dt>
          <dd>{norma.textoDescargado ?? 'No; solo constan las citas de la cronología'}</dd>
        </div>
      </dl>

      <h3 id={`${id}-cambia`}>Qué cambia</h3>
      <p className="ref-resumen">{norma.resumen}</p>
      <ul className="ref-cambios">
        {reforma.cambios.map((c) => (
          <li key={c.parametro} className="ref-cambio">
            <h4>{c.rotulo}</h4>
            <p className="ref-cita-articulo">
              <span className="ref-etiqueta">Artículo o disposición:</span> {c.articulos}
            </p>
            <p>
              <span className="ref-etiqueta">Antes:</span>{' '}
              {c.antes ?? 'No consta en el texto de la cronología.'}
            </p>
            <p>
              <span className="ref-etiqueta">Después:</span> {c.despues}
            </p>
            <blockquote className="ref-cita">
              <p>{c.evidencia}</p>
            </blockquote>
          </li>
        ))}
      </ul>

      <h3 id={`${id}-parametros`}>Parámetros afectados: valor antes y valor después en /data</h3>
      <p className="ref-aviso">
        El cambio de un parámetro no equivale a un efecto sobre la pensión de una persona: el
        importe depende de la carrera de cotización y de las demás reglas aplicables.
      </p>
      <ul className="ref-parametros">
        {reforma.cambios.map((c) => {
          const tablas = tablasPorParametro(c.parametro);
          return (
            <li key={c.parametro}>
              <h4>{c.rotulo}</h4>
              {tablas.length === 0 ? (
                <p>No hay valores de este parámetro en /data para esta norma.</p>
              ) : (
                tablas.map((t) => (
                  <div key={t.clave}>
                    {t.tipo === 'calendario' ? (
                      <ul className="ref-antes-despues">
                        <li>
                          <span className="ref-etiqueta">Antes:</span>{' '}
                          {t.antes === '' ? 'no consta en /data para el año anterior.' : t.antes}
                        </li>
                        <li>
                          <span className="ref-etiqueta">Después:</span> {t.despues}
                        </li>
                      </ul>
                    ) : (
                      <>
                        <ul className="ref-antes-despues">
                          <li>
                            <span className="ref-etiqueta">Antes:</span> el valor anterior no consta
                            en /data.
                          </li>
                          <li>
                            <span className="ref-etiqueta">Después:</span> {t.despues}
                          </li>
                        </ul>
                        <TablaReforma tabla={t} />
                      </>
                    )}
                  </div>
                ))
              )}
            </li>
          );
        })}
      </ul>

      <h3 id={`${id}-calendario`}>Calendario de aplicación</h3>
      <ul className="ref-transiciones">
        {reforma.cambios.map((c) => (
          <li key={c.parametro}>
            <span className="ref-etiqueta">{c.rotulo}:</span> {c.transicion}
          </li>
        ))}
      </ul>
      {reforma.tablas.filter((t) => t.tipo === 'calendario').length === 0 ? (
        <p>No hay un calendario de esta norma con valores en /data.</p>
      ) : (
        reforma.tablas
          .filter((t) => t.tipo === 'calendario')
          .map((t) => <TablaReforma key={t.clave} tabla={t} />)
      )}

      <h3 id={`${id}-enlaces`}>Dónde se explica en esta web</h3>
      {reforma.enlaces.length === 0 ? (
        <p>Ninguna de las páginas de esta web explica todavía los parámetros de esta norma.</p>
      ) : (
        <ul className="ref-enlaces">
          {reforma.enlaces.map((d) => (
            <li key={d}>
              <Link to={RUTA_DESTINO[d]}>{ETIQUETA_DESTINO[d]}</Link>
            </li>
          ))}
        </ul>
      )}

      <SourceLine datos={reforma.fuente} />
    </article>
  );
}
