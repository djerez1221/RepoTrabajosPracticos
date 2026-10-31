/**
 * Avisos breves (toasts) que se muestran en una esquina y desaparecen solos.
 * Viven dentro de una región aria-live para que los lectores de pantalla los anuncien.
 */

import { crearElemento } from '../modulos/dom.js';

const DURACION_POR_DEFECTO_MS = 4500;

/** @type {HTMLElement|null} */
let contenedor = null;

/**
 * Crea la región de avisos. Debe existir antes del primer aviso para que
 * los lectores de pantalla anuncien su contenido.
 */
export function iniciarAvisos() {
  if (contenedor) return;
  contenedor = crearElemento('div', {
    clase: 'avisos',
    atributos: { role: 'status', 'aria-live': 'polite' },
  });
  document.body.append(contenedor);
}

/**
 * @param {string} mensaje
 * @param {'exito'|'error'|'info'} [tipo]
 * @param {number} [duracionMs]
 */
export function mostrarAviso(mensaje, tipo = 'info', duracionMs = DURACION_POR_DEFECTO_MS) {
  iniciarAvisos();
  const aviso = crearElemento('p', { clase: `aviso aviso--${tipo}`, texto: mensaje });
  contenedor.append(aviso);
  setTimeout(() => aviso.remove(), duracionMs);
}
