/**
 * Tarjeta de la afirmación sobre la revalorización y el IPC. No muestra ningún acumulado: la serie
 * de revalorización de /data tiene huecos, que la página calcula y declara. Toda cifra sale de /data
 * a través de `datos-mitos.ts`; los textos no llevan dígitos.
 */
import type { Columna } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { tramosDeAnios } from '../../engine/mitos';
import { puntosAPorcentaje } from '../historico/formatos';
import { GraficoSeries } from '../historico/GraficoSeries';
import { Afirmacion, type Mito } from './Afirmacion';
import { FuentesDesplegables, TablaConFuente } from './bloques';
import { datosMitos } from './datos-mitos';

interface TarjetaProps {
  readonly mito: Mito;
  readonly indice: number;
  readonly total: number;
}

type FilaTexto = Record<string, string | number | null>;

/** «de 2011 a 2012» o «2015» según el tramo. */
const textoTramo = ([desde, hasta]: readonly [number, number]): string =>
  desde === hasta ? String(desde) : `de ${desde} a ${hasta}`;

export function TarjetaIpc({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().ipc;
  const huecos = d.aniosSinRevalorizacion;
  const textoHuecos = huecos.map(textoTramo).join(' y ');
  const r = d.regla2011;
  /** «Real Decreto-ley 8/2010»: el rango y el número de la norma salen del título del dato. */
  const normaCorta = (c: { readonly dato: { readonly source: { readonly title: string } } }) =>
    c.dato.source.title.split(',')[0] ?? '';
  const aniosSinNorma = tramosDeAnios(
    huecos
      .flatMap(([desde, hasta]) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i))
      .filter((a) => a !== r.anio),
  );
  const textoSinNorma = aniosSinNorma.map(textoTramo).join(' y ');
  const fraccion = (v: number | string) => (typeof v === 'number' ? v / 100 : null);
  const sitio = (c: { readonly ubicacion: string }) => c.ubicacion.split(';')[0] ?? '';
  const filasRegla: FilaTexto[] = [
    {
      concepto: 'Pensiones contributivas no excluidas',
      valor: 'Suspendida',
      norma: `${normaCorta(r.suspension)}, ${sitio(r.suspension)}; ${normaCorta(r.resto)}, ${sitio(r.resto)}`,
    },
    {
      concepto: 'Complementos por mínimos, no contributivas y SOVI no concurrentes',
      valor: fraccion(r.excluidas.valor),
      norma: `${normaCorta(r.excluidas)}, ${sitio(r.excluidas)}`,
    },
    {
      concepto: 'Referencia del pago único ligado al ejercicio anterior',
      valor: fraccion(r.pagoUnico.valor),
      norma: `${normaCorta(r.pagoUnico)}, ${sitio(r.pagoUnico)}`,
    },
  ];

  const filas: FilaTexto[] = d.filas.map((f) => ({
    anio: String(f.anio),
    revalorizacion: f.revalorizacion === null ? null : f.revalorizacion / 100,
    ipcMedia: f.ipcMedia === null ? null : f.ipcMedia / 100,
    ipcDiciembre: f.ipcDiciembre === null ? null : f.ipcDiciembre / 100,
    diferenciaMedia: f.diferenciaMedia === null ? null : f.diferenciaMedia / 100,
    diferenciaDiciembre: f.diferenciaDiciembre === null ? null : f.diferenciaDiciembre / 100,
  }));
  const columnas: Columna<FilaTexto>[] = [
    { clave: 'anio', titulo: 'Año' },
    {
      clave: 'revalorizacion',
      titulo: 'Revalorización aplicada',
      tipo: 'porcentaje',
      decimales: 2,
    },
    { clave: 'ipcMedia', titulo: 'IPC medio anual', tipo: 'porcentaje', decimales: 1 },
    { clave: 'ipcDiciembre', titulo: 'IPC de diciembre', tipo: 'porcentaje', decimales: 1 },
    {
      clave: 'diferenciaMedia',
      titulo: 'Diferencia con el IPC medio',
      tipo: 'porcentaje',
      decimales: 2,
    },
    {
      clave: 'diferenciaDiciembre',
      titulo: 'Diferencia con el IPC de diciembre',
      tipo: 'porcentaje',
      decimales: 2,
    },
  ];

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'como-se-calcula' }, { slug: 'reformas' }]}
      medible={
        <>
          <p>
            Los datos permiten comparar, año a año, el porcentaje con el que se revalorizaron las
            pensiones con dos medidas del IPC (la variación de la media anual y la variación de
            diciembre). La regla vigente de la Ley General de la Seguridad Social usa otra: la media
            de los IPC interanuales de los meses que fija la regla hasta un último mes de medición
            (los datos de la regla se muestran más abajo). La regla ha cambiado a lo largo del
            periodo: la cronología de reformas está en la página «Reformas».
          </p>
          <p>
            Esta tarjeta no muestra ningún acumulado de la revalorización frente al IPC: la serie de
            revalorización de los datos no tiene porcentaje general de{' '}
            {textoHuecos === '' ? 'algunos años' : textoHuecos}. De {r.anio} consta la norma en las
            fuentes consultadas y se resume más abajo, pero no fija un único porcentaje general; de{' '}
            {textoSinNorma} no consta la norma. Además, en los primeros años de la serie solo figura
            la revalorización inicial y no la paga por desviación del IPC; este último extremo no se
            ha comprobado en las fuentes consultadas, salvo que el real decreto de {r.anio} recoge
            un pago único ligado al ejercicio anterior, que la serie tampoco incluye. Un acumulado
            calculado con esos huecos no sería comparable.
          </p>
        </>
      }
    >
      <TablaConFuente
        titulo="Revalorización aplicada y variación del IPC, año a año"
        columnas={columnas}
        filas={filas}
        fuentes={[d.ipcMedia.datos[0], d.ipcDiciembre.datos[0]].flatMap((x) =>
          x === undefined ? [] : [x],
        )}
        pie="Las celdas con raya son años sin dato en los datos. Las diferencias están en puntos porcentuales y solo se calculan en los años con las dos cifras."
      />
      <FuentesDesplegables
        datos={d.revalorizacion.datos}
        resumen={`Ver las normas de cada año de la revalorización (${d.revalorizacion.datos.length} datos)`}
      />

      <h4>{`La regla de ${String(r.anio)} según el texto de la norma`}</h4>
      <TablaConFuente
        titulo={`Revalorización de las pensiones en ${String(r.anio)} según el texto de las normas, sin porcentaje general`}
        columnas={[
          { clave: 'concepto', titulo: 'Concepto' },
          { clave: 'valor', titulo: 'Revalorización', tipo: 'porcentaje', decimales: 1 },
          { clave: 'norma', titulo: 'Norma y artículo' },
        ]}
        filas={filasRegla}
        fuentes={[r.suspension.dato, r.excluidas.dato, r.pagoUnico.dato]}
        pie="El texto no enuncia un porcentaje para las pensiones no excluidas: «suspensión» y «mantendrán la cuantía» equivalen a un incremento nulo. El porcentaje de las excluidas figura en la exposición de motivos del real decreto y sus artículos lo desarrollan en importes «a cuenta» del IPC real."
      />

      <GraficoSeries
        titulo="Revalorización aplicada menos IPC, año a año"
        descripcion="Diferencia en puntos porcentuales con el IPC medio anual y con el IPC de diciembre. Unidad: puntos porcentuales."
        tipo="barras-agrupadas"
        series={[
          { clave: 'media', etiqueta: 'Menos IPC medio anual', puntos: d.diferenciaMedia },
          { clave: 'diciembre', etiqueta: 'Menos IPC de diciembre', puntos: d.diferenciaDiciembre },
        ]}
        unidadEje="Puntos porcentuales"
        decimales={2}
        decimalesEje={1}
        alto={380}
        fuentes={[d.ipcMedia.datos[0], d.ipcDiciembre.datos[0]].flatMap((x) =>
          x === undefined ? [] : [x],
        )}
        nota="Cálculo propio: porcentaje de revalorización menos variación del IPC, solo en los años con las dos cifras. Los años sin barra son años sin dato de revalorización o de IPC; no se rellenan. La fuente de la revalorización de cada año es la norma de ese año (se despliega bajo la tabla anterior)."
        comoLeerlo={
          <>
            <p>
              Una barra positiva indica que la revalorización aplicada fue mayor que la variación
              del IPC de ese año con esa medida; una barra negativa, menor. Con una medida y con la
              otra el signo puede ser distinto en el mismo año.
            </p>
            <p>
              La gráfica no suma los años ni calcula el efecto acumulado sobre el poder adquisitivo.
              Las reglas de revalorización han cambiado a lo largo del periodo, de modo que los años
              no son comparables entre sí sin tener en cuenta qué regla regía en cada uno. El poder
              adquisitivo de una persona concreta depende además de su cesta de consumo y de los
              complementos que perciba.
            </p>
          </>
        }
      />

      <ComoLeerlo>
        <p>
          Regla vigente de revalorización: se promedian {String(d.meses.valor)} {d.meses.unidad} de
          IPC interanual;{' '}
          {d.ultimoMes.unidad.replace(
            /^mes del año anterior \(1-12\): /,
            'último mes de medición: ',
          )}
          ; suelo: {puntosAPorcentaje(Number(d.suelo.valor))} (
          {d.suelo.unidad.replace(/^% \(/, '').replace(/\)$/, '')}). La regla de cada año anterior
          está en la norma de ese año, no en una serie de los datos.
        </p>
      </ComoLeerlo>
      <SourceLine datos={[d.meses.dato, d.ultimoMes.dato, d.suelo.dato]} />
    </Afirmacion>
  );
}
