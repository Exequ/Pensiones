import { DefinitionById } from '../../components/DefinitionById';
import { fuentesDefinicionHucha } from './fuentes-hucha';

/** Definición del módulo de definiciones con las fuentes que carga la página (fase R8). */
export function DefinicionHucha({ id }: { readonly id: string }) {
  return <DefinitionById id={id} fuentes={fuentesDefinicionHucha} />;
}
