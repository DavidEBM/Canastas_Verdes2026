import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ROLES = ["usuario", "repartidor", "admin"] as const;
type Role = (typeof ROLES)[number];

function tokenFrom(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

function roleOf(claims: Record<string, unknown>): Role {
  return typeof claims.role === "string" && ROLES.includes(claims.role as Role)
    ? claims.role as Role
    : "usuario";
}

async function requireAdmin(request: Request) {
  const token = tokenFrom(request);
  if (!token) throw new Error("NO_AUTH");
  const decoded = await adminAuth.verifyIdToken(token);
  let role = roleOf(decoded);
  const seedEmail = process.env.FIREBASE_INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  if (role !== "admin" && seedEmail && decoded.email?.toLowerCase() === seedEmail) {
    const user = await adminAuth.getUser(decoded.uid);
    await adminAuth.setCustomUserClaims(decoded.uid, { ...(user.customClaims ?? {}), role: "admin" });
    role = "admin";
  }
  if (role !== "admin") throw new Error("FORBIDDEN");
  return decoded;
}

function errorResponse(error: unknown) {
  if (error instanceof Error && error.message === "NO_AUTH") return NextResponse.json({ success: false, message: "No autenticado." }, { status: 401 });
  if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ success: false, message: "Solo un administrador puede gestionar roles." }, { status: 403 });
  console.error("Error gestionando roles:", error);
  return NextResponse.json({ success: false, message: "No fue posible gestionar los roles." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const users = await adminAuth.listUsers(1000);
    return NextResponse.json({ success: true, data: users.users.map((user) => ({
      uid: user.uid, email: user.email ?? "", displayName: user.displayName ?? "", disabled: user.disabled,
      role: roleOf(user.customClaims ?? {}),
    })) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body: unknown = await request.json();
    const input = body as { usuarioId?: unknown; rol?: unknown };
    if (!input || typeof input.usuarioId !== "string" || !ROLES.includes(input.rol as Role)) {
      return NextResponse.json({ success: false, message: "Usuario o rol inválido." }, { status: 400 });
    }
    const user = await adminAuth.getUser(input.usuarioId);
    await adminAuth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: input.rol });
    return NextResponse.json({ success: true, data: { usuarioId: user.uid, rol: input.rol } });
  } catch (error) { return errorResponse(error); }
}
