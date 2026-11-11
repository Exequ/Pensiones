/**
 * Carga y valida los datos FICTICIOS del laboratorio de diseño.
 */
import { z } from 'zod';
import { Dato } from '../engine/esquema-datos';
import json from './muestra.json';

const Muestra = z.strictObject({
  aviso: z.string().min(1),
  ficticio: z.literal(true),
  aniosPorDefecto: z.number().int(),
  porcentajePorAnios: z
    .array(z.strictObject({ anios: z.number().int(), porcentaje: z.number().min(0).max(1) }))
    .min(1),
  casos: z.array(
    z.strictObject({ caso: z.string(), baseReguladora: z.number(), anios: z.number().int() }),
  ),
  series: z.array(z.strictObject({ serie: z.string(), valores: z.array(z.number()).min(2) })),
  fuentes: z.array(Dato).min(1),
});

export type Muestra = z.infer<typeof Muestra>;

export const MUESTRA: Muestra = Muestra.parse(json);

/** Porcentaje ficticio correspondiente a unos años cotizados (interpolación por tramos). */
export function porcentajeFicticio(anios: number): number {
  const tabla = MUESTRA.porcentajePorAnios;
  const exacto = tabla.find((t) => t.anios === anios);
  if (exacto) return exacto.porcentaje;
  throw new RangeError(`La muestra no incluye ${anios} años`);
}
