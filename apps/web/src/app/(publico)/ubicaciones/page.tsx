"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Navigation,
  Clock3,
  Phone,
} from "lucide-react";

interface PuntoRecogida {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  IdMunicipalidad: string;
  horaInicio: string;
  horaFin: string;
  horario: string;
  telefono: string;
  activo: boolean;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
}

export default function UbicacionesPage() {
  const [ubicaciones, setUbicaciones] =
    useState<PuntoRecogida[]>([]);

  const [selectedLocation, setSelectedLocation] =
    useState<PuntoRecogida | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadLocations() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/puntos-recogida",
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "No fue posible cargar las ubicaciones."
          );
        }

        const data: PuntoRecogida[] =
          result.data ?? [];

        setUbicaciones(data);

        if (data.length > 0) {
          setSelectedLocation(data[0]);
        }
      } catch (err) {
        console.error(
          "Error cargando ubicaciones:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar las ubicaciones."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLocations();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            Nuestros puntos
          </p>

          <h1 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
            Ubicaciones
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted)]">
            Encuentra nuestros puntos de atención
            y recogida de Canastas Verdes.
          </p>
        </div>

        {/* Cargando */}
        {loading && (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center text-[var(--muted)]">
            Cargando ubicaciones...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            {error}
          </div>
        )}

        {/* Sin ubicaciones */}
        {!loading &&
          !error &&
          ubicaciones.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center text-[var(--muted)]">
              Actualmente no hay puntos de atención
              disponibles.
            </div>
          )}

        {/* Contenido */}
        {!loading &&
          !error &&
          selectedLocation && (
            <>
              {/* Mapa principal */}
              <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                <div className="relative h-[360px] w-full sm:h-[440px]">
                  {selectedLocation.googleMapsEmbedUrl ? (
                    <iframe
                      key={`${selectedLocation.id}-${selectedLocation.googleMapsEmbedUrl}`}
                      title={`Mapa de ${selectedLocation.nombre}`}
                      src={
                        selectedLocation.googleMapsEmbedUrl
                      }
                      className="absolute inset-0 h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[var(--surface)]">
                      <div className="px-6 text-center">
                        <MapPin
                          size={42}
                          className="mx-auto mb-3 text-[var(--primary)]"
                        />

                        <p className="font-semibold text-[var(--foreground)]">
                          Mapa no disponible
                        </p>

                        <p className="mt-1 text-sm text-[var(--muted)]">
                          La ubicación puede consultarse
                          directamente en Google Maps.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Botón Google Maps */}
                  {selectedLocation.googleMapsUrl && (
                    <div className="absolute right-4 top-4">
                      <a
                        href={
                          selectedLocation.googleMapsUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)] shadow-md transition hover:bg-[var(--surface-hover)]"
                      >
                        <Navigation size={17} />
                        Ver en el mapa
                      </a>
                    </div>
                  )}
                </div>

                {/* Información del punto seleccionado */}
                <div className="border-t border-[var(--border)] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-[var(--muted)]">
                        Punto seleccionado
                      </p>

                      <h2 className="text-xl font-bold text-[var(--foreground)]">
                        {selectedLocation.nombre}
                      </h2>

                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {selectedLocation.direccion},{" "}
                        {selectedLocation.municipio}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                      Disponible
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjetas */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {ubicaciones.map(
                  (ubicacion) => {
                    const selected =
                      selectedLocation.id ===
                      ubicacion.id;

                    return (
                      <button
                        key={ubicacion.id}
                        type="button"
                        onClick={() =>
                          setSelectedLocation(
                            ubicacion
                          )
                        }
                        className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                          selected
                            ? "border-[var(--primary)] ring-2 ring-[var(--secondary)]"
                            : "border-[var(--border)] hover:border-[var(--primary)]"
                        }`}
                      >
                        {/* Preview del mapa */}
                        <div className="relative h-40 w-full overflow-hidden bg-[var(--surface)]">
                          {ubicacion.googleMapsEmbedUrl ? (
                            <iframe
                              title={`Vista previa de ${ubicacion.nombre}`}
                              src={
                                ubicacion.googleMapsEmbedUrl
                              }
                              className="pointer-events-none absolute inset-0 h-full w-full border-0"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              tabIndex={-1}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <MapPin
                                size={34}
                                className="text-[var(--primary)]"
                              />
                            </div>
                          )}

                          {/* Indicador */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--primary)] shadow-md">
                            <MapPin size={14} />
                            Ver ubicación
                          </div>
                        </div>

                        {/* Información */}
                        <div className="p-5">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--primary)]">
                                <MapPin size={20} />
                              </div>

                              <div>
                                <h2 className="font-semibold text-[var(--foreground)]">
                                  {ubicacion.nombre}
                                </h2>

                                <p className="mt-1 text-sm text-[var(--muted)]">
                                  {
                                    ubicacion.municipio
                                  }
                                </p>
                              </div>
                            </div>

                            <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                              Disponible
                            </span>
                          </div>

                          <div className="space-y-3 text-sm text-[var(--muted)]">
                            {/* Dirección */}
                            <div className="flex gap-3">
                              <MapPin
                                size={17}
                                className="mt-0.5 shrink-0 text-[var(--primary)]"
                              />

                              <span>
                                {
                                  ubicacion.direccion
                                }
                              </span>
                            </div>

                            {/* Horario */}
                            {ubicacion.horario && (
                              <div className="flex gap-3">
                                <Clock3
                                  size={17}
                                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                                />

                                <span>
                                  {
                                    ubicacion.horario
                                  }
                                </span>
                              </div>
                            )}

                            {/* Teléfono */}
                            {ubicacion.telefono && (
                              <div className="flex gap-3">
                                <Phone
                                  size={17}
                                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                                />

                                <span>
                                  {
                                    ubicacion.telefono
                                  }
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Acción */}
                          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                            <Navigation size={16} />

                            {selected
                              ? "Ubicación seleccionada"
                              : "Mostrar esta ubicación"}
                          </div>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </>
          )}
      </section>
    </main>
  );
}
