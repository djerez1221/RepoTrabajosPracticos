/**
 * Mensajes de estado de una vista: cargando, error o sin resultados.
 */

import { crearElemento } from '../modulos/dom.js';

/**
 * @param {object} opciones
 * @param {'carga'|'error'|'vacio'} opciones.tipo
 * @param {string} opciones.texto
 * @param {{texto: string, alHacerClic: () => void}} [opciones.accion] - Botón opcional (por ejemplo "Reintentar").
 * @returns {HTMLElement}
 */
export function crearMensajeEstado({ tipo, texto, accion }) {
  const atributos = tipo === 'error' ? { role: 'alert' } : { role: 'status' };
  const mensaje = crearElemento('div', { clase: `mensaje-estado mensaje-estado--${tipo}`, atributos }, [
    crearElemento('p', { clase: 'mensaje-estado__texto', texto }),
  ]);

  if (accion) {
    const boton = crearElemento('button', {
      clase: 'boton boton--secundario',
      texto: accion.texto,
      atributos: { type: 'button' },
    });
    boton.addEventListener('click', accion.alHacerClic);
    mensaje.append(boton);
  }

  return mensaje;
}

/**
 * Reemplaza el contenido de un contenedor por un mensaje de estado.
 * @param {HTMLElement} contenedor
 * @param {Parameters<typeof crearMensajeEstado>[0]} opciones
 */
export function mostrarMensajeEstado(contenedor, opciones) {
  contenedor.replaceChildren(crearMensajeEstado(opciones));
}
