/**
 * Punto de entrada único del sitio. Todas las páginas cargan este archivo.
 *
 * Cada página declara quién es con data-pagina en el <body>. Acá se inicia lo
 * común (menú y avisos) y se carga, solo cuando hace falta, el módulo propio
 * de esa página con import() dinámico.
 */

import { iniciarMenu } from './componentes/menu.js';
import { iniciarAvisos, mostrarAviso } from './componentes/avisos.js';

/** Módulo de cada página que tiene lógica propia. "inicio" no necesita ninguno. */
const PAGINAS = Object.freeze({
  clases: () => import('./paginas/clases.js'),
  pases: () => import('./paginas/pases.js'),
  cuenta: () => import('./paginas/cuenta.js'),
  contacto: () => import('./paginas/contacto.js'),
});

async function arrancar() {
  iniciarMenu();
  iniciarAvisos();

  const cargarPagina = PAGINAS[document.body.dataset.pagina];
  if (!cargarPagina) return;

  try {
    const pagina = await cargarPagina();
    await pagina.iniciar();
  } catch (error) {
    console.error('Error al iniciar la página:', error);
    mostrarAviso('Ocurrió un error inesperado. Recarga la página e intenta de nuevo.', 'error');
  }
}

arrancar();
