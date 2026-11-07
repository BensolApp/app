// BENSOL · Etapa 2
// Autenticación. Mantiene el login visual por PIN de 4 dígitos, pero por
// debajo usa Supabase Auth (email + contraseña internos, nunca visibles).
//
// - Los PIN NO se guardan en ningún sitio (ni base de datos ni localStorage).
// - El email/clave internos se derivan del empleado + PIN en el momento del login.
// - La sesión la gestiona Supabase (supabase-client.js, storageKey 'bensol_auth').
//
// Esta capa todavía NO está enchufada al flujo de index.html (eso es Etapa 3).
// Se expone en window.Bensol.auth para poder integrarla y probarla.

import { supabase } from './supabase-client.js';

// Mapa fijo de empleados conocidos -> cuenta interna de Supabase Auth.
// El nombre es el que ya se muestra en la pantalla de "¿Quién eres?".
// (Se han quitado los empleados de Sysefen; los de BENSOL se dan de alta desde la app.)
export const CUENTAS = {
  'Administración': { email: 'info@bensolic.es', rol: 'admin'   },
};

// Contraseña interna = PIN + 'bensol'  (p.ej. 1111 -> "1111bensol").
// Se calcula al vuelo; el PIN nunca se persiste.
function claveInterna(pin) {
  return String(pin).trim() + 'bensol';
}

export function cuentaPorNombre(nombre) {
  return CUENTAS[nombre] || null;
}

export function listaEmpleadosLogin() {
  return Object.keys(CUENTAS).map((nombre) => ({ nombre, ...CUENTAS[nombre] }));
}

// Login con el PIN visual. Devuelve { user, session } de Supabase.
// `emailFallback` permite entrar a empleados dados de alta desde la app
// (no incluidos en el mapa fijo CUENTAS): su email viene de public.empleados.
// Lanza Error con mensaje corto en español si algo falla.
export async function loginConPin(nombre, pin, emailFallback, captchaToken) {
  const cuenta = cuentaPorNombre(nombre);
  const email = cuenta ? cuenta.email : (emailFallback || '').trim().toLowerCase();
  if (!email) throw new Error('Empleado no reconocido.');
  if (!/^\d{4}$/.test(String(pin))) throw new Error('El PIN son 4 números.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: claveInterna(pin),
    // Comprobación antirrobots (Turnstile). Si en Supabase no está activada,
    // sobra y no molesta; si lo está y falta, el error se distingue abajo.
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      throw new Error('PIN incorrecto.');
    }
    if (/captcha/i.test(error.message)) {
      const e = new Error('No se pudo comprobar que no eres un robot. Prueba otra vez.');
      e.captcha = true;
      throw e;
    }
    throw new Error('No se pudo entrar: ' + error.message);
  }
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function sesionActual() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export async function usuarioActual() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

// Fila de la tabla `empleados` vinculada al usuario autenticado (por user_id).
// null si no hay sesión o el empleado aún no está vinculado.
export async function empleadoActual() {
  const user = await usuarioActual();
  if (!user) return null;
  const { data, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return null;
  return data;
}

// Cambia el PIN de QUIEN TIENE LA SESIÓN ABIERTA. El PIN de verdad es la
// contraseña de Supabase Auth, así que esto lo cambia realmente (la copia de
// `S.users` en el móvil no pinta nada en el login).
// Se pide el PIN actual a propósito: el móvil suele quedar desbloqueado.
//
// Cambiar el PIN de OTRA persona no se puede desde aquí: con la clave pública
// (anon) Supabase solo deja tocar la contraseña propia. Hace falta la clave
// service_role, que no debe vivir nunca en la app — sería una función de
// servidor (Edge Function) o hacerlo a mano en el panel de Supabase.
export async function cambiarPinPropio(pinActual, pinNuevo, captchaToken) {
  if (!/^\d{4}$/.test(String(pinNuevo).trim())) throw new Error('El PIN nuevo son 4 números.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error('No hay sesión abierta.');
  // Comprobar el PIN actual vuelve a pasar por el login, así que si hay
  // captcha activo también hace falta su token.
  const prueba = await supabase.auth.signInWithPassword({
    email: user.email, password: claveInterna(pinActual),
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (prueba.error) throw new Error('El PIN actual no es correcto.');
  const { error } = await supabase.auth.updateUser({ password: claveInterna(pinNuevo) });
  if (error) throw new Error(error.message);
  return true;
}

// --- Acciones de Administración sobre el acceso de OTRAS personas -----------
// Van contra la Edge Function `admin-usuarios`, que es quien tiene la clave
// service_role (dentro de Supabase, nunca en la app). Ver
// supabase/functions/admin-usuarios/index.ts y PUBLICAR.md.
//
// Si la función todavía no está desplegada, el error que sale lleva
// `noDesplegada = true` para que la app pueda enseñar los pasos manuales.
async function errorDeFuncion(error, porDefecto) {
  const ctx = error && error.context;
  const nombre = (error && error.name) || '';
  let msg = (error && error.message) || porDefecto;
  // Sin desplegar, supabase-js no llega ni a hablar con la función: devuelve
  // FunctionsFetchError (el subdominio de functions no responde) o un 404.
  let noDesplegada = nombre === 'FunctionsFetchError' || nombre === 'FunctionsRelayError'
    || /failed to fetch|networkerror|failed to send a request/i.test(msg);
  try {
    if (ctx && typeof ctx.status === 'number') {
      noDesplegada = ctx.status === 404;
      if (typeof ctx.clone === 'function') {
        const cuerpo = await ctx.clone().json();
        if (cuerpo && cuerpo.error) msg = cuerpo.error;
      }
    }
  } catch (_) { /* el cuerpo no era JSON: nos quedamos con el mensaje suelto */ }
  const e = new Error(noDesplegada ? 'La función de servidor no está desplegada todavía.' : msg);
  e.noDesplegada = noDesplegada;
  return e;
}

async function llamarAdmin(cuerpo) {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: cuerpo });
  if (error) throw await errorDeFuncion(error, 'No se pudo completar la operación.');
  if (data && data.error) throw new Error(data.error);
  return data;
}

// ¿El error de una RPC es "esa función no existe"? PostgREST lo devuelve como
// PGRST202 (no la encuentra en el esquema) o 42883 (no existe en Postgres).
const rpcAusente = (error) =>
  !!error && (error.code === 'PGRST202' || error.code === '42883'
    || /could not find the function|does not exist/i.test(error.message || ''));

// Administración cambia el PIN de otra persona (sin saber el anterior).
//
// Dos vías, se prueban en este orden:
//   1. La función SQL `admin_cambiar_pin` (sql/etapa10_pin_admin.sql). Es la
//      que basta pegar en el SQL Editor, así que es la que suele estar.
//   2. La Edge Function `admin-usuarios`, si está desplegada.
// Si no hay ninguna, el error sale con `noDesplegada` para que la app enseñe
// los pasos manuales en vez de dejar al usuario sin explicación.
export async function adminCambiarPin(empleadoId, pin) {
  const p = String(pin).trim();
  if (!/^\d{4}$/.test(p)) throw new Error('El PIN son 4 números.');

  const { data, error } = await supabase.rpc('admin_cambiar_pin', { p_empleado: empleadoId, p_pin: p });
  if (!error) return { ok: true, nombre: data };
  // Un error de permisos o de datos es una respuesta de verdad: se cuenta tal
  // cual. Solo si la función NO EXISTE se prueba la otra vía.
  if (!rpcAusente(error)) throw new Error(error.message);

  return llamarAdmin({ accion: 'cambiar_pin', empleado_id: empleadoId, pin: p });
}

// Administración crea el acceso (usuario de Auth) de un empleado ya dado de alta.
export async function adminCrearAcceso(empleadoId, email, pin) {
  if (!/^\d{4}$/.test(String(pin).trim())) throw new Error('El PIN son 4 números.');
  return llamarAdmin({ accion: 'crear_acceso', empleado_id: empleadoId, email, pin: String(pin).trim() });
}

/**
 * Le manda a esa persona su correo con el PIN, el enlace de la app y cómo
 * instalarla (supabase/functions/correo-bienvenida). `tipo` es 'bienvenida'
 * (acceso recién creado) o 'pin' (PIN cambiado).
 *
 * Va al correo personal de su ficha si lo tiene, y si no al de acceso.
 */
export async function enviarBienvenida(empleadoId, pin, tipo, correoA) {
  const p = String(pin).trim();
  if (!/^\d{4}$/.test(p)) throw new Error('El PIN son 4 números.');
  const cuerpo = { empleado_id: empleadoId, pin: p, tipo: tipo === 'pin' ? 'pin' : 'bienvenida' };
  if (correoA) cuerpo.correo_a = String(correoA).trim();
  const { data, error } = await supabase.functions.invoke('correo-bienvenida', { body: cuerpo });
  if (error) throw await errorDeFuncion(error, 'No se pudo enviar el correo.');
  if (data && data.error) throw new Error(data.error);
  return data;
}

// cb(session) cada vez que cambia la sesión (login/logout/refresh).
// Devuelve función para cancelar la suscripción.
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export default {
  CUENTAS,
  cuentaPorNombre,
  listaEmpleadosLogin,
  loginConPin,
  logout,
  sesionActual,
  usuarioActual,
  empleadoActual,
  cambiarPinPropio,
  adminCambiarPin,
  adminCrearAcceso,
  enviarBienvenida,
  onAuthChange,
};
