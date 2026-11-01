# Manual de administradores — Canastas Verdes

Este manual explica el uso operativo del sitio y del dashboard administrativo. Está dirigido a cuentas con rol `admin`. Las opciones visibles pueden variar si la cuenta tiene rol `repartidor` o `consumidor`.

## 1. Acceso y seguridad

1. Abra [canastas-verdes2026.vercel.app](https://canastas-verdes2026.vercel.app).
2. Seleccione **Iniciar sesión**.
3. Ingrese el correo y contraseña de una cuenta administrativa registrada en Firebase Authentication.
4. Abra **Dashboard** desde la navegación principal.
5. Compruebe que el panel muestre su correo y la etiqueta **admin**.

Si el sistema indica **Sin permisos**, la cuenta está autenticada pero el documento `usuarios/{uid}` no tiene el rol `admin`. Solicite a otro administrador autorizado que revise el módulo **Usuarios**.

Buenas prácticas:

- Use una cuenta individual; no comparta contraseñas.
- Cierre sesión en computadores compartidos.
- No intente habilitar opciones cambiando la URL o agregando parámetros: las APIs vuelven a validar permisos.
- No pegue tokens, claves privadas o secretos en formularios, tickets o chats.

## 2. Navegación del dashboard

El menú administrativo contiene:

| Sección | Uso principal |
|---|---|
| **Resumen** | Acceso rápido a los módulos y estado de la sesión |
| **Productos** | Crear, editar, activar, desactivar, eliminar e importar productos |
| **Disponibilidad** | Definir mensajes y estilos para productos sin stock o no disponibles |
| **Productores** | Administrar productores y sus datos de referencia |
| **Categorías** | Crear y mantener categorías del catálogo |
| **Presentaciones** | Administrar unidades y presentaciones |
| **Municipios** | Mantener municipios disponibles |
| **Veredas** | Mantener veredas relacionadas con los municipios |
| **Fincas** | Administrar fincas, puntos y lugares de recogida |
| **Usuarios** | Consultar usuarios, cambiar roles y administrar etiquetas |
| **Etiquetas** | Crear y organizar etiquetas de usuarios |
| **Pedidos** | Revisar, editar según permisos, asignar y actualizar pedidos |
| **Repartos** | Coordinar entregas y consultar estados |
| **Estadísticas** | Filtrar métricas y exportar resultados |

En tabletas y teléfonos el menú se desplaza horizontalmente. Si una opción no aparece, desplácese dentro de la barra de navegación.

## 3. Ventanas de error

El sitio muestra ventanas de error con la misma paleta, bordes y botones que el resto de Canastas Verdes. Todas incluyen:

- **Volver atrás:** regresa a la página anterior cuando existe historial; si no existe, lleva al inicio.
- **Volver al Inicio:** abre la página principal.

| Código | Significado | Acción recomendada |
|---|---|---|
| **401** | Se requiere una sesión válida | Iniciar sesión nuevamente y repetir la operación |
| **403** | La cuenta no tiene autorización | Confirmar el rol en **Usuarios** o solicitar acceso al administrador privilegiado |
| **404** | La página o recurso no existe | Revisar la dirección y volver a **Tienda** o al inicio |
| **500** | Error inesperado recuperable | Pulsar **Intentar de nuevo**; si persiste, registrar la URL y la operación |
| **500 global** | Error crítico al preparar la aplicación | Pulsar **Intentar de nuevo** o volver al inicio; informar al responsable técnico si continúa |

Estas ventanas no conceden permisos ni reemplazan la autorización del servidor. Un error 403 debe resolverse revisando la cuenta y el rol, no modificando la URL o agregando parámetros.

## 3. Flujo recomendado de operación

Para publicar y vender un producto:

1. Cree o verifique el **productor**.
2. Cree o verifique la **categoría**, **presentación**, **municipio** y **disponibilidad**.
3. Entre a **Productos** y registre el producto con código, nombre, unidad, precios, stock y relaciones.
4. Cargue la imagen solo si es necesaria y espere la confirmación.
5. Revise que el producto esté activo y visible en **Tienda**.
6. Haga un pedido de prueba en un entorno controlado o revise el flujo con una cuenta de consumidor.
7. Cuando llegue un pedido real, gestione su estado desde **Pedidos** y su asignación desde **Repartos**.

## 4. Productos

### Crear o editar un producto

Complete los campos disponibles en el formulario:

- Código único del producto.
- Nombre y descripción.
- Categoría, productor y municipio.
- Unidad o presentación.
- Precio base, costo, logística, transporte y precio de venta.
- Stock inicial.
- Imagen y nombre de imagen, si corresponde.
- Estado **Activo**.

Antes de guardar:

- Verifique que el precio de venta sea el esperado.
- Confirme que el stock sea numérico y no negativo.
- Compruebe la categoría y presentación para evitar duplicados.
- Use nombres claros; son los mismos que verá el consumidor en la tienda.

### Ejemplo

Para publicar papa criolla:

```text
Código: PAPA-CRIOLLA-1
Nombre: Papa criolla
Unidad: 1 x libra
Categoría: Tubérculos
Productor: Finca La Esperanza
Stock: 40
Activo: Sí
```

### Importación desde Excel

1. Abra **Productos**.
2. Seleccione la herramienta de importación.
3. Use una plantilla basada en los campos que muestra el formulario.
4. Pruebe primero con una fila.
5. Revise los mensajes de validación.
6. Corrija errores y repita la importación.

No elimine columnas requeridas ni mezcle fórmulas sin valores calculados. Mantenga una copia del archivo original para poder revisar o revertir la operación.

## 5. Disponibilidad y stock

Use **Disponibilidad** para definir mensajes como `Sin stock`, `Próximamente` o `Disponible por encargo`.

La configuración puede aplicarse por:

- Predeterminado.
- Producto individual.
- Categoría.
- Grupo existente.

Cuando existan varias reglas, revise la prioridad y el estado activo. Después de guardar, confirme el resultado en la tienda pública. Recuerde que el mensaje de disponibilidad no reemplaza la actualización del stock.

## 6. Pedidos

En **Pedidos**:

1. Busque por número, cliente o producto.
2. Abra el pedido y revise productos, cantidades, total, municipio, dirección o punto de recogida.
3. Verifique el estado actual.
4. Asigne un repartidor cuando el pedido esté listo para coordinar la entrega.
5. Actualice el estado conforme avance la operación.
6. Si el cliente solicita cancelación, confirme la política interna antes de cambiar el estado.

Estados utilizados por el sistema:

```text
pendiente → asignado → en_camino → entregado
pendiente/asignado/en_camino → cancelado
```

No marque un pedido como entregado antes de confirmar la entrega. Revise cuidadosamente municipio, dirección y teléfono antes de asignar un reparto.

## 7. Repartos

En **Repartos** puede filtrar por estado y buscar entregas. Un repartidor debe ver únicamente los repartos que le corresponden según la autorización del servidor.

Ejemplo de operación:

1. En **Pedidos**, confirme que el pedido está listo.
2. Asigne el repartidor.
3. En **Repartos**, compruebe que aparezca la asignación.
4. El repartidor cambia a `en_camino` cuando inicia el recorrido.
5. Cambie a `entregado` después de confirmar la recepción.
6. Si ocurre una incidencia, conserve el pedido en el estado correcto y registre la información por el canal operativo definido.

Los PDF y recibos deben abrirse desde enlaces generados por el sistema. No publique enlaces de recibos en canales públicos.

## 8. Usuarios, roles y etiquetas

En **Usuarios**:

- Consulte correo, nombre, estado y rol.
- Un administrador estándar puede gestionar etiquetas y asignar los roles `consumidor` o `repartidor`.
- Un administrador estándar no puede crear, modificar o degradar otra cuenta `admin`, ni cambiar su propio rol.
- El administrador con permisos elevados es la cuenta cuyo correo verificado coincide con `PRIVILEGED_ADMIN_EMAIL`. Puede gestionar cuentas administrativas y eliminar perfiles desde **Acciones sensibles**.
- Desactive o revise cuentas según el procedimiento interno.
- Gestione etiquetas para segmentar usuarios.

### Ejemplo de asignación

Para incorporar un repartidor:

1. Verifique que la persona tenga una cuenta registrada.
2. Busque su correo en **Usuarios**.
3. Cambie el rol a `repartidor`.
4. Guarde y pida al usuario cerrar y volver a iniciar sesión.
5. Compruebe que solo vea **Mis repartos**.

Reserve el rol `admin` para personal autorizado. El dashboard principal es completo para cualquier cuenta `admin`, pero las operaciones de cuentas administrativas y eliminación de perfiles están limitadas al administrador con permisos elevados. La cuenta privilegiada no puede eliminarse a sí misma.

## 9. Permisos por tipo de cuenta

| Cuenta | Dashboard | Usuarios | Pedidos y repartos |
|---|---|---|---|
| **Administrador estándar** | Acceso completo a catálogo, ubicaciones, pedidos, repartos y estadísticas | Consulta usuarios, administra etiquetas y asigna `consumidor`/`repartidor`; no gestiona cuentas `admin` ni elimina perfiles | Puede consultar y operar todos los pedidos y repartos |
| **Administrador con permisos elevados** | Igual que el administrador estándar | Además gestiona altas/bajas de cuentas `admin`, cambios de roles administrativos y eliminación privilegiada de perfiles | Puede operar todos los pedidos y repartos |
| **Repartidor** | Solo ve **Mis repartos** | Sin acceso a usuarios, catálogo ni estadísticas administrativas | Solo ve pedidos asignados a su UID; puede marcarlos `en_camino` y registrar la recepción para dejarlos `entregado` |
| **Consumidor** | Sin acceso al dashboard | Sin acceso a la gestión de usuarios | Solo consulta sus propios pedidos desde el área de cliente |

El servidor vuelve a validar estas reglas en cada API. Ocultar un enlace no es la medida de seguridad: modificar una URL, un parámetro de búsqueda o una petición desde el navegador no concede permisos.

### Flujo del repartidor

1. Un administrador asigna el pedido al usuario con rol `repartidor`.
2. El repartidor entra a **Dashboard > Mis repartos**.
3. Solo aparecen los pedidos cuyo `repartidorId` coincide con su cuenta.
4. Cuando inicia la ruta, usa **Marcar en camino**.
5. Al llegar, abre **Registrar recepción**, registra firma o confirmación textual y selecciona el medio de pago.
6. La confirmación válida cambia el pedido a `entregado`.
7. No puede asignar repartidores, cancelar pedidos, editar precios, consultar pedidos ajenos ni marcar como entregado un pedido no asignado.

## 10. Ubicaciones y catálogo auxiliar

Mantenga el orden lógico de los datos:

1. Municipio.
2. Vereda, si aplica.
3. Finca o punto de recogida.
4. Producto y productor relacionados.

Antes de desactivar o modificar una ubicación, revise si hay pedidos o productos que la utilizan. Una modificación de catálogo no corrige automáticamente datos históricos de pedidos.

## 11. Estadísticas y exportación

En **Estadísticas** puede filtrar por:

- Rango de fechas.
- Categoría.
- Producto.
- Productor.
- Municipio.
- Repartidor.

Las métricas incluyen ventas, costos, utilidad, margen, pedidos entregados, productos vendidos, consumidores, productos activos y stock actual. Para exportar:

1. Seleccione los filtros.
2. Espere a que se actualice el resumen.
3. Revise el período y los valores.
4. Use **Exportar**.
5. Guarde el archivo con una fecha y descripción de los filtros usados.

Estas métricas son operativas y dependen de la calidad de los pedidos, precios, costos y estados registrados. No sustituyen un sistema contable.

## 12. Imágenes y notificaciones

Las imágenes pueden almacenarse en Firebase Storage o cargarse mediante Cloudinary, según la configuración del entorno. Si una carga falla:

1. Compruebe que el archivo sea una imagen válida y no excesivamente grande.
2. Revise la conexión.
3. Compruebe que el entorno tenga configurado el proveedor correspondiente.
4. No copie manualmente URLs privadas en el catálogo sin autorización.

Las notificaciones requieren permiso del navegador y configuración VAPID. Si el usuario bloqueó las notificaciones, debe habilitarlas desde la configuración del navegador.

## 13. Problemas frecuentes

| Problema | Revisión recomendada |
|---|---|
| No aparece el dashboard | Confirmar sesión y rol `admin` en `usuarios/{uid}` |
| Error 401 | Iniciar sesión nuevamente y comprobar que la sesión no haya expirado |
| Error 403 | Revisar el rol; las operaciones administrativas sensibles requieren permisos elevados |
| Error 404 | Revisar el enlace y usar **Volver al Inicio** |
| Error 500 | Pulsar **Intentar de nuevo** y registrar el mensaje si vuelve a aparecer |
| El catálogo está vacío | Revisar productos activos, Firebase y filtros |
| No se puede crear un pedido | Revisar stock, disponibilidad, sesión y datos de entrega |
| No carga una imagen | Revisar tamaño, proveedor y variables de entorno |
| Un reparto no aparece | Confirmar asignación, estado y usuario repartidor |
| Estadísticas en cero | Revisar rango de fechas y que los pedidos estén entregados |
| No llegan notificaciones | Revisar permiso del navegador, suscripción y claves VAPID |
| El cron no ejecuta recordatorios | Revisar `CRON_SECRET`, VAPID y configuración de Vercel Cron |
| El formulario parece desactualizado | Recargar, cerrar sesión y volver a abrir; revisar consola solo en entornos de prueba |

Si el problema persiste, registre la fecha, usuario afectado, URL, operación realizada y mensaje visible. Nunca adjunte contraseñas, tokens ni claves privadas.

## 14. Lista de comprobación diaria

- [ ] Revisar productos activos y stock crítico.
- [ ] Confirmar pedidos pendientes y asignaciones.
- [ ] Revisar repartos en camino.
- [ ] Verificar que los puntos de recogida estén disponibles.
- [ ] Resolver errores de pedidos antes de cerrar la jornada.
- [ ] Exportar estadísticas si el proceso operativo lo requiere.
- [ ] Cerrar sesión en equipos compartidos.
