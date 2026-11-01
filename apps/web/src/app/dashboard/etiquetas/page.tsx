"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

interface Label { id: string; name: string; description: string; color: string; active: boolean; automaticKey: string | null }
interface ManagedUser { uid: string; email: string; displayName: string; role: string; labelIds: string[]; labels: Array<{ id: string; name: string; color: string }> }

const emptyForm = { name: "", description: "", color: "#356859", active: true };

export default function DashboardEtiquetasPage() {
  const { user, loading, role } = useAuth();
  const [labels, setLabels] = useState<Label[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    if (!user) throw new Error("Debes iniciar sesión.");
    const token = await user.getIdToken(true);
    const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers ?? {}) }, cache: "no-store" });
    const result = (await response.json().catch(() => null)) as { message?: string; data?: unknown; labels?: unknown } | null;
    if (!response.ok) throw new Error(result?.message || "No fue posible completar la operación.");
    return result;
  }, [user]);

  const load = useCallback(async () => {
    try {
      setLoadingData(true); setError("");
      const [usersResult, labelsResult] = await Promise.all([
        request("/api/usuarios/roles"),
        request("/api/usuarios/etiquetas"),
      ]);
      setLabels(Array.isArray(labelsResult?.data) ? labelsResult.data as Label[] : []);
      setUsers(Array.isArray(usersResult?.data) ? usersResult.data as ManagedUser[] : []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible cargar las etiquetas."); }
    finally { setLoadingData(false); }
  }, [request]);

  useEffect(() => { if (user && role === "admin") void load(); else if (!loading) setLoadingData(false); }, [load, loading, role, user]);

  const filteredUsers = useMemo(() => filter === "all" ? users : users.filter((item) => item.labelIds.includes(filter)), [filter, users]);

  function reset() { setForm(emptyForm); setEditingId(null); }
  function edit(label: Label) { setEditingId(label.id); setForm({ name: label.name, description: label.description, color: label.color, active: label.active }); setError(""); setNotice(""); }

  async function saveLabel() {
    if (!form.name.trim()) { setError("El nombre de la etiqueta es obligatorio."); return; }
    try {
      setSaving(true); setError("");
      await request(editingId ? `/api/usuarios/etiquetas/${editingId}` : "/api/usuarios/etiquetas", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(form) });
      setNotice(editingId ? "Etiqueta actualizada." : "Etiqueta creada."); reset(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible guardar la etiqueta."); }
    finally { setSaving(false); }
  }

  async function toggle(label: Label) {
    try { await request(`/api/usuarios/etiquetas/${label.id}`, { method: "PATCH", body: JSON.stringify({ active: !label.active }) }); setNotice("Estado de etiqueta actualizado."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible cambiar el estado."); }
  }

  async function remove(label: Label) {
    if (!window.confirm(`¿Eliminar “${label.name}”? Se retirará de los usuarios asociados.`)) return;
    try { await request(`/api/usuarios/etiquetas/${label.id}`, { method: "DELETE" }); setNotice("Etiqueta eliminada y asociaciones retiradas."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible eliminar la etiqueta."); }
  }

  async function changeAssignment(uid: string, labelId: string, assigned: boolean) {
    try { setError(""); await request("/api/usuarios/roles", { method: "POST", body: JSON.stringify({ usuarioId: uid, ...(assigned ? { removeLabelId: labelId } : { addLabelId: labelId }) }) }); setNotice(assigned ? "Etiqueta retirada." : "Etiqueta asignada."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible actualizar la asignación."); }
  }

  if (loading || loadingData) return <main className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--muted)]">Cargando etiquetas…</main>;
  if (!user || role !== "admin") return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"><h1 className="text-2xl font-bold">Acceso restringido</h1><p className="mt-2 text-sm text-[var(--muted)]">Solo los administradores pueden gestionar etiquetas.</p></div></main>;

  return <main className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Segmentación · permisos separados</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Etiquetas de usuarios</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Clasifica usuarios sin conceder permisos. Las etiquetas automáticas se calculan con la fecha de registro y los pedidos; las demás se asignan explícitamente.</p></header>
    {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>{error || notice}</div>}
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold">{editingId ? "Editar etiqueta" : "Nueva etiqueta"}</h2><p className="mt-1 text-xs text-[var(--muted)]">Nombre, descripción y color visible.</p></div>{editingId && <button type="button" onClick={reset} className="text-xs font-semibold text-[var(--primary)]">Cancelar</button>}</div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Nombre<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal" /></label><label className="block text-sm font-semibold">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={240} rows={3} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-normal" /></label><div className="flex items-center gap-3"><label className="text-sm font-semibold">Color<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="mt-1 h-10 w-16 rounded border border-[var(--border)] p-1" /></label><label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activa</label></div><button type="button" disabled={saving} onClick={() => void saveLabel()} className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear etiqueta"}</button></div></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Catálogo de etiquetas</h2><p className="mt-1 text-xs text-[var(--muted)]">{labels.length} configuradas</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{labels.map((label) => <article key={label.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${label.color}22`, color: label.color }}>{label.name}</span><p className="mt-2 text-xs text-[var(--muted)]">{label.description || "Sin descripción"}</p></div><span className={`text-[10px] font-semibold uppercase ${label.active ? "text-green-700" : "text-gray-500"}`}>{label.active ? "Activa" : "Inactiva"}</span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => edit(label)} className="rounded border border-[var(--primary)] px-2 py-1 text-xs font-semibold text-[var(--primary)]">Editar</button><button type="button" onClick={() => void toggle(label)} className="rounded border border-[var(--border)] px-2 py-1 text-xs font-semibold">{label.active ? "Desactivar" : "Activar"}</button><button type="button" onClick={() => void remove(label)} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Eliminar</button></div></article>)}</div></div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Asignaciones</h2><p className="mt-1 text-xs text-[var(--muted)]">Filtra usuarios y asigna varias etiquetas a la misma cuenta.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="all">Todos los usuarios</option>{labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}</select></div>{filteredUsers.length === 0 ? <p className="p-8 text-center text-sm text-[var(--muted)]">No hay usuarios que coincidan.</p> : <div className="divide-y divide-[var(--border)]">{filteredUsers.map((managedUser) => <div key={managedUser.uid} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="truncate font-semibold">{managedUser.displayName || managedUser.email || managedUser.uid}</p><p className="truncate text-xs text-[var(--muted)]">{managedUser.email} · rol: {managedUser.role}</p><div className="mt-2 flex flex-wrap gap-1.5">{managedUser.labels.map((label) => <span key={label.id} className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${label.color}22`, color: label.color }}>{label.name}</span>)}</div></div><div className="flex flex-wrap gap-2">{labels.filter((label) => label.active).map((label) => { const assigned = managedUser.labelIds.includes(label.id); return <button key={label.id} type="button" onClick={() => void changeAssignment(managedUser.uid, label.id, assigned)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${assigned ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{assigned ? "✓ " : "+ "}{label.name}</button>; })}</div></div>)}</div>}</section>
  </main>;
}
