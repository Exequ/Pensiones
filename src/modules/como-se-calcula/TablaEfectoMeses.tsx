import { Link } from 'react-router-dom';
import { DataTable, type Columna, type ValorCelda } from '../../components/DataTable';
import { HowToRead } from '../../components/HowToRead';
import { InternalLink } from '../../components/InternalLink';
import { SourceLine } from '../../components/SourceLine';
import type { TramoEfecto } from '../../engine/jubilacion/efecto-meses';
import { formatearDuracion, formatearNumero, formatearPorcentaje } from '../../engine/formato';
import { DESTINO_EFECTO_MESES, idLectura } from './apartados';
import { datosEfecto } from './datos-efecto';
import { ID_LECTURA_FRACCION, ID_LECTURA_SALVAGUARDA } from './pasos-motor';

const TITULO = 'Cambio de la pensión de jubilación según los meses que se adelanta o se retrasa';

type Fila = Record<string, ValorCelda>;

/** Texto de cada tramo de cotización acumulada: «tramo 1, menos de …; tramo 2, de … a menos de …». */
function textoDeTramos(tramos: readonly TramoEfecto[]): string {
  return tramos
    .map((t) => {
      const cuando =
        t.desdeMeses === 0
          ? `menos de ${formatearDuracion(t.hastaMeses ?? 0)}`
          : t.hastaMeses === null
            ? `${formatearDuracion(t.desdeMeses)} o más`
            : `de ${formatearDuracion(t.desdeMeses)} a menos de ${formatearDuracion(t.hastaMeses)}`;
      return `tramo ${formatearNumero(t.tramo)}, ${cuando}`;
    })
    .join('; ');
}

const pct = (valor: number): string => formatearPorcentaje(valor / 100, { maxDecimales: 2 });

/**
 * Tabla del efecto de adelantar o retrasar la jubilación: una fila por número de meses y una columna
 * por caso y tramo de cotización acumulada. Todo valor sale de `efectoMesesJubilacion` (motor) sobre
 * los parámetros de /data; la nota dice qué mide, qué no incluye y qué versión de la norma se muestra.
 */
export function TablaEfectoMeses() {
  const { efecto, desdeVoluntaria, desdeInvoluntaria, gradual, escalaDesde, fuentes } =
    datosEfecto();
  const tramosV = textoDeTramos(efecto.voluntaria.tramos);
  const tramosI = textoDeTramos(efecto.involuntaria.tramos);

  const columnas: Columna<Fila>[] = [
    { clave: 'meses', titulo: 'Meses', tipo: 'numero', decimales: 0 },
    ...efecto.voluntaria.tramos.map((t): Columna<Fila> => ({
      clave: `v${String(t.tramo)}`,
      titulo: `Voluntaria, tramo ${formatearNumero(t.tramo)}`,
      tipo: 'porcentaje',
      decimales: 2,
      conSigno: true,
    })),
    ...efecto.involuntaria.tramos.map((t): Columna<Fila> => ({
      clave: `i${String(t.tramo)}`,
      titulo: `Involuntaria, tramo ${formatearNumero(t.tramo)}`,
      tipo: 'porcentaje',
      decimales: 2,
      conSigno: true,
    })),
    {
      clave: 'dp',
      titulo: 'Demora, puntos de la base',
      tipo: 'porcentaje',
      decimales: 2,
      conSigno: true,
    },
    { clave: 'dc', titulo: 'Demora, cambio', tipo: 'porcentaje', decimales: 2, conSigno: true },
  ];
  const filas = efecto.filas.map((f): Fila => {
    const fila: Fila = { meses: f.meses };
    f.voluntaria.forEach((v, i) => {
      fila[`v${String(i + 1)}`] = v === null ? null : v / 100;
    });
    f.involuntaria.forEach((v, i) => {
      fila[`i${String(i + 1)}`] = v === null ? null : v / 100;
    });
    fila['dp'] = f.demoraPuntos / 100;
    fila['dc'] = f.demoraCambio / 100;
    return fila;
  });

  return (
    <div className="como-efecto">
      <h3 id={DESTINO_EFECTO_MESES} tabIndex={-1}>
        Cuánto cambia la pensión al adelantar o retrasar la jubilación
      </h3>
      <p>
        La tabla compara, mes a mes, una jubilación adelantada o retrasada con una jubilación a la
        edad ordinaria que tuviera la misma base reguladora y el mismo porcentaje por años
        cotizados. Es orientativa: no estima la pensión de ninguna persona. El simulador{' '}
        <Link to="/tu-pension">«Tu pensión»</Link> calcula la jubilación ordinaria.
      </p>
      <DataTable
        titulo={TITULO}
        columnas={columnas}
        filas={filas}
        pie={
          <>
            <p>
              <strong>Definición.</strong> En la jubilación anticipada, el cambio es el coeficiente
              reductor del cuadro de la norma para ese número de meses (cada mes o fracción de mes
              cuenta como uno) y ese tramo de cotización acumulada; se aplica sobre la pensión que
              resulta de la base reguladora y del porcentaje por años cotizados. «Voluntaria» es la
              jubilación anticipada por voluntad de la persona, con un máximo de{' '}
              {formatearNumero(efecto.voluntaria.mesesMaximos)} meses; «involuntaria», la que se
              debe a una causa no imputable a la persona trabajadora, con un máximo de{' '}
              {formatearNumero(efecto.involuntaria.mesesMaximos)} meses. El guion indica que ese
              número de meses no cabe en el cuadro.
            </p>
            <p>
              Tramos de cotización acumulada: {tramosV}.
              {tramosV === tramosI
                ? ' Son los mismos en las dos modalidades.'
                : ` En la involuntaria: ${tramosI}.`}
            </p>
            <p>
              En la demora, «puntos de la base» es el porcentaje adicional que se suma al porcentaje
              por años cotizados (por cada año completo de demora y, según la lectura abierta sobre
              la{' '}
              <InternalLink destino={idLectura('jubilacion', ID_LECTURA_FRACCION)}>
                fracción de año
              </InternalLink>
              , una parte por la fracción). «Cambio» es el cambio de la pensión si el porcentaje por
              años cotizados es el máximo de la escala vigente en el año {efecto.anio} (
              {pct(efecto.maximoEscalaPct)}): esos puntos entre ese máximo. Con un porcentaje por
              años cotizados menor, el mismo adicional supone un cambio relativo mayor. Las otras
              formas de abono del complemento por demora no están en la tabla.
            </p>
            <p>
              <strong>Qué no incluye.</strong> La interacción con la pensión máxima, el complemento
              a mínimos ni la salvaguarda de la disposición transitoria trigésima cuarta, que es una
              lectura abierta del cálculo (
              <InternalLink destino={idLectura('jubilacion', ID_LECTURA_SALVAGUARDA)}>
                ver la lectura y su estado
              </InternalLink>
              ). Si la pensión supera el límite de la pensión máxima, la anticipada voluntaria
              aplica otros coeficientes sobre ese límite, de forma gradual hasta el año{' '}
              {formatearNumero(gradual.ultimo, { agruparCuatroCifras: false })}; esa regla no está
              en la tabla.
            </p>
            <p>
              <strong>Vigencia.</strong> Valores vigentes en el año {efecto.anio}: el cuadro de la
              anticipada voluntaria rige desde{' '}
              {formatearNumero(desdeVoluntaria, { agruparCuatroCifras: false })}, el de la
              involuntaria desde{' '}
              {formatearNumero(desdeInvoluntaria, { agruparCuatroCifras: false })} y la versión de
              la escala, desde {formatearNumero(escalaDesde, { agruparCuatroCifras: false })}.
            </p>
          </>
        }
      />
      <SourceLine datos={fuentes} titulo={TITULO} />
      <HowToRead>
        <p>
          Cada fila es un número de meses. Las columnas de la jubilación anticipada dicen cuánto
          baja la pensión si la jubilación se adelanta esos meses, según los años cotizados (tramo);
          las de la demora, cuánto sube si se retrasa. El signo indica el sentido del cambio.
        </p>
        <p>
          La tabla describe lo que fija la norma: no dice cuándo conviene jubilarse ni compara las
          modalidades entre sí.
        </p>
      </HowToRead>
    </div>
  );
}
