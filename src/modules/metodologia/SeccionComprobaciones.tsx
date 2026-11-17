import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { formatearNumero } from '../../engine/formato';
import { recuentos } from './recuentos';
import { Respaldo } from './Respaldo';

/** Apartado «Cómo se comprueban». */
export function SeccionComprobaciones() {
  const { auditoria, urls, casosOro, pruebas } = recuentos;
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-comprobaciones"
      aria-labelledby="met-comprobaciones-titulo"
    >
      <h2 id="met-comprobaciones-titulo" tabIndex={-1}>
        Cómo se comprueban
      </h2>
      <p>
        Una cifra no se publica solo porque tenga fuente: antes pasa por comprobaciones automáticas
        y, en una muestra, por un contraste con una segunda fuente. Estas comprobaciones tienen
        límites, y cada informe de verificación recoge los suyos.
      </p>

      <h3>Validación del formato</h3>
      <p>
        El comando de validación de datos falla si a un dato le falta la fuente con su dirección, la
        fecha de descarga o la confianza, o si un fichero no sigue el formato. Se ejecuta en cada
        cambio.
      </p>

      <h3>Coherencia entre cifras</h3>
      <p>
        Las pruebas automáticas comprueban reglas que el formato no puede expresar: que las sumas
        por clase, régimen y sexo igualen al total, que no falten años en una serie, que los
        cocientes estén en rango y que las citas copiadas de una norma figuren en el texto
        descargado.
      </p>

      <h3>Segunda fuente</h3>
      <p>
        Para una muestra de {formatearNumero(auditoria.series)} series se buscó una segunda fuente
        independiente y se compararon los valores
        {auditoria.fecha !== null ? ` (registro del ${auditoria.fecha})` : ''}. Las series para las
        que no se localizó una segunda fuente constan como «sin contraste independiente», y el
        detalle de cada contraste está en el registro de la auditoría.
      </p>
      <DataTable
        titulo="Series contrastadas con una segunda fuente, por resultado"
        columnas={[
          { clave: 'resultado', titulo: 'Resultado del contraste' },
          { clave: 'series', titulo: 'Series', tipo: 'numero' },
        ]}
        filas={auditoria.porResultado.map((f) => ({ resultado: f.resultado, series: f.series }))}
      />

      <h3>Direcciones de las fuentes</h3>
      <p>
        Se comprobó, en una muestra de {formatearNumero(urls.muestra)} fuentes
        {urls.fecha !== null ? ` (${urls.fecha})` : ''}, si su dirección responde. Los resultados
        constan tal cual, incluidos los que no responden o bloquean la consulta automática.
      </p>
      <DataTable
        titulo="Direcciones de la muestra, por resultado"
        columnas={[
          { clave: 'estado', titulo: 'Resultado' },
          { clave: 'urls', titulo: 'Direcciones', tipo: 'numero' },
        ]}
        filas={urls.porEstado.map((f) => ({ estado: f.estado, urls: f.urls }))}
      />

      <h3>Discrepancias entre fuentes</h3>
      <p>
        Cuando dos fuentes no coinciden, la diferencia se anota en el registro de discrepancias con
        su causa cuando se conoce y con el criterio aplicado, y no se esconde.
      </p>

      <h3>Casos de oro del motor de cálculo</h3>
      <Definition termino="Caso de oro">
        Ejemplo de pensión con un resultado esperado conocido, contra el que se prueba el motor de
        cálculo. Los hay de dos clases: «independiente», cuando el resultado está publicado en una
        fuente oficial, y «derivado de la norma», cuando se calcula a mano a partir del texto legal.
        Estos últimos comprueban que el motor aplica la lectura del proyecto, pero no son una
        validación independiente.
      </Definition>
      <p>
        Hoy hay {formatearNumero(casosOro.total)} casos de oro:{' '}
        {formatearNumero(casosOro.independientes)} independientes y{' '}
        {formatearNumero(casosOro.derivados)} derivados de la norma. Además, el motor se contrasta
        con casos generados por una versión simplificada del modelo de reposición, sin ajustar el
        motor para que coincida.
      </p>

      <h3>Pruebas automáticas y revisión de cada cambio</h3>
      <p>
        El repositorio tiene {formatearNumero(pruebas.ficheros)} ficheros de pruebas automáticas. En
        cada cambio se ejecutan, en un servicio de integración continua, la revisión de estilo, la
        comprobación de tipos, las pruebas, la validación de datos, la compilación y las pruebas de
        la interfaz en navegador (errores de consola, peticiones externas, desbordes y
        accesibilidad).
      </p>
      <Respaldo apartado="comprobaciones" />
    </section>
  );
}
