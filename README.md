# Pulso

Panel de administración para un negocio pequeño que vende productos (con stock) y servicios. Registra ventas, catálogo, clientes y gastos; muestra indicadores y reportes mensuales; asigna roles al equipo y guarda un registro de cada cambio.

En esta rama (`datos-de-prueba`), la primera vez que se abre en un navegador sin datos del negocio guardados (artículos, clientes, ventas o gastos) carga un negocio de ejemplo:
- 8 artículos, 2 de ellos con poco stock.
- 8 clientes.
- Unas 60 ventas de los últimos 2 meses, algunas por cobrar.
- Gastos fijos y variables.
- 4 miembros, uno por rol.

Los datos salen de `src/datos/local/datosDePrueba.ts`. Para volver a cargarlos, borra los datos del sitio en el navegador. La rama `main` empieza vacía.

**Versión publicada:** https://dexter-mouser.github.io/pulso/
- Cada push a `datos-de-prueba` la vuelve a publicar con el flujo `.github/workflows/pages.yml`: comprueba tipos, compila con la ruta `/pulso/` y sube `dist/` a GitHub Pages.
- También se puede lanzar a mano desde la pestaña Actions.
- Los datos que se crean en la versión publicada se guardan solo en el navegador de quien la usa.
- `main` solo se publica a mano con `.github/workflows/deploy.yml` y reemplaza a esta versión.

## Requisitos

- Node.js 18 o superior

## Instalación y uso

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # comprueba tipos y genera dist/
npm run preview   # sirve la versión compilada
```

## Tecnología

- React 18 y Vite 5.
- TypeScript estricto.
- GSAP 3 con `@gsap/react`.
- CSS Modules.
- `@supabase/supabase-js`, solo en modo Supabase.
- Tipografía Plus Jakarta Sans.

## Qué incluye

**Pestañas** (cada una con lista, búsqueda, filtros, crear, editar y borrar):

| Pestaña | Contenido |
|---|---|
| Resumen | Indicadores animados del mes (ventas, ticket promedio, clientes nuevos, poco stock), últimas ventas y «Requiere tu atención» (cobros pendientes y stock bajo) |
| Ventas | Ventas con varias líneas, impuesto, método de pago y estado Pagada o Pendiente. Registrar una venta descuenta stock y borrarla lo devuelve |
| Productos | Catálogo de productos (precio, costo, margen, stock y stock mínimo) y servicios |
| Clientes | Datos de contacto, compras y total comprado |
| Gastos | Gastos por categoría y método de pago |
| Reportes | Ingresos, gastos, utilidad y ticket promedio por mes, ventas por día, más vendidos y gastos por categoría |

**Insignias.** Las pestañas Ventas (cobros pendientes) y Productos (poco stock) muestran un número, igual que la campana. Si el número es 0, no se muestra.

**Menú lateral.** Se despliega sobre el contenido al pasar el cursor o al enfocarlo con el teclado. Sus acciones abren un panel deslizante:
- Buscar en todo el negocio.
- Nueva venta, Nuevo producto, Nuevo cliente y Registrar gasto.
- Roles y equipo.
- Registro de cambios.
- Ajustes del negocio: nombre, moneda e impuesto.
- Cambiar el tema.

Solo aparecen las acciones que el rol activo puede usar.

**Roles** (`src/permisos.ts`):

| Rol | Puede |
|---|---|
| Administrador | Todo, incluidos roles y ajustes |
| Gerente | Todo excepto roles y ajustes |
| Vendedor | Ventas y clientes; consulta el catálogo |
| Contador | Gastos y reportes; consulta el resto |

Siempre queda al menos un administrador. En modo local se elige quién eres desde el avatar («Actuar como»), para probar cada rol.

**Registro de cambios.** Cada creación, edición o borrado guarda quién lo hizo, cuándo, la descripción y los valores antes y después. El panel filtra por módulo y por persona.

## Estructura

```
src/
  main.tsx                Arranque
  App.tsx                 Barras, pestañas visibles según el rol y cambio de vista animado
  config.ts               Nombre, moneda e impuesto iniciales, etiquetas visibles
  permisos.ts             Permisos por rol
  tipos/negocio.ts        Modelo de datos
  datos/
    fuente.ts             Contrato común de las fuentes de datos
    local/                Fuente en localStorage (validada al leer)
    supabase/             Fuente en Supabase
  estado/
    Negocio.tsx           Datos, acciones, permisos y registro de cambios
    Paneles.tsx           Qué panel deslizante está abierto
    Avisos.tsx            Mensajes breves tras cada acción
  componentes/            Barras, PanelDeslizante, Tabla, TarjetaKpi, Avisos, Arranque, Acceso…
    paneles/              Un panel por acción (venta, artículo, cliente, gasto, buscar, roles, registro, ajustes)
  vistas/                 Las 6 pestañas y registro.ts
  hooks/                  Tema, formateador de moneda y acciones con aviso
  utilidades/             Formatos, cálculos, consultas de negocio y control de animaciones
public/404.html           Página de error
supabase/esquema.sql      Tablas, funciones, triggers y políticas de seguridad
```

## Cómo funciona

**Datos.** Todo pasa por `src/estado/Negocio.tsx`. Cada acción hace lo mismo:
1. Comprueba el permiso del rol activo.
2. Guarda el cambio en la fuente de datos.
3. Actualiza el estado.
4. Añade la entrada al registro de cambios.

Las vistas y los paneles nunca leen la fuente directamente.

- **Reglas de las ventas:** están en `src/estado/reglasVentas.ts`. Las cantidades son enteras y mayores que 0, se comprueba el stock agrupando las líneas por artículo, y el número de venta usa un contador que nunca se reutiliza.
- **Validación al leer:** todo lo que llega de la fuente se valida en `src/datos/validar.ts`. Los registros dañados se descartan.
- **Errores:** el usuario solo ve los mensajes pensados para él (`ErrorNegocio`: permisos, stock, último administrador). El resto aparece como «No se pudo completar la acción.» y el detalle va a la consola.

**Modo local.** Si `.env` no tiene claves, los datos se guardan en el navegador y no hay pantalla de acceso. Al primer uso se crea un administrador. Cualquiera con acceso al navegador puede «actuar como» otro miembro, así que este modo sirve para probar, no para datos reales compartidos.

**Modo Supabase.**
1. Ejecuta `supabase/esquema.sql` en el editor SQL del proyecto. Se puede volver a ejecutar sin romper nada.
2. Activa la confirmación de correo en Supabase: las invitaciones confían en el correo verificado.
3. Copia `.env.example` como `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

Al abrir el panel aparece la pantalla de acceso con correo y contraseña.
- **Primer acceso:** si el correo tiene una invitación (un miembro agregado en «Roles y equipo» con ese correo), entra a ese negocio con su rol; si no, se crea un negocio propio con ese usuario como administrador.
- **Seguridad en el servidor** (`supabase/esquema.sql`):
  - Las políticas por filas repiten los permisos de cada rol.
  - Las ventas se registran y se borran solo con funciones del servidor, que calculan precios, totales, número y stock.
  - El registro de cambios lo escriben triggers del servidor.
  - Siempre debe quedar un administrador.
  - Las funciones solo las pueden usar usuarios con sesión.
- **Publicar:** el hosting debe enviar `Content-Security-Policy` (con el dominio de Supabase y Google Fonts en las fuentes permitidas) y `frame-ancestors 'none'`.
- El modo Supabase todavía no está probado contra un proyecto real.

**Paneles deslizantes.** `PanelDeslizante` es un `<dialog>` modal que entra desde la izquierda con desplazamiento y anclaje (`scroll-snap`): se puede arrastrar para cerrarlo, y también se cierra con Esc, con un clic fuera o con la X. `GestorPaneles` lo mantiene montado mientras termina la animación de cierre.

**Animaciones** (con GSAP; se desactivan con `prefers-reduced-motion`):
- La píldora de pestañas se estira al cambiar de pestaña.
- Las vistas entran escalonadas.
- Los indicadores cuentan desde 0 hasta su valor.
- Las filas de las tablas entran escalonadas al filtrar.
- Las barras de los reportes crecen desde 0.
- Los esqueletos de carga tienen un brillo animado.

**Agregar una vista.**
1. Añade su id a `IdVista` (`src/tipos/negocio.ts`).
2. Define sus permisos en `src/permisos.ts`.
3. Crea su carpeta en `src/vistas/`.
4. Regístrala en `src/vistas/registro.ts`.
