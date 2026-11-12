// @vitest-environment node
/**
 * Casos de Sergio: data-raw/casos-oro/casos-sergio.md.
 *
 * El fichero no existe todavía (Fase 2-A, 2026-11-12). Cuando se aporte, cada caso debe pasar a
 * ser un test (uno por caso, con la fuente y la fecha del caso en el comentario) y este bloque
 * pendiente se sustituye. Si el fichero aparece y no se ha convertido, el test siguiente falla
 * para recordarlo.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ } from './lib/motor-jubilacion.ts';

const FICHERO = path.join(RAIZ, 'data-raw/casos-oro/casos-sergio.md');

describe('casos de oro de Sergio (pendientes)', () => {
  if (existsSync(FICHERO)) {
    it('el fichero existe: conviértelo en tests (un caso por test)', () => {
      expect.fail('data-raw/casos-oro/casos-sergio.md existe y aún no está convertido en tests');
    });
  } else {
    it.todo('jubilación ordinaria con carrera completa (caso de Sergio: fuente y fecha del caso)');
    it.todo('jubilación anticipada voluntaria (caso de Sergio: fuente y fecha del caso)');
    it.todo('jubilación anticipada involuntaria (caso de Sergio: fuente y fecha del caso)');
    it.todo('jubilación demorada con incentivo (caso de Sergio: fuente y fecha del caso)');
    it.todo('pensión topada y pensión mínima (casos de Sergio: fuente y fecha del caso)');
  }
});
