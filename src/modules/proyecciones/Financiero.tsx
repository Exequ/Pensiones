import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatearPorcentaje } from '../../engine/formato';
import { datosFinanciero } from './datos-financiero';
import { FinancieroCalibracion } from './FinancieroCalibracion';
import { FinancieroComoFunciona } from './FinancieroComoFunciona';
import { FinancieroContraste } from './FinancieroContraste';
import { FinancieroEscenarios } from './FinancieroEscenarios';
import { FinancieroFondo } from './FinancieroFondo';
import { FinancieroGasto } from './FinancieroGasto';
import { FinancieroSaldos } from './FinancieroSaldos';
import { FinancieroSensibilidades } from './FinancieroSensibilidades';
import { MODELO } from './ids-datos';
import { ANCLA_FINANCIERO, ESCENARIO_BASE } from './ids-financiero';
import { APARTADOS } from './apartados';

/**
 * Bloque «Sistema financiero (M4)» de la página «Proyecciones» (Fase 5-B2). Se carga bajo demanda
 * (`lazy` en `Pagina.tsx`): arrastra la salida del modelo y los datos observados con los que se compara.
 */
export default function Financiero() {
  const [escenario, setEscenario] = useState<string>(ESCENARIO_BASE);
  const d = datosFinanciero(escenario);
  const { state } = useLocation() as { state: { ancla?: string } | null };
  const ancla = state?.ancla;

  // Con HashRouter un ancla normal cambiaría de ruta: los enlaces de otras páginas llevan el ancla en el
  // estado de la navegación y el bloque se desplaza a sí mismo cuando ya está cargado.
  useEffect(() => {
    if (ancla === ANCLA_FINANCIERO) {
      document.getElementById(ANCLA_FINANCIERO)?.scrollIntoView();
    }
  }, [ancla]);

  const g = formatearPorcentaje(d.escenario.g, { maxDecimales: 2 });
  const ipc = formatearPorcentaje(d.escenario.ipc, { maxDecimales: 2 });

  return (
    <section className="seccion prosa" aria-labelledby={ANCLA_FINANCIERO}>
      <h2 id={APARTADOS.financiero.destino} tabIndex={-1}>
        {APARTADOS.financiero.titulo}
      </h2>
      <p>
        El modelo {MODELO.m4} junta la población ({MODELO.m1}), los cotizantes y las bases de
        cotización ({MODELO.m2}) y las pensiones en vigor ({MODELO.m3}) para calcular el gasto en
        pensiones contributivas, las cotizaciones, el MEI, tres medidas de saldo, el Fondo de
        Reserva y la financiación adicional. El escenario de referencia es el de los demás modelos
        (crecimiento real de los salarios del {g} e IPC del {ipc}, con la legislación congelada); el
        selector de más abajo permite ver otros cuatro escenarios de sensibilidad.
      </p>
      <p>
        Los importes están en euros corrientes (con inflación). Donde existe, se muestra el
        histórico observado, con línea continua, y la proyección del modelo, con trazo discontinuo.
        Un cálculo propio no es una previsión: describe qué resultaría con esos supuestos.
      </p>
      <FinancieroEscenarios d={d} escenario={escenario} onCambio={setEscenario} />
      <FinancieroSensibilidades d={d} />
      <FinancieroGasto d={d} />
      <FinancieroCalibracion d={d} />
      <FinancieroSaldos d={d} />
      <FinancieroFondo d={d} />
      <FinancieroContraste d={d} />
      <FinancieroComoFunciona d={d} />
    </section>
  );
}
