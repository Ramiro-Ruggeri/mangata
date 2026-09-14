# MANGATA · Dirección de arte y conversión

Auditoría del código y de ocho fotografías reales del catálogo. Las observaciones sobre tamaños provienen del CSS existente; deben verificarse después en navegador. Las recomendaciones de conversión son hipótesis, no resultados medidos.

## Decisión visual

Una prenda reconocible debe sostener la apertura. Baggy Foil (`MNGT-003`) es la mejor candidata entre las imágenes inspeccionadas: el contraste entre negro, denim y foil comunica la intervención aun en pantalla pequeña. Tiene dos imágenes y una descripción que confirma el tratamiento manual. La fotografía tiene un fondo negro opaco; el escenario debe ser negro para integrarla sin un rectángulo visible. Preservar la prenda completa, su percha, proporciones y color.

Campera de Jean (`MNGT-008`) es una alternativa con tres vistas, pero su intervención oscura pierde presencia al reducirla. Pollera Foil (`MNGT-005`) y Blazer Cuadrillé (`MNGT-009`) aportan siluetas y colores distintos para la primera selección. Evitar presentar muchas prendas superpuestas: se pierde qué se vende y qué se puede tocar.

Usar la campaña de denim y metal existente como pausa editorial después de la colección. Es una composición conceptual generada y no demuestra el proceso real de fabricación de MANGATA. No describirla como una fotografía del taller ni como material de un SKU.

## Tres rutas de copy

**Denim con otra vida.**

“Prendas recuperadas e intervenidas a mano en Córdoba. De cada una, hay una sola.”

CTA: “Ver las piezas”. Esta es la ruta recomendada cuando el hero muestra Baggy Foil o Campera de Jean.

**La próxima historia se usa.**

“Denim, sastrería y accesorios que volvemos a trabajar, pieza por pieza.”

CTA: “Explorar la colección”. Es más editorial y necesita que la foto y la colección visible expliquen rápido el producto.

**Una prenda. Otra forma.**

“Recuperamos ropa y la intervenimos a mano. Esta selección está lista para salir.”

CTA: “Ver lo disponible”. Abarca prendas y accesorios sin limitar la marca al denim.

Mantener una sola ruta en toda la apertura. Usar marca dominante, título breve, un párrafo de dos líneas y un botón principal. El precio y nombre de la prenda protagonista pueden funcionar como acceso secundario a su ficha.

## Jerarquía comercial

- Header sencillo: marca, colección, búsqueda, bolsa. “Cómo trabajamos” comunica más que “Proceso” en navegación.
- Hero: foto real grande, título legible y CTA inmediato. Las palabras no deben tapar la intervención que justifica el producto.
- Confianza breve: método de pago efectivamente disponible, atención por WhatsApp y entrega cuya cobertura esté confirmada. No sumar condiciones comerciales no verificadas.
- Colección sobre papel cálido: fotografía sobre negro, nombre y precio con contraste alto, precio de transferencia también en mobile, disponibilidad y acceso a ficha.
- Campaña y relato de trabajo: “Prendas que volvemos a trabajar.” Texto sugerido: “Partimos de ropa recuperada. Revisamos cada prenda y elegimos qué conservar y qué intervenir.”
- Contacto contextual: “¿Buscás una medida o querés ver un detalle? Escribinos.”

“Hay una sola” debe derivarse del inventario. No debe repetirse como urgencia decorativa en todas las superficies.

## Fricciones a corregir

La composición previa usa varios protagonistas detrás de un titular de tres líneas. El texto tiene más presencia que la prenda. El hero móvil mide al menos 49rem; luego hay tres beneficios de 5.4rem cada uno, más separación y título del catálogo. Eso demora la primera comparación comercial. Compactar beneficios y espaciar el catálogo para que la primera pieza aparezca pronto en el recorrido.

El precio por transferencia se oculta en mobile. Si es una condición comercial real, debe estar disponible donde más importa decidir. Conservar 14–16px para precio y nombre; reservar las microetiquetas para datos secundarios. Evitar texto comercial a 8–10px.

“Reservar esta pieza” implica una reserva de stock. Si agregar a la bolsa no reserva, el botón debe decir “Sumar a la bolsa”. La exclusividad de la prenda no cambia esa semántica.

“Lista privada” y “acceso anticipado” necesitan una operación que cumpla esa promesa. Mientras el único destino sea WhatsApp, usar “Preguntanos por el próximo drop” y “Escribir por WhatsApp”.

Dos productos se llaman “Baggy Denim Custom”. Mantener SKU visible permite distinguirlos hasta que Emilia defina nombres específicos. No improvisar diferencias de material o técnicas a partir del nombre.

El producto `MNGT-024` se describe como hoodie, pero la imagen inspeccionada parece mostrar una capucha independiente. Requiere revisión de Emilia antes de destacarlo. La fotografía por sí sola no autoriza a cambiar el catálogo.

## Responsive y contraste

- Mantener dos columnas de catálogo en mobile cuando nombre, precio y botón sigan siendo legibles; revisar 360px y 390px por separado.
- En touch, evitar intercambiar automáticamente la imagen principal por una segunda vista. Toda acción necesaria debe estar visible.
- Botones principales de al menos 48px, con foco visible. El control debe seguir pareciendo accionable en reposo.
- Evitar texto violeta claro sobre papel cálido para información esencial. Reservar el acento para botón, selección y foco con contraste comprobado.
- Mantener el contenido de compra en el flujo normal. El sticky mobile debe respetar la zona segura y ocultarse cuando se abre el carrito.
- El catálogo debe quedar visible si la animación no se ejecuta. No hacer que volver a una sección la oculte de nuevo.
- Desactivar desplazamientos parallax y transiciones amplias cuando se pide reducir movimiento.

## Fotografías e información para Emilia

La limitación visual principal es el material de producto: varias piezas tienen una sola vista o un collage. Para cada prenda, preparar frente y espalda completos, detalle de intervención, terminaciones y una referencia real del calce. Mantener la misma distancia de cámara y una luz difusa que conserve negros y texturas. Una imagen de campaña puede construir deseo, pero no reemplaza esas vistas.

Cargar medidas de la prenda extendida en centímetros. Para pantalones: cintura, cadera, tiro, entrepierna y largo; para partes superiores: ancho de pecho, hombros, manga y largo; para accesorios: dimensiones y ajuste. Indicar cómo se tomó cada medida y si el material cede, sólo cuando esté comprobado.

Registrar composición cuando exista etiqueta o conocimiento verificable, intervención realizada, estado, marcas de uso conservadas, instrucciones de cuidado y alcance real de cambios/envíos/retiro. La transparencia sobre una pieza recuperada construye confianza y reduce consultas repetidas.

## Hipótesis para medir

Probar la apertura con una prenda reconocible y CTA claro. Métrica primaria: selección de producto por visita. Vigilar rebote y LCP para evitar ganar impacto a costa de carga.

Probar precio por transferencia visible en mobile. Métrica primaria: inicio de checkout por visita de ficha. Vigilar consultas por confusión de precio o método de pago.

Probar medidas reales dentro de la ficha. Métrica primaria: agregado a bolsa por visita de producto. Vigilar cambios por talle y mantener la consulta por WhatsApp disponible.

Instrumentar eventos una vez por acción con SKU y origen, sin datos personales. Una mejora de conversión debe afirmarse sólo después de observar datos comparables; el rediseño por sí solo no prueba un aumento de ventas.
