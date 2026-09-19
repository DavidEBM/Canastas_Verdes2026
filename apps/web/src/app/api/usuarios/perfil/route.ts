import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * Versión vigente de los términos y condiciones.
 */
const VERSION_TERMINOS = "1.0";

/**
 * Obtiene el token Bearer enviado por el cliente.
 */
function getToken(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    throw new Error("NO_AUTH");
  }

  const token =
    authorization.substring(7).trim();

  if (!token) {
    throw new Error("NO_AUTH");
  }

  return token;
}

/**
 * Verifica que el usuario esté autenticado
 * mediante Firebase Authentication.
 */
async function getAuthenticatedUser(
  request: Request,
) {
  const token = getToken(request);

  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error(
      "Error verificando token:",
      error,
    );

    throw new Error("NO_AUTH");
  }
}

/**
 * Respuesta estándar para errores.
 */
function errorResponse(error: unknown) {
  if (
    error instanceof Error &&
    error.message === "NO_AUTH"
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "No autenticado.",
      },
      { status: 401 },
    );
  }

  console.error(
    "Error gestionando perfil:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible gestionar el perfil.",
    },
    { status: 500 },
  );
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| Crea el perfil de un usuario después de registrarse
| en Firebase Authentication.
|
| Documento:
| usuarios/{UID}
|
| Campos:
| Nombres
| Apellidos
| Correo
| Telefono
| Direccion
| Rol
| AceptacionTerminos
| ultimaActualizacion
|
| El UID utilizado como ID del documento es exactamente
| el UID generado por Firebase Authentication.
|
| El rol inicial siempre será "consumidor".
|
|--------------------------------------------------------------------------
*/

export async function POST(request: Request) {
  try {
    const decoded =
      await getAuthenticatedUser(request);

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos inválidos.",
        },
        { status: 400 },
      );
    }

    const input =
      body as {
        Nombres?: unknown;
        Apellidos?: unknown;
        Correo?: unknown;
        Telefono?: unknown;
        Direccion?: unknown;
        AceptacionTerminos?: unknown;
      };

    const nombres =
      typeof input.Nombres === "string"
        ? input.Nombres.trim()
        : "";

    const apellidos =
      typeof input.Apellidos === "string"
        ? input.Apellidos.trim()
        : "";

    const correo =
      typeof input.Correo === "string"
        ? input.Correo.trim()
        : decoded.email ?? "";

    const telefono =
      typeof input.Telefono === "string"
        ? input.Telefono.trim()
        : "";

    const direccion =
      typeof input.Direccion === "string"
        ? input.Direccion.trim()
        : "";

    /*
     * Validar aceptación de términos.
     *
     * La aceptación se genera en el servidor y la fecha
     * no es proporcionada por el cliente.
     */
    let terminosAceptados = false;

    if (
      input.AceptacionTerminos &&
      typeof input.AceptacionTerminos === "object"
    ) {
      const aceptacion =
        input.AceptacionTerminos as {
          aceptado?: unknown;
          version?: unknown;
          tipo?: unknown;
        };

      terminosAceptados =
        aceptacion.aceptado === true &&
        aceptacion.version === VERSION_TERMINOS &&
        aceptacion.tipo ===
          "terminos-condiciones";
    }

    if (!terminosAceptados) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes aceptar los términos y condiciones de uso.",
        },
        { status: 400 },
      );
    }

    if (!nombres) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El nombre es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (nombres.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El nombre es demasiado largo.",
        },
        { status: 400 },
      );
    }

    if (!apellidos) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los apellidos son obligatorios.",
        },
        { status: 400 },
      );
    }

    if (apellidos.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los apellidos son demasiado largos.",
        },
        { status: 400 },
      );
    }

    if (!correo) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El correo es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (correo.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El correo es demasiado largo.",
        },
        { status: 400 },
      );
    }

    if (telefono.length > 30) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El teléfono es demasiado largo.",
        },
        { status: 400 },
      );
    }

    if (direccion.length > 250) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La dirección es demasiado larga.",
        },
        { status: 400 },
      );
    }

    /*
     * El UID de Firebase Authentication es utilizado
     * directamente como ID del documento de Firestore.
     */
    const userRef =
      adminDb
        .collection("usuarios")
        .doc(decoded.uid);

    const existingUser =
      await userRef.get();

    /*
     * Si el perfil ya existe, NO lo sobrescribimos.
     *
     * Esto evita modificar accidentalmente información
     * existente, especialmente el Rol.
     */
    if (existingUser.exists) {
      return NextResponse.json({
        success: true,
        message:
          "El perfil del usuario ya existe.",
        data: {
          uid: decoded.uid,
        },
      });
    }

    /*
     * Creamos el documento del usuario.
     *
     * La fecha de aceptación se genera en el servidor
     * mediante serverTimestamp().
     */
    await userRef.set({
      Nombres: nombres,
      Apellidos: apellidos,
      Correo: correo,
      Telefono: telefono,
      Direccion: direccion,
      Rol: "consumidor",

      AceptacionTerminos: {
        aceptado: true,
        version: VERSION_TERMINOS,
        tipo: "terminos-condiciones",
        fecha: FieldValue.serverTimestamp(),
      },

      ultimaActualizacion:
        FieldValue.serverTimestamp(),
    });

    /*
     * También establecemos el nombre visible
     * en Firebase Authentication.
     */
    await adminAuth.updateUser(
      decoded.uid,
      {
        displayName:
          `${nombres} ${apellidos}`.trim(),
      },
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Perfil creado correctamente.",
        data: {
          uid: decoded.uid,
          Nombres: nombres,
          Apellidos: apellidos,
          Correo: correo,
          Telefono: telefono,
          Direccion: direccion,
          Rol: "consumidor",

          AceptacionTerminos: {
            aceptado: true,
            version: VERSION_TERMINOS,
            tipo: "terminos-condiciones",
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Obtiene el perfil del usuario autenticado.
|
| Documento:
| usuarios/{UID}
|
|--------------------------------------------------------------------------
*/

export async function GET(request: Request) {
  try {
    const decoded =
      await getAuthenticatedUser(request);

    const userRef =
      adminDb
        .collection("usuarios")
        .doc(decoded.uid);

    const snapshot =
      await userRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se encontró el perfil del usuario.",
        },
        { status: 404 },
      );
    }

    const data =
      snapshot.data();

    const aceptacion =
      data?.AceptacionTerminos;

    return NextResponse.json({
      success: true,
      data: {
        uid: decoded.uid,

        Nombres:
          typeof data?.Nombres === "string"
            ? data.Nombres
            : "",

        Apellidos:
          typeof data?.Apellidos === "string"
            ? data.Apellidos
            : "",

        Correo:
          typeof data?.Correo === "string"
            ? data.Correo
            : decoded.email ?? "",

        Telefono:
          typeof data?.Telefono === "string"
            ? data.Telefono
            : "",

        Direccion:
          typeof data?.Direccion === "string"
            ? data.Direccion
            : "",

        Rol:
          typeof data?.Rol === "string"
            ? data.Rol
            : "consumidor",

        AceptacionTerminos:
          aceptacion
            ? {
                aceptado:
                  aceptacion.aceptado === true,

                version:
                  typeof aceptacion.version ===
                  "string"
                    ? aceptacion.version
                    : "",

                tipo:
                  typeof aceptacion.tipo ===
                  "string"
                    ? aceptacion.tipo
                    : "",
              }
            : null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/*
|--------------------------------------------------------------------------
| PUT
|--------------------------------------------------------------------------
|
| Actualiza únicamente:
|
| Nombres
| Apellidos
| Telefono
| Direccion
| ultimaActualizacion
|
| NO modifica:
|
| Correo
| Rol
| AceptacionTerminos
|
|--------------------------------------------------------------------------
*/

export async function PUT(request: Request) {
  try {
    const decoded =
      await getAuthenticatedUser(request);

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos inválidos.",
        },
        { status: 400 },
      );
    }

    const input =
      body as {
        Nombres?: unknown;
        Apellidos?: unknown;
        Telefono?: unknown;
        Direccion?: unknown;
      };

    const nombres =
      typeof input.Nombres === "string"
        ? input.Nombres.trim()
        : "";

    const apellidos =
      typeof input.Apellidos === "string"
        ? input.Apellidos.trim()
        : "";

    const telefono =
      typeof input.Telefono === "string"
        ? input.Telefono.trim()
        : "";

    const direccion =
      typeof input.Direccion === "string"
        ? input.Direccion.trim()
        : "";

    if (!nombres) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El nombre es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (nombres.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El nombre es demasiado largo.",
        },
        { status: 400 },
      );
    }

    if (apellidos.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los apellidos son demasiado largos.",
        },
        { status: 400 },
      );
    }

    if (telefono.length > 30) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El teléfono es demasiado largo.",
        },
        { status: 400 },
      );
    }

    if (direccion.length > 250) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La dirección es demasiado larga.",
        },
        { status: 400 },
      );
    }

    const userRef =
      adminDb
        .collection("usuarios")
        .doc(decoded.uid);

    const snapshot =
      await userRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se encontró el perfil del usuario.",
        },
        { status: 404 },
      );
    }

    /*
     * Solamente actualizamos los campos permitidos.
     *
     * El Rol, Correo y AceptacionTerminos permanecen intactos.
     */
    await userRef.update({
      Nombres: nombres,
      Apellidos: apellidos,
      Telefono: telefono,
      Direccion: direccion,
      ultimaActualizacion:
        FieldValue.serverTimestamp(),
    });

    /*
     * Actualizamos también el nombre visible
     * de Firebase Authentication.
     */
    await adminAuth.updateUser(
      decoded.uid,
      {
        displayName:
          `${nombres} ${apellidos}`.trim(),
      },
    );

    return NextResponse.json({
      success: true,
      message:
        "Perfil actualizado correctamente.",
      data: {
        Nombres: nombres,
        Apellidos: apellidos,
        Telefono: telefono,
        Direccion: direccion,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}