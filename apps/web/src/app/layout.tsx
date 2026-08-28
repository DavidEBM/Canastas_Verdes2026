import type { Metadata, Viewport } from "next";

import "./globals.css";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Cart from "@/components/tienda/Cart";
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

            {/* Pie de página */}
            <Footer />
            <Cart />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
