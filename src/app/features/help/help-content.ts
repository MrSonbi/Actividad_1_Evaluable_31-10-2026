/** Sección de la página de ayuda. */
export interface HelpSection {
  /** Identificador, usado también en el parámetro `?section=` de la URL. */
  id: string;
  /** Título visible en el acordeón. */
  title: string;
  /** Pasos o indicaciones principales, en el orden en que se muestran. */
  items: readonly string[];
  /** Si es `true`, solo se muestra a los administradores. */
  adminOnly?: boolean;
}

/** Resumen de `docs/MANUAL_USUARIO.md`. Si cambia uno, hay que revisar el otro. */
export const HELP_SECTIONS: readonly HelpSection[] = [
  {
    id: 'access',
    title: 'Acceso y roles',
    items: [
      'Escribe tu correo electrónico y tu contraseña y pulsa «Entrar».',
      'Los usuarios consultan todos los listados y pueden crear y editar clientes.',
      'Los administradores, además, gestionan los productos, eliminan clientes y ven el Dashboard.',
      'Pulsa «Cerrar sesión», al final del menú, para salir.',
    ],
  },
  {
    id: 'tables',
    title: 'Consultar las tablas',
    items: [
      'Escribe en «Buscar» para filtrar la tabla mientras escribes.',
      'Pulsa el título de una columna para ordenar; púlsalo otra vez para invertir el orden.',
      'Usa «Anterior» y «Siguiente» para cambiar de página. Cada página muestra 10 filas.',
    ],
  },
  {
    id: 'products',
    title: 'Productos',
    items: [
      'Consulta el catálogo con su SKU, categoría, precio y stock.',
      'Administradores: pulsa «Nuevo producto», rellena el formulario y pulsa «Crear producto».',
      'Administradores: usa «Editar» o «Eliminar» en la fila. Eliminar no se puede deshacer.',
      'Cada SKU debe ser único: la aplicación te avisa si ya existe.',
    ],
  },
  {
    id: 'customers',
    title: 'Clientes',
    items: [
      'Pulsa «Nuevo cliente», escribe el nombre y el email y pulsa «Crear cliente». El teléfono y la ciudad son opcionales.',
      'Pulsa «Editar» en la fila para cambiar sus datos.',
      'No puede haber dos clientes con el mismo email: la aplicación te avisa si ya existe.',
      'Administradores: usa «Eliminar» en la fila. Esta acción no se puede deshacer.',
    ],
  },
  {
    id: 'orders',
    title: 'Pedidos',
    items: [
      'Esta pantalla es de solo lectura: permite consultar los pedidos, pero no modificarlos.',
      'Elige una opción en «Estado» para ver solo los pedidos pendientes, pagados, enviados o cancelados.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    adminOnly: true,
    items: [
      'Los indicadores generales resumen todos los datos y no cambian con los filtros.',
      'Elige el periodo y el estado para actualizar al momento los indicadores del periodo y los gráficos de pedidos.',
      '«Actividad en vivo» muestra los últimos movimientos sin recargar la página.',
      'La campana cuenta los movimientos nuevos; púlsala para ponerla a cero.',
      'Si los datos no se cargan, pulsa «Reintentar».',
    ],
  },
  {
    id: 'export',
    title: 'Exportar a CSV y PDF',
    items: [
      'Pulsa «Exportar CSV» o «Exportar PDF» encima de la tabla.',
      'El archivo incluye todas las filas que cumplen la búsqueda y los filtros, no solo las de la página visible.',
      'CSV sirve para abrirlo con una hoja de cálculo y PDF para imprimirlo o compartirlo.',
    ],
  },
  {
    id: 'appearance',
    title: 'Modo claro y oscuro',
    items: [
      'Al principio, la aplicación usa el modo configurado en tu dispositivo.',
      'Para cambiarlo, pulsa el botón redondo con el icono de la luna o del sol, arriba a la derecha.',
      'Tu elección se recuerda en este navegador la próxima vez que entres.',
    ],
  },
  {
    id: 'pwa',
    title: 'Instalar la aplicación',
    items: [
      'Ordenador (Chrome o Edge): pulsa el icono de instalar de la barra de direcciones.',
      'Android (Chrome): abre el menú del navegador y pulsa «Instalar aplicación» o «Añadir a pantalla de inicio».',
      'iPhone o iPad (Safari): pulsa «Compartir» y después «Añadir a pantalla de inicio».',
      'Para trabajar con los datos necesitas conexión a internet.',
    ],
  },
];
