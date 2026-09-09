import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

type TipoPQRDSF = "P" | "Q" | "R" | "D" | "S" | "F";

const TIPOS_PQRDSF: Record<TipoPQRDSF, string> = {
  P: "Petición",
  Q: "Queja",
  R: "Reclamo",
  D: "Denuncia",
  S: "Sugerencia",
  F: "Felicitación",
};

const ESTADO_INICIAL = "recibido";
const MAX_MENSAJE = 500;

/*
 * ============================================================
 * FUNCIONES AUXILIARES
 * ============================================================
 */

function limpiarTexto(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim();
}

function esTipoPQRDSF(value: unknown): value is TipoPQRDSF {
  return (
    value === "P" ||
    value === "Q" ||
    value === "R" ||
    value === "D" ||
    value === "S" ||
    value === "F"
  );
}

function esCorreoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

/*
 * ============================================================
 * POST /api/pqrdsf
 * ============================================================
 */

export async function POST(request: NextRequest) {
  try {
    /*
     * --------------------------------------------------------
     * 1. Leer cuerpo
     * --------------------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "El cuerpo de la solicitud no contiene un JSON válido.",
        },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          ok: false,
          error: "Los datos enviados no son válidos.",
        },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;

    /*
     * --------------------------------------------------------
     * 2. Obtener datos
     * --------------------------------------------------------
     */

    const nombre = limpiarTexto(data.nombre);
    const correo = limpiarTexto(data.correo).toLowerCase();
    const telefono = limpiarTexto(data.telefono);
    const asunto = limpiarTexto(data.asunto).toUpperCase();
    const mensaje = limpiarTexto(data.mensaje);

    /*
     * --------------------------------------------------------
     * 3. Validaciones
     * --------------------------------------------------------
     */

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          error: "El nombre es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!correo) {
      return NextResponse.json(
        {
          ok: false,
          error: "El correo electrónico es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!esCorreoValido(correo)) {
      return NextResponse.json(
        {
          ok: false,
          error: "El correo electrónico no tiene un formato válido.",
        },
        { status: 400 },
      );
    }

    if (!esTipoPQRDSF(asunto)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debes seleccionar un tipo de PQRDSF válido.",
        },
        { status: 400 },
      );
    }

    if (!mensaje) {
      return NextResponse.json(
        {
          ok: false,
          error: "El mensaje es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (mensaje.length > MAX_MENSAJE) {
      return NextResponse.json(
        {
          ok: false,
          error: `El mensaje no puede superar los ${MAX_MENSAJE} caracteres.`,
        },
        { status: 400 },
      );
    }

    /*
     * --------------------------------------------------------
     * 4. Identificar usuario autenticado
     *
     * El formulario también puede utilizarse sin iniciar sesión.
     * Si existe un token válido, guardamos el UID.
     * --------------------------------------------------------
     */

    let uid: string | null = null;

    const authorization = request.headers.get("authorization");

    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.substring("Bearer ".length).trim();

      if (token) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(token);
          uid = decodedToken.uid;
        } catch (error) {
          /*
           * No rechazamos la PQRDSF por un token inválido.
           * Simplemente la registramos como solicitud anónima.
           */
          console.warn(
            "Token de Firebase inválido al registrar PQRDSF:",
            error,
          );
        }
      }
    }

    /*
     * --------------------------------------------------------
     * 5. Crear documento en Firestore
     * --------------------------------------------------------
     */

    const pqrRef = adminDb.collection("PQRDSF").doc();

    const ahora = Timestamp.now();

    await pqrRef.set({
      id: pqrRef.id,

      uid,

      nombre,
      correo,
      telefono: telefono || null,

      asunto,
      asuntoNombre: TIPOS_PQRDSF[asunto],

      mensaje,

      estado: ESTADO_INICIAL,

      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    });

    /*
     * --------------------------------------------------------
     * 6. Respuesta exitosa
     * --------------------------------------------------------
     */

    return NextResponse.json(
      {
        ok: true,
        id: pqrRef.id,
        mensaje: "Tu PQRDSF fue registrada correctamente.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error registrando PQRDSF:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Ocurrió un error al registrar la PQRDSF.",
      },
      { status: 500 },
    );
  }
}

