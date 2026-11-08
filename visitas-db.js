/* =============================================================================
 * BENSOL · Toma de datos · Acceso a Supabase
 *
 * Mismo estilo que supabase-db.js: funciones sueltas, sin clases, que
 * devuelven datos ya limpios o lanzan el error de Supabase tal cual.
 *
 * Regla de la casa: aquí NO se pinta nada y NO se toca V ni S.
 * ============================================================================= */

import { supabase } from './supabase-client.js';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/* ---------------------------------------------------------------------------
 * Clientes (caché de Teamleader)
 * ------------------------------------------------------------------------- */
export async function listarClientes() {
  return unwrap(
    await supabase.from('clientes_cache').select('*').order('nombre')
  ) || [];
}

export async function buscarClientes(texto) {
  const q = String(texto || '').trim();
  if (q.length < 2) return [];
  return unwrap(
    await supabase
      .from('clientes_cache')
      .select('*')
      .or(`nombre.ilike.%${q}%,nif.ilike.%${q}%,telefono.ilike.%${q}%`)
      .limit(20)
  ) || [];
}

/**
 * Alta rápida en la visita. Se crea SIN tl_id y con pendiente_alta, porque el
 * maestro es Teamleader: el cliente de verdad lo crea la cola al sincronizar,
 * después de buscar por NIF y teléfono para no duplicar.
 */
export async function crearClienteLocal(datos) {
  const fila = {
    nombre: datos.nombre,
    nif: datos.nif || null,
    telefono: datos.telefono || null,
    email: datos.email || null,
    direccion_fiscal: datos.direccion_fiscal || null,
    tl_tipo: datos.tl_tipo || 'contact',
    pendiente_alta: true,
  };
  return unwrap(
    await supabase.from('clientes_cache').insert(fila).select().single()
  );
}

/* ---------------------------------------------------------------------------
 * Visitas
 * ------------------------------------------------------------------------- */
const CAMPOS_VISITA = `
  id, codigo, cliente_id, tecnico_id, fecha_visita, hora_inicio, hora_fin,
  direccion, poblacion, cp, lat, lng, tipo_inmueble, superficie_m2,
  plantas, habitaciones, banos, anio_construccion, ocupantes,
  acceso, acceso_notas, necesita_grua, necesita_andamio,
  origen, plazo_deseado, interesa_financiacion, interesa_subvencion,
  estado, observaciones, tl_deal_id, tl_deal_fase,
  sync_estado, sync_error, sync_at, drive_id, drive_at, drive_carpeta_id,
  gracias_at,
  created_at, updated_at
`;

export async function listarVisitas() {
  return unwrap(
    await supabase
      .from('visitas')
      .select(`${CAMPOS_VISITA}, cliente:clientes_cache(id, nombre, telefono), fichas:visita_fichas(categoria, completada)`)
      .order('fecha_visita', { ascending: false })
      .order('created_at', { ascending: false })
  ) || [];
}

export async function verVisita(id) {
  const visita = unwrap(
    await supabase
      .from('visitas')
      .select(`${CAMPOS_VISITA}, cliente:clientes_cache(*)`)
      .eq('id', id)
      .single()
  );
  const fichas = unwrap(
    await supabase.from('visita_fichas').select('*').eq('visita_id', id)
  ) || [];
  const adjuntos = unwrap(
    await supabase.from('visita_adjuntos').select('*').eq('visita_id', id)
      .order('created_at')
  ) || [];
  return { visita, fichas, adjuntos };
}

/**
 * El id lo genera el cliente, no la base. Así la misma visita tiene el mismo
 * id se haya creado con cobertura o sin ella, y al subir no se duplica.
 */
export async function crearVisita(datos) {
  return unwrap(
    await supabase.from('visitas').insert(datos).select(CAMPOS_VISITA).single()
  );
}

/**
 * Guardar sin saber si la visita ya existe (primera vez o reintento).
 * No se usa upsert: el trigger del código gastaría un número en cada
 * guardado y lo pisaría.
 */
export async function guardarOCrearVisita(fila) {
  const { id, ...cambios } = fila;
  const upd = await supabase.from('visitas').update(cambios).eq('id', id)
    .select(CAMPOS_VISITA).maybeSingle();
  if (upd.error) throw upd.error;
  if (upd.data) return upd.data;
  try {
    return await crearVisita(fila);
  } catch (e) {
    // No se pudo cambiar (0 filas) y tampoco crear porque ya existe: la visita
    // es de otra persona y Supabase no deja tocarla. Antes salía un "duplicate
    // key" que no se entendía.
    if (e && (e.code === '23505' || /duplicate key/i.test(e.message || ''))) {
      throw new Error('Esta visita la empezó otra persona y todavía no tienes permiso para cambiarla. Hay que ejecutar sql/etapa37_visitas_equipo.sql en Supabase.');
    }
    throw e;
  }
}

export async function guardarVisita(id, cambios) {
  return unwrap(
    await supabase.from('visitas').update(cambios).eq('id', id)
      .select(CAMPOS_VISITA).single()
  );
}

export async function borrarVisita(id, forzar) {
  // Por defecto solo borradores: una visita cerrada es trabajo hecho. `forzar`
  // es para cuando se borra el cliente entero, que se lo lleva todo por delante.
  let q = supabase.from('visitas').delete().eq('id', id);
  if (!forzar) q = q.eq('estado', 'borrador');
  return unwrap(await q);
}

/** Las fotos de una visita, para poder quitarlas del almacén al borrarla. */
export async function rutasFotos(visitaId) {
  const filas = unwrap(
    await supabase.from('visita_adjuntos').select('storage_path').eq('visita_id', visitaId)
  ) || [];
  return filas.map((f) => f.storage_path).filter(Boolean);
}

/* ---------------------------------------------------------------------------
 * Fichas por categoría
 * ------------------------------------------------------------------------- */
export async function guardarFicha(visitaId, categoria, datos, schemaVersion, completada = false) {
  const fila = {
    visita_id: visitaId,
    categoria,
    datos,
    schema_version: schemaVersion,
    completada,
  };
  return unwrap(
    await supabase
      .from('visita_fichas')
      .upsert(fila, { onConflict: 'visita_id,categoria' })
      .select()
      .single()
  );
}

export async function quitarFicha(visitaId, categoria) {
  return unwrap(
    await supabase.from('visita_fichas').delete()
      .eq('visita_id', visitaId).eq('categoria', categoria)
  );
}

/* ---------------------------------------------------------------------------
 * Fotos y adjuntos (bucket privado 'visitas')
 * ------------------------------------------------------------------------- */
function blobDeDataURL(dataURL) {
  const [cab, b64] = String(dataURL).split(',');
  const mime = (cab.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/** Encoge la foto antes de subirla: lado largo 1600 px y JPEG 0.7. */
export function encogerFoto(dataURL, ladoMax = 1600, calidad = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => resolve(dataURL);
    img.src = dataURL;
  });
}

export async function subirFoto(visitaId, { dataURL, categoria, campoRef, descripcion, tipo }) {
  const chica = await encogerFoto(dataURL);
  const blob = blobDeDataURL(chica);
  const nombre = `${crypto.randomUUID()}.jpg`;
  const ruta = `visitas/${visitaId}/${categoria || 'general'}/${nombre}`;

  const sub = await supabase.storage.from('visitas')
    .upload(ruta, blob, { contentType: 'image/jpeg', upsert: false });
  if (sub.error) throw sub.error;

  return unwrap(
    await supabase.from('visita_adjuntos').insert({
      visita_id: visitaId,
      tipo: tipo || 'foto',
      storage_path: ruta,
      campo_ref: campoRef || null,
      descripcion: descripcion || null,
    }).select().single()
  );
}

export async function urlsFotos(rutas, segundos = 3600) {
  if (!rutas || !rutas.length) return {};
  const { data, error } = await supabase.storage.from('visitas')
    .createSignedUrls(rutas, segundos);
  if (error) throw error;
  const mapa = {};
  (data || []).forEach((d) => { if (d.signedUrl) mapa[d.path] = d.signedUrl; });
  return mapa;
}

export async function borrarFoto(id, ruta) {
  await supabase.storage.from('visitas').remove([ruta]);
  return unwrap(await supabase.from('visita_adjuntos').delete().eq('id', id));
}

/* ---------------------------------------------------------------------------
 * Google Drive (sql/etapa29)
 *
 * Igual que con las planillas y los partes: la app no habla con Google, se lo
 * pide a su backend. Las credenciales viven solo en la edge function.
 * ------------------------------------------------------------------------- */

/** Saca el error de dentro de la respuesta de la función, que si no llega como "non-2xx". */
async function invocar(nombre, cuerpo) {
  const { data, error } = await supabase.functions.invoke(nombre, { body: cuerpo });
  if (error) {
    let msg = error.message || 'error';
    const clase = error.name || '';
    if (clase === 'SesionCaducada') { /* el mensaje ya es claro */ } else if (clase === 'FunctionsFetchError' || clase === 'FunctionsRelayError' || /failed to (send|fetch)/i.test(msg)) {
      // El navegador no llegó a la función: o no está subida, o está subida
      // una versión sin CORS, o no hay red. No se puede distinguir desde aquí.
      msg = 'no se pudo llamar a la función ' + nombre + ' (no está subida, o está subida una versión antigua)';
    } else {
      try {
        const ctx = error.context;
        if (ctx && typeof ctx.clone === 'function') {
          const c = await ctx.clone().json();
          if (c && c.error) msg = c.error;
        }
      } catch (_) { /* no era JSON */ }
    }
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}

/** Le crea (o le repasa) su carpeta en Drive y su fila en la hoja de clientes. */
export async function clienteADrive(clienteId) {
  return invocar('cliente-drive', { cliente_id: clienteId });
}

/**
 * Apunta en la hoja a todos los clientes que aún no estén: los que entran por
 * la web y los traídos del CRM. Devuelve { apuntados, fallos }.
 */
export async function clientesPendientesADrive() {
  return invocar('cliente-drive', { pendientes: true });
}

/** Sube el PDF de la visita y sus fotos a la carpeta del cliente. */
export async function subirVisitaADrive(visitaId, pdfBlob) {
  const buf = new Uint8Array(await pdfBlob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return invocar('visita-drive', { visita_id: visitaId, pdf_base64: btoa(bin) });
}

/* ---------------------------------------------------------------------------
 * Envío a Teamleader
 * ------------------------------------------------------------------------- */
/**
 * La app NO habla con Teamleader. Solo pide a su propio backend que lo haga.
 * Los tokens del CRM viven en la edge function, nunca en el navegador.
 *
 * `texto` es la ficha en texto plano, que la monta la app: las preguntas y su
 * orden están en visitas-schemas.js y no tiene sentido duplicarlos en el
 * servidor para que se queden viejos.
 */
export async function enviarATeamleader(visitaId, texto) {
  return invocar('teamleader-visita', { visita_id: visitaId, texto: texto || '' });
}

export async function estadoSync(visitaId) {
  return unwrap(
    await supabase.from('sync_cola')
      .select('id, operacion, estado, intentos, ultimo_error, proximo_intento')
      .eq('visita_id', visitaId)
      .order('id')
  ) || [];
}

export async function pendientesDeEnviar() {
  return unwrap(
    await supabase.from('visitas')
      .select('id, codigo, direccion, poblacion, sync_estado, sync_error')
      .in('sync_estado', ['pendiente', 'error'])
      .eq('estado', 'completada')
  ) || [];
}

/* ---------------------------------------------------------------------------
 * Agenda: clientes y citas (sql/etapa23_agenda_citas.sql)
 * Crear y cambiar citas: solo presupuestos (RLS). Ver: también jefe y admin.
 * ------------------------------------------------------------------------- */
const CAMPOS_CITA = `
  id, cliente_id, inicio, duracion_min, empleado_id, categorias, direccion,
  poblacion, nota, estado, visita_id, aviso_enviado_at, cambio_desde, confirmacion_enviada_at, anulacion_enviada_at, created_at, updated_at
`;

/** Citas sin fecha y las de los últimos `diasAtras` días en adelante. */
export async function listarCitas(diasAtras = 120) {
  const desde = new Date(Date.now() - diasAtras * 86400000).toISOString();
  return unwrap(
    await supabase
      .from('citas')
      .select(`${CAMPOS_CITA}, cliente:clientes_cache(id, nombre, telefono, email, tipo, tl_id, tl_tipo, direccion, poblacion)`)
      .or(`inicio.is.null,inicio.gte."${desde}"`)
      .order('inicio', { ascending: true, nullsFirst: false })
  ) || [];
}

/** Clientes con lo justo de sus citas y visitas para saber en qué punto están. */
export async function listarClientesAgenda() {
  return unwrap(
    await supabase
      .from('clientes_cache')
      .select('*, citas(id, inicio, estado), visitas(id, codigo, estado, sync_estado, fecha_visita, presupuestos(id, categoria, estado, respuesta_cliente, tl_quotation_id, total_venta, created_at, enviado_cliente_at, revisado_at, obra_id)), presupuestos(id, categoria, estado, respuesta_cliente, tl_quotation_id, total_venta, created_at, enviado_cliente_at, revisado_at, obra_id)')
      .order('nombre')
  ) || [];
}

/** Las visitas de un cliente, pedidas aparte: no dependen del «embed» de la agenda. */
export async function visitasDeCliente(clienteId) {
  return unwrap(
    await supabase.from('visitas')
      .select('id, codigo, estado, sync_estado, fecha_visita, direccion, poblacion, sync_at')
      .eq('cliente_id', clienteId)
      .order('fecha_visita', { ascending: false })
  ) || [];
}

export async function guardarCliente(cliente) {
  const { id, ...campos } = cliente;
  if (id) {
    return unwrap(
      await supabase.from('clientes_cache')
        .update({ ...campos, actualizado_at: new Date().toISOString() })
        .eq('id', id).select().single()
    );
  }
  // Nace en la app, sin tl_id: queda pendiente de dar de alta en Teamleader.
  return unwrap(
    await supabase.from('clientes_cache').insert({ ...campos, pendiente_alta: true }).select().single()
  );
}

/* ---------------------------------------------------------------------------
 * Teamleader (sql/etapa31)
 *
 * La app no habla nunca con el CRM: se lo pide a su backend, que es quien
 * guarda el permiso. Aquí no hay ni client_id ni tokens.
 * ------------------------------------------------------------------------- */

/** Crea el cliente en el CRM (contacto o empresa) y guarda su id. */
export async function clienteATeamleader(clienteId) {
  return invocar('teamleader-cliente', { cliente_id: clienteId });
}

/**
 * Le da las gracias al cliente por la visita y le dice que en unos días tendrá
 * su presupuesto (sql/etapa34). No lleva ninguno de los datos que se tomaron.
 */
export async function correoGraciasVisita(visitaId, otraVez) {
  return invocar('correo-visita', { visita_id: visitaId, otra_vez: !!otraVez });
}

/* ---------------------------------------------------------------------------
 * Motor de presupuestos (sql/etapa38 y 41)
 *
 * La app no calcula nada: le pasa la visita a la función `presupuestar` y
 * recibe las líneas ya con su precio. Las reglas y la tarifa viven en Supabase,
 * así que cambiar un precio no es tocar la app.
 * ------------------------------------------------------------------------- */

/** Calcula el presupuesto de una visita. Con `guardar: false` no escribe nada. */
export async function presupuestarVisita(visitaId, categoria, opciones) {
  const o = opciones || {};
  return invocar('presupuestar', {
    visita_id: visitaId,
    categoria,
    guardar: o.guardar === true,
    dto_global_pct: o.dtoGlobalPct == null ? undefined : o.dtoGlobalPct,
    lineas_extra: o.lineasExtra && o.lineasExtra.length ? o.lineasExtra : undefined,
    lineas_quitar: o.lineasQuitar && o.lineasQuitar.length ? o.lineasQuitar : undefined,
    lineas_ajustar: o.lineasAjustar && o.lineasAjustar.length ? o.lineasAjustar : undefined,
    // Otra opción del mismo presupuesto (otra marca de inversor): los datos de
    // la ficha con el cambio encima, sin tocar la ficha. Y un título que la
    // distinga en la lista y en Teamleader.
    datos: o.datos || undefined,
    ficha_id: o.fichaId || undefined,
    titulo: o.titulo || undefined,
    titulo_sufijo: o.tituloSufijo || undefined,   // presupuesto conjunto: «+ Aerotermia»
  });
}

/**
 * Calcula un presupuesto SIN visita: se le pasan los datos a mano. Es lo normal
 * cuando se presupuesta por teléfono o para un cliente de siempre.
 */
export async function presupuestarSuelto(categoria, datos, opciones) {
  const o = opciones || {};
  return invocar('presupuestar', {
    categoria,
    datos,
    cliente_id: o.clienteId || undefined,
    titulo: o.titulo || undefined,
    guardar: o.guardar === true,
    dto_global_pct: o.dtoGlobalPct == null ? undefined : o.dtoGlobalPct,
    lineas_extra: o.lineasExtra && o.lineasExtra.length ? o.lineasExtra : undefined,
    lineas_quitar: o.lineasQuitar && o.lineasQuitar.length ? o.lineasQuitar : undefined,
    lineas_ajustar: o.lineasAjustar && o.lineasAjustar.length ? o.lineasAjustar : undefined,
    // Libre (6-11-2026): sin motor, se monta de cero con las líneas extra.
    libre: o.libre === true ? true : undefined,
  });
}
/** Un producto nuevo en el catálogo propio (27-10-2026), para usarlo ahora y en el futuro. */
export async function crearProductoCatalogo(datos) {
  return invocar('presupuestar', Object.assign({ accion: 'crear_producto' }, datos));
}

/**
 * Un presupuesto hecho DIRECTAMENTE en Teamleader (sin pasar por el motor), para
 * que la app lo conozca y el cliente pase a «presupuestado» y se pueda seguir
 * (revisado, enviado, aceptado). Sin líneas; motor_version = 'teamleader'.
 */
export async function crearPresupuestoExterno(fila) {
  return unwrap(await supabase.from('presupuestos').insert(fila).select().single());
}

/* --- documentos del cliente (sql/etapa90): la factura de la luz y lo que haga falta --- */
const BUCKET_CLI = 'cliente-docs';
export async function listarDocumentosCliente(clienteId) {
  return unwrap(await supabase.from('cliente_documentos').select('*').eq('cliente_id', clienteId).order('creado_en', { ascending: false })) || [];
}
export async function subirDocumentoCliente(clienteId, doc) {
  const blob = blobDeDataURL(doc.data);
  const ext = doc.esImagen ? 'jpg' : (String(doc.nombre || '').split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'pdf';
  const ruta = `${clienteId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const subida = await supabase.storage.from(BUCKET_CLI).upload(ruta, blob, { contentType: blob.type, upsert: false });
  if (subida.error) throw new Error(subida.error.message);
  const { data, error } = await supabase.from('cliente_documentos').insert({
    cliente_id: clienteId, tipo: doc.tipo || 'factura', nota: doc.nota || null, ruta, nombre: doc.nombre || null,
    mime: blob.type, bytes: blob.size, es_imagen: !!doc.esImagen,
  }).select().single();
  if (error) { await supabase.storage.from(BUCKET_CLI).remove([ruta]); throw new Error(error.message); }
  return data;
}
export async function urlsDocumentosCliente(rutas, segundos = 3600) {
  if (!rutas || !rutas.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET_CLI).createSignedUrls(rutas, segundos);
  if (error) throw new Error(error.message);
  const out = {};
  (data || []).forEach((x) => { if (x.signedUrl && !x.error) out[x.path] = x.signedUrl; });
  return out;
}
export async function borrarDocumentoCliente(id, ruta) {
  const { error } = await supabase.from('cliente_documentos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET_CLI).remove([ruta]);
  return true;
}

/** Lo que ha pasado en Teamleader (fases, aceptadas, rechazadas, ofertas hechas allí) vuelve a la app. */
export async function sincronizarTeamleader(clienteId = null) {
  return invocar('teamleader-presupuesto', clienteId ? { accion: 'sincronizar', cliente_id: clienteId } : { accion: 'sincronizar' });
}

/** Todos los presupuestos guardados, los de visita y los sueltos. */
export async function listarPresupuestos(limite = 100) {
  return unwrap(
    await supabase.from('presupuestos')
      .select('*, cliente:clientes_cache(id, nombre), visita:visitas(id, codigo)')
      .order('created_at', { ascending: false })
      .limit(limite)
  ) || [];
}

/**
 * Borrar un presupuesto (pruebas, duplicados). Las líneas y las incidencias
 * se van con él (on delete cascade). Si estaba subido a Teamleader, la oferta
 * de allí NO se toca: hay que quitarla a mano en el CRM.
 */
export async function borrarPresupuesto(id) {
  const { data, error } = await supabase.from('presupuestos').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data || !data.length) throw new Error('No se ha borrado: puede que no tengas permiso o que ya no exista.');
  return true;
}

/* ---------------- bitácora del cliente (sql/etapa71) ---------------- */
export async function listarBitacora(clienteId) {
  return unwrap(await supabase.from('cliente_bitacora').select('*').eq('cliente_id', clienteId).order('at', { ascending: false }).limit(200)) || [];
}
/** Lo último apuntado de todos los clientes (para el tablero): hasta 600 anotaciones. */
export async function listarBitacoraReciente() {
  return unwrap(await supabase.from('cliente_bitacora').select('*').order('at', { ascending: false }).limit(600)) || [];
}
export async function anotarBitacora(fila) {
  return unwrap(await supabase.from('cliente_bitacora').insert(fila).select().single());
}
export async function borrarBitacora(id) {
  return unwrap(await supabase.from('cliente_bitacora').delete().eq('id', id).select('id'));
}

/**
 * El seguimiento del presupuesto (sql/etapa64): enviado al cliente, respuesta,
 * obra enlazada. `cambios` lleva solo lo que cambia.
 */
export async function seguimientoPresupuesto(id, cambios) {
  return unwrap(await supabase.from('presupuestos').update(cambios).eq('id', id).select().single());
}

/** Cambia la categoría (solar, aerotermia…) de un presupuesto guardado; si está
 * en Teamleader, la función mueve la oportunidad al embudo de la nueva. */
export async function cambiarCategoriaPresupuesto(id, categoria) {
  return invocar('teamleader-presupuesto', { accion: 'categoria', presupuesto_id: id, categoria });
}

/** Un presupuesto guardado, con sus líneas y sus incidencias. */
export async function verPresupuesto(id) {
  return unwrap(
    await supabase.from('presupuestos')
      .select('*, cliente:clientes_cache(id, nombre), visita:visitas(id, codigo), lineas:presupuesto_lineas(*), incidencias:presupuesto_incidencias(*)')
      .eq('id', id).single()
  );
}

/** Los presupuestos ya guardados de una visita, con sus líneas. */
export async function presupuestosDeVisita(visitaId) {
  return unwrap(
    await supabase.from('presupuestos')
      .select('*, lineas:presupuesto_lineas(*), incidencias:presupuesto_incidencias(*)')
      .eq('visita_id', visitaId)
      .order('created_at', { ascending: false })
  ) || [];
}

/* --- tocar un presupuesto ya guardado --------------------------------------
 * El motor propone y la persona decide, también después de guardarlo: se
 * cambian cantidades, precios y conceptos, se quitan líneas y se añaden otras.
 * Los totales NO se suman aquí: se le piden al servidor (`recalcular`), que es
 * donde vive la aritmética de céntimos, para que no haya dos cuentas distintas.
 * ------------------------------------------------------------------------- */

/**
 * Copia de un presupuesto para OTRO cliente (28-10-2026): nace como un
 * presupuesto nuevo (sin visita, sin oferta en Teamleader, sin revisar ni
 * enviar), con las mismas líneas e incidencias. El original no se toca.
 */
export async function duplicarPresupuesto(id, { cliente_id, titulo }) {
  const d = await verPresupuesto(id);
  const copia = (o, campos) => { const r = {}; campos.forEach((k) => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
  const fila = Object.assign(copia(d, ['categoria', 'conjunto_reglas_id', 'tarifa_id', 'motor_version', 'modelo_id', 'estimativo_min', 'estimativo_max', 'ratio_aplicado',
    'total_bruto', 'total_dto_linea', 'dto_global_pct', 'total_coste', 'total_venta', 'confianza', 'validez_dias']),
    { cliente_id, titulo: titulo || d.titulo || null, visita_id: null, ficha_id: null, estado: 'generado', sync_estado: 'pendiente' });
  const nuevo = unwrap(await supabase.from('presupuestos').insert(fila).select().single());
  const lineas = (d.lineas || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0)).map((l) => Object.assign(
    copia(l, ['orden', 'seccion', 'producto_ref', 'descripcion', 'detalle_tecnico', 'especificaciones', 'cantidad', 'unidad', 'precio_tarifa', 'dto_linea_pct', 'precio_coste', 'precio_venta', 'iva', 'origen', 'origen_regla_id', 'origen_inputs', 'confirmada']),
    { presupuesto_id: nuevo.id }));
  if (lineas.length) unwrap(await supabase.from('presupuesto_lineas').insert(lineas));
  const inc = (d.incidencias || []).map((i) => Object.assign(copia(i, ['nivel', 'codigo', 'campo', 'mensaje']), { presupuesto_id: nuevo.id }));
  if (inc.length) { try { unwrap(await supabase.from('presupuesto_incidencias').insert(inc)); } catch (_) { /* sin incidencias se sigue igual */ } }
  return nuevo;
}

export async function guardarLineaPresupuesto(id, cambios) {
  return unwrap(await supabase.from('presupuesto_lineas').update(cambios).eq('id', id).select().single());
}

export async function anadirLineaPresupuesto(fila) {
  return unwrap(await supabase.from('presupuesto_lineas').insert(fila).select().single());
}

export async function borrarLineaPresupuesto(id) {
  return unwrap(await supabase.from('presupuesto_lineas').delete().eq('id', id));
}

export async function recalcularPresupuesto(presupuestoId, dtoGlobalPct, lineasNuevas) {
  return invocar('presupuestar', {
    presupuesto_id: presupuestoId, recalcular: true,
    dto_global_pct: dtoGlobalPct == null ? undefined : dtoGlobalPct,
    // Líneas nuevas al modificar (6-11-2026): el servidor las pone con el
    // recargo del catálogo y las suma con las demás.
    lineas_nuevas: lineasNuevas && lineasNuevas.length ? lineasNuevas : undefined,
  });
}

/* --- el presupuesto al cliente por correo y su firma (sql/etapa93, 27-10-2026) --- */
/** Traduce textos del presupuesto (líneas del catálogo) al idioma: {textos:{original: traducción}}. */
export async function traducir(idioma, textos) {
  return invocar('traducir', { idioma, textos });
}
export async function enviarPresupuestoCliente(datos) {
  return invocar('presupuesto-cliente', Object.assign({ accion: 'enviar' }, datos));
}
/** Sube el PDF de un presupuesto hecho fuera de la app y lo apunta en el presupuesto. Devuelve la ruta. */
export async function subirPdfPresupuesto(presupuestoId, dataURL) {
  const ruta = `${presupuestoId}/subido-${Date.now()}.pdf`;
  const { error } = await supabase.storage.from('presupuestos-cliente').upload(ruta, blobDeDataURL(dataURL), { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(error.message);
  unwrap(await supabase.from('presupuestos').update({ pdf_subido_ruta: ruta }).eq('id', presupuestoId));
  return ruta;
}
export async function urlArchivoPresupuesto(ruta, segundos = 3600) {
  const { data, error } = await supabase.storage.from('presupuestos-cliente').createSignedUrl(ruta, segundos);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** La oferta pasa a aceptada en Teamleader (cuando el cliente acepta en la app). */
export async function aceptarEnTeamleader(presupuestoId) {
  return invocar('teamleader-presupuesto', { accion: 'aceptar', presupuesto_id: presupuestoId });
}

/** Vuelca en la oferta de Teamleader las líneas tal como están en la app (tras editarlas aquí). */
export async function actualizarPresupuestoEnTeamleader(presupuestoId) {
  return invocar('teamleader-presupuesto', { presupuesto_id: presupuestoId, actualizar: true });
}

/** Sube el presupuesto a Teamleader: crea la oferta, no la manda al cliente. */
export async function presupuestoATeamleader(presupuestoId, soloVer, pdf) {
  return invocar('teamleader-presupuesto', {
    presupuesto_id: presupuestoId,
    solo_ver: soloVer === true ? true : undefined,
    // El PDF de la app, para dejarlo en los archivos de la oportunidad.
    pdf_base64: pdf && pdf.base64 ? pdf.base64 : undefined,
    pdf_nombre: pdf && pdf.nombre ? pdf.nombre : undefined,
  });
}

/**
 * Cuando alguien cambia una línea que propuso una regla, se apunta qué se
 * propuso y qué se eligió (sql/etapa38). Con cincuenta de estas se sabe qué
 * reglas están mal calibradas; es lo único que hace que el motor mejore.
 */
export async function apuntarCorreccion(fila) {
  return unwrap(await supabase.from('motor_correcciones').insert(fila).select().single());
}

/** Busca en el catálogo para añadir la máquina a mano. */
export async function buscarProductos(texto, familia) {
  const q = String(texto || '').trim();
  if (q.length < 2) return [];
  // Cada palabra tiene que estar en el nombre, en cualquier orden («arotherm 8»
  // encuentra «aroTHERM plus 8 básico…»). Antes se buscaba la frase entera y,
  // además, el texto en la referencia: «8» casaba con casi todos los códigos y
  // los 25 primeros por nombre tapaban lo que se buscaba (26-10-2026).
  const COLS = 'referencia, nombre, familia, unidad, precio_tarifa, detalle_tecnico, especificaciones, iva';
  const palabras = q.split(/\s+/).filter(Boolean);
  let porNombre = supabase.from('productos').select(COLS).eq('activo', true);
  palabras.forEach((w) => { porNombre = porNombre.ilike('nombre', '%' + w.replace(/[%_,]/g, '') + '%'); });
  if (familia) porNombre = porNombre.eq('familia', familia);
  const lista = unwrap(await porNombre.order('nombre').limit(60)) || [];
  // Y por referencia, solo si lo escrito parece un código (sin espacios).
  if (palabras.length === 1 && /^[\w.-]{3,}$/.test(q)) {
    let porRef = supabase.from('productos').select(COLS).eq('activo', true).ilike('referencia', '%' + q + '%');
    if (familia) porRef = porRef.eq('familia', familia);
    (unwrap(await porRef.limit(20)) || []).forEach((x) => { if (!lista.some((y) => y.referencia === x.referencia)) lista.push(x); });
  }
  return lista.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es', { sensitivity: 'base' }));
}

/* --- legalizaciones fotovoltaicas (sql/etapa55) ------------------------------- */
const CAMPOS_LEG = 'id, obra_id, cliente_id, autor_id, estado, datos, drive_carpeta_id, drive_cert_id, drive_datos_id, enviada_a, enviada_at, created_at, updated_at';
export async function listarLegalizaciones() {
  return unwrap(await supabase.from('legalizaciones').select(CAMPOS_LEG + ', obra:obras(id, nombre, cliente, direccion)').order('updated_at', { ascending: false }).limit(200)) || [];
}
export async function guardarLegalizacion(fila) {
  const { id, ...campos } = fila;
  if (id) return unwrap(await supabase.from('legalizaciones').update(campos).eq('id', id).select(CAMPOS_LEG).single());
  return unwrap(await supabase.from('legalizaciones').insert(campos).select(CAMPOS_LEG).single());
}
export async function borrarLegalizacion(id) {
  const { error } = await supabase.from('legalizaciones').delete().eq('id', id).eq('estado', 'borrador');
  if (error) throw error;
  return true;
}
/** Los dos PDF a Drive y al correo de legalizaciones. */
export async function enviarLegalizacion(id, certBase64, datosBase64) {
  return invocar('legalizacion-enviar', { legalizacion_id: id, cert_base64: certBase64, datos_base64: datosBase64 });
}
/** Los datos fijos de la empresa (sql/etapa50 y 55): una fila. */
export async function obtenerEmpresa() {
  return unwrap(await supabase.from('empresa').select('*').eq('id', 1).maybeSingle());
}
export async function guardarEmpresa(cambios) {
  return unwrap(await supabase.from('empresa').update(cambios).eq('id', 1).select().single());
}

/** Busca en el CRM por nombre, email, teléfono o NIF. */
export async function buscarEnCRM(texto) {
  return invocar('teamleader-cliente', { accion: 'buscar', texto });
}

/** Se trae a la app un cliente que ya estaba en el CRM. */
export async function importarDelCRM(tlId, tipo) {
  return invocar('teamleader-cliente', { accion: 'importar', tl_id: tlId, tipo });
}

/** Mira si han entrado clientes nuevos por la web (sql/etapa32). */
export async function buscarLeadsWeb(dias) {
  return invocar('teamleader-leads', dias ? { dias } : {});
}

/** ¿Está conectado el CRM? Devuelve { conectado, expira_at }. */
export async function teamleaderEstado() {
  return invocar('teamleader-oauth', { accion: 'estado' });
}

/** Copias de seguridad a Drive (solo Administración). accion: estado · iniciar · continuar. */
export async function copiaSeguridad(accion) {
  return invocar('copia-seguridad', { accion: accion || 'estado' });
}

/** Lista de compra de la obra (sql/etapa96, V30.8). cuerpo: { accion: 'ver' | 'regenerar' | 'destinatarios', presupuesto_id | obra_id | correos }.
 *  'ver' devuelve { url } del PDF (la última versión, o una nueva si los presupuestos cambiaron; simulación si el presupuesto no está aceptado). */
export async function listaCompra(cuerpo) {
  return invocar('lista-compra', cuerpo || { accion: 'ver' });
}

/** Devuelve la dirección a la que hay que ir para autorizar la integración. */
export async function teamleaderIniciar() {
  return invocar('teamleader-oauth', { accion: 'iniciar' });
}

/** Borra el permiso guardado. Solo Administración. */
export async function teamleaderDesconectar() {
  return invocar('teamleader-oauth', { accion: 'desconectar' });
}

/**
 * Avisa por correo de UNA cita: nueva, cambiada o anulada (sql/etapa30).
 * La función decide sola qué toca contar y a quién, y marca la cita para no
 * repetirlo. Va con la sesión de quien usa la app; la clave del cron no sale
 * nunca del servidor.
 */
/** Aviso de vencimiento al cliente, a mano desde el presupuesto (6-11-2026). */
export async function avisarVencimientoPresupuesto(id) {
  return invocar('recordatorio-citas', { vencimiento_presupuesto_id: id });
}
export async function avisarCita(citaId, otraVez) {
  return invocar('recordatorio-citas', { cita_id: citaId, otra_vez: otraVez === true ? true : undefined });
}

/** Borra una cita. Si tenía visita hecha, la visita se queda (sin cita). */
export async function borrarCita(id) {
  const { error } = await supabase.from('citas').delete().eq('id', id);
  if (error) throw error;
  return true;
}

/** Borra una visita con sus fotos. Las fichas y los adjuntos van en cascada. */
export async function borrarVisitaConFotos(id) {
  const rutas = await rutasFotos(id);
  if (rutas.length) {
    try { await supabase.storage.from('visitas').remove(rutas); } catch (_) { /* huérfana */ }
  }
  await borrarVisita(id, true);
  const queda = unwrap(await supabase.from('visitas').select('id').eq('id', id)) || [];
  if (queda.length) {
    throw new Error('No se ha podido borrar: esa visita la hizo otra persona. Pídeselo a Administración.');
  }
  return true;
}

/** Lo que cuelga de un cliente AHORA MISMO, preguntado a la base. */
export async function loQueCuelgaDe(id) {
  const visitas = unwrap(await supabase.from('visitas').select('id, codigo, estado').eq('cliente_id', id)) || [];
  const citas = unwrap(await supabase.from('citas').select('id').eq('cliente_id', id)) || [];
  return { visitas: visitas.length, citas: citas.length, listaVisitas: visitas };
}

/**
 * Borra un cliente con todo lo suyo: sus visitas (con fichas y fotos) y sus
 * citas, que sí van en cascada.
 *
 * Las visitas hay que quitarlas a mano y ANTES: la base no las borra en cascada
 * a propósito, para que nadie se lleve por delante el trabajo de una visita sin
 * enterarse. Se preguntan a la base en este momento, no se fía de lo que
 * tuviera la pantalla cargado, que puede ser de hace rato.
 */
export async function borrarCliente(id) {
  const visitas = unwrap(await supabase.from('visitas').select('id').eq('cliente_id', id)) || [];
  for (const v of visitas) {
    const rutas = await rutasFotos(v.id);
    if (rutas.length) {
      // Si alguna foto no se deja borrar, se sigue: peor es dejar el cliente a
      // medio borrar que dejarse una foto suelta en el almacén.
      try { await supabase.storage.from('visitas').remove(rutas); } catch (_) { /* huérfana */ }
    }
    await borrarVisita(v.id, true);
  }

  // Comprobación: si alguna visita no se dejó borrar (por permisos), el borrado
  // del cliente fallaría con un error de la base que no dice nada. Mejor
  // contarlo aquí, que aquí se sabe por qué.
  const quedan = unwrap(await supabase.from('visitas').select('id').eq('cliente_id', id)) || [];
  if (quedan.length) {
    throw new Error('No se han podido borrar ' +
      (quedan.length === 1 ? 'una visita suya' : quedan.length + ' visitas suyas') +
      '. Suele ser porque las hizo otra persona: pídeselo a Administración.');
  }

  const { error } = await supabase.from('clientes_cache').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function guardarCita(cita) {
  const { id, ...campos } = cita;
  if (id) {
    return unwrap(await supabase.from('citas').update(campos).eq('id', id).select(CAMPOS_CITA).single());
  }
  return unwrap(await supabase.from('citas').insert(campos).select(CAMPOS_CITA).single());
}
