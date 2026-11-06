# Fase E: Reflejo sobre la tienda actual

La tienda ya vende por búsqueda orgánica, así que se evoluciona: misma estructura, mismos textos y mismas URLs.

## Decisiones

- **Tema por defecto: oscuro.** Es la identidad Reflejo. La elección de cada visitante queda guardada. Para seguir la preferencia del sistema operativo solo hay que cambiar `THEME_BOOT_SCRIPT`.
- **Colores:** toda la tienda lee las variables de `src/components/theme/theme.css`. No se escriben colores nuevos en los componentes, salvo controles pintados sobre una foto y la escena nocturna de materiales.
- **Orden de los CSS:** `storefront.css` y `product.css` cargan después de `theme.css`. Lo que pise una regla de esos archivos va en ellos. El modo de desarrollo no siempre muestra esta diferencia: verificar en un build de producción.
- **Presentación de marca:** una vez por sesión y 460 ms. Antes tapaba la pantalla 680 ms en cada carga, cambio de página y regreso a la pestaña.
- **Colección:** en "Nuestra selección", lo disponible va antes que lo vendido.
- **Producto:** suma "Otras piezas disponibles", en el HTML inicial, con la categoría más cercana primero.
- **Almacenamiento:** `mangata_theme` y `mangata_intro` no guardan datos personales y figuran en `/privacidad`.

## Revisión de dirección de arte

- **Grilla completa:** las 26 piezas se muestran en la colección. Reemplaza a "Ver más piezas" y a la lista "Todas las piezas", que existía solo para que los buscadores encontraran cada producto. Los enlaces ahora son las propias tarjetas. Si el catálogo crece mucho, corresponde una página de colección.
- **Encuadre:** las tarjetas llenan su formato 3:4, porque 22 de 33 fotos ya lo tienen. Las más altas se recortan arriba y abajo en la tarjeta; la ficha de producto siempre muestra la foto entera.
- **Tarjetas:** foto, categoría, nombre, precio y bolsa. Sin miniaturas ni flecha: la foto es el enlace.
- **Ritmo:** una banda invertida en "Antes de elegir".

## Rollback

Volver a la imagen anterior. No hay cambios de base ni de datos.
