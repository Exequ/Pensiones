import { describe, expect, it } from 'vitest';
import { ArchivoDatos, Dato, Serie } from './esquema-datos';

const datoValido = {
  value: 1234.5,
  unit: 'euros/mes',
  period: '2024',
  source: {
    title: 'Documento de ejemplo',
    publisher: 'Organismo de ejemplo',
    url: 'https://example.org/documento',
  },
  fetchedAt: '2024-05-01',
  confidence: 'alta',
};

describe('esquema Dato', () => {
  it('acepta un dato completo', () => {
    expect(Dato.safeParse(datoValido).success).toBe(true);
  });

  it('acepta trimestres y fecha-hora con zona', () => {
    const r = Dato.safeParse({
      ...datoValido,
      period: '2024-T3',
      fetchedAt: '2024-05-01T10:00:00Z',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza un dato sin fuente con un mensaje claro', () => {
    const { source: _source, ...sinFuente } = datoValido;
    const r = Dato.safeParse(sinFuente);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/sin fuente/);
  });

  it('rechaza una fuente sin URL válida', () => {
    const r = Dato.safeParse({
      ...datoValido,
      source: { ...datoValido.source, url: 'documento.pdf' },
    });
    expect(r.success).toBe(false);
  });

  it('rechaza un dato sin fetchedAt o con fecha futura', () => {
    const { fetchedAt: _f, ...sinFecha } = datoValido;
    expect(Dato.safeParse(sinFecha).success).toBe(false);
    expect(Dato.safeParse({ ...datoValido, fetchedAt: '2999-01-01' }).success).toBe(false);
  });

  it('rechaza confianza, periodo o campos desconocidos no válidos', () => {
    expect(Dato.safeParse({ ...datoValido, confidence: 'total' }).success).toBe(false);
    expect(Dato.safeParse({ ...datoValido, period: '24' }).success).toBe(false);
    expect(Dato.safeParse({ ...datoValido, extra: 1 }).success).toBe(false);
    expect(Dato.safeParse({ ...datoValido, value: Number.NaN }).success).toBe(false);
  });
});

describe('esquema Serie y ArchivoDatos', () => {
  const serie = {
    id: 'serie-ejemplo',
    title: 'Serie de ejemplo',
    unit: 'índice',
    source: datoValido.source,
    fetchedAt: '2024-05-01',
    confidence: 'media',
    points: [
      { period: '2020', value: 100 },
      { period: '2021', value: 101 },
    ],
  };

  it('acepta una serie y detecta periodos repetidos', () => {
    expect(Serie.safeParse(serie).success).toBe(true);
    const repetida = { ...serie, points: [...serie.points, { period: '2020', value: 3 }] };
    expect(Serie.safeParse(repetida).success).toBe(false);
  });

  it('exige contenido y ids únicos en un fichero', () => {
    const base = { id: 'fichero', title: 'Fichero', description: 'Descripción' };
    expect(ArchivoDatos.safeParse(base).success).toBe(false);
    expect(ArchivoDatos.safeParse({ ...base, series: [serie] }).success).toBe(true);
    expect(
      ArchivoDatos.safeParse({
        ...base,
        series: [serie],
        data: [{ id: 'serie-ejemplo', ...datoValido }],
      }).success,
    ).toBe(false);
  });
});
