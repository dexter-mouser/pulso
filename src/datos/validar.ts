import { AJUSTES_INICIALES, ETIQUETAS_CATEGORIA, ETIQUETAS_METODO, ETIQUETAS_ROL, ETIQUETAS_TIPO } from '../config';
import type {
  AccionCambio, Ajustes, Articulo, Cambio, CategoriaGasto, Cliente, Colecciones, EstadoVenta, Gasto, LineaVenta,
  MetodoPago, Miembro, Modulo, NombreColeccion, Rol, TipoArticulo, Venta,
} from '../tipos/negocio';

// Valores permitidos
const ROLES = Object.keys(ETIQUETAS_ROL) as Rol[];
const TIPOS = Object.keys(ETIQUETAS_TIPO) as TipoArticulo[];
const METODOS = Object.keys(ETIQUETAS_METODO) as MetodoPago[];
const CATEGORIAS = Object.keys(ETIQUETAS_CATEGORIA) as CategoriaGasto[];
const ESTADOS: EstadoVenta[] = ['pagada', 'pendiente'];
const ACCIONES: AccionCambio[] = ['crear', 'editar', 'borrar'];
const MODULOS: Modulo[] = ['resumen', 'ventas', 'productos', 'clientes', 'gastos', 'reportes', 'roles', 'registro', 'ajustes'];

type Registro = Record<string, unknown>;
type Validador<T> = (valor: unknown) => T | null;

// Comprobaciones básicas
function esObjeto(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string';
}

function esId(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function esFechaIso(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length >= 10 && !Number.isNaN(Date.parse(valor));
}

function enLista<T extends string>(lista: readonly T[], valor: unknown): valor is T {
  return typeof valor === 'string' && (lista as readonly string[]).includes(valor);
}

function validarLinea(valor: unknown): LineaVenta | null {
  if (!esObjeto(valor)) return null;
  const { articuloId, nombre, tipo, cantidad, precio } = valor;
  if (!esId(articuloId) || !esTexto(nombre) || !enLista(TIPOS, tipo) || !esNumero(cantidad) || !esNumero(precio)) return null;
  return { articuloId, nombre, tipo, cantidad, precio };
}

// Un validador por colección: devuelve el registro limpio o null
export function validarArticulo(valor: unknown): Articulo | null {
  if (!esObjeto(valor)) return null;
  const { id, tipo, nombre, precio, costo, stock, stockMinimo, creadoEn } = valor;
  if (!esId(id) || !enLista(TIPOS, tipo) || !esTexto(nombre) || !esNumero(precio) || !esNumero(costo)) return null;
  if (!esNumero(stock) || !esNumero(stockMinimo) || !esFechaIso(creadoEn)) return null;
  return { id, tipo, nombre, precio, costo, stock, stockMinimo, creadoEn };
}

export function validarCliente(valor: unknown): Cliente | null {
  if (!esObjeto(valor)) return null;
  const { id, nombre, correo, telefono, notas, creadoEn } = valor;
  if (!esId(id) || !esTexto(nombre) || !esTexto(correo) || !esTexto(telefono) || !esTexto(notas) || !esFechaIso(creadoEn)) return null;
  return { id, nombre, correo, telefono, notas, creadoEn };
}

export function validarVenta(valor: unknown): Venta | null {
  if (!esObjeto(valor)) return null;
  const { id, numero, clienteId, lineas, impuestoPorcentaje, subtotal, impuesto, total, estado, metodoPago, notas, fecha, vendedorId } = valor;
  if (!esId(id) || !esNumero(numero) || !Number.isInteger(numero) || !Array.isArray(lineas)) return null;
  if (!esNumero(impuestoPorcentaje) || !esNumero(subtotal) || !esNumero(impuesto) || !esNumero(total)) return null;
  if (!enLista(ESTADOS, estado) || !enLista(METODOS, metodoPago) || !esTexto(notas) || !esFechaIso(fecha)) return null;
  if (clienteId !== null && !esId(clienteId)) return null;
  if (vendedorId !== null && !esTexto(vendedorId)) return null;
  const lineasValidas = lineas.map(validarLinea);
  if (lineasValidas.some((linea) => linea === null)) return null;
  return {
    id, numero, clienteId, lineas: lineasValidas as LineaVenta[], impuestoPorcentaje, subtotal, impuesto, total,
    estado, metodoPago, notas, fecha, vendedorId: vendedorId ?? '',
  };
}

export function validarGasto(valor: unknown): Gasto | null {
  if (!esObjeto(valor)) return null;
  const { id, concepto, categoria, monto, fecha, metodoPago, notas, creadoEn } = valor;
  if (!esId(id) || !esTexto(concepto) || !enLista(CATEGORIAS, categoria) || !esNumero(monto)) return null;
  if (!esFechaIso(fecha) || !enLista(METODOS, metodoPago) || !esTexto(notas) || !esFechaIso(creadoEn)) return null;
  return { id, concepto, categoria, monto, fecha, metodoPago, notas, creadoEn };
}

export function validarMiembro(valor: unknown): Miembro | null {
  if (!esObjeto(valor)) return null;
  const { id, nombre, correo, rol, creadoEn } = valor;
  if (!esId(id) || !esTexto(nombre) || !esTexto(correo) || !enLista(ROLES, rol) || !esFechaIso(creadoEn)) return null;
  return { id, nombre, correo, rol, creadoEn };
}

export function validarCambio(valor: unknown): Cambio | null {
  if (!esObjeto(valor)) return null;
  const { id, fecha, miembroId, miembroNombre, modulo, accion, entidadId, descripcion, antes, despues } = valor;
  if (!esId(id) || !esFechaIso(fecha) || !esTexto(miembroId) || !esTexto(miembroNombre)) return null;
  if (!enLista(MODULOS, modulo) || !enLista(ACCIONES, accion) || !esTexto(entidadId) || !esTexto(descripcion)) return null;
  if ((antes !== null && !esObjeto(antes)) || (despues !== null && !esObjeto(despues))) return null;
  return { id, fecha, miembroId, miembroNombre, modulo, accion, entidadId, descripcion, antes, despues };
}

// Ajustes inválidos: se usan los iniciales
export function validarAjustes(valor: unknown): Ajustes {
  if (!esObjeto(valor)) return { ...AJUSTES_INICIALES };
  const { nombre, moneda, impuesto } = valor;
  if (!esTexto(nombre) || !nombre.trim() || !esTexto(moneda) || !esNumero(impuesto) || impuesto < 0 || impuesto > 100) {
    console.error('Ajustes inválidos, se usan los iniciales');
    return { ...AJUSTES_INICIALES };
  }
  return { nombre, moneda, impuesto };
}

const VALIDADORES: { [C in NombreColeccion]: Validador<Colecciones[C]> } = {
  articulos: validarArticulo,
  clientes: validarCliente,
  ventas: validarVenta,
  gastos: validarGasto,
  miembros: validarMiembro,
  cambios: validarCambio,
};

// Valida una lista completa y descarta los registros inválidos
export function validarLista<C extends NombreColeccion>(coleccion: C, valor: unknown): Colecciones[C][] {
  if (!Array.isArray(valor)) {
    console.error(`Se esperaba una lista en ${coleccion}`);
    return [];
  }
  const validar = VALIDADORES[coleccion] as Validador<Colecciones[C]>;
  const validos: Colecciones[C][] = [];
  for (const item of valor) {
    const registro = validar(item);
    if (registro) validos.push(registro);
    else console.error(`Registro inválido descartado en ${coleccion}`, item);
  }
  return validos;
}
