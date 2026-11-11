import { MOSTRAR_BANNER_DESARROLLO, TEXTO_BANNER_DESARROLLO } from '../config';
import './DevBanner.css';

interface DevBannerProps {
  /** Por defecto, la bandera MOSTRAR_BANNER_DESARROLLO de src/config.ts. */
  visible?: boolean;
}

/** Franja de tinta que avisa de que la web está en desarrollo. */
export function DevBanner({ visible = MOSTRAR_BANNER_DESARROLLO }: DevBannerProps) {
  if (!visible) return null;
  return (
    <div className="banner-desarrollo" role="note">
      <p className="contenedor banner-desarrollo-texto">{TEXTO_BANNER_DESARROLLO}</p>
    </div>
  );
}
