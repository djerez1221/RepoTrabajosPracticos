/**
 * Acceso a localStorage con tolerancia a fallos.
 * localStorage puede lanzar excepciones (modo privado, cuota llena, bloqueo
 * por el navegador), por eso nunca se usa directamente fuera de este módulo.
 */

/**
 * @param {string} clave
 * @returns {unknown|null} El valor guardado, o null si no existe o no se pudo leer.
 */
export function leer(clave) {
  try {
    const texto = localStorage.getItem(clave);
    return texto === null ? null : JSON.parse(texto);
  } catch (error) {
    console.warn(`No se pudo leer "${clave}" del almacenamiento local.`, error);
    return null;
  }
}

/**
 * @param {string} clave
 * @param {unknown} valor - Debe ser serializable a JSON.
 * @returns {boolean} true si se guardó correctamente.
 */
export function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.warn(`No se pudo guardar "${clave}" en el almacenamiento local.`, error);
    return false;
  }
}
