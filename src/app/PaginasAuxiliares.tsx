import { Link } from 'react-router-dom';
import { UnderConstruction } from '../components/UnderConstruction';
import { Kicker } from '../components/Kicker';
import { Lead } from '../components/Lead';
import { PAGINAS_SOBRE_LA_WEB } from '../modules/navegacion';
import { useTituloPagina } from './useTituloPagina';

const [FUENTES, CAMBIOS] = PAGINAS_SOBRE_LA_WEB;

export function Fuentes() {
  return (
    <UnderConstruction
      kicker="Sobre esta web"
      titulo={FUENTES.titulo}
      resumen="Relación de todas las fuentes utilizadas en la web, con el organismo que las publica y el enlace."
      previsto={[
        'Listado de fuentes agrupado por organismo.',
        'Para cada dato: documento y enlace.',
        'Fuentes que no han podido consultarse y están pendientes.',
      ]}
    />
  );
}

export function RegistroCambios() {
  return (
    <UnderConstruction
      kicker="Sobre esta web"
      titulo={CAMBIOS.titulo}
      resumen="Historial de las versiones de la web: qué se ha añadido, qué datos se han actualizado y qué correcciones se han hecho."
      previsto={[
        'Cambios de cada versión, con su fecha.',
        'Actualizaciones de datos y revisiones de fuentes.',
        'Correcciones de errores detectados.',
      ]}
    />
  );
}

export function NoEncontrada() {
  useTituloPagina('Página no encontrada');
  return (
    <div className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>Error</Kicker>
          <h1>Página no encontrada</h1>
          <Lead>La dirección no corresponde a ninguna página de esta web.</Lead>
        </header>
        <p className="texto-interfaz">
          <Link to="/" className="enlace-volver">
            Ir al índice
          </Link>
        </p>
      </div>
    </div>
  );
}
