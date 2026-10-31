/**
 * Página "Contacto": validación del formulario en el navegador y envío de la
 * consulta como JSON.
 */

import { enviarConsulta } from '../modulos/api.js';
import { obtenerPorId } from '../modulos/dom.js';
import { VALIDADORES_CONTACTO, validarConsulta } from '../modulos/validacion.js';
import { abrirDialogo } from '../componentes/dialogo.js';
import { mostrarAviso } from '../componentes/avisos.js';

const CAMPOS = Object.keys(VALIDADORES_CONTACTO);
const TEXTO_ENVIANDO = 'Enviando...';

/** Punto de entrada: lo llama main.js cuando carga la página. */
export function iniciar() {
  const formulario = obtenerPorId('contacto-form');
  const botonEnviar = obtenerPorId('contacto-enviar');

  // Para cada campo se guarda el control y el párrafo donde se muestra su error.
  const campos = Object.fromEntries(
    CAMPOS.map((nombre) => [
      nombre,
      { control: obtenerPorId(`contacto-${nombre}`), error: obtenerPorId(`contacto-${nombre}-error`) },
    ]),
  );

  /** Muestra u oculta el error de un campo y actualiza su estado accesible. */
  const mostrarError = (nombre, mensaje) => {
    const { control, error } = campos[nombre];
    const hayError = mensaje !== '';
    error.textContent = mensaje;
    error.hidden = !hayError;
    control.classList.toggle('formulario__control--invalido', hayError);
    control.setAttribute('aria-invalid', String(hayError));
  };

  const validarCampo = (nombre) => {
    const mensaje = VALIDADORES_CONTACTO[nombre](campos[nombre].control.value);
    mostrarError(nombre, mensaje);
  };

  for (const nombre of CAMPOS) {
    const { control } = campos[nombre];
    // Se valida al salir del campo y, una vez marcado el error, mientras se corrige.
    control.addEventListener('blur', () => validarCampo(nombre));
    control.addEventListener('input', () => {
      if (control.getAttribute('aria-invalid') === 'true') validarCampo(nombre);
    });
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (botonEnviar.disabled) return;

    const datos = Object.fromEntries(
      CAMPOS.map((nombre) => [nombre, campos[nombre].control.value.trim()]),
    );
    const { valido, errores } = validarConsulta(datos);

    for (const nombre of CAMPOS) mostrarError(nombre, errores[nombre] ?? '');

    if (!valido) {
      const primerCampoConError = CAMPOS.find((nombre) => errores[nombre]);
      campos[primerCampoConError].control.focus();
      return;
    }

    await enviar(datos);
  });

  /**
   * @param {{nombre: string, email: string, mensaje: string}} datos
   */
  async function enviar(datos) {
    const textoOriginal = botonEnviar.textContent;
    botonEnviar.disabled = true;
    botonEnviar.setAttribute('aria-busy', 'true');
    botonEnviar.textContent = TEXTO_ENVIANDO;

    try {
      await enviarConsulta({ ...datos, fecha: new Date().toISOString() });
      formulario.reset();
      for (const nombre of CAMPOS) mostrarError(nombre, '');

      await abrirDialogo({
        titulo: 'Mensaje enviado',
        mensaje: `Gracias, ${datos.nombre}. Recibimos tu consulta y te responderemos a ${datos.email}.`,
        acciones: [{ texto: 'Cerrar', valor: 'cerrar', variante: 'acento', principal: true }],
      });
    } catch (error) {
      console.error(error);
      mostrarAviso('No pudimos enviar tu mensaje. Intenta nuevamente.', 'error');
    } finally {
      botonEnviar.disabled = false;
      botonEnviar.removeAttribute('aria-busy');
      botonEnviar.textContent = textoOriginal;
    }
  }
}
