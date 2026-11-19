import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { formatearEuros, formatearNumero, formatearPorcentaje } from '../../engine/formato';
import { PAGAS_CONTRIBUTIVAS, fechaEnTexto } from './cuantias';
import type { DatosFicha } from './datos-tipos';
import { ETIQUETA_REQUISITO } from './ids-datos';

const ETIQUETA_MODALIDAD = {
  contributiva: 'Modalidad contributiva',
  'no-contributiva': 'Modalidad no contributiva',
} as const;

const euros2 = (v: number) => formatearEuros(v, { decimales: 2 });

/** Año de un periodo «AAAA» o «AAAA-MM». */
const anioDe = (periodo: string) => periodo.slice(0, 4);

/**
 * Ficha de una prestación: qué es, quién puede cobrarla, requisitos con su artículo, cómo se calcula
 * la cuantía, cuantías mínimas y máximas vigentes y cuántas pensiones hay y su cuantía media.
 * Todo texto normativo y toda cifra proceden de /data.
 */
export function FichaPrestacion({ ficha }: { readonly ficha: DatosFicha }) {
  const { config, prestacion: p } = ficha;
  const idBase = `ficha-${config.ancla}`;
  const fuentesCuantias: Dato[] = [
    ...ficha.datosCuantias,
    ...(ficha.maxima ? [ficha.maxima.dato] : []),
    ...(ficha.pnc?.datos ?? []),
  ];
  const aPie = ficha.config.clase !== null;

  return (
    <article className="tipos-ficha" aria-labelledby={`${idBase}-titulo`} id={idBase}>
      <h3 id={`${idBase}-titulo`}>{config.titulo}</h3>
      <p className="tipos-etiquetas">
        {ETIQUETA_MODALIDAD[config.modalidad]} · {p.nombre}
      </p>

      <h4>Qué es y quién puede cobrarla</h4>
      <p>{p.aQuienCubre}</p>
      {ficha.modalidades.length > 0 ? (
        <>
          <p>
            Además de la modalidad ordinaria, la normativa regula otras modalidades de esta
            prestación, que esta ficha solo nombra:
          </p>
          <ul>
            {ficha.modalidades.map((m) => (
              <li key={m.id}>
                {m.nombre} ({m.articulos.join(', ')})
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h4>Requisitos principales</h4>
      <DataTable
        titulo={`Requisitos principales de la prestación: ${config.titulo}`}
        columnas={[
          { clave: 'tipo', titulo: 'Requisito' },
          { clave: 'descripcion', titulo: 'Qué exige' },
          { clave: 'articulo', titulo: 'Norma' },
        ]}
        filas={p.requisitos.map((r) => ({
          tipo: ETIQUETA_REQUISITO[r.tipo],
          descripcion: r.descripcion,
          articulo: r.articulo,
        }))}
      />
      <p className="tipos-pie">
        Duración: {p.duracion} Compatibilidades: {p.compatibilidades}
      </p>

      <h4>Cómo se calcula la cuantía, según la norma</h4>
      <p>{p.calculo.formula}</p>
      {ficha.porcentajes.length > 0 ? (
        <>
          <p>Porcentajes de la base reguladora que fija el reglamento, con su cita literal:</p>
          <ul className="tipos-citas">
            {ficha.porcentajes.map((f) => (
              <li key={f.id}>
                <strong>
                  {formatearNumero(f.valor)} {f.unidad}
                </strong>
                <blockquote>{f.cita}</blockquote>
                <span className="tipos-pie">{f.ubicacion}</span>
              </li>
            ))}
          </ul>
          <SourceLine
            datos={ficha.porcentajes.map((f) => f.dato)}
            titulo={`Porcentajes de la base reguladora: ${config.titulo}`}
          />
        </>
      ) : null}
      <p className="tipos-pie">Límites: {p.limites}</p>

      <h4>Cuantías mínimas y máximas vigentes</h4>
      {ficha.cuantias.length > 0 ? (
        <DataTable
          titulo={`Cuantías mínimas de ${config.titulo.toLowerCase()} en ${anioDe(ficha.datosCuantias[0]?.period ?? '')}`}
          columnas={[
            { clave: 'concepto', titulo: 'Concepto (literal del Anexo I)' },
            { clave: 'situacion', titulo: 'Situación familiar' },
            { clave: 'anual', titulo: 'Importe anual', tipo: 'euros', decimales: 2 },
            {
              clave: 'porPaga',
              titulo: `Por paga con ${formatearNumero(PAGAS_CONTRIBUTIVAS)} pagas (cálculo derivado)`,
              tipo: 'euros',
              decimales: 2,
            },
          ]}
          filas={ficha.cuantias.map((c) => ({
            concepto: c.concepto,
            situacion: c.situacion,
            anual: c.anual,
            porPaga: c.porPaga,
          }))}
        />
      ) : null}
      {ficha.maxima ? (
        <p>
          Cuantía máxima de las pensiones públicas del sistema en {ficha.maxima.anio}:{' '}
          {euros2(ficha.maxima.mensual)} al mes, que con {formatearNumero(PAGAS_CONTRIBUTIVAS)}{' '}
          pagas son {euros2(ficha.maxima.anual)} al año (importe anual, cálculo derivado).
        </p>
      ) : null}
      {ficha.pnc ? (
        <DataTable
          titulo={`Importe de la pensión no contributiva en ${ficha.pnc.anio}`}
          columnas={[
            { clave: 'concepto', titulo: 'Concepto' },
            { clave: 'anual', titulo: 'Importe anual', tipo: 'euros', decimales: 2 },
            { clave: 'porPaga', titulo: 'Por paga', tipo: 'euros', decimales: 2 },
          ]}
          filas={[
            {
              concepto: 'Cuantía íntegra',
              anual: ficha.pnc.anual,
              porPaga: ficha.pnc.porPaga,
            },
            {
              concepto: `Cuantía mínima: ${formatearPorcentaje(ficha.pnc.minimaPorcentaje / 100, { decimales: 0 })} de la íntegra (cálculo derivado)`,
              anual: ficha.pnc.minimaAnual,
              porPaga: ficha.pnc.minimaPorPaga,
            },
          ]}
          pie="La cuantía real depende de las rentas de la persona y de su unidad económica; la íntegra es el importe de referencia que fija cada año la norma de revalorización."
        />
      ) : null}
      {fuentesCuantias.length > 0 ? (
        <SourceLine
          datos={fuentesCuantias}
          titulo={`Cuantías mínimas y máximas vigentes: ${config.titulo}`}
        />
      ) : null}

      <h4>Cuántas hay y cuánto cobran de media</h4>
      <DataTable
        titulo={`Número y pensión media: ${config.titulo}, ${fechaEnTexto(ficha.fechaVigor, aPie)}`}
        columnas={[
          { clave: 'etiqueta', titulo: aPie ? 'Sexo' : 'Fuente del dato' },
          { clave: 'numero', titulo: 'Pensiones', tipo: 'numero', decimales: 0 },
          { clave: 'media', titulo: 'Pensión media al mes', tipo: 'euros', decimales: 2 },
        ]}
        filas={ficha.enVigor.map((f) => ({
          etiqueta: f.etiqueta,
          numero: f.numero,
          media: f.media,
        }))}
        pie={
          aPie
            ? 'El número es de pensiones, no de personas: una persona puede cobrar más de una. La pensión media es la que publica la Seguridad Social.'
            : 'La pensión media de la nómina es el importe bruto de la nómina entre el número de pensiones del mes, no el importe reconocido. El perfil del pensionista es otro fichero del IMSERSO y su cifra no coincide con la de la nómina; los datos consultados no explican la diferencia.'
        }
      />
      <SourceLine
        datos={ficha.enVigor.map((f) => f.dato)}
        titulo={`Número y pensión media: ${config.titulo}`}
      />

      {config.tuPension ? (
        <p className="tipos-enlace">
          <Link to="/tu-pension">Estimar esta pensión en «Tu pensión»</Link>
        </p>
      ) : null}

      <SourceLine datos={ficha.datoNorma} titulo={`Norma de la prestación: ${config.titulo}`} />
    </article>
  );
}
