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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname, PROTECTED_API)) {
    return NextResponse.next();
  }

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
