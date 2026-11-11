// BENSOL · Etapa 2
// Cliente único de Supabase. Antes esto estaba inline en index.html.
// Todos los módulos (supabase-auth.js, supabase-db.js) y la app importan
// SIEMPRE este mismo cliente para compartir la sesión de Supabase Auth.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';

export const SUPABASE_URL = 'https://qmlweijcckzdtnebhbdj.supabase.co';

// Clave pública (publishable / anon). Es segura en el cliente: la seguridad
// real la imponen RLS + las políticas del archivo sql/etapa2_seguridad.sql.
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LoCzoNG9O6QltrHGXY7s7Q_ud8t_P9N';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'bensol_auth',
  },
});

// Las Edge Functions comprueban la sesión con el servidor de Auth, que es más
// estricto que la base: un token caducado o de una sesión cerrada en otro
// sitio pasa en la base (RLS mira firma y fecha) pero ahí da «Sesión no
// válida». Se vio en el móvil de David: la planilla se guardaba y la copia a
// Drive no. Aquí, si una función devuelve 401, se renueva la sesión y se
// reintenta una vez; si sigue mal, se dice claro que hay que volver a entrar.
const invocarOriginal = supabase.functions.invoke.bind(supabase.functions);
supabase.functions.invoke = async (nombre, opciones) => {
  const r = await invocarOriginal(nombre, opciones);
  const estado = r.error && r.error.context && r.error.context.status;
  if (estado !== 401) return r;
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data || !data.session) throw error || new Error('sin sesión');
  } catch (_) {
    return { data: null, error: Object.assign(new Error('Tu sesión ha caducado: sal y vuelve a entrar con tu PIN.'), { name: 'SesionCaducada' }) };
  }
  const r2 = await invocarOriginal(nombre, opciones);
  if (r2.error && r2.error.context && r2.error.context.status === 401) {
    return { data: null, error: Object.assign(new Error('Tu sesión ha caducado: sal y vuelve a entrar con tu PIN.'), { name: 'SesionCaducada' }) };
  }
  return r2;
};

export default supabase;
