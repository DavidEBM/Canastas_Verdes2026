"use client";

import { useCallback, useEffect, useState } from "react";

import type { Pedido } from "@/services/pedidos.service";
import { obtenerPedidoPorId } from "@/services/pedidos.service";

/**
 * Estado del pedido.
 */
interface TicketState {
  pedido: Pedido | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para consultar un pedido específico.
 */
export function useTicket(
  pedidoId?: string,
) {
  const [state, setState] =
    useState<TicketState>({
      pedido: null,
      loading: Boolean(pedidoId),
      error: null,
    });

  /**
   * Carga el pedido desde Firebase.
   */
  const cargarPedido = useCallback(
    async () => {
      if (!pedidoId) {
        setState({
          pedido: null,
          loading: false,
          error: null,
        });

        return;
      }

      setState((actual) => ({
        ...actual,
        loading: true,
        error: null,
      }));

      try {
        const pedido =
          await obtenerPedidoPorId(
            pedidoId,
          );

        if (!pedido) {
          setState({
            pedido: null,
            loading: false,
            error:
              "No se encontró el pedido.",
          });

          return;
        }

        setState({
          pedido,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error(
          "Error obteniendo pedido:",
          error,
        );

        setState({
          pedido: null,
          loading: false,
          error:
            "No fue posible cargar el pedido.",
        });
      }
    },
    [pedidoId],
  );

  /**
   * Carga inicial.
   */
  useEffect(() => {
    void cargarPedido();
  }, [cargarPedido]);

  return {
    pedido: state.pedido,
    loading: state.loading,
    error: state.error,

    /**
     * Permite volver a consultar el pedido
     * manualmente.
     */
    recargar: cargarPedido,
  };
}