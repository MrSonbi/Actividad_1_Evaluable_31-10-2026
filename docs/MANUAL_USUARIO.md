# Manual de usuario

Esta aplicación sirve para gestionar los **productos**, los **clientes** y los **pedidos** de una empresa. Funciona en el navegador del ordenador, de la tableta y del móvil, y no hace falta instalar nada para usarla.

## Índice

1. [Acceso a la aplicación](#1-acceso-a-la-aplicación)
2. [Roles: qué puede hacer cada usuario](#2-roles-qué-puede-hacer-cada-usuario)
3. [Moverse por la aplicación](#3-moverse-por-la-aplicación)
4. [Consultar las tablas](#4-consultar-las-tablas)
5. [Productos](#5-productos)
6. [Clientes](#6-clientes)
7. [Pedidos](#7-pedidos)
8. [Dashboard (solo administradores)](#8-dashboard-solo-administradores)
9. [Exportar a CSV y PDF](#9-exportar-a-csv-y-pdf)
10. [Modo claro y modo oscuro](#10-modo-claro-y-modo-oscuro)
11. [Instalar la aplicación (PWA)](#11-instalar-la-aplicación-pwa)
12. [Problemas frecuentes](#12-problemas-frecuentes)

## 1. Acceso a la aplicación

**Para entrar:**

1. Abre la dirección de la aplicación en el navegador.
2. Escribe tu **correo electrónico** y tu **contraseña** (tiene al menos 6 caracteres).
3. Pulsa **Entrar**.

Si eres administrador, llegarás al **Dashboard**. Si eres usuario, llegarás a **Productos**. La sesión se mantiene abierta aunque cierres el navegador.

**Para salir:** pulsa **Cerrar sesión**, al final del menú. Hazlo siempre que uses un ordenador compartido.

Las cuentas las entrega el responsable de la aplicación: no se pueden crear desde esta pantalla.

## 2. Roles: qué puede hacer cada usuario

Tu nombre y tu rol aparecen al final del menú.

| Acción                                        | Administrador (`admin`) | Usuario (`user`) |
| --------------------------------------------- | ----------------------- | ---------------- |
| Ver productos, clientes y pedidos             | Sí                      | Sí               |
| Exportar listados a CSV y PDF                 | Sí                      | Sí               |
| Crear y editar clientes                       | Sí                      | Sí               |
| Eliminar clientes                             | Sí                      | No               |
| Crear, editar y eliminar productos            | Sí                      | No               |
| Ver el Dashboard                              | Sí                      | No               |

Los botones que tu rol no permite no aparecen. Si intentas abrir una página sin permiso, verás el aviso de **acceso denegado**.

## 3. Moverse por la aplicación

- **En un ordenador**, el menú está siempre visible a la izquierda.
- **En un móvil o una tableta**, el menú está oculto. Ábrelo con el botón de las tres rayas, arriba a la izquierda.

También puedes usar la aplicación solo con el teclado: pulsa **Tab** para avanzar, **Mayús + Tab** para retroceder e **Intro** para activar. Al pulsar **Tab** por primera vez aparece el enlace **Saltar al contenido**, que evita recorrer todo el menú.

La opción **Ayuda** del menú abre un resumen de este manual, con la sección de la pantalla en la que estabas ya desplegada.

## 4. Consultar las tablas

Productos, clientes y pedidos se muestran en tablas que funcionan igual:

- **Buscar:** escribe en el cuadro **Buscar** y la tabla se filtra mientras escribes.
- **Ordenar:** pulsa el título de una columna. Si lo pulsas otra vez, se invierte el orden.
- **Cambiar de página:** usa **Anterior** y **Siguiente**. Cada página muestra 10 filas.

En pantallas pequeñas, cada fila se muestra como una tarjeta.

## 5. Productos

Todos los usuarios pueden consultar el catálogo: SKU (código del producto), nombre, categoría, precio, stock y fecha de alta. Solo los administradores pueden hacer cambios.

**Crear un producto (administrador):**

1. Pulsa **Nuevo producto**.
2. Rellena el SKU, el nombre, la categoría, el precio y el stock.
3. Pulsa **Crear producto**.

Cada SKU debe ser único. La aplicación lo comprueba mientras escribes y te avisa si ya existe.

**Editar un producto (administrador):** pulsa **Editar** en su fila, cambia los datos y pulsa **Guardar cambios**.

**Eliminar un producto (administrador):** pulsa **Eliminar** en su fila y confirma. **Esta acción no se puede deshacer.**

## 6. Clientes

Todos los usuarios pueden consultar, crear y editar clientes. Solo los administradores pueden eliminarlos.

**Crear un cliente:**

1. Pulsa **Nuevo cliente**.
2. Escribe el nombre completo y el email. El teléfono y la ciudad son opcionales.
3. Pulsa **Crear cliente**.

No puede haber dos clientes con el mismo email. La aplicación lo comprueba mientras escribes.

**Editar un cliente:** pulsa **Editar** en su fila, cambia los datos y pulsa **Guardar cambios**.

**Eliminar un cliente (administrador):** pulsa **Eliminar** en su fila y confirma. **Esta acción no se puede deshacer.**

## 7. Pedidos

Esta pantalla es **de solo lectura**: permite consultar los pedidos, pero no crearlos ni modificarlos.

Para ver solo los pedidos de un estado, elígelo en el desplegable **Estado**:

| Estado    | Significado                 |
| --------- | --------------------------- |
| Pendiente | El pedido aún no se ha pagado |
| Pagado    | El pedido está pagado       |
| Enviado   | El pedido ya se ha enviado  |
| Cancelado | El pedido se ha anulado     |

Para volver a verlos todos, elige **Todos los estados**.

## 8. Dashboard (solo administradores)

El Dashboard resume la actividad del negocio.

- **Indicadores generales:** productos, clientes, pedidos, ingresos y productos con poco stock (menos de 10 unidades). Se refieren a todos los datos y los filtros no les afectan.
- **Filtros:** elige el **Periodo** (últimos 3, 6 o 12 meses) y el **Estado**. La pantalla se actualiza al momento.
- **Indicadores del periodo:** pedidos, ingresos e importe medio según los filtros.
- **Gráficos:**
  - *Ingresos por mes*: no incluye los pedidos cancelados.
  - *Pedidos por estado*: reparto de los pedidos que cumplen los filtros.
  - *Productos por categoría*: no depende de los filtros.
- **Actividad en vivo:** muestra las últimas altas, ediciones y borrados, con quién los hizo, sin recargar la página. La campana de la barra superior cuenta los movimientos nuevos; púlsala para ponerla a cero.

Si los datos no se cargan, pulsa **Reintentar**.

## 9. Exportar a CSV y PDF

Cada tabla tiene los botones **Exportar CSV** y **Exportar PDF**. El archivo incluye **todas las filas que cumplen la búsqueda y los filtros**, no solo las de la página visible, y respeta el orden de la tabla. Los botones se desactivan si no hay filas.

- **CSV:** para abrirlo con una hoja de cálculo, como Excel.
- **PDF:** para imprimirlo o compartirlo. Incluye el título, la fecha, quién lo ha generado y el número de página.

En el **Dashboard**, los botones **Exportar PDF** y **Exportar CSV** generan un resumen de los indicadores y de los datos de los gráficos, con los filtros aplicados.

## 10. Modo claro y modo oscuro

Al principio, la aplicación **usa el modo que tenga configurado tu dispositivo**.

Para cambiarlo, pulsa el botón redondo con el icono de la luna o del sol, arriba a la derecha de la pantalla. Está en la pantalla de acceso y en las de Dashboard, Productos, Clientes, Pedidos y Ayuda. Tu elección se recuerda en este navegador la próxima vez que entres.

## 11. Instalar la aplicación (PWA)

Puedes instalar la aplicación para abrirla desde un icono propio, como cualquier otro programa. La instalación solo está disponible en la versión publicada, y sigues necesitando tu cuenta para entrar.

- **Ordenador (Chrome o Edge):** pulsa el icono de instalar de la barra de direcciones y confirma.
- **Android (Chrome):** abre el menú del navegador y pulsa **Instalar aplicación** o **Añadir a pantalla de inicio**.
- **iPhone o iPad (Safari):** pulsa **Compartir** y después **Añadir a pantalla de inicio**.

Para trabajar con los datos necesitas conexión a internet.

## 12. Problemas frecuentes

| Qué ocurre                                 | Qué hacer                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| No puedo entrar                            | Revisa el correo y la contraseña. Si sigue fallando, avisa al responsable. |
| Me devuelve a la pantalla de acceso        | La sesión ha caducado. Vuelve a entrar.                                   |
| No veo un botón o el Dashboard             | Tu rol no lo permite (consulta el [apartado 2](#2-roles-qué-puede-hacer-cada-usuario)). |
| «Ya existe un cliente con ese email»       | Ese cliente ya está registrado: búscalo en la tabla y edítalo.            |
| Un error al cargar o guardar               | Comprueba tu conexión a internet y vuelve a intentarlo.                   |
| El botón de exportar no se puede pulsar    | No hay filas: cambia la búsqueda o el filtro.                             |
