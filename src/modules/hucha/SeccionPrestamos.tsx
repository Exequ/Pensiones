import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { extremos, maximo, valorEn } from '../../engine/series-historicas';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { datosHucha } from '../historico/datos-hucha';
import { millonesEuros } from '../historico/formatos';
import { GraficoSeries } from '../historico/GraficoSeries';
import { ID23 } from './ids-datos';
import { anioDeId, periodoDeId } from './rango';
import { etiquetaTramo } from './tramos';

/**
 * «Préstamos del Estado y Fondo de Reserva según el Tribunal de Cuentas»: préstamos concedidos por
 * año (Anexo 10 de la Declaración sobre la Cuenta General del Estado), comparados con los pasivos
 * financieros de ingresos de la liquidación y de la ejecución, el Anexo 10 línea a línea y las
 * cifras del Fondo de Reserva que da el Tribunal frente al valor de la serie del Fondo.
 */
export function SeccionPrestamos() {
  const d = datosHucha();
  const cifra = (id: string): number => {
    const v = d.tribunal2023[id]?.valor;
    if (typeof v !== 'number') throw new Error(`Falta la cifra «${id}» del Tribunal de Cuentas`);
    return v;
  };
  /** Un dato por documento de origen: varios datos de una misma fuente repetirían su línea de fuente. */
  const unicos = (datos: Dato[]): Dato[] => [
    ...new Map(datos.map((x) => [`${x.source.url}|${x.fetchedAt}`, x])).values(),
  ];
  const prestamos = d.prestamosPorAnio.puntos;
  const pasivosLiquidacion = d.liquidacion.pasivosFinancieros.puntos;
  const pasivosEjecucion = d.transferencias.pasivosFinancieros.puntos;
  const { primero: primerPrestamo, ultimo: ultimoPrestamo } = extremos(prestamos);
  const mayorPrestamo = maximo(prestamos);
  const pasivosConImporteLiquidacion = pasivosLiquidacion.filter((p) => p.valor > 0);
  const anioDeclaracion = anioDeId(ID23.saldoDeuda);
  const anexo = d.anexoPrestamos.nombre;

  const filasAnexo = d.anexoPrestamos.filas.map((f) => ({
    tipo:
      f.tipo === 'prestamo'
        ? 'Préstamo'
        : f.tipo === 'subtotal'
          ? 'Subtotal del bloque'
          : 'Total del anexo',
    bloque: f.bloque,
    norma: f.norma,
    importe: f.importe,
    vencimiento: f.vencimiento,
    concesion: f.anioConcesion === null ? '' : String(f.anioConcesion),
  }));

  const valorFondo = valorEn(d.valor.puntos, anioDeclaracion);
  const reserva = cifra(ID23.reservaFondo);
  const filasFondo = [
    {
      concepto:
        'Valor del Fondo de Reserva a fin de año, a precio de adquisición (serie de la Seguridad Social)',
      importe: valorFondo ?? null,
    },
    {
      concepto: 'Reserva patrimonial del Fondo en el balance de la Tesorería General (Tribunal)',
      importe: reserva,
    },
    {
      concepto:
        'Saldo de tesorería en la cuenta específica del Fondo en el Banco de España (Tribunal)',
      importe: cifra(ID23.tesoreriaFondo),
    },
    {
      concepto:
        'Ingresos del MEI de octubre y noviembre incluidos en la reserva pero no en esa cuenta (Tribunal)',
      importe: cifra(ID23.meiOctubreNoviembre),
    },
  ];
  const datosFondo: Dato[] = unicos([
    d.valor.dato,
    ...[ID23.reservaFondo, ID23.tesoreriaFondo, ID23.meiOctubreNoviembre].flatMap((id) =>
      d.tribunal2023[id] === undefined ? [] : [d.tribunal2023[id].dato],
    ),
  ]);
  const datosPrestamos: Dato[] = unicos([
    d.prestamosPorAnio.dato,
    d.liquidacion.pasivosFinancieros.dato,
    d.transferencias.pasivosFinancieros.dato,
    d.anexoPrestamos.dato,
    ...[
      ID23.saldoDeuda,
      ID23.prestamosAntiguos,
      ID23.prestamosRecientes,
      ID23.condicionesPrestamos,
    ].flatMap((id) => (d.tribunal2023[id] === undefined ? [] : [d.tribunal2023[id].dato])),
  ]);

  return (
    <section className="seccion prosa" aria-labelledby="prestamos">
      <h2 id="prestamos">Préstamos del Estado y Fondo de Reserva según el Tribunal de Cuentas</h2>
      <p>
        La declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de{' '}
        {anioDeclaracion} incluye, en su {anexo}, cada préstamo concedido por el Estado a la
        Seguridad Social, con la norma que lo autoriza, su importe y su vencimiento. El saldo del
        endeudamiento frente al Estado a fin de {anioDeclaracion} que da el Tribunal es de{' '}
        {millonesEuros(cifra(ID23.saldoDeuda))}: {millonesEuros(cifra(ID23.prestamosAntiguos))} de
        préstamos concedidos entre {periodoDeId(ID23.prestamosAntiguos)} y{' '}
        {millonesEuros(cifra(ID23.prestamosRecientes))} de los concedidos entre{' '}
        {periodoDeId(ID23.prestamosRecientes)}. El anexo incluye además el préstamo de{' '}
        {anioDeId(ID23.prestamoPosterior)}, de {millonesEuros(cifra(ID23.prestamoPosterior))}, que
        figura como desembolsado después de esa fecha y no forma parte de ese saldo.
      </p>
      <p>
        El anexo no indica la fecha de concesión de cada préstamo. Para los de los últimos años se
        asigna a cada uno el año anterior al de inicio de su plazo de cancelación, porque el
        Tribunal indica que el plazo máximo de diez años empieza el año siguiente al de la
        concesión. Ese año es el año en que la ejecución del presupuesto registra el préstamo como
        pasivo financiero de ingresos (la serie de pasivos financieros de la ejecución figura en el
        gráfico y en la tabla), pero no es una fecha publicada en el anexo. Para los préstamos de
        los años noventa no se asigna año.
      </p>
      <GraficoSeries
        titulo="Préstamos concedidos por el Estado y pasivos financieros de ingresos, por año"
        descripcion={`Préstamos por año de registro como pasivo financiero (${anexo} del Tribunal de Cuentas, año deducido del plazo de cancelación) y pasivos financieros de ingresos de la liquidación y de la ejecución. Unidad: miles de millones de euros.`}
        tipo="barras-agrupadas"
        series={[
          {
            clave: 'prestamos',
            etiqueta: etiquetaTramo('Préstamos, Tribunal', prestamos),
            puntos: prestamos,
          },
          {
            clave: 'pasivos-liquidacion',
            etiqueta: etiquetaTramo('Pasivos, liquidación', pasivosLiquidacion),
            puntos: pasivosLiquidacion,
          },
          {
            clave: 'pasivos-ejecucion',
            etiqueta: etiquetaTramo('Pasivos, ejecución', pasivosEjecucion),
            puntos: pasivosEjecucion,
          },
        ]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimales={1}
        decimalesEje={0}
        alto={380}
        fuentes={datosPrestamos}
        nota="Los préstamos por año son una serie derivada (confianza alta en el anexo, año deducido del inicio del plazo de cancelación y coherente con el año de registro en la ejecución). Los pasivos financieros de ingresos proceden de dos documentos distintos (liquidación y ejecución del presupuesto), con ruptura de serie entre ellos; no son sinónimo de préstamos del Estado, porque ese capítulo recoge toda operación de pasivos financieros. Los años sin barra tienen un importe nulo."
        comoLeerlo={
          <>
            <p>
              Entre {primerPrestamo.anio} y {ultimoPrestamo.anio} el {anexo} recoge préstamos todos
              los años; el mayor importe anual es el de {mayorPrestamo.anio}, con{' '}
              {millonesEuros(mayorPrestamo.valor)}. La barra de pasivos financieros de cada año de
              ese periodo es la cifra de la ejecución, que el gráfico pone al lado para comparar las
              dos clasificaciones.
            </p>
            <p>
              {pasivosConImporteLiquidacion.length === 0
                ? ''
                : `En los años de la liquidación con pasivos financieros distintos de cero (${pasivosConImporteLiquidacion.map((p) => p.anio).join(' y ')}) el ${anexo} no incluye ningún préstamo autorizado por una norma de esos años. `}
              El gráfico no explica qué recoge el capítulo de pasivos financieros en cada año ni
              asegura que la coincidencia o la diferencia entre las dos clasificaciones tenga una
              causa determinada.
            </p>
          </>
        }
      />

      <h3 id="anexo-prestamos">El {anexo}, línea a línea</h3>
      <div className="hist-definiciones">
        <DataTable
          titulo={`Préstamos otorgados por el Estado a la Seguridad Social (${anexo} de la declaración del Tribunal de Cuentas)`}
          columnas={[
            { clave: 'tipo', titulo: 'Tipo de línea' },
            { clave: 'bloque', titulo: 'Bloque' },
            { clave: 'norma', titulo: 'Norma que lo autoriza' },
            {
              clave: 'importe',
              titulo: 'Importe (millones de euros)',
              tipo: 'numero',
              decimales: 1,
            },
            { clave: 'vencimiento', titulo: 'Vencimiento, según el anexo' },
            { clave: 'concesion', titulo: 'Año de registro como pasivo financiero (deducido)' },
          ]}
          filas={filasAnexo}
        />
        <SourceLine datos={datosPrestamos} />
        <ComoLeerlo>
          <p>
            Los bloques agrupan los préstamos por su finalidad según el propio anexo. La suma de las
            líneas de cada bloque es su subtotal y la de los subtotales, el total; las
            comprobaciones están en el script de extracción. El total incluye el préstamo
            desembolsado después de la fecha de la declaración, de modo que no coincide con el saldo
            a esa fecha.
          </p>
          <p>
            La tabla no dice si un préstamo se ha devuelto, prorrogado o cancelado: en el anexo solo
            figuran el vencimiento previsto y, para los antiguos, la norma que amplía el plazo.
          </p>
        </ComoLeerlo>
      </div>

      <h3 id="fondo-tribunal">El Fondo de Reserva: dos formas de medirlo en {anioDeclaracion}</h3>
      <p>
        El Tribunal de Cuentas cifra el saldo de la reserva patrimonial del Fondo en el balance de
        la Tesorería General con un criterio contable distinto del precio de adquisición con el que
        se registra el valor del Fondo en la serie de la Seguridad Social. Las dos cifras no
        coinciden y con los datos consultados no se puede conciliarlas partida a partida.
      </p>
      <div className="hist-definiciones">
        <DataTable
          titulo="El Fondo de Reserva a fin de año según la serie de la Seguridad Social y según el Tribunal de Cuentas"
          columnas={[
            { clave: 'concepto', titulo: 'Concepto' },
            {
              clave: 'importe',
              titulo: 'Importe (millones de euros)',
              tipo: 'numero',
              decimales: 1,
            },
          ]}
          filas={filasFondo}
        />
        <SourceLine datos={datosFondo} />
        <ComoLeerlo>
          <p>
            {valorFondo === undefined
              ? ''
              : `La reserva patrimonial del balance (${millonesEuros(reserva)}) supera en ${millonesEuros(reserva - valorFondo)} al valor del Fondo de la serie (${millonesEuros(valorFondo)}). `}
            El Tribunal indica que ingresos del MEI de octubre y noviembre están en la reserva pero
            no en la cuenta específica del Banco de España; no afirma que esa partida explique toda
            la diferencia con la serie, y aquí no se ha verificado.
          </p>
          <p>
            Son medidas distintas de un mismo fondo: la tabla no elige cuál es la correcta ni dice
            cuánto del Fondo está invertido en cada tipo de activo.
          </p>
        </ComoLeerlo>
      </div>
    </section>
  );
}
