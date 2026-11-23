import { PREFIJO_ALMACEN } from '../../config';
import type { Colecciones, DatosNegocio, NombreColeccion, Venta } from '../../tipos/negocio';
import { crearAdministradorInicial, type FuenteDatos } from '../fuente';
import { validarAjustes, validarLista } from '../validar';
import { crearDatosDePrueba } from './datosDePrueba';

const CLAVE_AJUSTES = `${PREFIJO_ALMACEN}ajustes`;
const CLAVE_CONTADOR_VENTAS = `${PREFIJO_ALMACEN}contador-ventas`;

function claveDe(coleccion: NombreColeccion): string {
  return `${PREFIJO_ALMACEN}${coleccion}`;
}

function leerJson(clave: string, porDefecto: unknown): unknown {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? JSON.stringify(porDefecto));
  } catch (error) {
    console.error(`Datos locales inválidos en ${clave}`, error);
    return porDefecto;
  }
}

// Lectura validada: los registros inválidos se descartan
function leerLista<C extends NombreColeccion>(coleccion: C): Colecciones[C][] {
  return validarLista(coleccion, leerJson(claveDe(coleccion), []));
}

function escribirLista<C extends NombreColeccion>(coleccion: C, lista: Colecciones[C][]): void {
  localStorage.setItem(claveDe(coleccion), JSON.stringify(lista));
}

// Contador de ventas: nunca baja, aunque se borren ventas
function leerContadorVentas(): number {
  const valor = leerJson(CLAVE_CONTADOR_VENTAS, 0);
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 ? valor : 0;
}

function numeroMayor(ventas: Venta[]): number {
  return ventas.reduce((mayor, venta) => Math.max(mayor, venta.numero), 0);
}

// Escribe varias claves a la vez; si una falla, restaura las anteriores
function escribirTodo(cambios: Record<string, string>): void {
  const previos = Object.fromEntries(Object.keys(cambios).map((clave) => [clave, localStorage.getItem(clave)]));
  try {
    for (const [clave, valor] of Object.entries(cambios)) localStorage.setItem(clave, valor);
  } catch (error) {
    for (const [clave, valor] of Object.entries(previos)) {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    }
    throw error;
  }
}

// Suma (o resta, con signo negativo) las cantidades de los productos de las líneas
function moverStock(lista: Colecciones['articulos'][], lineas: Venta['lineas'], signo: 1 | -1): void {
  for (const linea of lineas) {
    const articulo = lista.find((item) => item.id === linea.articuloId);
    if (!articulo || articulo.tipo !== 'producto') continue;
    const nuevoStock = articulo.stock + signo * linea.cantidad;
    if (signo === -1 && nuevoStock < 0) throw new Error(`Stock insuficiente de ${articulo.nombre}`);
    articulo.stock = nuevoStock;
  }
}

// Primera visita (sin ajustes ni equipo guardados): se cargan los datos de prueba
function sembrarSiEstaVacio(): void {
  if (localStorage.getItem(CLAVE_AJUSTES) !== null || localStorage.getItem(claveDe('miembros')) !== null) return;
  const datos = crearDatosDePrueba();
  const cambios: Record<string, string> = {
    [CLAVE_AJUSTES]: JSON.stringify(datos.ajustes),
    [CLAVE_CONTADOR_VENTAS]: JSON.stringify(numeroMayor(datos.ventas)),
  };
  const colecciones: NombreColeccion[] = ['articulos', 'clientes', 'ventas', 'gastos', 'miembros', 'cambios'];
  for (const coleccion of colecciones) cambios[claveDe(coleccion)] = JSON.stringify(datos[coleccion]);
  escribirTodo(cambios);
}

// Datos guardados en el navegador (modo sin Supabase)
export function crearFuenteLocal(): FuenteDatos {
  return {
    modo: 'local',
    registraCambiosEnServidor: false,

    async cargar(): Promise<DatosNegocio> {
      sembrarSiEstaVacio();
      let miembros = leerLista('miembros');
      // El equipo empieza con un administrador
      if (miembros.length === 0) {
        miembros = [crearAdministradorInicial()];
        escribirLista('miembros', miembros);
      }
      return {
        ajustes: validarAjustes(leerJson(CLAVE_AJUSTES, null)),
        articulos: leerLista('articulos'),
        clientes: leerLista('clientes'),
        ventas: leerLista('ventas'),
        gastos: leerLista('gastos'),
        miembros,
        cambios: leerLista('cambios'),
      };
    },

    async guardar(coleccion, registro) {
      const lista = leerLista(coleccion);
      const indice = lista.findIndex((item) => item.id === registro.id);
      if (indice === -1) lista.push(registro);
      else lista[indice] = registro;
      escribirLista(coleccion, lista);
    },

    async borrar(coleccion, id) {
      escribirLista(coleccion, leerLista(coleccion).filter((item) => item.id !== id));
    },

    async guardarAjustes(ajustes) {
      localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes));
    },

    async registrarVenta(nueva) {
      const ventas = leerLista('ventas');
      const articulos = leerLista('articulos');
      const numero = Math.max(leerContadorVentas(), numeroMayor(ventas)) + 1;
      const venta: Venta = { ...nueva, numero };
      moverStock(articulos, venta.lineas, -1);
      escribirTodo({
        [CLAVE_CONTADOR_VENTAS]: JSON.stringify(numero),
        [claveDe('ventas')]: JSON.stringify([...ventas, venta]),
        [claveDe('articulos')]: JSON.stringify(articulos),
      });
      return venta;
    },

    async borrarVenta(venta) {
      const ventas = leerLista('ventas');
      if (!ventas.some((item) => item.id === venta.id)) return;
      const articulos = leerLista('articulos');
      const guardada = ventas.find((item) => item.id === venta.id) ?? venta;
      moverStock(articulos, guardada.lineas, 1);
      escribirTodo({
        [claveDe('ventas')]: JSON.stringify(ventas.filter((item) => item.id !== venta.id)),
        [claveDe('articulos')]: JSON.stringify(articulos),
      });
    },
  };
}
