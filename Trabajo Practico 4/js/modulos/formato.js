/**
 * Funciones puras de formato: precios, días de la semana y textos de reservas.
 */

const NOMBRES_DIA = Object.freeze({
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
});

/** Identificadores de día ordenados como en la semana. */
export const ORDEN_DIAS = Object.freeze(Object.keys(NOMBRES_DIA));

const formatoNumero = new Intl.NumberFormat('es-AR');

/**
 * @param {number} monto
 * @param {string} [moneda]
 * @returns {string} Por ejemplo "$18.000 ARS".
 */
export function formatearPrecio(monto, moneda = 'ARS') {
  return `$${formatoNumero.format(monto)} ${moneda}`;
}

/**
 * @param {string} dia - Identificador ("miercoles").
 * @returns {string} Nombre para mostrar ("Miércoles").
 */
export function nombreDia(dia) {
  return NOMBRES_DIA[dia] ?? dia;
}

/**
 * @param {string[]} dias
 * @returns {string} "Lunes y Miércoles" o "Lunes, Martes y Jueves".
 */
export function listarDias(dias) {
  const nombres = dias.map(nombreDia);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * @param {string} horario - "08:00".
 * @returns {string} "08:00 HS".
 */
export function formatearHorario(horario) {
  return `${horario} HS`;
}

/**
 * Texto corto de una sesión (clase + día), usado en listas y etiquetas ARIA.
 * @param {{nombre: string, horario: string}} clase
 * @param {string} dia
 * @returns {string} "CrossFit - Lunes 08:00 HS".
 */
export function describirSesion(clase, dia) {
  return `${clase.nombre} - ${nombreDia(dia)} ${formatearHorario(clase.horario)}`;
}

/**
 * @param {number} cantidad
 * @returns {string} "1 reserva" / "2 reservas".
 */
export function contarReservas(cantidad) {
  return `${cantidad} ${cantidad === 1 ? 'reserva' : 'reservas'}`;
}
