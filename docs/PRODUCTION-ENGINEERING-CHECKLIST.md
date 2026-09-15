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

- [x] El usuario confirmó: prendas en la web; envío/retiro coordinado aparte. El checkout exige confirmar que se acordó el retiro o costo del envío y aclara que el envío no está incluido ni es gratuito.
- [x] Access Token de la aplicación de Emilia y secreto Webhooks en el archivo privado del VPS; `/users/me` confirmó la titular esperada y sitio MLA. No hay credenciales en Git ni en la imagen de la aplicación.
- [x] Webhooks `payment` (Pagos legacy) guardados para `https://mangata.com.ar/api/mp/webhook`. HMAC inválido devuelve 401; firmado sin pago real verificable devuelve 503, nunca un falso éxito.
- [x] API sandbox: aprobada, rechazada y en proceso, leídas nuevamente desde Mercado Pago y conciliadas en `mangata_test_20260914`; repetición idempotente y sólo la aprobada registra pedido pagado. Cero cobros reales.
- [x] Preferencias de producción: creación autorizada, titular, ARS, retorno HTTPS y búsqueda de pagos verificados. Las dos preferencias sintéticas de diagnóstico se vencieron inmediatamente y no reservaron prendas.
- [x] Conciliación cada cinco minutos, backup diario y renovación TLS con timers activos. Estado de lanzamiento: 26 productos, 0 pedidos reales, 0 revisiones, 0 atrasos.
- [x] `MANGATA_CHECKOUT_ENABLED=1` habilitado tras estas verificaciones; bolsa publicada muestra Mercado Pago y bloquea el botón hasta confirmar entrega.
- [ ] Compra real completa realizada por un comprador distinto de Emilia. No se ejecutó ni se afirma haber probado un cargo real, autenticación bancaria o acreditación bancaria.
- [ ] Validar identidad fiscal, domicilio comercial, política de entrega/cambios y conservación de datos con la titular antes de declarar cerrado el cumplimiento comercial/legal.

## Publicación comprobada

La implementación base `c64a5c895374faafc023bc4c38d99e4af07eed35` se desplegó saludable en Hostinger; el commit de cierre que contiene este checklist incluye la revisión final de la bolsa vacía. La versión activa se identifica en `/opt/mangata/current` y en la etiqueta de revisión de la imagen Docker. Dominio anterior Vercel redirige con 308 al dominio oficial. Smoke de producción: 26 productos, 33 fotografías, precios y bolsa por SKU, 27 URLs en sitemap, canonical oficial, imagen optimizada y rechazo de origen ajeno/SKU retirado.

Los scripts `deploy/verify-provider-connection.mjs` y `scripts/verify-mercadopago-sandbox.ts` conservan el procedimiento de QA. Las pruebas sandbox no sustituyen un recorrido completo del checkout alojado de Mercado Pago con comprador de prueba: no se inició sesión como comprador ni se completó ese recorrido de navegador. El ensayo API y la revisión de la bolsa publicada se verificaron por separado.

Incidencias de QA preservadas: el simulador del panel Webhooks devolvió timeout; no se cambió el endpoint para aparentar un 200. La prueba HTTPS directa de firma válida/inválida respondió y la conciliación periódica quedó activa como respaldo. `GET /checkout/preferences/{id}` devolvió 403 con la credencial productiva, mientras crear/actualizar preferencias y buscar pagos funcionaron; la aplicación no depende de ese GET. El sandbox mostró errores intermitentes «Card Token not found»; se completó la validación recuperando y conciliando los tres pagos de prueba ya creados desde la API canónica, sin fabricar estados.

Seguridad de QA: una credencial **de pruebas**, no la productiva ni la firma Webhooks, apareció en un resultado de diagnóstico local. Debe renovarse desde Mercado Pago; no se copió a Git ni al cliente web. La rotación queda a cargo del titular por requerir interacción con credenciales.

Nginx: ruta interna devuelve 404 desde Internet; ráfaga controlada de solicitudes inválidas al checkout devuelve 429 sin reservar stock. HSTS inicial de un día sólo en los dos hosts de MANGATA; no preload ni política impuesta a otros subdominios. Los demás cuatro sitios del VPS conservaron HTTP 200. Cuenta de Mercado Pago verificada por `/users/me` como la titular esperada (MLA); no se realizó un cobro real.

Revisión visual en el dominio: 320, 390 y 1440 px sin desbordamiento horizontal; cambio frente/dorso, zoom, Escape con restauración de foco, una sola capa modal, agregado/eliminación de una unidad, teléfono correcto, consentimiento y navegación bidireccional comprobados. Sin errores/advertencias de consola en el recorrido. No equivale a probar todos los modelos de teléfono o tecnologías asistivas.

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
