// BENSOL · Buscador de partidas (etapa 1)
// Lector de archivos BC3 (FIEBDC-3/2016). Módulo ES puro: sin DOM, sin red, sin dependencias.
// Registros separados por «~», campos por «|», subcampos por «\».
// Uso:
//   const base = parseBC3(arrayBuffer);               // {info, capitulos[], conceptos[], descompuestos[]}
//   const r = fusionarIdioma(base, parseBC3(otro), 'ca');  // rellena resumen_ca / descripcion_ca / nombre_ca
//   asignarGrupos(base);                               // grupo BENSOL por capítulo raíz
//   const filas = filasParaBD(base, baseId);           // filas listas para upsert en Supabase

// Grupo BENSOL por defecto según el capítulo de primer nivel (claves de partida_grupos).
export const GRUPO_POR_CAPITULO = {
  D01: 'demoliciones', D02: 'mov_tierras',
  D03: 'estructura', D04: 'estructura', D05: 'estructura',
  D06: 'albanileria', D09: 'albanileria', D12: 'albanileria', D14: 'albanileria',
  D07: 'tabiqueria', D08: 'saneamiento',
  IVM: 'clima', D18: 'clima', D20: 'clima',
  D17: 'fontaneria', D19: 'electricidad', D30: 'solar', D31: 'pci',
  D10: 'acabados', D11: 'acabados', D13: 'acabados', D15: 'acabados', D16: 'acabados',
  D23: 'acabados', D24: 'acabados', D27: 'acabados',
};
export const GRUPO_DEFECTO = 'otros';

const TIPOS = { '0': 'partida', '1': 'mano_obra', '2': 'maquinaria', '3': 'material', '%': 'porcentaje' };

function decodificar(buf, etiqueta) {
  try { return new TextDecoder(etiqueta).decode(buf); } catch (_) { return null; }
}

const limpiar = (s) => (s == null ? '' : String(s).replace(/\s+$/g, '').replace(/^\s+/g, ''));
const num = (s) => { const n = parseFloat(String(s == null ? '' : s).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

// Devuelve los registros como [tipo, campos[]]. Todo se recorta (los códigos pueden llevar espacios o saltos de línea).
function registros(texto) {
  const out = [];
  const partes = texto.split('~');
  for (let i = 0; i < partes.length; i++) {
    const r = partes[i];
    if (!r) continue;
    const t = r.charAt(0).toUpperCase();
    if (r.charAt(1) !== '|') continue;
    out.push([t, r.slice(2).split('|')]);
  }
  return out;
}

export function parseBC3(arrayBuffer) {
  const avisos = [];
  let texto = decodificar(arrayBuffer, 'windows-1252');
  if (texto == null) texto = decodificar(arrayBuffer, 'iso-8859-1') || '';
  const info = { propietario: '', version: '', programa: '', codificacion: 'ANSI', codificacionAplicada: 'windows-1252', avisos };
  const regs = registros(texto);
  const v = regs.find((r) => r[0] === 'V');
  if (v) {
    info.propietario = limpiar(v[1][0]); info.version = limpiar(v[1][1]); info.programa = limpiar(v[1][2]);
    const cod = limpiar(v[1][4]).toUpperCase();
    if (cod) info.codificacion = cod;
    if (cod && cod !== 'ANSI' && cod !== '1252') {
      // 850 y 437 no existen en TextDecoder de los navegadores; se prueba y, si no hay soporte, windows-1252.
      const mapa = { '850': 'ibm850', '437': 'ibm437', '1250': 'windows-1250', '8859-1': 'iso-8859-1' };
      const etq = mapa[cod];
      const t2 = etq ? decodificar(arrayBuffer, etq) : null;
      if (t2) { texto = t2; info.codificacionAplicada = etq; }
      else avisos.push('Codificación «' + cod + '» sin soporte en este navegador: se ha leído como windows-1252.');
    }
  }
  // Si se ha cambiado la decodificación hay que volver a trocear.
  const R = info.codificacionAplicada === 'windows-1252' ? regs : registros(texto);

  const conc = new Map();   // codigo -> {codigo, unidad, resumen, precio, tipoBC3}
  const hijosDe = new Map(); // padre -> [{hijo, factor, rendimiento}]
  const desc = new Map();   // codigo -> texto largo
  for (const [t, c] of R) {
    if (t === 'C') {
      const codigo = limpiar(c[0]);
      if (!codigo) continue;
      conc.set(codigo, { codigo, unidad: limpiar(c[1]), resumen: limpiar(c[2]), precio: num(c[3]), tipoBC3: limpiar(c[5]) });
    } else if (t === 'D') {
      const padre = limpiar(c[0]);
      const grupo = (c[1] || '').split('\\');
      const lista = hijosDe.get(padre) || [];
      for (let i = 0; i < grupo.length; i += 3) {
        const hijo = limpiar(grupo[i]);
        if (!hijo) continue;
        const f = limpiar(grupo[i + 1]); const r = limpiar(grupo[i + 2]);
        lista.push({ hijo, factor: f === '' ? 1 : num(f), rendimiento: r === '' ? 1 : num(r) });
      }
      hijosDe.set(padre, lista);
    } else if (t === 'T') {
      const codigo = limpiar(c[0]);
      if (codigo) desc.set(codigo, limpiar(c[1]));
    }
  }

  const esCap = (cod) => cod.endsWith('#');
  // Raíz: código con «##»; si no hay, el capítulo que no es hijo de nadie.
  let raiz = [...conc.keys()].find((k) => k.endsWith('##')) || '';
  if (!raiz) {
    const hijos = new Set(); for (const l of hijosDe.values()) for (const h of l) hijos.add(h.hijo);
    raiz = [...conc.keys()].find((k) => esCap(k) && !hijos.has(k)) || '';
  }
  info.raiz = raiz;
  info.nombre = raiz && conc.get(raiz) ? conc.get(raiz).resumen : '';

  // Capítulos: recorrido desde la raíz.
  const capitulos = [];
  const capInfo = new Map(); // codigo -> {padre, nivel, raiz}
  const visitar = (cod, padre, nivel, raizCap) => {
    if (capInfo.has(cod)) return;
    const c = conc.get(cod);
    const rc = nivel === 1 ? cod : raizCap;
    capInfo.set(cod, { padre, nivel, raiz: rc });
    if (nivel > 0) capitulos.push({ codigo: cod, padre_codigo: padre, nombre: c ? c.resumen : cod, orden: 0, nivel });
    const hs = (hijosDe.get(cod) || []).filter((h) => esCap(h.hijo));
    hs.forEach((h, i) => { visitar(h.hijo, cod, nivel + 1, rc); });
  };
  if (raiz) visitar(raiz, null, 0, null);
  // Orden dentro de su padre
  const contador = new Map();
  for (const cap of capitulos) { const k = cap.padre_codigo || ''; const n = contador.get(k) || 0; cap.orden = n; contador.set(k, n + 1); }
  // Capítulos sin padre = primer nivel: padre_codigo null (el padre era la raíz)
  for (const cap of capitulos) if (cap.nivel === 1) cap.padre_codigo = null;

  // Conceptos (todo lo que no sea capítulo)
  const conceptos = [];
  const capDe = new Map(); // partida -> capítulo hoja (el primero que la contiene)
  for (const [padre, lista] of hijosDe) {
    if (!esCap(padre) || !capInfo.has(padre)) continue;
    for (const h of lista) if (!esCap(h.hijo) && !capDe.has(h.hijo)) capDe.set(h.hijo, padre);
  }
  for (const c of conc.values()) {
    if (esCap(c.codigo)) continue;
    let tipo = TIPOS[c.tipoBC3] || (c.codigo.startsWith('%') ? 'porcentaje' : 'material');
    const hoja = capDe.get(c.codigo) || null;
    // Partida sin capítulo (solo cuelga de otras partidas, p. ej. unidades de obra auxiliares): no se ofrece en el buscador.
    if (tipo === 'partida' && !hoja) tipo = 'auxiliar';
    conceptos.push({
      codigo: c.codigo, tipo, unidad: c.unidad, resumen: c.resumen, descripcion: desc.get(c.codigo) || '',
      precio: c.precio, capitulo_codigo: hoja, capitulo_raiz: hoja ? capInfo.get(hoja).raiz : null,
    });
  }

  // Descompuestos: solo de conceptos que no son capítulos. Se descartan los que apuntan a un código inexistente.
  const descompuestos = [];
  let huerfanos = 0;
  const huerfanosEj = [];
  for (const [padre, lista] of hijosDe) {
    if (esCap(padre) || !conc.has(padre)) continue;
    let orden = 0;
    for (const h of lista) {
      if (!conc.has(h.hijo)) { huerfanos++; if (huerfanosEj.length < 5) huerfanosEj.push(padre + '>' + h.hijo); continue; }
      descompuestos.push({ padre_codigo: padre, hijo_codigo: h.hijo, factor: h.factor, rendimiento: h.rendimiento, orden: orden++ });
    }
  }
  info.descompuestosHuerfanos = huerfanos;
  if (huerfanos) avisos.push(huerfanos + ' líneas de descompuesto apuntaban a un código inexistente y se han ignorado.');
  info.conteos = {
    capitulos: capitulos.length, primerNivel: capitulos.filter((x) => x.nivel === 1).length,
    conceptos: conceptos.length, partidas: conceptos.filter((x) => x.tipo === 'partida').length,
    simples: conceptos.filter((x) => x.tipo !== 'partida').length, descompuestos: descompuestos.length,
  };
  return { info, capitulos, conceptos, descompuestos };
}

// Fusiona un archivo de otro idioma (mismos códigos) en la base principal: solo resumen y descripción.
// idioma: 'ca' | 'en' | 'de'. Devuelve {idioma, fusionados, total, pct}.
export function fusionarIdioma(base, otro, idioma) {
  const mapa = new Map(); for (const c of otro.conceptos) mapa.set(c.codigo, c);
  let n = 0;
  for (const c of base.conceptos) {
    const o = mapa.get(c.codigo);
    if (o && (o.resumen || o.descripcion)) { c['resumen_' + idioma] = o.resumen || null; c['descripcion_' + idioma] = o.descripcion || null; n++; }
  }
  const mc = new Map(); for (const c of otro.capitulos) mc.set(c.codigo, c);
  for (const c of base.capitulos) { const o = mc.get(c.codigo); if (o && o.nombre) c['nombre_' + idioma] = o.nombre; }
  const total = base.conceptos.length;
  return { idioma, fusionados: n, total, pct: total ? n / total : 0 };
}

// Asigna el grupo BENSOL: capítulo (heredado del raíz) y conceptos con capítulo. mapa opcional.
export function asignarGrupos(base, mapa) {
  const m = mapa || GRUPO_POR_CAPITULO;
  const g = (raiz) => (raiz && m[String(raiz).replace(/#+$/, '')]) || GRUPO_DEFECTO;
  const raizDe = new Map();
  for (const c of base.capitulos) {
    if (c.nivel === 1) raizDe.set(c.codigo, c.codigo);
  }
  const porCod = new Map(base.capitulos.map((c) => [c.codigo, c]));
  const raizCap = (c) => { let x = c; while (x && x.nivel > 1) x = porCod.get(x.padre_codigo); return x ? x.codigo : null; };
  for (const c of base.capitulos) c.grupo = g(raizCap(c));
  for (const c of base.conceptos) c.grupo = c.capitulo_raiz ? g(c.capitulo_raiz) : null;
  return base;
}

// Filas para upsert (base_id añadido). Orden de subida: capitulos, conceptos, descompuestos.
export function filasParaBD(base, baseId) {
  const nn = (v) => (v === undefined || v === '' ? null : v);
  return {
    capitulos: base.capitulos.map((c) => ({
      base_id: baseId, codigo: c.codigo, padre_codigo: c.padre_codigo || null, nombre: c.nombre, nombre_ca: nn(c.nombre_ca), nombre_en: nn(c.nombre_en), nombre_de: nn(c.nombre_de),
      orden: c.orden, nivel: c.nivel, grupo: c.grupo || null,
    })),
    conceptos: base.conceptos.map((c) => ({
      base_id: baseId, codigo: c.codigo, tipo: c.tipo, unidad: nn(c.unidad), resumen: c.resumen, descripcion: nn(c.descripcion),
      resumen_ca: nn(c.resumen_ca), resumen_en: nn(c.resumen_en), resumen_de: nn(c.resumen_de),
      descripcion_ca: nn(c.descripcion_ca), descripcion_en: nn(c.descripcion_en), descripcion_de: nn(c.descripcion_de),
      precio: c.precio, capitulo_codigo: c.capitulo_codigo || null, capitulo_raiz: c.capitulo_raiz || null, grupo: c.grupo || null,
    })),
    descompuestos: base.descompuestos.map((d) => ({ base_id: baseId, padre_codigo: d.padre_codigo, hijo_codigo: d.hijo_codigo, factor: d.factor, rendimiento: d.rendimiento, orden: d.orden })),
  };
}
