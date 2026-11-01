"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Municipality { id: string; nombre: string; activo: boolean }
interface Vereda { id: string; nombre: string; IdMunicipalidad: string; activo: boolean }

export default function VeredasPage() {
  const { user, loading, role } = useAuth();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [veredas, setVeredas] = useState<Vereda[]>([]);
  const [nombre, setNombre] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    if (!user) throw new Error("Debes iniciar sesión.");
    const token = await user.getIdToken(true);
    const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || result?.error || "No fue posible completar la operación.");
    return result;
  }, [user]);

  const load = useCallback(async () => {
    try {
      setLoadingData(true); setError("");
      const [municipalitiesResult, veredasResult] = await Promise.all([request("/api/municipalidades"), request("/api/veredas")]);
      setMunicipalities(Array.isArray(municipalitiesResult?.data) ? municipalitiesResult.data : []);
      setVeredas(Array.isArray(veredasResult?.data) ? veredasResult.data : []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible cargar las veredas."); }
    finally { setLoadingData(false); }
  }, [request]);

  useEffect(() => { if (user && role === "admin") void load(); else if (!loading) setLoadingData(false); }, [load, loading, role, user]);

  function reset() { setNombre(""); setMunicipio(""); setEditingId(null); }
  function edit(vereda: Vereda) { setEditingId(vereda.id); setNombre(vereda.nombre); setMunicipio(vereda.IdMunicipalidad); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!nombre.trim() || !municipio) { setError("El nombre y el municipio son obligatorios."); return; }
    try { setSaving(true); setError(""); await request(editingId ? `/api/veredas/${editingId}` : "/api/veredas", { method: editingId ? "PATCH" : "POST", body: JSON.stringify({ nombre, IdMunicipalidad: municipio }) }); setNotice(editingId ? "Vereda actualizada." : "Vereda creada."); reset(); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible guardar la vereda."); }
    finally { setSaving(false); }
  }
  async function toggle(vereda: Vereda) { try { await request(`/api/veredas/${vereda.id}`, { method: "PATCH", body: JSON.stringify({ activo: !vereda.activo }) }); setNotice("Estado actualizado."); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible cambiar el estado."); } }

  if (loading || loadingData) return <main className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--muted)]">Cargando veredas…</main>;
  if (!user || role !== "admin") return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"><h1 className="text-2xl font-bold">Acceso restringido</h1><p className="mt-2 text-sm text-[var(--muted)]">Solo los administradores pueden gestionar veredas.</p></div></main>;

  return <main className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Geografía del productor</p><h1 className="mt-2 text-3xl font-bold">Veredas</h1><p className="mt-2 text-sm text-[var(--muted)]">Cada vereda queda vinculada a un municipio para que los perfiles no guarden asociaciones inválidas.</p></header>{(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>{error || notice}</div>}<section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-semibold">{editingId ? "Editar vereda" : "Nueva vereda"}</h2><form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"><input value={nombre} onChange={(event) => setNombre(event.target.value)} required maxLength={150} placeholder="Nombre de la vereda" className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /><select value={municipio} onChange={(event) => setMunicipio(event.target.value)} required className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Seleccionar municipio</option>{municipalities.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><button type="submit" disabled={saving} className="h-11 rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando…" : editingId ? "Guardar" : "Crear"}</button>{editingId && <button type="button" onClick={reset} className="h-11 rounded-lg border border-[var(--border)] px-5 text-sm font-semibold">Cancelar</button>}</form></section><section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><div className="divide-y divide-[var(--border)]">{veredas.length === 0 ? <p className="p-8 text-center text-sm text-[var(--muted)]">Aún no hay veredas registradas.</p> : veredas.map((vereda) => <div key={vereda.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{vereda.nombre}</p><p className="text-xs text-[var(--muted)]">{municipalities.find((item) => item.id === vereda.IdMunicipalidad)?.nombre || vereda.IdMunicipalidad}</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(vereda)} className="rounded-lg border border-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary)]">Editar</button><button type="button" onClick={() => void toggle(vereda)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">{vereda.activo ? "Desactivar" : "Activar"}</button></div></div>)}</div></section></main>;
}
