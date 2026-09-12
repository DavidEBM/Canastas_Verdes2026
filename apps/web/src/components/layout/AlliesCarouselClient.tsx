"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type AllyImage = {
  name: string;
  src: string;
};

type Props = {
  images: AllyImage[];
};

const AUTO_SPEED = 0.35; // píxeles por frame. Menor = más lento.
const RESUME_DELAY = 1500;

export default function AlliesCarouselClient({
  images,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const animationFrameRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const positionRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);

  /*
   * Duplicamos las imágenes varias veces para que exista
   * contenido suficiente a ambos lados y el movimiento
   * pueda ser prácticamente infinito.
   */
  const repeatedImages = [
    ...images,
    ...images,
    ...images,
  ];

  const getLoopWidth = useCallback(() => {
    const track = trackRef.current;

    if (!track) {
      return 0;
    }

    /*
     * Medimos la primera tercera parte del contenido.
     * Como las imágenes están repetidas 3 veces,
     * ese ancho representa exactamente un ciclo.
     */
    const children = Array.from(track.children);

    if (children.length < images.length) {
      return 0;
    }

    const first = children[0] as HTMLElement;
    const cycleEnd = children[images.length - 1] as HTMLElement;

    return (
      cycleEnd.offsetLeft +
      cycleEnd.offsetWidth -
      first.offsetLeft
    );
  }, [images.length]);

  const applyPosition = useCallback(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    track.style.transform = `translate3d(${-positionRef.current}px, 0, 0)`;
  }, []);

  const normalizePosition = useCallback(() => {
    const loopWidth = getLoopWidth();

    if (!loopWidth) {
      return;
    }

    /*
     * Mantiene la posición dentro del segundo ciclo.
     * Esto evita que el valor crezca indefinidamente.
     */
    while (positionRef.current >= loopWidth * 2) {
      positionRef.current -= loopWidth;
    }

    while (positionRef.current < loopWidth) {
      positionRef.current += loopWidth;
    }

    applyPosition();
  }, [applyPosition, getLoopWidth]);

  const stopAutoMovement = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      resumeTimeoutRef.current = null;
    }, RESUME_DELAY);
  }, []);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    let timeoutUntilStart: ReturnType<typeof setTimeout> | null =
      null;

    const startMovement = () => {
      stopAutoMovement();

      const animate = () => {
        if (!isDraggingRef.current) {
          positionRef.current += AUTO_SPEED;

          normalizePosition();
        }

        animationFrameRef.current =
          requestAnimationFrame(animate);
      };

      animationFrameRef.current =
        requestAnimationFrame(animate);
    };

    /*
     * Pequeño retraso inicial para que el componente
     * termine de medir correctamente el contenido.
     */
    timeoutUntilStart = setTimeout(startMovement, 500);

    return () => {
      if (timeoutUntilStart) {
        clearTimeout(timeoutUntilStart);
      }

      stopAutoMovement();

      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [
    images.length,
    normalizePosition,
    stopAutoMovement,
  ]);

  const startResumeTimer = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      resumeTimeoutRef.current = null;
    }, RESUME_DELAY);
  }, []);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (images.length <= 1) {
      return;
    }

    isDraggingRef.current = true;
    setIsDragging(true);

    lastPointerXRef.current = event.clientX;

    event.currentTarget.setPointerCapture(event.pointerId);

    stopAutoMovement();

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isDraggingRef.current) {
      return;
    }

    const currentX = event.clientX;
    const delta = currentX - lastPointerXRef.current;

    lastPointerXRef.current = currentX;

    /*
     * Arrastrar hacia la izquierda mueve el contenido
     * hacia la izquierda.
     *
     * Arrastrar hacia la derecha mueve el contenido
     * hacia la derecha.
     */
    positionRef.current -= delta;

    normalizePosition();
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // El puntero puede haber sido liberado previamente.
    }

    startResumeTimer();

    /*
     * Esperamos 3 segundos antes de reanudar el
     * movimiento automático.
     */
    setTimeout(() => {
      if (isDraggingRef.current) {
        return;
      }

      const animate = () => {
        if (!isDraggingRef.current) {
          positionRef.current += AUTO_SPEED;
          normalizePosition();
        }

        animationFrameRef.current =
          requestAnimationFrame(animate);
      };

      stopAutoMovement();

      animationFrameRef.current =
        requestAnimationFrame(animate);
    }, RESUME_DELAY);
  };

  const handlePointerCancel = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    handlePointerUp(event);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-[var(--border)] bg-white py-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-7 flex w-full flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-center text-lg font-semibold text-[var(--foreground)] sm:text-xl">
            Nuestros aliados
          </h2>

          <p className="mt-1.5 w-full max-w-xl text-center text-sm text-[var(--muted)]">
            Empresas, organizaciones y comunidades que hacen
            parte de Canastas Verdes.
          </p>
        </div>

        <div
          className="relative w-full overflow-hidden select-none touch-pan-y"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          <div
            ref={trackRef}
            className="flex w-max items-center gap-10 sm:gap-14 lg:gap-20"
            style={{
              willChange: "transform",
              transform: "translate3d(0, 0, 0)",
            }}
          >
            {repeatedImages.map((image, index) => (
              <div
                key={`${image.src}-${index}`}
                className="flex h-20 w-32 shrink-0 items-center justify-center sm:h-24 sm:w-40"
              >
                <img
                  src={image.src}
                  alt={image.name}
                  draggable={false}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}