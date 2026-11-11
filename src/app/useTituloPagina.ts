import { useEffect } from 'react';
import { NOMBRE_SITIO } from '../config';

/** Fija el <title> del documento para la página actual. */
export function useTituloPagina(titulo?: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${NOMBRE_SITIO}` : NOMBRE_SITIO;
  }, [titulo]);
}
