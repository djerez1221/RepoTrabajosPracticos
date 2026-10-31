/**
 * Pantallas de notificación y confirmación basadas en el elemento <dialog>.
 * Al ser modal, el navegador bloquea el resto de la página, maneja la tecla
 * Escape y devuelve el foco al elemento que abrió el diálogo.
 */

import { crearElemento } from '../modulos/dom.js';

let contadorDialogos = 0;

/**
 * @typedef {object} AccionDialogo
 * @property {string} texto - Texto del botón.
 * @property {string} [valor] - Valor con el que se resuelve la promesa al elegirla.
 * @property {string} [href] - Si se indica, la acción es un enlace en lugar de un botón.
 * @property {'acento'|'secundario'|'peligro'} [variante] - Estilo del botón.
 * @property {boolean} [principal] - Recibe el foco inicial.
 */

/**
 * Construye el botón o enlace de una acción.
 * @param {AccionDialogo} accion
 * @param {HTMLDialogElement} dialogo
 * @returns {HTMLElement}
 */
function crearAccion({ texto, valor = '', href, variante, principal }, dialogo) {
  const clase = ['boton', variante ? `boton--${variante}` : ''].filter(Boolean).join(' ');

  if (href) {
    return crearElemento('a', { clase, texto, atributos: { href, autofocus: Boolean(principal) } });
  }

  const boton = crearElemento('button', {
    clase,
    texto,
    atributos: { type: 'button', autofocus: Boolean(principal) },
  });
  boton.addEventListener('click', () => dialogo.close(valor));
  return boton;
}

/**
 * Muestra un diálogo modal.
 * @param {object} opciones
 * @param {string} opciones.titulo
 * @param {string} [opciones.mensaje]
 * @param {string[]} [opciones.items] - Líneas de detalle (por ejemplo, las clases reservadas).
 * @param {AccionDialogo[]} opciones.acciones
 * @returns {Promise<string>} Valor de la acción elegida; cadena vacía si se cerró con Escape o tocando el fondo.
 */
export function abrirDialogo({ titulo, mensaje, items = [], acciones }) {
  return new Promise((resolver) => {
    contadorDialogos += 1;
    const idTitulo = `dialogo-titulo-${contadorDialogos}`;

    const dialogo = crearElemento('dialog', {
      clase: 'dialogo',
      atributos: { 'aria-labelledby': idTitulo },
    });

    const contenido = crearElemento('div', { clase: 'dialogo__contenido' }, [
      crearElemento('h2', { clase: 'dialogo__titulo', texto: titulo, atributos: { id: idTitulo } }),
      mensaje ? crearElemento('p', { clase: 'dialogo__mensaje', texto: mensaje }) : null,
      items.length > 0
        ? crearElemento(
            'ul',
            { clase: 'dialogo__lista' },
            items.map((texto) => crearElemento('li', { clase: 'dialogo__item', texto })),
          )
        : null,
      crearElemento(
        'div',
        { clase: 'dialogo__acciones' },
        acciones.map((accion) => crearAccion(accion, dialogo)),
      ),
    ]);
    dialogo.append(contenido);

    // Tocar el fondo oscuro (el propio <dialog>, fuera del contenido) cierra el diálogo.
    dialogo.addEventListener('click', (evento) => {
      if (evento.target === dialogo) dialogo.close();
    });

    dialogo.addEventListener('close', () => {
      const valor = dialogo.returnValue;
      dialogo.remove();
      resolver(valor);
    });

    document.body.append(dialogo);
    dialogo.showModal();
  });
}

/**
 * Pide confirmación antes de una acción importante.
 * @param {object} opciones
 * @param {string} opciones.titulo
 * @param {string} [opciones.mensaje]
 * @param {string[]} [opciones.items]
 * @param {string} [opciones.textoAceptar]
 * @param {string} [opciones.textoCancelar]
 * @param {boolean} [opciones.destructiva] - Usa el estilo de peligro en el botón de aceptar.
 * @returns {Promise<boolean>} true si el usuario aceptó.
 */
export async function confirmar({
  titulo,
  mensaje,
  items,
  textoAceptar = 'Aceptar',
  textoCancelar = 'Volver',
  destructiva = false,
}) {
  const valor = await abrirDialogo({
    titulo,
    mensaje,
    items,
    acciones: [
      { texto: textoCancelar, valor: 'cancelar', variante: 'secundario', principal: true },
      { texto: textoAceptar, valor: 'aceptar', variante: destructiva ? 'peligro' : 'acento' },
    ],
  });
  return valor === 'aceptar';
}
