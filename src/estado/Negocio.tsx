import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { PREFIJO_ALMACEN } from '../config';
import { crearAdministradorInicial, crearId, type FuenteDatos } from '../datos/fuente';
import { puedeEditar, puedeVer } from '../permisos';
import type {
  AccionCambio, Ajustes, Articulo, Cambio, Cliente, Colecciones, DatosNegocio, Gasto, Miembro, Modulo,
  NombreColeccion, Venta,
} from '../tipos/negocio';
import { ErrorNegocio } from './Avisos';
import { buscarErrorEnLineas, moverStock, prepararVenta, type NuevaVenta } from './reglasVentas';

const CLAVE_MIEMBRO_ACTIVO = `${PREFIJO_ALMACEN}miembro-activo`;
const ADMINISTRADOR_RESPALDO = crearAdministradorInicial();

export type { NuevaVenta };

export interface ValorNegocio {
  datos: DatosNegocio;
  modo: FuenteDatos['modo'];
  miembroActivo: Miembro;
  cambiarMiembroActivo: (id: string) => void;
  puedeVer: (modulo: Modulo) => boolean;
  puedeEditar: (modulo: Modulo) => boolean;
  guardarArticulo: (articulo: Articulo) => Promise<void>;
  borrarArticulo: (id: string) => Promise<void>;
  guardarCliente: (cliente: Cliente) => Promise<void>;
  borrarCliente: (id: string) => Promise<void>;
  registrarVenta: (venta: NuevaVenta) => Promise<Venta>;
  actualizarVenta: (venta: Venta) => Promise<void>;
  borrarVenta: (id: string) => Promise<void>;
  guardarGasto: (gasto: Gasto) => Promise<void>;
  borrarGasto: (id: string) => Promise<void>;
  guardarMiembro: (miembro: Miembro) => Promise<void>;
  borrarMiembro: (id: string) => Promise<void>;
  guardarAjustes: (ajustes: Ajustes) => Promise<void>;
}

const ContextoNegocio = createContext<ValorNegocio | null>(null);

// Listas inmutables
function reemplazar<T extends { id: string }>(lista: T[], registro: T): T[] {
  const existe = lista.some((item) => item.id === registro.id);
  return existe ? lista.map((item) => (item.id === registro.id ? registro : item)) : [...lista, registro];
}

function quitar<T extends { id: string }>(lista: T[], id: string): T[] {
  return lista.filter((item) => item.id !== id);
}

function comoRegistro(valor: unknown): Record<string, unknown> | null {
  return valor ? { ...(valor as Record<string, unknown>) } : null;
}

function leerMiembroGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_MIEMBRO_ACTIVO);
  } catch {
    return null;
  }
}

interface PropiedadesProveedor {
  fuente: FuenteDatos;
  datosIniciales: DatosNegocio;
  miembroInicialId?: string;
  children: ReactNode;
}

// Estado del negocio, permisos por rol y registro de cambios de cada acción
export function ProveedorNegocio({ fuente, datosIniciales, miembroInicialId, children }: PropiedadesProveedor) {
  const [datos, setDatos] = useState(datosIniciales);
  const [miembroActivoId, setMiembroActivoId] = useState(miembroInicialId ?? leerMiembroGuardado() ?? '');

  const miembroActivo = useMemo<Miembro>(() => {
    const encontrado = datos.miembros.find((miembro) => miembro.id === miembroActivoId);
    return encontrado ?? datos.miembros.find((miembro) => miembro.rol === 'administrador') ?? datos.miembros[0] ?? ADMINISTRADOR_RESPALDO;
  }, [datos.miembros, miembroActivoId]);

  const cambiarMiembroActivo = useCallback((id: string) => {
    setMiembroActivoId(id);
    try {
      localStorage.setItem(CLAVE_MIEMBRO_ACTIVO, id);
    } catch (error) {
      console.error('No se pudo guardar el miembro activo', error);
    }
  }, []);

  const exigir = useCallback(
    (modulo: Modulo) => {
      if (!puedeEditar(miembroActivo.rol, modulo)) throw new ErrorNegocio('Tu rol no permite esta acción.');
    },
    [miembroActivo.rol],
  );

  // Anota el cambio (quién, qué, cuándo, antes y después). En Supabase lo guarda el servidor y aquí solo se
  // muestra al instante. Un fallo no deshace la acción: se deja en consola.
  const registrar = useCallback(
    async (modulo: Modulo, accion: AccionCambio, entidadId: string, descripcion: string, antes: unknown, despues: unknown) => {
      const cambio: Cambio = {
        id: crearId(),
        fecha: new Date().toISOString(),
        miembroId: miembroActivo.id,
        miembroNombre: miembroActivo.nombre,
        modulo,
        accion,
        entidadId,
        descripcion,
        antes: comoRegistro(antes),
        despues: comoRegistro(despues),
      };
      try {
        if (!fuente.registraCambiosEnServidor) await fuente.guardar('cambios', cambio);
        setDatos((previos) => ({ ...previos, cambios: [...previos.cambios, cambio] }));
      } catch (error) {
        console.error('No se pudo registrar el cambio', error);
      }
    },
    [fuente, miembroActivo],
  );

  // Crear o editar un registro de cualquier colección
  const guardarEn = useCallback(
    async <C extends NombreColeccion>(coleccion: C, modulo: Modulo, registro: Colecciones[C], nombre: string) => {
      exigir(modulo);
      const anterior = (datos[coleccion] as Colecciones[C][]).find((item) => item.id === registro.id) ?? null;
      await fuente.guardar(coleccion, registro);
      setDatos((previos) => ({ ...previos, [coleccion]: reemplazar(previos[coleccion] as Colecciones[C][], registro) }));
      const accion: AccionCambio = anterior ? 'editar' : 'crear';
      await registrar(modulo, accion, registro.id, `${accion === 'crear' ? 'Creó' : 'Editó'} ${nombre}`, anterior, registro);
    },
    [datos, exigir, fuente, registrar],
  );

  const borrarDe = useCallback(
    async (coleccion: NombreColeccion, modulo: Modulo, id: string, nombre: string) => {
      exigir(modulo);
      const anterior = (datos[coleccion] as { id: string }[]).find((item) => item.id === id) ?? null;
      await fuente.borrar(coleccion, id);
      setDatos((previos) => ({ ...previos, [coleccion]: quitar(previos[coleccion] as { id: string }[], id) }));
      await registrar(modulo, 'borrar', id, `Borró ${nombre}`, anterior, null);
    },
    [datos, exigir, fuente, registrar],
  );

  const registrarVenta = useCallback(
    async (nueva: NuevaVenta): Promise<Venta> => {
      exigir('ventas');
      const motivo = buscarErrorEnLineas(nueva.lineas, datos.articulos);
      if (motivo) throw new ErrorNegocio(motivo);
      // La fuente devuelve la venta definitiva (número, importes y líneas) y el stock se ajusta con ella
      const venta = await fuente.registrarVenta(prepararVenta(nueva, datos.ajustes, miembroActivo.id));
      setDatos((previos) => ({
        ...previos,
        ventas: [...previos.ventas, venta],
        articulos: moverStock(previos.articulos, venta.lineas, -1),
      }));
      await registrar('ventas', 'crear', venta.id, `Registró la venta #${venta.numero}`, null, venta);
      return venta;
    },
    [datos.ajustes, datos.articulos, exigir, fuente, miembroActivo.id, registrar],
  );

  const borrarVenta = useCallback(
    async (id: string) => {
      exigir('ventas');
      const venta = datos.ventas.find((item) => item.id === id);
      if (!venta) return;
      await fuente.borrarVenta(venta);
      setDatos((previos) => ({
        ...previos,
        ventas: quitar(previos.ventas, id),
        articulos: moverStock(previos.articulos, venta.lineas, 1),
      }));
      await registrar('ventas', 'borrar', id, `Borró la venta #${venta.numero}`, venta, null);
    },
    [datos.ventas, exigir, fuente, registrar],
  );

  // Equipo: siempre debe quedar al menos un administrador
  const quedariaSinAdministrador = useCallback(
    (cambiado: Miembro | null, idQuitado?: string) => {
      const equipo = datos.miembros
        .filter((miembro) => miembro.id !== idQuitado)
        .map((miembro) => (cambiado && miembro.id === cambiado.id ? cambiado : miembro));
      return !equipo.some((miembro) => miembro.rol === 'administrador');
    },
    [datos.miembros],
  );

  const guardarMiembro = useCallback(
    async (miembro: Miembro) => {
      if (quedariaSinAdministrador(miembro)) throw new ErrorNegocio('Debe quedar al menos un administrador.');
      await guardarEn('miembros', 'roles', miembro, `a ${miembro.nombre}`);
    },
    [guardarEn, quedariaSinAdministrador],
  );

  const borrarMiembro = useCallback(
    async (id: string) => {
      if (id === miembroActivo.id) throw new ErrorNegocio('No puedes quitarte a ti mismo del equipo.');
      if (quedariaSinAdministrador(null, id)) throw new ErrorNegocio('Debe quedar al menos un administrador.');
      const miembro = datos.miembros.find((item) => item.id === id);
      await borrarDe('miembros', 'roles', id, `a ${miembro?.nombre ?? 'un miembro'}`);
    },
    [borrarDe, datos.miembros, miembroActivo.id, quedariaSinAdministrador],
  );

  const guardarAjustes = useCallback(
    async (ajustes: Ajustes) => {
      exigir('ajustes');
      const anteriores = datos.ajustes;
      await fuente.guardarAjustes(ajustes);
      setDatos((previos) => ({ ...previos, ajustes }));
      await registrar('ajustes', 'editar', 'ajustes', 'Editó los ajustes del negocio', anteriores, ajustes);
    },
    [datos.ajustes, exigir, fuente, registrar],
  );

  const nombreDe = useCallback(
    (coleccion: 'articulos' | 'clientes' | 'gastos', id: string, prefijo: string) => {
      const lista = datos[coleccion] as { id: string; nombre?: string; concepto?: string }[];
      const item = lista.find((registro) => registro.id === id);
      return `${prefijo} «${item?.nombre ?? item?.concepto ?? ''}»`;
    },
    [datos],
  );

  const valor = useMemo<ValorNegocio>(
    () => ({
      datos,
      modo: fuente.modo,
      miembroActivo,
      cambiarMiembroActivo,
      puedeVer: (modulo) => puedeVer(miembroActivo.rol, modulo),
      puedeEditar: (modulo) => puedeEditar(miembroActivo.rol, modulo),
      guardarArticulo: (articulo) => guardarEn('articulos', 'productos', articulo, `el artículo «${articulo.nombre}»`),
      borrarArticulo: (id) => borrarDe('articulos', 'productos', id, nombreDe('articulos', id, 'el artículo')),
      guardarCliente: (cliente) => guardarEn('clientes', 'clientes', cliente, `el cliente «${cliente.nombre}»`),
      borrarCliente: (id) => borrarDe('clientes', 'clientes', id, nombreDe('clientes', id, 'el cliente')),
      registrarVenta,
      actualizarVenta: (venta) => guardarEn('ventas', 'ventas', venta, `la venta #${venta.numero}`),
      borrarVenta,
      guardarGasto: (gasto) => guardarEn('gastos', 'gastos', gasto, `el gasto «${gasto.concepto}»`),
      borrarGasto: (id) => borrarDe('gastos', 'gastos', id, nombreDe('gastos', id, 'el gasto')),
      guardarMiembro,
      borrarMiembro,
      guardarAjustes,
    }),
    [
      datos, fuente.modo, miembroActivo, cambiarMiembroActivo, guardarEn, borrarDe, nombreDe,
      registrarVenta, borrarVenta, guardarMiembro, borrarMiembro, guardarAjustes,
    ],
  );

  return <ContextoNegocio.Provider value={valor}>{children}</ContextoNegocio.Provider>;
}

export function useNegocio(): ValorNegocio {
  const valor = useContext(ContextoNegocio);
  if (!valor) throw new Error('useNegocio debe usarse dentro de ProveedorNegocio');
  return valor;
}
