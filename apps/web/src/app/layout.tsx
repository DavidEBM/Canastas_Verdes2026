import type { Metadata, Viewport } from "next";

import "./globals.css";

import CookieConsent from "@/components/CookieConsent";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AlliesCarousel from "@/components/layout/AlliesCarousel";
import Cart from "@/components/tienda/Cart";
import NotificationManager from "@/components/notifications/NotificationManager";
import { CartProvider } from "@/hooks/useCart";

export const metadata: Metadata = {
  title: "Canastas Verdes",
  description:
    "Productos frescos del campo directamente para nuestra comunidad.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <CartProvider>
          <div className="flex min-h-dvh flex-col">
            {/* Menú superior */}
            <Navbar />

            {/* Contenido */}
            <main className="flex-1">
              {children}
            </main>

            {/* Aliados y comunidades */}
            <AlliesCarousel />

            {/* Pie de página */}
            <Footer />

            {/* Carrito */}
            <Cart />

            {/* Consentimiento de cookies */}
            <CookieConsent />

            {/* Notificaciones Web Push */}
            <NotificationManager />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
