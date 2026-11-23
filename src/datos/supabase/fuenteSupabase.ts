import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { AJUSTES_INICIALES } from '../../config';
import type { Colecciones, DatosNegocio, NombreColeccion, Venta } from '../../tipos/negocio';
import type { FuenteDatos } from '../fuente';
import { validarAjustes, validarLista, validarVenta } from '../validar';

// Tablas de supabase/esquema.sql
const TABLAS: Record<NombreColeccion, string> = {
  articulos: 'articulos',
  clientes: 'clientes',
  ventas: 'ventas',
  gastos: 'gastos',
  miembros: 'miembros',
  cambios: 'cambios',
};

const LARGO_MAXIMO_NOMBRE_NEGOCIO = 60;

let cliente: SupabaseClient | null = null;

export function obtenerCliente(): SupabaseClient {
  cliente ??= createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  return cliente;
}

// camelCase en la app, snake_case en la base de datos
function aSnake(texto: string): string {
  return texto.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}

function aCamel(texto: string): string {
  return texto.replace(/_([a-z])/g, (_, letra: string) => letra.toUpperCase());
}

function convertirClaves(objeto: Record<string, unknown>, convertir: (clave: string) => string) {
  return Object.fromEntries(Object.entries(objeto).map(([clave, valor]) => [convertir(clave), valor]));
}

// El detalle del error va a la consola; el usuario solo recibe un error genérico
function verificar(error: { message: string } | null): void {
  if (!error) return;
  console.error('Error de Supabase', error);
  throw new Error('Error del servidor.');
}

function primeraFila<T>(datos: T | T[] | null): T | null {
  return (Array.isArray(datos) ? datos[0] : datos) ?? null;
}

interface FilaNegocio {
  negocio_id: string;
  miembro_id: string;
}

// Une al usuario a su negocio: invitación pendiente primero y, si no hay, crea uno propio
export async function prepararNegocio(usuario: User): Promise<{ negocioId: string; miembroId: string }> {
  const supabase = obtenerCliente();
  const { data: unido, error: errorUnirse } = await supabase.rpc('unirse_por_invitacion');
  verificar(errorUnirse);
  const existente = primeraFila<FilaNegocio>(unido);
  if (existente) return { negocioId: existente.negocio_id, miembroId: existente.miembro_id };

  const { data: creado, error: errorCrear } = await supabase.rpc('crear_negocio', {
    nombre_negocio: AJUSTES_INICIALES.nombre.slice(0, LARGO_MAXIMO_NOMBRE_NEGOCIO),
    nombre_miembro: usuario.email ?? 'Administrador',
  });
  verificar(errorCrear);
  const fila = primeraFila<FilaNegocio>(creado);
  if (!fila) throw new Error('Respuesta vacía de crear_negocio');
  return { negocioId: fila.negocio_id, miembroId: fila.miembro_id };
}

type Fila = Record<string, unknown>;

// En el registro de cambios las claves de antes y después también vienen en snake_case
function convertirCambio(fila: Fila): Fila {
  const convertido = convertirClaves(fila, aCamel);
  for (const campo of ['antes', 'despues']) {
    const valor = convertido[campo];
    if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
      convertido[campo] = convertirClaves(valor as Fila, aCamel);
    }
  }
  return convertido;
}

export function crearFuenteSupabase(negocioId: string): FuenteDatos {
  const supabase = obtenerCliente();

  async function leer<C extends NombreColeccion>(coleccion: C): Promise<Colecciones[C][]> {
    const { data, error } = await supabase.from(TABLAS[coleccion]).select('*').eq('negocio_id', negocioId);
    verificar(error);
    const filas = ((data ?? []) as Fila[]).map((fila) => {
      const { negocio_id: _negocio, user_id: _usuario, ...resto } = fila;
      return coleccion === 'cambios' ? convertirCambio(resto) : convertirClaves(resto, aCamel);
    });
    return validarLista(coleccion, filas);
  }

  // Las ventas ya creadas solo cambian estas columnas (el resto lo fija el servidor)
  async function actualizarVenta(venta: Venta): Promise<void> {
    const { data, error } = await supabase
      .from('ventas')
      .update({ estado: venta.estado, metodo_pago: venta.metodoPago, notas: venta.notas, cliente_id: venta.clienteId })
      .eq('id', venta.id)
      .eq('negocio_id', negocioId)
      .select('id');
    verificar(error);
    if (!data?.length) throw new Error('La venta no existe o no se puede editar.');
  }

  // Miembros: el cliente nunca escribe user_id (lo asigna el servidor al unirse)
  async function guardarMiembro(miembro: Colecciones['miembros']): Promise<void> {
    const { data, error } = await supabase
      .from('miembros')
      .update({ nombre: miembro.nombre, correo: miembro.correo, rol: miembro.rol })
      .eq('id', miembro.id)
      .eq('negocio_id', negocioId)
      .select('id');
    verificar(error);
    if (data?.length) return;
    const { error: errorCrear } = await supabase.from('miembros').insert({
      id: miembro.id,
      negocio_id: negocioId,
      nombre: miembro.nombre,
      correo: miembro.correo,
      rol: miembro.rol,
      creado_en: miembro.creadoEn,
    });
    verificar(errorCrear);
  }

  return {
    modo: 'supabase',
    registraCambiosEnServidor: true,

    async cargar(): Promise<DatosNegocio> {
      const { data: negocio, error } = await supabase.from('negocios').select('nombre, moneda, impuesto').eq('id', negocioId).single();
      verificar(error);
      const [articulos, clientes, ventas, gastos, miembros, cambios] = await Promise.all([
        leer('articulos'), leer('clientes'), leer('ventas'), leer('gastos'), leer('miembros'), leer('cambios'),
      ]);
      return { ajustes: validarAjustes(negocio), articulos, clientes, ventas, gastos, miembros, cambios };
    },

    async guardar(coleccion, registro) {
      if (coleccion === 'cambios') throw new Error('El servidor registra los cambios por su cuenta.');
      if (coleccion === 'ventas') return actualizarVenta(registro as Venta);
      if (coleccion === 'miembros') return guardarMiembro(registro as Colecciones['miembros']);
      const fila = { ...convertirClaves(registro as unknown as Fila, aSnake), negocio_id: negocioId };
      const { error } = await supabase.from(TABLAS[coleccion]).upsert(fila);
      verificar(error);
    },

    async borrar(coleccion, id) {
      if (coleccion === 'ventas' || coleccion === 'cambios') throw new Error('Esta colección no se borra directamente.');
      const { error } = await supabase.from(TABLAS[coleccion]).delete().eq('id', id).eq('negocio_id', negocioId);
      verificar(error);
    },

    async guardarAjustes(ajustes) {
      const { nombre, moneda, impuesto } = ajustes;
      const { error } = await supabase.from('negocios').update({ nombre, moneda, impuesto }).eq('id', negocioId);
      verificar(error);
    },

    // El servidor toma precios, calcula importes, numera y descuenta stock en una transacción
    async registrarVenta(venta) {
      const { data, error } = await supabase.rpc('registrar_venta', {
        p_negocio: negocioId,
        p_id: venta.id,
        p_cliente: venta.clienteId,
        p_lineas: venta.lineas.map(({ articuloId, cantidad }) => ({ articuloId, cantidad })),
        p_estado: venta.estado,
        p_metodo: venta.metodoPago,
        p_notas: venta.notas,
      });
      verificar(error);
      const fila = primeraFila<Fila>(data);
      const creada = fila ? validarVenta(convertirClaves(fila, aCamel)) : null;
      if (!creada) throw new Error('Respuesta inválida de registrar_venta');
      return creada;
    },

    async borrarVenta(venta) {
      const { error } = await supabase.rpc('borrar_venta', { p_id: venta.id });
      verificar(error);
    },
  };
}
