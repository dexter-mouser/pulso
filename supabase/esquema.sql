-- Esquema de Pulso para Supabase. Ejecútalo en el editor SQL del proyecto (se puede repetir sin problema).
-- Cada fila pertenece a un negocio; solo sus miembros la ven y los permisos de escritura dependen del rol.
-- Las ventas y el registro de cambios solo los escribe el servidor (funciones y triggers security definer).

-- Tablas
create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Mi negocio',
  moneda text not null default 'USD',
  impuesto numeric not null default 0 check (impuesto between 0 and 100),
  ultimo_numero_venta integer not null default 0,
  creado_en timestamptz not null default now()
);
alter table negocios add column if not exists ultimo_numero_venta integer not null default 0;

create table if not exists miembros (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios on delete cascade,
  user_id uuid references auth.users on delete set null,
  nombre text not null,
  correo text not null default '',
  rol text not null check (rol in ('administrador', 'gerente', 'vendedor', 'contador')),
  creado_en timestamptz not null default now()
);

create table if not exists articulos (
  id uuid primary key,
  negocio_id uuid not null references negocios on delete cascade,
  tipo text not null check (tipo in ('producto', 'servicio')),
  nombre text not null,
  precio numeric not null check (precio >= 0),
  costo numeric not null default 0 check (costo >= 0),
  stock numeric not null default 0,
  stock_minimo numeric not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key,
  negocio_id uuid not null references negocios on delete cascade,
  nombre text not null,
  correo text not null default '',
  telefono text not null default '',
  notas text not null default '',
  creado_en timestamptz not null default now()
);

create table if not exists ventas (
  id uuid primary key,
  negocio_id uuid not null references negocios on delete cascade,
  numero integer not null,
  cliente_id uuid,
  lineas jsonb not null,
  impuesto_porcentaje numeric not null default 0,
  subtotal numeric not null,
  impuesto numeric not null,
  total numeric not null,
  estado text not null check (estado in ('pagada', 'pendiente')),
  metodo_pago text not null,
  notas text not null default '',
  fecha timestamptz not null,
  vendedor_id uuid,
  unique (negocio_id, numero)
);

create table if not exists gastos (
  id uuid primary key,
  negocio_id uuid not null references negocios on delete cascade,
  concepto text not null,
  categoria text not null,
  monto numeric not null check (monto > 0),
  fecha timestamptz not null,
  metodo_pago text not null,
  notas text not null default '',
  creado_en timestamptz not null default now()
);

create table if not exists cambios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios on delete cascade,
  fecha timestamptz not null default now(),
  miembro_id uuid,
  miembro_nombre text not null,
  modulo text not null,
  accion text not null check (accion in ('crear', 'editar', 'borrar')),
  entidad_id text not null,
  descripcion text not null,
  antes jsonb,
  despues jsonb
);
alter table cambios alter column id set default gen_random_uuid();

-- Restricciones de ventas (se vuelven a crear para poder repetir el script)
alter table ventas drop constraint if exists ventas_lineas_es_lista;
alter table ventas add constraint ventas_lineas_es_lista check (jsonb_typeof(lineas) = 'array');
alter table ventas drop constraint if exists ventas_importes_positivos;
alter table ventas add constraint ventas_importes_positivos
  check (subtotal >= 0 and impuesto >= 0 and total >= 0 and impuesto_porcentaje between 0 and 100);
alter table ventas drop constraint if exists ventas_cliente_fk;
alter table ventas add constraint ventas_cliente_fk foreign key (cliente_id) references clientes (id) on delete set null;

-- Un usuario pertenece como máximo a un negocio
create unique index if not exists miembros_un_negocio_por_usuario on miembros (user_id) where user_id is not null;

-- Contador de ventas: parte del número más alto que ya exista
update negocios n
  set ultimo_numero_venta = greatest(n.ultimo_numero_venta, coalesce((select max(v.numero) from ventas v where v.negocio_id = n.id), 0));

-- Rol del usuario actual en un negocio
create or replace function rol_en(negocio uuid) returns text
language sql stable security definer set search_path = public as $$
  select rol from miembros where negocio_id = negocio and user_id = auth.uid() limit 1
$$;

-- Mismas reglas que src/permisos.ts
create or replace function puede_editar(negocio uuid, modulo text) returns boolean
language sql stable set search_path = public as $$
  select case rol_en(negocio)
    when 'administrador' then true
    when 'gerente' then modulo not in ('roles', 'ajustes')
    when 'vendedor' then modulo in ('ventas', 'clientes')
    when 'contador' then modulo = 'gastos'
    else false
  end
$$;

-- Crea un negocio y deja al usuario como administrador (máximo uno por usuario)
create or replace function crear_negocio(nombre_negocio text, nombre_miembro text)
returns table (negocio_id uuid, miembro_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  nuevo_negocio uuid;
  nuevo_miembro uuid;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if exists (select 1 from miembros where user_id = auth.uid()) then raise exception 'Ya perteneces a un negocio'; end if;
  if char_length(btrim(coalesce(nombre_negocio, ''))) not between 1 and 60 then
    raise exception 'El nombre del negocio debe tener entre 1 y 60 caracteres';
  end if;
  insert into negocios (nombre) values (btrim(nombre_negocio)) returning id into nuevo_negocio;
  insert into miembros (negocio_id, user_id, nombre, correo, rol)
    values (nuevo_negocio, auth.uid(), left(coalesce(nullif(btrim(nombre_miembro), ''), 'Administrador'), 80),
            coalesce(auth.jwt() ->> 'email', ''), 'administrador')
    returning id into nuevo_miembro;
  return query select nuevo_negocio, nuevo_miembro;
end;
$$;

-- Devuelve el negocio del usuario; si aún no tiene, toma la invitación más antigua hecha a su correo
create or replace function unirse_por_invitacion()
returns table (negocio_id uuid, miembro_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  correo_usuario text := lower(coalesce(auth.jwt() ->> 'email', ''));
  fila miembros;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;

  select * into fila from miembros where user_id = auth.uid() order by creado_en limit 1;
  if found then
    return query select fila.negocio_id, fila.id;
    return;
  end if;
  if correo_usuario = '' then return; end if;

  select * into fila from miembros
    where user_id is null and lower(correo) = correo_usuario
    order by creado_en limit 1
    for update skip locked;
  if not found then return; end if;

  update miembros set user_id = auth.uid() where id = fila.id;
  return query select fila.negocio_id, fila.id;
end;
$$;

-- Registra una venta en una transacción: el servidor fija precios, importes, número, vendedor y stock
create or replace function registrar_venta(
  p_negocio uuid, p_id uuid, p_cliente uuid, p_lineas jsonb, p_estado text, p_metodo text, p_notas text
) returns ventas
language plpgsql security definer set search_path = public as $$
declare
  negocio negocios;
  vendedor uuid;
  linea record;
  elemento jsonb;
  cantidad_linea numeric;
  articulo articulos;
  lineas_finales jsonb := '[]'::jsonb;
  subtotal_venta numeric := 0;
  impuesto_venta numeric;
  numero_venta integer;
  resultado ventas;
begin
  if auth.uid() is null or not puede_editar(p_negocio, 'ventas') then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  if p_estado not in ('pagada', 'pendiente') or p_metodo not in ('efectivo', 'tarjeta', 'transferencia', 'otro') then
    raise exception 'Estado o método de pago inválido';
  end if;
  if jsonb_typeof(p_lineas) is distinct from 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'La venta necesita al menos una línea';
  end if;
  if p_cliente is not null and not exists (select 1 from clientes where id = p_cliente and negocio_id = p_negocio) then
    raise exception 'Cliente inválido';
  end if;

  -- Cada cantidad debe ser un entero mayor que cero
  for elemento in select value from jsonb_array_elements(p_lineas) loop
    cantidad_linea := (elemento ->> 'cantidad')::numeric;
    if cantidad_linea is null or cantidad_linea <= 0 or cantidad_linea <> trunc(cantidad_linea) then
      raise exception 'Cantidad inválida';
    end if;
  end loop;

  -- Bloquea el negocio: serializa las ventas y da el impuesto vigente
  select * into negocio from negocios where id = p_negocio for update;
  select id into vendedor from miembros where negocio_id = p_negocio and user_id = auth.uid() limit 1;

  -- Agrupa por artículo y bloquea cada uno en orden fijo
  for linea in
    select (l ->> 'articuloId')::uuid as articulo_id, sum((l ->> 'cantidad')::numeric) as cantidad
    from jsonb_array_elements(p_lineas) l
    group by 1 order by 1
  loop
    select * into articulo from articulos where id = linea.articulo_id and negocio_id = p_negocio for update;
    if not found then raise exception 'Artículo no encontrado'; end if;
    if articulo.tipo = 'producto' and articulo.stock < linea.cantidad then
      raise exception 'No hay stock suficiente de «%»', articulo.nombre;
    end if;
    subtotal_venta := subtotal_venta + articulo.precio * linea.cantidad;
    lineas_finales := lineas_finales || jsonb_build_object(
      'articuloId', articulo.id, 'nombre', articulo.nombre, 'tipo', articulo.tipo,
      'cantidad', linea.cantidad, 'precio', articulo.precio);
  end loop;

  subtotal_venta := round(subtotal_venta, 2);
  impuesto_venta := round(subtotal_venta * negocio.impuesto / 100, 2);

  -- Número consecutivo y stock sin llenar el registro de cambios con cada ajuste interno
  perform set_config('pulso.sin_registro', 'on', true);
  update negocios set ultimo_numero_venta = ultimo_numero_venta + 1 where id = p_negocio
    returning ultimo_numero_venta into numero_venta;
  update articulos a set stock = a.stock - l.cantidad
    from (select (x ->> 'articuloId')::uuid as id, (x ->> 'cantidad')::numeric as cantidad
          from jsonb_array_elements(lineas_finales) x) l
    where a.id = l.id and a.tipo = 'producto';
  perform set_config('pulso.sin_registro', 'off', true);

  insert into ventas (id, negocio_id, numero, cliente_id, lineas, impuesto_porcentaje, subtotal, impuesto, total,
                      estado, metodo_pago, notas, fecha, vendedor_id)
    values (p_id, p_negocio, numero_venta, p_cliente, lineas_finales, negocio.impuesto, subtotal_venta, impuesto_venta,
            subtotal_venta + impuesto_venta, p_estado, p_metodo, coalesce(p_notas, ''), now(), vendedor)
    returning * into resultado;
  return resultado;
end;
$$;

-- Borra una venta y devuelve el stock de sus productos en una transacción
create or replace function borrar_venta(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  venta ventas;
begin
  select * into venta from ventas where id = p_id;
  if not found then return; end if;
  if auth.uid() is null or not puede_editar(venta.negocio_id, 'ventas') then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;

  -- Mismo orden de bloqueo que registrar_venta: negocio y luego artículos
  perform 1 from negocios where id = venta.negocio_id for update;
  perform set_config('pulso.sin_registro', 'on', true);
  update articulos a set stock = a.stock + l.cantidad
    from (select (x ->> 'articuloId')::uuid as id, (x ->> 'cantidad')::numeric as cantidad
          from jsonb_array_elements(venta.lineas) x) l
    where a.id = l.id and a.negocio_id = venta.negocio_id and a.tipo = 'producto';
  perform set_config('pulso.sin_registro', 'off', true);

  delete from ventas where id = p_id;
end;
$$;

-- Ya no hace falta: el stock se mueve dentro de registrar_venta y borrar_venta
drop function if exists ajustar_stock(uuid, numeric);

-- Impide dejar el negocio sin un administrador con cuenta
create or replace function proteger_administradores() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.rol <> 'administrador' or old.user_id is null then
    return case tg_op when 'DELETE' then old else new end;
  end if;
  -- Si se borra el negocio completo (cascada) no hay nada que proteger
  if tg_op = 'DELETE' and not exists (select 1 from negocios where id = old.negocio_id) then return old; end if;
  if tg_op = 'UPDATE' and new.rol = 'administrador' and new.negocio_id = old.negocio_id then return new; end if;
  if not exists (
    select 1 from miembros
    where negocio_id = old.negocio_id and rol = 'administrador' and user_id is not null and id <> old.id
  ) then
    raise exception 'Debe quedar al menos un administrador';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

drop trigger if exists proteger_administradores_editar on miembros;
create trigger proteger_administradores_editar before update on miembros
  for each row execute function proteger_administradores();
drop trigger if exists proteger_administradores_borrar on miembros;
create trigger proteger_administradores_borrar before delete on miembros
  for each row execute function proteger_administradores();

-- Registro de cambios: lo escribe el servidor con la identidad de auth.uid()
create or replace function registrar_cambio() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  fila jsonb;
  id_negocio uuid;
  id_miembro uuid;
  nombre_miembro text;
  modulo_cambio text;
  accion_cambio text;
  verbo text;
  texto text;
begin
  if tg_op = 'DELETE' then fila := to_jsonb(old) - 'user_id'; else fila := to_jsonb(new) - 'user_id'; end if;
  -- Ajustes internos de registrar_venta y borrar_venta
  if current_setting('pulso.sin_registro', true) = 'on' then return null; end if;
  -- Un cambio de solo el contador de ventas no es un cambio de ajustes
  if tg_table_name = 'negocios' and tg_op = 'UPDATE'
     and (to_jsonb(new) - 'ultimo_numero_venta') = (to_jsonb(old) - 'ultimo_numero_venta') then
    return null;
  end if;

  id_negocio := case when tg_table_name = 'negocios' then (fila ->> 'id')::uuid else (fila ->> 'negocio_id')::uuid end;
  select id, nombre into id_miembro, nombre_miembro from miembros where negocio_id = id_negocio and user_id = auth.uid() limit 1;
  -- Sin miembro identificado (alta del negocio, tareas del sistema) no se registra
  if id_miembro is null then return null; end if;

  modulo_cambio := case tg_table_name
    when 'articulos' then 'productos' when 'miembros' then 'roles' when 'negocios' then 'ajustes' else tg_table_name end;
  accion_cambio := case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'borrar' end;
  verbo := case tg_op when 'INSERT' then 'Creó' when 'UPDATE' then 'Editó' else 'Borró' end;
  texto := case tg_table_name
    when 'articulos' then verbo || ' el artículo «' || (fila ->> 'nombre') || '»'
    when 'clientes' then verbo || ' el cliente «' || (fila ->> 'nombre') || '»'
    when 'gastos' then verbo || ' el gasto «' || (fila ->> 'concepto') || '»'
    when 'miembros' then verbo || ' al miembro «' || (fila ->> 'nombre') || '»'
    when 'ventas' then case tg_op when 'INSERT' then 'Registró la venta #' else verbo || ' la venta #' end || (fila ->> 'numero')
    else case tg_op when 'UPDATE' then 'Editó los ajustes del negocio' else verbo || ' el negocio «' || (fila ->> 'nombre') || '»' end
  end;

  insert into cambios (negocio_id, miembro_id, miembro_nombre, modulo, accion, entidad_id, descripcion, antes, despues)
    values (id_negocio, id_miembro, nombre_miembro, modulo_cambio, accion_cambio, fila ->> 'id', texto,
            case when tg_op = 'INSERT' then null else to_jsonb(old) - 'user_id' end,
            case when tg_op = 'DELETE' then null else to_jsonb(new) - 'user_id' end);
  return null;
end;
$$;

drop trigger if exists registro_articulos on articulos;
create trigger registro_articulos after insert or update or delete on articulos
  for each row execute function registrar_cambio();
drop trigger if exists registro_clientes on clientes;
create trigger registro_clientes after insert or update or delete on clientes
  for each row execute function registrar_cambio();
drop trigger if exists registro_ventas on ventas;
create trigger registro_ventas after insert or update or delete on ventas
  for each row execute function registrar_cambio();
drop trigger if exists registro_gastos on gastos;
create trigger registro_gastos after insert or update or delete on gastos
  for each row execute function registrar_cambio();
drop trigger if exists registro_miembros on miembros;
create trigger registro_miembros after insert or update or delete on miembros
  for each row execute function registrar_cambio();
drop trigger if exists registro_negocios on negocios;
create trigger registro_negocios after insert or update or delete on negocios
  for each row execute function registrar_cambio();

-- Seguridad por filas
alter table negocios enable row level security;
alter table miembros enable row level security;
alter table articulos enable row level security;
alter table clientes enable row level security;
alter table ventas enable row level security;
alter table gastos enable row level security;
alter table cambios enable row level security;

drop policy if exists negocios_ver on negocios;
create policy negocios_ver on negocios for select using (rol_en(id) is not null);
drop policy if exists negocios_editar on negocios;
create policy negocios_editar on negocios for update using (puede_editar(id, 'ajustes')) with check (puede_editar(id, 'ajustes'));

drop policy if exists miembros_ver on miembros;
create policy miembros_ver on miembros for select using (rol_en(negocio_id) is not null);
drop policy if exists miembros_crear on miembros;
create policy miembros_crear on miembros for insert with check (puede_editar(negocio_id, 'roles'));
drop policy if exists miembros_editar on miembros;
create policy miembros_editar on miembros for update using (puede_editar(negocio_id, 'roles')) with check (puede_editar(negocio_id, 'roles'));
drop policy if exists miembros_borrar on miembros;
create policy miembros_borrar on miembros for delete using (puede_editar(negocio_id, 'roles'));

drop policy if exists articulos_ver on articulos;
create policy articulos_ver on articulos for select using (rol_en(negocio_id) is not null);
drop policy if exists articulos_escribir on articulos;
create policy articulos_escribir on articulos for all using (puede_editar(negocio_id, 'productos')) with check (puede_editar(negocio_id, 'productos'));

drop policy if exists clientes_ver on clientes;
create policy clientes_ver on clientes for select using (rol_en(negocio_id) is not null);
drop policy if exists clientes_escribir on clientes;
create policy clientes_escribir on clientes for all using (puede_editar(negocio_id, 'clientes')) with check (puede_editar(negocio_id, 'clientes'));

-- Ventas: se crean y borran solo con registrar_venta y borrar_venta
drop policy if exists ventas_ver on ventas;
create policy ventas_ver on ventas for select using (rol_en(negocio_id) is not null);
drop policy if exists ventas_escribir on ventas;
drop policy if exists ventas_actualizar on ventas;
create policy ventas_actualizar on ventas for update using (puede_editar(negocio_id, 'ventas')) with check (puede_editar(negocio_id, 'ventas'));

drop policy if exists gastos_ver on gastos;
create policy gastos_ver on gastos for select using (rol_en(negocio_id) in ('administrador', 'gerente', 'contador'));
drop policy if exists gastos_escribir on gastos;
create policy gastos_escribir on gastos for all using (puede_editar(negocio_id, 'gastos')) with check (puede_editar(negocio_id, 'gastos'));

-- El registro solo se consulta (lo escriben los triggers); lo ven administración y gerencia
drop policy if exists cambios_ver on cambios;
create policy cambios_ver on cambios for select using (rol_en(negocio_id) in ('administrador', 'gerente'));
drop policy if exists cambios_crear on cambios;

-- Permisos de tablas: sin acceso anónimo y con las columnas que el cliente puede escribir
revoke all on negocios, miembros, articulos, clientes, ventas, gastos, cambios from anon;
revoke all on negocios, miembros, articulos, clientes, ventas, gastos, cambios from authenticated;
grant select on negocios, miembros, articulos, clientes, ventas, gastos, cambios to authenticated;
grant update (nombre, moneda, impuesto) on negocios to authenticated;
grant insert (id, negocio_id, nombre, correo, rol, creado_en), update (nombre, correo, rol) on miembros to authenticated;
grant delete on miembros to authenticated;
grant insert, update, delete on articulos, clientes, gastos to authenticated;
grant update (estado, metodo_pago, notas, cliente_id) on ventas to authenticated;

-- Funciones: solo usuarios con sesión (las de trigger no se llaman desde el cliente)
revoke execute on function rol_en(uuid) from public, anon;
grant execute on function rol_en(uuid) to authenticated;
revoke execute on function puede_editar(uuid, text) from public, anon;
grant execute on function puede_editar(uuid, text) to authenticated;
revoke execute on function crear_negocio(text, text) from public, anon;
grant execute on function crear_negocio(text, text) to authenticated;
revoke execute on function unirse_por_invitacion() from public, anon;
grant execute on function unirse_por_invitacion() to authenticated;
revoke execute on function registrar_venta(uuid, uuid, uuid, jsonb, text, text, text) from public, anon;
grant execute on function registrar_venta(uuid, uuid, uuid, jsonb, text, text, text) to authenticated;
revoke execute on function borrar_venta(uuid) from public, anon;
grant execute on function borrar_venta(uuid) to authenticated;
revoke execute on function proteger_administradores() from public, anon, authenticated;
revoke execute on function registrar_cambio() from public, anon, authenticated;
