"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface FirmaRecibidoData {
  metodo: "manuscrita" | "texto";
  valor: string;
  firmaDataUrl: string | null;
  valido: boolean;
}

interface FirmaRecibidoProps {
  nombreCliente?: string;
  onChange: (data: FirmaRecibidoData) => void;
  disabled?: boolean;
}

type MetodoFirma = "manuscrita" | "texto";

export default function FirmaRecibido({
  nombreCliente = "",
  onChange,
  disabled = false,
}: FirmaRecibidoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [metodo, setMetodo] = useState<MetodoFirma>("manuscrita");
  const [texto, setTexto] = useState("");
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);

  /*
   * Guarda el último estado enviado al padre.
   *
   * Esto evita que el useEffect llame a onChange
   * repetidamente con exactamente la misma información.
   */
  const ultimoCambioRef = useRef("");

  const limpiarCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    setFirmaDataUrl(null);
  }, []);

  const obtenerFirmaCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return null;

    const context = canvas.getContext("2d");

    if (!context) return null;

    const imageData = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    /*
     * Detectamos si realmente existe algún trazo.
     */
    let tieneContenido = false;

    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) {
        tieneContenido = true;
        break;
      }
    }

    if (!tieneContenido) {
      return null;
    }

    return canvas.toDataURL("image/png");
  }, []);

  const obtenerPosicion = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ("touches" in event) {
      const touch =
        event.touches[0] ?? event.changedTouches[0];

      if (!touch) {
        return null;
      }

      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x:
        (clientX - rect.left) *
        (canvas.width / rect.width),
      y:
        (clientY - rect.top) *
        (canvas.height / rect.height),
    };
  };

  const comenzarDibujo = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (disabled) return;

    event.preventDefault();

    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    const posicion = obtenerPosicion(event);

    if (!posicion) return;

    drawingRef.current = true;

    context.beginPath();
    context.moveTo(posicion.x, posicion.y);
  };

  const dibujar = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (disabled || !drawingRef.current) return;

    event.preventDefault();

    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    const posicion = obtenerPosicion(event);

    if (!posicion) return;

    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.lineTo(posicion.x, posicion.y);
    context.stroke();
  };

  const terminarDibujo = () => {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const firma = obtenerFirmaCanvas();

    setFirmaDataUrl(firma);
  };

  /*
   * Cuando cambia el método de firma, limpiamos el método anterior.
   */
  useEffect(() => {
    ultimoCambioRef.current = "";

    if (metodo === "manuscrita") {
      setTexto("");
    } else {
      limpiarCanvas();
    }
  }, [metodo, limpiarCanvas]);

  /*
   * ÚNICO efecto que comunica el estado al componente padre.
   *
   * Importante:
   * solo llama onChange cuando el contenido realmente cambió.
   */
  useEffect(() => {
    const data: FirmaRecibidoData =
      metodo === "manuscrita"
        ? {
            metodo: "manuscrita",
            valor: firmaDataUrl ?? "",
            firmaDataUrl,
            valido: Boolean(firmaDataUrl),
          }
        : {
            metodo: "texto",
            valor: texto.trim(),
            firmaDataUrl: null,
            valido: texto.trim().length > 0,
          };

    const serialized = JSON.stringify(data);

    if (ultimoCambioRef.current === serialized) {
      return;
    }

    ultimoCambioRef.current = serialized;

    onChange(data);
  }, [
    metodo,
    texto,
    firmaDataUrl,
    onChange,
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Firma de recibido
        </h3>

        {nombreCliente && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Recibido por:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {nombreCliente}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMetodo("manuscrita")}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
            metodo === "manuscrita"
              ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--primary)]"
              : "border-[var(--border)] bg-white text-[var(--foreground)]"
          } ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : "hover:border-[var(--primary)]"
          }`}
        >
          Firma manuscrita
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setMetodo("texto")}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
            metodo === "texto"
              ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--primary)]"
              : "border-[var(--border)] bg-white text-[var(--foreground)]"
          } ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : "hover:border-[var(--primary)]"
          }`}
        >
          Firma con texto
        </button>
      </div>

      {metodo === "manuscrita" ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
            <canvas
              ref={canvasRef}
              width={700}
              height={220}
              className="block h-[180px] w-full touch-none bg-white sm:h-[220px]"
              onMouseDown={comenzarDibujo}
              onMouseMove={dibujar}
              onMouseUp={terminarDibujo}
              onMouseLeave={terminarDibujo}
              onTouchStart={comenzarDibujo}
              onTouchMove={dibujar}
              onTouchEnd={terminarDibujo}
              onTouchCancel={terminarDibujo}
            />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={limpiarCanvas}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpiar firma
          </button>
        </div>
      ) : (
        <div>
          <label
            htmlFor="firma-texto"
            className="mb-2 block text-sm font-medium text-[var(--foreground)]"
          >
            Nombre de quien recibe
          </label>

          <input
            id="firma-texto"
            type="text"
            value={texto}
            disabled={disabled}
            onChange={(event) => setTexto(event.target.value)}
            placeholder="Ingrese el nombre completo"
            className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
          />
        </div>
      )}
    </div>
  );
}