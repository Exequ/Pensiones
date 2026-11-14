import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { CLASES_PENSION } from '../../engine/sistema-historico';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal1, entero, ETIQUETA_CLASE } from '../historico/formatos';
import { datosCotizantes } from '../historico/datos-cotizantes';

const OPCIONES_CLASE = ['total', ...CLASES_PENSION] as const;
type ClaseOTotal = (typeof OPCIONES_CLASE)[number];

/** Altas iniciales y bajas definitivas de pensiones contributivas. */
export function AltasBajas() {
  const d = datosCotizantes();
  const [clase, setClase] = useState<ClaseOTotal>('total');

  const filas = d.altasBajas.filas.filter((f) => f.clase === clase && f.sexo === 'ambos');
  const anios = [...new Set(filas.map((f) => f.anio))].sort((a, b) => a - b);
  const serie = (movimiento: string) =>
    anios.flatMap((anio) => {
      const fila = filas.find((f) => f.anio === anio && f.movimiento === movimiento);
      return fila?.numero === null || fila === undefined ? [] : [{ anio, valor: fila.numero }];
    });
  const altas = serie('alta-inicial');
  const bajas = serie('baja-definitiva');
  const ultimoAnio = anios.at(-1) ?? 0;
  const altasUltimo = altas.find((p) => p.anio === ultimoAnio)?.valor ?? 0;
  const bajasUltimo = bajas.find((p) => p.anio === ultimoAnio)?.valor ?? 0;
  const saldoUltimo = altasUltimo - bajasUltimo;

  const tablaMedia = anios.map((anio) => ({
    anio: String(anio),
    mediaAltas:
      filas.find((f) => f.anio === anio && f.movimiento === 'alta-inicial')?.pensionMedia ?? null,
    mediaBajas:
      filas.find((f) => f.anio === anio && f.movimiento === 'baja-definitiva')?.pensionMedia ??
      null,
  }));
  const edadMedia = d.edadMediaAltas.puntos.map((p) => ({ anio: String(p.anio), edad: p.valor }));
  const etiquetaClase = (ETIQUETA_CLASE[clase] ?? clase).toLowerCase();

  return (
    <section className="seccion prosa" aria-labelledby="altas-bajas">
      <h2 id="altas-bajas">Altas y bajas de pensiones</h2>
      <p>
        El número de pensiones en vigor cambia cada año por las altas iniciales (pensiones que se
        reconocen por primera vez) y las bajas definitivas (pensiones que se extinguen). La fuente
        publica estas cifras desde un año concreto, de modo que la serie es corta.
      </p>
      <div className="hist-selector">
        <SegmentedPills
          leyenda="Clase de pensión"
          opciones={OPCIONES_CLASE.map((c) => ({ valor: c, etiqueta: ETIQUETA_CLASE[c] ?? c }))}
          valor={clase}
          onCambio={setClase}
        />
      </div>
      <GraficoSeries
        titulo={`Altas iniciales y bajas definitivas: ${etiquetaClase}`}
        descripcion="Pensiones contributivas dadas de alta y de baja en cada año, ambos sexos. Unidad: miles de pensiones."
        tipo="barras-agrupadas"
        series={[
          { clave: 'altas', etiqueta: 'Altas iniciales', puntos: altas },
          { clave: 'bajas', etiqueta: 'Bajas definitivas', puntos: bajas },
        ]}
        unidadEje="Miles de pensiones"
        divisorEje={1000}
        decimalesEje={1}
        fuentes={d.altasBajas.dato}
        comoLeerlo={
          <>
            <p>
              En {ultimoAnio} hubo {entero(altasUltimo)} altas y {entero(bajasUltimo)} bajas de esta
              clase: la diferencia ({entero(saldoUltimo)}) es la variación del número de pensiones
              atribuible a estos dos movimientos.
            </p>
            <p>
              Una alta es una pensión nueva, no necesariamente una persona nueva (puede cobrar ya
              otra). La fuente no desglosa la causa de las bajas, por lo que no se puede separar,
              por ejemplo, el fallecimiento de otras causas.
            </p>
          </>
        }
      />
      <div className="hist-definiciones">
        <DataTable
          titulo={`Pensión media de las altas y de las bajas: ${etiquetaClase}`}
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            {
              clave: 'mediaAltas',
              titulo: 'Pensión media de las altas (€/mes)',
              tipo: 'euros',
              decimales: 2,
            },
            {
              clave: 'mediaBajas',
              titulo: 'Pensión media de las bajas (€/mes)',
              tipo: 'euros',
              decimales: 2,
            },
          ]}
          filas={tablaMedia}
        />
        <SourceLine datos={d.altasBajas.dato} />
        <DataTable
          titulo="Edad media de las altas iniciales de jubilación"
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            { clave: 'edad', titulo: 'Edad media (años)', tipo: 'numero', decimales: 1 },
          ]}
          filas={edadMedia}
        />
        <SourceLine datos={d.edadMediaAltas.dato} />
        <p className="como-leerlo-texto">
          La edad media de las altas de jubilación en {d.edadMediaAltas.puntos.at(-1)?.anio ?? ''}{' '}
          es de {decimal1(d.edadMediaAltas.puntos.at(-1)?.valor ?? 0)} años. Es la edad a la que se
          reconoce la pensión, no necesariamente la edad a la que la persona deja de trabajar.
        </p>
      </div>
    </section>
  );
}
