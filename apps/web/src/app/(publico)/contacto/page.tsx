"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { MapPin, MessageCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import SiteContentEditor from "@/components/content/SiteContentEditor";
import { useSiteContent } from "@/hooks/useSiteContent";

const MAX_CARACTERES = 500;

type TipoPQRDSF = "P" | "Q" | "R" | "D" | "S" | "F";

const TIPOS_PQRDSF: {
value: TipoPQRDSF;
nombre: string;
descripcion: string;
}[] = [
{
value: "P",
nombre: "Petición",
descripcion: "Solicitudes de información o documentos.",
},
{
value: "Q",
nombre: "Queja",
descripcion: "Insatisfacción con la conducta de un funcionario.",
},
{
value: "R",
nombre: "Reclamo",
descripcion: "Inconformidad por la prestación de un servicio.",
},
{
value: "D",
nombre: "Denuncia",
descripcion:
"Aviso sobre un posible acto que comprometa a los dueños.",
},
{
value: "S",
nombre: "Sugerencia",
descripcion:
"Propuestas para mejorar un proceso o servicio.",
},
{
value: "F",
nombre: "Felicitación",
descripcion:
"Reconocimiento positivo a la buena labor o atención recibida.",
},
];

type Resultado = {
tipo: "exito" | "error";
mensaje: string;
};

export default function ContactoPage() {
const { user, loading } = useAuth();
const { content, loading: contentLoading, error: contentError, lastDateUpdated } = useSiteContent("contacto");
const contentUnavailable = Boolean(contentError && !lastDateUpdated);

const [nombre, setNombre] = useState("");
const [correo, setCorreo] = useState("");
const [telefono, setTelefono] = useState("");

const [asunto, setAsunto] = useState<TipoPQRDSF | "">("");
const [mensaje, setMensaje] = useState("");

const [enviando, setEnviando] = useState(false);
const [resultado, setResultado] = useState<Resultado | null>(null);

/*

* ============================================================
* CARGAR DATOS DEL USUARIO
* ============================================================
*
* Firebase Auth proporciona:
*
* * displayName
* * email
*
* Firestore proporciona información adicional del usuario,
* como el teléfono.
  */

useEffect(() => {
async function cargarDatosUsuario() {
if (loading) {
return;
}

   
  /*
   * Usuario no autenticado.
   * El formulario queda disponible para diligenciar
   * manualmente.
   */
  if (!user) {
    setNombre("");
    setCorreo("");
    setTelefono("");
    return;
  }

  /*
   * Datos disponibles directamente desde Firebase Auth.
   */
  setNombre(user.displayName ?? "");
  setCorreo(user.email ?? "");

  /*
   * Intentamos obtener información adicional desde:
   *
   * usuarios/{uid}
   */
  try {
    const userRef = doc(db, "usuarios", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();

    /*
     * Compatibilidad con diferentes nombres de campos.
     */
    const nombreFirestore =
      data.Nombre ??
      data.nombre ??
      data.name ??
      data.Nombres;

    const correoFirestore =
      data.Correo ??
      data.correo ??
      data.email;

    const telefonoFirestore =
      data.Telefono ??
      data.telefono ??
      data.phone ??
      data.celular ??
      data.Celular;

    if (typeof nombreFirestore === "string") {
      setNombre(nombreFirestore);
    }

    if (typeof correoFirestore === "string") {
      setCorreo(correoFirestore);
    }

    if (typeof telefonoFirestore === "string") {
      setTelefono(telefonoFirestore);
    }
  } catch (error) {
    console.error(
      "Error obteniendo datos del usuario:",
      error,
    );
  }
}

void cargarDatosUsuario();
   

}, [user, loading]);

/*

* ============================================================
* ENVÍO
* ============================================================
  */

async function handleSubmit(
event: FormEvent<HTMLFormElement>,
) {
event.preventDefault();

   
setResultado(null);

const nombreLimpio = nombre.trim();
const correoLimpio = correo.trim();
const telefonoLimpio = telefono.trim();
const mensajeLimpio = mensaje.trim();

/*
 * Validaciones
 */

if (!nombreLimpio) {
  setResultado({
    tipo: "error",
    mensaje: "El nombre es obligatorio.",
  });
  return;
}

if (!correoLimpio) {
  setResultado({
    tipo: "error",
    mensaje:
      "El correo electrónico es obligatorio.",
  });
  return;
}

if (!asunto) {
  setResultado({
    tipo: "error",
    mensaje:
      "Debes seleccionar el tipo de PQRDSF.",
  });
  return;
}

if (!mensajeLimpio) {
  setResultado({
    tipo: "error",
    mensaje: "El mensaje es obligatorio.",
  });
  return;
}

if (mensajeLimpio.length > MAX_CARACTERES) {
  setResultado({
    tipo: "error",
    mensaje:
      "El mensaje no puede superar los 500 caracteres.",
  });
  return;
}

/*
 * ==========================================================
 * ENVIAR A LA API
 * ==========================================================
 */

try {
  setEnviando(true);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  /*
   * Si hay usuario autenticado enviamos su token.
   */
  if (auth.currentUser) {
    const token = await getIdToken(
      auth.currentUser,
    );

    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch("/api/pqrdsf", {
  method: "POST",
  headers,
  body: JSON.stringify({
    nombre: nombreLimpio,
    correo: correoLimpio,
    telefono: telefonoLimpio || null,
    asunto,
    mensaje: mensajeLimpio,
  }),
});

const contentType = response.headers.get("content-type") ?? "";

if (!contentType.includes("application/json")) {
  const text = await response.text();

  console.error(
    "La API /api/pqrdsf no devolvió JSON:",
    text,
  );

  throw new Error(
    `El servidor devolvió una respuesta inesperada (${response.status}). Verifica /api/pqrdsf/route.ts.`,
  );
}

const data = await response.json();

if (!response.ok) {
  throw new Error(
    data?.error ??
      "No fue posible enviar la PQRDSF.",
  );
}

  /*
   * Éxito
   */

  setResultado({
    tipo: "exito",
    mensaje:
      "Tu PQRDSF fue recibida correctamente. Nuestro equipo la revisará.",
  });

  /*
   * Limpiamos solamente la solicitud.
   *
   * Los datos personales permanecen para que el usuario
   * pueda realizar otra solicitud sin tener que escribirlos
   * nuevamente.
   */
  setAsunto("");
  setMensaje("");
} catch (error) {
  console.error(
    "Error enviando PQRDSF:",
    error,
  );

  setResultado({
    tipo: "error",
    mensaje:
      error instanceof Error
        ? error.message
        : "Ocurrió un error al enviar la PQRDSF.",
  });
} finally {
  setEnviando(false);
}
   

}

const caracteresRestantes =
MAX_CARACTERES - mensaje.length;

return ( <main>
{/* ======================================================
HERO
======================================================= */}

   
  <section className="relative min-h-[40dvh] overflow-hidden">
    <Image
      src={content.heroImage.url}
      alt={content.heroImage.alt}
      fill
      priority
      className="object-cover"
    />

    <div className="absolute inset-0 bg-[rgb(23_53_31_/_70%)]" />
    <SiteContentEditor page="contacto" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={["heroEyebrow", "heroTitle", "heroDescription", "heroImage"]} title="Portada de Contacto" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[rgb(23_53_31_/_80%)] px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]" />

    <div className="relative mx-auto flex min-h-[40dvh] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="max-w-3xl text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
          {content.heroEyebrow}
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {content.heroTitle}
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
          {content.heroDescription}
        </p>
      </div>
    </div>
  </section>

  {/* ======================================================
      PQRDSF
  ======================================================= */}

  <section className="relative bg-[var(--surface)] py-16 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SiteContentEditor page="contacto" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={["infoEyebrow", "infoTitle", "infoDescription", "emailLabel", "email", "phoneLabel", "phone", "hoursLabel", "hours", "locationLabel", "location", "socialTitle", "whatsappUrl", "instagramUrl"]} title="Información de Contacto" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </div>
    <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">

      {/* Información */}

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
          {content.infoEyebrow}
        </p>

        <h2 className="mt-3 text-3xl font-bold text-[var(--foreground)]">
          {content.infoTitle}
        </h2>

        <p className="mt-4 leading-7 text-[var(--muted)]">
          {content.infoDescription}
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">
              {content.emailLabel}
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {content.email}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--foreground)]">
              {content.phoneLabel}
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {content.phone}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--foreground)]">
              {content.hoursLabel}
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {content.hours.split("\n").map((line) => <span key={line} className="block">{line}</span>)}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--foreground)]">
              {content.locationLabel}
            </h3>

            <p className="mt-1 flex items-start gap-2 text-sm text-[var(--muted)]">
              <MapPin size={17} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
              {content.location}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--foreground)]">
              {content.socialTitle}
            </h3>

            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={content.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escribir por WhatsApp"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <MessageCircle size={17} aria-hidden="true" />
                WhatsApp
                <span aria-hidden="true">↗</span>
              </a>

              <a
                href={content.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visitar Instagram de Canastas Verdes"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#FCAF45] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                Instagram
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          FORMULARIO
      =================================================== */}

      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">

        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          {content.formTitle}
        </h2>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {content.formDescription}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >

          {/* Nombre y correo */}

          <div className="grid gap-5 sm:grid-cols-2">

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Nombre completo
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                value={nombre}
                onChange={(event) =>
                  setNombre(
                    event.target.value,
                  )
                }
                placeholder="Tu nombre completo"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                value={correo}
                onChange={(event) =>
                  setCorreo(
                    event.target.value,
                  )
                }
                placeholder="correo@ejemplo.com"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

          </div>

          {/* Teléfono */}

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Teléfono
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={telefono}
              onChange={(event) =>
                setTelefono(
                  event.target.value,
                )
              }
              placeholder="Tu número de teléfono"
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Tipo PQRDSF */}

          <div>
            <label
              htmlFor="subject"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Tipo de solicitud
            </label>

            <select
              id="subject"
              name="subject"
              required
              value={asunto}
              onChange={(event) =>
                setAsunto(
                  event.target
                    .value as TipoPQRDSF | "",
                )
              }
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">
                Selecciona una opción
              </option>

              {TIPOS_PQRDSF.map((tipo) => (
                <option
                  key={tipo.value}
                  value={tipo.value}
                >
                  {tipo.value} — {tipo.nombre}
                </option>
              ))}
            </select>

            {asunto && (
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                {
                  TIPOS_PQRDSF.find(
                    (tipo) =>
                      tipo.value === asunto,
                  )?.descripcion
                }
              </p>
            )}
          </div>

          {/* Mensaje */}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Mensaje
              </label>

              <span
                className={`text-xs ${
                  caracteresRestantes <= 50
                    ? "font-semibold text-red-600"
                    : "text-[var(--muted)]"
                }`}
              >
                {caracteresRestantes}/500
              </span>
            </div>

            <textarea
              id="message"
              name="message"
              rows={7}
              required
              maxLength={MAX_CARACTERES}
              value={mensaje}
              onChange={(event) =>
                setMensaje(
                  event.target.value,
                )
              }
              placeholder="Escribe tu mensaje..."
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />

            <p className="mt-1 text-right text-xs text-[var(--muted)]">
              Máximo 500 caracteres
            </p>
          </div>

          {/* Resultado */}

          {resultado && (
            <div
              role="alert"
              className={`rounded-[var(--radius-md)] border px-4 py-3 text-sm ${
                resultado.tipo === "exito"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {resultado.mensaje}
            </div>
          )}

          {/* Enviar */}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-[var(--radius-md)] border-2 border-black/30 bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando
              ? "Enviando..."
              : "Enviar PQRDSF"}
          </button>
        </form>
      </div>
    </div>
  </section>

  {/* ======================================================
      FINCAS
  ======================================================= */}

  <section className="relative bg-white py-16">
    <SiteContentEditor page="contacto" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={["fincasTitle", "fincasDescription", "fincasCta"]} title="Sección de Fincas" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">

      <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
        {content.fincasTitle}
      </h2>

      <p className="mt-4 text-[var(--muted)]">
        {content.fincasDescription}
      </p>

      <a
        href="/ubicaciones"
        className="mt-6 inline-flex rounded-[var(--radius-md)] border-2 border-black/30 bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f]"
      >
        {content.fincasCta}
      </a>

    </div>
  </section>
</main>


);
}
