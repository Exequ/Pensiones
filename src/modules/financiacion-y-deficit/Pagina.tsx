import { useState } from 'react';
import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { SegmentedPills } from '../../components/SegmentedPills';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { Ejecucion } from './Ejecucion';
import { GastoPib } from './GastoPib';
import { Saldos } from './Saldos';
import type { Unidad } from './unidad';

const seccion = buscarSeccion('financiacion-y-deficit');

/** Módulo «financiacion-y-deficit»: ejecución del presupuesto, saldos y gasto sobre el PIB. */
export default function FinanciacionYDeficit() {
  useTituloPagina(seccion.titulo);
  const [unidad, setUnidad] = useState<Unidad>('millones');
  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('financiacion-y-deficit')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada gráfico lleva su tabla de datos, su fuente, la fecha de descarga y un nivel de
            confianza. Los cálculos propios se señalan como tales y se explican bajo el gráfico.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página describe qué se mide, cómo evoluciona y qué definiciones existen. No contiene
          proyecciones ni valora si las cifras son altas, bajas o sostenibles.
        </p>
        <div className="hist-selector">
          <SegmentedPills
            leyenda="Importes de los gráficos de ingresos, gastos y saldos"
            opciones={[
              { valor: 'millones', etiqueta: 'Millones de euros' },
              { valor: 'porcentaje', etiqueta: 'Porcentaje del PIB' },
            ]}
            valor={unidad}
            onCambio={setUnidad}
          />
        </div>
        <Ejecucion unidad={unidad} />
        <Saldos unidad={unidad} />
        <GastoPib />
        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
