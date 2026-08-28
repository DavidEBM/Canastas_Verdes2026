import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/pedidos",
  "/dashboard",
];

const PROTECTED_API = [
  "/api/pedidos",
  "/api/usuarios",
  "/api/repartos",
  "/api/dashboard",
];

function isProtectedPath(
  pathname: string,
  paths: string[],
): boolean {
  return paths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * Las rutas API protegidas validan el Firebase ID Token
   * dentro de cada Route Handler mediante Firebase Admin.
   *
   * El middleware no intenta utilizar auth.currentUser,
   * ya que ese estado solamente existe en el navegador.
   */
  if (isProtectedPath(pathname, PROTECTED_API)) {
    return NextResponse.next();
  }

  /**
   * Las páginas protegidas también realizan su comprobación
   * de autenticación en el servidor.
   */
  if (isProtectedPath(pathname, PROTECTED_ROUTES)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/pedidos/:path*",
    "/dashboard/:path*",
    "/api/:path*",
  ],
};

