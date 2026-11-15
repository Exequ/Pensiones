import type { DatosFinanciero } from './datos-financiero';
import { ComoFunciona, ListaVariables } from './Comunes';
import { MODELO } from './ids-datos';
import { COL4 } from './ids-financiero';

/**
 * «Cómo funciona este modelo» de M4, redactado a partir de `docs/modelos/M4_descripcion.md` sin
 * cifras y sin las valoraciones de esa descripción: donde esta dice «aviso de tensión», «más caro» o
 * «se agotaría», aquí se describe qué ocurre con los supuestos del modelo, sin juzgarlo.
 */
export function FinancieroComoFunciona({ d }: { d: DatosFinanciero }) {
  return (
    <ComoFunciona>
      <p>
        <strong>Qué responde.</strong> Calcula cuánto gastarían las pensiones contributivas, cuánto
        ingresaría el sistema y qué saldo resultaría con la legislación actual congelada, y cómo
        evoluciona el Fondo de Reserva cuando se usa para cubrir el saldo negativo. Junta los
        modelos anteriores: el número de pensiones ({MODELO.m3}), los cotizantes y las bases de
        cotización ({MODELO.m2}) y la población ({MODELO.m1}).
      </p>
      <p>
        <strong>Cómo funciona.</strong> El gasto en pensiones es el número de pensiones de cada
        clase (jubilación, viudedad, incapacidad, orfandad y en favor de familiares) por la pensión
        media, por catorce pagas y por un factor de calibración (devengo) de cada clase, que se
        obtiene con el cociente del último año observado y se mantiene constante; su valor,
        calculado con los datos descargados, está en el apartado «Del número de pensiones al gasto».
        La descripción atribuye la diferencia a los complementos a mínimos, que el presupuesto
        contabiliza aparte, y al desfase entre contar las pensiones a una fecha del año y su
        promedio anual; es una hipótesis de su autor, no verificada contra la metodología de la
        fuente, y esta página no la afirma. Lo que sí consta en los datos es que los complementos a
        mínimos no están en la suma de pensiones de la ejecución y sí en el resto de gastos del año
        base, que en el modelo evoluciona con el PIB y no con el número de pensiones. Cada año todas
        las pensiones se revalorizan con el IPC; salen las bajas y entran las altas con una pensión
        algo mayor, porque quienes se jubilan han cotizado más y mejor que quienes fallecen. Por
        eso, en el modelo, la pensión media crece algo más que los precios. En la versión actual, la
        pensión de las altas de jubilación sigue además las reglas de cálculo del modelo {MODELO.m5}
        : la opción de años de cotización de la etapa transitoria, los topes de base y de pensión
        máxima y la actualización de las bases con los precios.
      </p>
      <p>
        Los ingresos son las cotizaciones más las transferencias del Estado y otros ingresos. Las
        cotizaciones incluyen el MEI, que en el presupuesto es una partida de las cotizaciones
        sociales: las cotizaciones sin el MEI del año base se escalan con la masa de bases de{' '}
        {MODELO.m2}, y el MEI se calcula aparte con su tipo legal (que crece durante unos años y se
        mantiene hasta el último año de su vigencia en el modelo) sobre esa misma base. La columna
        del MEI es un desglose de las cotizaciones, no un ingreso adicional. El saldo es la
        diferencia entre los ingresos y los gastos: gasto en pensiones y resto de gastos (bajas por
        enfermedad, maternidad, complementos a mínimos, pensiones no contributivas, Ingreso Mínimo
        Vital, personal y otros). Se muestran tres medidas: cotizaciones menos pensiones, saldo sin
        transferencias (cotizaciones menos gasto en pensiones menos resto de gastos, es decir, sin
        las transferencias del Estado ni otros ingresos) y saldo no financiero (con todo).
      </p>
      <p>
        El Fondo de Reserva se nutre del MEI (la dotación es una proporción constante del MEI).
        Parte de un valor a precio de adquisición al inicio y crece con una rentabilidad nominal
        constante supuesta, más la dotación y menos la disposición; no es valor de mercado. A partir
        del primer año en que la ley lo permite puede cubrir déficit con un límite anual en
        porcentaje del PIB; lo que no cubre aparece como financiación adicional. El modelo se
        calibra con la ejecución presupuestaria del último año observado: reproduce el gasto en
        pensiones por clase y el saldo de ese año.
      </p>
      <p>
        <strong>Datos de entrada.</strong> La ejecución presupuestaria de la Seguridad Social, las
        pensiones en vigor, las altas y las bajas, el Fondo de Reserva, los parámetros del MEI y del
        límite de disposición del Fondo, el PIB del INE y, para contrastar, el Ageing Report. Entran
        además las salidas de {MODELO.m1}, {MODELO.m2} y {MODELO.m3}.
      </p>
      <p>
        <strong>Variables principales.</strong> Para cada año, el gasto en pensiones, las
        cotizaciones, el MEI, los saldos (en euros y en porcentaje del PIB), la dotación, la
        disposición y el valor del Fondo, la financiación adicional y los afiliados por pensión:
      </p>
      <ListaVariables columnas={d.m4.archivo.columnas.filter((c) => c.id !== COL4.escenario)} />
      <p>
        <strong>Cómo leer los resultados.</strong> «Con legislación actual congelada» no es una
        predicción: describe qué resultaría si no hubiera reformas y la economía siguiera las
        hipótesis elegidas. El resultado de los saldos es el que se obtiene con esos supuestos, y
        cambia si cambian. Las cifras en euros son corrientes, con la inflación supuesta; las
        comparaciones entre años se leen mejor en porcentaje del PIB, teniendo en cuenta que el PIB
        de este modelo es un indicador aproximado: afiliados por salario nominal, no una previsión
        macroeconómica.
      </p>
      <p>
        <strong>Qué se puede cambiar en el código para hacer pruebas.</strong> El crecimiento real
        de los salarios y el IPC; la revalorización, en puntos sobre el IPC; una cotización
        adicional, en puntos, que llega de forma gradual; un factor sobre la pensión de las altas y
        la proporción de altas de jubilación con carrera de salarios altos que llega a la pensión
        máxima; el enlace con {MODELO.m5}, que puede desactivarse para volver a la versión anterior;
        las palancas de demografía ({MODELO.m1}) y de empleo ({MODELO.m2}), como la migración, la
        fecundidad, la convergencia del empleo de las mujeres o el empleo en las edades altas; las
        transferencias del Estado como porcentaje del PIB, la rentabilidad del Fondo y si el Fondo
        se usa o no. Están en el código del modelo; esta página muestra el escenario de referencia y
        otros cuatro que cambian solo el crecimiento real de los salarios o el IPC, ya calculados.
      </p>
      <p>
        <strong>Fiabilidad.</strong> La fiabilidad de esta salida se considera media: el modelo
        hereda la incertidumbre de {MODELO.m2} (cotizantes y bases, fiabilidad baja), de {MODELO.m1}{' '}
        y de {MODELO.m3}. La calibración con el último año observado asegura el punto de partida, no
        la trayectoria.
      </p>
      <p>
        <strong>Qué no hace.</strong> Mantiene la legislación congelada, sin reformas futuras. Los
        autónomos solo entran dentro de los totales. No incluye ciclo económico. El resto de gastos
        y las transferencias del Estado evolucionan con el PIB, sin depender de la demografía. La
        pensión de las altas sigue a {MODELO.m5} solo para dos perfiles de carrera (uno central y
        uno con salarios altos), no para la distribución real de salarios de quienes se jubilan, y{' '}
        {MODELO.m5} no reproduce la caída de la tasa de reposición que supone el Ageing Report. El
        MEI se incluye solo hasta el último año de su vigencia en el modelo, el factor de
        calibración de cada clase se mantiene constante, el Fondo parte de un valor a precio de
        adquisición y crece con una rentabilidad constante, y el modelo no calcula más allá del
        último año de la salida.
      </p>
      <p>
        <strong>Comprobaciones y pendientes.</strong> La descripción del modelo recoge un contraste
        con el Ageing Report: en índice con el primer año proyectado igual a cien, el gasto sobre el
        PIB de {MODELO.m4} crece más que el del Ageing Report. Para esa diferencia cita dos
        candidatos que no se han verificado: el supuesto del Ageing Report sobre la tasa de
        reposición y el crecimiento del PIB; también señala que los niveles no son comparables,
        porque el Ageing Report incluye clases pasivas y otros regímenes públicos. Quedan pendientes
        calibrar la distribución de salarios de las altas, incorporar el régimen de autónomos por
        separado y calcular horizontes más largos.
      </p>
    </ComoFunciona>
  );
}
