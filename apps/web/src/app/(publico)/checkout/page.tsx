"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

interface Municipality {
  id: string;
  nombre: string;
}

interface UserProfile {
  Nombres?: string;
  Apellidos?: string;
  Correo?: string;
  Telefono?: string;
  Direccion?: string;
  Rol?: string;
}

interface ProfileApiResponse {
  success?: boolean;
  message?: string;
  data?: UserProfile;
}

interface MunicipalitiesApiResponse {
  success?: boolean;
  message?: string;
  data?: Municipality[];
}

interface OrderApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    pedidoId?: string;
  };
}

function price(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/_/g, " ").trim();
}

export default function CheckoutPage() {
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, clearCart } = useCart();

  const [municipalities, setMunicipalities] = useState<
    Municipality[]
  >([]);

  const [municipality, setMunicipality] =
    useState("");

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [
    municipalitiesLoading,
    setMunicipalitiesLoading,
  ] = useState(true);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [submitting, setSubmitting] =
    useState(false);

  /*
   * =====================================================
   * CARGAR PERFIL DEL USUARIO
   * =====================================================
   *
   * La dirección se obtiene desde:
   *
   * usuarios/{UID}
   *
   * utilizando:
   *
   * GET /api/usuarios/perfil
   */
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setProfileLoading(true);

        const token = await user.getIdToken();

        const response = await fetch(
          "/api/usuarios/perfil",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const payload: ProfileApiResponse =
          await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.message ||
              "No fue posible cargar tu perfil.",
          );
        }

        if (cancelled) {
          return;
        }

        const profileAddress = normalizeText(
  payload.data?.Direccion,
);

const profilePhone = normalizeText(
  payload.data?.Telefono,
);

setAddress(profileAddress);
setPhone(profilePhone);

      } catch (caught) {
        console.error(
          "Error al cargar el perfil:",
          caught,
        );

        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar tu perfil.",
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);
/*
 * =====================================================
 * CARGAR MUNICIPALIDADES
 * =====================================================
 *
 * Los usuarios normales pueden consultar únicamente
 * las municipalidades activas.
 *
 * NO usamos:
 *
 * GET /api/municipalidades
 *
 * porque esa ruta es exclusiva para administradores.
 *
 * Usamos:
 *
 * GET /api/municipalidades/disponibles
 *
 * El servidor consulta Firestore mediante Firebase Admin.
 */
useEffect(() => {
  if (!user) {
    setMunicipalitiesLoading(false);
    return;
  }

  let cancelled = false;

  const loadMunicipalities = async () => {
    try {
      setMunicipalitiesLoading(true);

      const token = await user.getIdToken();

      const response = await fetch(
        "/api/municipalidades/disponibles",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const payload: MunicipalitiesApiResponse =
        await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            "No fue posible cargar las municipalidades.",
        );
      }

      if (cancelled) {
        return;
      }

      const activeMunicipalities =
        Array.isArray(payload.data)
          ? payload.data
          : [];

      setMunicipalities(activeMunicipalities);

      /*
       * Si solamente existe una municipalidad activa,
       * se selecciona automáticamente.
       */
      if (activeMunicipalities.length === 1) {
        setMunicipality(
          activeMunicipalities[0].id,
        );
      }
    } catch (caught) {
      console.error(
        "Error al cargar municipalidades:",
        caught,
      );

      if (!cancelled) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar las municipalidades.",
        );
      }
    } finally {
      if (!cancelled) {
        setMunicipalitiesLoading(false);
      }
    }
  };

  loadMunicipalities();

  return () => {
    cancelled = true;
  };
}, [user]);

  /*
   * =====================================================
   * CONFIRMAR PEDIDO
   * =====================================================
   */
  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError(null);

    if (!user) {
      setError(
        "Debes iniciar sesión para confirmar el pedido.",
      );
      return;
    }

    if (items.length === 0) {
      setError("Tu cesta está vacía.");
      return;
    }

    if (!municipality) {
      setError(
        "Selecciona una municipalidad de entrega.",
      );
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "");

if (normalizedPhone.length !== 10) {
  setError(
    "Debes registrar un número de teléfono celular válido de 10 dígitos.",
  );
  return;
}

    if (!address.trim()) {
      setError(
        "No tienes una dirección registrada. Actualiza tu perfil antes de realizar el pedido.",
      );
      return;
    }

    try {
      setSubmitting(true);

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

            /*
             * IMPORTANTE:
             *
             * municipality contiene el ID del
             * documento de Firestore.
             *
             * Ejemplo:
             *
             * ulEHyixirnvEX3nKbIV1
             */
            IdMunicipalidad: municipality,

            /*
             * La dirección proviene del perfil.
             */
            direccionEntrega: address.trim(),
            telefono: `+57${normalizedPhone}`,
          }),
        },
      );

      const payload: OrderApiResponse =
        await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            "No fue posible confirmar el pedido.",
        );
      }

      clearCart();

      const pedidoId =
        typeof payload.data?.pedidoId === "string"
          ? payload.data.pedidoId
          : "";

      if (pedidoId) {
        router.replace(
          `/pedidos/${pedidoId}`,
        );
      } else {
        router.replace("/pedidos");
      }
    } catch (caught) {
      console.error(
        "Error al confirmar pedido:",
        caught,
      );

      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible confirmar el pedido.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * =====================================================
   * CARGANDO AUTENTICACIÓN
   * =====================================================
   */
  if (authLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-[var(--muted)]">
          Cargando checkout…
        </p>
      </main>
    );
  }

  /*
   * =====================================================
   * USUARIO NO AUTENTICADO
   * =====================================================
   */
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Inicia sesión para continuar
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          Necesitamos tu cuenta para reservar los
          productos y registrar el pedido.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-[var(--primary)] px-5 py-3 font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Iniciar sesión
        </Link>
      </main>
    );
  }

  /*
   * =====================================================
   * CESTA VACÍA
   * =====================================================
   */
  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Tu cesta está vacía
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          Agrega productos antes de continuar
          con el pedido.
        </p>

        <Link
          href="/tienda"
          className="mt-6 inline-flex rounded-lg bg-[var(--primary)] px-5 py-3 font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Ir a la tienda
        </Link>
      </main>
    );
  }

  const checkoutLoading =
    profileLoading ||
    municipalitiesLoading;

  /*
   * =====================================================
   * CHECKOUT
   * =====================================================
   */
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Confirmar pedido
        </h1>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Revisa los datos de entrega antes de
          confirmar tu pedido.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-6 md:grid-cols-[1fr_0.8fr]"
      >
        {/* ============================================
            DATOS DE ENTREGA
        ============================================ */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Datos de entrega
          </h2>

          <div className="mt-5 space-y-5">
            {/* MUNICIPALIDAD */}
            <div>
              <label
                htmlFor="municipality"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Municipalidad
              </label>

              {municipalitiesLoading ? (
                <div className="mt-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--muted)]">
                  Cargando municipalidades…
                </div>
              ) : municipalities.length ===
                0 ? (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  No hay municipalidades activas
                  disponibles para realizar el
                  pedido.
                </div>
              ) : (
                <>
                  <select
                    id="municipality"
                    required
                    value={municipality}
                    onChange={(event) =>
                      setMunicipality(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--secondary)]"
                  >
                    <option value="">
                      Selecciona una municipalidad
                    </option>

                    {municipalities.map(
                      (municipalityItem) => (
                        <option
                          key={municipalityItem.id}
                          value={municipalityItem.id}
                        >
                          {municipalityItem.nombre}
                        </option>
                      ),
                    )}
                  </select>

                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Selecciona el municipio donde
                    deseas recibir tu pedido.
                  </p>
                </>
              )}
            </div>
            {/* TELÉFONO */}
<div>
  <div className="flex items-center justify-between gap-3">
    <label
      htmlFor="phone"
      className="block text-sm font-medium text-[var(--foreground)]"
    >
      Teléfono de contacto
    </label>

    <Link
      href="/perfil"
      className="text-xs font-semibold text-[var(--primary)] hover:underline"
    >
      Editar perfil
    </Link>
  </div>

  <div className="mt-2 flex">
    <span className="inline-flex items-center rounded-l-lg border border-r-0 border-[var(--border)] bg-gray-100 px-3 text-sm font-medium text-[var(--foreground)]">
      +57
    </span>

    <input
      id="phone"
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={phone.replace(/\D/g, "").slice(0, 10)}
      onChange={(event) => {
        const value = event.target.value
          .replace(/\D/g, "")
          .slice(0, 10);

        setPhone(value);
      }}
      placeholder="3001234567"
      maxLength={10}
      required
      className="w-full rounded-r-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--secondary)]"
    />
  </div>

  {phone ? (
    <p className="mt-2 text-xs text-[var(--muted)]">
      Este número se obtuvo de tu perfil. Puedes
      modificarlo si es necesario.
    </p>
  ) : (
    <p className="mt-2 text-xs text-amber-700">
      No tienes un número registrado. Ingresa un
      número de 10 dígitos.
    </p>
  )}
</div>

            {/* DIRECCIÓN */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-[var(--foreground)]"
                >
                  Dirección de entrega
                </label>

                <Link
                  href="/perfil"
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Editar perfil
                </Link>
              </div>

              {profileLoading ? (
                <div className="mt-2 rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm text-[var(--muted)]">
                  Cargando dirección…
                </div>
              ) : address ? (
                <textarea
                  id="address"
                  value={address}
                  readOnly
                  aria-readonly="true"
                  className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
                />
              ) : (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">
                    No tienes una dirección registrada
                    en tu perfil.
                  </p>

                  <Link
                    href="/perfil"
                    className="mt-2 inline-block text-sm font-bold text-[var(--primary)] hover:underline"
                  >
                    Actualizar mi dirección
                  </Link>
                </div>
              )}

              {address && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Esta dirección se obtiene
                  automáticamente de tu perfil.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ============================================
            RESUMEN DEL PEDIDO
        ============================================ */}
        <aside className="h-fit rounded-xl border border-[var(--border)] bg-white p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Resumen del pedido
          </h2>

          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex justify-between gap-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)]">
                    {item.product.nombre}
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Cantidad: {item.quantity}
                  </p>
                </div>

                <span className="shrink-0 font-medium text-[var(--foreground)]">
                  {price(
                    item.product.precio *
                      item.quantity,
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-between border-t border-[var(--border)] pt-4 text-base font-bold text-[var(--foreground)]">
            <span>Total</span>

            <span>{price(subtotal)}</span>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
  submitting ||
  checkoutLoading ||
  !address.trim() ||
  !municipality ||
  phone.replace(/\D/g, "").length !== 10 ||
  municipalities.length === 0
}
            className="mt-5 w-full rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Confirmando…"
              : checkoutLoading
                ? "Cargando información…"
                : "Confirmar y reservar"}
          </button>

          <Link
            href="/tienda"
            className="mt-3 block text-center text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Volver a la tienda
          </Link>
        </aside>
      </form>
    </main>
  );
}