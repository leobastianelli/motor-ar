Necesito la identidad visual de **Fierros**, un sitio argentino de automovilismo. Es como "Promiedos", pero para el deporte motor: horarios, resultados en vivo, argentinos corriendo afuera (Colapinto en F1, Varrone en F2), categorías nacionales (Turismo Carretera, TC2000, Turismo Nacional) e historia (Fangio, Reutemann, Traverso).

**El nombre.** "Fierros" es como se le dice en Argentina a los autos de carrera y a la mecánica ("le gustan los fierros"). Es popular, de taller, de autódromo de pueblo y de domingo con la radio prendida. No es premium ni europeo.

**Qué tiene que transmitir**
- Velocidad y precisión, como una planilla de cronometraje o un tablero de boxes.
- Argentinidad sutil: nada de mate, gauchos, soles de mayo ni banderas literales.
- Que se lea perfecto a 16 px, como favicon.

**Qué evitar**
- Nada que parezca generado por IA: sin degradés brillantes ni neón, sin 3D, sin rayos de velocidad genéricos ni cascos o autos dibujados de clip-art.
- Sin banderas a cuadros obvias, salvo que tengan una vuelta muy original.
- No copiar logos de F1, ACTC, TC2000 ni de ninguna marca.

**Sistema visual existente (respetarlo)**
- Tipografía: **Archivo Variable**, que usa el eje de ancho `wdth` (condensada o expandida) y números tabulares. El logotipo puede partir de Archivo modificada o dibujarse a mano con esa lógica.
- Paleta:
  - tinta `#101213`
  - papel `#f1f2f0`
  - blanco `#ffffff`
  - celeste `#75bee9` (color principal de marca, guiño argentino)
  - azul profundo `#16658f`
  - rojo `#dc3e25`
  - amarillo `#f5c640`
  - verde `#287e58`
  - gris `#666b6d`
- Estética: editorial y deportiva, con bloques planos, contraste fuerte y códigos cortos de categoría (F1, TC, T2K, TN) en cajas. Se parece más a un diario deportivo con cronometraje que a una app.
- Hoy el header muestra el texto "Fie**rros**", con "rros" en negrita. El favicon provisorio es una "F" celeste sobre un cuadrado negro. Podés mejorar ambas ideas o descartarlas.

**Entregables**
1. **Tres direcciones distintas** de logo, cada una con su concepto explicado en dos líneas. Después, desarrollar la elegida.
2. Variantes:
   - logotipo horizontal;
   - isotipo/símbolo solo;
   - versión en una tinta;
   - versión negativa (sobre `#101213`) y positiva (sobre `#f1f2f0`).
3. Favicon e íconos de app:
   - `icon.svg` con viewBox 32×32, legible a 16 px y hecho con formas simples, sin texto chico;
   - `apple-icon.png` de 180×180;
   - `icon-192.png` e `icon-512.png`;
   - una versión maskable con margen seguro del 20 %.
4. Imagen para compartir en redes (Open Graph) de 1200×630: logo, bajada "Automovilismo argentino, al minuto" y fondo de la paleta.
5. Avatar cuadrado para redes (X, Instagram, YouTube) que funcione recortado en círculo.
6. Mini guía de uso: área de respeto, tamaño mínimo, qué no hacer y los colores de cada versión.

**Formato**
- Todo en **SVG limpio**: paths optimizados, sin imágenes embebidas ni filtros, y el texto convertido a curvas en el logo final. Los PNG van exportados desde esos SVG.
- Nombres de archivo: `logo-horizontal.svg`, `logo-simbolo.svg`, `logo-negativo.svg`, `icon.svg`, `apple-icon.png`, `opengraph-image.png`, `avatar.png`.
- Los íconos van a una app Next.js: `icon.svg`, `apple-icon.png` y `opengraph-image.png` van en `src/app/`, así que tienen que funcionar sin modificaciones.
