# Release Fase B — 06/11/2026

- Commit e imagen: `8ba58bd69b624640b4a637d0066079d3593d5b96`, en `https://mangata.com.ar`.
- Base: `schema_version` 2, `catalog_products` con 26 filas importadas. La migración se aplicó a las 02:36.
- Backup previo validado: `mangata-20261106T053559Z.dump`.
- Rollback de código: imagen y directorio de `0b226dfd50a5c1f5ebcf256a237275df07b73175`. La tabla nueva no le molesta.
- Sin cambios en secretos ni nginx (`commerce.env` con el mismo hash).

El candidato se construyó y probó antes del backup y la migración, para no tocar la base si el build fallaba.

## Comprobaciones

- Candidato aislado, sin secretos ni red: sano, 26 productos idénticos a producción, 4 regresiones SEO.
- Importación: `{"products":26,"inventoryCreated":0,"catalogCreated":26,"drift":[]}`. La segunda corrida creó 0.
- API pública del catálogo idéntica antes y después de importar.
- Inventario y pedidos idénticos a la foto previa a la migración, también después de probar la bolsa: 25 disponibles, `MNGT-037` vendida, 9 intentos.
- Dominio: home y producto 200, producto inexistente 404, 301 de HTTP y www, sitemap con 26 productos, 26 enlaces en la home, 4 regresiones SEO, sin errores de consola ni imágenes rotas.
- Bolsa: disponible 200, vendida 409, sin abrir el pago.
- Scripts: `sh -n` correcto, sin CRLF. Corrida real de conciliación (`status 200`, `overdue 0`) y de backup, con `catalog_products` dentro del dump.
- Rol de la app sin `DELETE` sobre el catálogo.

## No probado en esta release

- Una compra real o un pago sandbox con el catálogo en la base.
- Una edición real en producción. Precio, texto, alta y archivo se probaron con la misma imagen en una base descartable; acá no se tocó nada visible.
- El timer del backup de las 04:30 todavía no corrió con esta release. El mismo script sí corrió a mano.
