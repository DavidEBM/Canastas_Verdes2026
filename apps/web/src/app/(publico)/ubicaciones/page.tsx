"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Navigation,
} from "lucide-react";
import SiteContentEditor from "@/components/content/SiteContentEditor";
import { useSiteContent } from "@/hooks/useSiteContent";

interface Finca {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  IdMunicipalidad: string;
  horario: string;
  telefono: string;
  activo: boolean;
  esPuntoRecogida: boolean;
  esPuntoRecogidaDefault: boolean;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
}

interface MunicipioGroup {
  id: string;
  nombre: string;
  fincas: Finca[];
}

type ViewMode = "inicio" | "municipio";

function municipalityEmbedUrl(
  municipio: MunicipioGroup,
) {
  const points = municipio.fincas.map(
    (finca) =>
      [
        finca.nombre,
        finca.direccion,
        finca.municipio,
        "Colombia",
      ]
        .filter(Boolean)
        .join(", "),
  );

  if (points.length >= 2) {
    const origin = encodeURIComponent(
      points[0],
    );
    const destination = encodeURIComponent(
      points[points.length - 1],
    );
    const waypoints = encodeURIComponent(
      points.slice(1, -1).join("|"),
    );

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  }

  const query = [
    municipio.nombre,
    "Colombia",
  ].join(", ");

  return `https://www.google.com/maps?q=${encodeURIComponent(
    query,
  )}&output=embed`;
}

export default function UbicacionesPage() {
  const { content, loading: contentLoading, error: contentError, lastDateUpdated } = useSiteContent("fincas");
  const contentUnavailable = Boolean(contentError && !lastDateUpdated);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [viewMode, setViewMode] =
    useState<ViewMode>("inicio");
  const [municipioId, setMunicipioId] =
    useState("");
  const [selectedPickupId, setSelectedPickupId] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFincas() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/puntos-recogida",
          { cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "No fue posible cargar las fincas.",
          );
        }

        const data: Finca[] = result.data ?? [];
        const pickup = data.find(
          (item) => item.esPuntoRecogida,
        );
        const defaultPickup = data.find(
          (item) =>
            item.esPuntoRecogidaDefault,
        );

        setFincas(data);
        setSelectedPickupId(
          defaultPickup?.id ??
            pickup?.id ??
            "",
        );
      } catch (err) {
        console.error("Error cargando fincas:", err);
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar las fincas.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadFincas();
  }, []);

  const lugaresRecogida = useMemo(
    () =>
      fincas.filter(
        (finca) => finca.esPuntoRecogida,
      ),
    [fincas],
  );

  const municipios = useMemo<MunicipioGroup[]>(
    () => {
      const groups = new Map<
        string,
        MunicipioGroup
      >();

      fincas
        .filter((finca) => !finca.esPuntoRecogida)
        .forEach((finca) => {
          const id =
            finca.IdMunicipalidad ||
            finca.municipio;
          const current = groups.get(id);

          if (current) {
            current.fincas.push(finca);
            return;
          }

          groups.set(id, {
            id,
            nombre: finca.municipio || id,
            fincas: [finca],
          });
        });

      return Array.from(groups.values()).sort(
        (a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
      );
    },
    [fincas],
  );

  const selectedPickup =
    lugaresRecogida.find(
      (finca) => finca.id === selectedPickupId,
    ) ?? lugaresRecogida[0] ?? null;

  const selectedMunicipio = municipios.find(
    (municipio) => municipio.id === municipioId,
  );

  const mapUrl =
    viewMode === "municipio" && selectedMunicipio
      ? municipalityEmbedUrl(selectedMunicipio)
      : selectedPickup?.googleMapsEmbedUrl ?? "";

  const mapTitle =
    viewMode === "municipio" && selectedMunicipio
      ? `Mapa de ${selectedMunicipio.nombre}`
      : selectedPickup
        ? `Mapa de ${selectedPickup.nombre}`
        : "Mapa de fincas";

  function openMunicipio(id: string) {
    setMunicipioId(id);
    setViewMode("municipio");
  }

  function goHome() {
    setViewMode("inicio");
    setMunicipioId("");
  }

  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(content.heroImage.url)})` }} />
        <div className="absolute inset-0 bg-[rgb(23_53_31_/_70%)]" />
        <SiteContentEditor page="fincas" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} title="Encabezado de Fincas" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[rgb(23_53_31_/_80%)] px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl text-white">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--secondary)]">{content.heroEyebrow}</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{content.heroTitle}</h1>
            <p className="mt-4 text-base leading-7 text-white/85">{content.heroDescription}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {loading && (
          <div className="rounded-3xl border border-[var(--border)] bg-white p-10 text-center text-[var(--muted)] shadow-sm">
            Cargando ubicaciones...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && fincas.length === 0 && (
          <div className="rounded-3xl border border-[var(--border)] bg-white p-10 text-center shadow-sm">
            <MapPin
              size={34}
              className="mx-auto mb-3 text-[var(--primary)]"
            />
            <p className="font-semibold text-[var(--foreground)]">
              Aún no hay fincas publicadas.
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              El equipo administrador podrá agregarlas desde el apartado Fincas.
            </p>
          </div>
        )}

        {!loading && !error && fincas.length > 0 && (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="order-1 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm lg:order-2">
              <div className="relative h-[390px] sm:h-[520px]">
                {mapUrl ? (
                  <iframe
                    key={mapUrl}
                    title={mapTitle}
                    src={mapUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[var(--surface)] p-8 text-center">
                    <div>
                      <MapPin
                        size={42}
                        className="mx-auto mb-3 text-[var(--primary)]"
                      />
                      <p className="font-semibold text-[var(--foreground)]">
                        Mapa no disponible
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        La ubicación se puede consultar en Google Maps desde la lista.
                      </p>
                    </div>
                  </div>
                )}

                {viewMode === "municipio" && selectedMunicipio && (
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-lg backdrop-blur">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
                      <MapPin size={15} />
                      Municipio seleccionado
                    </div>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {selectedMunicipio.nombre}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {selectedMunicipio.fincas.length} finca{selectedMunicipio.fincas.length === 1 ? "" : "s"} registrada{selectedMunicipio.fincas.length === 1 ? "" : "s"} para visitar.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-5 sm:p-6">
                {viewMode === "inicio" && selectedPickup ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                        Lugar de recogida predeterminado
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">
                        {selectedPickup.nombre}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {selectedPickup.direccion}, {selectedPickup.municipio}
                      </p>
                    </div>
                    {selectedPickup.googleMapsUrl && (
                      <a
                        href={selectedPickup.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--surface)]"
                      >
                        <Navigation size={16} />
                        Ver ubicación
                      </a>
                    )}
                  </div>
                ) : selectedMunicipio ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                      Ubicaciones registradas
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      El mapa muestra el municipio y conecta las ubicaciones registradas. Estas son las fincas disponibles para visitar; cada enlace abre su punto exacto.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="order-2 space-y-4 lg:order-1">
              {viewMode === "municipio" ? (
                <button
                  type="button"
                  onClick={goHome}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)]"
                >
                  <ArrowLeft size={18} className="text-[var(--primary)]" />
                  <span>Lugares de recogida y municipios</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                    Explora el territorio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Primero encontrarás los lugares de recogida. Después, los municipios con fincas disponibles.
                  </p>
                </div>
              )}

              {viewMode === "inicio" ? (
                <>
                  <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h2 className="font-bold text-[var(--foreground)]">
                        Lugares de recogida
                      </h2>
                      <span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]">
                        {lugaresRecogida.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {lugaresRecogida.length === 0 ? (
                        <p className="rounded-xl bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
                          El lugar de recogida aún no ha sido configurado.
                        </p>
                      ) : (
                        lugaresRecogida.map((finca) => (
                          <button
                            key={finca.id}
                            type="button"
                            onClick={() => setSelectedPickupId(finca.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${selectedPickup?.id === finca.id ? "border-[var(--primary)] bg-[var(--surface)]" : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]"}`}
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                                <MapPin size={16} className="shrink-0 text-[var(--primary)]" />
                                <span className="truncate">{finca.nombre}</span>
                              </span>
                              <span className="mt-1 block truncate pl-6 text-xs text-[var(--muted)]">
                                {finca.direccion}
                              </span>
                            </span>
                            {finca.esPuntoRecogidaDefault && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                                Default
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h2 className="font-bold text-[var(--foreground)]">
                        Municipios
                      </h2>
                      <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">
                        {municipios.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {municipios.map((municipio) => (
                        <button
                          key={municipio.id}
                          type="button"
                          onClick={() => openMunicipio(municipio.id)}
                          className="flex w-full items-center justify-between rounded-xl border border-transparent p-3 text-left transition hover:border-[var(--border)] hover:bg-[var(--surface)]"
                        >
                          <span>
                            <span className="block text-sm font-semibold text-[var(--foreground)]">
                              {municipio.nombre}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--muted)]">
                              {municipio.fincas.length} finca{municipio.fincas.length === 1 ? "" : "s"}
                            </span>
                          </span>
                          <ChevronRight size={18} className="text-[var(--primary)]" />
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              ) : selectedMunicipio ? (
                <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <div className="mb-4 px-1">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                      Municipio
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">
                      {selectedMunicipio.nombre}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {selectedMunicipio.fincas.map((finca, index) => (
                      <a
                        key={finca.id}
                        href={finca.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border border-[var(--border)] p-3 transition hover:border-[var(--primary)] hover:bg-[var(--surface)]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-[var(--foreground)]">
                              {finca.nombre}
                            </span>
                            <span className="mt-1 block text-sm text-[var(--muted)]">
                              {finca.direccion}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--muted)]">
                              {finca.municipio}
                            </span>
                            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                              <ExternalLink size={13} />
                              Abrir ubicación exacta
                            </span>
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
