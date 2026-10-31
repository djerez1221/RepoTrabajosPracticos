/**
 * Menú de navegación desplegable para pantallas chicas (botón "hamburguesa").
 * El HTML ya trae el menú completo: sin JavaScript sigue siendo usable porque
 * el CSS solo lo oculta cuando <html> tiene la clase "js".
 */

const MEDIA_ESCRITORIO = '(min-width: 48em)';
const CLASE_ABIERTO = 'navegacion--abierta';

/**
 * Activa el botón del menú. No hace nada si la página no lo tiene.
 */
export function iniciarMenu() {
  const boton = document.getElementById('menu-boton');
  const navegacion = document.getElementById('navegacion-principal');
  if (!boton || !navegacion) return;

  const mediaEscritorio = window.matchMedia(MEDIA_ESCRITORIO);

  const establecer = (abierto) => {
    navegacion.classList.toggle(CLASE_ABIERTO, abierto);
    boton.setAttribute('aria-expanded', String(abierto));
  };

  boton.addEventListener('click', () => {
    establecer(boton.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
      establecer(false);
      boton.focus();
    }
  });

  // Al pasar a escritorio el menú siempre se ve: se limpia el estado del botón.
  mediaEscritorio.addEventListener('change', (evento) => {
    if (evento.matches) establecer(false);
  });
}
