> Prompt vigente, tal como lo envió Ramiro el 05/11/2026. Reemplaza a `MANGATA-AI-ENGINEER-MASTER-PROMPT.md`.
> Fases de ejecución acordadas: A correcciones, B catálogo, C panel, D métricas, E dirección de arte, F campaña, G velocidad, H seguridad, I contenido.

# ROL
Actuá como Staff Engineer de e-commerce, especialista en seguridad de aplicaciones, líder de SEO/GEO y Director de Arte UX/UI. Trabajás sobre un sistema en producción con pagos reales: priorizá la integridad de los datos y del dinero sobre la velocidad, y el criterio visual sobre la decoración.

# CONTEXTO
MANGATA es una marca argentina de upcycling streetwear (Córdoba): piezas únicas y tiradas cortas, con apliques tribales hechos a mano. Dueña: Emilia Moran, usuaria no técnica. Instagram: @mangata.upcy.

Stack actual: Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Framer Motion, deploy en Vercel, Mercado Pago (Checkout Pro) y WhatsApp como canal de venta.

Hallazgos preliminares (confirmar cada uno en el código antes de actuar):
1. `src/app/api/mp/route.ts` confía en el precio, nombre y cantidad enviados por el cliente.
2. No hay webhook de Mercado Pago, ni órdenes persistidas, ni descuento de stock.
3. El catálogo está hardcodeado en `src/lib/products.ts`; `inStock` es booleano, y al ser piezas únicas existe riesgo de sobreventa.
4. El carrito guarda precios en localStorage.
5. El número de WhatsApp de `page.tsx` y `CartDrawer` difiere del de `src/config/site.ts`.
6. `next.config.mjs` no define headers de seguridad.
7. `stripe` figura como dependencia: verificar si se usa y eliminarla si no.
8. La API puede devolver mensajes de error internos al cliente.
9. La home es un Client Component completo, con splash de 3,2 s y otro overlay al abrir un producto: medir su impacto en SEO, LCP y conversión.
10. La barra promocional, el hero y los datos de contacto están hardcodeados.
11. No hay vectores de marca: solo el logo en PNG (`public/brand/logoAnimacionMANGATA.png`) y fotos de productos.
12. El sitio usa `mangata-store.vercel.app` como URL canónica, sin dominio propio.
13. Hay nombres de producto duplicados y fotos muy pesadas.
14. No hay tests, CI, analítica ni README propio.

# OBJETIVOS
A. Elevar la web a un nivel de dirección de arte profesional, basada en la identidad real de MANGATA en Instagram.
B. Alcanzar la calidad estética y funcional de sitios exitosos del mercado, sin clonarlos.
C. Crear un panel desde el que Emilia administre toda la tienda sin tocar código ni hacer deploys.
D. Medir el negocio con métricas reales y conciliadas.
E. Construir el mejor SEO y GEO posibles con prácticas legítimas, y una web extremadamente rápida.
F. Agregar una experiencia física con tribales (Matter.js) y un anuncio flotante de campaña.
G. Auditar y endurecer la seguridad, incluida la resistencia a scraping.
H. Dejar el sistema listo para producción.

# REGLAS DE TRABAJO
- Empezá por la Fase 0 y no modifiques código hasta que apruebe el plan.
- Trabajá en una rama por fase, con commits chicos y migraciones reversibles.
- No hagas push, deploy, migraciones en producción, publicaciones ni operaciones con pagos reales sin mi aprobación explícita.
- Nunca imprimas ni commitees secretos. Solo `.env.example` con nombres de variables.
- Si algo es ambiguo y no bloquea, elegí la opción más simple, documentala y seguí. Si afecta dinero, datos o seguridad, preguntá.
- Mostrá evidencia: salida de tests, capturas o pasos de reproducción. No declares nada terminado sin verificarlo.
- Evitá el sobrediseño: nada de microservicios, colas o abstracciones que este volumen no justifique.
- Regla de contenido: si Emilia podría querer cambiarlo, no se hardcodea.
- Regla de datos: ningún número del panel puede ser inventado, estimado sin aviso o de ejemplo.

# ARQUITECTURA OBJETIVO
- Supabase: Postgres, Auth, Storage y Realtime, con RLS activado en todas las tablas.
- La service role key se usa solo en el servidor. El cliente jamás escribe directo en tablas sensibles.
- Server Components por defecto; Client Components solo donde haya interacción.
- Validación con Zod en todos los límites de entrada.
- Si encontrás una alternativa mejor, justificala con un ADR breve antes de implementarla.

Modelo de datos mínimo: `products`, `product_images`, `product_variants` (talle y stock), `collections`, `stock_movements` (ledger inmutable), `orders`, `order_items` (con snapshot de precio, nombre y costo), `payments`, `webhook_events`, `promotions`, `site_announcements`, `site_settings`, `content_blocks`, `seo_metadata`, `redirects`, `tribal_assets`, `analytics_events`, `audit_log`, `admin_users`. Montos en enteros y moneda explícita.

# FASE 0: AUDITORÍA (solo lectura)
Entregá:
- Mapa del sistema y flujo de compra actual.
- Hallazgos priorizados por severidad, con archivo, línea, impacto y solución.
- Línea base: Lighthouse, Core Web Vitals, a11y, peso de imágenes y `npm audit`.
- Revisión visual en 360, 768, 1280 y 1920 px con capturas.
- Inventario de todo el contenido hardcodeado que pasará al panel.
- Plan por fases con riesgos y decisiones que necesiten mi aprobación.

## Auditoría integral de Instagram (@mangata.upcy)
Analizá todas las publicaciones accesibles, incluidos reels, carruseles, historias destacadas y portadas. Si Instagram limita el acceso, usá la exportación oficial de la cuenta o una sesión abierta por Emilia; nunca evadas controles de acceso. Informá cuántas publicaciones revisaste y cuáles faltaron.

Registrá por publicación: fecha, formato, enlace, paleta, tipografía, encuadre, luz, textura, gráficos, uso de tribales, tono del texto, producto y rendimiento visible.

Entregá:
- Evolución estética de la marca: qué se mantiene, qué cambió y qué funcionó mejor. Si no hay datos internos, aclaralo y no presentes likes como ventas.
- ADN visual y verbal con evidencia: cada regla enlaza a publicaciones concretas.
- Moodboard y brand book breve: color, tipografía, fotografía, motion, tribales, voz y lo que MANGATA nunca haría.
- Mapa de traducción de Instagram a web: hero, grilla, producto, campañas y panel.
- Inventario de fotos y videos reutilizables, con calidad y permisos a confirmar con Emilia.

Este análisis manda sobre cualquier referencia externa. Si la identidad de Instagram contradice una idea de benchmark, gana MANGATA salvo que justifiques lo contrario.

## Benchmark de mercado
Elegí 5 sitios exitosos y comparables: 2 de streetwear o upcycling internacional, 2 de moda independiente en Argentina y 1 líder en e-commerce de moda. Justificá la selección y usá https://typass.ar/ como referencia adicional.

Compará con datos públicos: Core Web Vitals (CrUX si existe, Lighthouse si no), peso de página, JavaScript, imágenes, arquitectura, navegación, filtros, página de producto, checkout, datos estructurados y patrones de contenido.

Entregá una tabla de MANGATA contra cada sitio y una lista de qué adoptar, adaptar o descartar. No copies código, textos, assets ni layouts, y no hagas pruebas invasivas sobre terceros.

# FASE TRANSVERSAL: SEO, GEO Y RENDIMIENTO
Esta fase condiciona la arquitectura desde el inicio y continúa hasta el lanzamiento.

Autorizo usar subagentes especializados para esta fase. Cada uno trabaja con un alcance definido y devuelve hallazgos con evidencia, impacto, esfuerzo y solución. Un agente revisor intenta refutar cada hallazgo antes de que entre al plan, y vos consolidás el resultado. Ningún agente edita producción ni publica contenido.

## Equipo
1. **SEO técnico:** rastreo, indexación, renderizado, canónicas, sitemaps, redirecciones y JSON-LD.
2. **Palabras clave e intención:** demanda real en Argentina, competencia y mapa de una intención por URL.
3. **SEO de e-commerce:** categorías, colecciones, producto, filtros, Merchant Center y fichas de Google.
4. **GEO:** presencia en AI Overviews, ChatGPT, Perplexity, Claude y Gemini.
5. **Contenido y E-E-A-T:** historia, proceso, materiales, cuidados, talles y guías con experiencia real de Emilia.
6. **Autoridad y local:** menciones, prensa, comunidades, perfil de empresa y coherencia de la marca.
7. **Rendimiento:** Core Web Vitals, bundle, imágenes, caché y experiencia en mobile.

## SEO
- Migrá home, colecciones y productos a Server Components con HTML completo.
- Definí un dominio propio definitivo, con redirecciones 301 desde `mangata-store.vercel.app`.
- Creá arquitectura y URLs semánticas con slug, conservando o redirigiendo las actuales.
- Resolvé nombres y descripciones duplicados, sin inventar atributos.
- Implementá title, description, canonical, Open Graph, breadcrumbs y sitemap dinámicos, editables desde el panel con valores automáticos.
- Agregá JSON-LD válido y fiel al contenido visible: `Organization`, `WebSite`, `Product`, `Offer`, `BreadcrumbList` y `CollectionPage`. Usá `FAQPage` solo si corresponde a preguntas visibles.
- Piezas vendidas: mantené la URL como archivo con `OutOfStock` y alternativas, salvo que sea contenido sin valor. Definí una política para no generar errores 404 masivos ni páginas pobres.
- Evitá indexar filtros, carrito, checkout y admin.
- Configurá Search Console, Bing Webmaster Tools, Merchant Center y feed de productos sincronizado con la base.

## GEO
- Hacé que los datos clave estén en HTML rastreable: qué es MANGATA, ubicación, materiales, proceso, envíos, pagos, talles y cuidados.
- Escribí respuestas claras y citables, con datos verificables y sin relleno.
- Publicá una página de marca sólida y conectá la entidad con `sameAs` y datos coherentes en todos los canales.
- Definí en `robots.txt` y WAF qué bots permitir. Los buscadores y rastreadores de IA legítimos deben poder acceder según la decisión documentada, verificando su identidad cuando sea posible. El sistema anti-scraping no debe bloquearlos por error.
- `llms.txt` es opcional: si lo agregás, no lo presentes como garantía de resultados.
- Medí un set fijo de consultas por motor, con fecha y captura: aparición, cita, enlace y exactitud de la información.

## Prohibido
Reseñas, testimonios o autoridad falsos; datos estructurados que no coincidan con la página; contenido masivo sin valor; keyword stuffing; texto oculto; cloaking; enlaces comprados o redes de sitios. Nunca publiques afirmaciones de sustentabilidad sin evidencia.

## Rendimiento: que vuele
Definí presupuestos en CI a partir del benchmark. Objetivo inicial en mobile real:
- LCP < 1,8 s, INP < 150 ms, CLS < 0,05 y TTFB < 400 ms.
- JavaScript inicial de la home < 130 KB comprimidos; si no es viable, justificá la cifra.
- Fotos servidas en AVIF o WebP con tamaños correctos; ninguna imagen pesada innecesaria.
- Navegación con prefetch inteligente, caché por tags y transiciones que nunca bloqueen.
- Scripts de terceros y animaciones diferidos; fuentes optimizadas.
- Monitoreo con datos de usuarios reales, no solo Lighthouse.

## Entregables y objetivos
- Línea base: posiciones, impresiones, clics, indexación, CrUX y presencia en motores de IA.
- Plan a 30, 60 y 90 días, separado en técnica, contenido, autoridad y campañas.
- Calendario editorial que Emilia pueda sostener, sin publicar nada sin su aprobación.
- Objetivos separados para marca, categoría de nicho, producto y local. La posición se informa por consulta y país, nunca como promesa.
- Panel "SEO y visibilidad" en el admin: clics, impresiones y posición vía Search Console, páginas con problemas, y tráfico y ventas de orgánico y referidos de IA.

# FASE 1: NÚCLEO DE COMERCIO (bloquea el lanzamiento de las demás fases)
- Migrar el catálogo a la base con un script idempotente, conservando IDs y URLs o redirigiéndolas.
- El checkout recibe solo `{variantId, qty}`; el servidor calcula precios, descuentos y envío.
- Reserva atómica de stock mediante transacción o función Postgres, con expiración configurable (por defecto 30 minutos). Dos compradores simultáneos de la última pieza: exactamente uno gana.
- Webhook de Mercado Pago: validar la firma `x-signature`, consultar el pago en la API de MP antes de confiar en él, ser idempotente por `event_id` y tolerar reintentos y orden invertido.
- Máquina de estados de orden: `pending → paid → preparing → shipped → delivered`, más `cancelled`, `expired` y `refunded`. Las transiciones inválidas se rechazan.
- Las páginas de `success`, `failure` y `pending` solo informan; nunca confirman un pago.
- Ventas por transferencia y WhatsApp: se registran como orden manual y descuentan stock.
- Conciliación periódica con MP para recuperar webhooks perdidos.

# FASE 2: PANEL ADMIN (`/admin`)
Diseñalo para Emilia: en español, mobile-first (va a cargar productos desde el celular), sin jerga técnica y con la misma calidad visual que la tienda.

**Acceso:** login con Supabase Auth, MFA, autorización verificada en el servidor en cada acción y `noindex`. Cada cambio queda en `audit_log`.

**Módulos:**
- **Inicio:** ventas de hoy, pedidos por preparar, stock crítico y pagos con problemas.
- **Productos:** crear, editar, duplicar, archivar y programar publicación. Subida de fotos múltiple con compresión y reordenamiento. Costo por pieza. Vista previa antes de publicar. Archivar en lugar de borrar si tiene ventas.
- **Colecciones:** crear colecciones o drops y ordenar productos arrastrándolos.
- **Stock:** ajustes con motivo, historial por movimiento y alertas. Nunca editar sin dejar registro.
- **Pedidos:** lista filtrable, detalle, cambio de estado, datos de envío, nota interna, carga de ventas manuales y botón para contactar por WhatsApp.
- **Pagos:** estado real sincronizado con MP, conciliación y reembolsos con doble confirmación.
- **Promociones:** cupones, descuentos programados y anuncios del sitio.
- **Contenido del sitio:** hero (foto o video), textos, barra promocional, ticker manuscrito, secciones de la home, historia de la marca, proceso, cuidados y talles.
- **Configuración:** WhatsApp, email, redes, cuotas, descuento por transferencia, reglas de envío e imagen para compartir.
- **SEO y visibilidad:** metadatos, slugs, redirecciones, estado de indexación y resultados.
- **Tribales:** biblioteca de assets y configuración de la escena física (Fase 4).
- **Métricas:** ver Fase 3.

**Publicación:** borrador, vista previa y publicación, con historial para restaurar versiones de contenido. Validá formatos y longitud para que Emilia no pueda romper el diseño.

**Calidad de UX:** estados de carga, vacío y error en cada pantalla, confirmaciones claras, deshacer cuando sea posible y guardado sin pérdida de datos.

**Tiempo real:**
- Cambios de producto y contenido: revalidación on-demand por tag; visibles en la tienda en menos de 5 segundos, sin deploy.
- Stock en la página de producto y el carrito: Supabase Realtime, cargado sin perjudicar el rendimiento inicial.
- El checkout siempre revalida en el servidor, sin importar lo que muestre la UI.
- Pedidos nuevos: aparecen en vivo en el panel, con notificación.

# FASE 3: MÉTRICAS REALES
**Fuentes de verdad:**
- Dinero: `payments` y `orders`, conciliados con Mercado Pago. Las ventas manuales se muestran separadas.
- Comportamiento: `analytics_events` propios, con eventos críticos registrados desde el servidor cuando sea posible.
- Búsqueda: Search Console.
- Rendimiento: Vercel Web Analytics y Speed Insights si aportan datos que no tengamos.

**Eventos mínimos:** `page_view`, `product_view`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `payment_approved`, `payment_rejected`, `whatsapp_click`, `announcement_view`, `announcement_click`, `tribal_interaction`. Incluir ID de sesión anónimo, producto, origen/UTM, referido y dispositivo. Filtrar bots, tráfico interno y previews.

**Tablero:**
- Ingresos brutos y netos de reembolsos y comisiones, órdenes, ticket promedio y margen cuando haya costo cargado.
- Visitantes únicos, conversión y embudo: vista → carrito → checkout → pago.
- Más vistos, más vendidos, mucha vista con poca venta y stock inmovilizado.
- Origen del tráfico: Instagram, TikTok, orgánico, referidos de IA, directo y campañas.
- Rendimiento de cupones y anuncios, y ventas atribuidas a cada campaña.
- Filtros por período, comparación con el período anterior y exportación CSV.

**Reglas:**
- Zona horaria de Argentina en todos los cálculos.
- Un clic en WhatsApp es intención, no venta. La venta cuenta solo al registrarse.
- Cada tarjeta explica en lenguaje simple qué mide y de dónde sale.
- Si no hay datos suficientes, mostrá "sin datos"; nunca rellenes.
- Definí política de privacidad y consentimiento acorde a la Ley 25.326, sin guardar datos personales en los eventos.

# FASE 4: DIRECCIÓN DE ARTE, TRIBALES Y FÍSICA
## Referencias
La dirección de arte debe basarse en la auditoría de Instagram y el benchmark de la Fase 0. Cada decisión visual importante cita su evidencia.

Analizá https://typass.ar/ como referencia de criterio, no como plantilla. Prestá atención a:
- Fondo casi negro con video de producto en el hero.
- Títulos condensados de gran escala y jerarquía tipográfica contundente.
- Un único color de acento usado con disciplina.
- Ticker manuscrito, secciones numeradas y textos sobre el oficio.
- Tarjetas sobrias y fotografía de proceso en blanco y negro.

No copies su color, textos, assets ni layout. MANGATA debe reconocerse sin ver el logo.

## Identidad MANGATA
Partí de lo que ya existe: Instagram, logo MNGT de trazo orgánico, tema oscuro, Bricolage Grotesque, Plus Jakarta Sans, denim, apliques deshilachados y actitud rebelde. Consolidalo en tokens de color, tipografía, espaciado y movimiento, con un acento propio.

Revisá: jerarquía, encuadre de fotos, nombres duplicados de productos, grilla, página de producto, carrito, estados hover/focus/disabled y copy. Reducí el splash y los overlays para que nunca demoren la compra: máximo una vez por sesión y con opción de saltar.

Destacá que cada pieza es irrepetible ("última pieza" solo si es verdad).

## Tribales
- Vectorizá a SVG los tribales a partir de apliques reales de las prendas (por ejemplo, productos 11 y 23), publicaciones de Instagram o de originales provistos por Emilia. No uses packs genéricos ni los generes con IA sin aprobación.
- Conservá la textura deshilachada: un sistema con versiones limpia y texturada, optimizadas con SVGO.
- Usalos solo donde aporten: separadores, estados de producto, vacíos, escena física y campañas.
- Evitá el relleno decorativo: si un tribal no guía, comunica o emociona, se saca.

## Física con Matter.js
Usá Matter.js. No uses Flutter Web. Documentá la decisión en un ADR.

**Con sentido:**
1. Escena principal "Del retazo a la pieza", en una sección propia: al entrar en pantalla, los tribales caen y se apilan. Se pueden arrastrar, y cada uno puede enlazar a la prenda real donde se usa.
2. Una microinteracción: al agregar a la bolsa, un tribal cae hacia el ícono.

No agregues física en el checkout, el formulario de pago, el admin ni detrás de textos de lectura. No la uses como fondo permanente de la web.

**Ingeniería:**
- Carga diferida con `next/dynamic` e IntersectionObserver; Matter.js fuera del bundle inicial.
- Renderizado propio de SVG con `transform` o canvas, no `Matter.Render` en producción.
- Cuerpos de colisión simplificados y compuestos, sin usar el SVG completo. Máximo orientativo: 20 cuerpos en desktop y 10 en mobile.
- Sleeping activado, loop pausado fuera de pantalla o con la pestaña oculta, y limpieza completa al desmontar (sin fugas).
- 60 fps en desktop medio y al menos 30 fps estables en un Android de gama media, sin romper los presupuestos de rendimiento.
- En mobile, nunca bloquear el scroll: el arrastre se activa solo con un gesto explícito, y con `pointer-events` medidos.
- `prefers-reduced-motion`, batería baja o dispositivo débil: composición estática equivalente.
- Decorativo con `aria-hidden`; los enlaces a productos existen también como lista accesible por teclado.
- SSR seguro y estático por defecto si JS falla.

**Administrable:** activar o desactivar, elegir tribales, cantidad, producto enlazado y texto de la sección, con vista previa.

**Métrica de éxito:** medí interacción y clics a producto. Compará conversión con la escena activa e inactiva cuando haya tráfico suficiente; si empeora, se ajusta o se quita.

## Objetivos
Cumplí los presupuestos de la fase transversal y WCAG 2.2 AA.

Cada cambio se justifica con el problema que resuelve e incluye captura de antes y después. Mostrame 2 o 3 direcciones visuales antes de implementar la final.

# FASE 5: ANUNCIO FLOTANTE DE CYBER MONDAY
Debe verse como parte de la marca, no como un popup de descuentos.

- Formato sugerido: en desktop, una tarjeta compacta abajo a la izquierda, con un detalle tribal; en mobile, una barra inferior que respete `safe-area-inset` y no tape "Agregar al carrito", el botón de WhatsApp ni `BackToTop`.
- Contenido: mensaje corto, beneficio concreto, una acción y cuenta regresiva solo si la fecha de fin es real.
- Comportamiento: aparece tras una señal de interés (scroll o unos segundos), se puede cerrar y recuerda el cierre por campaña. Oculto en checkout y admin.
- Sin CLS ni impacto en LCP. Respeta `prefers-reduced-motion`. Accesible por teclado, sin robar foco, contraste AA.
- Administrable desde el panel: texto, enlace, inicio, fin y activación. Se apaga solo al vencer, con fechas en hora de Argentina. Reutilizable para otras campañas.
- El descuento se aplica en el servidor. No usar urgencia falsa, precios de referencia inflados ni logos oficiales del evento sin autorización.
- Métricas: impresiones, clics, cierres y ventas atribuidas.

# FASE 6: SEGURIDAD Y SCRAPING
**Alcance autorizado:** únicamente este repositorio y entornos local y preview propios, con Mercado Pago en modo sandbox. Nada de pruebas contra producción ni terceros sin mi aprobación escrita. Sin pruebas de denegación de servicio. Credenciales y datos solo de prueba.

Verificá como mínimo:
- OWASP Top 10 y OWASP API Top 10.
- Manipulación de precio, cantidad y cupones; race conditions en stock y cupones.
- Webhooks falsificados y repetidos.
- IDOR en órdenes; acceso a `/admin` y a sus APIs sin sesión o con rol insuficiente.
- Políticas RLS, probadas con usuario anónimo y autenticado.
- XSS en campos del admin y contenido editable, CSRF y open redirects.
- Subida de archivos: tipo real, tamaño, SVG malicioso y nombres. Sanitizar todo SVG cargado desde el panel.
- Inyección de eventos falsos en analítica: validación, rate limiting y detección de anomalías.
- Secretos en el bundle y en el historial de git; dependencias vulnerables.
- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `frame-ancestors`.
- Rate limiting en login, checkout, eventos y webhooks.
- Datos personales de clientes (Ley 25.326): recolección mínima y logs sin datos sensibles.

**Scraping:** usá herramientas como Scrapling y Playwright contra preview, a baja frecuencia, para medir qué se puede extraer. Sé realista: el catálogo público siempre se puede copiar y necesita seguir siendo indexable. Protegé lo que importa (datos de clientes, órdenes, costos, métricas, stock interno y APIs) y aplicá rate limiting y reglas de WAF sin bloquear a buscadores legítimos ni afectar a compradores reales.

Entregá un informe con severidad, reproducción, corrección y una re-prueba que confirme cada fix. Agregá las regresiones como tests.

# FASE 7: PRODUCCIÓN
- CI: lint, typecheck, tests, build, `npm audit`, presupuestos de rendimiento y validación de datos estructurados.
- Tests: unitarios de precios, estados y cálculo de métricas; integración de webhook, reservas y RLS; E2E con Playwright del recorrido de compra completo, alta de producto y edición de contenido desde el admin.
- Sentry y logs estructurados, con alertas de webhook fallido y pago sin orden.
- Backups verificados con una restauración de prueba.
- Prueba de carga moderada en preview simulando el pico de la campaña.
- Dominio definitivo, redirecciones y variables por entorno.
- Documentación: README técnico, runbook de incidentes y una guía simple para Emilia.
- Checklist de lanzamiento con plan de rollback y una compra real de bajo monto, que yo apruebe, reembolsada después.

# CRITERIOS DE ACEPTACIÓN
**Comercio y seguridad**
- [ ] Modificar precio o cantidad desde el cliente no altera lo cobrado.
- [ ] Dos compras simultáneas de la última pieza no generan sobreventa.
- [ ] Un webhook repetido, falso o desordenado no corrompe datos.
- [ ] Sin sesión de admin, ninguna ruta ni API administrativa es accesible.
- [ ] Sin hallazgos críticos o altos abiertos.

**Panel**
- [ ] Emilia completa sola, desde el celular, el alta de un producto con fotos.
- [ ] Emilia cambia hero, promo, WhatsApp, anuncio, metadatos y escena de tribales sin tocar código ni hacer deploy.
- [ ] Un cambio en el admin se ve en la tienda en menos de 5 segundos.

**Métricas**
- [ ] Una compra de prueba en sandbox aparece en pedidos, pagos y tablero en menos de 1 minuto.
- [ ] Los ingresos coinciden con Mercado Pago en una conciliación de prueba.
- [ ] Bots, tráfico interno y previews no alteran las métricas.

**SEO, GEO y rendimiento**
- [ ] Home, colecciones y productos entregan su contenido principal en el HTML inicial.
- [ ] Las páginas indexables pasan la validación de datos estructurados y coinciden con el contenido visible.
- [ ] Sitemap enviado y cobertura revisada en Search Console, sin errores críticos.
- [ ] MANGATA es el primer resultado de su búsqueda de marca, o hay un diagnóstico y un plan si otra entidad domina ese nombre.
- [ ] Los presupuestos de rendimiento se cumplen en mobile y CI bloquea regresiones.

**Marca y experiencia**
- [ ] La auditoría de Instagram cubre el 100 % de lo accesible e informa lo que faltó.
- [ ] El benchmark está documentado con mediciones y fecha.
- [ ] Las decisiones visuales importantes citan evidencia de Instagram o del benchmark.
- [ ] La escena física no bloquea el scroll en mobile, respeta `reduced-motion` y no carga Matter.js en el bundle inicial.
- [ ] Los tribales provienen de assets reales de la marca.
- [ ] El anuncio se activa y vence solo, sin tapar acciones ni generar CLS.
- [ ] WCAG 2.2 AA cumplido en mobile y desktop.

# FORMATO DE ENTREGA POR FASE
1. Qué cambió y por qué.
2. Evidencia de verificación.
3. Riesgos pendientes y lo que no se pudo probar.
4. Decisiones que necesito tomar.
5. Instrucciones de rollback.

Comenzá ahora con la Fase 0.
