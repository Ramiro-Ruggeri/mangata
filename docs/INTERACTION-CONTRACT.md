# Interacciones y capas · segunda pasada

## Integración

`ExperienceProvider` se monta una vez en el layout, envolviendo los consumidores de carrito, privacidad y contenido. No debe llevar una `key` de ruta: preserva el estado de la bolsa. Importa `experience.css` internamente.

API de `@/components/experience/ExperienceProvider`:

```tsx
const { activeOverlay, openOverlay, closeOverlay } = useExperience();
const open = activeOverlay === "search";
// Abrir reemplaza al overlay anterior.
openOverlay("search");
// Un cleanup tardío de otro nombre no cierra el overlay vigente.
closeOverlay("search");
```

Nombres de integración: `search`, `menu`, `cart`, `zoom`, `privacy`. Cada consumidor deriva visibilidad de esta única fuente, no de un booleano paralelo. La navegación a otra ruta limpia el overlay, sin reiniciar hijos ni bolsa.

El provider bloquea el scroll de `html`/`body`, compensa el gutter del scrollbar y restaura los estilos anteriores al salir del último overlay. No repetir estas escrituras en cada diálogo. El bloqueo permanece al sustituir un modal por otro. `document.documentElement.dataset.activeOverlay` refleja el nombre vigente y se elimina al cerrar; las restauraciones asíncronas de foco pueden consultarlo para no robar foco al modal que reemplazó al anterior.

La semántica modal, `showModal`, cierre nativo, Escape, foco inicial y retorno al disparador pertenecen al diálogo/hook reutilizable. Usar el coordinador no convierte por sí solo un panel en un modal accesible. No se añadieron nuevas ventanas comerciales.

Montar `<ScrollReturnControl />` una sola vez dentro de `ExperienceProvider`. El componente sólo reinicia su propia sesión al cambiar el pathname.

Agregar `data-scroll-anchor="product-SKU"` estable a tarjetas y bloques importantes. Los `id` de secciones dentro de `main` funcionan como respaldo. `data-scroll-start` puede marcar el encabezado de destino inicial; si falta, se usa `main h1` o `main`.

## Subir y volver

- Aparece después de una altura de viewport, con mínimo de 480 px para vistas bajas.
- Primera acción: guarda ruta, posición y ancla visible con offset, y sube al inicio. No recarga ni modifica filtros, expansión o bolsa.
- El mismo control pasa a flecha descendente con nombre «Volver a donde estaba» y acento violeta contenido.
- Segunda acción: resuelve la posición actual del ancla y vuelve a su offset. Si el ancla desapareció, usa la coordenada previa limitada a la altura real del documento. No busca un producto diferente por índice.
- Tras volver, el control retoma «Subir al inicio» si corresponde a esa profundidad.
- Un cambio de ruta invalida el punto. Seguir navegando manualmente a más de 96 px del inicio también lo descarta. El pequeño movimiento accidental cerca del inicio no lo borra.
- Wheel, touch, navegación por teclado y nuevos clics cancelan un recorrido en curso. Tab cancela el foco pendiente para no interrumpir la navegación de teclado. Un nuevo modal también cancela el recorrido.
- El movimiento es nativo. Se observa el scroll real con `requestAnimationFrame` únicamente durante el recorrido, con límite de seguridad; no hay bucles permanentes ni duración de animación simulada con un timer.
- Al llegar se enfoca el encabezado inicial o el ancla de retorno sin otro desplazamiento y se anuncia el resultado. Los destinos no interactivos reciben `tabindex=-1` temporal hasta blur. No se mueve el foco detrás de un modal abierto.
- `prefers-reduced-motion` usa desplazamiento instantáneo y conserva las mismas acciones y confirmación.

## Colisiones y targets

El control mide 50 × 50 px. El tooltip sólo complementa el nombre accesible; la interacción no depende del hover. Se oculta durante cualquier overlay o teclado virtual detectado. Respeta safe areas.

El offset inferior suma las variables medidas por sus respectivos propietarios:

```css
bottom: calc(16px + env(safe-area-inset-bottom)
  + var(--consent-banner-height, 0px)
  + var(--mobile-purchase-height, 0px));
```

Los valores deben volver a `0px` al desaparecer su componente. No medir sólo una vez si el texto, zoom u orientación pueden modificar la altura. No colocar otro FAB en la misma esquina.

## Motion y capas compartidas

`motionTokens` exporta duraciones en segundos para Motion: feedback `.16`, overlay `.24`, editorial `.4`, desplazamiento `8` y ease `[.22, 1, .36, 1]`. `experience.css` define sus equivalentes CSS en milisegundos.

Capas: header `40`, flotante `65`, compra `75`, aviso de consentimiento `100`, overlay `220`. Un `dialog.showModal()` usa la top layer nativa; el orden de z-index no sustituye al coordinador ni al aislamiento modal.

Los rangos permiten feedback inmediato y movimientos cortos. Reduced motion elimina transformación y transición del control. No se agregaron cursores, parallax o movimiento perpetuo.

## Validación

`node --import tsx --test tests/experience.test.ts` cubre exclusión/reemplazo de overlays, cierre obsoleto, retorno por ancla y offset tras cambios de layout, ruta distinta, ancla desaparecida, límites del documento, umbral y descarte por navegación manual.

Estas son pruebas puras, no pruebas de navegador. Foco real, Escape, colisiones, rápida repetición, reduced motion y vistas responsive deben verificarse en la integración de navegador y registrarse separadamente en el QA de release.
