import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { seleccionarPaises, valorEnAnio } from '../../engine/comparativa-internacional';
import { formatearDuracion } from '../../engine/formato';
import { aniosOcde, serieOcde, valoresOcde } from './consultas';
import { cifraSuelta, datosSistemas } from './datos-sistemas';
import { GraficoBarrasPaises, GraficoLineasPaises } from './GraficoPaises';
import { CONTRASTE, MEDIDA, SUPUESTO_DEFINICION } from './ids-datos';
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

  const datoOcde = d.ocde.dato(String(anio));
  const edadOcde = cifraSuelta(CONTRASTE.edadOcde);
  const edadPropia = cifraSuelta(CONTRASTE.edadPropia);
  const carrera65 = cifraSuelta(CONTRASTE.carrera65);
  const carreraCompleta = cifraSuelta(CONTRASTE.carreraCompleta);
  const definicionNormal = d.supuesto(SUPUESTO_DEFINICION.edadNormal);
  const definicionEfectiva = d.supuesto(SUPUESTO_DEFINICION.edadEfectiva);

  return (
    <section
      className="seccion prosa sistemas-seccion ancho-completo"
      aria-labelledby={APARTADOS.edad.destino}
    >
      <h2 id={APARTADOS.edad.destino} tabIndex={-1}>
        {APARTADOS.edad.titulo}
      </h2>
      <p>
        Hay al menos tres edades distintas que suelen llamarse «edad de jubilación»: la que fija la
        norma de cada país, la que modela la OCDE para una carrera sin interrupciones y la edad a la
        que la gente deja de trabajar en la práctica. Aquí se muestran las de la OCDE, cada una con
        su definición, y se contrasta la de España con la de su propia normativa.
      </p>
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
          descripcion={`Años. Medida «${d.ocde.literalMedida(MEDIDA.edadActual)}».`}
          unidadEje="años"
          decimales={1}
          valores={actual}
          valorEspana={referencia(MEDIDA.edadActual)}
          tituloDiferencia="Diferencia con España (años)"
          fuentes={datoOcde}
          nota={<>Definición de la OCDE: {String(definicionNormal.valor)}</>}
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
          descripcion={`Años. Medida «${d.ocde.literalMedida(MEDIDA.edadFutura)}».`}
          unidadEje="años"
          decimales={1}
          valores={futura}
          valorEspana={referencia(MEDIDA.edadFutura)}
          tituloDiferencia="Diferencia con España (años)"
          fuentes={datoOcde}
          nota={<>Definición de la OCDE de la edad normal: {String(definicionNormal.valor)}</>}
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
        descripcion={`Años. Medida «${d.ocde.literalMedida(MEDIDA.edadSalida)}».`}
        unidadEje="años"
        decimales={1}
        series={salida}
        fuentes={datoOcde}
        nota={<>Definición de la OCDE: {String(definicionEfectiva.valor)}</>}
        comoLeerlo={
          <>
            <p>
              Cada línea es la edad media a la que los trabajadores de edad avanzada dejan de formar
              parte de la población activa, año a año. No es la edad a la que se empieza a cobrar la
              pensión ni la edad legal.
            </p>
            <p>
              Puede ser menor o mayor que la edad normal de jubilación; la diferencia depende de las
              vías de salida del mercado laboral de cada país (jubilación anticipada, incapacidad,
              desempleo o trabajo después de la edad normal), que esta medida no distingue.
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
    </section>
  );
}
