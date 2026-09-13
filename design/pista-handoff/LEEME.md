# Pista: entrega para implementación

Prototipo navegable: https://pista-automovilismo-argentino.leobastianelli.chatgpt.site

## Qué incluye

- Inicio: `index.html`
- Evento: `evento.html`
- Piloto: `piloto.html`
- Categoría: `categoria.html`
- Histórico: `historico.html`
- Sistema visual: `sistema.html`

Cada pantalla tiene diseño responsive para 390 px y 1440 px. Los filtros de la agenda, el menú móvil y la clasificación expandible funcionan.

## Archivos

La carpeta `sitio` contiene HTML, CSS, JavaScript, imágenes y favicon. Se puede abrir `index.html` directamente o usarla como referencia para llevar las pantallas al stack del producto.

Los estilos principales están en `sitio/assets/styles.css`. Las variables del comienzo del archivo contienen la paleta y la escala de espaciado.

## Decisiones que hay que mantener

- Una sola familia tipográfica: Archivo Variable.
- Horarios y resultados con números tabulares.
- Sin logos oficiales. Cada categoría usa un código corto y un color propio.
- Celeste para argentinos y acciones propias.
- Rojo reservado para estados en vivo.
- Bordes rectos y composición editorial. No convertir cada bloque en una tarjeta.
- Los estados previstos son: en vivo, próxima, finalizada y sin datos.

## Antes de conectar datos reales

El contenido y los resultados son datos de muestra. Hay que reemplazarlos por la fuente de datos elegida y conservar la hora `America/Argentina/Buenos_Aires` al mostrar cronogramas.

Las imágenes son originales para este prototipo y no contienen marcas oficiales.
