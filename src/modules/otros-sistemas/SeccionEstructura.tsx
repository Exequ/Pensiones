import { SourceLine } from '../../components/SourceLine';
import { quitarUbicacionDeTabla } from './rasgos';
import { datosSistemas } from './datos-sistemas';
import { DefinicionesSistemas } from './DefinicionSistemas';
import { RASGOS_EXCLUIDOS } from './ids-datos';
import { CODIGOS_PAISES, esAgregado, nombrePais } from './paises';
import { APARTADOS } from './apartados';

/**
 * Estructura del sistema de cada país elegido, con la cita literal de la fuente. Las medias de la
 * OCDE y de la UE-27 no tienen estructura propia y no aparecen aquí.
 */
export function SeccionEstructura({ seleccion }: { readonly seleccion: ReadonlySet<string> }) {
  const d = datosSistemas();
  const paises = CODIGOS_PAISES.filter((c) => seleccion.has(c) && !esAgregado(c));
  const agregadosElegidos = CODIGOS_PAISES.some((c) => seleccion.has(c) && esAgregado(c));

  return (
    <section
      className="seccion prosa sistemas-seccion"
      aria-labelledby={APARTADOS.estructura.destino}
    >
      <h2 id={APARTADOS.estructura.destino} tabIndex={-1}>
        {APARTADOS.estructura.titulo}
      </h2>
      <p>
        Las fuentes describen cada sistema con las mismas palabras clave: reparto, capitalización,
        cuentas nocionales y pilares. Una ficha puede combinar varios de esos elementos en un mismo
        sistema, y el contenido de un pilar no es el mismo en todos los países. Debajo se define
        cada término tal como lo usan las fuentes y, para cada país elegido, lo que dicen las
        fichas, con su cita en el desplegable «Fuentes».
      </p>
      <DefinicionesSistemas
        ids={[
          'reparto',
          'capitalizacion',
          'cuentas-nocionales',
          'pilares-de-un-sistema-de-pensiones',
          'ejes-de-clasificacion-de-los-sistemas',
        ]}
      />

      {agregadosElegidos ? (
        <p>
          La media de la OCDE y la Unión Europea no tienen una estructura propia y por eso no
          figuran en esta parte.
        </p>
      ) : null}

      {paises.map((codigo) => {
        const rasgos = d.rasgos.filter(
          (r) => r.pais === codigo && !RASGOS_EXCLUIDOS.includes(r.id),
        );
        return (
          <article key={codigo} className="sistemas-pais" aria-label={nombrePais(codigo)}>
            <h3>{nombrePais(codigo)}</h3>
            <ul className="sistemas-rasgos">
              {rasgos.map((r) => (
                <li key={r.id} className="sistemas-rasgo">
                  <span className="sistemas-rasgo-etiqueta">
                    {quitarUbicacionDeTabla(r.etiqueta)}
                  </span>
                </li>
              ))}
            </ul>
            <SourceLine
              datos={rasgos.map((r) => r.datoCitado)}
              titulo={`Rasgos del sistema: ${nombrePais(codigo)}`}
            />
          </article>
        );
      })}
    </section>
  );
}
