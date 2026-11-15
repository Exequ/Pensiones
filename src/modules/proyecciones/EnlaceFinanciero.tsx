import { Link } from 'react-router-dom';
import { ANCLA_FINANCIERO, RUTA_PROYECCIONES } from './ids-financiero';

type Origen = 'hucha' | 'financiacion';

/**
 * Enlace neutral desde «Hucha» y «Financiación y déficit» al bloque «Sistema financiero» de la página
 * «Proyecciones» (Fase 5-B2). Explica que un mismo concepto se muestra con distintas definiciones; la
 * ancla viaja en el estado de la navegación porque el enrutador usa el fragmento de la dirección.
 */
export function EnlaceFinanciero({ origen }: { origen: Origen }) {
  return (
    <section className="seccion prosa" aria-labelledby={`enlace-financiero-${origen}`}>
      <h2 id={`enlace-financiero-${origen}`}>
        Lo que calcula un modelo con estos mismos conceptos
      </h2>
      {origen === 'hucha' ? (
        <p>
          La página{' '}
          <Link to={RUTA_PROYECCIONES} state={{ ancla: ANCLA_FINANCIERO }}>
            «Proyecciones»
          </Link>{' '}
          muestra, en el bloque «Sistema financiero», el Fondo de Reserva tal como lo calcula un
          modelo propio con la legislación actual congelada: valor a fin de año, dotaciones,
          disposiciones, límite legal de disposición y financiación adicional. El histórico de esta
          página es el registrado por la fuente, con el Fondo a precio de adquisición; el modelo
          parte de ese valor y lo hace crecer con una rentabilidad nominal constante, por lo que las
          dos partes no usan exactamente la misma valoración.
        </p>
      ) : (
        <p>
          Los saldos de esta página se calculan con las definiciones de sus fuentes (saldo
          presupuestario no financiero y necesidad de financiación en términos del sistema europeo
          de cuentas). La página{' '}
          <Link to={RUTA_PROYECCIONES} state={{ ancla: ANCLA_FINANCIERO }}>
            «Proyecciones»
          </Link>
          , en su bloque «Sistema financiero», muestra tres medidas de saldo de un modelo propio
          (cotizaciones menos pensiones, saldo sin transferencias y saldo no financiero) y el gasto
          en pensiones sobre el PIB: no son idénticas a las de esta página y usan un PIB aproximado,
          distinto del del INE, en la parte proyectada.
        </p>
      )}
    </section>
  );
}
