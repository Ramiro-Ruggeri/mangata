# MANGATA — medidas y política comercial · 21/09/2026

## Datos incorporados

Emilia confirmó medidas para 16 de las 26 piezas activas. Se conservaron las etiquetas informadas —ancho, ancho de pecho, cintura/cadera, largo y dimensiones— sin convertirlas a talle ni decidir si representan plano o contorno. Las diez fichas restantes mantienen la consulta contextual por WhatsApp hasta que la marca mida físicamente esas prendas.

“Camperas corderoy” se aplicó a Campera Rituales y Campera Reverso; “Campera de Jean” a Campera Deseos; “Bermuda gris” a Bermuda Oscuridad; “bermuda azul” a Bermuda Tribal; “jean foil” a Pantalón Foil; “jean vaquero” a Vaquero Tribal; “Top moñitos” a Bandoo Moñito. Los nombres, SKU, precios, imágenes y stock no cambiaron.

Las medidas se muestran en la ficha antes de sumar a la bolsa. El catálogo local y la API comparten el mismo dato. Una prueba fija el mapeo completo para impedir que una medida termine en otra pieza.

## Cambios, encargos y arrepentimiento

La regla comercial confirmada quedó visible en FAQ, ficha, bolsa y `/cambios`: fuera de los derechos y garantías legales, las piezas únicas no tienen devolución de dinero; se admite cambio por otra pieza disponible de igual valor o diferencia para un encargo. Los encargos llevan 50% de seña al iniciar y saldo al finalizar.

No se publicó la frase absoluta “no realizamos devoluciones de dinero”. En ventas online la normativa argentina reconoce diez días corridos para arrepentirse y contempla excepciones para productos personalizados o hechos según indicaciones. El sitio agrega un enlace directo llamado “BOTÓN DE ARREPENTIMIENTO” que abre el canal real de MANGATA sin registro previo. La operación debe responder manualmente con un código dentro de 24 horas. Referencias oficiales consultadas: Disposición 954/2025 y Ley 24.240. Esto reduce un riesgo evidente, pero no constituye certificación ni asesoramiento legal.

## Verificación

- 41 pruebas de lógica/API, ESLint, TypeScript y build productivo: aprobados.
- Suite completa de navegador: Chromium y WebKit; 13 viewports de 320 a 2560 px, navegación, responsive, bolsa simulada, retorno, física, teclado, touch, reduced motion y recuperación de imagen; no abrió checkout.
- Prueba específica de medidas/política: Chromium y WebKit a 320, 390 y 1440 px; datos confirmados visibles, prendas pendientes sin datos inventados, `/cambios` y enlace directo de arrepentimiento, sin desborde horizontal.
- La reactivación de etiquetas Matter.js por teclado/puntero ahora funciona aun cuando el observador ve menos del 25% del área. El inicio automático sigue pausándose fuera de pantalla y `prefers-reduced-motion` continúa desactivando la física.

## Pendiente operativo

Emilia debe aportar la próxima semana las medidas físicas de las diez piezas restantes e indicar cómo se tomó cada ancho. También debe atender las solicitudes de arrepentimiento y emitir el código comprometido dentro de 24 horas. Siguen pendientes la identidad fiscal, el domicilio comercial y una validación legal integral del negocio.

## Publicación verificada

- Commit de aplicación: `19b487b2aee99f60ca0335717aeecfb3eaa36076`, enviado a `origin/main`.
- Imagen activa: `mangata/web:19b487b2aee99f60ca0335717aeecfb3eaa36076`; release `/opt/mangata/releases/19b487b2aee99f60ca0335717aeecfb3eaa36076` enlazado desde `/opt/mangata/current`.
- Archivo de publicación validado por SHA-256: `0bf781c0ce9fd722115879b63faaa1aa0354a9ebd8278b5d653dc1bb3359515a`.
- Candidato aislado saludable antes del cambio; contenedor final saludable después. El archivo privado de configuración comercial conservó el mismo hash, y la base, volumen de imágenes, stock, pagos, proxy y certificados no se migraron ni reinicializaron.
- Smoke HTTPS público: health, catálogo, `/cambios`, ficha de Rituales y sitemap respondieron 200; 26 productos, 16 con medidas, Rituales 108 × 63 cm, Blazer sin medidas inventadas y 28 URLs. HTTP y `www` redirigen al apex HTTPS.
- La prueba específica volvió a pasar en el dominio público con Chromium y WebKit. La suite integral de producción pasó en Chromium para 13 viewports de 320 a 2560 px; bloqueó toda solicitud de checkout. Los demás contenedores del VPS conservaron su ejecución.
