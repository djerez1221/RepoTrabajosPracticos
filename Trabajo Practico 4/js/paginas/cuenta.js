/**
 * Página "Mi Cuenta": datos del usuario, plan activo y reservas confirmadas,
 * con posibilidad de cancelarlas.
 */

import { cargarClases, cargarPases } from '../modulos/api.js';
import { crearElemento, obtenerPorId } from '../modulos/dom.js';
import { cancelarReserva, iniciarEstado, obtenerEstado, suscribir } from '../modulos/estado.js';
import { describirSesion } from '../modulos/formato.js';
import { claveSesion, resolverSesiones, sesionDesdeClave } from '../modulos/reglas.js';
import { confirmar } from '../componentes/dialogo.js';
import { mostrarAviso } from '../componentes/avisos.js';
import { mostrarMensajeEstado } from '../componentes/mensaje-estado.js';

/** Punto de entrada: lo llama main.js cuando carga la página. */
export async function iniciar() {
  const refs = {
    estado: obtenerPorId('cuenta-estado'),
    usuario: obtenerPorId('cuenta-usuario'),
    plan: obtenerPorId('cuenta-plan'),
    reservas: obtenerPorId('reservas-lista'),
  };
  await cargarVista(refs);
}

/**
 * @param {{estado: HTMLElement, usuario: HTMLElement, plan: HTMLElement, reservas: HTMLElement}} refs
 */
async function cargarVista(refs) {
  mostrarMensajeEstado(refs.estado, { tipo: 'carga', texto: 'Cargando tu cuenta...' });

  let datos;
  try {
    const [catalogo, pases] = await Promise.all([cargarClases(), cargarPases(), iniciarEstado()]);
    datos = { clasesPorId: new Map(catalogo.clases.map((clase) => [clase.id, clase])), pases };
  } catch (error) {
    console.error(error);
    mostrarMensajeEstado(refs.estado, {
      tipo: 'error',
      texto: 'No pudimos cargar los datos de tu cuenta. Intenta nuevamente en unos instantes.',
      accion: { texto: 'Reintentar', alHacerClic: () => cargarVista(refs) },
    });
    return;
  }

  refs.estado.replaceChildren();

  const pintar = () => pintarCuenta(refs, datos);
  pintar();
  suscribir(pintar);

  refs.reservas.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-sesion]');
    if (boton) cancelar(datos.clasesPorId, sesionDesdeClave(boton.dataset.sesion));
  });
}

/**
 * @param {object} refs
 * @param {{clasesPorId: Map<string, object>, pases: Array<object>}} datos
 */
function pintarCuenta(refs, { clasesPorId, pases }) {
  const estado = obtenerEstado();
  const plan = pases.find((pase) => pase.id === estado.usuario.planId);

  refs.usuario.textContent = estado.usuario.nombre;
  refs.plan.textContent = plan ? plan.nombre : 'Sin plan activo';

  const reservas = resolverSesiones(estado.reservas, clasesPorId);

  if (reservas.length === 0) {
    refs.reservas.replaceChildren(
      crearElemento('li', { clase: 'lista-reservas__vacio' }, [
        crearElemento('span', { texto: 'No tienes reservas activas.' }),
        crearElemento('a', { clase: 'boton boton--acento', texto: 'Ver clases', atributos: { href: 'clases.html' } }),
      ]),
    );
    return;
  }

  refs.reservas.replaceChildren(
    ...reservas.map(({ clase, claseId, dia }) => {
      const descripcion = describirSesion(clase, dia);
      return crearElemento('li', { clase: 'lista-reservas__item' }, [
        crearElemento('span', { texto: descripcion }),
        crearElemento('button', {
          clase: 'boton boton--peligro',
          texto: 'Cancelar',
          atributos: { type: 'button', 'aria-label': `Cancelar reserva de ${descripcion}` },
          dataset: { sesion: claveSesion(claseId, dia) },
        }),
      ]);
    }),
  );
}

/**
 * @param {Map<string, object>} clasesPorId
 * @param {{claseId: string, dia: string}} sesion
 */
async function cancelar(clasesPorId, sesion) {
  const clase = clasesPorId.get(sesion.claseId);
  if (!clase) return;
  const descripcion = describirSesion(clase, sesion.dia);

  const acepto = await confirmar({
    titulo: '¿Cancelar la reserva?',
    mensaje: descripcion,
    textoAceptar: 'Cancelar reserva',
    destructiva: true,
  });
  if (!acepto) return;

  cancelarReserva(sesion);
  mostrarAviso(`Se canceló la reserva: ${descripcion}.`, 'exito');
}
