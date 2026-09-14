# MANGATA — catálogo de apertura y migración

## Fuente vigente

La lista final entregada por el cliente el 14/09/2026 reemplaza todos los precios anteriores. Son importes finales en ARS, sin otro descuento por transferencia. No se inventaron precios anteriores, porcentajes, fecha de vencimiento de la oferta ni escasez adicional.

| Pieza | ARS |
| --- | ---: |
| Bandoo Moñito | 10000 |
| Bermuda Oscuridad | 25000 |
| Bermuda Tribal | 25000 |
| Blazer Cuadrillé | 25000 |
| Boxy Black | 10000 |
| Buzo Alitas | 17000 |
| Camisa Crop Cuadrillé | 15000 |
| Camisa Jappon | 15000 |
| Campera Rituales | 30000 |
| Campera Reverso | 30000 |
| Campera Deseos | 30000 |
| Cartera Crocco | 15000 |
| Corbata Pistolera | 7000 |
| Corbata Religiones | 7000 |
| Mini Foil | 17000 |
| Mini Print | 20000 |
| Mono Black | 15000 |
| Pantalón Foil | 25000 |
| Pantalón Canesú | 25000 |
| Short Brishitos | 10000 |
| Top Cruz | 10000 |
| Top Cute | 12000 |
| Top Óxido | 10000 |
| Top Picos | 12000 |
| Vaquero Tribal | 25000 |
| Vestido Microtul | 15000 |

Las cinco altas usan IDs nuevos 35–39; no se reutilizan los IDs retirados. Las 26 prendas tienen fotos del Drive autorizado. Rituales conserva la corrección adjunta; Reverso es otra campera. No quedan prendas pendientes de precio. Los datos de las 13 bajas anteriores siguen archivados.

## Decisión visual

Se conservan hero, fotos completas, identidad editorial y botones de producto. Se incorpora una nota lila compacta junto al encabezado de la colección: “Precios de apertura / Ya están aplicados.” Está en el flujo de la página, sin pop-up, temporizador, pulsaciones repetidas ni superposición con cookies, bolsa o navegación.

La integración con EverShop se posterga expresamente a la próxima semana. La compra sigue coordinándose por WhatsApp; no se activan pagos ni sincronización automática de stock.

## Arquitectura de destino

- Registro y titularidad: NIC Argentina.
- DNS: Cloudflare, zona exclusiva de mangata.com.ar.
- Origen: VPS Hostinger identificado en hPanel.
- App: Next.js standalone en Docker, usuario no root, límites de recursos y healthcheck.
- Proxy: Nginx existente; añadir únicamente virtual hosts de MANGATA y red separada.
- TLS: certificado para raíz y www, seguido de Cloudflare Full (strict).
- Canonical de la imagen Docker: https://mangata.com.ar desde la compilación.
- Vercel sigue disponible como respaldo durante la migración.

Los DNS de Vercel del documento anterior son históricos y **no se deben aplicar** para este destino.

## Validación y operación

Las pruebas cubren los 26 precios exactos, 26 altas válidas en bolsa con precio de servidor, fotografías existentes, unicidad de IDs/SKU, bajas, carrito guardado, pagos deshabilitados sin configuración completa, consentimiento y navegación. La URL de salud sólo verifica que la app responde; no certifica stock remoto, pagos ni disponibilidad del sitio externo.

Para construir y ejecutar en el VPS, dentro de una copia del commit publicado:

```sh
export RELEASE_ID="$(git rev-parse HEAD)"
docker compose -f deploy/compose.yaml build web
docker compose -f deploy/compose.yaml up -d --no-build --wait
```

Antes de ejecutar: crear la red mangata_edge y conectar exclusivamente el proxy existente; persistir esa red en su Compose sin reiniciar otros servicios. No publicar el puerto 3000 del contenedor en Internet. No copiar archivos .env, originales ni credenciales en la imagen.

Guardar copia de la configuración vigente del proxy antes de agregar los fragmentos de deploy. Validar con nginx -t antes de recargar. Activar el fragmento HTTPS sólo cuando exista el certificado. Conservar imágenes anteriores para rollback; no ejecutar podas globales ni docker compose down sobre servicios ajenos.

Cloudflare: mantener inicialmente DNS only hasta verificar el certificado de origen; activar proxy y Full (strict) después. No usar Flexible, Cache Everything, Rocket Loader ni caché compartida sobre /api/* o checkout. Preservar los registros de correo que existan. Delegar en NIC únicamente a los dos nameservers asignados a esta zona.

No se considera terminado hasta comprobar DNS autoritativo, TLS raíz/www, redirección www, imágenes optimizadas, catálogo de 26 productos, suma a bolsa, enlaces de WhatsApp y ausencia de errores del navegador.

## Estado verificado de la migración — 14/09/2026

- Código de aplicación publicado: `e7764a18154f0eee4eff646286256297f9fe4d71`; GitHub y despliegue de Vercel confirmados. Respaldo público: https://mangata-store.vercel.app/.
- VPS Hostinger: contenedor `mangata-web-1` saludable, imagen `mangata/web:e7764a18154f0eee4eff646286256297f9fe4d71`, sin puertos publicados. La ruta `/opt/mangata/current` apunta a esa release.
- Red privada `mangata_edge` conectada a la app y al Nginx existente, persistida en Compose. Sólo se agregó el bloque HTTP de MANGATA; el bloque HTTPS aún no está habilitado.
- Copias del proxy previas al cambio en `/opt/mangata/backups/compose-before-81a3749.yaml` y `/opt/mangata/backups/nginx-before-81a3749.conf`. Los otros cuatro sitios comprobados conservaron respuesta HTTP 200, sin reiniciar sus contenedores.
- Cloudflare Free: registro A raíz a `187.77.63.73` y CNAME `www` a `mangata.com.ar`, ambos DNS only para el arranque. Nameservers asignados: `aspen.ns.cloudflare.com` y `harlan.ns.cloudflare.com`.
- NIC: dominio registrado; sesión del titular disponible y los dos nameservers cargados en el formulario. **Ejecutar cambios queda pendiente de confirmación**. No se transfirió la titularidad.
- El certificado de origen aún no está emitido y Cloudflare muestra modo Full, no Full (strict). No se considera el dominio oficial activo ni la migración terminada.

Validaciones completadas: 34 pruebas automatizadas, lint y TypeScript sin errores; compilación Linux en el VPS; 26 precios y 26 altas de SKU en bolsa con el origen público configurado; 32 imágenes fuente y optimización Next Image; rechazo de origen externo y SKU retirado; datos estructurados de las cinco altas y sitemap de 27 URLs con canonical oficial. Vista desktop de 1440 px y móvil de 320 px sin desbordamiento horizontal; compra de prueba agregada y retirada sin alterar los artículos previos de la bolsa. El navegador del sitio público no registró errores ni advertencias en la revisión.

### Cierre pendiente

1. Confirmar y ejecutar en NIC la delegación exclusiva a los nameservers indicados; verificar propagación autoritativa.
2. Emitir un certificado válido para `mangata.com.ar` y `www.mangata.com.ar` mediante el webroot ACME existente. No habilitar HTTPS con certificados ajenos ni desactivar su validación.
3. Agregar el bloque HTTPS sobre una copia fresca del proxy, comprobar `nginx -t` y recargar. Verificar primero el origen con resolución forzada y luego el DNS público.
4. Activar Cloudflare Full (strict) y proxy; verificar nuevamente raíz, www, bolsa e imágenes. Mantener /api y checkout sin caché compartida.
5. Instalar `deploy/renew-certificate.sh` en `/opt/mangata/ops/` y las unidades `mangata-cert-renew.*` en systemd. Validar renovación con `--dry-run` antes de habilitar el timer. El script renueva exclusivamente el certificado de MANGATA y recarga Nginx sólo si cambió. No se encontró un cron de renovación de root; no asumir que el script existente de otros sitios se ejecuta automáticamente.

Los archivos de renovación están copiados en `/opt/mangata/ops/`; pasaron `sh -n` y `systemd-analyze verify` en el VPS. Las unidades no están instaladas ni habilitadas todavía: falta el certificado y la prueba real de renovación. No afirmar renovación automática hasta completar esos pasos. Los cambios posteriores exclusivamente documentales u operativos no requieren reconstruir la misma aplicación.
