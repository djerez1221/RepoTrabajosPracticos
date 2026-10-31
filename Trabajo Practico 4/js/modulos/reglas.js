/**
 * Reglas de negocio de las reservas. Son funciones puras: no tocan el DOM,
 * ni el almacenamiento, ni la red; por eso son fáciles de probar y reutilizar.
 *
 * Una "sesión" es una clase en un día concreto: { claseId, dia }.
 */

import { ORDEN_DIAS } from './formato.js';

/** Valores de los filtros que significan "sin filtrar". */
export const VALOR_TODAS = 'todas';
export const VALOR_TODOS = 'todos';

/** Con este número de cupos o menos se avisa que quedan pocos. */
export const UMBRAL_POCOS_CUPOS = 5;

export const ESTADO_SESION = Object.freeze({
  DISPONIBLE: 'disponible',
  SELECCIONADA: 'seleccionada',
  RESERVADA: 'reservada',
  AGOTADA: 'agotada',
});

/**
 * @param {string} claseId
 * @param {string} dia
 * @returns {string} Clave única de la sesión, útil para atributos data-*.
 */
export function claveSesion(claseId, dia) {
  return `${claseId}|${dia}`;
}

/**
 * @param {string} clave - Resultado de claveSesion.
 * @returns {{claseId: string, dia: string}}
 */
export function sesionDesdeClave(clave) {
  const [claseId, dia] = clave.split('|');
  return { claseId, dia };
}

const mismaSesion = (a, b) => a.claseId === b.claseId && a.dia === b.dia;

/**
 * @param {Array<{claseId: string, dia: string}>} lista
 * @param {{claseId: string, dia: string}} sesion
 * @returns {boolean}
 */
export function contieneSesion(lista, sesion) {
  return lista.some((item) => mismaSesion(item, sesion));
}

/**
 * Cupos libres = total - ocupados por otros alumnos - reservas confirmadas del usuario.
 * @param {{id: string, cuposTotales: number, cuposOcupados?: Object<string, number>}} clase
 * @param {string} dia
 * @param {Array<{claseId: string, dia: string}>} reservas - Reservas confirmadas del usuario.
 * @returns {number}
 */
export function cuposDisponibles(clase, dia, reservas) {
  const ocupados = clase.cuposOcupados?.[dia] ?? 0;
  const propias = reservas.filter((reserva) => reserva.claseId === clase.id && reserva.dia === dia).length;
  return Math.max(0, clase.cuposTotales - ocupados - propias);
}

/**
 * @param {object} clase
 * @param {string} dia
 * @param {{reservas: Array<object>, carrito: Array<object>}} estado
 * @returns {string} Uno de ESTADO_SESION.
 */
export function estadoDeSesion(clase, dia, { reservas, carrito }) {
  const sesion = { claseId: clase.id, dia };
  if (contieneSesion(reservas, sesion)) return ESTADO_SESION.RESERVADA;
  if (contieneSesion(carrito, sesion)) return ESTADO_SESION.SELECCIONADA;
  if (cuposDisponibles(clase, dia, reservas) === 0) return ESTADO_SESION.AGOTADA;
  return ESTADO_SESION.DISPONIBLE;
}

/**
 * Indica si la sesión coincide en día y horario con otra distinta de la lista.
 * @param {{claseId: string, dia: string}} sesion
 * @param {Array<{claseId: string, dia: string}>} existentes
 * @param {Map<string, {horario: string}>} clasesPorId
 * @returns {boolean}
 */
export function hayConflicto(sesion, existentes, clasesPorId) {
  const clase = clasesPorId.get(sesion.claseId);
  if (!clase) return false;

  return existentes.some((otra) => {
    if (mismaSesion(otra, sesion)) return false;
    const claseOtra = clasesPorId.get(otra.claseId);
    return Boolean(claseOtra) && otra.dia === sesion.dia && claseOtra.horario === clase.horario;
  });
}

/**
 * @param {Array<{disciplina: string, dias: string[]}>} clases
 * @param {{disciplina: string, dia: string}} filtros
 * @returns {Array<object>} Las clases que cumplen ambos filtros.
 */
export function filtrarClases(clases, { disciplina, dia }) {
  return clases.filter((clase) => {
    const coincideDisciplina = disciplina === VALOR_TODAS || clase.disciplina === disciplina;
    const coincideDia = dia === VALOR_TODOS || clase.dias.includes(dia);
    return coincideDisciplina && coincideDia;
  });
}

/**
 * Días de una clase que se muestran según el filtro de día.
 * @param {{dias: string[]}} clase
 * @param {string} dia
 * @returns {string[]}
 */
export function diasVisibles(clase, dia) {
  return dia === VALOR_TODOS ? clase.dias : clase.dias.filter((valor) => valor === dia);
}

/**
 * @param {Array<{dias: string[]}>} clases
 * @returns {string[]} Días en los que hay clases, ordenados como en la semana.
 */
export function diasDisponibles(clases) {
  const dias = new Set(clases.flatMap((clase) => clase.dias));
  return ORDEN_DIAS.filter((dia) => dias.has(dia));
}

/**
 * Une cada sesión guardada con los datos de su clase y descarta las que ya no
 * existen en el catálogo (por ejemplo, si el JSON cambió).
 * @param {Array<{claseId: string, dia: string}>} sesiones
 * @param {Map<string, {dias: string[]}>} clasesPorId
 * @returns {Array<{claseId: string, dia: string, clase: object}>}
 */
export function resolverSesiones(sesiones, clasesPorId) {
  return sesiones.flatMap((sesion) => {
    const clase = clasesPorId.get(sesion.claseId);
    return clase && clase.dias.includes(sesion.dia) ? [{ ...sesion, clase }] : [];
  });
}
