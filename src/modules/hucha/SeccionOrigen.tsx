import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { datosFinanciacion } from '../historico/datos-financiacion';
import { datosHucha } from '../historico/datos-hucha';
import { millonesEuros } from '../historico/formatos';
import { ID } from './ids-datos';
import { rangoDeId } from './rango';

type FilaClasificacion = {
  clasificacion: string;
  periodo: string;
  importe: number;
  fuente: string;
};

/** Texto de un dato suelto (para las citas literales). */
const texto = (v: number | string): string => (typeof v === 'string' ? v : String(v));

/** Suma de los valores de una serie anual entre dos años, ambos incluidos. */
function sumaEntre(
  puntos: readonly { anio: number; valor: number }[],
  desde: number,
  hasta: number,
): number {
  return puntos.filter((p) => p.anio >= desde && p.anio <= hasta).reduce((a, p) => a + p.valor, 0);
}

/**
 * «De dónde procede el dinero»: qué son las transferencias, los préstamos del Estado y los gastos
 * impropios, cada afirmación con su fuente, y una tabla que muestra cuánto cambia la cifra según la
 * clasificación. No elige una clasificación como la correcta.
 */
export function SeccionOrigen() {
  const d = datosHucha();
  const f = datosFinanciacion();
  const { tribunal: tc, trlgss } = d;
  const cifra = (id: string): number => {
    const v = tc[id]?.valor;
    if (typeof v !== 'number') throw new Error(`Falta la cifra «${id}» del Tribunal de Cuentas`);
    return v;
  };
  const cita = (id: string): string => texto(tc[id]?.valor ?? '');
  const impropiosPrevistos = f.previsiones.find((p) => p.id === ID.gastosImpropiosPrevistos);
  const enumeracionImpropios =
    /«Gastos impropios» es la expresión de la fuente: (.*?)\. Fuente secundaria/.exec(
      impropiosPrevistos?.notas ?? '',
    )?.[1];

  const filas = ((): FilaClasificacion[] => {
    const [desde, hasta] = rangoDeId(ID.tcTransferenciasTotal);
    const [desdePrestamos, hastaPrestamos] = rangoDeId(ID.tcPrestamosConcedidos);
    const periodo = `${desde}-${hasta}`;
    const periodoPrestamos = `${desdePrestamos}-${hastaPrestamos}`;
    return [
      {
        clasificacion: 'Transferencias corrientes del Estado y organismos autónomos (ejecución)',
        periodo,
        importe: sumaEntre(d.transferencias.delEstado.puntos, desde, hasta),
        fuente:
          'Seguridad Social, ejecución del presupuesto: derechos reconocidos de ingresos por transferencias corrientes del Estado y organismos autónomos',
      },
      {
        clasificacion:
          'Total de transferencias corrientes recibidas, de cualquier origen (ejecución)',
        periodo,
        importe: sumaEntre(d.transferencias.totalCorrientes.puntos, desde, hasta),
        fuente:
          'Seguridad Social, ejecución del presupuesto: incluye también las de comunidades autónomas, empresas privadas y otros orígenes',
      },
      {
        clasificacion: 'Transferencias corrientes aportadas por el Estado (Tribunal de Cuentas)',
        periodo,
        importe: cifra(ID.tcTransferenciasTotal),
        fuente:
          'Tribunal de Cuentas, Declaración sobre la Cuenta General del Estado: apoyo al equilibrio presupuestario y costes que el Informe del Pacto de Toledo considera ajenos al ámbito de la Seguridad Social',
      },
      {
        clasificacion:
          'Pasivos financieros de ingresos, que incluyen los préstamos del Estado (ejecución)',
        periodo: periodoPrestamos,
        importe: sumaEntre(
          d.transferencias.pasivosFinancieros.puntos,
          desdePrestamos,
          hastaPrestamos,
        ),
        fuente:
          'Seguridad Social, ejecución del presupuesto: operaciones financieras, no transferencias',
      },
      {
        clasificacion: 'Préstamos concedidos por el Estado a la Tesorería (Tribunal de Cuentas)',
        periodo: periodoPrestamos,
        importe: cifra(ID.tcPrestamosConcedidos),
        fuente:
          'Tribunal de Cuentas, Declaración sobre la Cuenta General del Estado: préstamos a largo plazo del Estado a la Tesorería',
      },
    ];
  })();

  const datosFuente: Dato[] = [
    d.transferencias.delEstado.dato,
    d.tribunal[ID.tcTransferenciasTotal]?.dato,
    trlgss['aportaciones-estado-presupuestos']?.dato,
    trlgss['no-contributiva-aportaciones-estado']?.dato,
    trlgss['naturaleza-no-contributiva-minimos']?.dato,
    d.tribunal['origen-prestamos-gestion-ordinaria']?.dato,
    d.tribunal['definicion-costes-impropios-pacto-toledo']?.dato,
    d.tribunal['condiciones-prestamos-recientes']?.dato,
    impropiosPrevistos?.dato,
  ].filter((x): x is Dato => x !== undefined);

  return (
    <section className="seccion prosa" aria-labelledby="origen">
      <h2 id="origen">De dónde procede el dinero: transferencias, préstamos y gastos impropios</h2>
      <p>
        Tres expresiones aparecen juntas en este debate y designan cosas distintas. Las fuentes las
        clasifican de formas diferentes y esta página recoge lo que dice cada una, sin elegir una
        clasificación como la correcta.
      </p>
      <dl className="hucha-definiciones">
        <div>
          <dt>Transferencias del Estado a la Seguridad Social</dt>
          <dd>
            <p>
              El texto refundido de la Ley General de la Seguridad Social cuenta entre los recursos
              del sistema «{texto(trlgss['aportaciones-estado-presupuestos']?.valor ?? '')}»
              (artículo de recursos generales). Dispone también que «
              {texto(trlgss['no-contributiva-aportaciones-estado']?.valor ?? '')}», y clasifica
              entre las prestaciones no contributivas, entre otras, los complementos por mínimos de
              las pensiones.
            </p>
            <p>
              En la ejecución del presupuesto de la Seguridad Social figuran como ingresos por
              transferencias corrientes, distinguidas por el organismo de origen.
            </p>
          </dd>
        </div>
        <div>
          <dt>Préstamos del Estado a la Seguridad Social</dt>
          <dd>
            <p>
              El Tribunal de Cuentas describe que «{cita('origen-prestamos-gestion-ordinaria')}».
              Sobre sus condiciones, indica que «{cita('condiciones-prestamos-recientes')}».
            </p>
            <p>
              No son transferencias: en la ejecución del presupuesto se contabilizan como pasivos
              financieros y el Banco de España los recoge en la deuda de la Seguridad Social, sin
              efecto en la deuda del conjunto de las Administraciones Públicas por ser operaciones
              entre subsectores.
            </p>
          </dd>
        </div>
        <div>
          <dt>Gastos impropios</dt>
          <dd>
            <p>
              No hay una definición única en las fuentes descargadas. El Tribunal de Cuentas recoge,
              del Informe de Evaluación y Reforma del Pacto de Toledo, la constatación de que «
              {cita('definicion-costes-impropios-pacto-toledo')}».
              {enumeracionImpropios === undefined
                ? ''
                : ` La Revista de la Seguridad Social (fuente secundaria, confianza media) emplea la expresión para: ${enumeracionImpropios}.`}
            </p>
          </dd>
        </div>
      </dl>

      <h3 id="origen-tabla">Cuánto cambia la cifra según la clasificación</h3>
      <p>
        La tabla pone, para el mismo periodo, las cifras de la ejecución del presupuesto y las del
        Tribunal de Cuentas. No coinciden, porque cada fuente delimita las partidas de un modo. Con
        los datos descargados no se puede conciliar una cifra con otra partida a partida.
      </p>
      <div className="hist-definiciones">
        <DataTable
          titulo="Importes del mismo periodo según la clasificación de cada fuente"
          columnas={[
            { clave: 'clasificacion', titulo: 'Clasificación' },
            { clave: 'periodo', titulo: 'Periodo' },
            {
              clave: 'importe',
              titulo: 'Importe (millones de euros)',
              tipo: 'numero',
              decimales: 0,
            },
            { clave: 'fuente', titulo: 'Qué recoge, según la fuente' },
          ]}
          filas={filas}
        />
        <SourceLine datos={datosFuente} />
      </div>
      <p className="hucha-pie">
        Cifras del Tribunal de Cuentas para el último año de su periodo: aportaciones del Estado de
        naturaleza no contributiva de {millonesEuros(cifra(ID.tcAportacionesNoContributivas))},
        citadas por el Tribunal «además» de las transferencias de la fila correspondiente.
      </p>
    </section>
  );
}
