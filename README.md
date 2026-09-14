# MANGATA Storefront

Storefront editorial headless para MANGATA, construido con el mismo baseline tecnológico de la web pública Bellomo y adaptado a una identidad streetwear propia.

Dominio verificado: [mangata-store.vercel.app](https://mangata-store.vercel.app). Vercel publica desde `main` de `Ramiro-Ruggeri/mangata`. El alias anterior `mangata-two.vercel.app` ya no corresponde a esta tienda.

El storefront permite consultas por WhatsApp. EverShop, stock sincronizado y cobros online siguen sujetos a la integración y validación descritas más abajo; publicar el diseño no habilita esas funciones.

## Stack

- Next.js 16 App Router + React 19.2
- TypeScript estricto + React Compiler
- Tailwind CSS 4 y sistema de tokens CSS
- Framer Motion 13 para motion bidireccional, transiciones de layout y gestos
- Lucide React para iconografía consistente
- EverShop GraphQL (lecturas) + REST (carrito/escrituras)
- Adaptador Mercado Pago con validación de sesión, webhook firmado y contrato de conciliación persistente

## Arquitectura de comercio

La UI consume un modelo interno estable (`StoreProduct`). La capa `src/lib/commerce` traduce EverShop a ese contrato para evitar acoplar componentes al esquema remoto.

```text
EverShop Admin (Emilia)
       │ productos / precios / stock
       ▼
EverShop GraphQL ──► adapter server-side ──► Storefront SSR + refresh 60 s
       ▲                                           │
       └──────── EverShop REST Cart ◄──────────────┘
                     carrito / una unidad / baja
```

- `local`: usa el catálogo versionado y guarda la bolsa. Mientras falte la configuración de pagos, permite consultar toda la selección por WhatsApp. El pago online queda cerrado hasta configurar un servicio durable de pedidos/reservas, las credenciales Mercado Pago y HTTPS. El catálogo local no puede garantizar stock entre compradores.
- `evershop`: EverShop es la fuente de verdad. Si la lectura remota falla, la tienda puede mostrar un catálogo de respaldo para navegación, pero todas esas piezas quedan bloqueadas para compra hasta recuperar el stock real.
- El ID del carrito remoto se guarda en cookie `httpOnly`; nunca se expone un token administrativo al navegador.

## Desarrollo

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run images:optimize
```

Las imágenes maestras se conservan en `source-assets/products` y `source-assets/campaign` y se excluyen del despliegue. La tienda sirve derivados WebP optimizados desde `public`; el script regenera los productos sin destruir los originales.

El criterio completo de diseño, conversión, contenido y QA está documentado en [`docs/MANGATA-AI-ENGINEER-MASTER-PROMPT.md`](docs/MANGATA-AI-ENGINEER-MASTER-PROMPT.md).

Copiar `.env.example` a `.env.local` y completar las variables necesarias.

## Estado de las integraciones

EverShop no está provisionado por este repositorio. Los adaptadores están implementados; su funcionamiento real requiere una instancia, credenciales y pruebas de checkout. El cliente del servicio durable tampoco constituye un backend con base de datos: define el contrato que debe implementar una extensión de EverShop o un servicio privado con PostgreSQL.

El alcance exacto, las variables, las garantías implementadas y los requisitos pendientes están en [`docs/COMMERCE-READINESS.md`](docs/COMMERCE-READINESS.md).

## Activar EverShop

1. Provisionar EverShop y configurar productos, moneda ARS, inventario, envíos y medios de pago.
2. Definir `MANGATA_COMMERCE_MODE=evershop` y `EVERSHOP_BASE_URL`.
3. Configurar `EVERSHOP_CHECKOUT_URL` con una ruta HTTPS de handoff propia, en el mismo origen de la instancia. Esa extensión debe validar `cart_id`, transferir la sesión con un mecanismo de un solo uso y volver a validar stock/precio al crear el pedido. No se asume que `/checkout?cart_id=…` funcione sin esa extensión.
4. Importar el catálogo existente con SKU estables:

```bash
# audita sin escribir
npm run evershop:import

# crea faltantes
npm run evershop:import -- --commit

# actualiza también los SKU existentes
npm run evershop:import -- --commit --update
```

El script requiere `EVERSHOP_ADMIN_TOKEN` solo al usar `--commit`. El token es exclusivamente server-side.

Antes de habilitar compras, probar dos compradores simultáneos y confirmar stock igual a uno, sin backorders, con consumo atómico de inventario. El lock del storefront sólo serializa operaciones dentro de un proceso; la garantía entre servidores pertenece a la base de datos de EverShop.

## Checkout local opcional

Requiere `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `COMMERCE_SESSION_SECRET` de al menos 32 caracteres aleatorios, `MANGATA_ORDER_SERVICE_URL`, `MANGATA_ORDER_SERVICE_TOKEN` y `NEXT_PUBLIC_SITE_URL` HTTPS. La moneda es ARS.

El servicio debe registrar la intención y reservar stock atómicamente antes de crear la preferencia. `/api/mp/webhook` verifica firma HMAC, consulta el pago real y sólo devuelve éxito después de que el servicio confirme su registro persistente. Sin esa infraestructura, el checkout devuelve un error accionable y conserva la bolsa.

El servicio también necesita conciliación programada de reservas huérfanas y pagos pendientes/tardíos. Vencer una preferencia no permite liberar stock automáticamente: primero debe confirmar el estado real del cobro. Ninguna tarea externa ni base de datos se crea desde este proyecto.

## Operación diaria para Emilia

Una vez activo el modo EverShop, Emilia gestiona desde el panel:

- altas, bajas y publicación de productos;
- SKU, precio y promociones;
- stock y disponibilidad;
- pedidos, clientes, envíos y estados de fulfillment.

La web revalida el catálogo cada 60 segundos y consulta stock sin caché al agregar una pieza. Antes del handoff revisa que el carrito remoto esté activo, tenga una unidad por SKU, no contenga errores y coincida con la selección local.

La confirmación local sólo muestra éxito cuando el pago aprobado coincide con la referencia, moneda e importe de la sesión firmada y el backend confirma el pedido persistido. Se quitan únicamente los SKU pagados. La confirmación del checkout nativo de EverShop necesita vincularse con su propio pedido/sesión durante la integración; no queda habilitada automáticamente por la página local de Mercado Pago.
