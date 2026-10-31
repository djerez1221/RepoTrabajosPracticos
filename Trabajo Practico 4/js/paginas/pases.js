/**
 * Página "Pases": tabla de planes renderizada desde data/pases.json y compra
 * de un plan con confirmación.
 */

import { cargarPases } from '../modulos/api.js';
import { crearElemento, obtenerPorId } from '../modulos/dom.js';
import { cambiarPlan, iniciarEstado, obtenerEstado, suscribir } from '../modulos/estado.js';
import { formatearPrecio } from '../modulos/formato.js';
import { abrirDialogo, confirmar } from '../componentes/dialogo.js';
import { mostrarMensajeEstado } from '../componentes/mensaje-estado.js';

/** Punto de entrada: lo llama main.js cuando carga la página. */
export async function iniciar() {
  const refs = {
    estado: obtenerPorId('pases-estado'),
    tabla: obtenerPorId('pases-tabla'),
    cuerpo: obtenerPorId('pases-cuerpo'),
  };
  await cargarVista(refs);
}

/**
 * @param {{estado: HTMLElement, tabla: HTMLElement, cuerpo: HTMLElement}} refs
 */
async function cargarVista(refs) {
  mostrarMensajeEstado(refs.estado, { tipo: 'carga', texto: 'Cargando planes...' });

  let pases;
  try {
    [pases] = await Promise.all([cargarPases(), iniciarEstado()]);
  } catch (error) {
    console.error(error);
    mostrarMensajeEstado(refs.estado, {
      tipo: 'error',
      texto: 'No pudimos cargar los planes. Intenta nuevamente en unos instantes.',
      accion: { texto: 'Reintentar', alHacerClic: () => cargarVista(refs) },
    });
    return;
  }

  refs.estado.replaceChildren();
  refs.tabla.hidden = false;

  const pintar = () => pintarTabla(refs.cuerpo, pases);
  pintar();
  suscribir(pintar);

  refs.cuerpo.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-pase]');
    if (!boton) return;
    const pase = pases.find((candidato) => candidato.id === boton.dataset.pase);
    if (pase) comprarPase(pase);
  });
}

/**
 * @param {HTMLElement} cuerpo - <tbody> de la tabla.
 * @param {Array<object>} pases
 */
function pintarTabla(cuerpo, pases) {
  const { planId } = obtenerEstado().usuario;
  cuerpo.replaceChildren(...pases.map((pase) => crearFila(pase, pase.id === planId)));
}

/**
 * @param {{id: string, nombre: string, acceso: string, precio: number, moneda: string}} pase
 * @param {boolean} esPlanActivo
 * @returns {HTMLElement}
 */
function crearFila(pase, esPlanActivo) {
  const boton = esPlanActivo
    ? crearElemento('button', {
        clase: 'boton boton--secundario',
        texto: 'Plan activo',
        atributos: { type: 'button', disabled: true, 'aria-label': `${pase.nombre}: es tu plan activo` },
      })
    : crearElemento('button', {
        clase: 'boton',
        texto: 'Comprar',
        atributos: { type: 'button', 'aria-label': `Comprar ${pase.nombre}` },
        dataset: { pase: pase.id },
      });

  const celda = (etiqueta, contenido, claseExtra = '') =>
    crearElemento('td', {
      clase: `tabla-pases__celda ${claseExtra}`.trim(),
      atributos: { 'data-label': etiqueta },
    }, [contenido]);

  return crearElemento('tr', { clase: 'tabla-pases__fila' }, [
    celda('Plan', pase.nombre),
    celda('Acceso', pase.acceso),
    celda('Precio', formatearPrecio(pase.precio, pase.moneda), 'tabla-pases__celda--precio'),
    celda('Acción', boton),
  ]);
}

/**
 * Pide confirmación, cambia el plan y muestra la pantalla de compra confirmada.
 * @param {{id: string, nombre: string, acceso: string, precio: number, moneda: string}} pase
 */
async function comprarPase(pase) {
  const acepto = await confirmar({
    titulo: `¿Comprar ${pase.nombre}?`,
    mensaje: `${pase.acceso} por ${formatearPrecio(pase.precio, pase.moneda)}. Reemplazará a tu plan actual.`,
    textoAceptar: 'Confirmar compra',
  });
  if (!acepto) return;

  cambiarPlan(pase.id);

  await abrirDialogo({
    titulo: 'Compra confirmada',
    mensaje: `Tu plan activo ahora es ${pase.nombre}.`,
    acciones: [
      { texto: 'Seguir viendo planes', valor: 'cerrar', variante: 'secundario' },
      { texto: 'Ir a Mi Cuenta', href: 'mi-cuenta.html', variante: 'acento', principal: true },
    ],
  });
}
