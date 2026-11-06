# Fase C: panel de Emilia

Rama `feat/fase-c-panel`. Vive en `/admin`, sin indexar.

## Qué incluye

- Ingreso propio con contraseña y doble factor, más códigos de recuperación.
- Piezas: crear, editar, duplicar, publicar y archivar, con fotos múltiples y orden.
- Ventas manuales: al registrarla, la pieza deja de poder comprarse en la web.
- Pedidos web y manuales por separado, con estado y nota interna.
- Pagos en modo lectura. Los reembolsos siguen en Mercado Pago hasta probarlos en sandbox.
- Historial de stock y registro de auditoría.

## Decisiones

- **Fotos en la base (`catalog_images`):** el backup diario ya las cubre y no hace falta otro volumen. Se recodifican a WebP de hasta 1800 px, lo que elimina SVG, scripts y datos de ubicación.
- **Sin colecciones, promociones, contenido ni SEO todavía:** quedan para entregas siguientes.

## Publicar (requiere aprobación de Ramiro)

1. Backup y `deploy/migrations/003-admin.up.sql` como rol dueño.
2. Generar `MANGATA_ADMIN_SECRET` (al menos 32 caracteres) en `/opt/mangata/shared/commerce.env`, sin imprimirlo. Si se pierde, hay que volver a activar los accesos.
3. Sumar a nginx la `location = /api/admin/photos` de `deploy/nginx-https.conf` y validar con `nginx -t`. Es el nginx compartido con otros sitios.
4. Publicar la imagen por el procedimiento habitual.
5. Invitar a Emilia:
   `docker exec -i -e ADMIN_EMAIL=<email> mangata-web-1 node --input-type=module < deploy/admin-invite.mjs`
   El enlace dura 24 horas y se le pasa por un canal privado.

## Volver atrás

La imagen anterior ignora las tablas nuevas, así que alcanza con volver a esa versión. `003-admin.down.sql` solo si se abandona el panel: se niega si hay ventas manuales y borra auditoría, historial y fotos subidas.
