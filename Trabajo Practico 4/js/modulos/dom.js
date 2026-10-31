/**
 * Utilidades para construir nodos del DOM sin usar innerHTML.
 * Todo texto se inserta con textContent, así los datos que vienen del JSON
 * o del usuario nunca se interpretan como HTML (previene XSS).
 */

/**
 * Crea un elemento HTML.
 * @param {string} etiqueta - Nombre de la etiqueta (por ejemplo "li").
 * @param {object} [opciones]
 * @param {string} [opciones.clase] - Valor del atributo class.
 * @param {string} [opciones.texto] - Texto del elemento.
 * @param {Object<string, string|boolean|null>} [opciones.atributos] - Atributos HTML.
 *        Un valor true crea un atributo booleano; false o null lo omite.
 * @param {Object<string, string>} [opciones.dataset] - Atributos data-*.
 * @param {Array<Node|string|null>} [hijos] - Nodos hijos (los null se ignoran).
 * @returns {HTMLElement}
 */
export function crearElemento(etiqueta, { clase, texto, atributos = {}, dataset = {} } = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);

  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;

  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    elemento.setAttribute(nombre, valor === true ? '' : String(valor));
  }

  for (const [nombre, valor] of Object.entries(dataset)) {
    elemento.dataset[nombre] = valor;
  }

  elemento.append(...hijos.filter((hijo) => hijo !== null && hijo !== undefined));
  return elemento;
}

/**
 * Busca un elemento por id y falla con un mensaje claro si no existe.
 * Detecta enseguida un desajuste entre el HTML y el JavaScript.
 * @param {string} id
 * @returns {HTMLElement}
 */
export function obtenerPorId(id) {
  const elemento = document.getElementById(id);
  if (!elemento) {
    throw new Error(`No se encontró el elemento #${id} en la página.`);
  }
  return elemento;
}
