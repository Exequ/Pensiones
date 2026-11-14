import { useId, useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { extremos } from '../../engine/series-historicas';
import {
  aniosConDescenso,
  apoyoFinancieroDelEstado,
  COMPONENTES_POSICION,
  posicionIlustrativa,
  posicionNeta,
  type ComponentePosicion,
  type SeleccionPosicion,
} from '../../engine/transferencias';
import { datosHucha, type DatoCargado, type DatosHucha } from '../historico/datos-hucha';
import { GraficoSeries, type AnotacionGrafico } from '../historico/GraficoSeries';
import { millonesEuros } from '../historico/formatos';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { COMPONENTE, componenteGrafico } from './componentes';
import { GraficoPosicion, type FilaGrafico } from './GraficoPosicion';
import { ID } from './ids-datos';
import { anioDeId, rangoDeId } from './rango';
import { SelectorAnioInicio } from './SelectorAnioInicio';

interface Anotacion {
  readonly anio: number;
  readonly hecho: string;
  readonly fuente: string;
  readonly dato: Dato;
}

const TODOS: SeleccionPosicion = { fondo: true, deuda: true, transferencias: true };

/** Importe numérico de un dato cargado; falla si el dato no es una cifra. */
function importe(d: DatoCargado | undefined, id: string): number {
  if (d === undefined || typeof d.valor !== 'number') throw new Error(`Falta la cifra «${id}»`);
  return d.valor;
}

/** Hechos con fuente que cambian la lectura de la deuda y de las transferencias acumuladas. */
function construirAnotaciones(d: DatosHucha): Anotacion[] {
  const tc = d.tribunal;
  const [inicioPrestamos, finPrestamos] = rangoDeId(ID.tcPrestamosConcedidos);
  const [inicioImpropios, finImpropios] = rangoDeId(ID.tcTransferenciasImpropios);
  const anioLey2023 = anioDeId(ID.tcPrestamoPrevisto);
  const anioTribunal = anioDeId(ID.tcSaldoDeuda);
  const plazo = d.prestamosPlazo;
  const importesPlazo = [ID.plazoApartado1, ID.plazoApartado2, ID.plazoApartado3].map((id) =>
    importe(plazo[id], id),
  );
  const euros = (v: number) => millonesEuros(v / 1_000_000);
  const dato = (c: DatoCargado | undefined): Dato => {
    if (c === undefined) throw new Error('Falta un dato de las anotaciones');
    return c.dato;
  };
  const resultado: Anotacion[] = [
    {
      anio: inicioPrestamos,
      hecho: `Desde este año el Estado concede préstamos a largo plazo a la Tesorería General de la Seguridad Social; hasta ${finPrestamos} suman ${millonesEuros(importe(tc[ID.tcPrestamosConcedidos], ID.tcPrestamosConcedidos))}.`,
      fuente: 'Tribunal de Cuentas',
      dato: dato(tc[ID.tcPrestamosConcedidos]),
    },
    {
      anio: inicioImpropios,
      hecho: `Una modificación del texto refundido, introducida por la ley de presupuestos de ese año, prevé transferencias anuales con la base del Informe del Pacto de Toledo; las de ${inicioImpropios} y ${finImpropios} suman ${millonesEuros(importe(tc[ID.tcTransferenciasImpropios], ID.tcTransferenciasImpropios))}.`,
      fuente: 'Tribunal de Cuentas',
      dato: dato(tc[ID.tcTransferenciasImpropios]),
    },
    {
      anio: anioTribunal,
      hecho: `El Tribunal de Cuentas cifra el endeudamiento frente al Estado en ${millonesEuros(importe(tc[ID.tcSaldoDeuda], ID.tcSaldoDeuda))}: ${millonesEuros(importe(tc[ID.tcPrestamosAntiguos], ID.tcPrestamosAntiguos))} de préstamos de la década de los noventa y ${millonesEuros(importe(tc[ID.tcPrestamosConcedidos], ID.tcPrestamosConcedidos))} de los concedidos desde ${inicioPrestamos}.`,
      fuente: 'Tribunal de Cuentas',
      dato: dato(tc[ID.tcSaldoDeuda]),
    },
    {
      anio: anioTribunal,
      hecho: `El Tribunal de Cuentas recuerda su recomendación de que el Estado asuma la amortización de tres préstamos antiguos, por ${millonesEuros(importe(tc[ID.tcPrestamosInsalud], ID.tcPrestamosInsalud))} («bien por condonación o por la concesión de transferencias»). Es una recomendación: en las fuentes descargadas no consta que se haya aplicado.`,
      fuente: 'Tribunal de Cuentas',
      dato: dato(tc[ID.tcRecomendacionInsalud]),
    },
    {
      anio: anioLey2023,
      hecho: `La ley de presupuestos de ese año prevé un nuevo préstamo de ${millonesEuros(importe(tc[ID.tcPrestamoPrevisto], ID.tcPrestamoPrevisto))} y transferencias por ${millonesEuros(importe(tc[ID.tcTransferenciasPrevistas], ID.tcTransferenciasPrevistas))}.`,
      fuente: 'Tribunal de Cuentas',
      dato: dato(tc[ID.tcPrestamoPrevisto]),
    },
    {
      anio: Number(plazo[ID.plazoApartado1]?.periodo),
      hecho: `Un real decreto-ley concede un nuevo plazo de cancelación, o amplía el existente, a préstamos antiguos por ${euros(importesPlazo[0] ?? 0)}, ${euros(importesPlazo[1] ?? 0)} y ${euros(importesPlazo[2] ?? 0)}. Es una prórroga del plazo: no es una cancelación ni una conversión en transferencia. Es posterior al último año del gráfico.`,
      fuente: 'Real decreto-ley que prorroga el plazo',
      dato: dato(plazo[ID.plazoApartado1]),
    },
  ];
  return resultado;
}

const PARTIDAS_NETA: readonly ComponentePosicion[] = ['fondo', 'deuda'];
const PARTIDAS_APOYO: readonly ComponentePosicion[] = ['deuda', 'transferencias'];

/**
 * «c. Construcciones ilustrativas»: dos lecturas separadas, cada una con su gráfico, definición,
 * signo, tabla y «Cómo leerlo» — (i) «Fondo menos deuda» y (ii) «deuda más transferencias
 * acumuladas desde un año de inicio» (apoyo financiero del Estado) —, y la suma conjunta de las
 * tres partidas solo como opción, desactivada por defecto. Ninguna es una cifra oficial. Incluye la
 * serie de la deuda con las anotaciones de los hechos que cambian su lectura.
 */
export function SeccionPosicion() {
  const d = datosHucha();
  const idCasillas = useId();
  const idSumaConjunta = useId();
  const [anioInicio, setAnioInicio] = useState(d.transferencias.delEstado.puntos[0]?.anio ?? 0);
  const [sumaConjunta, setSumaConjunta] = useState(false);
  const [seleccion, setSeleccion] = useState<SeleccionPosicion>(TODOS);

  const anuales = d.transferencias.delEstado.puntos;
  const aniosInicio = anuales.map((p) => p.anio);

  // Lectura 1: Fondo menos deuda.
  const filasNeta = useMemo(
    () => posicionNeta(d.valor.puntos, d.deuda.finAno.puntos),
    [d.valor.puntos, d.deuda.finAno.puntos],
  );
  const filasNetaGrafico = useMemo<FilaGrafico[]>(
    () =>
      filasNeta.map((f) => ({
        anio: f.anio,
        valores: { fondo: f.fondo, deuda: f.deuda },
        resultado: f.neta,
      })),
    [filasNeta],
  );
  const ultimaNeta = filasNeta.at(-1);

  // Lectura 2: apoyo financiero del Estado = deuda + transferencias acumuladas desde el inicio.
  const filasApoyo = useMemo(
    () =>
      apoyoFinancieroDelEstado(
        { deuda: d.deuda.finAno.puntos, transferenciasAnuales: anuales },
        anioInicio,
      ),
    [d.deuda.finAno.puntos, anuales, anioInicio],
  );
  const filasApoyoGrafico = useMemo<FilaGrafico[]>(
    () =>
      filasApoyo.map((f) => ({
        anio: f.anio,
        valores: { deuda: f.deuda, transferencias: f.transferencias },
        resultado: f.apoyo,
      })),
    [filasApoyo],
  );
  const ultimoApoyo = filasApoyo.at(-1);

  // Suma conjunta (opción): las tres partidas, con las casillas de la construcción anterior.
  const filasSuma = useMemo(
    () =>
      posicionIlustrativa(
        {
          fondo: d.valor.puntos,
          deuda: d.deuda.finAno.puntos,
          transferenciasAnuales: anuales,
        },
        anioInicio,
        seleccion,
      ),
    [d.valor.puntos, d.deuda.finAno.puntos, anuales, anioInicio, seleccion],
  );
  const filasSumaGrafico = useMemo<FilaGrafico[]>(
    () =>
      filasSuma.map((f) => ({
        anio: f.anio,
        valores: { fondo: f.fondo, deuda: f.deuda, transferencias: f.transferencias },
        resultado: f.suma,
      })),
    [filasSuma],
  );
  const ultimaSuma = filasSuma.at(-1);
  const alternar = (c: ComponentePosicion) => {
    setSeleccion((s) => ({ ...s, [c]: !s[c] }));
  };

  const anotaciones = useMemo(() => construirAnotaciones(d), [d]);
  const ultimoAnioGrafico = d.deuda.finAno.puntos.at(-1)?.anio ?? 0;
  const letras = 'abcdefgh';
  const filasAnotaciones = anotaciones.map((a, i) => ({
    marca: letras.charAt(i),
    anio: String(a.anio),
    hecho: a.hecho,
    fuente: a.fuente,
  }));
  const marcas = useMemo<AnotacionGrafico[]>(() => {
    const porAnio = new Map<number, string[]>();
    anotaciones.forEach((a, i) => {
      if (a.anio > ultimoAnioGrafico) return;
      porAnio.set(a.anio, [...(porAnio.get(a.anio) ?? []), letras.charAt(i)]);
    });
    return [...porAnio].map(([anio, ls]) => ({ anio, letra: ls.join(' ') }));
  }, [anotaciones, ultimoAnioGrafico]);
  const descensos = aniosConDescenso(d.deuda.finAno.puntos);
  const ultimoDescenso = descensos.at(-1);
  const { primero: primeraDeuda, ultimo: ultimaDeuda } = extremos(d.deuda.finAno.puntos);
  const ultimoTrimestralDeuda = d.deuda.trimestral.puntos.at(-1);

  const fuentesFondoDeuda: Dato[] = [d.valor.dato, d.deuda.finAno.dato];
  const fuentesApoyo: Dato[] = [d.deuda.finAno.dato, d.transferencias.delEstado.dato];
  const fuentesSuma: Dato[] = [d.valor.dato, d.deuda.finAno.dato, d.transferencias.delEstado.dato];

  return (
    <section className="seccion prosa" aria-labelledby="posicion">
      <h2 id="posicion">
        El Fondo, la deuda con el Estado y las transferencias: dos lecturas separadas
      </h2>
      <p className="hist-aviso">
        Construcciones ilustrativas, no cifras oficiales. Ninguna es el déficit de la Seguridad
        Social ni una medida de lo que «debe» o «tiene» el sistema.
      </p>
      <p>
        Los préstamos del Estado, las transferencias del Estado y el Fondo de Reserva no son
        partidas aditivas. Los préstamos son un pasivo a devolver (la deuda, según el Banco de
        España, que atribuye su variación reciente a los préstamos del Estado); las transferencias
        son un flujo no reembolsable; y el Fondo es un activo acumulado, a precio de adquisición.
        Son fuentes distintas con las que se financia el mismo gasto del sistema, y sumarlas como si
        fueran del mismo tipo mezcla un activo, un pasivo y un flujo. Por eso se ofrecen dos
        lecturas separadas, cada una con su definición y su signo.
      </p>

      <h3 id="fondo-menos-deuda">Primera lectura: Fondo menos deuda</h3>
      <Definition termino="Fondo menos deuda (posición neta)">
        Valor del Fondo de Reserva a fin de año menos el saldo a fin de año de la deuda de las
        Administraciones de Seguridad Social (Banco de España). Compara un activo con un pasivo.
        Signo: positivo si el Fondo supera a la deuda; negativo si la deuda supera al Fondo. No es
        un patrimonio neto contable ni una cifra oficial.
      </Definition>
      <div className="bloque-grafico">
        <GraficoPosicion
          titulo="Fondo menos deuda: valor del Fondo de Reserva menos deuda con el Estado, a fin de cada año"
          descripcion="Barras: el Fondo (activo) y la deuda (pasivo) al cierre de cada año. Línea: Fondo menos deuda; por debajo de cero, la deuda supera al Fondo. Unidad: miles de millones de euros."
          componentes={PARTIDAS_NETA.map((c) => componenteGrafico(c, anioInicio))}
          activos={PARTIDAS_NETA}
          filas={filasNetaGrafico}
          etiquetaResultado="Fondo menos deuda"
          columnaResultado="Fondo menos deuda (millones de euros; negativo si la deuda supera al Fondo)"
          fuentes={fuentesFondoDeuda}
          nota="Construcción propia (confianza media), sin equivalente oficial. Resta dos saldos de fin de año: el Fondo a precio de adquisición y la deuda PDE de la Seguridad Social. La tabla recoge los dos saldos y su diferencia con el signo."
        />
        <ComoLeerlo>
          <p>
            {ultimaNeta === undefined
              ? ''
              : `En ${ultimaNeta.anio}, el Fondo (${millonesEuros(ultimaNeta.fondo)}) menos la deuda (${millonesEuros(ultimaNeta.deuda)}) da ${millonesEuros(ultimaNeta.neta)}; un resultado negativo significa que la deuda es mayor que el Fondo.`}
          </p>
          <p>
            Qué es: la diferencia entre un activo y un pasivo, año a año. Qué no es: no es una cifra
            oficial, no es el déficit ni el patrimonio neto de la Seguridad Social, y no dice que el
            Fondo pueda o deba destinarse a devolver la deuda. El Fondo y la deuda se miden en
            criterios distintos (precio de adquisición y valor nominal) y proceden de fuentes
            distintas.
          </p>
        </ComoLeerlo>
      </div>

      <h3 id="apoyo-financiero">
        Segunda lectura: deuda más transferencias acumuladas (apoyo financiero del Estado)
      </h3>
      <Definition termino="Apoyo financiero del Estado (deuda más transferencias acumuladas)">
        Saldo a fin de año de la deuda con el Estado (un pasivo a devolver) más las transferencias
        corrientes del Estado y organismos autónomos acumuladas desde el año de inicio que se elija
        (un flujo no reembolsable). Las dos partidas se muestran juntas pero son de naturaleza
        distinta y se identifican por separado en el gráfico y en la tabla. Signo: siempre positivo
        (suma dos importes positivos). No es una cifra oficial.
      </Definition>
      <SelectorAnioInicio
        etiqueta="Año de inicio de las transferencias acumuladas"
        ayuda="El resultado depende del año en que se empiece a acumular; la deuda es siempre el saldo total de cada año."
        anios={aniosInicio}
        valor={anioInicio}
        onCambio={setAnioInicio}
      />
      <div className="bloque-grafico">
        <GraficoPosicion
          titulo={`Apoyo financiero del Estado: deuda más transferencias acumuladas desde ${anioInicio}`}
          descripcion="Barras: la deuda con el Estado (saldo a fin de año) y las transferencias acumuladas desde el año de inicio, por separado. Línea: su suma. Unidad: miles de millones de euros."
          componentes={PARTIDAS_APOYO.map((c) => componenteGrafico(c, anioInicio))}
          activos={PARTIDAS_APOYO}
          filas={filasApoyoGrafico}
          etiquetaResultado="Deuda más transferencias acumuladas"
          columnaResultado="Deuda más transferencias acumuladas (millones de euros)"
          fuentes={fuentesApoyo}
          nota={
            <>
              Construcción propia (confianza media), sin equivalente oficial. Suma un saldo (deuda
              PDE de la Seguridad Social, que incluye préstamos anteriores al año de inicio) y un
              flujo acumulado (transferencias corrientes del Estado y organismos autónomos desde{' '}
              {anioInicio}). La tabla recoge las dos partidas y su suma.
            </>
          }
        />
        <ComoLeerlo>
          <p>
            {ultimoApoyo === undefined
              ? ''
              : `Con el inicio en ${anioInicio}, en ${ultimoApoyo.anio} la deuda es de ${millonesEuros(ultimoApoyo.deuda)} y las transferencias acumuladas, de ${millonesEuros(ultimoApoyo.transferencias)}; juntas suman ${millonesEuros(ultimoApoyo.apoyo)}.`}
          </p>
          <p>
            Qué es: la deuda con el Estado y las transferencias recibidas desde el año de inicio,
            mostradas juntas pero identificadas por separado: la primera es un pasivo que hay que
            devolver y las segundas son un flujo que no se devuelve. Qué no es: no es la cantidad
            que el Estado haya desembolsado en total (la deuda incluye préstamos anteriores al año
            de inicio y las transferencias empiezan en él), no es una cifra oficial y la suma cambia
            con el año de inicio.
          </p>
        </ComoLeerlo>
      </div>

      <h3 id="suma-conjunta">Opción: suma conjunta del Fondo, la deuda y las transferencias</h3>
      <div className="hucha-controles">
        <label className="hucha-casilla" htmlFor={idSumaConjunta}>
          <input
            id={idSumaConjunta}
            type="checkbox"
            checked={sumaConjunta}
            onChange={() => {
              setSumaConjunta((v) => !v);
            }}
          />
          <span>Mostrar la suma conjunta (opción, desactivada por defecto)</span>
        </label>
      </div>
      {sumaConjunta ? (
        <>
          <p className="hist-aviso">
            Aviso: esta suma junta un activo (el Fondo), un pasivo (la deuda) y un flujo (las
            transferencias acumuladas). Son partidas de naturaleza distinta y no son aditivas: el
            resultado no es una magnitud con significado contable, no es el déficit ni la deuda
            total de la Seguridad Social y no indica qué debería hacerse con ninguno de los
            componentes. Se conserva solo como opción, para ver cuánto cambia la cifra según qué se
            incluya.
          </p>
          <div className="hucha-controles">
            <fieldset className="hucha-casillas">
              <legend>Componentes que entran en la suma</legend>
              {COMPONENTES_POSICION.map((c) => (
                <label key={c} className="hucha-casilla" htmlFor={`${idCasillas}-${c}`}>
                  <input
                    id={`${idCasillas}-${c}`}
                    type="checkbox"
                    checked={seleccion[c]}
                    onChange={() => {
                      alternar(c);
                    }}
                  />
                  <span>
                    {COMPONENTE[c].etiqueta}
                    {ultimaSuma === undefined
                      ? ''
                      : `: ${millonesEuros(ultimaSuma[c])} en ${ultimaSuma.anio}`}
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="bloque-grafico">
            <GraficoPosicion
              titulo="Suma conjunta, no aditiva: Fondo de Reserva, deuda con el Estado y transferencias acumuladas"
              descripcion="Barras: cada componente al cierre de cada año (las transferencias, acumuladas desde el año de inicio). Línea: suma de los componentes marcados. Unidad: miles de millones de euros."
              componentes={COMPONENTES_POSICION.map((c) => componenteGrafico(c, anioInicio))}
              activos={COMPONENTES_POSICION.filter((c) => seleccion[c])}
              filas={filasSumaGrafico}
              etiquetaResultado="Suma de los seleccionados"
              columnaResultado="Suma de los componentes seleccionados (millones de euros)"
              fuentes={fuentesSuma}
              nota={
                <>
                  Construcción propia (confianza media), sin equivalente oficial. Combina dos saldos
                  de fin de año (Fondo a precio de adquisición y deuda PDE de la Seguridad Social)
                  con un flujo acumulado (transferencias corrientes del Estado y organismos
                  autónomos desde {anioInicio}); las partidas no son aditivas. La tabla de datos
                  recoge los tres componentes siempre; la suma, solo los marcados.
                </>
              }
            />
            <ComoLeerlo>
              <p>
                {ultimaSuma === undefined || ultimaSuma.suma === null
                  ? 'Con ningún componente marcado, la línea no se dibuja.'
                  : `Con los componentes marcados y el inicio en ${anioInicio}, la suma de ${ultimaSuma.anio} es de ${millonesEuros(ultimaSuma.suma)}.`}
              </p>
              <p>
                Qué es la línea: la suma, año a año, de los componentes que se marquen, tomados de
                los ficheros de origen. Qué no es: no es una cifra oficial, no es el déficit ni la
                deuda total de la Seguridad Social, no mide el coste de las pensiones y no es una
                magnitud aditiva en sentido contable: suma un activo, un pasivo y un flujo. Depende
                del año de inicio y de qué componentes se incluyan.
              </p>
            </ComoLeerlo>
          </div>
        </>
      ) : null}

      <h3 id="deuda-serie">La deuda con el Estado y los hechos que cambian su lectura</h3>
      <p>
        La serie del Banco de España es la deuda PDE de las Administraciones de Seguridad Social: no
        desglosa por acreedor, pero el propio Banco atribuye su variación reciente a los préstamos
        concedidos por el Estado. Las anotaciones recogen hechos con fuente que cambian cómo leer la
        deuda y las transferencias acumuladas.
      </p>
      <GraficoSeries
        titulo="Deuda PDE de las Administraciones de Seguridad Social, saldo a fin de año"
        descripcion="Saldo al cierre de cada año de la deuda según el Protocolo de Déficit Excesivo. Las letras remiten a la tabla de anotaciones. Unidad: miles de millones de euros."
        series={[
          {
            clave: 'deuda',
            etiqueta: 'Deuda PDE de la Seguridad Social',
            puntos: d.deuda.finAno.puntos,
          },
        ]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        incluirCero
        anotaciones={marcas}
        fuentes={[d.deuda.finAno.dato, ...anotaciones.map((a) => a.dato)]}
        nota="El saldo es la deuda del subsector Seguridad Social, no consolidada con la de otros subsectores; no desglosa el acreedor. El Banco de España y el Tribunal de Cuentas miden conceptos próximos pero no idénticos (deuda PDE a valor nominal frente a endeudamiento frente al Estado en las cuentas de la Seguridad Social)."
        comoLeerlo={
          <>
            <p>
              El saldo pasa de {millonesEuros(primeraDeuda.valor)} en {primeraDeuda.anio} a{' '}
              {millonesEuros(ultimaDeuda.valor)} en {ultimaDeuda.anio}
              {ultimoTrimestralDeuda === undefined
                ? ''
                : `; el último trimestre disponible (${ultimoTrimestralDeuda.anio}, trimestre ${ultimoTrimestralDeuda.trimestre}) es de ${millonesEuros(ultimoTrimestralDeuda.valor)}`}
              .
              {ultimoDescenso === undefined
                ? ' El saldo de cierre de año no baja en ningún año de la serie.'
                : ` El último año en que el saldo de cierre baja respecto al anterior es ${ultimoDescenso}; desde entonces no baja ningún año.`}
            </p>
            <p>
              La serie no distingue si una variación se debe a nuevos préstamos, a amortizaciones, a
              cancelaciones o a conversiones en transferencia. En las fuentes descargadas no consta
              ninguna cancelación ni conversión de los préstamos recientes; constan una
              recomendación del Tribunal de Cuentas y la ampliación de plazo de préstamos antiguos
              (véanse las anotaciones).
            </p>
          </>
        }
      />
      <div className="hist-definiciones">
        <DataTable
          titulo="Anotaciones de la serie de deuda"
          columnas={[
            { clave: 'marca', titulo: 'Marca' },
            { clave: 'anio', titulo: 'Año' },
            { clave: 'hecho', titulo: 'Hecho' },
            { clave: 'fuente', titulo: 'Fuente' },
          ]}
          filas={filasAnotaciones}
        />
        <SourceLine datos={anotaciones.map((a) => a.dato)} />
      </div>
    </section>
  );
}
