# Canastas Verdes 2026

Aplicación web para la comercialización y operación de canastas y productos frescos provenientes de productores locales. El sistema permite publicar un catálogo, recibir pedidos, gestionar inventario y disponibilidad, coordinar repartos y consultar estadísticas operativas.

## Estado y ubicación del despliegue

- **Repositorio:** [DavidEBM/Canastas_Verdes2026](https://github.com/DavidEBM/Canastas_Verdes2026)
- **Rama principal:** `main`
- **Aplicación de producción:** [canastas-verdes2026.vercel.app](https://canastas-verdes2026.vercel.app)
- **Proveedor de frontend y API:** Vercel
- **Backend administrado:** Firebase Authentication, Cloud Firestore y Firebase Storage
- **Imágenes y multimedia:** Cloudinary y Firebase Storage, según el flujo utilizado
- **Tareas programadas:** Vercel Cron para recordatorios de compras

La URL de producción se usa también al generar enlaces de recibos y códigos QR. Los dominios, variables y credenciales deben verificarse en los paneles de Vercel y Firebase antes de realizar un nuevo despliegue.

## Cómo funciona el sistema

1. Un visitante consulta la página pública y el catálogo de la tienda.
2. Un consumidor crea una cuenta o inicia sesión mediante Firebase Authentication. Las cuentas creadas con Google deben configurar una contraseña al primer acceso para poder entrar posteriormente con Google o con correo y contraseña, sin crear una segunda cuenta.
3. La aplicación carga el rol vigente desde `usuarios/{uid}` en Firestore.
4. El consumidor agrega productos al carrito, selecciona entrega a domicilio o recogida y crea el pedido.
5. Las APIs del servidor validan el token Firebase, los datos recibidos y las reglas de autorización antes de consultar o modificar información.
6. El administrador mantiene el catálogo, disponibilidad, ubicaciones, usuarios y estados de los pedidos desde `/dashboard`.
7. Los repartidores consultan los repartos asignados y actualizan su estado.
8. El sistema genera recibos, enlaces de consulta y documentos PDF cuando corresponde.
9. Las notificaciones web y los recordatorios automáticos funcionan mediante Web Push y una tarea programada protegida por `CRON_SECRET`.

La autenticación visual del cliente (`useAuth`) mejora la experiencia de navegación, pero no es el mecanismo de seguridad definitivo. Las rutas `/api` vuelven a validar el token y el rol autoritativo en el servidor.

## Arquitectura

```text
apps/web (Next.js App Router)
├── páginas públicas, autenticación y dashboard
├── componentes React y estilos Tailwind/CSS
├── servicios de productos, pedidos, repartos y dashboard
├── APIs Route Handler en apps/web/src/app/api
└── Firebase Admin para operaciones protegidas del servidor

Firebase
├── Authentication: cuentas y sesiones
├── Firestore: usuarios, productos, pedidos, repartos y catálogos
└── Storage: imágenes cargadas desde la aplicación

Servicios externos
├── Cloudinary: carga de imágenes cuando se configura CLOUDINARY_URL
├── Web Push: notificaciones de navegador
└── Vercel: hosting, funciones y cron
```

El repositorio es un monorepo administrado con pnpm y Turborepo. La aplicación web se encuentra en `apps/web`.

## Requisitos para ejecutar localmente

- Node.js compatible con Next.js 16 y React 19.
- pnpm `10.15.0`.
- Un proyecto Firebase con Authentication, Firestore y Storage habilitados.

- Una cuenta de servicio de Firebase Admin para las operaciones del servidor.
- Una cuenta Cloudinary si se utilizarán sus cargas de imágenes.
- Claves VAPID si se desean notificaciones web.
- Git y acceso al repositorio.

### Contenido editable del sitio

Las páginas públicas Inicio, Productos, Conócenos, Fincas, Contacto y el carrusel Nuestros aliados pueden ser actualizadas por cuentas con rol `admin` desde los botones con icono de lápiz. El contenido se almacena en la colección `contenidoSitio`, con un documento por página y un documento `siteMeta` que mantiene `lastDateUpdated` y la versión global.

En Conócenos también se pueden editar las secciones de productores, fincas, productos, Valores y Misión y Visión. En Nuestros aliados se pueden agregar, quitar o desactivar imágenes, cambiar el título y la descripción, y ajustar la velocidad del carrusel. Los cambios se limitan a textos, títulos, imágenes informativas o de fondo y enlaces configurados; no modifican productos, pedidos ni datos obtenidos dinámicamente desde Firebase.

Para crear la colección con los valores predeterminados en un proyecto Firebase vacío, configure las variables de Firebase Admin y ejecute:

```bash
pnpm seedSiteContent
```

El navegador guarda cada página en `localStorage`. Antes de descargar el contenido completo consulta únicamente `lastDateUpdated`; si la fecha coincide, reutiliza la copia local. Si el navegador no tiene fecha, descarga el contenido completo después de comparar la metadata. Las imágenes editables se validan y se cargan mediante Cloudinary.

Instalación:

```bash
pnpm install
Copy-Item .env.example apps/web/.env.local
pnpm dev
```

En PowerShell, `Copy-Item` puede sustituirse por la copia equivalente del sistema operativo. El comando de desarrollo ejecuta las tareas del monorepo y la aplicación queda normalmente disponible en `http://localhost:3000`.

## Variables de entorno

Las variables públicas de Firebase se pueden exponer al navegador porque forman parte de la configuración del cliente; las credenciales de Firebase Admin, Cloudinary, VAPID y cron son privadas y nunca deben usar el prefijo `NEXT_PUBLIC_` ni subirse al repositorio.

| Variable | Uso | Obligatoria |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Configuración del cliente Firebase | Sí |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de Firebase Authentication | Sí |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Proyecto Firebase del cliente | Sí |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de imágenes | Sí |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Mensajería Firebase | Sí |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Identificador de la aplicación Firebase | Sí |
| `FIREBASE_PROJECT_ID` | Proyecto para Firebase Admin | Sí |
| `FIREBASE_CLIENT_EMAIL` | Cuenta de servicio Firebase Admin | Sí |
| `FIREBASE_PRIVATE_KEY` | Clave privada de la cuenta de servicio | Sí |
| `FIREBASE_INITIAL_ADMIN_EMAIL` | Correo inicial autorizado para configurar el primer administrador | Sí para la inicialización |
| `PRIVILEGED_ADMIN_EMAIL` | Correo autorizado para operaciones administrativas especialmente sensibles | Según la operación |
| `CLOUDINARY_URL` | Credenciales de carga de imágenes Cloudinary | Solo si se usa Cloudinary |
| `VAPID_SUBJECT` | Identidad del servicio Web Push | Solo si se usan notificaciones |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública Web Push | Solo si se usan notificaciones |
| `VAPID_PRIVATE_KEY` | Clave privada Web Push | Solo si se usan notificaciones |
| `CRON_SECRET` | Secreto para autorizar el cron de recordatorios | Sí si se habilita el cron |

El archivo `.env.example` contiene los nombres de referencia. Los valores reales deben configurarse en el entorno local y en **Vercel > Project Settings > Environment Variables** para los entornos que correspondan.

## Despliegue en Vercel

1. Importar el repositorio en Vercel.
2. Configurar el proyecto para construir el monorepo desde la raíz.
3. Mantener `pnpm` como gestor y usar los scripts del `package.json`.
4. Registrar todas las variables de entorno necesarias para Preview y Production.
5. Confirmar que el proyecto Firebase autoriza el dominio de Vercel en Authentication.
6. Confirmar que Firebase Storage, Firestore y las reglas de seguridad corresponden al proyecto correcto.
7. Revisar la configuración de dominios remotos en `apps/web/next.config.ts` para imágenes.
8. Ejecutar el despliegue y comprobar login, catálogo, creación de pedido, dashboard y carga de imágenes.
9. Verificar que el cron de `/api/cron/recordatorios-compras` tenga sus variables y secreto configurados.

El archivo `vercel.json` programa el recordatorio semanal los sábados a las 14:00 UTC. El endpoint rechaza solicitudes sin el encabezado secreto esperado.

## Funciones importantes

### Catálogo e imágenes

- Catálogo público con búsqueda tolerante, filtros y productos activos.
- Gestión de productos, categorías, presentaciones y productores.
- Importación masiva de productos desde Excel.
- Configuración de mensajes de disponibilidad por defecto, producto, categoría o grupo.
- Imágenes optimizadas con `next/image` cuando provienen de dominios permitidos.
- Caché persistente de Firestore en múltiples pestañas cuando el navegador lo permite.
- Caché temporal de productos públicos para reducir consultas repetidas.

### Pedidos y entregas

- Carrito persistente durante la sesión.
- Tipos de entrega a domicilio y recogida.
- Estados de pedido: pendiente, asignado, en camino, entregado y cancelado.
- Asignación de repartidores y actualización de repartos.
- Recibos y PDFs con enlaces de consulta protegidos.
- Validación de inventario y disponibilidad en el flujo de pedido.

### Administración y comunicación

- Dashboard para administrar catálogo, usuarios, roles, ubicaciones y operación.
- Módulo **Contenido del sitio** para consultar o editar las ventanas públicas con permisos de administrador.
- Dashboard adaptado por rol: administración completa para `admin`, gestión sensible adicional para el administrador privilegiado y vista de repartos asignados para `repartidor`.
- Estadísticas de ventas, costos, utilidad, pedidos y stock.
- Etiquetas de usuarios.
- Notificaciones web y recordatorios para carritos inactivos cuando Web Push está configurado.
- Exportación de estadísticas desde el dashboard.

### Manejo de errores y navegación

- `not-found.tsx`: pantalla 404 para rutas o recursos que no existen.
- `forbidden.tsx`: pantalla 403 para contenido o acciones sin autorización.
- `unauthorized.tsx`: pantalla 401 cuando se requiere iniciar sesión.
- `error.tsx`: pantalla 500 recuperable para errores de una sección.
- `global-error.tsx`: pantalla de contingencia para errores críticos del layout o de la aplicación.
- Todas las pantallas mantienen la identidad visual y ofrecen **Volver atrás** y **Volver al Inicio**.
- Las pantallas 500 incluyen también **Intentar de nuevo**, usando el mecanismo `reset` de Next.js.

## Límites y consideraciones operativas

- Los datos dependen de la disponibilidad y cuotas de Firebase, Vercel, Cloudinary y Web Push.
- El cron de Vercel no debe considerarse un procesador en tiempo real; los recordatorios se ejecutan según el horario configurado.
- Las notificaciones web requieren permiso del navegador, una suscripción vigente y claves VAPID válidas; algunos navegadores o dispositivos pueden no soportarlas.
- Firestore puede mostrar datos almacenados en caché temporalmente. Las operaciones administrativas críticas deben volver a cargar la información antes de confirmar cambios.
- Las cargas de imágenes dependen de los límites configurados en Firebase Storage o Cloudinary. No se deben subir archivos innecesariamente grandes.
- La importación de Excel debe realizarse con el formato y nombres de columnas esperados por la pantalla de productos; conviene probar primero con un archivo pequeño.
- El sistema no reemplaza la conciliación contable, el control físico de inventario ni la confirmación logística con productores y repartidores.
- El stock, precios, costos y estados dependen de que los administradores mantengan actualizados los catálogos.
- Un usuario solo debe tener un rol válido: `consumidor`, `repartidor` o `admin`.
- No se deben compartir cuentas administrativas. La revocación de un rol debe hacerse desde el módulo de usuarios y verificarse cerrando la sesión del usuario afectado.
- No se deben incluir secretos en commits, archivos públicos, logs, parámetros de búsqueda ni variables `NEXT_PUBLIC_*`.
- La disponibilidad real de una función debe comprobarse con sus variables y servicios configurados; que la página exista no significa que el proveedor externo esté habilitado.

## Errores visibles para el usuario

La aplicación incluye pantallas de estado coherentes con la identidad visual:

| Código | Archivo | Uso |
|---|---|---|
| 401 | `apps/web/src/app/unauthorized.tsx` | Sesión requerida o expirada |
| 403 | `apps/web/src/app/forbidden.tsx` | Usuario autenticado sin autorización |
| 404 | `apps/web/src/app/not-found.tsx` | Ruta o recurso inexistente |
| 500 | `apps/web/src/app/error.tsx` | Error recuperable de una sección |
| 500 global | `apps/web/src/app/global-error.tsx` | Error crítico de la aplicación |

El diseño compartido está en `apps/web/src/components/feedback/StatusPage.tsx`. Cada pantalla ofrece **Volver atrás** y **Volver al Inicio**; las pantallas 500 ofrecen además **Intentar de nuevo**.

## Comandos útiles

```bash
pnpm dev                 # Desarrollo
pnpm build               # Compilación de producción
pnpm start               # Servir la compilación local
pnpm typecheck           # Verificación TypeScript
pnpm lint                # ESLint
pnpm test                # Pruebas de la aplicación
pnpm test:scripts        # Pruebas de scripts y seguridad
pnpm test:concurrency    # Pruebas de concurrencia de pedidos
pnpm test:all            # Suite combinada
pnpm importData          # Importación de datos
pnpm rollbackData        # Reversión de una importación compatible
pnpm migrateOrderNumbers # Migración de numeración de pedidos
```

## Documentación operativa

El manual paso a paso para administradores está en [MANUAL-ADMINISTRADORES.md](./MANUAL-ADMINISTRADORES.md).

## Seguridad y mantenimiento

Antes de cada despliegue se recomienda ejecutar `pnpm typecheck`, `pnpm build` y las pruebas disponibles. Las rutas protegidas deben seguir validando autenticación y autorización en el servidor; nunca se debe confiar en parámetros de URL, valores enviados desde el navegador o únicamente en el rol mostrado por `useAuth`.
