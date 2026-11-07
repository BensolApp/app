/* =============================================================================
 * BENSOL · Toma de datos · Dibuja el formulario a partir del esquema
 *
 * Este archivo no sabe NADA de aerotermia ni de solar. Recibe un esquema de
 * visitas-schemas.js y unos datos, y devuelve HTML con las clases de la casa
 * (.inp, .chip, .lbl, .card…). Añadir un campo nuevo no se toca aquí.
 *
 * ENGANCHE CON index.html — solo hacen falta dos líneas, ver TOMA-DATOS.md:
 *   click:  if (a.startsWith('vf')) return A.vf(a, d);
 *   input:  if (f && f.startsWith('vf')) return A.vf(f, t.dataset, t.value);
 * ============================================================================= */

import { etiqueta, proponer } from './visitas-schemas.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------------------------------------------------------------------
 * Un campo
 * ------------------------------------------------------------------------- */
function ayudaHTML(c) {
  if (!c.ayuda) return '';
  return `<div class="tiny">${esc(c.ayuda)}</div>`;
}

function etiquetaHTML(c, tocado) {
  const ob = c.obligatorio ? '<span style="color:var(--rojo)"> *</span>' : '';
  const un = c.unidad ? `<span class="mono" style="opacity:.55"> · ${esc(c.unidad)}</span>` : '';
  const calc = c.calculado && !tocado
    ? '<span class="badge" style="margin-left:8px;background:rgba(61,143,74,.14);color:var(--verde-o);vertical-align:middle">Propuesto</span>' : '';
  return `<div class="lbl">${esc(c.etiqueta)}${ob}${un}${calc}</div>`;
}

function campoHTML(c, valor, tocado) {
  const k = esc(c.key);
  let cuerpo = '';

  if (c.tipo === 'texto') {
    cuerpo = `<input class="inp" data-f="vfCampo" data-k="${k}" value="${esc(valor ?? '')}"
      placeholder="${esc(c.placeholder || '')}">`;

  } else if (c.tipo === 'textarea') {
    cuerpo = `<textarea class="inp" data-f="vfCampo" data-k="${k}" rows="3"
      placeholder="${esc(c.placeholder || '')}">${esc(valor ?? '')}</textarea>`;

  } else if (c.tipo === 'numero' || c.tipo === 'entero') {
    const modo = c.tipo === 'entero' ? 'numeric' : 'decimal';
    cuerpo = `<input class="inp" data-f="vfCampo" data-k="${k}" inputmode="${modo}"
      value="${esc(valor ?? '')}" placeholder="${esc(c.placeholder || '')}">`;

  } else if (c.tipo === 'bool') {
    const si = valor === true;
    const no = valor === false;
    cuerpo = `<div class="row g8">
      <div class="chip ${si ? 'on' : ''}" data-a="vfBool" data-k="${k}" data-v="1"
        style="cursor:pointer;${si ? 'background:var(--verde-c);color:#fff' : ''}">Sí</div>
      <div class="chip ${no ? 'on' : ''}" data-a="vfBool" data-k="${k}" data-v="0"
        style="cursor:pointer;${no ? 'background:rgba(20,23,15,.14)' : ''}">No</div>
    </div>`;

  } else if (c.tipo === 'opcion') {
    cuerpo = `<div class="row g8" style="flex-wrap:wrap">${(c.opciones || []).map((o) => {
      const on = valor === o;
      return `<div class="chip" data-a="vfOpcion" data-k="${k}" data-v="${esc(o)}"
        style="cursor:pointer;${on ? 'background:var(--verde-c);color:#fff' : ''}">${esc(etiqueta(o))}</div>`;
    }).join('')}</div>`;

  } else if (c.tipo === 'multi') {
    const sel = Array.isArray(valor) ? valor : [];
    cuerpo = `<div class="row g8" style="flex-wrap:wrap">${(c.opciones || []).map((o) => {
      const on = sel.includes(o);
      return `<div class="chip" data-a="vfMulti" data-k="${k}" data-v="${esc(o)}"
        style="cursor:pointer;${on ? 'background:var(--verde-c);color:#fff' : ''}">${esc(etiqueta(o))}</div>`;
    }).join('')}</div>`;

  } else if (c.tipo === 'lista') {
    const filas = Array.isArray(valor) ? valor : [];
    cuerpo = `<div class="col g8">
      ${filas.map((fila, i) => `<div class="card" style="padding:12px">
        <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="tiny mono" style="opacity:.5">${i + 1}</div>
          <div class="tiny" data-a="vfListaDel" data-k="${k}" data-i="${i}"
            style="color:var(--rojo);cursor:pointer">Quitar</div>
        </div>
        ${(c.subcampos || []).map((s) => `<div style="margin-top:8px">
          <div class="tiny" style="opacity:.6;margin-bottom:4px">${esc(s.etiqueta)}</div>
          ${subcampoHTML(s, fila[s.key], k, i)}
        </div>`).join('')}
      </div>`).join('')}
      <div class="btn btn-gris" data-a="vfListaAdd" data-k="${k}"
        style="border-radius:12px;cursor:pointer">+ Añadir</div>
    </div>`;
  }

  return `<div class="campo">
    ${etiquetaHTML(c, tocado)}
    ${cuerpo}
    ${ayudaHTML(c)}
  </div>`;
}

function subcampoHTML(s, valor, listaKey, i) {
  if (s.tipo === 'opcion') {
    return `<div class="row g8" style="flex-wrap:wrap">${(s.opciones || []).map((o) => {
      const on = valor === o;
      return `<div class="chip" data-a="vfListaOpcion" data-k="${esc(listaKey)}" data-i="${i}"
        data-s="${esc(s.key)}" data-v="${esc(o)}"
        style="cursor:pointer;${on ? 'background:var(--verde-c);color:#fff' : ''}">${esc(etiqueta(o))}</div>`;
    }).join('')}</div>`;
  }
  const modo = s.tipo === 'entero' ? 'numeric' : s.tipo === 'numero' ? 'decimal' : '';
  return `<input class="inp" data-f="vfLista" data-k="${esc(listaKey)}" data-i="${i}"
    data-s="${esc(s.key)}" ${modo ? `inputmode="${modo}"` : ''} value="${esc(valor ?? '')}">`;
}

/* ---------------------------------------------------------------------------
 * Una sección y una ficha entera
 * ------------------------------------------------------------------------- */
export function seccionHTML(sec, datos, tocados = {}) {
  return `<div class="vf-sec">
    <div class="h2">${esc(sec.titulo)}</div>
    ${sec.campos.map((c) => campoHTML(c, datos?.[c.key], tocados[c.key])).join('')}
  </div>`;
}

export function fichaHTML(esquema, datos, tocados = {}) {
  return esquema.secciones.map((s) => seccionHTML(s, datos, tocados)).join('');
}

/* ---------------------------------------------------------------------------
 * Resumen de solo lectura, para la pantalla de detalle y para la nota que
 * viaja a Teamleader.
 * ------------------------------------------------------------------------- */
function valorLegible(c, v) {
  if (v == null || v === '') return null;
  if (c.tipo === 'bool') return v ? 'Sí' : 'No';
  if (c.tipo === 'multi') return (v || []).map(etiqueta).join(', ') || null;
  if (c.tipo === 'opcion') return etiqueta(v);
  if (c.tipo === 'lista') {
    if (!Array.isArray(v) || !v.length) return null;
    return v.map((f) => (c.subcampos || [])
      .map((s) => `${s.etiqueta}: ${s.tipo === 'opcion' ? etiqueta(f[s.key]) : (f[s.key] ?? '—')}`)
      .join(' · ')).join('\n');
  }
  return c.unidad ? `${v} ${c.unidad}` : String(v);
}

/**
 * Las secciones con algo escrito, ya legibles: [{ titulo, filas: [[etiqueta, valor]] }].
 * De aquí salen el resumen de la pantalla, el texto para Teamleader y el PDF.
 */
export function resumenFilas(esquema, datos) {
  return (esquema.secciones || []).map((sec) => ({
    titulo: sec.titulo,
    filas: sec.campos
      .map((c) => [c.etiqueta, valorLegible(c, datos?.[c.key])])
      .filter(([, v]) => v != null),
  })).filter((s) => s.filas.length);
}

export function resumenHTML(esquema, datos) {
  const bloques = esquema.secciones.map((sec) => {
    const filas = sec.campos
      .map((c) => [c, valorLegible(c, datos?.[c.key])])
      .filter(([, v]) => v != null);
    if (!filas.length) return '';
    return `<div style="margin-top:18px">
      <div class="lbl">${esc(sec.titulo)}</div>
      ${filas.map(([c, v]) => `<div class="row" style="align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid rgba(20,23,15,.07)">
        <div class="grow tiny" style="opacity:.6">${esc(c.etiqueta)}</div>
        <div style="font:500 14px/1.35 var(--sans);text-align:right;white-space:pre-line">${esc(v)}</div>
      </div>`).join('')}
    </div>`;
  }).join('');
  return bloques || '<div class="sub" style="margin-top:16px">Sin datos todavía.</div>';
}

/** La misma ficha en texto plano. Es lo que se escribe como nota del deal. */
export function resumenTexto(esquema, datos) {
  const partes = [];
  for (const sec of esquema.secciones) {
    const filas = sec.campos
      .map((c) => [c, valorLegible(c, datos?.[c.key])])
      .filter(([, v]) => v != null);
    if (!filas.length) continue;
    partes.push(sec.titulo.toUpperCase());
    filas.forEach(([c, v]) => partes.push(`  ${c.etiqueta}: ${v.replace(/\n/g, '\n    ')}`));
    partes.push('');
  }
  return partes.join('\n');
}

/* ---------------------------------------------------------------------------
 * Un solo manejador para todo el formulario.
 *
 * `estado` es el borrador vivo: { datos, tocados }. Se muta aquí y quien llama
 * solo tiene que volver a pintar. Devuelve true si algo cambió.
 * ------------------------------------------------------------------------- */
export function manejar(accion, d, valor, estado, esquema, comun) {
  const datos = estado.datos || (estado.datos = {});
  const tocados = estado.tocados || (estado.tocados = {});
  const k = d.k;

  if (accion === 'vfCampo') {
    datos[k] = valor;
    tocados[k] = true;

  } else if (accion === 'vfOpcion') {
    datos[k] = datos[k] === d.v ? null : d.v;
    tocados[k] = true;

  } else if (accion === 'vfMulti') {
    const arr = Array.isArray(datos[k]) ? datos[k] : [];
    datos[k] = arr.includes(d.v) ? arr.filter((x) => x !== d.v) : arr.concat(d.v);
    tocados[k] = true;

  } else if (accion === 'vfBool') {
    const nuevo = d.v === '1';
    datos[k] = datos[k] === nuevo ? null : nuevo;
    tocados[k] = true;

  } else if (accion === 'vfListaAdd') {
    const arr = Array.isArray(datos[k]) ? datos[k] : (datos[k] = []);
    arr.push({});

  } else if (accion === 'vfListaDel') {
    const arr = Array.isArray(datos[k]) ? datos[k] : [];
    arr.splice(Number(d.i), 1);

  } else if (accion === 'vfLista') {
    const arr = Array.isArray(datos[k]) ? datos[k] : (datos[k] = []);
    if (!arr[Number(d.i)]) arr[Number(d.i)] = {};
    arr[Number(d.i)][d.s] = valor;

  } else if (accion === 'vfListaOpcion') {
    const arr = Array.isArray(datos[k]) ? datos[k] : (datos[k] = []);
    if (!arr[Number(d.i)]) arr[Number(d.i)] = {};
    const fila = arr[Number(d.i)];
    fila[d.s] = fila[d.s] === d.v ? null : d.v;

  } else {
    return false;
  }

  // Propuestas de campo: solo rellenan huecos que nadie ha tocado a mano.
  if (esquema) {
    const p = proponer(esquema.categoria, datos, comun);
    for (const [pk, pv] of Object.entries(p)) {
      if (!tocados[pk] && pv != null && !Number.isNaN(pv)) datos[pk] = pv;
    }
  }
  return true;
}
