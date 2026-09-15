# Principios de entrega · ecommerce argentino de indumentaria

Checklist reutilizable para futuros proyectos. Cada tilde necesita evidencia del sitio publicado, fecha, responsable y versión. No alcanza con que el diseño lo sugiera.

## Confianza antes del primer clic

- [ ] Contacto real aprobado por la persona que atiende, centralizado en configuración. Probar todos los enlaces: home, producto, bolsa, errores y resultados de pago.
- [ ] Identidad de la marca y responsable; ubicación y redes comprobadas. No inventar reseñas, clientes, ventas, certificaciones ni garantías.
- [ ] Franja breve cerca de la colección: entrega, forma de pago real y atención humana. Cada afirmación tiene respaldo operativo; no mostrar Mercado Pago si el checkout está cerrado.
- [ ] Envíos, costos, plazos, retiro, cambios y devoluciones aprobados por el negocio. Total y condiciones visibles antes de confirmar un pago. No presentar un envío a coordinar como gratuito.
- [ ] Precios en ARS, consistentes entre tarjeta, ficha, bolsa y proveedor. Promoción real, alcance y vigencia definidos; nunca fabricar porcentajes, precio anterior o urgencia.

## Producto fiel a lo que se vende

- [ ] Una identidad/SKU por producto físico. Frente, dorso y detalles pertenecen a la misma ficha, no a productos duplicados.
- [ ] Fotos de la prenda real, sin deformar proporciones, colores, textura, desgaste o intervenciones. Guardar el original y documentar recortes/derivados.
- [ ] Foto principal legible en dos columnas móviles, imagen completa, galería con controles accesibles, zoom y textos alternativos descriptivos.
- [ ] Medidas, talle, estado y composición confirmados; si falta información, consulta contextual que incluya pieza y SKU.
- [ ] Prendas vendidas retiradas o marcadas sin stock. La bolsa no equivale a reserva; unidades únicas protegidas en backend al iniciar pago.

## Compra y cobro verificables

- [ ] Cuenta del comercio correcto, credenciales privadas sólo en servidor y ambientes de prueba/producción separados.
- [ ] Precios reconstruidos desde servidor, sin confiar en importe o cantidad enviados por el navegador.
- [ ] Reserva atómica y pedidos persistentes; prueba concurrente de dos compradores sobre una sola unidad.
- [ ] Webhook autenticado, consulta al proveedor, validación de referencia/importe/moneda y persistencia idempotente antes de confirmar.
- [ ] Probar aprobado, pendiente, rechazado, doble notificación, timeout, abandono, devolución y aprobación tardía. No confundir URL de retorno con pago acreditado.
- [ ] Conciliación de reservas vencidas y pagos sin callback; nunca liberar stock a ciegas. Procedimiento visible para excepciones y atención al comprador.
- [ ] Entrega de información del pedido a la persona que prepara el envío, confirmación al comprador y un canal real de ayuda.
- [ ] Interrumpir nuevos pagos sin apagar callbacks de pagos en curso. Backups y restauración ensayados antes de cobrar.

## UX móvil, accesibilidad y movimiento

- [ ] Revisar 320, 390, 430, 768 y 1440 px, orientación horizontal y zoom de texto. Sin desborde horizontal ni textos cortados.
- [ ] Áreas táctiles cómodas, foco visible, contraste, teclado y lector de pantalla. Menú, búsqueda, bolsa y zoom devuelven el foco al cerrar.
- [ ] Microinteracciones con función: selección, carga, éxito/error, apertura, cambio de foto y navegación. No retrasar la compra ni animar sin fin.
- [ ] Respetar `prefers-reduced-motion`. Contenido visible si JavaScript falla; no esconder el catálogo esperando una animación.
- [ ] Cookie banner, CTA fijo y volver arriba no se tapan entre sí. Probar primera visita y consentimiento ya guardado, no sólo la pantalla ideal.
- [ ] Consentimiento opcional rechazable y revocable; verificar red/almacenamiento real antes y después. Revisar privacidad con asesoramiento apropiado al negocio.

## Publicación y mantenimiento

- [ ] Dominio oficial, DNS, certificado válido, HTTPS y redirección de www; prueba desde fuera del servidor.
- [ ] Host/origen confirmado, healthcheck, reinicio automático, límites de recursos y logs sin secretos. No afectar otros clientes del VPS.
- [ ] Instalación reproducible, lint, tipos, tests, build y navegación real sobre el artefacto publicado.
- [ ] Sitemap, canonical, metadatos e imágenes correctos; checkout privado no indexado ni almacenado en caché compartida.
- [ ] Renovación TLS probada y programada, alertas, backup y rollback documentados con versión anterior identificada.
- [ ] Entrega operativa al cliente: gestionar disponibilidad, recibir consultas, atender pagos pendientes, preparar entregas y escalar incidentes.

## Conversión: hipótesis, no promesas

Mostrar un medio de pago reconocido, contacto humano y costos claros puede reducir incertidumbre. El incremento de ventas no está demostrado por agregar una franja o un botón. Medir, con consentimiento cuando corresponda: visitas a producto, altas en bolsa, inicio de checkout, pagos aprobados y consultas; separar dispositivos y fuente de tráfico. Usar pedidos conciliados como fuente final de ventas, no clics ni eventos del navegador.

Registrar período base, cambio, tamaño de muestra, tasa de conversión, ingreso por visita, abandonos, errores y devoluciones. No atribuir variaciones al diseño si cambiaron campañas, precios o disponibilidad. Priorizar fidelidad del producto, información útil y compra efectiva antes que efectos decorativos.

## Aplicación a MANGATA · 14/09/2026

- Contacto autorizado: Emilia, +54 9 2920 55-9780.
- Catálogo autorizado: 26 productos; Campera Rituales es una pieza de $30.000 ARS con frente y dorso.
- Host objetivo: VPS Hostinger; dominio mangata.com.ar; DNS Cloudflare.
- Mercado Pago: requiere cuenta de Emilia, credenciales, registro durable y pruebas de punta a punta. No marcar este punto cumplido por tener código preparatorio.
- EverShop: integración administrativa diferida por pedido del cliente. No cambiar esa decisión sin acordarlo.

Referencias técnicas: [Checkout Pro y creación de aplicación](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/create-application), [documentación de notificaciones](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks). Contrato y riesgos propios: [COMMERCE-READINESS.md](COMMERCE-READINESS.md).
