import { DataTable } from '../../components/DataTable';
import type { ComparacionLecturas as Comparacion } from '../../engine/comparar-lecturas';
import { filasComparacion, fraseComparacion } from './comparacion-texto';
import { TEXTOS } from './textos';

/**
 * Bloque junto al resultado: «Con tus lecturas» frente a «Con las lecturas por defecto», con la
 * diferencia en euros y en porcentaje. La frase va en una región `aria-live` que existe siempre
 * que hay resultado, para que el lector de pantalla anuncie el cambio al elegir otra lectura.
 */
export function ComparacionLecturas({
  comparacion,
  restablecidas,
}: {
  comparacion: Comparacion;
  /** `true` justo después de pulsar «Restablecer lecturas». */
  restablecidas: boolean;
}) {
  const filas = filasComparacion(comparacion);
  return (
    <section
      className={`tp-comparacion${comparacion.tipo === 'sin-cambios' ? '' : ' tp-comparacion-activa'}`}
      aria-labelledby="tp-comparacion-titulo"
    >
      <h3 id="tp-comparacion-titulo">{TEXTOS.comparacionTitulo}</h3>
      <p className="tp-comparacion-frase" role="status" aria-live="polite" aria-atomic="true">
        {fraseComparacion(comparacion, restablecidas)}
      </p>
      {filas.length > 0 ? (
        <>
          <DataTable
            titulo={TEXTOS.comparacionTabla}
            ocultarTitulo
            columnas={[
              { clave: 'concepto', titulo: TEXTOS.comparacionConcepto },
              { clave: 'conTusLecturas', titulo: TEXTOS.comparacionConTusLecturas, tipo: 'euros' },
              { clave: 'porDefecto', titulo: TEXTOS.comparacionPorDefecto, tipo: 'euros' },
              {
                clave: 'diferenciaEuros',
                titulo: TEXTOS.comparacionDiferenciaEuros,
                tipo: 'euros',
              },
              {
                clave: 'diferenciaPorcentaje',
                titulo: TEXTOS.comparacionDiferenciaPorcentaje,
                tipo: 'porcentaje',
              },
            ]}
            filas={filas.map((f) => ({ ...f }))}
          />
          <p className="tp-nota-lecturas">{TEXTOS.comparacionNota}</p>
        </>
      ) : null}
    </section>
  );
}
