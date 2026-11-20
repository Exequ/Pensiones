/**
 * Diferencia acumulada entre los derechos reconocidos del Mecanismo de Equidad Intergeneracional y
 * las dotaciones al Fondo de Reserva con cargo a ese mecanismo (Ajustes actuariales 4, punto 6,
 * n.º 46). El art. 120.2 TRLGSS integra en el Fondo «el importe que se recaude» y el art. 118.4,
 * «los ingresos obtenidos»: lo recaudado, no lo reconocido. Las fuentes no publican la recaudación
 * mensual que permitiría conciliar las dos cifras, así que solo se mide la diferencia; no se le
 * atribuye causa. Lógica pura.
 */
export interface FilaMei {
  readonly anio: number;
  /** Derechos reconocidos netos (millones de euros). */
  readonly derechos: number;
  /** Dotación anual al Fondo con cargo al MEI (millones de euros). */
  readonly dotacion: number;
}

export interface DiferenciaMei {
  readonly desde: number;
  readonly hasta: number;
  /** Suma de (derechos − dotación) de todos los años, en millones de euros. */
  readonly diferencia: number;
}

export function diferenciaAcumuladaMei(filas: readonly FilaMei[]): DiferenciaMei {
  if (filas.length === 0) throw new RangeError('Sin años del MEI');
  for (const f of filas) {
    if (!Number.isFinite(f.derechos) || !Number.isFinite(f.dotacion)) {
      throw new RangeError(`MEI ${String(f.anio)}: cifra no disponible`);
    }
  }
  const anios = filas.map((f) => f.anio);
  return {
    desde: Math.min(...anios),
    hasta: Math.max(...anios),
    diferencia: filas.reduce((a, f) => a + (f.derechos - f.dotacion), 0),
  };
}
