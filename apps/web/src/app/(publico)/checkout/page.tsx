"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

function price(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || items.length === 0) return;
    setSubmitting(true); setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/pedidos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })), IdMunicipalidad: municipality, direccionEntrega: address }),
      });
      const payload: unknown = await response.json();
      const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string" ? payload.message : "No fue posible confirmar el pedido.";
      if (!response.ok) throw new Error(message);
      clearCart();
      const id = payload && typeof payload === "object" && "data" in payload && payload.data && typeof payload.data === "object" && "pedidoId" in payload.data && typeof payload.data.pedidoId === "string" ? payload.data.pedidoId : "";
      router.replace(id ? `/pedidos/${id}` : "/pedidos");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible confirmar el pedido."); }
    finally { setSubmitting(false); }
  };

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-16">Cargando checkout…</main>;
  if (!user) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-bold">Inicia sesión para continuar</h1><p className="mt-2 text-[var(--muted)]">Necesitamos tu cuenta para reservar los productos y registrar el pedido.</p><Link href="/login" className="mt-6 inline-flex rounded-lg bg-[var(--primary)] px-5 py-3 font-semibold text-[var(--primary-foreground)]">Iniciar sesión</Link></main>;
  if (items.length === 0) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-bold">Tu cesta está vacía</h1><Link href="/tienda" className="mt-6 inline-flex rounded-lg bg-[var(--primary)] px-5 py-3 font-semibold text-[var(--primary-foreground)]">Ir a la tienda</Link></main>;

  return <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14"><h1 className="text-3xl font-bold">Confirmar pedido</h1><p className="mt-2 text-sm text-[var(--muted)]">El inventario y los precios se validan nuevamente al confirmar.</p>
    <form onSubmit={submit} className="mt-8 grid gap-6 md:grid-cols-[1fr_0.8fr]">
      <section className="space-y-4 rounded-xl border border-[var(--border)] p-5"><h2 className="font-bold">Entrega</h2>
        <label className="block text-sm font-medium">ID de municipalidad<input required value={municipality} onChange={(event) => setMunicipality(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" placeholder="Municipalidad de entrega" /></label>
        <label className="block text-sm font-medium">Dirección<textarea required minLength={5} maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-[var(--border)] px-3 py-2" placeholder="Dirección completa de entrega" /></label>
      </section>
      <aside className="rounded-xl border border-[var(--border)] p-5"><h2 className="font-bold">Resumen</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={item.product.id} className="flex justify-between gap-3 text-sm"><span>{item.product.nombre} × {item.quantity}</span><span>{price(item.product.precio * item.quantity)}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-[var(--border)] pt-4 font-bold"><span>Total</span><span>{price(subtotal)}</span></div>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<button disabled={submitting} className="mt-5 w-full rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--primary-foreground)] disabled:opacity-60">{submitting ? "Confirmando…" : "Confirmar y reservar"}</button>
      </aside>
    </form>
  </main>;
}
