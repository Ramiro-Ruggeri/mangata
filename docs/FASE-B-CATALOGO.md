# Fase B — catálogo en la base

El catálogo pasa de `src/lib/products.ts` a PostgreSQL, para que el panel de la Fase C pueda editarlo sin deploy.

## Modelo

- `inventory` sigue siendo la única fuente de nombre, precio, `active` y estado de stock. Es la tabla que bloquea cada reserva, así que una pieza no puede mostrar un precio y cobrar otro.
- `catalog_products` agrega descripción, categoría, medidas, fotos, novedad y orden. El `id` es la URL pública `/producto/<id>` y no se recicla.
- Archivar es `inventory.active = false`: la pieza sale de la tienda y del sitemap y responde 404, pero conserva su historial. El rol de la app no tiene `DELETE` sobre el catálogo.
- `products.ts` queda como semilla de importación y como respaldo si el catálogo todavía no fue importado.

## Comportamiento

| Situación | Resultado |
|---|---|
| Tabla vacía | Catálogo del código con stock de `inventory`, como hasta ahora |
| Catálogo importado | La base manda; los cambios se ven sin deploy, incluido el sitemap |
| Base caída | La tienda sigue visible con la última lectura buena y sin vender; lo archivado no reaparece |
| Reimportar | Solo inserta lo que falta; informa diferencias en `drift` y no pisa nada |

`seed` se eliminó: pisaba nombres y precios desde el código y desactivaba lo que no figurara ahí.

## Publicación (requiere aprobación)

La migración es aditiva y el código anterior la ignora, por eso va primero.

1. Backup: `systemctl start mangata-commerce-backup.service`; confirmar el dump nuevo.
2. Migración, como dueño de la base:
   `docker exec -i mangata_db sh -c 'psql -U "$POSTGRES_USER" -d mangata -v ON_ERROR_STOP=1' < deploy/migrations/002-catalog.up.sql`
3. Release de la imagen nueva, con el procedimiento habitual y candidato aislado.
4. Importación:
   `docker exec -i mangata-web-1 node --input-type=module - import-catalog < /opt/mangata/current/deploy/commerce-ops.mjs`
   Resultado esperado: `{"products":26,"inventoryCreated":0,"catalogCreated":26,"drift":[]}`.
5. Verificar: 26 productos, 25 disponibles, `MNGT-037` vendida, regresiones SEO y una corrida real de la conciliación.

## Rollback

- Código: volver a la imagen anterior. La tabla nueva no le molesta y no hace falta tocar la base.
- Base, solo si hace falta y con la imagen anterior ya activa: `deploy/migrations/002-catalog.down.sql`. Stock, pedidos y pagos no cambian; se pierden las ediciones de descripciones, fotos y orden.
