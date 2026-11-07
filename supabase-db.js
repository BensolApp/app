// BENSOL · Etapa 2
// Capa de acceso a datos sobre Supabase. Envoltorios finos alrededor de las
// tablas que YA existen. No cambia el esquema ni borra nada.
//
// Todavía NO reemplaza a localStorage en index.html (eso es Etapa 3).
// Se expone en window.Bensol.db para integrarlo y probarlo por partes.
//
// NOTA DE ESQUEMA: se asume nomenclatura snake_case habitual de Supabase:
//   empleados(id, nombre, rol, activo, creado_en, user_id, email)
//   obras(id, ...)
//   obra_empleados(obra_id, empleado_id)
//   fichajes(id, empleado_id, obra_id, entrada, salida, ...)
//   partes(id, obra_id, ...)
//   parte_horas(id, parte_id, empleado_id, horas)
//   parte_materiales(id, parte_id, ...)
//   incidencias(id, obra_id | parte_id, ..., creada_en)   <- fecha: creada_en
// Fechas por confirmar en obras/partes (se asume `creado_en`); si difieren,
// ajusta los .order(...) de abajo.
// Si en tu proyecto alguna columna se llama distinto, ajústalo aquí y en
// sql/etapa2_seguridad.sql (mismo criterio en los dos sitios).

import { supabase } from './supabase-client.js';

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------- empleados ---------------- */

export async function listarEmpleados() {
  return unwrap(await supabase.from('empleados').select('*').order('creado_en', { ascending: true }));
}

// Alta de PERFIL de empleado (solo admin, por RLS). NO crea el usuario de Auth:
// eso es una acción administrativa segura aparte (ver sql/etapa7_...).
export async function crearEmpleado(datos) {
  return unwrap(await supabase.from('empleados').insert(datos).select().single());
}

export async function actualizarEmpleado(id, cambios) {
  return unwrap(await supabase.from('empleados').update(cambios).eq('id', id).select().single());
}

/* ---------------- obras ---------------- */

export async function listarObras() {
  return unwrap(await supabase.from('obras').select('*').order('creado_en', { ascending: false }));
}

export async function crearObra(obra) {
  return unwrap(await supabase.from('obras').insert(obra).select().single());
}

export async function actualizarObra(id, cambios) {
  return unwrap(await supabase.from('obras').update(cambios).eq('id', id).select().single());
}

/**
 * Borra una obra que no tiene actividad. Antes mira en la base si tiene
 * partes, fichajes u horas imputadas: si tiene, no borra y dice por qué (la
 * app ya lo comprueba con lo que tiene en memoria, pero la memoria puede ir
 * atrasada). Los empleados asignados y los días de la obra se van con ella.
 */
/* ---------------- economía de la obra y costes (sql/etapa59) ----------------
 * Solo devuelven filas a quien tiene ve_costes() (Administración y
 * presupuestos): la RLS y las vistas lo garantizan, aquí no se filtra nada. */
export async function economiaObra(obraId) {
  const [eco, cats, pres] = await Promise.all([
    supabase.from('v_obra_economia').select('*').eq('obra_id', obraId).maybeSingle(),
    supabase.from('v_obra_economia_categoria').select('*').eq('obra_id', obraId),
    supabase.from('presupuestos').select('id, categoria, total_venta, total_coste, respuesta_cliente, estado, created_at, visita:visitas(id, codigo), cliente:clientes_cache(id, nombre)').eq('obra_id', obraId).order('created_at', { ascending: false }),
  ]);
  if (eco.error) throw eco.error;
  return { eco: eco.data || null, categorias: unwrap(cats) || [], presupuestos: unwrap(pres) || [] };
}
/** Los gastos apuntados de una obra (albaranes, materiales de partes, a mano). */
export async function costesObra(obraId) {
  return unwrap(await supabase.from('obra_costes').select('*').eq('obra_id', obraId).order('fecha', { ascending: false })) || [];
}
export async function anadirCosteObra(fila) {
  return unwrap(await supabase.from('obra_costes').insert(fila).select().single());
}
export async function borrarCosteObra(id) {
  return unwrap(await supabase.from('obra_costes').delete().eq('id', id).select('id'));
}
/** Enlazar a la obra el presupuesto que el cliente aceptó (o quitarlo). */
export async function enlazarPresupuesto(presupuestoId, obraId) {
  const cambios = obraId
    ? { obra_id: obraId, respuesta_cliente: 'aceptado', respondido_at: new Date().toISOString() }
    : { obra_id: null };
  return unwrap(await supabase.from('presupuestos').update(cambios).eq('id', presupuestoId).select('id, obra_id').single());
}
/** Coste de la hora de cada empleado, con histórico. */
export async function listarCostesEmpleados() {
  return unwrap(await supabase.from('empleado_costes').select('*').order('desde', { ascending: false })) || [];
}
export async function guardarCosteEmpleado(fila) {
  return unwrap(await supabase.from('empleado_costes').insert(fila).select().single());
}

/* ---------------- planificación diaria (sql/etapa60) ----------------
 * Quién va cada día a qué obra. La escribe todo comercial; el operario solo
 * lee lo suyo (lo filtra la RLS). */
export async function listarPlanificacion(desde, hasta) {
  return unwrap(await supabase.from('v_planificacion_dia').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha').order('hora_prevista', { nullsFirst: false })) || [];
}
export async function crearPlanificacion(filas) {
  // upsert por (empleado, fecha, obra): repetir una asignación no da error.
  return unwrap(await supabase.from('planificacion').upsert(filas, { onConflict: 'empleado_id,fecha,obra_id', ignoreDuplicates: false }).select());
}
export async function actualizarPlanificacion(id, cambios) {
  return unwrap(await supabase.from('planificacion').update(cambios).eq('id', id).select().single());
}
export async function borrarPlanificacion(id) {
  return unwrap(await supabase.from('planificacion').delete().eq('id', id).select('id'));
}
/** Partes hechos en una obra donde el autor no estaba planificado (sql/etapa61). */
export async function partesFueraDePlan() {
  return unwrap(await supabase.from('v_partes_fuera_de_plan').select('*').order('fecha', { ascending: false })) || [];
}
export async function revisarParteFueraDePlan(id) {
  return unwrap(await supabase.from('partes').update({ fuera_de_plan_revisado_at: new Date().toISOString() }).eq('id', id).select('id'));
}
export async function obrasSinPlanificar(fecha) {
  return unwrap(await supabase.from('v_obras_sin_planificar').select('*').eq('fecha', fecha).order('numero', { ascending: false })) || [];
}

/* ---------------- fases de obra: el proyecto (sql/etapa63) ----------------
 * Cada obra tiene sus fases con un porcentaje; el avance se apunta desde el
 * parte (parte_fases) o a mano en la ficha. */
export async function listarFases(obraIds) {
  let q = supabase.from('obra_fases').select('*').order('orden');
  if (obraIds && obraIds.length) q = q.in('obra_id', obraIds);
  return unwrap(await q) || [];
}
export async function actualizarFase(id, cambios) {
  return unwrap(await supabase.from('obra_fases').update(cambios).eq('id', id).select().single());
}
export async function crearFase(fila) {
  return unwrap(await supabase.from('obra_fases').insert(fila).select().single());
}
export async function borrarFase(id) {
  return unwrap(await supabase.from('obra_fases').delete().eq('id', id).select('id'));
}
/** El avance apuntado en un parte: [{fase_id, pct_antes, pct_despues}]. */
export async function guardarAvanceParte(parteId, filas) {
  const rows = filas.map((f) => ({ ...f, parte_id: parteId }));
  return unwrap(await supabase.from('parte_fases').insert(rows).select());
}
export async function avanceDeParte(parteId) {
  return unwrap(await supabase.from('parte_fases').select('*, fase:obra_fases(nombre, categoria)').eq('parte_id', parteId)) || [];
}
export async function generarFasesObra(obraId) {
  const { data, error } = await supabase.rpc('generar_fases_obra', { p_obra: obraId });
  if (error) throw new Error(error.message);
  return data;
}
export async function listarPlantillasFases() {
  return unwrap(await supabase.from('fase_plantillas').select('*').order('al_final').order('orden')) || [];
}
export async function guardarPlantillaFase(fila) {
  return unwrap(await supabase.from('fase_plantillas').upsert(fila).select().single());
}

export async function borrarObra(id, destinoId) {
  const cuenta = async (tabla) => {
    const r = await supabase.from(tabla).select('id', { count: 'exact', head: true }).eq('obra_id', id);
    if (r.error) throw r.error;
    return r.count || 0;
  };
  const [partes, fichajes, imputaciones] = await Promise.all([cuenta('partes'), cuenta('fichajes'), cuenta('imputaciones')]);
  if (partes || fichajes || imputaciones) {
    const que = [partes && `${partes} parte${partes > 1 ? 's' : ''}`, fichajes && `${fichajes} fichaje${fichajes > 1 ? 's' : ''}`, imputaciones && `${imputaciones} hora${imputaciones > 1 ? 's' : ''} imputada${imputaciones > 1 ? 's' : ''}`].filter(Boolean).join(', ');
    const e = new Error('Esta obra tiene ' + que + '. Ciérrala en vez de borrarla.'); e.conActividad = true; throw e;
  }
  // Los presupuestos que estuvieran enlazados pasan a la otra obra abierta del
  // cliente si la hay (1-11-2026: obra duplicada al aceptar un segundo
  // presupuesto); si no, quedan sueltos (la clave foránea los deja a null).
  if (destinoId) {
    const m = await supabase.from('presupuestos').update({ obra_id: destinoId }).eq('obra_id', id).select('id');
    if (m.error) throw m.error;
  }
  await supabase.from('obra_empleados').delete().eq('obra_id', id);
  const r = await supabase.from('obras').delete().eq('id', id).select('id');
  if (r.error) throw r.error;
  if (!r.data || !r.data.length) throw new Error('No se ha borrado: puede que no tengas permiso (falta la etapa 57) o que ya no exista.');
  return true;
}

export async function empleadosDeObra(obraId) {
  return unwrap(await supabase.from('obra_empleados').select('empleado_id').eq('obra_id', obraId));
}

// Todas las asignaciones visibles para el usuario (RLS las acota).
export async function listarAsignaciones() {
  return unwrap(await supabase.from('obra_empleados').select('obra_id, empleado_id'));
}

export async function asignarEmpleadoAObra(obraId, empleadoId) {
  return unwrap(await supabase.from('obra_empleados').insert({ obra_id: obraId, empleado_id: empleadoId }).select());
}

export async function quitarEmpleadoDeObra(obraId, empleadoId) {
  return unwrap(await supabase.from('obra_empleados').delete().eq('obra_id', obraId).eq('empleado_id', empleadoId).select());
}

/* ---------------- fichajes ---------------- */
// La hora de entrada/salida la pone PostgreSQL (trigger del SQL de Etapa 2).
// No hace falta enviar `entrada` ni `salida` desde el cliente.

export async function fichajeAbierto(empleadoId) {
  return unwrap(await supabase
    .from('fichajes').select('*')
    .eq('empleado_id', empleadoId).is('salida', null)
    .maybeSingle());
}

// `donde` (sql/etapa50): { lat, lng, precision_m, distancia_m, lugar } o, si lo
// ficha Administración por él, { lugar: 'administracion', fichado_por }.
export async function ficharEntrada(empleadoId, obraId, donde) {
  return unwrap(await supabase
    .from('fichajes')
    .insert(Object.assign({ empleado_id: empleadoId, obra_id: obraId }, donde || {}))
    .select().single());
}

export async function ficharSalida(fichajeId, donde) {
  const d = donde || {};
  return unwrap(await supabase
    .from('fichajes')
    .update(Object.assign({ salida: new Date().toISOString() }, // el trigger reescribe con now() del servidor
      d.lat != null ? { salida_lat: d.lat, salida_lng: d.lng, salida_distancia_m: d.distancia_m, salida_lugar: d.lugar } : {},
      d.lugar === 'administracion' ? { salida_lugar: 'administracion' } : {}))
    .eq('id', fichajeId)
    .select().single());
}

/* --- los datos de la empresa (sql/etapa50): una fila, todos leen, admin escribe --- */
export async function obtenerEmpresa() {
  return unwrap(await supabase.from('empresa').select('*').eq('id', 1).maybeSingle());
}
export async function guardarEmpresa(cambios) {
  return unwrap(await supabase.from('empresa').update(cambios).eq('id', 1).select().single());
}

// Corrección administrativa (solo jefe/admin, aplicado por RLS + trigger del
// servidor): a diferencia de ficharSalida, aquí SÍ se respetan los valores
// exactos de entrada/salida que se envían — es la vía para arreglar un
// fichaje mal cerrado o una salida olvidada con la hora real, no con "ahora".
export async function corregirFichaje(fichajeId, { entrada, salida }) {
  return unwrap(await supabase
    .from('fichajes')
    .update({ entrada, salida })
    .eq('id', fichajeId)
    .select().single());
}

// Alta manual de un fichaje ya cerrado (corrección administrativa: el
// empleado olvidó fichar ese día). Se inserta y acto seguido se le ponen las
// horas reales, porque el trigger del servidor fija la entrada al insertar.
export async function crearFichajeManual(empleadoId, { entrada, salida }) {
  // Se inserta YA CERRADO, con las horas reales. Antes se creaba abierto y se
  // corregía después, y eso fallaba si esa persona estaba fichada en ese
  // momento: nacía una segunda jornada abierta y saltaba la restricción de
  // "un solo fichaje abierto por empleado". Requiere sql/etapa9.
  const ins = await supabase.from('fichajes')
    .insert({ empleado_id: empleadoId, obra_id: null, entrada, salida })
    .select().single();

  if (ins.error) {
    // Sin etapa9 el servidor anula la salida, así que el choque con la jornada
    // abierta es el SÍNTOMA, no la causa. Se informa de la causa.
    if (/un_abierto_por_empleado/i.test(ins.error.message)) throw new Error('FALTA_ETAPA9');
    throw new Error(ins.error.message);
  }
  const respetada = Math.abs(new Date(ins.data.entrada) - new Date(entrada)) < 60000 && ins.data.salida;
  if (respetada) return ins.data;

  // El servidor pisó las horas: se deshace en vez de dejar un fichaje de hoy.
  await supabase.from('fichajes').delete().eq('id', ins.data.id);
  throw new Error('FALTA_ETAPA9');
}

// Importación del histórico: inserta muchos fichajes YA CERRADOS de una vez.
// `filas` = [{ empleado_id, entrada, salida }] con entrada/salida en ISO.
//
// Requiere sql/etapa9_importar_historico.sql: sin esa migración el trigger
// pisa la entrada con now() y se cargarían todos los días con la fecha de hoy.
// Por eso se comprueba la primera fila devuelta y, si no coincide con lo que se
// mandó, se deshace el lote y se avisa en vez de dejar basura en la tabla.
export async function importarFichajes(filas) {
  if (!filas || !filas.length) return [];
  const puestos = unwrap(await supabase
    .from('fichajes')
    .insert(filas.map((f) => ({ empleado_id: f.empleado_id, obra_id: null, entrada: f.entrada, salida: f.salida })))
    .select());
  // Se comparan los mínimos, no fila a fila: así no depende del orden en que
  // Postgres devuelva las filas.
  const minimo = (xs) => Math.min(...xs.map((x) => new Date(x.entrada).getTime()));
  if (!puestos.length || Math.abs(minimo(puestos) - minimo(filas)) > 60000) {
    await supabase.from('fichajes').delete().in('id', puestos.map((p) => p.id));
    throw new Error('FALTA_ETAPA9');
  }
  return puestos;
}

// Borrar un fichaje mal cargado (duplicado, día equivocado). Solo jefe/admin
// por RLS.
export async function borrarFichaje(fichajeId) {
  return unwrap(await supabase.from('fichajes').delete().eq('id', fichajeId).select());
}

export async function fichajesDelDia(dia) {
  const desde = dia + 'T00:00:00';
  const hasta = dia + 'T23:59:59.999';
  return unwrap(await supabase
    .from('fichajes').select('*')
    .gte('entrada', desde).lte('entrada', hasta)
    .order('entrada', { ascending: true }));
}

// Todos los fichajes visibles para el usuario (RLS los acota). `desde` opcional
// (ISO) para limitar el rango.
export async function listarFichajes(desde) {
  let q = supabase.from('fichajes').select('*').order('entrada', { ascending: true });
  if (desde) q = q.gte('entrada', desde);
  return unwrap(await q);
}

// Realtime: escucha altas/cambios en fichajes. cb(payload).
// Devuelve función para cancelar la suscripción.
export function escucharFichajes(cb) {
  const canal = supabase
    .channel('fichajes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fichajes' }, cb)
    .subscribe();
  return () => supabase.removeChannel(canal);
}

/* ---------------- partes ---------------- */

export async function listarPartes(obraId, desde) {
  let q = supabase.from('partes').select('*').order('creado_en', { ascending: false });
  if (obraId) q = q.eq('obra_id', obraId);
  // `desde` acota a los últimos meses: la app no necesita el historial entero
  // para pintar la pantalla de partes, y bajarlo cada vez no escala.
  if (desde) q = q.gte('fecha', desde);
  return unwrap(await q);
}

// Las tablas que cuelgan del parte aceptan un id o una lista: así se piden solo
// las de los partes que se han traído, no las de todos los de la historia.
function acotarPorParte(q, parteId) {
  if (Array.isArray(parteId)) {
    return parteId.length ? q.in('parte_id', parteId)
      : q.eq('parte_id', '00000000-0000-0000-0000-000000000000');
  }
  return parteId ? q.eq('parte_id', parteId) : q;
}

export async function crearParte(parte) {
  return unwrap(await supabase.from('partes').insert(parte).select().single());
}

export async function actualizarParte(id, cambios) {
  return unwrap(await supabase.from('partes').update(cambios).eq('id', id).select().single());
}

export async function guardarHorasParte(parteId, filas) {
  const rows = filas.map((f) => ({ ...f, parte_id: parteId }));
  return unwrap(await supabase.from('parte_horas').insert(rows).select());
}

export async function guardarMaterialesParte(parteId, filas) {
  const rows = filas.map((f) => ({ ...f, parte_id: parteId }));
  return unwrap(await supabase.from('parte_materiales').insert(rows).select());
}

// Lectura de líneas de horas/materiales. Sin parteId, todas las visibles (RLS).
export async function listarHorasPartes(parteId) {
  return unwrap(await acotarPorParte(supabase.from('parte_horas').select('*'), parteId));
}

export async function listarMaterialesPartes(parteId) {
  return unwrap(await acotarPorParte(supabase.from('parte_materiales').select('*'), parteId));
}

/* ---------------- adjuntos de partes (fotos) ---------------- */
// Requiere sql/etapa12_adjuntos.sql: bucket privado `partes` + tabla
// public.parte_adjuntos. El bucket es PRIVADO porque son fotos de obras de
// clientes: se miran con enlaces firmados que caducan, no con una URL abierta.

const BUCKET = 'partes';

// dataURL ("data:image/jpeg;base64,...") -> Blob, sin pasar por fetch().
function blobDeDataURL(dataURL) {
  const [cabecera, datos] = String(dataURL).split(',');
  const tipo = (cabecera.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(datos);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

// Sube un adjunto y deja constancia en la tabla. Si la fila falla, se borra el
// archivo: más vale no dejar nada que dejar un archivo que nadie ve ni puede
// borrar desde la app.
export async function subirAdjunto(parteId, adj) {
  const blob = adj.blob || blobDeDataURL(adj.data);
  const ext = (adj.nombre && adj.nombre.includes('.') ? adj.nombre.split('.').pop() : (adj.img ? 'jpg' : 'bin'))
    .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const ruta = `${parteId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const subida = await supabase.storage.from(BUCKET)
    .upload(ruta, blob, { contentType: blob.type, upsert: false });
  if (subida.error) throw new Error(subida.error.message);

  const { data, error } = await supabase.from('parte_adjuntos').insert({
    parte_id: parteId,
    ruta,
    nombre: adj.nombre || 'foto.jpg',
    tipo: blob.type,
    bytes: blob.size,
    es_imagen: !!adj.img,
  }).select().single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta]);
    throw new Error(error.message);
  }
  return data;
}

// Filas de adjuntos visibles (RLS las acota). Sin parteId, todas.
export async function listarAdjuntosPartes(parteId) {
  return unwrap(await acotarPorParte(
    supabase.from('parte_adjuntos').select('*').order('creado_en', { ascending: true }), parteId));
}

// Enlaces temporales para mirar las fotos. Una hora por defecto: suficiente
// para ver el parte o imprimirlo, y no vale como URL permanente.
export async function urlsFirmadas(rutas, segundos = 3600) {
  if (!rutas || !rutas.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(rutas, segundos);
  if (error) throw new Error(error.message);
  const out = {};
  (data || []).forEach((x) => { if (x.signedUrl && !x.error) out[x.path] = x.signedUrl; });
  return out;
}

// Descarga el archivo. Se usa para incrustar la foto en el PDF: así el papel
// no depende de que el enlace siga vivo cuando el navegador vaya a imprimir.
export async function descargarAdjunto(ruta) {
  const { data, error } = await supabase.storage.from(BUCKET).download(ruta);
  if (error) throw new Error(error.message);
  return data; // Blob
}

export async function borrarAdjunto(id, ruta) {
  const { error } = await supabase.from('parte_adjuntos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET).remove([ruta]);
  return true;
}

// Borrar un parte del todo. Se limpian primero los archivos del almacén: las
// filas se van solas en cascada, pero las fotos se quedarían huérfanas ocupando
// sitio sin que nadie pueda verlas ni borrarlas desde la app.
export async function borrarParte(parteId) {
  try {
    const adj = await listarAdjuntosPartes(parteId);
    const rutas = (adj || []).map((a) => a.ruta);
    if (rutas.length) await supabase.storage.from(BUCKET).remove(rutas);
  } catch (e) { /* si no hay adjuntos o falta la tabla, seguimos */ }
  await supabase.from('parte_materiales').delete().eq('parte_id', parteId);
  await supabase.from('parte_horas').delete().eq('parte_id', parteId);
  return unwrap(await supabase.from('partes').delete().eq('id', parteId).select());
}

/* ---------------- albaranes y recibos de la obra ---------------- */
// Requiere sql/etapa21_obra_documentos.sql: bucket privado `obra-docs` y tabla
// public.obra_documentos. Control interno: solo jefe y Administración.
const BUCKET_DOCS = 'obra-docs';

export async function listarDocumentosObra(obraId) {
  return unwrap(await supabase.from('obra_documentos').select('*').eq('obra_id', obraId)
    .order('fecha', { ascending: false }).order('creado_en', { ascending: false })) || [];
}

// Igual que subirAdjunto: si la fila falla, se borra el archivo para no dejar
// nada huérfano en el almacén.
export async function subirDocumentoObra(obraId, doc) {
  const blob = blobDeDataURL(doc.data);
  const ext = doc.esImagen
    ? 'jpg'
    : (String(doc.nombre || '').split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'pdf';
  const ruta = `${obraId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const subida = await supabase.storage.from(BUCKET_DOCS)
    .upload(ruta, blob, { contentType: blob.type, upsert: false });
  if (subida.error) throw new Error(subida.error.message);

  const { data, error } = await supabase.from('obra_documentos').insert({
    obra_id: obraId,
    tipo: doc.tipo || 'albaran',
    proveedor: doc.proveedor || null,
    importe: doc.importe,
    fecha: doc.fecha,
    nota: doc.nota || null,
    ruta,
    nombre: doc.nombre || null,
    mime: blob.type,
    bytes: blob.size,
    es_imagen: !!doc.esImagen,
  }).select().single();
  if (error) {
    await supabase.storage.from(BUCKET_DOCS).remove([ruta]);
    throw new Error(error.message);
  }
  return data;
}

export async function urlsFirmadasDocs(rutas, segundos = 3600) {
  if (!rutas || !rutas.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET_DOCS).createSignedUrls(rutas, segundos);
  if (error) throw new Error(error.message);
  const out = {};
  (data || []).forEach((x) => { if (x.signedUrl && !x.error) out[x.path] = x.signedUrl; });
  return out;
}

export async function borrarDocumentoObra(id, ruta) {
  const { error } = await supabase.from('obra_documentos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET_DOCS).remove([ruta]);
  return true;
}

/* ---------------- envío de partes por correo ---------------- */
// Edge Function `enviar-parte` (Resend). El PDF viaja en base64.
// Si la función no está desplegada, el error lleva `noDesplegada` para que la
// app ofrezca compartir el PDF a mano en vez de dejar al usuario tirado.
export async function enviarParteCorreo({ para, copia, asunto, texto, pdfBlob, nombreArchivo, datos }) {
  const buf = new Uint8Array(await pdfBlob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const { data, error } = await supabase.functions.invoke('enviar-parte', {
    body: { para, copia, asunto, texto, pdf_base64: btoa(bin), nombre_archivo: nombreArchivo, datos },
  });
  if (error) {
    const ctx = error.context;
    let msg = error.message || 'No se pudo enviar.';
    let noDesplegada = error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError';
    try {
      if (ctx && typeof ctx.status === 'number') {
        noDesplegada = ctx.status === 404;
        const cuerpo = await ctx.clone().json();
        if (cuerpo && cuerpo.error) msg = cuerpo.error;
      }
    } catch (_) { /* cuerpo no JSON */ }
    const e = new Error(noDesplegada ? 'La función enviar-parte no está desplegada todavía.' : msg);
    e.noDesplegada = noDesplegada;
    throw e;
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}

/**
 * Sube a Google Drive el PDF de un parte (edge function `parte-drive`). El
 * parte se dibuja en el móvil, así que el PDF viaja en base64, igual que en
 * el envío por correo.
 */
export async function subirParteADrive(parteId, pdfBlob) {
  const buf = new Uint8Array(await pdfBlob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const { data, error } = await supabase.functions.invoke('parte-drive', {
    body: { parte_id: parteId, pdf_base64: btoa(bin) },
  });
  if (error) {
    let msg = error.message || 'error';
    const nombre = error.name || '';
    if (nombre === 'SesionCaducada') { /* el mensaje ya es claro */ } else if (nombre === 'FunctionsFetchError' || nombre === 'FunctionsRelayError' || /failed to (send|fetch)/i.test(msg)) {
      msg = 'la función parte-drive no está subida todavía';
    } else {
      try {
        const ctx = error.context;
        if (ctx && typeof ctx.clone === 'function') {
          const cuerpo = await ctx.clone().json();
          if (cuerpo && cuerpo.error) msg = cuerpo.error;
        }
      } catch (_) { /* no era JSON */ }
    }
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}

/**
 * Qué periodos tiene ya firmados esa persona. Un empleado solo ve los suyos
 * (política documentos_select), que es justo lo que hace falta aquí.
 */
export async function periodosFirmados(empleadoId, periodos) {
  let q = supabase.from('documentos').select('periodo')
    .eq('tipo', 'planilla').eq('empleado_id', empleadoId);
  if (periodos && periodos.length) q = q.in('periodo', periodos);
  return (unwrap(await q) || []).map((d) => d.periodo);
}

/* ---------------- cuaderno de fallos (sql/etapa35) ---------------- */
// Apuntar no puede fallar hacia fuera: si el cuaderno no está o la red se cae,
// se pierde ese apunte y ya. Lo que no puede es romper lo que estaba haciendo
// el usuario por intentar registrar un error.

export async function apuntarError(fila) {
  const { error } = await supabase.from('errores').insert(fila);
  if (error) throw error;
  return true;
}

export async function listarErrores(limite = 150) {
  return unwrap(await supabase.from('errores').select('*')
    .order('creado_en', { ascending: false }).limit(limite)) || [];
}

export async function borrarErrores() {
  // Sin filtro PostgREST se niega a borrar; este siempre se cumple.
  const { error } = await supabase.from('errores').delete().gt('id', 0);
  if (error) throw error;
  return true;
}

/* ---------------- ausencias (vacaciones, festivos, bajas) ---------------- */
// sql/etapa17. Marcan un día completo sin trabajo. No tocan los fichajes: un
// día puede tener las dos cosas (media jornada y luego permiso), y la planilla
// enseña ambas.

export async function listarAusencias(empleadoId) {
  let q = supabase.from('ausencias').select('*').order('fecha', { ascending: true });
  if (empleadoId) q = q.eq('empleado_id', empleadoId);
  return unwrap(await q);
}

export async function marcarAusencia(empleadoId, fecha, tipo, nota) {
  return unwrap(await supabase.from('ausencias')
    .upsert({ empleado_id: empleadoId, fecha, tipo: tipo || 'vacaciones', nota: nota || null },
            { onConflict: 'empleado_id,fecha' })
    .select().single());
}

export async function quitarAusencia(empleadoId, fecha) {
  return unwrap(await supabase.from('ausencias').delete()
    .eq('empleado_id', empleadoId).eq('fecha', fecha).select());
}

// Calendario de festivos: común a todo el equipo.
export async function listarFestivos() {
  return unwrap(await supabase.from('festivos').select('*').order('fecha', { ascending: true }));
}
export async function ponerFestivo(fecha, nombre, ambito) {
  return unwrap(await supabase.from('festivos')
    .upsert({ fecha, nombre: nombre || 'Festivo', ambito: ambito || 'local' }, { onConflict: 'fecha' })
    .select().single());
}
export async function quitarFestivo(fecha) {
  return unwrap(await supabase.from('festivos').delete().eq('fecha', fecha).select());
}

/* ---------------- avatares ---------------- */
// Bucket privado `avatares` (sql/etapa16). Una foto por persona, en su propia
// carpeta: las políticas de Storage solo dejan escribir en la carpeta propia
// (o a administración), así que nadie puede cambiarle la foto a otro.

export async function subirAvatar(empleadoId, dataURL) {
  const blob = blobDeDataURL(dataURL);
  const ruta = `${empleadoId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatares')
    .upload(ruta, blob, { contentType: blob.type, upsert: true });
  if (error) throw new Error(error.message);
  return ruta;
}

// Planilla firmada → bucket privado `documentos` + fila en la tabla `documentos`.
// La carpeta va por id del empleado: los permisos comprueban que es la suya.
// Volver a firmar el mismo periodo sustituye el PDF y lo deja otra vez
// pendiente de copiar fuera (exportado_en a null).
export async function guardarPlanillaFirmada({ empleadoId, periodo, carpeta, nombre, pdfBlob, creadoPor }) {
  const ruta = `planillas/${empleadoId}/${carpeta}/${nombre}`;
  const { error } = await supabase.storage.from('documentos')
    .upload(ruta, pdfBlob, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(error.message);
  const fila = {
    tipo: 'planilla', empleado_id: empleadoId, periodo, ruta, nombre,
    bytes: pdfBlob.size, creado_por: creadoPor || null,
    creado_en: new Date().toISOString(), exportado_en: null,
  };
  return unwrap(await supabase.from('documentos').upsert(fila, { onConflict: 'ruta' }).select().single());
}

/**
 * Sube a Google Drive el PDF de una planilla ya archivada (edge function
 * `planilla-drive`). Devuelve { ok, archivo, drive_id }.
 */
export async function subirPlanillaADrive(documentoId) {
  const { data, error } = await supabase.functions.invoke('planilla-drive', { body: { documento_id: documentoId } });
  if (error) {
    let msg = error.message || 'error';
    const nombre = error.name || '';
    if (nombre === 'SesionCaducada') { /* el mensaje ya es claro */ } else if (nombre === 'FunctionsFetchError' || nombre === 'FunctionsRelayError' || /failed to (send|fetch)/i.test(msg)) {
      msg = 'la función planilla-drive no está subida todavía';
    } else {
      // La función explica el motivo en su respuesta: se prefiere ese texto.
      try {
        const ctx = error.context;
        if (ctx && typeof ctx.clone === 'function') {
          const cuerpo = await ctx.clone().json();
          if (cuerpo && cuerpo.error) msg = cuerpo.error;
        }
      } catch (_) { /* no era JSON: nos quedamos con el mensaje suelto */ }
    }
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}

export async function urlsFirmadasAvatar(rutas, segundos = 3600) {
  if (!rutas || !rutas.length) return {};
  const { data, error } = await supabase.storage.from('avatares').createSignedUrls(rutas, segundos);
  if (error) throw new Error(error.message);
  const out = {};
  (data || []).forEach((x) => { if (x.signedUrl && !x.error) out[x.path] = x.signedUrl; });
  return out;
}

// Cada uno cambia SOLO el suyo, por función del servidor: si se abriera el
// update de `empleados`, se podría tocar también el rol.
export async function guardarMiAvatar(emoji, foto) {
  const { error } = await supabase.rpc('guardar_mi_avatar', { p_emoji: emoji || null, p_foto: foto || null });
  if (error) throw new Error(error.message);
  return true;
}

// Administración puede cambiar el de cualquiera (su política ya lo permite).
export async function guardarAvatarDe(empleadoId, emoji, foto) {
  return unwrap(await supabase.from('empleados')
    .update({ avatar_emoji: emoji || null, avatar_foto: foto || null })
    .eq('id', empleadoId).select().single());
}

export async function borrarAvatar(ruta) {
  if (!ruta) return true;
  await supabase.storage.from('avatares').remove([ruta]);
  return true;
}

/* ---------------- incidencias ---------------- */

export async function listarIncidencias() {
  // OJO: en `incidencias` la columna de fecha es `creada_en` (no `creado_en`).
  return unwrap(await supabase.from('incidencias').select('*').order('creada_en', { ascending: false }));
}

export async function crearIncidencia(inc) {
  return unwrap(await supabase.from('incidencias').insert(inc).select().single());
}

/* ---------------- imputaciones (capa de distribución/corrección de horas) ---------------- */
// Los fichajes NO se tocan aquí. La presencia sale de la vista v_presencia_diaria.

// Presencia (minutos) por empleado para una fecha (YYYY-MM-DD).
export async function presenciaDiaria(fecha) {
  return unwrap(await supabase
    .from('v_presencia_diaria')
    .select('empleado_id, minutos_presencia, fichajes_abiertos')
    .eq('fecha', fecha));
}

// Líneas de imputación. RLS acota: jefe/admin ven todas; el empleado, las suyas.
export async function listarImputaciones({ fecha, desde, empleadoId } = {}) {
  let q = supabase.from('imputaciones').select('*')
    .order('empleado_id', { ascending: true })
    .order('categoria', { ascending: true });
  if (fecha) q = q.eq('fecha', fecha);
  else if (desde) q = q.gte('fecha', desde);
  if (empleadoId) q = q.eq('empleado_id', empleadoId);
  return unwrap(await q);
}

// Propuesta automática desde los fichajes (solo jefe/admin; valida en el servidor).
export async function proponerImputaciones(empleadoId, fecha) {
  const { error } = await supabase.rpc('proponer_imputaciones', { p_empleado: empleadoId, p_fecha: fecha });
  if (error) throw new Error(error.message);
}

// Guarda líneas: las que traen `id` se actualizan; las que no, se insertan.
export async function guardarImputaciones(filas) {
  const res = [];
  const nuevas = (filas || []).filter((f) => !f.id).map(({ id, ...r }) => r);
  if (nuevas.length) {
    res.push(...unwrap(await supabase.from('imputaciones').insert(nuevas).select()));
  }
  for (const f of (filas || []).filter((x) => x.id)) {
    const { id, empleado_id, fecha, creado_por, creado_en, ...campos } = f; // inmutables fuera
    res.push(unwrap(await supabase.from('imputaciones').update(campos).eq('id', id).select().single()));
  }
  return res;
}

export async function borrarImputacion(id) {
  return unwrap(await supabase.from('imputaciones').delete().eq('id', id).select());
}

export default {
  listarEmpleados, crearEmpleado, actualizarEmpleado,
  listarObras, crearObra, actualizarObra, borrarObra,
  economiaObra, costesObra, anadirCosteObra, borrarCosteObra, enlazarPresupuesto, listarCostesEmpleados, guardarCosteEmpleado,
  listarPlanificacion, crearPlanificacion, actualizarPlanificacion, borrarPlanificacion, obrasSinPlanificar, partesFueraDePlan, revisarParteFueraDePlan,
  listarFases, actualizarFase, crearFase, borrarFase, guardarAvanceParte, avanceDeParte, generarFasesObra, listarPlantillasFases, guardarPlantillaFase,
  empleadosDeObra, listarAsignaciones, asignarEmpleadoAObra, quitarEmpleadoDeObra,
  fichajeAbierto, ficharEntrada, ficharSalida, corregirFichaje, crearFichajeManual, importarFichajes, borrarFichaje,
  fichajesDelDia, listarFichajes, escucharFichajes,
  listarPartes, crearParte, actualizarParte, guardarHorasParte, guardarMaterialesParte,
  listarHorasPartes, listarMaterialesPartes, borrarParte, enviarParteCorreo,
  subirAdjunto, listarAdjuntosPartes, urlsFirmadas, descargarAdjunto, borrarAdjunto,
  subirAvatar, urlsFirmadasAvatar, guardarMiAvatar, guardarAvatarDe, borrarAvatar,
  guardarPlanillaFirmada,
  subirPlanillaADrive,
  subirParteADrive,
  apuntarError, listarErrores, borrarErrores,
  periodosFirmados,
  listarAusencias, marcarAusencia, quitarAusencia,
  listarFestivos, ponerFestivo, quitarFestivo,
  listarIncidencias, crearIncidencia,
  presenciaDiaria, listarImputaciones, proponerImputaciones, guardarImputaciones, borrarImputacion,
};
