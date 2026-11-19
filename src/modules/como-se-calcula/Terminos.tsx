import { Definition } from '../../components/Definition';
import { ID_TERMINOS, TITULO_TERMINOS } from './apartados';

/**
 * Términos que se usan en toda la página, definidos antes de la primera vez que aparecen. Sin cifras:
 * los valores concretos están en las tablas de parámetros y en los ejemplos.
 */
const TERMINOS: readonly { readonly termino: string; readonly texto: string }[] = [
  {
    termino: 'Hecho causante',
    texto:
      'El momento que da origen a la pensión: la fecha de la jubilación, la de la declaración de la incapacidad o la del fallecimiento. El motor aplica la norma vigente en el año del hecho causante.',
  },
  {
    termino: 'Base de cotización',
    texto:
      'Importe mensual sobre el que se cotiza a la Seguridad Social. Tiene un mínimo y un máximo que se fijan cada año.',
  },
  {
    termino: 'Base reguladora',
    texto:
      'Importe mensual de referencia que resulta de las bases de cotización de determinados meses. Sobre ella se aplican los porcentajes; no es todavía la pensión.',
  },
  {
    termino: 'Carencia',
    texto: 'Tiempo mínimo cotizado que la norma exige para tener derecho a una pensión.',
  },
  {
    termino: 'Porcentaje y coeficiente',
    texto:
      'El porcentaje se aplica a la base reguladora para obtener la pensión. Un coeficiente reductor (jubilación anticipada) o un porcentaje adicional (jubilación demorada) modifica ese resultado.',
  },
  {
    termino: 'Laguna',
    texto:
      'Mes del periodo de cálculo en el que no había obligación de cotizar. La norma lo completa con una parte de la base mínima.',
  },
  {
    termino: 'Pensión máxima',
    texto:
      'Límite superior de la cuantía inicial de las pensiones contributivas. Se fija cada año.',
  },
  {
    termino: 'Pensión mínima y complemento a mínimos',
    texto:
      'La pensión mínima es la cuantía que la norma asigna a cada situación. Si la pensión calculada queda por debajo y se cumplen los requisitos de rentas, se añade un complemento hasta alcanzarla.',
  },
  {
    termino: 'Lectura abierta',
    texto:
      'Duda de interpretación de la norma que el motor de cálculo no resuelve con certeza. Cada una tiene un valor por defecto, alternativas y un estado: decidida (firme), provisional (adoptada con confianza baja o media y abierta a revisión) o pendiente de decidir.',
  },
];

export function Terminos() {
  return (
    <section
      className="seccion prosa como-terminos"
      id={ID_TERMINOS}
      aria-labelledby={`${ID_TERMINOS}-titulo`}
    >
      <h2 id={`${ID_TERMINOS}-titulo`} tabIndex={-1}>
        {TITULO_TERMINOS}
      </h2>
      <p>
        Antes de empezar, estas son las palabras que se repiten en las cuatro prestaciones. Cada una
        se define aquí una vez.
      </p>
      <div className="como-definiciones">
        {TERMINOS.map((t) => (
          <Definition key={t.termino} termino={t.termino}>
            {t.texto}
          </Definition>
        ))}
      </div>
    </section>
  );
}
