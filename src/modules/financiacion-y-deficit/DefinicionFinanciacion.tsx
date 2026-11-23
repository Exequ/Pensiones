import { DefinitionById } from '../../components/DefinitionById';
import { fuentesDefinicionFinanciacion } from '../historico/datos-financiacion';

/** Definición del módulo de definiciones con las fuentes que carga la página (fase R7). */
export function DefinicionFinanciacion({ id }: { readonly id: string }) {
  return <DefinitionById id={id} fuentes={fuentesDefinicionFinanciacion} />;
}
