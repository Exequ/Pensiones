import { useId, useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { extremos } from '../../engine/series-historicas';
import {
  aniosConDescenso,
  COMPONENTES_POSICION,
  posicionIlustrativa,
  type ComponentePosicion,
  type SeleccionPosicion,
} from '../../engine/transferencias';
import { datosHucha, type DatoCargado, type DatosHucha } from '../historico/datos-hucha';
import { GraficoSeries, type AnotacionGrafico } from '../historico/GraficoSeries';
import { millonesEuros } from '../historico/formatos';
import { COMPONENTE } from './componentes';
import { GraficoPosicion } from './GraficoPosicion';
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

/**
 * «c. Construcción ilustrativa de posición»: barras con el Fondo, la deuda con el Estado y las
 * transferencias acumuladas, y una línea con la suma de los componentes que se marquen. Se
 * presenta siempre como construcción ilustrativa, no como cifra oficial. Incluye la serie de la
 * deuda con las anotaciones de los hechos que cambian su lectura.
 */
export function SeccionPosicion() {
  const d = datosHucha();
  const idCasillas = useId();
  const [anioInicio, setAnioInicio] = useState(d.transferencias.delEstado.puntos[0]?.anio ?? 0);
  const [seleccion, setSeleccion] = useState<SeleccionPosicion>(TODOS);

  const anuales = d.transferencias.delEstado.puntos;
  const aniosInicio = anuales.map((p) => p.anio);
  const filas = useMemo(
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
  const ultima = filas.at(-1);
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

  const datosFuente: Dato[] = [d.valor.dato, d.deuda.finAno.dato, d.transferencias.delEstado.dato];

  return (
    <section className="seccion prosa" aria-labelledby="posicion">
      <h2 id="posicion">
        Una construcción ilustrativa: el Fondo, la deuda con el Estado y las transferencias
      </h2>
      <p className="hist-aviso">
        Construcción ilustrativa, no una cifra oficial. No es el déficit de la Seguridad Social ni
        una medida de lo que «debe» o «tiene» el sistema.
      </p>
      <p>
        El gráfico sitúa juntos tres componentes de naturaleza distinta: el valor del Fondo de
        Reserva a fin de año (un saldo, a precio de adquisición), el saldo a fin de año de la deuda
        de las Administraciones de Seguridad Social según el Banco de España, que esa institución
        atribuye a los préstamos del Estado (otro saldo), y las transferencias corrientes del Estado
        acumuladas desde el año de inicio que se elija (un flujo acumulado). La línea es la suma de
        los componentes marcados. El resultado cambia con el año de inicio y con los componentes que
        se incluyan.
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
                {ultima === undefined ? '' : `: ${millonesEuros(ultima[c])} en ${ultima.anio}`}
              </span>
            </label>
          ))}
        </fieldset>
        <SelectorAnioInicio
          etiqueta="Año de inicio de las transferencias acumuladas"
          anios={aniosInicio}
          valor={anioInicio}
          onCambio={setAnioInicio}
        />
      </div>

      <div className="bloque-grafico">
        <GraficoPosicion
          titulo="Construcción ilustrativa, no una cifra oficial: Fondo de Reserva, deuda con el Estado y transferencias acumuladas"
          descripcion="Barras: cada componente al cierre de cada año (las transferencias, acumuladas desde el año de inicio). Línea: suma de los componentes marcados. Unidad: miles de millones de euros."
          filas={filas}
          seleccion={seleccion}
          anioInicio={anioInicio}
          fuentes={datosFuente}
          nota={
            <>
              Construcción propia (confianza media), sin equivalente oficial. Combina dos saldos de
              fin de año (Fondo a precio de adquisición y deuda PDE de la Seguridad Social) con un
              flujo acumulado (transferencias corrientes del Estado y organismos autónomos desde{' '}
              {anioInicio}). La tabla de datos recoge los tres componentes siempre; la suma, solo
              los marcados.
            </>
          }
        />
        <div className="como-leerlo">
          <p className="como-leerlo-etiqueta">Cómo leerlo</p>
          <div className="como-leerlo-texto">
            <p>
              {ultima === undefined || ultima.suma === null
                ? 'Con ningún componente marcado, la línea no se dibuja.'
                : `Con los componentes marcados y el inicio en ${anioInicio}, la suma de ${ultima.anio} es de ${millonesEuros(ultima.suma)}.`}
            </p>
            <p>
              Qué es la línea: la suma, año a año, de los componentes que se marquen, tomados de los
              ficheros de origen. Qué no es: no es una cifra oficial, no es el déficit ni la deuda
              total de la Seguridad Social, no mide el coste de las pensiones y no indica qué
              debería hacerse con ninguno de los componentes.
            </p>
            <p>
              Suma dos saldos y un flujo acumulado, magnitudes de naturaleza distinta, y las
              partidas pueden estar relacionadas entre sí (por ejemplo, los préstamos y las
              transferencias financian gasto del mismo sistema). Por eso la suma no es una magnitud
              aditiva en sentido contable. Depende del año de inicio (con otro año, la parte de
              transferencias cambia) y de qué componentes se incluyan.
            </p>
          </div>
        </div>
      </div>

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
