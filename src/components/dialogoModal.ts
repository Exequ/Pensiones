import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Patrón común de los diálogos modales de la web (desplegable de fuentes y gráfico ampliado): un
 * `<dialog>` abierto con `showModal()` que recibe el foco en su botón «Cerrar», se cierra con Esc,
 * con «Cerrar» y con un clic en el fondo, y no deja salir el foco con Tab ni con Mayús+Tab.
 *
 * El diálogo se monta al abrir y se desmonta al cerrar; el componente que lo abre devuelve el foco a
 * su botón cuando ya está desmontado (`useFocoAlCerrar`).
 */
export function useDialogoModal(
  dialogo: RefObject<HTMLDialogElement | null>,
  foco: RefObject<HTMLElement | null>,
  onCerrar: () => void,
): void {
  // Siempre la última versión de onCerrar, sin volver a montar los oyentes en cada pintado.
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    // jsdom no implementa showModal: sin él se abre como diálogo no modal (la prueba real, en el
    // navegador, usa el modal nativo, con fondo inerte).
    if (typeof nodo.showModal === 'function') {
      if (!nodo.open) nodo.showModal();
    } else {
      nodo.setAttribute('open', '');
    }
    foco.current?.focus();

    // Un diálogo puede contener otro (el desplegable de fuentes dentro del gráfico ampliado): cada uno
    // atiende solo a los eventos que ocurren en él y no en uno anidado.
    const esPropio = (evento: Event) =>
      evento.target instanceof Element && evento.target.closest('dialog') === nodo;

    // Oyentes nativos (y no props de React): un <dialog> no es un elemento interactivo para las
    // reglas de accesibilidad del lint, y el comportamiento es el mismo con y sin showModal.
    let empezoFuera: boolean | null = null;
    const alCancelar = (evento: Event) => {
      if (evento.target !== nodo) return;
      evento.preventDefault();
      alCerrar.current();
    };
    const alPulsar = (evento: KeyboardEvent) => {
      if (!esPropio(evento)) return;
      if (evento.key === 'Escape') {
        evento.preventDefault();
        alCerrar.current();
      } else if (evento.key === 'Tab') {
        // El modal nativo deja salir el foco hacia el navegador al pasar del último control: se
        // cierra el circuito para que el foco no se pierda.
        const controles = [...nodo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE)].filter(
          (c) => c.closest('dialog') === nodo,
        );
        const primero = controles[0];
        const ultimo = controles.at(-1);
        if (!primero || !ultimo) return;
        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primero.focus();
        }
      }
    };
    const alBajarElPuntero = (evento: Event) => {
      empezoFuera = evento.target === nodo;
    };
    const alHacerClic = (evento: Event) => {
      // El fondo del modal es el propio <dialog>: un clic que empieza y acaba ahí es «fuera».
      const fuera = evento.target === nodo && empezoFuera !== false;
      empezoFuera = null;
      if (fuera) alCerrar.current();
    };
    nodo.addEventListener('cancel', alCancelar);
    nodo.addEventListener('keydown', alPulsar);
    nodo.addEventListener('pointerdown', alBajarElPuntero);
    nodo.addEventListener('click', alHacerClic);
    return () => {
      nodo.removeEventListener('cancel', alCancelar);
      nodo.removeEventListener('keydown', alPulsar);
      nodo.removeEventListener('pointerdown', alBajarElPuntero);
      nodo.removeEventListener('click', alHacerClic);
    };
  }, [dialogo, foco]);
}

/** Controles que pueden recibir el foco con Tab dentro de un diálogo. */
const SELECTOR_ENFOCABLE =
  'button:not([disabled]), a[href], summary, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Instancia con un diálogo abierto: solo una por grupo a la vez. */
interface Instancia {
  readonly cerrar: () => void;
}

/**
 * Estado abierto o cerrado de un diálogo del que solo puede haber uno abierto a la vez dentro de su
 * grupo (abrir otro cierra el anterior), con el foco de vuelta al botón que lo abrió al cerrarse.
 */
export function useDialogoUnico(
  grupo: GrupoDialogos,
  boton: RefObject<HTMLElement | null>,
): { abierto: boolean; abrir: () => void; cerrar: () => void } {
  const [abierto, setAbierto] = useState(false);
  const habiaAbierto = useRef(false);

  // Al cerrar, el foco vuelve al botón (con el diálogo modal abierto, el resto de la página es inerte,
  // así que solo se puede hacer una vez desmontado).
  useEffect(() => {
    if (abierto) {
      habiaAbierto.current = true;
    } else if (habiaAbierto.current) {
      habiaAbierto.current = false;
      boton.current?.focus();
    }
  }, [abierto, boton]);

  const [instancia] = useState<Instancia>(() => ({
    cerrar: () => {
      setAbierto(false);
    },
  }));

  useEffect(
    () => () => {
      grupo.soltar(instancia);
    },
    [grupo, instancia],
  );

  function cerrar() {
    grupo.soltar(instancia);
    setAbierto(false);
  }

  function abrir() {
    grupo.tomar(instancia);
    setAbierto(true);
  }

  return { abierto, abrir, cerrar };
}

/** Grupo de diálogos con un solo abierto a la vez. */
export interface GrupoDialogos {
  /** Marca la instancia como abierta y cierra la que lo estuviera. */
  readonly tomar: (instancia: Instancia) => void;
  /** Deja de marcar la instancia como abierta (si lo estaba). */
  readonly soltar: (instancia: Instancia) => void;
}

/** Crea un grupo de diálogos con un solo abierto a la vez. */
export function crearGrupoDialogos(): GrupoDialogos {
  let actual: Instancia | null = null;
  return {
    tomar: (instancia) => {
      if (actual !== null && actual !== instancia) actual.cerrar();
      actual = instancia;
    },
    soltar: (instancia) => {
      if (actual === instancia) actual = null;
    },
  };
}
