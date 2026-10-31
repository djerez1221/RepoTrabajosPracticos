/**
 * Página "Clases": catálogo renderizado desde data/clases.json, filtros por
 * disciplina y día, y selección de clases (carrito) con confirmación de la reserva.
 */

import { cargarClases } from '../modulos/api.js';
import { crearElemento, obtenerPorId } from '../modulos/dom.js';
import {
  agregarAlCarrito,
  confirmarCarrito,
  iniciarEstado,
  obtenerEstado,
  quitarDelCarrito,
  suscribir,
} from '../modulos/estado.js';
import {
  contarReservas,
  describirSesion,
  formatearHorario,
  listarDias,
  nombreDia,
} from '../modulos/formato.js';
import {
  ESTADO_SESION,
  UMBRAL_POCOS_CUPOS,
  claveSesion,
  cuposDisponibles,
  diasDisponibles,
  diasVisibles,
  estadoDeSesion,
  filtrarClases,
  hayConflicto,
  resolverSesiones,
  sesionDesdeClave,
} from '../modulos/reglas.js';
import { abrirDialogo } from '../componentes/dialogo.js';
import { mostrarAviso } from '../componentes/avisos.js';
import { mostrarMensajeEstado } from '../componentes/mensaje-estado.js';

/**
 * Cómo se presenta el botón de cada sesión según su situación.
 * `etiqueta` es el nombre accesible completo (el texto visible es solo "Reservar Cupo", etc.).
 */
const BOTON_POR_SITUACION = Object.freeze({
  [ESTADO_SESION.DISPONIBLE]: {
    texto: 'Reservar Cupo',
    variante: '',
    accion: 'agregar',
    deshabilitado: false,
    etiqueta: (descripcion) => `Reservar cupo en ${descripcion}`,
  },
  [ESTADO_SESION.SELECCIONADA]: {
    texto: 'Quitar',
    variante: 'secundario',
    accion: 'quitar',
    deshabilitado: false,
    etiqueta: (descripcion) => `Quitar ${descripcion} de la selección`,
  },
  [ESTADO_SESION.RESERVADA]: {
    texto: 'Reservada',
    variante: 'secundario',
    accion: '',
    deshabilitado: true,
    etiqueta: (descripcion) => `${descripcion}: ya reservada`,
  },
  [ESTADO_SESION.AGOTADA]: {
    texto: 'Sin cupos',
    variante: 'secundario',
    accion: '',
    deshabilitado: true,
    etiqueta: (descripcion) => `${descripcion}: sin cupos disponibles`,
  },
});

/**
 * @typedef {object} Contexto
 * @property {object} refs - Elementos del DOM que usa la página.
 * @property {{disciplinas: Array<object>, clases: Array<object>}} datos - Contenido de clases.json.
 * @property {Map<string, object>} clasesPorId
 */

/** Punto de entrada: lo llama main.js cuando carga la página. */
export async function iniciar() {
  const refs = {
    formulario: obtenerPorId('filtros-form'),
    filtroDisciplina: obtenerPorId('filtro-disciplina'),
    filtroDia: obtenerPorId('filtro-dia'),
    resultados: obtenerPorId('catalogo-resultados'),
    catalogo: obtenerPorId('catalogo'),
    resumenLista: obtenerPorId('resumen-lista'),
    resumenTotal: obtenerPorId('resumen-total'),
    botonConfirmar: obtenerPorId('resumen-confirmar'),
  };
  await cargarVista(refs);
}

/**
 * Pide los datos, arma la vista y conecta los eventos. Si falla, ofrece reintentar.
 * Los eventos se conectan solo cuando la carga termina bien, por eso un reintento no los duplica.
 * @param {object} refs
 */
async function cargarVista(refs) {
  mostrarMensajeEstado(refs.catalogo, { tipo: 'carga', texto: 'Cargando clases...' });

  let datos;
  try {
    [datos] = await Promise.all([cargarClases(), iniciarEstado()]);
  } catch (error) {
    console.error(error);
    mostrarMensajeEstado(refs.catalogo, {
      tipo: 'error',
      texto: 'No pudimos cargar las clases. Intenta nuevamente en unos instantes.',
      accion: { texto: 'Reintentar', alHacerClic: () => cargarVista(refs) },
    });
    return;
  }

  /** @type {Contexto} */
  const contexto = {
    refs,
    datos,
    clasesPorId: new Map(datos.clases.map((clase) => [clase.id, clase])),
  };

  llenarFiltros(contexto);
  conectarEventos(contexto);
  pintar(contexto);
}

/** Agrega al select de disciplina y de día las opciones que existen en los datos. */
function llenarFiltros({ refs, datos }) {
  const opcionesDisciplina = datos.disciplinas.map(({ id, nombre }) =>
    crearElemento('option', { texto: nombre, atributos: { value: id } }),
  );
  const opcionesDia = diasDisponibles(datos.clases).map((dia) =>
    crearElemento('option', { texto: nombreDia(dia), atributos: { value: dia } }),
  );
  refs.filtroDisciplina.append(...opcionesDisciplina);
  refs.filtroDia.append(...opcionesDia);
}

/** @param {Contexto} contexto */
function conectarEventos(contexto) {
  const { refs } = contexto;
  const repintarCatalogo = () => pintarCatalogo(contexto);

  refs.formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    repintarCatalogo();
  });
  refs.filtroDisciplina.addEventListener('change', repintarCatalogo);
  refs.filtroDia.addEventListener('change', repintarCatalogo);
  // "reset" se dispara antes de que el navegador limpie los campos: se espera un instante.
  refs.formulario.addEventListener('reset', () => setTimeout(repintarCatalogo, 0));

  // Delegación de eventos: un solo listener atiende todos los botones de las tarjetas.
  refs.catalogo.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    alternarSesion(contexto, boton.dataset.accion, sesionDesdeClave(boton.dataset.sesion));
  });

  refs.resumenLista.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-sesion]');
    if (boton) quitarDelCarrito(sesionDesdeClave(boton.dataset.sesion));
  });

  refs.botonConfirmar.addEventListener('click', () => confirmarReserva(contexto));

  // Cualquier cambio del estado (acá o en otra pestaña) vuelve a dibujar ambas vistas.
  suscribir(() => pintar(contexto));
}

/** @param {Contexto} contexto */
function pintar(contexto) {
  pintarCatalogo(contexto);
  pintarResumen(contexto);
}

/**
 * Ejecuta `renderizar` y, si el foco estaba dentro del contenedor, lo devuelve al
 * botón de la misma sesión (o al primero disponible) para no perderlo al redibujar.
 * @param {HTMLElement} contenedor
 * @param {() => void} renderizar
 */
function conservarFoco(contenedor, renderizar) {
  const activo = document.activeElement;
  const teniaFoco = contenedor.contains(activo);
  const sesion = teniaFoco ? activo.dataset.sesion : undefined;

  renderizar();

  if (!teniaFoco) return;
  const botones = [...contenedor.querySelectorAll('button[data-sesion]:not(:disabled)')];
  const destino = botones.find((boton) => boton.dataset.sesion === sesion) ?? botones[0];
  destino?.focus();
}

/** @param {Contexto} contexto */
function pintarCatalogo({ refs, datos }) {
  const filtros = { disciplina: refs.filtroDisciplina.value, dia: refs.filtroDia.value };
  const clases = filtrarClases(datos.clases, filtros);
  const estado = obtenerEstado();

  refs.resultados.textContent = `${clases.length} ${clases.length === 1 ? 'clase encontrada' : 'clases encontradas'}`;

  conservarFoco(refs.catalogo, () => {
    if (clases.length === 0) {
      mostrarMensajeEstado(refs.catalogo, {
        tipo: 'vacio',
        texto: 'No hay clases que coincidan con los filtros elegidos.',
      });
      return;
    }
    refs.catalogo.replaceChildren(...clases.map((clase) => crearTarjeta(clase, filtros.dia, estado)));
  });
}

/**
 * @param {object} clase
 * @param {string} filtroDia
 * @param {{reservas: Array<object>, carrito: Array<object>}} estado
 * @returns {HTMLElement}
 */
function crearTarjeta(clase, filtroDia, estado) {
  const sesiones = diasVisibles(clase, filtroDia).map((dia) => crearSesion(clase, dia, estado));

  return crearElemento('article', { clase: 'tarjeta-clase' }, [
    crearElemento('img', {
      clase: 'tarjeta-clase__imagen',
      atributos: { src: clase.imagen.src, alt: clase.imagen.alt, loading: 'lazy' },
    }),
    crearElemento('div', { clase: 'tarjeta-clase__cuerpo' }, [
      crearElemento('h3', { clase: 'tarjeta-clase__titulo', texto: clase.nombre }),
      crearElemento('p', { texto: `Días: ${listarDias(clase.dias)} - ${formatearHorario(clase.horario)}` }),
      crearElemento('p', { texto: `${clase.profesor.rol}: ${clase.profesor.nombre}` }),
      crearElemento('ul', { clase: 'tarjeta-clase__sesiones' }, sesiones),
    ]),
  ]);
}

/**
 * Una fila de la tarjeta: día, cupos y botón de reserva.
 * @returns {HTMLElement}
 */
function crearSesion(clase, dia, estado) {
  const disponibles = cuposDisponibles(clase, dia, estado.reservas);
  const presentacion = BOTON_POR_SITUACION[estadoDeSesion(clase, dia, estado)];
  const descripcion = describirSesion(clase, dia);

  let claseCupos = 'tarjeta-clase__cupos';
  if (disponibles === 0) claseCupos += ' tarjeta-clase__cupos--agotado';
  else if (disponibles <= UMBRAL_POCOS_CUPOS) claseCupos += ' tarjeta-clase__cupos--pocos';

  const boton = crearElemento('button', {
    clase: ['boton', 'tarjeta-clase__boton', presentacion.variante && `boton--${presentacion.variante}`]
      .filter(Boolean)
      .join(' '),
    texto: presentacion.texto,
    atributos: {
      type: 'button',
      disabled: presentacion.deshabilitado,
      'aria-label': presentacion.etiqueta(descripcion),
    },
    dataset: presentacion.deshabilitado ? {} : { accion: presentacion.accion, sesion: claveSesion(clase.id, dia) },
  });

  return crearElemento('li', { clase: 'tarjeta-clase__sesion' }, [
    crearElemento('span', { clase: 'tarjeta-clase__dia', texto: nombreDia(dia) }),
    crearElemento('span', { clase: claseCupos, texto: `Cupos: ${disponibles} de ${clase.cuposTotales}` }),
    boton,
  ]);
}

/**
 * Agrega o quita una sesión de la selección, aplicando las reglas de negocio.
 * @param {Contexto} contexto
 * @param {'agregar'|'quitar'} accion
 * @param {{claseId: string, dia: string}} sesion
 */
function alternarSesion({ clasesPorId }, accion, sesion) {
  const clase = clasesPorId.get(sesion.claseId);
  if (!clase) return;
  const descripcion = describirSesion(clase, sesion.dia);

  if (accion === 'quitar') {
    quitarDelCarrito(sesion);
    mostrarAviso(`Se quitó de la selección: ${descripcion}.`, 'info');
    return;
  }

  const estado = obtenerEstado();
  if (estadoDeSesion(clase, sesion.dia, estado) !== ESTADO_SESION.DISPONIBLE) return;

  if (hayConflicto(sesion, [...estado.reservas, ...estado.carrito], clasesPorId)) {
    mostrarAviso(`No se puede seleccionar ${descripcion}: ya hay otra clase el mismo día y horario.`, 'error');
    return;
  }

  if (agregarAlCarrito(sesion)) {
    mostrarAviso(`Agregada a tu selección: ${descripcion}.`, 'exito');
  }
}

/** @param {Contexto} contexto */
function pintarResumen({ refs, clasesPorId }) {
  const seleccion = resolverSesiones(obtenerEstado().carrito, clasesPorId);

  conservarFoco(refs.resumenLista, () => {
    if (seleccion.length === 0) {
      refs.resumenLista.replaceChildren(
        crearElemento('li', { clase: 'resumen-reservas__vacio', texto: 'Aún no hay clases seleccionadas.' }),
      );
      return;
    }

    refs.resumenLista.replaceChildren(
      ...seleccion.map(({ clase, claseId, dia }) => {
        const descripcion = describirSesion(clase, dia);
        return crearElemento('li', { clase: 'resumen-reservas__item' }, [
          crearElemento('span', { texto: descripcion }),
          crearElemento('button', {
            clase: 'boton boton--secundario boton--compacto',
            texto: 'Quitar',
            atributos: { type: 'button', 'aria-label': `Quitar ${descripcion} de la selección` },
            dataset: { sesion: claveSesion(claseId, dia) },
          }),
        ]);
      }),
    );
  });

  refs.resumenTotal.textContent = `Total: ${contarReservas(seleccion.length)}`;
  refs.botonConfirmar.disabled = seleccion.length === 0;
}

/**
 * Confirma la selección: revalida los cupos, registra las reservas y muestra
 * la pantalla de confirmación.
 * @param {Contexto} contexto
 */
async function confirmarReserva({ clasesPorId }) {
  const estado = obtenerEstado();
  const seleccion = resolverSesiones(estado.carrito, clasesPorId);

  // Se descartan las sesiones que ya no existen en el catálogo.
  const vigentes = new Set(seleccion.map(({ claseId, dia }) => claveSesion(claseId, dia)));
  estado.carrito
    .filter((sesion) => !vigentes.has(claveSesion(sesion.claseId, sesion.dia)))
    .forEach(quitarDelCarrito);

  // Se revalida: los cupos pudieron cambiar desde que se eligió la clase.
  const sinCupo = seleccion.filter(({ clase, dia }) => cuposDisponibles(clase, dia, estado.reservas) === 0);
  if (sinCupo.length > 0) {
    sinCupo.forEach(quitarDelCarrito);
    const detalle = sinCupo.map(({ clase, dia }) => describirSesion(clase, dia)).join(', ');
    mostrarAviso(`Se quitaron de la selección las clases sin cupo: ${detalle}.`, 'error');
    return;
  }
  if (seleccion.length === 0) return;

  const reservadas = resolverSesiones(confirmarCarrito(), clasesPorId);

  await abrirDialogo({
    titulo: 'Reserva confirmada',
    mensaje: `Total confirmado: ${contarReservas(reservadas.length)}. Puedes ver y cancelar tus reservas desde Mi Cuenta.`,
    items: reservadas.map(({ clase, dia }) => describirSesion(clase, dia)),
    acciones: [
      { texto: 'Seguir viendo clases', valor: 'seguir', variante: 'secundario' },
      { texto: 'Ir a Mi Cuenta', href: 'mi-cuenta.html', variante: 'acento', principal: true },
    ],
  });
}
