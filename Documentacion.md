# Documentación del software — Canastas Verdes 2026

## 1. Identificación del proyecto

**Canastas Verdes 2026** es una aplicación web para la comercialización y operación de canastas y productos frescos provenientes de productores locales. El sistema reúne:

- Catálogo público de productos.
- Registro e inicio de sesión de consumidores, repartidores y administradores.
- Carrito y creación de pedidos.
- Gestión de inventario y disponibilidad.
- Entregas a domicilio y puntos de recogida.
- Coordinación de repartos.
- Panel administrativo.
- Estadísticas operativas y exportaciones.
- Notificaciones web y recordatorios programados.

### Estado documentado

- **Repositorio:** `DavidEBM/Canastas_Verdes2026`
- **Rama de referencia:** `main`
- **Aplicación publicada:** <https://canastas-verdes2026.vercel.app>
- **Frontend y API:** Vercel con Next.js App Router.
- **Autenticación y datos:** Firebase Authentication y Cloud Firestore.
- **Archivos multimedia:** Cloudinary y Firebase Storage, según el flujo.
- **Automatización:** Vercel Cron.
- **Último commit confirmado en la línea principal:** `67c18fe`, 01-11-2026.

> Las fechas de la línea de tiempo corresponden al historial Git disponible. Una fecha de commit no necesariamente representa la fecha exacta de despliegue público.

---

## 2. Línea de tiempo del proyecto

### 22-08-2026 — Primera publicación del repositorio

**Commit:** `7351647` — `Initial commit`

Se creó la primera versión registrada del proyecto. Esta publicación estableció la base inicial de Canastas Verdes 2026 y el punto de partida para las iteraciones posteriores basado en el antiguo repositorio que fue creado para su deploy en servidor fisico.

### 24-08-2026 — Primera carga funcional sin imágenes

**Commit:** `c4a4260` — `First load without imgs`

Se realizó la primera carga del proyecto sin incorporar todavía el conjunto de imágenes del sistema permitiendo una primera visualizacion de la web sin productos.

### 24-08-2026 — Limpieza de caché

**Commit:** `dd8f17b` — `gitignore cache`

Se ajustó el control de versiones para excluir archivos de caché y artefactos temporales.

### 24-08-2026 — Imágenes locales temporales

**Commit:** `2a5127d` — `update temporal con imagenes locales (posteriormente en la nube)`

Se incorporaron imágenes locales de forma temporal, dejando prevista la posterior migración o uso de almacenamiento en la nube.

### 28-08-2026 — Versión 0.3 inicial del módulo de productos

**Commit:** `b0977f9` — `Update v0.3, para testeo de crear productos...`

Se habilitó el testeo de creación de productos. En esta etapa todavía estaba pendiente completar la lógica del resto del CRUD y algunas ventanas de interfaz.

### 28-08-2026 — Variables de Turbo

**Commit:** `92540aa` — `variables para turbo.json`

Se configuraron variables relacionadas con Turbo y el entorno de trabajo del monorepo.

### 04-09-2026 — Versión 0.0.4a

**Commit:** `4288ed8` — `Actualizacion 0.0.4 a`

Se revisaron funcionalidades generales del dashboard, registro e inicio de sesión. El registro y el login se mantuvieron temporalmente con capacidades reducidas mientras se completaban:

- Apartados del dashboard.
- Configuración de usuario.
- Inicio de sesión con Google.

### 08-09-2026 — Versión 0.0.5a

**Commits:** `1d6b34d` y `1175cef`

Se realizaron cambios generales y se habilitó un dashboard orientado a pruebas básicas de uso.

### 08-09-2026 — Integración de rama principal

**Commit:** `3d6cb49` — `Merge branch 'main'...`

Se integraron cambios procedentes de la rama principal del repositorio.

### 11-09-2026 — Versión 0.0.6a

**Commit:** `b7f81cd` — `actualizacion general 0.0.6a`

Se amplió la aplicación con:

- Cambios de layout.
- Cambio conceptual de “usuario” a “consumidor”.
- Cambio de “granja” a “productor”.
- Ajustes de lógica interna.
- Nuevas herramientas.
- Mejoras visuales, incluido el footer.

### 18-09-2026 — Versión 0.0.7a y ampliación operativa

**Commit:** `c547eed` — `actualizacion general 0.0.7a`

Se implementaron y/o refactorizaron:

- Ubicaciones de recogida de productos.
- Notificaciones del navegador.
- Consentimiento de cookies.
- Políticas de privacidad.
- Dashboard administrativo con nuevas opciones.
- Preparación para pruebas desde enlaces web en línea.
- Limpieza de datos y configuración de Firebase.

### 18-09-2026 — Ajustes para Vercel

**Commit:** `189f1ec` — `fastFix variables para vercel`

Se corrigieron variables necesarias para el despliegue en Vercel.

### 20-10-2026 — Versión 0.0.8a

**Commit:** `138b8f5` — `Actualizacion 0.0.8a`

Se aplicaron cambios de visuales, lógica y variables solicitados por Suyusama. La exportación a Excel permanecía pendiente en esa etapa.

### 01-11-2026 — Versión 0.0.8a consolidada

**Commit:** `225087c` — `update 0.0.8 a`

Se incorporaron cambios requeridos por Suyusama sobre la versión 0.0.8a.

### 01-11-2026 — Versión 0.0.9a

**Commit:** `dbe8f0e` — `anterior y esta son la update 0.0.9 a`

Se completaron los cambios requeridos por suyusama y una optimización básica en:

- Seguridad.
- Interfaz visual.
- Funcionalidades generales.

El documento de los cambios se encuentra en https://docs.google.com/document/d/1G9vgQi_P4nA2_gOnKIAfePUa0qDy5Wxrx5o6Y8kaXVA/edit?usp=sharing


### 01-11-2026 — Corrección final de configuración de entorno

**Commit:** `67c18fe` — `fastfix turbo.json para .env`

Se corrigió `turbo.json` para manejar correctamente variables relacionadas con `.env`.

### 05-11-2026 — Actualización documentacion, usuarios y parches.

En el estado de trabajo actual y ultima version subida se revisaron y ajustaron los flujos de autenticación:

- Inicio de sesión con correo y contraseña.
- Registro con correo y contraseña.
- Registro e inicio de sesión con Google.
- Enlace de una contraseña a cuentas creadas con Google.
- Validación de que el correo del perfil coincida con la identidad verificada de Firebase.

### 07-11-2026 — Contenido público editable y caché optimizada

Se incorporó un sistema de contenido administrable para las páginas públicas. Los administradores pueden editar textos, títulos, enlaces, imágenes informativas y fondos desde botones con icono de lápiz. También se habilitó la gestión del carrusel **Nuestros aliados**, incluyendo imágenes, activación, título, descripción y velocidad.

El contenido se guarda en `contenidoSitio`. El documento `siteMeta` centraliza `lastDateUpdated` y la versión global para que el navegador consulte primero la metadata y descargue el contenido completo únicamente cuando sea necesario. Cada página se conserva además en `localStorage` y en una caché de memoria de la sesión.

En **Conócenos** se añadieron secciones editables sobre productores, fincas, productos y **Misión y Visión**, además de los valores existentes.



---

## 3. Arquitectura técnica

### Estructura del repositorio


Canastas_Verdes2026/
├── apps/
│   └── web/                 Aplicación Next.js
├── packages/
│   ├── config/              Configuración compartida
│   ├── firebase-admin/      Paquete relacionado con Firebase Admin
│   └── shared/              Tipos y utilidades compartidas
├── scripts/
│   ├── migrations/          Migraciones y rollback de datos
│   ├── security/            Pruebas de seguridad
│   └── tests/               Pruebas de concurrencia y unidad
├── README.md
├── MANUAL-ADMINISTRADORES.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── vercel.json


### Aplicación web

La aplicación se encuentra en `apps/web` y utiliza:

- Next.js 16.
- React 19.
- TypeScript.
- Tailwind CSS.
- Firebase Web SDK.
- Firebase Admin SDK.
- Zod para validaciones donde corresponde.
- Vitest para pruebas.

### Rutas públicas principales

- `/` — página principal.
- `/tienda` — catálogo público.
- `/ubicaciones` — ubicaciones disponibles.
- `/contacto` — contacto.
- `/aboutUs` — información del proyecto.
- `/politica-cookies` — política de cookies.
- `/login` — inicio de sesión.
- `/register` — creación de cuenta.

### Rutas de consumidor

- `/perfil` — consulta y edición del perfil propio.
- `/checkout` — confirmación y creación de pedidos.
- `/pedidos` — listado de pedidos propios.
- `/pedidos/[id]` — detalle de un pedido.
- `/recibo/[id]` — consulta del recibo.

### Dashboard administrativo

- `/dashboard` — resumen administrativo.
- `/dashboard/productos` — CRUD e importación de productos.
- `/dashboard/categorias` — categorías.
- `/dashboard/productores` — productores.
- `/dashboard/presentaciones` — presentaciones.
- `/dashboard/disponibilidad` — reglas y mensajes de disponibilidad.
- `/dashboard/municipalidades` — municipios.
- `/dashboard/veredas` — veredas.
- `/dashboard/lugares-recogida` — fincas y puntos de recogida.
- `/dashboard/usuarios` — usuarios y roles.
- `/dashboard/etiquetas` — etiquetas.
- `/dashboard/pedidos` — gestión de pedidos.
- `/dashboard/repartos` — coordinación de entregas.
- `/dashboard/estadisticas` — métricas y exportaciones.
- `/dashboard/contenido` — administración del contenido editable de las páginas públicas.

---

## 4. Autenticación y autorización

### Proveedores de acceso

El sistema usa Firebase Authentication con:

- Correo y contraseña.
- Google.

Las cuentas nuevas se almacenan en Firebase Authentication y su información de negocio se guarda en `usuarios/{uid}` en Firestore.

Una cuenta creada con Google puede configurar una contraseña. La aplicación enlaza ambos métodos con el mismo UID mediante `linkWithCredential`, por lo que el usuario puede entrar de las dos formas sin crear cuentas duplicadas.

Mientras una cuenta Google no tenga contraseña enlazada, se muestra un modal bloqueante en toda la aplicación. El usuario no puede interactuar con otras funciones ni cerrar el modal hasta guardarla; si abandona la sesión antes de completar el proceso, el modal vuelve a aparecer al restaurar la sesión o al iniciar nuevamente con Google.

### Flujo de registro local

1. El usuario acepta los términos.
2. Ingresa nombre, apellidos, correo y contraseña.
3. Firebase crea la cuenta.
4. Se crea o completa el documento `usuarios/{uid}`.
5. Se envía correo de verificación.
6. La sesión se cierra hasta que el correo sea confirmado.

### Flujo de Google

1. El usuario autentica Google mediante popup.
2. Se obtiene el nombre y correo de Google.
3. Se crea o sincroniza el perfil de Firestore.
4. Si no existe proveedor `password`, se solicita una contraseña.
5. La contraseña se enlaza al usuario existente.
6. El mismo usuario puede volver a entrar por Google o por correo y contraseña.

### Roles

Los roles soportados son:

- `consumidor`
- `repartidor`
- `admin`

El rol autoritativo se lee desde `usuarios/{uid}.Rol`. La interfaz puede ocultar opciones, pero la seguridad definitiva se aplica en las rutas API del servidor.

### Administración privilegiada

Las operaciones sensibles requieren:

- Token Firebase válido.
- Rol `admin`.
- Correo verificado.
- Coincidencia con `PRIVILEGED_ADMIN_EMAIL` para las operaciones privilegiadas.

Estas operaciones incluyen la gestión de cuentas administrativas y la eliminación privilegiada de perfiles.

---

## 5. Datos principales

### Colecciones de Firestore

- `usuarios` — perfiles, roles, aceptación de términos y etiquetas.
- `productos` — catálogo e inventario.
- `categorias` — categorías del catálogo.
- `productores` — productores locales.
- `presentaciones` — unidades y presentaciones.
- `municipalidades` — municipios.
- `veredas` — veredas.
- `fincas` y puntos relacionados — lugares de recogida.
- `pedidos` — pedidos de consumidores.
- `contenidoSitio` — textos, imágenes, enlaces y configuración visual de las páginas públicas.
- Colecciones de repartos, notificaciones y auditoría según el flujo.

### Identidad de usuarios

El UID de Firebase Authentication es el identificador del documento de Firestore. Esta relación evita depender del correo como clave principal y permite que varios proveedores de acceso pertenezcan a la misma cuenta.

### Campos frecuentes del perfil

```text
Nombres
Apellidos
NombreCompleto
Correo
Telefono
Direccion
Rol
Etiquetas
FechaRegistro
AceptacionTerminos
ultimaActualizacion
```

### Contenido público (`contenidoSitio`)

La colección utiliza los documentos `inicio`, `productos`, `aboutUs`, `fincas`, `contacto` y `aliados`. Cada documento contiene un objeto `content` normalizado contra sus valores predeterminados, además de información de actualización. El documento `siteMeta` contiene la fecha global `lastDateUpdated` y la versión utilizada para detectar cambios.

Las imágenes se guardan como objetos con `url`, `publicId` y `alt`. El carrusel de aliados utiliza una lista de elementos con identificador, imagen y estado `active`, junto con `speed` para la velocidad automática. Las actualizaciones se validan en el servidor y solo las cuentas con rol `admin` pueden guardarlas.

### Estrategia de lectura y caché

1. La página carga valores predeterminados y revisa memoria y `localStorage`.
2. Si existe una fecha local, consulta únicamente la metadata global.
3. Si `lastDateUpdated` coincide, conserva el contenido local sin descargar la página completa.
4. Si cambia, descarga el contenido actualizado y reemplaza la caché.
5. Si el navegador no tiene `lastDateUpdated`, realiza la comparación de metadata y solicita el contenido completo para crear la primera copia local.
6. Los cambios guardados por un administrador actualizan la caché de la pestaña y notifican a otras pestañas mediante eventos del navegador.

---

## 6. Flujos operativos

### Publicación de productos

1. Crear o verificar productor.
2. Crear categoría y presentación.
3. Verificar municipio y disponibilidad.
4. Registrar el producto.
5. Configurar precio, stock, imagen y estado activo.
6. Confirmar la visibilidad en la tienda pública.

### Pedido

1. El consumidor selecciona productos.
2. El sistema valida disponibilidad y stock.
3. El consumidor selecciona domicilio o recogida.
4. Se crea el pedido.
5. El administrador revisa y asigna la operación.
6. El sistema genera recibo cuando corresponde.

### Estados de pedido

```text
pendiente → asignado → en_camino → entregado
pendiente/asignado/en_camino → cancelado
```

### Repartos

Los repartidores solo deben consultar y operar los repartos autorizados para su usuario. El administrador coordina las asignaciones desde el dashboard.

### Notificaciones

El sistema soporta notificaciones web y recordatorios programados. La tarea cron configurada en `vercel.json` ejecuta:

```text
/api/cron/recordatorios-compras
```

con programación semanal los sábados a las 14:00 UTC, según la configuración del proyecto.

---

## 7. Seguridad

### Principios aplicados

- Verificación de tokens Firebase en el servidor.
- Revalidación de roles en las APIs.
- Separación entre Firebase Web SDK y Firebase Admin SDK.
- No confiar en roles enviados por el cliente.
- No aceptar un correo de perfil distinto al correo autenticado.
- Protección adicional para operaciones administrativas sensibles.
- Preservación anonimizada de registros históricos al eliminar perfiles.
- Uso de variables de entorno para credenciales y secretos.

### Variables sensibles

Las credenciales no deben almacenarse en Git. La configuración debe suministrarse mediante el entorno de Vercel o archivos locales excluidos del control de versiones.

Entre las variables esperadas se encuentran:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
PRIVILEGED_ADMIN_EMAIL
CRON_SECRET
```

Los nombres exactos y los valores deben comprobarse en el entorno de despliegue antes de publicar.

---

## 8. Instalación y desarrollo

### Requisitos

- Node.js compatible con Next.js 16.
- pnpm 10.15.0.
- Proyecto Firebase configurado.
- Variables de entorno disponibles.

### Instalación

Desde la raíz:

```bash
pnpm install
```

### Desarrollo

```bash
pnpm dev
```
ó
```bash
npm dev
```

Para trabajar solamente en la aplicación web:

```bash
pnpm --filter @canastas-verdes-2026/web dev
```

### Validación

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:security
pnpm test:concurrency
```

El resultado de las pruebas depende de que las dependencias estén instaladas y de que cada paquete tenga su configuración de lint y entorno disponible.

### Construcción

```bash
pnpm build
```

---

## 9. Despliegue

El proyecto está preparado para Vercel. Antes de desplegar:

1. Verificar el proyecto y la rama objetivo.
2. Configurar las variables de entorno.
3. Confirmar dominios autorizados en Firebase Authentication.
4. Verificar credenciales de Firebase Admin.
5. Revisar la configuración de cron.
6. Ejecutar typecheck, lint, pruebas y build.
7. Probar login, registro, catálogo, checkout y dashboard.
8. Revisar los logs de Vercel y Firebase.

La URL de producción documentada es:

<https://canastas-verdes2026.vercel.app>

---

## 10. Administración

El manual operativo detallado se encuentra en [MANUAL-ADMINISTRADORES.md](./MANUAL-ADMINISTRADORES.md).

En resumen:

- Los consumidores crean pedidos y consultan sus propios datos.
- Los repartidores gestionan únicamente los repartos asignados.
- Los administradores operan catálogo, pedidos, repartos, ubicaciones, usuarios y estadísticas.
- Los cambios de roles administrativos y la eliminación de perfiles requieren permisos elevados.
- No se deben compartir cuentas ni contraseñas administrativas.

---

## 11. Estado actual y pendientes conocidos

### Funcionalidades implementadas

- Catálogo y gestión de productos.
- CRUD de categorías, productores, presentaciones y ubicaciones.
- Registro e inicio de sesión.
- Acceso por Google.
- Enlace de contraseña para cuentas Google.
- Perfiles de usuario.
- Roles y autorización administrativa.
- Pedidos y repartos.
- Notificaciones y recordatorios.
- Dashboard y estadísticas.
- Etiquetas de usuarios.
- Auditoría de operaciones sensibles.

### Aspectos que deben verificarse antes de una nueva publicación

- Variables de entorno de producción.
- Dominios autorizados para Google/Firebase.
- Configuración de `PRIVILEGED_ADMIN_EMAIL`.
- Ejecución completa de las pruebas.
- Build de producción.
- Exportaciones y formatos esperados.
- Funcionamiento real de la tarea cron.
- Revisión de documentos de Firestore y datos históricos.

---

## 12. Mantenimiento de esta documentación

Cada publicación relevante debe agregar una entrada a la línea de tiempo con:

1. Fecha.
2. Versión o identificador de commit.
3. Resumen funcional.
4. Cambios de seguridad o infraestructura.
y/o
5. Pendientes conocidos.

Cuando un cambio exista solamente en el entorno local, debe marcarse como **actualización local** hasta que haya sido incorporado al repositorio y desplegado.
