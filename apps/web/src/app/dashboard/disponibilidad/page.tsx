"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

type Scope = "default" | "producto" | "categoria" | "grupo";
type Variant = "soft" | "solid" | "outline";

interface Product {
  id: string;
  nombre: string;
  categoria?: string;
  grupo?: string;
  grupos?: string[];
}

interface Configuration {
  id: string;
  scope: Scope;
  targetId: string;
  message: string;
  active: boolean;
  color: string;
  variant: Variant;
  priority: number;
}

interface FormState {
  scope: Scope;
  targetId: string;
  message: string;
  color: string;
  variant: Variant;
  priority: string;
  active: boolean;
}

const emptyForm: FormState = {
  scope: "default",
  targetId: "__default__",
  message: "Sin stock",
  color: "#b42318",
  variant: "soft",
  priority: "0",
  active: true,
};

const scopeLabels: Record<Scope, string> = {
  default: "Predeterminado",
  producto: "Producto individual",
  categoria: "Categoría",
  grupo: "Grupo existente",
};

export default function DashboardDisponibilidadPage() {
  const { user, loading, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.categoria).filter(Boolean))].sort(),
    [products],
  );
  const groups = useMemo(
    () => [...new Set(products.flatMap((product) => [product.grupo, ...(product.grupos ?? [])]).filter(Boolean))].sort(),
    [products],
  );

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      if (!user) throw new Error("Debes iniciar sesión.");
      const token = await user.getIdToken(true);
      const response = await fetch(path, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers ?? {}),
        },
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as { message?: string; data?: unknown } | null;
      if (!response.ok) throw new Error(result?.message || "No fue posible completar la operación.");
      return result;
    },
    [user],
  );

  const load = useCallback(async () => {
    try {
      setLoadingData(true);
      setError("");
      const [productsResult, configurationsResult] = await Promise.all([
        request("/api/productos?admin=1"),
        request("/api/disponibilidad"),
      ]);
      setProducts(Array.isArray(productsResult?.data) ? productsResult.data as Product[] : []);
      setConfigurations(Array.isArray(configurationsResult?.data) ? configurationsResult.data as Configuration[] : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible cargar las configuraciones.");
    } finally {
      setLoadingData(false);
    }
  }, [request]);

  useEffect(() => {
    if (user && role === "admin") void load();
    else if (!loading) setLoadingData(false);
  }, [load, loading, role, user]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }

  async function save() {
    const message = form.message.trim();
    const targetId = form.scope === "default" ? "__default__" : form.targetId.trim();
    if (!message || (form.scope !== "default" && !targetId)) {
      setError("El mensaje y el destino seleccionado son obligatorios.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = { ...form, targetId, message, priority: Number(form.priority) };
      await request(editingId ? `/api/disponibilidad/${editingId}` : "/api/disponibilidad", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(editingId ? "Configuración actualizada." : "Configuración creada.");
      resetForm();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(configuration: Configuration) {
    if (!window.confirm(`¿Eliminar el mensaje “${configuration.message}”?`)) return;
    try {
      await request(`/api/disponibilidad/${configuration.id}`, { method: "DELETE" });
      setNotice("Configuración eliminada.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible eliminar la configuración.");
    }
  }

  function edit(configuration: Configuration) {
    setEditingId(configuration.id);
    setForm({
      scope: configuration.scope,
      targetId: configuration.targetId,
      message: configuration.message,
      color: configuration.color,
      variant: configuration.variant,
      priority: String(configuration.priority),
      active: configuration.active,
    });
    setError("");
    setNotice("");
  }

  if (loading || loadingData) {
    return <main className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--muted)]">Cargando disponibilidad…</main>;
  }
  if (!user || role !== "admin") {
    return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"><h1 className="text-2xl font-bold">Acceso restringido</h1><p className="mt-2 text-sm text-[var(--muted)]">Solo los administradores pueden gestionar disponibilidad.</p></div></main>;
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Catálogo · experiencia de compra</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Mensajes de disponibilidad</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Define un mensaje para un producto, una categoría o el estado predeterminado. El stock y las reglas de compra permanecen separados.</p>
      </header>

      {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>{error || notice}</div>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{editingId ? "Editar configuración" : "Nueva configuración"}</h2><p className="mt-1 text-xs text-[var(--muted)]">La vista previa se actualiza mientras escribes.</p></div>{editingId && <button type="button" onClick={resetForm} className="text-xs font-semibold text-[var(--primary)]">Cancelar</button>}</div>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Aplicar a<select value={form.scope} onChange={(event) => updateForm("scope", event.target.value as Scope)} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"><option value="default">{scopeLabels.default}</option><option value="producto">{scopeLabels.producto}</option><option value="categoria">{scopeLabels.categoria}</option><option value="grupo">{scopeLabels.grupo}</option></select></label>
            {form.scope === "producto" && <label className="block text-sm font-semibold">Producto<select value={form.targetId} onChange={(event) => updateForm("targetId", event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"><option value="">Seleccionar producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}</select></label>}
            {form.scope === "categoria" && <label className="block text-sm font-semibold">Categoría<select value={form.targetId} onChange={(event) => updateForm("targetId", event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"><option value="">Seleccionar categoría</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
            {form.scope === "grupo" && <label className="block text-sm font-semibold">Grupo existente<select value={form.targetId} onChange={(event) => updateForm("targetId", event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"><option value="">Seleccionar grupo</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>}
            <label className="block text-sm font-semibold">Texto del mensaje<textarea value={form.message} onChange={(event) => updateForm("message", event.target.value)} maxLength={160} rows={3} className="mt-1 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-normal" placeholder="Disponible por encargo" /></label>
            <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold">Color<input type="color" value={form.color} onChange={(event) => updateForm("color", event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-1" /></label><label className="text-sm font-semibold">Variante<select value={form.variant} onChange={(event) => updateForm("variant", event.target.value as Variant)} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm font-normal"><option value="soft">Suave</option><option value="solid">Sólida</option><option value="outline">Contorno</option></select></label><label className="text-sm font-semibold">Prioridad<input type="number" min="0" max="1000" value={form.priority} onChange={(event) => updateForm("priority", event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal" /></label></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} /> Configuración activa</label>
            <div className="flex items-center gap-3"><button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear mensaje"}</button>{!editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-semibold">Limpiar</button>}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Vista previa</p><div className="mt-5 flex min-h-40 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#e8f1dc,#f7f4e8)] p-6"><span className={`rounded-lg px-4 py-2 text-sm font-bold ${form.variant === "solid" ? "text-white" : "bg-white/90"} ${form.variant === "outline" ? "border-2" : ""}`} style={{ borderColor: form.color, backgroundColor: form.variant === "solid" ? form.color : undefined, color: form.variant === "solid" ? "#fff" : form.color }}>{form.message.trim() || "Escribe un mensaje"}</span></div><p className="mt-4 text-xs leading-5 text-[var(--muted)]">Se muestra solamente cuando el producto no puede comprarse. La disponibilidad real continúa validándose en el backend.</p></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="font-semibold">Configuraciones guardadas</h2></div>{configurations.length === 0 ? <p className="p-8 text-center text-sm text-[var(--muted)]">Aún no hay configuraciones. Se usará “Sin stock”.</p> : <div className="divide-y divide-[var(--border)]">{configurations.map((configuration) => <div key={configuration.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">{scopeLabels[configuration.scope]}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${configuration.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{configuration.active ? "Activa" : "Inactiva"}</span></div><p className="mt-2 truncate font-semibold">{configuration.message}</p><p className="mt-1 text-xs text-[var(--muted)]">Destino: {configuration.scope === "default" ? "todos los productos" : configuration.scope === "producto" ? products.find((product) => product.id === configuration.targetId)?.nombre || configuration.targetId : configuration.targetId} · prioridad {configuration.priority}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => edit(configuration)} className="rounded-lg border border-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary)]">Editar</button><button type="button" onClick={() => void remove(configuration)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Eliminar</button></div></div>)}</div>}</section>
    </main>
  );
}
