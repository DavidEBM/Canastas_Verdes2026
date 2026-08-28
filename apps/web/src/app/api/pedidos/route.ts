import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ESTADOS = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "cancelado",
] as const;

type EstadoPedido = (typeof ESTADOS)[number];

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

  return token || null;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

async function requireAdmin(request: Request) {
  const token = tokenFrom(request);

  if (!token) {
    throw new Error("NO_AUTH");
  }

  const decoded = await adminAuth.verifyIdToken(token);

  if (decoded.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}

function normalizeEstado(value: unknown): EstadoPedido | null {
  if (
    typeof value === "string" &&
    ESTADOS.includes(value as EstadoPedido)
  ) {
    return value as EstadoPedido;
  }

  return null;
}

function normalizeDate(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function mapPedido(
  document: FirebaseFirestore.QueryDocumentSnapshot,
) {
  const data = document.data();

  return {
    id: document.id,

    usuarioId:
      typeof data.usuarioId === "string"
        ? data.usuarioId
        : "",

    productos: Array.isArray(data.productos)
      ? data.productos
      : [],

    subtotal:
      typeof data.subtotal === "number"
        ? data.subtotal
        : 0,

    total:
      typeof data.total === "number"
        ? data.total
        : 0,

    estado:
      normalizeEstado(data.estado) ??
      "pendiente",

    reservaId:
      typeof data.reservaId === "string"
        ? data.reservaId
        : null,

    IdMunicipalidad:
      typeof data.IdMunicipalidad === "string"
        ? data.IdMunicipalidad
        : "",

    direccionEntrega:
      typeof data.direccionEntrega === "string"
        ? data.direccionEntrega
        : "",

    repartidorId:
      typeof data.repartidorId === "string"
        ? data.repartidorId
        : null,

    fechaCreacion:
      normalizeDate(data.fechaCreacion),

    ultimaActualizacion:
      normalizeDate(data.ultimaActualizacion),

    fechaCancelacion:
      normalizeDate(data.fechaCancelacion),
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);

    const estadoParam = url.searchParams.get("estado");
    const estado = estadoParam
      ? normalizeEstado(estadoParam)
      : null;

    if (estadoParam && !estado) {
      return errorResponse(
        "El estado solicitado no es válido.",
        400,
      );
    }

    const snapshot = await adminDb
      .collection("pedidos")
      .get();

    let pedidos = snapshot.docs.map(mapPedido);

    if (estado) {
      pedidos = pedidos.filter(
        (pedido) => pedido.estado === estado,
      );
    }

    pedidos.sort((a, b) => {
      if (!a.fechaCreacion) return 1;
      if (!b.fechaCreacion) return -1;

      return (
        new Date(b.fechaCreacion).getTime() -
        new Date(a.fechaCreacion).getTime()
      );
    });

    return NextResponse.json({
      success: true,
      data: pedidos,
    });
  } catch (error) {
    console.error(
      "Error obteniendo pedidos:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "NO_AUTH"
    ) {
      return errorResponse(
        "Debes iniciar sesión.",
        401,
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return errorResponse(
        "Solo un administrador puede consultar los pedidos.",
        403,
      );
    }

    return errorResponse(
      "No fue posible cargar los pedidos.",
      500,
    );
  }
}

