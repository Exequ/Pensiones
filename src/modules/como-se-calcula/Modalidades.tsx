import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { Formula } from '../../components/Formula';
import { SourceLine } from '../../components/SourceLine';
import { ETIQUETA_REQUISITO } from '../tipos-de-pension/ids-datos';
import { DESTINO_MODALIDADES, ID_MODALIDADES, TITULO_MODALIDADES } from './anclas-modalidades';
import { modalidadesJubilacion, type DatosModalidad } from './datos-como';
import { TablaEfectoMeses } from './TablaEfectoMeses';

/**
 * Una modalidad de la jubilación: quién puede acogerse, requisitos, cómo se calcula la cuantía (con
 * fórmula y leyenda si la norma da una fórmula cerrada) y límites. Los artículos y las normas no se
 * ven en el cuerpo ni en las tablas: están en el desplegable «Fuentes» de cada bloque.
 */
function ModalidadJubilacion({ m }: { readonly m: DatosModalidad }) {
  const id = `como-modalidad-${m.id}`;
  return (
    <article className="como-modalidad" id={id} aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`} tabIndex={-1}>
        {m.nombre}
      </h3>

      <h4>Quién puede acogerse</h4>
      <p>{m.textos.aQuienCubre}</p>
      <SourceLine datos={m.fuentes.quien} titulo={`Quién puede acogerse: ${m.nombre}`} />

      <h4>Requisitos</h4>
      <DataTable
        titulo={`Requisitos de la modalidad: ${m.nombre}`}
        columnas={[
          { clave: 'tipo', titulo: 'Requisito' },
          { clave: 'descripcion', titulo: 'Qué exige' },
        ]}
        filas={m.textos.requisitos.map((r) => ({
          tipo: ETIQUETA_REQUISITO[r.tipo],
          descripcion: r.descripcion,
        }))}
      />
      <p className="tipos-pie">
        Duración: {m.textos.duracion} Compatibilidades: {m.textos.compatibilidades}
      </p>
      <SourceLine datos={m.fuentes.requisitos} titulo={`Requisitos de la modalidad: ${m.nombre}`} />

      <h4>Cómo se calcula la cuantía</h4>
      {m.formula?.alcance === 'completa' ? null : <p>{m.textos.formula}</p>}
      {m.formula ? <Formula formula={m.formula} /> : null}
      <p className="tipos-pie">Límites: {m.textos.limites}</p>
      <SourceLine datos={m.fuentes.calculo} titulo={`Cálculo y límites: ${m.nombre}`} />
      <SourceLine datos={m.fuentes.norma} titulo={`Norma de la modalidad: ${m.nombre}`} />
    </article>
  );
}

/**
 * Apartado «Modalidades de la jubilación» con ancla estable (`DESTINO_MODALIDADES`), al que enlaza
 * la ficha de jubilación de «Tipos de pensión». Cada modalidad sale de `prestaciones.json` y cierra
 * la tabla del efecto de adelantar o retrasar la jubilación.
 */
export function Modalidades() {
  const modalidades = modalidadesJubilacion();
  return (
    <section
      className="seccion prosa como-seccion como-modalidades"
      id={ID_MODALIDADES}
      aria-labelledby={DESTINO_MODALIDADES}
    >
      <h2 id={DESTINO_MODALIDADES} tabIndex={-1}>
        {TITULO_MODALIDADES}
      </h2>
      <p>
        La sección anterior explica la jubilación a la edad ordinaria. Estas son las demás
        modalidades: para cada una, quién puede acogerse, qué se exige, cómo se calcula la cuantía y
        qué límites tiene. Las normas de cada bloque están en «Fuentes». Al final, una tabla recoge
        cuánto cambia la pensión según los meses que se adelanta o se retrasa la jubilación.
      </p>
      {modalidades.map((m) => (
        <ModalidadJubilacion key={m.id} m={m} />
      ))}
      <TablaEfectoMeses />
      <p className="como-enlace-simulador">
        <Link to="/tu-pension">Estimar la jubilación ordinaria en «Tu pensión»</Link>
      </p>
    </section>
  );
}
