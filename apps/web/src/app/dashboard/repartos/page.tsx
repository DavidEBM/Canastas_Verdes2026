"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import RepartoCard from "@/components/repartos/RepartoCard";

import type {
  Reparto,
} from "@/lib/repartos/types";

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: Reparto[];
}

type FiltroEstado =
  | "todos"
  | "pendiente"
  | "asignado"
  | "en_camino"
  | "entregado";

export default function DashboardRepartosPage() {
  const {
    user,
    role,
    loading: authLoading,
  } = useAuth();

  const [repartos, setRepartos] =
    useState<Reparto[]>([]);

  const [filtro, setFiltro] =
    useState<FiltroEstado>("todos");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================================================
  // CARGAR REPARTOS
  // =========================================================

  const cargarRepartos =
    useCallback(async () => {
      if (!user) {
        setRepartos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const token =
          await auth.currentUser?.getIdToken();

        if (!token) {
          throw new Error(
            "No se encontró una sesión válida.",
          );
        }

        const response =
          await fetch(
            "/api/repartos",
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: "no-store",
            },
          );

        const result =
          (await response.json()) as ApiResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "No fue posible cargar los repartos.",
          );
        }

        setRepartos(
          result.data ?? [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar los repartos.",
        );
      } finally {
        setLoading(false);
      }
    }, [user]);

  // =========================================================
  // CARGA INICIAL
  // =========================================================

  useEffect(() => {
    if (!authLoading) {
      cargarRepartos();
    }
  }, [
    authLoading,
    cargarRepartos,
  ]);

  // =========================================================
  // FILTRADO
  // =========================================================

  const repartosFiltrados =
    filtro === "todos"
      ? repartos
      : repartos.filter(
          (reparto) =>
            reparto.pedido.estado ===
            filtro,
        );

  // =========================================================
  // ESTADO DE AUTENTICACIÓN
  // =========================================================

  if (authLoading) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
          Cargando sesión...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Debes iniciar sesión para acceder
          a los repartos.
        </div>
      </main>
    );
  }

  // =========================================================
  // PERMISOS
  // =========================================================

  if (
    role !== "admin" &&
    role !== "repartidor"
  ) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          No tienes permisos para acceder
          a este módulo.
        </div>
      </main>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="space-y-6 p-4 md:p-6">
      {/* ================================================ */}
      {/* ENCABEZADO */}
      {/* ================================================ */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Repartos
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gestión y seguimiento de pedidos.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarRepartos}
          disabled={loading}
          className="rounded-lg border border-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Actualizando..."
            : "Actualizar"}
        </button>
      </div>

      {/* ================================================ */}
      {/* ESTADÍSTICAS */}
      {/* ================================================ */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          label="Todos"
          value={repartos.length}
        />

        <StatCard
          label="Pendientes"
          value={repartos.filter(
            (item) =>
              item.pedido.estado ===
              "pendiente",
          ).length}
        />

        <StatCard
          label="Asignados"
          value={repartos.filter(
            (item) =>
              item.pedido.estado ===
              "asignado",
          ).length}
        />

        <StatCard
          label="En camino"
          value={repartos.filter(
            (item) =>
              item.pedido.estado ===
              "en_camino",
          ).length}
        />

        <StatCard
          label="Entregados"
          value={repartos.filter(
            (item) =>
              item.pedido.estado ===
              "entregado",
          ).length}
        />
      </div>

      {/* ================================================ */}
      {/* FILTROS */}
      {/* ================================================ */}

      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={filtro === "todos"}
          onClick={() =>
            setFiltro("todos")
          }
        >
          Todos
        </FilterButton>

        <FilterButton
          active={
            filtro === "pendiente"
          }
          onClick={() =>
            setFiltro("pendiente")
          }
        >
          Pendientes
        </FilterButton>

        <FilterButton
          active={
            filtro === "asignado"
          }
          onClick={() =>
            setFiltro("asignado")
          }
        >
          Asignados
        </FilterButton>

        <FilterButton
          active={
            filtro === "en_camino"
          }
          onClick={() =>
            setFiltro("en_camino")
          }
        >
          En camino
        </FilterButton>

        <FilterButton
          active={
            filtro === "entregado"
          }
          onClick={() =>
            setFiltro("entregado")
          }
        >
          Entregados
        </FilterButton>
      </div>

      {/* ================================================ */}
      {/* ERROR */}
      {/* ================================================ */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>

          <button
            type="button"
            onClick={cargarRepartos}
            className="mt-2 font-semibold underline"
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      {/* ================================================ */}
      {/* CARGANDO */}
      {/* ================================================ */}

      {loading &&
        repartos.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center text-gray-600">
            Cargando repartos...
          </div>
        )}

      {/* ================================================ */}
      {/* SIN RESULTADOS */}
      {/* ================================================ */}

      {!loading &&
        repartosFiltrados.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center">
            <h2 className="font-semibold text-[var(--foreground)]">
              No hay repartos
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              No existen pedidos que
              coincidan con el filtro
              seleccionado.
            </p>
          </div>
        )}

      {/* ================================================ */}
      {/* TARJETAS */}
      {/* ================================================ */}

      <div className="space-y-4">
        {repartosFiltrados.map(
          (reparto) => (
            <RepartoCard
              key={reparto.id}
              reparto={reparto}
              isAdmin={
                role === "admin"
              }
              onRefresh={
                cargarRepartos
              }
            />
          ),
        )}
      </div>
    </main>
  );
}

/*
 * ============================================================
 * COMPONENTES PEQUEÑOS
 * ============================================================
 */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-[var(--primary)]">
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--border)] bg-white text-gray-700 hover:bg-[var(--secondary)]"
      }`}
    >
      {children}
    </button>
  );
}