import { DefinitionById } from '../../components/DefinitionById';
import { fuentesDefinicionSistemas } from './fuentes-sistemas';

/** Definición del módulo de definiciones con las fuentes que carga la página (fase R10). */
export function DefinicionSistemas({ id }: { readonly id: string }) {
  return <DefinitionById id={id} fuentes={fuentesDefinicionSistemas} />;
}

/** Varias definiciones seguidas, en el orden dado. */
export function DefinicionesSistemas({ ids }: { readonly ids: readonly string[] }) {
  return (
    <div className="hist-definiciones">
      {ids.map((id) => (
        <DefinicionSistemas key={id} id={id} />
      ))}
    </div>
  );
}
