import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies | Canastas Verdes",
  description:
    "Información sobre el uso de cookies y almacenamiento local en la plataforma Canastas Verdes.",
};

export default function PoliticaCookiesPage() {
  return (
    <main className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        {/* Encabezado */}
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            Canastas Verdes
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Política de Cookies
          </h1>

          <p className="mt-4 text-sm text-[var(--muted)]">
            Última actualización: septiembre de 2026
          </p>
        </header>

        <div className="space-y-10">
          {/* 1 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              1. ¿Qué son las cookies?
            </h2>

            <p className="leading-7 text-[var(--muted)]">
              Las cookies son pequeños archivos de información que un sitio
              web puede almacenar en el dispositivo del usuario cuando este
              visita una página. Permiten recordar determinadas preferencias
              y facilitar el funcionamiento de los servicios ofrecidos.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              2. ¿Cómo utilizamos las cookies?
            </h2>

            <p className="leading-7 text-[var(--muted)]">
              Canastas Verdes utiliza mecanismos de almacenamiento local y,
              cuando corresponde, tecnologías similares a las cookies para
              permitir el funcionamiento de determinadas características de
              la plataforma y recordar las preferencias seleccionadas por
              los usuarios.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              3. Tipos de almacenamiento utilizado
            </h2>

            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="grid border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:grid-cols-[180px_1fr]">
                <strong className="text-sm">
                  Tipo
                </strong>

                <strong className="mt-1 text-sm sm:mt-0">
                  Finalidad
                </strong>
              </div>

              <div className="grid px-5 py-4 sm:grid-cols-[180px_1fr]">
                <span className="font-medium">
                  Necesario
                </span>

                <p className="mt-1 text-sm leading-6 text-[var(--muted)] sm:mt-0">
                  Permite mantener determinadas funciones necesarias para
                  utilizar correctamente la plataforma y recordar la
                  decisión del usuario respecto al consentimiento.
                </p>
              </div>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              4. Preferencia de cookies
            </h2>

            <p className="leading-7 text-[var(--muted)]">
              Al ingresar por primera vez a Canastas Verdes, se muestra un
              aviso que permite aceptar o rechazar el uso de tecnologías de
              almacenamiento no esenciales. La elección realizada se guarda
              en el navegador mediante almacenamiento local para evitar que
              el aviso aparezca nuevamente en cada visita.
            </p>

            <p className="mt-4 leading-7 text-[var(--muted)]">
              La eliminación de los datos almacenados por el navegador puede
              hacer que el aviso de consentimiento vuelva a aparecer.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              5. Cookies y servicios de terceros
            </h2>

            <p className="leading-7 text-[var(--muted)]">
              Algunos servicios tecnológicos utilizados por la plataforma
              pueden emplear mecanismos propios de almacenamiento para
              proporcionar sus funcionalidades. Estos mecanismos pueden
              estar sujetos a las políticas de privacidad y cookies de los
              respectivos proveedores.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              6. ¿Cómo puedo eliminar las cookies?
            </h2>

            <p className="leading-7 text-[var(--muted)]">
              El usuario puede eliminar las cookies y los datos almacenados
              localmente desde las opciones de configuración de su navegador.
              Los procedimientos pueden variar dependiendo del navegador y
              del dispositivo utilizado.
            </p>

            <p className="mt-4 leading-7 text-[var(--muted)]">
              Al eliminar estos datos, algunas preferencias guardadas
              anteriormente pueden perderse y determinadas funciones pueden
              requerir una nueva configuración.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              7. Actualizaciones de esta política
            </h2>

            <p className="leading-7 text-[var(--muted)]">
              Canastas Verdes podrá actualizar esta Política de Cookies cuando
              sea necesario debido a cambios en la plataforma, en las
              tecnologías utilizadas o en los requisitos aplicables. La
              versión vigente será publicada en este mismo apartado.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-xl font-bold">
              8. Contacto
            </h2>

            <p className="leading-7 text-[var(--muted)]">
              Si tienes preguntas relacionadas con el uso de cookies o
              tecnologías de almacenamiento en Canastas Verdes, puedes
              comunicarte con nosotros a través del apartado de contacto de
              la plataforma.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
