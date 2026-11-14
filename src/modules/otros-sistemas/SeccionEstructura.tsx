import { Definition } from '../../components/Definition';
import { SourceLine } from '../../components/SourceLine';
import { datosSistemas } from './datos-sistemas';
import { CODIGOS_PAISES, esAgregado, nombrePais } from './paises';

/**
 * Estructura del sistema de cada país elegido, con la cita literal de la fuente. Las medias de la
 * OCDE y de la UE-27 no tienen estructura propia y no aparecen aquí.
 */
export function SeccionEstructura({ seleccion }: { readonly seleccion: ReadonlySet<string> }) {
  const d = datosSistemas();
  const paises = CODIGOS_PAISES.filter((c) => seleccion.has(c) && !esAgregado(c));
  const agregadosElegidos = CODIGOS_PAISES.some((c) => seleccion.has(c) && esAgregado(c));

  return (
    <section className="seccion prosa sistemas-seccion" aria-labelledby="estructura">
      <h2 id="estructura">Cómo se organizan los sistemas</h2>
      <p>
        Las fuentes describen cada sistema con las mismas palabras clave: reparto, capitalización,
        cuentas nocionales y pilares. Una pensión pública puede combinar varios de esos elementos, y
        el mismo término no significa exactamente lo mismo en todos los países. Debajo, para cada
        país elegido, lo que dicen las fichas de las fuentes, con la cita literal en inglés.
      </p>
      <div className="sistemas-definiciones">
        <Definition termino="Reparto" etiqueta="Glosario">
          Las cotizaciones de quienes trabajan en un periodo financian las pensiones que se pagan en
          ese mismo periodo. En inglés, <span lang="en">pay-as-you-go</span>.
        </Definition>
        <Definition termino="Capitalización" etiqueta="Glosario">
          Las aportaciones se acumulan en un fondo con sus rendimientos y ese fondo financia la
          pensión de quien aportó. En inglés, <span lang="en">funded</span>.
        </Definition>
        <Definition termino="Cuentas nocionales" etiqueta="Glosario">
          La pensión se calcula a partir de un saldo teórico que acumula las cotizaciones de cada
          persona y se convierte en renta con criterios actuariales; la financiación puede ser de
          reparto. En inglés, <span lang="en">notional defined contribution</span> (NDC).
        </Definition>
      </div>
      <p className="hist-aviso">
        El glosario es una explicación conceptual de los términos, no un dato: no procede de una
        fuente descargada y está pendiente de revisión actuarial. Lo que sí procede de las fuentes
        es cada rasgo de los países, con su cita.
      </p>

      {agregadosElegidos ? (
        <p>
          La media de la OCDE y la Unión Europea no tienen una estructura propia y por eso no
          figuran en esta parte.
        </p>
      ) : null}

      {paises.map((codigo) => {
        const rasgos = d.rasgos.filter((r) => r.pais === codigo);
        return (
          <article key={codigo} className="sistemas-pais" aria-label={nombrePais(codigo)}>
            <h3>{nombrePais(codigo)}</h3>
            <ul className="sistemas-rasgos">
              {rasgos.map((r) => (
                <li key={r.id} className="sistemas-rasgo">
                  <span className="sistemas-rasgo-etiqueta">{r.etiqueta}</span>
                  <blockquote lang="en">{r.cita}</blockquote>
                  <span className="sistemas-rasgo-pie">
                    {r.ubicacion} · confianza: {r.confianza}
                  </span>
                </li>
              ))}
            </ul>
            <SourceLine datos={rasgos.map((r) => r.dato)} />
          </article>
        );
      })}
    </section>
  );
}
