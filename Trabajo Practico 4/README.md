# Sísifo Gym - SP4 y SP5 (integración con JavaScript)

Aplicaciones Web 1 - Sistemas - Prof. Andrés Senn (2026s2)
Alumno: David Gabriel Jerez

Sitio front-end de reserva de clases y venta de pases. Los datos se obtienen de
archivos JSON con `fetch` y la interfaz se dibuja con JavaScript (módulos ES).

## Cómo ejecutarlo

El sitio **debe abrirse desde un servidor HTTP**. Con doble clic sobre `index.html`
(protocolo `file://`) el navegador bloquea `fetch` y los módulos ES.

- Visual Studio Code: extensión **Live Server** -> botón "Go Live".
- Python: `python -m http.server 8000` y abrir <http://localhost:8000>.
- Node: `npx serve`.

Las reservas, la selección en curso y el plan activo se guardan en `localStorage`.
Para volver al estado inicial: borrar los datos del sitio o ejecutar
`localStorage.clear()` en la consola del navegador.

## Estructura

```
index.html, clases.html, pases.html, contacto.html, mi-cuenta.html
assets/img/        logo y fotos de las clases
css/styles.css     hoja de estilos única (BEM en español)
data/              clases.json, pases.json, usuario.json (simulan la API REST)
js/
  main.js          punto de entrada: carga el módulo de cada página
  modulos/         api, almacenamiento, dom, estado, formato, reglas, validacion
  componentes/     avisos, dialogo, menu, mensaje-estado
  paginas/         clases, pases, cuenta, contacto
informe-SP4-SP5.pdf
```

## Qué incluye

- Catálogo de clases y tabla de pases renderizados desde JSON.
- Filtros por disciplina y día (eventos `submit`, `change` y `reset`).
- Selección de clases (carrito), confirmación de reserva y cancelación desde Mi Cuenta.
- Compra de pases con pantalla de confirmación.
- Formulario de contacto con validación y mensajes bajo cada campo.
- Menú desplegable en móvil.
- Estados de carga, error con reintento y sin resultados.
