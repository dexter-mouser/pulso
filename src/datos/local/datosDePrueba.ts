import type {
  Articulo, CategoriaGasto, Cliente, DatosNegocio, Gasto, LineaVenta, MetodoPago, Miembro, Venta,
} from '../../tipos/negocio';
import { calcularTotales } from '../../utilidades/calculos';

// Datos de ejemplo para probar el panel. Se cargan solo la primera vez, con el navegador vacío.

const DIA_MS = 86400000;
const DIAS_DE_HISTORIA = 60;
const VENTAS_POR_DIA_MAXIMAS = 2;
const PROBABILIDAD_PENDIENTE = 0.12;
const PROBABILIDAD_SIN_CLIENTE = 0.3;
const IMPUESTO = 10;
const SEMILLA = 20261123;

// Aleatorio con semilla: los mismos datos en cada carga
function crearAleatorio(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function elegir<T>(lista: T[], aleatorio: () => number): T {
  return lista[Math.floor(aleatorio() * lista.length)];
}

function fechaHace(ahora: Date, dias: number, hora: number): string {
  const fecha = new Date(ahora.getTime() - dias * DIA_MS);
  fecha.setHours(hora, Math.floor((hora * 7) % 60), 0, 0);
  return fecha.toISOString();
}

function id(prefijo: string, numero: number): string {
  return `${prefijo}-${String(numero).padStart(4, '0')}-prueba`;
}

const MIEMBROS: Omit<Miembro, 'creadoEn'>[] = [
  { id: id('miembro', 1), nombre: 'Ana Torres', correo: 'ana@ejemplo.com', rol: 'administrador' },
  { id: id('miembro', 2), nombre: 'Carlos Ruiz', correo: 'carlos@ejemplo.com', rol: 'gerente' },
  { id: id('miembro', 3), nombre: 'Luis Gómez', correo: 'luis@ejemplo.com', rol: 'vendedor' },
  { id: id('miembro', 4), nombre: 'Marta Díaz', correo: 'marta@ejemplo.com', rol: 'contador' },
];

const ARTICULOS: Omit<Articulo, 'id' | 'creadoEn'>[] = [
  { tipo: 'producto', nombre: 'Café en grano 500 g', precio: 12.5, costo: 7, stock: 24, stockMinimo: 8 },
  { tipo: 'producto', nombre: 'Té verde 100 g', precio: 6, costo: 2.5, stock: 3, stockMinimo: 5 },
  { tipo: 'producto', nombre: 'Taza de cerámica', precio: 9, costo: 4, stock: 15, stockMinimo: 5 },
  { tipo: 'producto', nombre: 'Galletas artesanales', precio: 4.5, costo: 1.8, stock: 2, stockMinimo: 6 },
  { tipo: 'producto', nombre: 'Libreta de notas', precio: 7, costo: 3, stock: 30, stockMinimo: 10 },
  { tipo: 'servicio', nombre: 'Taller de barismo', precio: 45, costo: 15, stock: 0, stockMinimo: 0 },
  { tipo: 'servicio', nombre: 'Mantenimiento de cafetera', precio: 30, costo: 8, stock: 0, stockMinimo: 0 },
  { tipo: 'servicio', nombre: 'Envío a domicilio', precio: 5, costo: 2, stock: 0, stockMinimo: 0 },
];

const CLIENTES: Omit<Cliente, 'id' | 'creadoEn'>[] = [
  { nombre: 'Laura Méndez', correo: 'laura.mendez@ejemplo.com', telefono: '555 0101', notas: 'Prefiere café molido fino.' },
  { nombre: 'Jorge Herrera', correo: 'jorge.herrera@ejemplo.com', telefono: '555 0102', notas: '' },
  { nombre: 'Sofía Castro', correo: 'sofia.castro@ejemplo.com', telefono: '555 0103', notas: 'Cliente frecuente de talleres.' },
  { nombre: 'Diego Romero', correo: '', telefono: '555 0104', notas: '' },
  { nombre: 'Valentina Ríos', correo: 'valentina.rios@ejemplo.com', telefono: '', notas: 'Pide factura.' },
  { nombre: 'Andrés Navarro', correo: 'andres.navarro@ejemplo.com', telefono: '555 0106', notas: '' },
  { nombre: 'Camila Ortiz', correo: 'camila.ortiz@ejemplo.com', telefono: '555 0107', notas: '' },
  { nombre: 'Restaurante El Puerto', correo: 'compras@elpuerto.ejemplo.com', telefono: '555 0108', notas: 'Compra al por mayor cada mes.' },
];

const GASTOS_FIJOS: { concepto: string; categoria: CategoriaGasto; monto: number; dia: number }[] = [
  { concepto: 'Alquiler del local', categoria: 'alquiler', monto: 650, dia: 1 },
  { concepto: 'Nómina', categoria: 'nomina', monto: 1200, dia: 28 },
  { concepto: 'Luz e internet', categoria: 'servicios', monto: 95.4, dia: 10 },
];

const GASTOS_VARIABLES: { concepto: string; categoria: CategoriaGasto; monto: number }[] = [
  { concepto: 'Compra de café a proveedor', categoria: 'insumos', monto: 210 },
  { concepto: 'Empaques y bolsas', categoria: 'insumos', monto: 48.9 },
  { concepto: 'Publicidad en redes', categoria: 'marketing', monto: 60 },
  { concepto: 'Reparación de molino', categoria: 'otros', monto: 85 },
];

const METODOS: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia'];

function crearArticulos(creadoEn: string): Articulo[] {
  return ARTICULOS.map((articulo, indice) => ({ ...articulo, id: id('articulo', indice + 1), creadoEn }));
}

function crearClientes(ahora: Date): Cliente[] {
  return CLIENTES.map((cliente, indice) => ({
    ...cliente,
    id: id('cliente', indice + 1),
    creadoEn: fechaHace(ahora, DIAS_DE_HISTORIA - indice * 7, 10),
  }));
}

function crearLineas(articulos: Articulo[], aleatorio: () => number): LineaVenta[] {
  const cantidadLineas = 1 + Math.floor(aleatorio() * 3);
  const lineas = new Map<string, LineaVenta>();
  for (let i = 0; i < cantidadLineas; i++) {
    const articulo = elegir(articulos, aleatorio);
    const previa = lineas.get(articulo.id);
    const cantidad = articulo.tipo === 'servicio' ? 1 : 1 + Math.floor(aleatorio() * 3);
    lineas.set(articulo.id, {
      articuloId: articulo.id,
      nombre: articulo.nombre,
      tipo: articulo.tipo,
      cantidad: (previa?.cantidad ?? 0) + cantidad,
      precio: articulo.precio,
    });
  }
  return [...lineas.values()];
}

function crearVentas(ahora: Date, articulos: Articulo[], clientes: Cliente[], aleatorio: () => number): Venta[] {
  const ventas: Venta[] = [];
  for (let dias = DIAS_DE_HISTORIA; dias >= 0; dias--) {
    const cantidad = Math.floor(aleatorio() * (VENTAS_POR_DIA_MAXIMAS + 1));
    for (let i = 0; i < cantidad; i++) {
      const lineas = crearLineas(articulos, aleatorio);
      const numero = ventas.length + 1;
      ventas.push({
        id: id('venta', numero),
        numero,
        clienteId: aleatorio() < PROBABILIDAD_SIN_CLIENTE ? null : elegir(clientes, aleatorio).id,
        lineas,
        impuestoPorcentaje: IMPUESTO,
        ...calcularTotales(lineas, IMPUESTO),
        estado: aleatorio() < PROBABILIDAD_PENDIENTE ? 'pendiente' : 'pagada',
        metodoPago: elegir(METODOS, aleatorio),
        notas: '',
        fecha: fechaHace(ahora, dias, 9 + Math.floor(aleatorio() * 10)),
        vendedorId: elegir(MIEMBROS.slice(0, 3), aleatorio).id,
      });
    }
  }
  return ventas;
}

function crearGastos(ahora: Date, aleatorio: () => number): Gasto[] {
  const gastos: Gasto[] = [];
  const agregar = (concepto: string, categoria: CategoriaGasto, monto: number, fecha: string) => {
    gastos.push({
      id: id('gasto', gastos.length + 1),
      concepto,
      categoria,
      monto,
      fecha,
      metodoPago: 'transferencia',
      notas: '',
      creadoEn: fecha,
    });
  };

  // Gastos fijos de este mes y del anterior (solo los días ya pasados)
  for (const desplazamiento of [1, 0]) {
    const mes = new Date(ahora.getFullYear(), ahora.getMonth() - desplazamiento, 1);
    for (const fijo of GASTOS_FIJOS) {
      const fecha = new Date(mes.getFullYear(), mes.getMonth(), fijo.dia, 12);
      if (fecha <= ahora) agregar(fijo.concepto, fijo.categoria, fijo.monto, fecha.toISOString());
    }
  }

  for (const variable of GASTOS_VARIABLES) {
    agregar(variable.concepto, variable.categoria, variable.monto, fechaHace(ahora, Math.floor(aleatorio() * DIAS_DE_HISTORIA), 12));
  }
  return gastos;
}

export function crearDatosDePrueba(ahora = new Date()): DatosNegocio {
  const aleatorio = crearAleatorio(SEMILLA);
  const inicio = fechaHace(ahora, DIAS_DE_HISTORIA, 8);
  const articulos = crearArticulos(inicio);
  const clientes = crearClientes(ahora);

  return {
    ajustes: { nombre: 'Café Aurora (ejemplo)', moneda: 'USD', impuesto: IMPUESTO },
    miembros: MIEMBROS.map((miembro) => ({ ...miembro, creadoEn: inicio })),
    articulos,
    clientes,
    ventas: crearVentas(ahora, articulos, clientes, aleatorio),
    gastos: crearGastos(ahora, aleatorio),
    cambios: [],
  };
}
