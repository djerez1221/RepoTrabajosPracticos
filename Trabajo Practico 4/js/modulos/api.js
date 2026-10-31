/**
 * Capa de acceso a datos.
 * Simula una API REST: cada recurso es un archivo JSON dentro de /data que se
 * obtiene con la función global fetch. Si más adelante existiera un servidor,
 * solo habría que cambiar las rutas de este módulo.
 *
 * Los objetos devueltos se comparten entre llamadas (caché): no deben modificarse.
 */

const RUTAS = Object.freeze({
  clases: 'data/clases.json',
  pases: 'data/pases.json',
  usuario: 'data/usuario.json',
});

const RETARDO_ENVIO_MS = 700;

/** Error propio para distinguir las fallas de carga de otros errores del programa. */
export class ErrorDeCarga extends Error {
  /**
   * @param {string} mensaje
   * @param {{cause?: unknown}} [opciones]
   */
  constructor(mensaje, opciones) {
    super(mensaje, opciones);
    this.name = 'ErrorDeCarga';
  }
}

/** @type {Map<string, Promise<unknown>>} */
const cache = new Map();

/**
 * Descarga y parsea un archivo JSON.
 * @param {string} ruta
 * @returns {Promise<unknown>}
 * @throws {ErrorDeCarga} Si falla la red, la respuesta no es 2xx o el contenido no es JSON.
 */
async function descargarJSON(ruta) {
  let respuesta;
  try {
    respuesta = await fetch(ruta, { headers: { Accept: 'application/json' } });
  } catch (causa) {
    throw new ErrorDeCarga(`No se pudo obtener ${ruta}. ¿Se está abriendo el sitio desde un servidor?`, { cause: causa });
  }

  if (!respuesta.ok) {
    throw new ErrorDeCarga(`El servidor respondió ${respuesta.status} al pedir ${ruta}.`);
  }

  try {
    return await respuesta.json();
  } catch (causa) {
    throw new ErrorDeCarga(`${ruta} no contiene JSON válido.`, { cause: causa });
  }
}

/**
 * Igual que descargarJSON pero reutiliza la respuesta si ya se pidió.
 * Los fallos no quedan en caché, así "Reintentar" vuelve a pedir el archivo.
 * @param {string} ruta
 * @returns {Promise<unknown>}
 */
function pedirJSON(ruta) {
  if (!cache.has(ruta)) {
    const promesa = descargarJSON(ruta).catch((error) => {
      cache.delete(ruta);
      throw error;
    });
    cache.set(ruta, promesa);
  }
  return cache.get(ruta);
}

/**
 * @returns {Promise<{disciplinas: Array<{id: string, nombre: string}>, clases: Array<object>}>}
 */
export async function cargarClases() {
  const datos = await pedirJSON(RUTAS.clases);
  if (!Array.isArray(datos?.clases) || !Array.isArray(datos?.disciplinas)) {
    throw new ErrorDeCarga(`${RUTAS.clases} no tiene el formato esperado (disciplinas y clases).`);
  }
  return datos;
}

/**
 * @returns {Promise<Array<{id: string, nombre: string, acceso: string, precio: number, moneda: string}>>}
 */
export async function cargarPases() {
  const datos = await pedirJSON(RUTAS.pases);
  if (!Array.isArray(datos?.pases)) {
    throw new ErrorDeCarga(`${RUTAS.pases} no tiene el formato esperado (pases).`);
  }
  return datos.pases;
}

/**
 * Datos iniciales del usuario (equivale a la respuesta de un "GET /usuario").
 * @returns {Promise<{nombre: string, planId: string, reservas: Array<{claseId: string, dia: string}>}>}
 */
export async function cargarUsuario() {
  const datos = await pedirJSON(RUTAS.usuario);
  if (typeof datos?.nombre !== 'string' || typeof datos?.planId !== 'string' || !Array.isArray(datos?.reservas)) {
    throw new ErrorDeCarga(`${RUTAS.usuario} no tiene el formato esperado (nombre, planId y reservas).`);
  }
  return datos;
}

/**
 * Simula el envío de una consulta de contacto (equivale a un "POST /consultas").
 * No hay servidor, así que solo espera un instante y responde como si hubiera
 * sido aceptada. Con un backend real se reemplazaría por un fetch con method "POST".
 * @param {{nombre: string, email: string, mensaje: string}} consulta
 * @returns {Promise<{ok: true, recibidoEn: string}>}
 */
export function enviarConsulta(consulta) {
  return new Promise((resolve) => {
    const cuerpo = JSON.stringify(consulta);
    setTimeout(() => resolve({ ok: cuerpo.length > 0, recibidoEn: new Date().toISOString() }), RETARDO_ENVIO_MS);
  });
}
