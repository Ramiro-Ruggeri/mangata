# MANGATA — control de producción, 14/09/2026

Este registro distingue evidencia técnica de aprobaciones comerciales pendientes. No certifica cumplimiento legal ni promete un aumento medido de ventas.

## Verificado

- [x] Dominio NIC de Emilia delegado a Cloudflare; DNS apunta al VPS Hostinger 187.77.63.73.
- [x] HTTPS con certificado propio para apex y www; cadena validada sin desactivar TLS. www redirige al apex.
- [x] Renovación Let's Encrypt probada con `--dry-run` y timer habilitado (21:46 ART).
- [x] Foto original de Rituales dividida exactamente en dos mitades de 800 × 1160. Comparación de píxeles sin diferencias; una sola referencia de $30.000.
- [x] Catálogo de 26 productos con importes ARS aprobados por Emilia; teléfono comercial +54 9 2920 55-9780.
- [x] Base PostgreSQL exclusiva de MANGATA, volumen persistente, red interna sin puerto publicado; usuario de aplicación sin privilegios de administración ni DDL.
- [x] 35 pruebas unitarias/API existentes y 9 comprobaciones contra PostgreSQL real: concurrencia, rollback, precios manipulados, duplicados, devolución y aprobación tardía.
- [x] Backup de la base restaurado en una base aislada: 26 productos y 0 pedidos al preparar el lanzamiento.
- [x] Credenciales y secretos fuera de Git e imágenes Docker; pagos deshabilitados por defecto.

## Puertas de habilitación de cobros

- [ ] Confirmación de Emilia: se abonan las prendas y el envío/retiro se coordina antes del pago; transporte no incluido. No activar `MANGATA_SHIPPING_MODE=arranged_separately` sin esa confirmación.
- [ ] Access Token de la aplicación de Emilia y secreto Webhooks cargados sólo en el VPS; comprobar `/users/me`, titular y ambiente.
- [ ] Webhooks `payment` configurados para `https://mangata.com.ar/api/mp/webhook`; firma HMAC y persistencia antes de responder OK.
- [ ] Pruebas de proveedor aprobada, rechazada y pendiente; verificar destino y carrito en la interfaz. No ejecutar un cobro real sin autorización específica del importe.
- [ ] Activar conciliación periódica después de configurar el proveedor, sin perder avisos al deshabilitar nuevas compras.
- [ ] Habilitar `MANGATA_CHECKOUT_ENABLED=1` únicamente después de validar los puntos anteriores.
- [ ] Validar identidad fiscal, domicilio comercial, política de entrega/cambios y conservación de datos con la titular antes de declarar cerrado el cumplimiento comercial/legal.

## Regla operativa para piezas únicas

La bolsa no reserva. Al abrir Mercado Pago, el servidor reserva transaccionalmente y conserva la intención antes de solicitar una preferencia de 30 minutos. Una cookie firmada permite reabrir la misma preferencia sin crear otra. No se libera automáticamente una prenda al vencer ese plazo: podría existir un pago pendiente o un aviso retrasado.

Los casos abandonados, rechazados, devueltos, disputados o con un segundo pago pasan a revisión. El operador debe verificar la referencia y todos sus pagos en Mercado Pago, invalidar la preferencia cuando corresponda y comprobar que no exista una operación pendiente antes de liberar una reserva. Una devolución tampoco repone stock hasta inspeccionar la prenda. No existe todavía un panel de gestión para Emilia; EverShop sigue siendo una etapa posterior.

El servicio de conciliación devuelve fallo operativo si hay revisiones o atrasos. Consultar `journalctl -u mangata-commerce-reconcile.service`; esto NO envía una alerta externa por sí solo. El responsable de operación debe revisar esos casos; falta acordar canal de alertas.

## Operación y recuperación

- `/opt/mangata/current` enlaza la versión desplegada; backups y secretos viven fuera del release.
- Base: `deploy/compose.database.yaml`. No ejecutar `down -v` ni restaurar un dump sobre producción durante una comprobación.
- Operaciones privadas: ejecutar `deploy/commerce-ops.mjs` dentro del contenedor web (`seed`, `status`, `reconcile`). La ruta pública debe permanecer bloqueada por Nginx además de requerir un token secreto.
- Backup: `deploy/commerce-backup.sh`, archivo privado PostgreSQL formato custom. Timer diario; sin borrado automático.
- Una copia en el mismo VPS no protege ante pérdida del VPS. El destino externo y su retención quedan pendientes de definir; no afirmar que hay backup externo.
- Rollback web: volver a la imagen previa **sólo si comprende el stock persistente**; nunca volver al catálogo sin base después del primer cobro.
- Contraseñas, datos de tarjeta, tokens y parámetros de reautenticación no se registran en este documento ni en Git.

## Criterios reutilizables para otros ecommerce

- Una promesa comercial debe tener respaldo: precio, stock, envío, medio de pago y contacto reales.
- Conservar botones de producto aprobados; microinteracciones deben dar feedback, no distraer ni bloquear accesibilidad.
- Fotos fieles al producto, frente/dorso inequívocos, zoom, dimensiones reservadas y formatos optimizados.
- Mobile: sin desbordamiento, acciones accesibles, overlays mutuamente excluyentes, foco atrapado y restaurado, escape, safe areas y movimiento reducido.
- Consentimiento opcional auténtico: rechazar tan accesible como aceptar; no trackers previos ni cookies de pago condicionadas al marketing.
- Compra confirmada sólo con identidad, moneda, monto y persistencia comprobados contra el proveedor.
- Verificar todo en el dominio y servidor definitivos; registrar versión, rollback y limitaciones reales.
