# MANGATA · preparación de release

**Registro histórico de la primera auditoría.** La publicación posterior está en `https://mangata.com.ar` sobre Hostinger y añade persistencia PostgreSQL. El estado y las pruebas vigentes se registran en `PRODUCTION-ENGINEERING-CHECKLIST.md`; los bloqueos de este documento describen la versión anterior y no sustituyen ese registro. EverShop continúa diferido.

## Evidencia de esta pasada

- `npm audit --omit=dev --json`: 0 vulnerabilidades conocidas en dependencias productivas al ejecutar la auditoría del 14/09/2026. Es una consulta al registro sobre el lockfile actual, no una garantía de ausencia de vulnerabilidades.
- `npm test`: 16 pruebas de comercio aprobadas, sin solicitudes a proveedores reales. Las pruebas sustituyen la red y usan credenciales ficticias.
- `npx eslint src/lib/commerce src/app/api tests/commerce.test.ts`: sin errores.
- Inventario de configuración: sólo se encontró `.env.example`; no hay archivos de configuración local/productiva ni variables de comercio cargadas en el proceso auditado. Sólo se inspeccionaron nombres, no valores secretos. Esto no permite inferir la configuración de un hosting remoto.
- La verificación visual, consentimiento, build completo y pruebas responsive se registran por separado en el informe de QA de esta pasada.

## Protecciones comprobadas en código

- Precio e inventario se resuelven en servidor. Las piezas de respaldo no se pueden comprar. Una selección se normaliza a una unidad por SKU.
- POST de bolsa y pago local leen como máximo 32 KiB reales antes de parsear JSON. El mismo lector se usa en el handoff de checkout. No depende de `Content-Length`: se comprueban bytes leídos, incluidas peticiones chunked y texto multibyte; se cancela la lectura al exceder el límite. Se rechaza contenido comprimido y un objeto JSON inválido.
- Las mutaciones de tienda comparan `Origin`, rechazan Fetch Metadata `cross-site`/`same-site` y exigen MIME JSON exacto en POST. Un cliente no navegador puede omitir esos headers: esto es protección del navegador, **no autenticación ni protección contra automatización**. El webhook no usa esta comprobación; tiene autenticación HMAC específica.
- Las respuestas de bolsa/pago se marcan `no-store`; las que contienen estado de bolsa o errores son privadas. El CDN no debe sobrescribir estas directivas.
- Las URLs de base de EverShop y del servicio durable exigen HTTPS, sin credenciales incrustadas, fragmento ni query. Las llamadas autenticadas a EverShop, Mercado Pago y servicio durable no siguen redirecciones. El handoff sólo admite el origen HTTPS configurado de EverShop. La URL recibida de Mercado Pago se valida contra su dominio, sin userinfo ni puerto inesperado.
- La cookie local de intención está firmada y es HttpOnly, Secure, SameSite=Lax. La cookie de carrito EverShop es HttpOnly, SameSite=Lax y Secure en producción. Son estado operativo, no permiso para ejecutar analítica. El identificador de carrito remoto actúa como capacidad sensible y la extensión de handoff necesita una sesión/transferencia segura propia.
- Los errores HTTP públicos no incluyen errores crudos de proveedores. Los logs de fallos de catálogo/producto usan códigos estables (`catalog_unavailable`, `product_unavailable`), sin respuesta remota ni secretos.
- El webhook sólo confirma recepción de un pago de MANGATA después de la respuesta de persistencia del servicio durable. El código del cliente no implementa ni simula esa persistencia.
- El checkout público tiene metadatos `noindex`; las rutas de resultado no confirman ventas sólo por recibir una URL o ID de pago.
- Existen headers `nosniff`, Referrer-Policy, Permissions-Policy y CSP para `frame-ancestors`, `object-src` y `base-uri`. Esta CSP es parcial: no se afirma una política estricta de ejecución de scripts.

## Bloqueos de producción y siguiente acción mínima

| Bloqueo | Acción verificable para cerrarlo |
| --- | --- |
| No está definida una integración comercial productiva | Elegir el flujo que se desplegará: checkout nativo de EverShop con handoff propio, o pago local respaldado por el servicio durable. No habilitar ambos sólo por cargar tokens. |
| Instancia EverShop no configurada/validada | Crear o identificar staging, fijar versión/esquema, configurar URLs HTTPS y credenciales privadas de mínimo privilegio. Cargar SKU reales y contrastar precio, fotos, categoría y una unidad física con Emilia. |
| Reserva y registro durable pendientes | Implementar las transacciones y restricciones de unicidad descritas en `COMMERCE-READINESS.md`, con reconciliación de vencidos, pagos pendientes/aprobados tardíos y liberación segura. Probar dos compradores desde dos instancias Next sobre el mismo SKU. |
| Handoff de EverShop no implementado/probado | Construir la extensión que valida carrito, stock y precio; transfiere la sesión por un mecanismo de uso único y confirma el pedido del comprador correcto. Una URL con `cart_id` no acredita la propiedad ni completa este contrato. |
| Credenciales, callback y pruebas de pago pendientes | Configurar secretos en el hosting, nunca en `NEXT_PUBLIC_*`. Verificar webhook HTTPS y realizar pagos de prueba aprobados, pendientes, rechazados, repetidos, reembolsados y aprobados después de expirar. No usar dinero real en QA. |
| Condiciones comerciales sin aprobación final | Emilia confirma datos del responsable, contacto, stock, precios, promociones existentes, entrega, cambios y devoluciones. No sustituir información faltante por copy genérico. |
| Privacidad y tecnologías de terceros | Inventariar el despliegue real, completar responsable/proveedores/mercados y validar jurídicamente. Probar que rechazar/revocar bloquea solicitudes opcionales, también entre rutas. El banner por sí solo no cierra este bloqueo. |
| Protección de infraestructura | Configurar límites de tamaño/header/tiempo de petición y controles de abuso en gateway/WAF; verificar sus respuestas y alertas en staging. |
| Monitoreo, backups y recuperación | Conectar logs sanitizados, métricas de errores/latencia y alertas de conciliación. Crear backup de base de datos y ejecutar una restauración antes de habilitar pagos. |

## Límites y controles de infraestructura

El `Map` de exclusión por carrito sólo serializa solicitudes dentro de un proceso. **No es rate limiting, no evita abuso distribuido ni sustituye restricciones transaccionales en la base.** No se agregó un contador en memoria para aparentar protección distribuida.

Antes del lanzamiento:

- Limitar en el gateway las solicitudes a `/api/store/cart`, `/api/store/checkout` y `/api/mp`, con cuotas por sesión/origen de cliente comprobado por el proveedor de hosting. Ajustar umbrales con carga real; responder 429 con `Retry-After` sin revelar reglas internas. No confiar en un `X-Forwarded-For` enviado directamente por el visitante.
- Dar tratamiento separado a `/api/mp/webhook`: conservar autenticación HMAC y permitir reintentos legítimos. No aplicar desafíos de navegador/CAPTCHA a notificaciones de servidor. Probar la política con la entrega real del proveedor antes de activar cobros.
- Mantener límites de body en el proxy incluso para el webhook, que deliberadamente no parsea su cuerpo. Los límites del código no evitan que el hosting reciba bytes ni resuelven conexiones extremadamente lentas.
- Configurar timeout de petición y recursos por instancia. Las llamadas salientes ya tienen timeout, pero la lectura entrante depende también del servidor frontal.
- HTTPS obligatorio. Activar HSTS en el dominio productivo después de comprobar certificados y subdominios; no agregar `includeSubDomains` o preload sin inventario y decisión explícita.
- Probar CSP adicional primero en modo report-only, con nonce/hash compatible con Next y con las tecnologías autorizadas por consentimiento. No bloquear hidratación por imponer una lista no probada. Los reportes no deben incluir datos personales innecesarios.
- Limitar permisos del token storefront y separar administración/importación. Cualquier credencial previamente expuesta debe rotarse; esta pasada no encontró ni imprimió valores para evaluar historial externo.

## Observabilidad mínima

La fuente final de pedidos y ventas es el backend. Los eventos del navegador pueden rechazarse por consentimiento, bloquearse o duplicarse; no son un registro contable.

Configurar alertas para: fallos de reserva, preferencia no creada después de reservar, webhook sin persistencia, cola/reintentos acumulados, stock negativo o duplicado, conciliación vencida, aumento de respuestas 5xx y catálogo en respaldo. Usar códigos acotados y correlación operativa con acceso restringido; no registrar Authorization, cookies, tokens, cuerpos de webhook, datos de pago o mensajes personales. Definir retención y acceso con el responsable.

## Secuencia de release y rollback

- Conservar una referencia verificable de la versión anterior y del lockfile. Esta copia proviene de un ZIP; si sigue sin repositorio Git, respaldar la versión y establecer versionado antes de desplegar.
- Ejecutar instalación reproducible, lint, tipos, tests y build con una configuración de staging. Registrar comandos, resultados y commit/artefacto. El éxito de tests con mocks no reemplaza las pruebas de integración.
- Verificar dominio/canonical/sitemap y excluir staging de indexación o protegerlo por acceso. `robots.txt` no es un control de acceso. Validar que ninguna página privada figure en sitemap ni en caché compartida.
- Probar desde staging el recorrido completo, confirmación propia, doble compra, error de red, consentimiento, retiro de consentimiento, mobile y recuperación de overlays. Inspeccionar headers del entorno publicado, no sólo `next.config`.
- Obtener aprobación comercial/legal y habilitación específica para publicar y cobrar. Mantener consulta por WhatsApp mientras falte una condición crítica.
- Desplegar el artefacto aprobado, observar errores y conciliación durante la primera operación. No rotar secretos ni migrar destructivamente como parte implícita de un cambio visual.
- Si falla el flujo de compra, impedir nuevos inicios de pago mediante el control operativo del despliegue y revertir el frontend al artefacto compatible anterior. **No apagar el webhook ni la conciliación de pagos ya iniciados**; conservar referencias, sesiones, datos y reservas. Si no existe un control separado para detener nuevas compras, implementarlo y ensayarlo antes de abrir pagos.
- No revertir datos ni liberar inventario automáticamente. Resolver pagos/reservas en curso con el servicio durable; hacer rollback de esquema sólo si la migración es reversible y está probada. Verificar el servicio restaurado y documentar el incidente.

No se ha ejecutado un despliegue, una prueba con tarjetas reales, una restauración de base, una configuración WAF ni una integración remota en esta auditoría. Esas evidencias siguen pendientes.
