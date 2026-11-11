import type { ReactNode } from 'react';
import './Kicker.css';

/** Antetítulo en versalitas, en color de acento. */
export function Kicker({ children }: { children: ReactNode }) {
  return <p className="kicker">{children}</p>;
}
