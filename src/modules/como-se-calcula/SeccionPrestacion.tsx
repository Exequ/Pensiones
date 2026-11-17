import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { MotorOfrecido } from '../../engine/comparar-lecturas';
import { EjemploPasoAPaso } from './EjemploPasoAPaso';
import { ejemplosDe } from './ejemplos';
import { EsquemaPasos } from './EsquemaPasos';
import type { Esquema } from './esquemas';
import { GraficosJubilacion } from './GraficosJubilacion';
import {
  PARAMETROS_INCAPACIDAD,
  PARAMETROS_JUBILACION,
  PARAMETROS_SUPERVIVENCIA,
  type ParametroConfig,
} from './ids-datos';
import { LecturasQueInfluyen } from './LecturasQueInfluyen';
import { QueNoCalcula } from './QueNoCalcula';
import { TablaParametros } from './TablaParametros';

const PARAMETROS: Record<Esquema['id'], readonly ParametroConfig[]> = {
  jubilacion: PARAMETROS_JUBILACION,
  incapacidad: PARAMETROS_INCAPACIDAD,
  viudedad: PARAMETROS_SUPERVIVENCIA,
  orfandad: PARAMETROS_SUPERVIVENCIA,
};

const MOTOR: Record<Esquema['id'], MotorOfrecido> = {
  jubilacion: 'jubilacion',
  incapacidad: 'incapacidad',
  viudedad: 'viudedad',
  orfandad: 'orfandad',
};

/** Una prestación: quién la cobra, esquema, parámetros, ejemplos, lecturas y límites. */
export function SeccionPrestacion({ esquema }: { readonly esquema: Esquema }) {
  const id = `como-${esquema.ancla}`;
  const ejemplos = useMemo(() => ejemplosDe(esquema.id), [esquema.id]);
  return (
    <section className="seccion prosa como-seccion" id={id} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} tabIndex={-1}>
        {esquema.titulo}
      </h2>

      <h3 id={`${id}-quien`}>Quién la cobra</h3>
      <p>{esquema.quien}</p>
      <p className="texto-interfaz">
        <Link to="/tipos-de-pension">Ver «Tipos de pensión»</Link>
      </p>

      <h3 id={`${id}-esquema`}>Cómo se calcula, paso a paso</h3>
      <EsquemaPasos esquema={esquema} />

      <h3 id={`${id}-parametros`}>Parámetros vigentes</h3>
      <p>
        Estos son los valores que intervienen en el cálculo de {esquema.titulo.toLowerCase()}. Cada
        uno lleva su ubicación en la norma y su fuente.
      </p>
      <TablaParametros
        titulo={`Parámetros vigentes: ${esquema.titulo}`}
        parametros={PARAMETROS[esquema.id]}
      />

      {esquema.id === 'jubilacion' ? (
        <>
          <h3 id={`${id}-graficos`}>La escala y los coeficientes, en gráficos</h3>
          <GraficosJubilacion />
        </>
      ) : null}

      <h3 id={`${id}-ejemplos`}>Ejemplos calculados con el motor</h3>
      <p>
        Cada ejemplo parte de unos supuestos ilustrativos y muestra, paso a paso, lo que devuelve el
        motor de cálculo de la web. Los resultados no están escritos en la página: se calculan al
        abrirla.
      </p>
      {ejemplos.map((e, i) => (
        <EjemploPasoAPaso key={e.id} ejemplo={e} esquema={esquema} abierto={i === 0} />
      ))}

      <h3 id={`${id}-lecturas`}>Lecturas que influyen</h3>
      <LecturasQueInfluyen motor={MOTOR[esquema.id]} ejemplos={ejemplos} />

      <h3 id={`${id}-no-calcula`}>Qué no calcula esta web</h3>
      <QueNoCalcula esquema={esquema} />

      <p className="como-enlace-simulador">
        <Link to="/tu-pension">Calcular un caso propio en «Tu pensión»</Link>
      </p>
    </section>
  );
}
