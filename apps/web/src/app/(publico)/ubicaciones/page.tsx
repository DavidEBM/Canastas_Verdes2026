"use client";

import {
  MapPin,
  Clock,
  Navigation,
  Phone,
  Store,
} from "lucide-react";

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Plaza+Simon+Bolivar+Tangua+Narino";

const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps?q=Plaza+Simon+Bolivar,+Tangua,+Narino&output=embed";

const ubicaciones = [
  {
    id: "principal",
    nombre: "Punto de atención principal",
    direccion: "Plaza Simón Bolívar, a 3-62, Cl. 6 #3-2, Tangua, Nariño",
    horario: "Lunes a viernes · 8:00 a. m. - 5:00 p. m.",
    telefono: "Teléfono pendiente de configurar",
    estado: "Disponible",
  },
];

export default function UbicacionesPage() {
  return (
    <main className="min-h-screen bg-white text-[#17351f]">
      {/* ======================================================
          ENCABEZADO
      ====================================================== */}
      <section className="px-6 pb-10 pt-14 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-[#b8d9c0] bg-[#f1f8f2] px-4 py-1.5 text-sm font-medium text-[#1f6b3a]">
              Canastas Verdes
            </span>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Nuestras
              <span className="block text-[#1f6b3a]">
                ubicaciones
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#55705d] sm:text-lg">
              Encuentra nuestros puntos de atención y conoce dónde puedes
              recibir o adquirir los productos de Canastas Verdes.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================
          MAPA + INFORMACIÓN
      ====================================================== */}
      <section className="px-6 pb-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
            {/* ------------------------------------------------
                MAPA DE GOOGLE MAPS
            ------------------------------------------------ */}
            <div className="relative min-h-[420px] overflow-hidden rounded-3xl border border-[#dce9df] bg-[#f1f8f2] shadow-sm">
              <iframe
                title="Ubicación de Canastas Verdes en Tangua, Nariño"
                src={GOOGLE_MAPS_EMBED_URL}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              {/* Etiqueta superior */}
                <div className="absolute right-5 top-5 z-10 rounded-xl border border-white/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">                <div className="flex items-center gap-2">
                  <MapPin
                    size={18}
                    className="text-[#1f6b3a]"
                  />

                  <span className="text-sm font-semibold">
                    Nuestros puntos
                  </span>
                </div>
              </div>

              {/* Botón mapa */}
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-5 right-5 z-10 inline-flex items-center gap-2 rounded-xl border border-[#b8d9c0] bg-white px-4 py-2.5 text-sm font-medium text-[#1f6b3a] shadow-sm transition hover:bg-[#f1f8f2]"
              >
                <Navigation size={17} />
                Ver en el mapa
              </a>
            </div>

            {/* ------------------------------------------------
                TARJETAS DE UBICACIONES
            ------------------------------------------------ */}
            <div className="space-y-4">
              {ubicaciones.map((ubicacion) => (
                <article
                  key={ubicacion.id}
                  className="rounded-3xl border border-[#dce9df] bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dff1e2] text-[#1f6b3a]">
                        <Store size={21} />
                      </div>

                      <div>
                        <h2 className="font-semibold text-[#17351f]">
                          {ubicacion.nombre}
                        </h2>

                        <span className="mt-1 inline-flex rounded-full bg-[#f1f8f2] px-2.5 py-1 text-xs font-medium text-[#1f6b3a]">
                          {ubicacion.estado}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {/* Dirección */}
                    <div className="flex gap-3">
                      <MapPin
                        size={19}
                        className="mt-0.5 shrink-0 text-[#1f6b3a]"
                      />

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#789080]">
                          Dirección
                        </p>

                        <p className="mt-1 text-sm text-[#486150]">
                          {ubicacion.direccion}
                        </p>
                      </div>
                    </div>

                    {/* Horario */}
                    <div className="flex gap-3">
                      <Clock
                        size={19}
                        className="mt-0.5 shrink-0 text-[#1f6b3a]"
                      />

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#789080]">
                          Horario
                        </p>

                        <p className="mt-1 text-sm text-[#486150]">
                          {ubicacion.horario}
                        </p>
                      </div>
                    </div>

                    {/* Contacto */}
                    <div className="flex gap-3">
                      <Phone
                        size={19}
                        className="mt-0.5 shrink-0 text-[#1f6b3a]"
                      />

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#789080]">
                          Contacto
                        </p>

                        <p className="mt-1 text-sm text-[#486150]">
                          {ubicacion.telefono}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cómo llegar */}
                  <a
                    href={GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-[#1f6b3a] px-4 py-3 text-sm font-semibold text-[#1f6b3a] transition hover:bg-[#1f6b3a] hover:text-white"
                  >
                    <Navigation size={17} />
                    Cómo llegar
                  </a>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          INFORMACIÓN INFERIOR
      ====================================================== */}
      <section className="border-t border-[#e2eee4] bg-[#f1f8f2] px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dff1e2] text-[#1f6b3a]">
            <Store size={26} />
          </div>

          <h2 className="mt-5 text-2xl font-bold sm:text-3xl">
            Cerca de nuestros productores
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-center leading-7 text-[#55705d]">
            En Canastas Verdes trabajamos para acercar productos frescos
            directamente a nuestros clientes. Consulta nuestras ubicaciones
            para conocer los puntos disponibles.
          </p>
        </div>
      </section>
    </main>
  );
}
 
