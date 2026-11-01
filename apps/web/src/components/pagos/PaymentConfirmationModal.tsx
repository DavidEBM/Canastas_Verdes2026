"use client";

import { Banknote, CreditCard, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  paymentChange,
  type MedioPago,
} from "@/lib/pagos";

export type PaymentConfirmation = {
  medioPago: MedioPago;
  efectivoRecibido?: number;
};

interface PaymentConfirmationModalProps {
  open: boolean;
  total: number;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (payment: PaymentConfirmation) => void;
}

const OPTIONS: Array<{
  id: MedioPago;
  label: string;
  description: string;
  Icon: typeof Banknote;
}> = [
  {
    id: "efectivo",
    label: "Efectivo",
    description: "Recibir el dinero y calcular el cambio.",
    Icon: Banknote,
  },
  {
    id: "transferencia",
    label: "Transferencia",
    description: "Pago confirmado por transferencia bancaria.",
    Icon: CreditCard,
  },
  {
    id: "nequi",
    label: "Nequi",
    description: "Pago confirmado mediante Nequi.",
    Icon: Smartphone,
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export default function PaymentConfirmationModal({
  open,
  total,
  loading = false,
  error = null,
  onCancel,
  onConfirm,
}: PaymentConfirmationModalProps) {
  const [medioPago, setMedioPago] =
    useState<MedioPago>("efectivo");
  const [efectivo, setEfectivo] = useState("");

  useEffect(() => {
    if (open) {
      setMedioPago("efectivo");
      setEfectivo("");
    }
  }, [open, total]);

  const efectivoRecibido = Number(efectivo);
  const efectivoValido =
    medioPago !== "efectivo" ||
    (efectivo.trim() !== "" &&
      Number.isFinite(efectivoRecibido) &&
      efectivoRecibido >= total &&
      efectivoRecibido > 0);

  const cambio = useMemo(
    () =>
      medioPago === "efectivo" && efectivoValido
        ? paymentChange(total, efectivoRecibido)
        : 0,
    [efectivoRecibido, efectivoValido, medioPago, total],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className="modal-scroll max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Confirmación de entrega
            </p>
            <h2 id="payment-modal-title" className="mt-1 text-lg font-bold text-[var(--foreground)]">
              Registrar medio de pago
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Cerrar ventana de pago"
            className="rounded-full p-2 text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Total a recibir
            </p>
            <p className="mt-1 text-2xl font-black text-[var(--primary)]">
              {formatMoney(total)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-[var(--foreground)]">
              ¿Cómo pagó el cliente?
            </p>
            <div className="grid gap-2">
              {OPTIONS.map(({ id, label, description, Icon }) => {
                const selected = medioPago === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMedioPago(id)}
                    disabled={loading}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-[var(--primary)] bg-[var(--secondary)]/55 ring-1 ring-[var(--primary)]"
                        : "border-[var(--border)] bg-white hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <span className={`rounded-lg p-2 ${selected ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] text-[var(--primary)]"}`}>
                      <Icon size={17} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[var(--foreground)]">
                        {label}
                      </span>
                      <span className="block text-xs text-[var(--muted)]">
                        {description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {medioPago === "efectivo" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label htmlFor="efectivo-recibido" className="text-sm font-bold text-amber-950">
                Efectivo recibido
              </label>
              <input
                id="efectivo-recibido"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={efectivo}
                onChange={(event) => setEfectivo(event.target.value)}
                placeholder="Escribe el valor entregado"
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500"
              />
              <p className="mt-2 text-xs text-amber-900/75">
                Debe ser igual o superior a {formatMoney(total)}.
              </p>
              {efectivo.trim() !== "" && efectivoRecibido < total && (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  El valor recibido aún no cubre el total.
                </p>
              )}
              {efectivoValido && (
                <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3 text-sm font-bold text-amber-950">
                  <span>Cambio para el cliente</span>
                  <span>{formatMoney(cambio)}</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                onConfirm({
                  medioPago,
                  efectivoRecibido:
                    medioPago === "efectivo"
                      ? efectivoRecibido
                      : undefined,
                })
              }
              disabled={loading || !efectivoValido}
              className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? "Registrando…" : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
