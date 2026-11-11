# Pensiones, con datos

Web divulgativa e independiente sobre el sistema público de pensiones español: tipos de
pensión, cálculo, requisitos, reformas, financiación, demografía y comparación con otros
sistemas. Cada cifra enlaza a su fuente.

- Web: <https://exequ.github.io/Pensiones/>
- Estado: **Fase 0 · cimientos** (infraestructura, sistema de diseño y esqueleto; sin datos reales).

## Desarrollo

Requiere Node.js 22.12 o posterior.

```bash
npm ci
npm run dev
```

Comprobaciones (las mismas que el CI):

```bash
npm run lint && npm run typecheck && npm test && npm run validate:data && npm run build
npm run test:e2e
```

Las reglas del proyecto están en [CLAUDE.md](CLAUDE.md); las decisiones, en
[docs/DECISIONES.md](docs/DECISIONES.md).
