# Comercio: implementación y condiciones para vender

## Estado real

La tienda se publica en `https://mangata.com.ar` desde Hostinger. El catálogo del repositorio conserva datos y precios; el driver PostgreSQL incorporado registra disponibilidad, reservas, pagos y pedidos en una base privada persistente. Agregar solamente `MP_ACCESS_TOKEN` no habilita cobros: se requieren también firma Webhooks, identificación de la cuenta, términos de entrega confirmados y activación explícita después de QA. Consultar `PRODUCTION-ENGINEERING-CHECKLIST.md` para evidencia y pendientes vigentes.

Mientras esa configuración falta, el carrito ofrece una salida comercial operativa: “Consultar mi selección” abre WhatsApp con los nombres y SKU elegidos para que el comprador revise y envíe el mensaje. No realiza envíos automáticos ni presenta un botón de pago que sabemos que fallará. El layout calcula `checkoutReady` exclusivamente en servidor; al navegador llega sólo el booleano. Este indicador describe configuración disponible, no una prueba de salud remota: el backend mantiene todas las comprobaciones al intentar pagar.

EverShop está diferido por pedido del cliente. No está conectado a esta publicación; la base privada es la fuente transaccional actual. Su futura migración deberá conservar pedidos y stock real, no reinicializar piezas vendidas.

## Garantías implementadas

- El servidor resuelve productos por SKU o ID; rechaza selectores contradictorios y cantidades distintas de uno. Las líneas repetidas se consolidan por SKU. Precio, nombre y cantidad se reconstruyen con datos del servidor.
- El navegador conserva una línea por SKU y serializa altas, bajas, limpieza y checkout. Las mutaciones fallidas no reemplazan un carrito remoto ni borran otras líneas. Un vaciado parcial conserva solamente las líneas que no se pudieron borrar.
- EverShop se consulta sin caché antes de agregar y antes del handoff. Un SKU ya presente no se agrega otra vez. Cantidad mayor a uno, SKU duplicado, carrito inactivo, discrepancia entre bolsa local y remota o errores de ítem bloquean el pago.
- Hay exclusión mutua por carrito dentro de cada proceso Next.js. Esto no es una transacción distribuida: la unicidad entre procesos, navegadores y compradores debe garantizarse en PostgreSQL/EverShop.
- El respaldo de catálogo usa IDs `fallback-*`, origen propio y compra deshabilitada. Sus IDs nunca se resuelven como productos remotos.
- Los errores públicos usan códigos y textos acotados; no contienen respuestas crudas del proveedor, claves ni nombres de variables de entorno.
- Las rutas de mutación verifican el origen del navegador y el contenido JSON. Los destinos de checkout se restringen a HTTPS y al proveedor/origen configurado.

## Checkout local con Mercado Pago

Variables del adaptador HTTP alternativo (la implementación PostgreSQL del VPS está documentada en `.env.example` y el checklist de producción):

```dotenv
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
COMMERCE_SESSION_SECRET=
MANGATA_ORDER_SERVICE_URL=
MANGATA_ORDER_SERVICE_TOKEN=
```

`COMMERCE_SESSION_SECRET` requiere al menos 32 caracteres generados aleatoriamente. `NEXT_PUBLIC_SITE_URL` debe ser la URL HTTPS publicada. La moneda de este storefront es ARS; no se acepta moneda elegida por el navegador.

La secuencia implementada es:

- Resolver la selección contra el catálogo del servidor y consolidar por SKU.
- Generar una referencia aleatoria y solicitar al servicio durable el registro de intención y la reserva atómica.
- Crear una preferencia de Mercado Pago por los importes verificados, con vencimiento de 30 minutos.
- Guardar una cookie HttpOnly, Secure y SameSite=Lax firmada con HMAC. Contiene referencia, importe, moneda, SKU y vencimiento de 48 horas; no incluye datos personales.
- Recibir el evento firmado; consultar el pago por ID en Mercado Pago y solicitar conciliación persistente.
- En la página de resultado, verificar nuevamente el pago, exigir coincidencia exacta con la cookie y consultar si quedó registrado. Sólo entonces mostrar éxito, emitir `purchase` y quitar de la bolsa los SKU pagados. Otras piezas elegidas después permanecen.

La navegación a `/checkout/success?payment_id=...` no confirma una compra por sí sola. Una referencia que únicamente empieza con `MNGT-` tampoco alcanza. Con PostgreSQL, la página de resultado también puede conciliar un pago canónico coincidente con la sesión, como recuperación de un webhook demorado; exige persistencia antes de mostrar éxito.

## Contrato alternativo del servicio HTTP (no usado en Hostinger)

El driver PostgreSQL desplegado ya implementa persistencia y conciliación dentro de esta aplicación. El siguiente contrato documenta únicamente el adaptador HTTP alternativo de `src/lib/commerce/order-service.ts`, para una futura extensión privada de EverShop u otro servicio durable. No se utiliza en esta publicación ni es un bloqueo de la base actual.

Todas las llamadas usan `Authorization: Bearer MANGATA_ORDER_SERVICE_TOKEN`, HTTPS y timeout. Se rechazan redirecciones. El servicio debe autenticar estas llamadas y revalidar los datos contra su inventario y precios, incluso aunque provengan del storefront.

### Crear intención

`POST {MANGATA_ORDER_SERVICE_URL}/intents`

Header `Idempotency-Key: MNGT-<uuid>`.

```json
{
  "reference": "MNGT-<uuid>",
  "currency": "ARS",
  "amount": 120000,
  "expiresAt": "fecha ISO del vencimiento",
  "items": [{ "sku": "SKU real", "quantity": 1, "unitPrice": 120000 }]
}
```

Debe ejecutar una transacción que inserte una intención única, bloquee las filas del inventario y reserve exactamente una unidad por SKU. Sólo luego puede devolver:

```json
{ "reference": "MNGT-<uuid>", "persisted": true, "stockReserved": true }
```

Si el stock o el precio no coincide, devolver `409`. Si la escritura no está confirmada, no devolver estas banderas. Los importes del ejemplo son ilustrativos y no forman parte del catálogo.

### Conciliar pago

`POST {MANGATA_ORDER_SERVICE_URL}/payments`

Header `Idempotency-Key: mercadopago:<paymentId>:<status>`.

El payload contiene proveedor, ID de pago, referencia, estado, importe y moneda obtenidos mediante la API autenticada de Mercado Pago. No envía email, dirección, teléfono, tarjeta, comprobante ni cuerpo crudo del webhook.

El servicio debe buscar la intención persistida, comprobar importe/moneda, aplicar una transición permitida y crear el pedido/descontar stock en una sola transacción. Debe existir una restricción única por `(provider, paymentId)` y otra por intención/pedido, junto con un registro de transiciones. Un reintento no puede crear un pedido, enviar una notificación ni descontar stock por segunda vez.

Respuesta admitida:

```json
{
  "paymentId": "123456",
  "reference": "MNGT-<uuid>",
  "persisted": true,
  "result": "processed"
}
```

`result` también puede ser `duplicate`, únicamente si el evento ya quedó registrado. Un estado pendiente debe conservar la reserva hasta una resolución segura. Un pago aprobado tardío o una preferencia fallida no se resuelven liberando stock a ciegas: el servicio necesita una tarea de conciliación que consulte el estado real, registre los casos excepcionales y evite vender dos veces.

El vencimiento es una fecha para iniciar la conciliación, no una autorización para volver a publicar stock automáticamente. Una tarea persistente debe recorrer intenciones vencidas aunque nunca llegue un callback. Si la creación de preferencia falló o sufrió timeout después de reservar, debe confirmar por referencia que no existe un pago activo/pendiente antes de liberar. Debe conservar las reservas de pagos pendientes, procesar aprobaciones tardías y tener una salida operativa para cancelación o devolución cuando no pueda garantizar disponibilidad. El proveedor puede aprobar un pago después del vencimiento de la preferencia; la expiración del enlace no prueba que el cobro sea imposible. En Hostinger estas situaciones se registran en PostgreSQL y se revisan mediante el timer de conciliación; la liberación de reservas requiere intervención del operador. Una futura implementación del adaptador HTTP debe conservar estas garantías.

### Consultar confirmación

`GET {MANGATA_ORDER_SERVICE_URL}/payments/{paymentId}`

La página de resultado exige una respuesta con `paymentId`, `reference`, `persisted: true`, `status: "approved"`, `amount` y `currency` coincidentes con el pago verificado. Un 404, timeout o respuesta incompleta mantiene el resultado sin confirmar.

## Webhook

Endpoint: `/api/mp/webhook`.

Verifica `x-signature` HMAC-SHA256 sobre `data.id`, `x-request-id` y `ts`, con comparación constante y ventana de cinco minutos. Usa el ID firmado del query string; no confía en el estado declarado en el cuerpo. Consulta el recurso real antes de conciliar.

Sin secret devuelve `503`. Firma incorrecta devuelve `401`. Con firma válida, pero sin persistencia confirmada, devuelve `503` y no acusa recibo exitoso. Un evento persistido o un duplicado ya procesado recibe `200`. No hay un `Set` en memoria que pretenda resolver idempotencia permanente.

Configurar el webhook en Mercado Pago con el secreto correspondiente, probar reintentos/repeticiones y verificar cómo la aplicación vuelve a firmar reintentos fuera de la ventana de tolerancia. La conciliación periódica es necesaria como respaldo de entrega.

## EverShop antes de producción

- Confirmar esquema GraphQL y endpoints REST en la versión desplegada; el adaptador se basó en documentación oficial y esquema público actual.
- Establecer stock físico igual a uno por SKU, backorders desactivados y reglas atómicas de checkout. Probar dos compradores y dos instancias Next simultáneas.
- Implementar el handoff HTTPS en el mismo origen de `EVERSHOP_BASE_URL`; `EVERSHOP_CHECKOUT_URL` no es un enlace mágico que por sí solo importe un carrito a una sesión. La extensión debe validar el carrito, transferir sesión mediante un mecanismo de un solo uso y volver a validar stock/precio al crear el pedido.
- Probar pedido, pago aprobado/pendiente/rechazado, cancelación, devolución, reposición, envío y notificación a Emilia. No hay envío de mensajes ni actualización de stock simulados en este repositorio.
- Vincular la confirmación EverShop con su pedido/sesión. La confirmación local de Mercado Pago implementada aquí no confirma automáticamente un checkout nativo de EverShop.

## Eventos del embudo

El helper publica a `window.dataLayer` y al evento `mangata:commerce`. La interfaz no instala por sí sola un proveedor de analítica.

| Evento | Momento | Payload permitido |
| --- | --- | --- |
| `view_item_list` | Colección visible | moneda, cantidad, origen |
| `select_item` | Selección de tarjeta | SKU, nombre, categoría, origen |
| `view_item` | Ficha visible | SKU, nombre, categoría, precio |
| `add_to_cart` | Alta confirmada por servidor | SKU, nombre, categoría, importe, moneda |
| `view_cart` | Apertura de bolsa | importe, moneda, cantidad |
| `begin_checkout` | URL de pago válida recibida | importe, moneda, cantidad |
| `purchase` | Pago de esta sesión verificado y persistido | ID de transacción, importe, moneda, cantidad |
| `search` | Búsqueda ejecutada | longitud de consulta, cantidad de resultados, origen |
| `measurement_inquiry` | Clic en consulta de medidas | SKU, categoría, origen |
| `checkout_inquiry` | Apertura de WhatsApp desde la selección | importe, moneda, cantidad, origen; sin texto del mensaje |
| `stock_error` | Alta/baja fallida o stock inválido | código acotado, origen |
| `checkout_error` | Error al iniciar pago | código acotado, origen |

Las búsquedas no envían texto libre. No se admiten campos ajenos a la lista del helper. `purchase` se deduplica por sesión del navegador; los informes definitivos deben deduplicar también por ID de transacción en el proveedor analítico. La medición cliente puede bloquearse; el registro de ventas definitivo es el backend.

## Pruebas ejecutables

```sh
node --import tsx --test tests/commerce.test.ts
```

Incluyen duplicación por SKU/ID, precio manipulado, cantidades inválidas, fallback, cookie alterada/expirada, pago ajeno, monto/moneda incorrectos, firma alterada/replay, carrito remoto inconsistente, secuenciación, errores sin secretos y ACK del webhook condicionado a persistencia. Las pruebas interceptan red y usan credenciales ficticias; no crean cobros.

Fuentes: [API Cart de EverShop](https://evershop.io/docs/api/cart), [esquema GraphQL Cart oficial](https://github.com/evershopcommerce/evershop/blob/main/packages/evershop/src/modules/checkout/graphql/types/Cart/Cart.graphql), [Webhooks de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks), [esquema Webhooks oficial](https://github.com/mercadopago/openapi/blob/main/schemas/webhooks.yaml).
