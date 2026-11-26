import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { seleccionarPaises, valorEnAnio } from '../../engine/comparativa-internacional';
import { formatearDuracion } from '../../engine/formato';
import { aniosOcde, serieOcde, valoresOcde } from './consultas';
import { cifraSuelta, datosSistemas } from './datos-sistemas';
import { DefinicionesSistemas } from './DefinicionSistemas';
import { GraficoBarrasPaises, GraficoLineasPaises } from './GraficoPaises';
import { CONTRASTE, MEDIDA } from './ids-datos';
import { CODIGOS_PAISES, CODIGO_ESPANA } from './paises';
import { APARTADOS } from './apartados';

type Sexo = 'hombres' | 'mujeres';

/** Edad de jubilación: edad normal (actual y futura) y edad efectiva de salida de la OCDE. */
export function SeccionEdad({ seleccion }: { readonly seleccion: ReadonlySet<string> }) {
  const d = datosSistemas();
  const [sexo, setSexo] = useState<Sexo>('hombres');
  const anio = aniosOcde(d.ocde.observaciones, { medida: MEDIDA.edadActual }).at(-1) ?? 0;

  const { actual, futura } = useMemo(() => {
    const valores = (medida: string) =>
      seleccionarPaises(
        valoresOcde(d.ocde.observaciones, { medida, sexo }, anio, CODIGOS_PAISES),
        seleccion,
      );
    return { actual: valores(MEDIDA.edadActual), futura: valores(MEDIDA.edadFutura) };
  }, [d, sexo, anio, seleccion]);
  const referencia = (medida: string) =>
    valorEnAnio(serieOcde(d.ocde.observaciones, { medida, sexo }, CODIGO_ESPANA), anio);

  const salida = useMemo(
    () =>
      seleccionarPaises(
        CODIGOS_PAISES.map((pais) => ({
          pais,
          puntos: serieOcde(d.ocde.observaciones, { medida: MEDIDA.edadSalida, sexo }, pais),
        })),
        seleccion,
      ),
    [d, sexo, seleccion],
  );

  const anioSalida = aniosOcde(d.ocde.observaciones, { medida: MEDIDA.edadSalida, sexo }).at(-1);
  const datoActual = d.ocde.datoMedida(String(anio), MEDIDA.edadActual);
  const datoFutura = d.ocde.datoMedida(String(anio), MEDIDA.edadFutura);
  const datoSalida = d.ocde.datoMedida(String(anioSalida ?? anio), MEDIDA.edadSalida);
  const edadOcde = cifraSuelta(CONTRASTE.edadOcde);
  const edadPropia = cifraSuelta(CONTRASTE.edadPropia);
  const carrera65 = cifraSuelta(CONTRASTE.carrera65);
  const carreraCompleta = cifraSuelta(CONTRASTE.carreraCompleta);

  return (
    <section
      className="seccion prosa sistemas-seccion ancho-completo"
      aria-labelledby={APARTADOS.edad.destino}
    >
      <h2 id={APARTADOS.edad.destino} tabIndex={-1}>
        {APARTADOS.edad.titulo}
      </h2>
      <p>
        Esta sección muestra tres edades distintas: la edad normal de jubilación que modela la OCDE
        para una carrera sin interrupciones, en su versión actual y en la futura, y la edad efectiva
        de salida del mercado laboral, que es una medida estadística de la OCDE y no una edad fijada
        por una norma. Cada una se define debajo. Al final se contrasta la edad de España en la OCDE
        con la de su propia normativa.
      </p>
      <DefinicionesSistemas
        ids={['edad-normal-de-jubilacion-ocde', 'edad-efectiva-de-salida-del-mercado-laboral-ocde']}
      />
      <div className="sistemas-controles">
        <SegmentedPills<Sexo>
          leyenda="Sexo (las edades legales de algunos países difieren entre hombres y mujeres)"
          opciones={[
            { valor: 'hombres', etiqueta: 'Hombres' },
            { valor: 'mujeres', etiqueta: 'Mujeres' },
          ]}
          valor={sexo}
          onCambio={setSexo}
        />
      </div>

      <div className="paneles-dos">
        <GraficoBarrasPaises
          titulo={`Edad normal de jubilación actual con carrera completa, según la OCDE, ${anio}`}
          descripcion="Años."
          unidadEje="años"
          decimales={1}
          valores={actual}
          valorEspana={referencia(MEDIDA.edadActual)}
          tituloDiferencia="Diferencia con España (años)"
          fuentes={datoActual}
          comoLeerlo={
            <>
              <p>
                Cada barra es la edad a la que, con las reglas del año indicado, esa persona modelo
                accede a todos los componentes obligatorios del sistema. El orden es de mayor a
                menor edad.
              </p>
              <p>
                No es la edad ordinaria de la normativa de cada país ni la edad a la que se jubila
                la gente: es una edad modelo. En países con edades distintas según el sexo, cambia
                con el selector.
              </p>
            </>
          }
        />
        <GraficoBarrasPaises
          titulo={`Edad de jubilación futura con carrera completa, según la OCDE, ${anio}`}
          descripcion="Años."
          unidadEje="años"
          decimales={1}
          valores={futura}
          valorEspana={referencia(MEDIDA.edadFutura)}
          tituloDiferencia="Diferencia con España (años)"
          fuentes={datoFutura}
          comoLeerlo={
            <>
              <p>
                Cada barra es la edad de jubilación que, según la OCDE, corresponde a quien entra en
                el mercado laboral en el año indicado, con las reglas ya legisladas. El orden es de
                mayor a menor edad.
              </p>
              <p>
                Depende de lo que cada país tenga legislado y del cálculo de la OCDE; no es una
                predicción de la edad real de salida.
              </p>
            </>
          }
        />
      </div>

      <GraficoLineasPaises
        titulo="Edad efectiva de salida del mercado laboral, según la OCDE"
        descripcion="Años."
        unidadEje="años"
        decimales={1}
        series={salida}
        fuentes={datoSalida}
        comoLeerlo={
          <>
            <p>
              Cada línea es la edad media a la que las personas trabajadoras de edad avanzada salen
              de la población activa, año a año. Se refiere a la salida de la población activa: no
              es la edad a la que se empieza a cobrar una pensión ni una edad legal.
            </p>
            <p>
              No se compara con la edad normal de jubilación para atribuir una causa a la
              diferencia: los datos consultados no detallan las vías de salida de cada país. La
              fuente advierte de que las cifras absolutas de un país deben interpretarse con
              cautela.
            </p>
          </>
        }
      />

      <h3 id="edad-espana">España: la edad de la OCDE y la de la normativa propia</h3>
      <p>
        Las dos cifras de España responden a definiciones distintas y no se contradicen: la OCDE
        modela una carrera ininterrumpida desde el comienzo de la vida laboral; la norma española
        fija la edad ordinaria según los meses cotizados.
      </p>
      <div className="sistemas-tabla">
        <DataTable
          titulo="Edad de jubilación de España según la OCDE y según la normativa propia"
          columnas={[
            { clave: 'concepto', titulo: 'Concepto' },
            { clave: 'valor', titulo: 'Valor' },
          ]}
          filas={[
            {
              concepto:
                'Edad de jubilación actual con carrera completa desde el comienzo de la vida laboral (OCDE, hombres)',
              valor: `${String(edadOcde.valor)} ${edadOcde.unidad}`,
            },
            {
              concepto:
                'Edad ordinaria de la normativa española, para quien no alcanza los meses cotizados que dan acceso a la edad menor',
              valor: formatearDuracion(edadPropia.valor),
            },
            {
              concepto: 'Cotización que permite jubilarse a la edad menor de la normativa',
              valor: formatearDuracion(carrera65.valor),
            },
            {
              concepto:
                'Carrera ininterrumpida desde el comienzo de la vida laboral hasta la edad menor (cálculo derivado)',
              valor: formatearDuracion(carreraCompleta.valor),
            },
          ]}
        />
        <SourceLine
          datos={[edadOcde.dato, edadPropia.dato, carrera65.dato, carreraCompleta.dato]}
          titulo="Edad de jubilación de España según la OCDE y según la normativa propia"
        />
      </div>
      <DefinicionesSistemas ids={['carrera-ininterrumpida-hasta-la-edad-menor']} />
    </section>
  );
}
