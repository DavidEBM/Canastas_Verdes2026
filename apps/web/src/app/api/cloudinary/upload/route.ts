import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

// Keep multipart requests below common serverless request limits.
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getCloudinary() {
  const rawUrl = process.env.CLOUDINARY_URL?.trim();
  if (!rawUrl) throw new Error("CLOUDINARY_NOT_CONFIGURED");

  const parsed = new URL(rawUrl);

  if (
    parsed.protocol !== "cloudinary:" ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password
  ) {
    throw new Error("CLOUDINARY_CONFIG_INVALID");
  }

  cloudinary.config({
    cloud_name: parsed.hostname,
    api_key: decodeURIComponent(parsed.username),
    api_secret: decodeURIComponent(parsed.password),
  });

  return cloudinary;
}

async function uploadImage(
  file: File,
  publicId: string,
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const client = getCloudinary();

  return new Promise<{
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  }>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: "CanastasVerdes",
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result ?? {});
      },
    );

    stream.end(buffer);
  });
}

function safePublicId(value: string): string {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return cleaned || "producto-" + Date.now();
}

function errorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "NO_AUTH") {
      return NextResponse.json(
        { success: false, message: "Debes iniciar sesión." },
        { status: 401 },
      );
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, message: "Solo un administrador puede cargar imágenes." },
        { status: 403 },
      );
    }
    if (error.message === "CLOUDINARY_NOT_CONFIGURED") {
      return NextResponse.json(
        { success: false, message: "Cloudinary no está configurado en el servidor." },
        { status: 503 },
      );
    }
    if (error.message === "CLOUDINARY_CONFIG_INVALID") {
      return NextResponse.json(
        { success: false, message: "La configuración de Cloudinary no es válida." },
        { status: 500 },
      );
    }
  }

  const cloudinaryError =
    error && typeof error === "object"
      ? (error as {
          name?: unknown;
          message?: unknown;
          http_code?: unknown;
          error?: unknown;
          response?: unknown;
        })
      : null;

  console.error("Error gestionando imagen en Cloudinary:", {
    name: cloudinaryError?.name,
    message: cloudinaryError?.message,
    http_code: cloudinaryError?.http_code,
    details: cloudinaryError?.error,
    response: cloudinaryError?.response,
    stack: error instanceof Error ? error.stack : undefined,
  });

  const developmentMessage =
    typeof cloudinaryError?.message === "string"
      ? cloudinaryError.message
      : error instanceof Error
        ? error.message
        : "No fue posible gestionar la imagen.";

  return NextResponse.json(
    {
      success: false,
      message:
        process.env.NODE_ENV === "development"
          ? developmentMessage
          : "No fue posible gestionar la imagen.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const requestedName = formData.get("imageName");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Debes seleccionar una imagen." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, message: "Solo se permiten imágenes JPG, PNG o WEBP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "La imagen no puede superar los 4 MB." },
        { status: 400 },
      );
    }

    const publicId = safePublicId(
      typeof requestedName === "string" ? requestedName : file.name,
    );
    const result = await uploadImage(file, publicId);

    if (!result.secure_url || !result.public_id) {
      throw new Error(result.error?.message || "Cloudinary rechazó la imagen.");
    }

    return NextResponse.json({
      success: true,
      data: { imgPath: result.secure_url, imageName: result.public_id },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json()) as { publicId?: unknown };

    if (typeof body.publicId !== "string" || !body.publicId.trim()) {
      return NextResponse.json(
        { success: false, message: "La imagen no tiene un identificador válido." },
        { status: 400 },
      );
    }

    const publicId = body.publicId.trim();
    const result = await getCloudinary().uploader.destroy(
      publicId,
      {
        resource_type: "image",
        invalidate: true,
      },
    );

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error("Cloudinary no pudo eliminar la imagen.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
