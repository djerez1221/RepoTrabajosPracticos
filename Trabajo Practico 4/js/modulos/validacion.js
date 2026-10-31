/**
 * Validación de los datos del formulario de contacto.
 * Las funciones son puras: reciben el valor y devuelven el texto del error
 * (cadena vacía si el valor es válido). La vista decide cómo mostrarlo.
 */

export const LIMITES_CONTACTO = Object.freeze({
  nombreMin: 2,
  nombreMax: 60,
  mensajeMin: 10,
  mensajeMax: 500,
});

/** Letras (con tildes y ñ), espacios, apóstrofos, puntos y guiones. */
const PATRON_NOMBRE = /^\p{L}[\p{L}\s'.-]*$/u;
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * @param {string} valor
 * @returns {string} Mensaje de error o cadena vacía.
 */
export function validarNombre(valor) {
  const nombre = valor.trim();
  if (nombre === '') return 'Ingresa tu nombre.';
  if (nombre.length < LIMITES_CONTACTO.nombreMin) {
    return `El nombre debe tener al menos ${LIMITES_CONTACTO.nombreMin} caracteres.`;
  }
  if (nombre.length > LIMITES_CONTACTO.nombreMax) {
    return `El nombre no puede superar los ${LIMITES_CONTACTO.nombreMax} caracteres.`;
  }
  if (!PATRON_NOMBRE.test(nombre)) return 'El nombre solo puede contener letras y espacios.';
  return '';
}

/**
 * @param {string} valor
 * @returns {string} Mensaje de error o cadena vacía.
 */
export function validarEmail(valor) {
  const email = valor.trim();
  if (email === '') return 'Ingresa tu correo electrónico.';
  if (!PATRON_EMAIL.test(email)) return 'Ingresa un correo válido, por ejemplo nombre@dominio.com.';
  return '';
}

/**
 * @param {string} valor
 * @returns {string} Mensaje de error o cadena vacía.
 */
export function validarMensaje(valor) {
  const mensaje = valor.trim();
  if (mensaje === '') return 'Escribe tu mensaje.';
  if (mensaje.length < LIMITES_CONTACTO.mensajeMin) {
    const faltan = LIMITES_CONTACTO.mensajeMin - mensaje.length;
    return `El mensaje debe tener al menos ${LIMITES_CONTACTO.mensajeMin} caracteres (faltan ${faltan}).`;
  }
  if (mensaje.length > LIMITES_CONTACTO.mensajeMax) {
    return `El mensaje no puede superar los ${LIMITES_CONTACTO.mensajeMax} caracteres.`;
  }
  return '';
}

/** Validador de cada campo, indexado por el atributo name del formulario. */
export const VALIDADORES_CONTACTO = Object.freeze({
  nombre: validarNombre,
  email: validarEmail,
  mensaje: validarMensaje,
});

/**
 * Valida todos los campos del formulario de contacto.
 * @param {{nombre?: string, email?: string, mensaje?: string}} datos
 * @returns {{valido: boolean, errores: Object<string, string>}} Solo incluye los campos con error.
 */
export function validarConsulta(datos) {
  const errores = {};
  for (const [campo, validar] of Object.entries(VALIDADORES_CONTACTO)) {
    const error = validar(String(datos[campo] ?? ''));
    if (error) errores[campo] = error;
  }
  return { valido: Object.keys(errores).length === 0, errores };
}
