/**
 * Estado compartido entre páginas: plan activo, reservas confirmadas y la
 * selección de clases en curso (el "carrito").
 *
 * Como el sitio no tiene servidor, el estado se guarda en localStorage. La
 * primera vez se crea a partir de data/usuario.json. Las vistas no modifican
 * el estado directamente: usan las funciones de este módulo y se enteran de los
 * cambios con suscribir().
 */

import { cargarUsuario } from './api.js';
import { guardar, leer } from './almacenamiento.js';
import { contieneSesion } from './reglas.js';

const CLAVE_ESTADO = 'sisifo-gym:estado:v1';

/** @type {{usuario: {nombre: string, planId: string}, reservas: Array<object>, carrito: Array<object>}|null} */
let estado = null;
/** @type {Promise<object>|null} */
let promesaInicial = null;
/** @type {Set<(estado: object) => void>} */
const suscriptores = new Set();

const esSesion = (valor) => typeof valor?.claseId === 'string' && typeof valor?.dia === 'string';

/**
 * Comprueba la forma del estado leído del almacenamiento (puede estar
 * desactualizado o haber sido modificado a mano).
 * @param {unknown} valor
 * @returns {boolean}
 */
function esEstadoValido(valor) {
  return (
    typeof valor?.usuario?.nombre === 'string' &&
    typeof valor?.usuario?.planId === 'string' &&
    Array.isArray(valor?.reservas) &&
    valor.reservas.every(esSesion) &&
    Array.isArray(valor?.carrito) &&
    valor.carrito.every(esSesion)
  );
}

const copiarSesion = ({ claseId, dia }) => ({ claseId, dia });

/** @returns {{usuario: object, reservas: Array<object>, carrito: Array<object>}} Copia del estado actual. */
export function obtenerEstado() {
  if (!estado) {
    throw new Error('El estado todavía no se inicializó: llamar antes a iniciarEstado().');
  }
  return structuredClone(estado);
}

async function crearEstadoInicial() {
  const guardado = leer(CLAVE_ESTADO);
  if (esEstadoValido(guardado)) {
    estado = guardado;
    return obtenerEstado();
  }

  const semilla = await cargarUsuario();
  estado = {
    usuario: { nombre: semilla.nombre, planId: semilla.planId },
    reservas: semilla.reservas.map(copiarSesion),
    carrito: [],
  };
  guardar(CLAVE_ESTADO, estado);
  return obtenerEstado();
}

/**
 * Carga el estado (desde localStorage o, la primera vez, desde el JSON).
 * Se puede llamar varias veces: solo inicializa una vez.
 * @returns {Promise<object>} Copia del estado.
 */
export function iniciarEstado() {
  if (!promesaInicial) {
    promesaInicial = crearEstadoInicial().catch((error) => {
      promesaInicial = null;
      throw error;
    });
  }
  return promesaInicial;
}

/** Guarda el estado y avisa a los suscriptores. */
function publicarCambio() {
  guardar(CLAVE_ESTADO, estado);
  const copia = obtenerEstado();
  suscriptores.forEach((escuchar) => escuchar(copia));
}

/**
 * @param {(estado: object) => void} escuchar - Se llama con una copia del estado tras cada cambio.
 * @returns {() => void} Función para cancelar la suscripción.
 */
export function suscribir(escuchar) {
  suscriptores.add(escuchar);
  return () => suscriptores.delete(escuchar);
}

/**
 * @param {{claseId: string, dia: string}} sesion
 * @returns {boolean} false si la sesión ya estaba seleccionada o reservada.
 */
export function agregarAlCarrito(sesion) {
  obtenerEstado();
  if (contieneSesion(estado.carrito, sesion) || contieneSesion(estado.reservas, sesion)) return false;
  estado.carrito.push(copiarSesion(sesion));
  publicarCambio();
  return true;
}

/**
 * @param {{claseId: string, dia: string}} sesion
 */
export function quitarDelCarrito(sesion) {
  obtenerEstado();
  estado.carrito = estado.carrito.filter((item) => !contieneSesion([sesion], item));
  publicarCambio();
}

/**
 * Convierte la selección en reservas confirmadas y vacía el carrito.
 * @returns {Array<{claseId: string, dia: string}>} Las reservas nuevas.
 */
export function confirmarCarrito() {
  obtenerEstado();
  const nuevas = estado.carrito.filter((sesion) => !contieneSesion(estado.reservas, sesion));
  estado.reservas.push(...nuevas);
  estado.carrito = [];
  publicarCambio();
  return nuevas.map(copiarSesion);
}

/**
 * @param {{claseId: string, dia: string}} sesion
 */
export function cancelarReserva(sesion) {
  obtenerEstado();
  estado.reservas = estado.reservas.filter((item) => !contieneSesion([sesion], item));
  publicarCambio();
}

/**
 * @param {string} planId
 */
export function cambiarPlan(planId) {
  obtenerEstado();
  estado.usuario.planId = planId;
  publicarCambio();
}

/**
 * Mantiene sincronizadas las pestañas abiertas: si otra pestaña modifica el
 * estado, esta lo recarga y avisa a sus vistas.
 */
window.addEventListener('storage', (evento) => {
  if (evento.key !== CLAVE_ESTADO || !estado || evento.newValue === null) return;
  try {
    const nuevo = JSON.parse(evento.newValue);
    if (!esEstadoValido(nuevo)) return;
    estado = nuevo;
    const copia = obtenerEstado();
    suscriptores.forEach((escuchar) => escuchar(copia));
  } catch (error) {
    console.warn('No se pudo sincronizar el estado con otra pestaña.', error);
  }
});
