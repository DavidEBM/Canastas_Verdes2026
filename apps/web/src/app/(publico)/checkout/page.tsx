"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MapPin, Package, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

interface Municipality {
  id: string;
  nombre: string;
  activo: boolean;
}

interface PuntoRecogida {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  IdMunicipalidad: string;
  horario: string;
  telefono: string;
  activo: boolean;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
}

interface Profile {
  Nombres?: string;
  Apellidos?: string;
  Correo?: string;
  Telefono?: string;
  Direccion?: string;
}

type TipoEntrega = "domicilio" | "recogida";

export default function CheckoutPage() {
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();
  const { items, totalPrice, clearCart } = useCart();

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [puntosRecogida, setPuntosRecogida] = useState<PuntoRecogida[]>([]);

  const [tipoEntrega, setTipoEntrega] =
    useState<TipoEntrega>("domicilio");

  const [municipality, setMunicipality] = useState("");
  const [puntoRecogidaId, setPuntoRecogidaId] = useState("");

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedPunto = useMemo(
    () =>
      puntosRecogida.find(
        (point) => point.id === puntoRecogidaId
      ) ?? null,
    [puntosRecogida, puntoRecogidaId]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const token = await user!.getIdToken();

        const [
          profileResponse,
          municipalitiesResponse,
          pointsResponse,
        ] = await Promise.all([
          fetch("/api/usuarios/perfil", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),

          fetch("/api/municipalidades/disponibles", {
            cache: "no-store",
          }),

          fetch("/api/puntos-recogida", {
            cache: "no-store",
          }),
        ]);

        const profileResult = await profileResponse.json();
        const municipalitiesResult =
          await municipalitiesResponse.json();
        const pointsResult =
          await pointsResponse.json();

        if (
          !profileResponse.ok ||
          !profileResult.success
        ) {
          throw new Error(
            profileResult.message ||
              "No fue posible cargar tu perfil."
          );
        }

        if (
          !municipalitiesResponse.ok ||
          !municipalitiesResult.success
        ) {
          throw new Error(
            municipalitiesResult.message ||
              "No fue posible cargar las municipalidades."
          );
        }

        if (
          !pointsResponse.ok ||
          !pointsResult.success
        ) {
          throw new Error(
            pointsResult.message ||
              "No fue posible cargar los puntos de recogida."
          );
        }

        const profile: Profile =
          profileResult.data ?? {};

        const municipalityData: Municipality[] =
          municipalitiesResult.data ?? [];

        const pointData: PuntoRecogida[] =
          pointsResult.data ?? [];

        setMunicipalities(municipalityData);
        setPuntosRecogida(pointData);

        setAddress(profile.Direccion ?? "");

        // El perfil puede guardar el teléfono como:
        // +573001234567
        // 573001234567
        // 3001234567
        const normalizedProfilePhone = (
          profile.Telefono ?? ""
        )
          .replace(/^\+?57/, "")
          .replace(/\D/g, "")
          .slice(-10);

        setPhone(normalizedProfilePhone);

        if (municipalityData.length === 1) {
          setMunicipality(municipalityData[0].id);
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar el checkout."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [authLoading, user, router]);

  useEffect(() => {
    if (tipoEntrega !== "recogida") {
      return;
    }

    if (
      !selectedPunto &&
      puntosRecogida.length > 0
    ) {
      setPuntoRecogidaId(
        puntosRecogida[0].id
      );
    }
  }, [
    tipoEntrega,
    selectedPunto,
    puntosRecogida,
  ]);

  const normalizedPhone = phone.replace(/\D/g, "");

  const validPhone =
    normalizedPhone.length === 10;

  const validAddress =
    address.trim().length >= 5 &&
    address.trim().length <= 300;

  const canSubmit =
    !submitting &&
    items.length > 0 &&
    (tipoEntrega === "domicilio"
      ? Boolean(municipality) &&
        validAddress &&
        validPhone
      : Boolean(selectedPunto));

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      setError("Debes iniciar sesión.");
      return;
    }

    if (!canSubmit) {
      setError(
        tipoEntrega === "domicilio"
          ? "Completa todos los datos de entrega."
          : "Selecciona un punto de recogida."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const token = await user.getIdToken();

      const response = await fetch(
        "/api/pedidos/crear",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            items: items.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),

            tipoEntrega,

            IdMunicipalidad:
              tipoEntrega === "domicilio"
                ? municipality
                : selectedPunto?.IdMunicipalidad ??
                  null,

            direccionEntrega:
              tipoEntrega === "domicilio"
                ? address.trim()
                : null,

            telefono:
              tipoEntrega === "domicilio"
                ? `+57${normalizedPhone}`
                : null,

            IdPuntoRecogida:
              tipoEntrega === "recogida"
                ? selectedPunto?.id ?? null
                : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "No fue posible crear el pedido."
        );
      }

      const pedidoId =
        result?.data?.pedidoId;

      if (!pedidoId) {
        throw new Error(
          "El pedido fue creado, pero no se recibió su identificador."
        );
      }

      clearCart();

      // IMPORTANTE:
      // La ruta correcta es /pedidos/[id]
      // NO /pedido/[id]
      router.push(
        `/pedidos/${pedidoId}?success=1`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible crear el pedido."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-white p-8 text-center text-[var(--muted)]">
          Cargando checkout...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Finalizar compra
          </h1>

          <p className="mt-2 text-[var(--muted)]">
            Selecciona cómo deseas recibir tu pedido.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                Tipo de entrega
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoEntrega("domicilio");
                    setPuntoRecogidaId("");
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    tipoEntrega === "domicilio"
                      ? "border-[var(--primary)] bg-[var(--surface)] ring-2 ring-[var(--secondary)]"
                      : "border-[var(--border)] hover:border-[var(--primary)]"
                  }`}
                >
                  <Truck
                    size={22}
                    className="mb-3 text-[var(--primary)]"
                  />

                  <p className="font-semibold text-[var(--foreground)]">
                    Recibir en mi domicilio
                  </p>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Entregaremos tu pedido en la
                    dirección registrada.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoEntrega("recogida");

                    if (
                      puntosRecogida.length === 1
                    ) {
                      setPuntoRecogidaId(
                        puntosRecogida[0].id
                      );
                    }
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    tipoEntrega === "recogida"
                      ? "border-[var(--primary)] bg-[var(--surface)] ring-2 ring-[var(--secondary)]"
                      : "border-[var(--border)] hover:border-[var(--primary)]"
                  }`}
                >
                  <MapPin
                    size={22}
                    className="mb-3 text-[var(--primary)]"
                  />

                  <p className="font-semibold text-[var(--foreground)]">
                    Recoger en un punto
                  </p>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Recoge tu pedido en uno de
                    nuestros puntos disponibles.
                  </p>
                </button>
              </div>
            </section>

            {tipoEntrega === "domicilio" && (
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="mb-5 text-lg font-semibold text-[var(--foreground)]">
                  Datos de entrega
                </h2>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="municipality"
                      className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                    >
                      Municipio
                    </label>

                    <select
                      id="municipality"
                      value={municipality}
                      onChange={(event) =>
                        setMunicipality(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    >
                      <option value="">
                        Selecciona un municipio
                      </option>

                      {municipalities.map(
                        (municipio) => (
                          <option
                            key={municipio.id}
                            value={municipio.id}
                          >
                            {municipio.nombre}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="address"
                      className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                    >
                      Dirección
                    </label>

                    <input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(event) =>
                        setAddress(
                          event.target.value
                        )
                      }
                      maxLength={300}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    />

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Puedes modificar la dirección
                      antes de confirmar el pedido.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                    >
                      Teléfono
                    </label>

                    <div className="flex">
                      <span className="flex items-center rounded-l-xl border border-r-0 border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--muted)]">
                        +57
                      </span>

                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(event) =>
                          setPhone(
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10)
                          )
                        }
                        maxLength={10}
                        className="w-full rounded-r-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                        placeholder="3001234567"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {tipoEntrega === "recogida" && (
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="mb-5 text-lg font-semibold text-[var(--foreground)]">
                  Punto de recogida
                </h2>

                <div className="space-y-5">
                  {puntosRecogida.length === 0 ? (
                    <div className="rounded-xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                      No hay puntos de recogida
                      disponibles actualmente.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label
                          htmlFor="pickupPoint"
                          className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                        >
                          Selecciona un punto
                        </label>

                        <select
                          id="pickupPoint"
                          value={puntoRecogidaId}
                          onChange={(event) =>
                            setPuntoRecogidaId(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                        >
                          <option value="">
                            Selecciona un punto de
                            recogida
                          </option>

                          {puntosRecogida.map(
                            (point) => (
                              <option
                                key={point.id}
                                value={point.id}
                              >
                                {point.nombre} ·{" "}
                                {point.municipio}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {selectedPunto && (
                        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                          <div className="p-4">
                            <div className="flex gap-3">
                              <MapPin
                                size={20}
                                className="mt-0.5 shrink-0 text-[var(--primary)]"
                              />

                              <div>
                                <p className="font-semibold text-[var(--foreground)]">
                                  {
                                    selectedPunto.nombre
                                  }
                                </p>

                                <p className="mt-1 text-sm text-[var(--muted)]">
                                  {
                                    selectedPunto.direccion
                                  }
                                </p>

                                {selectedPunto.horario && (
                                  <p className="mt-2 text-sm text-[var(--muted)]">
                                    {
                                      selectedPunto.horario
                                    }
                                  </p>
                                )}

                                {selectedPunto.telefono && (
                                  <p className="mt-1 text-sm text-[var(--muted)]">
                                    {
                                      selectedPunto.telefono
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {selectedPunto.googleMapsEmbedUrl && (
                            <div className="h-64">
                              <iframe
                                key={selectedPunto.id}
                                title={`Mapa de ${selectedPunto.nombre}`}
                                src={
                                  selectedPunto.googleMapsEmbedUrl
                                }
                                className="h-full w-full border-0"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                allowFullScreen
                              />
                            </div>
                          )}

                          {selectedPunto.googleMapsUrl && (
                            <div className="p-4">
                              <a
                                href={
                                  selectedPunto.googleMapsUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
                              >
                                <MapPin size={16} />
                                Ver cómo llegar
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-[var(--border)] bg-white p-6 lg:sticky lg:top-6">
            <div className="mb-5 flex items-center gap-3">
              <Package
                size={22}
                className="text-[var(--primary)]"
              />

              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Resumen
              </h2>
            </div>

            <div className="space-y-3 border-b border-[var(--border)] pb-5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">
                  Productos
                </span>

                <span className="font-medium text-[var(--foreground)]">
                  {items.length}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">
                  Entrega
                </span>

                <span className="font-medium text-[var(--foreground)]">
                  {tipoEntrega === "domicilio"
                    ? "Domicilio"
                    : "Recogida"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-5">
              <span className="font-semibold text-[var(--foreground)]">
                Total
              </span>

              <span className="text-xl font-bold text-[var(--primary)]">
                ${totalPrice.toLocaleString("es-CO")} COP
              </span>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-[var(--primary)] px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Procesando..."
                : "Confirmar pedido"}
            </button>
          </aside>
        </div>
      </form>
    </main>
  );
}

