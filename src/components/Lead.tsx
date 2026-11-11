import type { ReactNode } from 'react';
import './Lead.css';

/** Entradilla: párrafo de apertura, más grande que el texto corrido. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="lead">{children}</p>;
}
