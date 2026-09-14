# Catálogo y dominio — 14 de septiembre de 2026

## Alcance de esta actualización

Se incorporaron los ocho precios entregados por el cliente, en pesos argentinos y sin aplicar un descuento adicional:

| ID estable | Producto | Precio final |
| --- | --- | ---: |
| 32 | Bandoo Moñito | $10.000 |
| 33 | Bermuda Oscuridad | $17.000 |
| 11 | Bermuda Tribal | $17.000 |
| 9 | Blazer Cuadrillé | $25.000 |
| 25 | Boxy Black | $10.000 |
| 6 | Buzo Alitas | $17.000 |
| 17 | Camisa Crop Cuadrillé | $12.000 |
| 34 | Camisa Jappon | $12.000 |

Las ocho se muestran primero en la selección de portada. Los IDs anteriores no se reciclan: las bolsas y los enlaces conservan su identidad.

No se publicó un “20% OFF”, precio tachado ni descuento por transferencia para estas ocho prendas. No se confirmó un precio de referencia ni una promoción acumulable.

La Campera Corderoy (ID 7) usa exclusivamente la imagen corregida adjunta: frente sin parches y espalda con tres paneles negros. Las dos versiones de Drive fueron excluidas de su galería. Su precio anterior no se modificó: requiere confirmación del cliente.

El catálogo anterior permanece disponible mientras se confirma si hay que retirarlo o actualizar sus precios. No se inventaron importes para nuevas prendas sin precio ni se declararon vendidas las anteriores. Esta entrega no equivale a una conciliación completa de stock de Emilia.

## Fotografías y procedencia

- Fuente: carpeta de Drive autorizada por el cliente, identificada en `catalog-source-2026-09.json`.
- Se descargaron los 32 originales a `source-assets/catalog-2026-09`, excluido de Git y del despliegue.
- La corrección se conserva como `campera-corderoy-corregida.png` en esa misma carpeta.
- `node scripts/prepare-current-catalog.mjs` produce 31 WebP (7,75 MB en total), sin recortar, inventar detalle ni ampliar la resolución original. Las fuentes van de 576 × 1024 a 1792 × 2390 / 1536 × 2730; la corrección mide 1600 × 1160. No son todas 4K.
- Los archivos públicos versionados evitan que la caché muestre fotos anteriores. Next Image genera tamaños adecuados para cada dispositivo.
- Las demás fotos están preparadas para completar el catálogo cuando se confirmen los precios y las correspondencias de producto.

## QA local

- 29 pruebas automáticas aprobadas: precios, archivos de imagen, IDs/SKU únicos, carrito guardado, seguridad de pagos, consentimiento y experiencia de scroll.
- Compilación de producción, TypeScript y ESLint aprobados.
- Home sin desborde horizontal a 320, 375, 390, 768, 1024, 1440 y 1920 px.
- Revisión visual de la grilla y portada móvil; ficha corregida de corderoy a 390 px, foto completa y cargada.
- Bermuda Tribal: $17.000 en ficha y bolsa, navegación entre dos vistas, ampliación y cierre con Escape comprobados.
- Conservados los botones de producto. Los cambios visuales de ficha y tarjeta afectan sólo al fondo de las imágenes nuevas.
- La bolsa local se vuelve a contrastar con el catálogo al abrirse y al regresar a la pestaña. Corrige precios e imágenes guardados, descarta identidades no disponibles y avisa de cambios; un error de red no vacía la bolsa.

## Dominio: preparación realizada, delegación pendiente

En el proyecto Vercel `ramiro-ruggeris-projects/mangata` se agregaron:

- `mangata.com.ar` → Production.
- `www.mangata.com.ar` → redirección permanente 301 a `mangata.com.ar`.

Vercel muestra configuración DNS inválida porque el dominio aún no resuelve. No se modificó la delegación en NIC/TAD, no se transfirió titularidad ni se compró ningún dominio.

Valores indicados por Vercel para este proyecto:

| Alternativa | Tipo / nombre | Valor |
| --- | --- | --- |
| Zona DNS existente | A / @ | 216.198.79.1 |
| Zona DNS existente | CNAME / www | 03564c8ef9caf478.vercel-dns-017.com. |
| Delegación a Vercel DNS | Nameserver | ns1.vercel-dns.com |
| Delegación a Vercel DNS | Nameserver | ns2.vercel-dns.com |

Elegir una alternativa según la delegación real. Antes de cambiar nameservers, comprobar el dominio y titular/representación en TAD, y preservar cualquier registro de correo o servicio existente. El acceso fiscal lo completa el usuario en el sitio oficial, sin compartir la clave en el chat.

El sitio y sus metadatos mantienen `https://mangata-store.vercel.app` hasta verificar DNS, HTTPS y redirección del dominio propio. Luego migrar canonical, sitemap, robots y URLs configuradas conjuntamente.

La actualización no activa pagos automáticos ni sincronización de stock con EverShop. Esas integraciones requieren configuración y pruebas separadas; actualmente la compra se coordina por WhatsApp.
