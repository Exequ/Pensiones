import { SegmentedPills } from '../../components/SegmentedPills';
import { PRESTACIONES, PRESTACIONES_PROXIMAS } from './prestaciones';
import { TEXTOS } from './textos';
import type { IdPrestacion } from './tipos';

interface SelectorPrestacionProps {
  valor: IdPrestacion;
  onCambio: (id: IdPrestacion) => void;
}

/**
 * Selector de prestación (Fase 3-C1): botones de opción nativos (teclado completo, etiqueta y
 * leyenda). Las prestaciones que aún no se calculan aparecen desactivadas y rotuladas «próximamente»,
 * sin cifras.
 */
export function SelectorPrestacion({ valor, onCambio }: SelectorPrestacionProps) {
  return (
    <section className="seccion tp-selector-prestacion" aria-labelledby="tp-prestacion">
      <h2 id="tp-prestacion">{TEXTOS.prestacionTitulo}</h2>
      <SegmentedPills<string>
        leyenda={TEXTOS.prestacionLeyenda}
        opciones={[
          ...PRESTACIONES.map((p) => ({ valor: p.id, etiqueta: p.etiqueta })),
          ...PRESTACIONES_PROXIMAS.map((p) => ({
            valor: p.id,
            etiqueta: `${p.etiqueta} (${TEXTOS.prestacionProximamente})`,
            deshabilitada: true,
          })),
        ]}
        valor={valor}
        onCambio={(v) => {
          const elegida = PRESTACIONES.find((p) => p.id === v);
          if (elegida) onCambio(elegida.id);
        }}
      />
      <p className="campo-ayuda">{TEXTOS.prestacionAyuda}</p>
    </section>
  );
}
