import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { formatearNumero } from '../../engine/formato';
import { recuentos } from './recuentos';
import { Respaldo } from './Respaldo';

const ORGANISMOS_MOSTRADOS = 6;

/** Apartado «De dónde salen los datos». */
export function SeccionDatos() {
  const { fuentes, datos } = recuentos;
  const principales = fuentes.porOrganismo.slice(0, ORGANISMOS_MOSTRADOS);
  const resto = fuentes.porOrganismo.slice(ORGANISMOS_MOSTRADOS);
  const filasOrganismos = [
    ...principales.map((o) => ({ organismo: o.organismo, fuentes: o.fuentes })),
    ...(resto.length > 0
      ? [
          {
            organismo: `Resto (${formatearNumero(resto.length)} denominaciones)`,
            fuentes: resto.reduce((suma, o) => suma + o.fuentes, 0),
          },
        ]
      : []),
  ];
  const c = datos.elementosConConfianza;
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-datos"
      aria-labelledby="met-datos-titulo"
    >
      <h2 id="met-datos-titulo" tabIndex={-1}>
        De dónde salen los datos
      </h2>
      <p>
        Las cifras de la web salen de ficheros de la carpeta de datos del repositorio (/data), no de
        los textos de las páginas. En general, cada fichero se genera con un script de extracción a
        partir de documentos que se descargan de su fuente original (el Boletín Oficial del Estado,
        la Seguridad Social, el INE, Eurostat, la OCDE, la Comisión Europea) durante el trabajo.
        Algunos ficheros, como los perfiles de ejemplo de «Tu pensión», son de elaboración propia y
        lo dicen en su fuente.
      </p>
      <div className="met-definiciones">
        <Definition termino="Fuente">
          Documento del que sale un dato: su título, el organismo que lo publica y su dirección. Sin
          una fuente con dirección, el formato de los datos rechaza el dato.
        </Definition>
        <Definition termino="Fecha de descarga">
          Día en que se descargó el documento. Es la fecha de consulta, no la de publicación de la
          cifra.
        </Definition>
        <Definition termino="Confianza">
          Nivel «alta», «media» o «baja» que acompaña a cada dato y mide la fiabilidad de su fuente.
          El apartado «Qué significa la confianza y la revisión actuarial» lo explica.
        </Definition>
        <Definition termino="Huella">
          Código, obtenido con una función criptográfica de resumen, que identifica un fichero
          concreto: si el fichero cambia, la huella cambia. El registro de fuentes recoge la de cada
          fichero bruto que alimenta una tabla.
        </Definition>
        <Definition termino="Dato derivado">
          Dato que el proyecto calcula a partir de otros, como una media o un cociente. Se marca
          como derivado en su título, en su descripción o en sus notas.
        </Definition>
      </div>
      <p>
        Si una fuente no se puede descargar, el hueco no se rellena con estimaciones: se anota en el
        registro de datos pendientes con la dirección exacta, la fecha y el motivo. Cuando una
        página convierte euros corrientes en euros constantes, lo dice y nombra el índice de precios
        que usa.
      </p>
      <p>
        La relación completa de fuentes está en el registro de fuentes del repositorio; la página
        «Fuentes» de la web todavía no la reproduce.
      </p>

      <h3>Recuento actual</h3>
      <p>
        Se calcula al compilar la web, desde los ficheros del repositorio, y por eso cambia cuando
        cambian los datos:
      </p>
      <ul>
        <li>
          {formatearNumero(fuentes.distintas)} fuentes distintas en el registro de fuentes, con{' '}
          {formatearNumero(fuentes.organismos)} denominaciones de organismo (un mismo organismo
          puede figurar con más de una).
        </li>
        <li>
          {formatearNumero(datos.ficheros)} ficheros en /data: {formatearNumero(datos.json)} en
          formato JSON y {formatearNumero(datos.csv)} tablas en CSV.
        </li>
        <li>
          {formatearNumero(c.total)} elementos (series, datos, normas, tablas y otros) con nivel de
          confianza: {formatearNumero(c.alta)} de confianza alta, {formatearNumero(c.media)} de
          confianza media y {formatearNumero(c.baja)} de confianza baja.
        </li>
      </ul>
      <DataTable
        titulo="Ficheros de /data por carpeta"
        columnas={[
          { clave: 'carpeta', titulo: 'Carpeta' },
          { clave: 'json', titulo: 'JSON', tipo: 'numero' },
          { clave: 'csv', titulo: 'CSV', tipo: 'numero' },
        ]}
        filas={datos.porCarpeta.map((f) => ({ carpeta: f.carpeta, json: f.json, csv: f.csv }))}
      />
      <DataTable
        titulo="Fuentes por organismo, tal como constan en el registro de fuentes"
        columnas={[
          { clave: 'organismo', titulo: 'Organismo' },
          { clave: 'fuentes', titulo: 'Fuentes', tipo: 'numero' },
        ]}
        filas={filasOrganismos}
      />
      <Respaldo apartado="datos" />
    </section>
  );
}
