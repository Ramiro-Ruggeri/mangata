# Campaña e identidad · segunda pasada

14/09/2026. Se preservaron todos los originales y las fotos de las prendas reales. No se generaron vistas ni detalles de productos a la venta.

## Diagnóstico reproducido

Antes, a viewport 430 × 932, DPR real 1, la campaña ocupaba 415 × 435,75 CSS px. `currentSrc` era `/_next/image?url=%2Fcampaign%2Frework-still-life-v1.webp&w=640&q=75`. El original era 1672 × 940. `object-fit: cover` necesitaba ampliar la altura del derivado horizontal y recortaba gran parte del ancho. No era 4K.

La imagen nueva ocupa 415 × 415 CSS px en el mismo viewport, usa `contain` y un derivado cuadrado de 640 × 640 a calidad 85. La composición completa queda visible; el mayor detalle útil viene de un encuadre adaptado y de no ampliar destructivamente el recorte horizontal.

## Entregables y límites

- Máster nuevo: `source-assets/campaign/rework-still-life-v2.png`, **1254 × 1254 px**.
- Derivado web: `public/campaign/rework-still-life-v2.webp`, calidad 90. Next entrega AVIF/WebP responsive con `sizes`, calidad 85 y lazy loading. No se descarga un máster grande en todos los móviles.
- La herramienta integrada recibió una solicitud de mayor resolución, pero devolvió 1254 × 1254. **No se reescaló y no se presenta como 4K ni como fotografía de un taller real.**
- Texto visible: “Estudio de materiales · campaña conceptual”.
- El símbolo auténtico se conserva en `public/brand/logoAnimacionMANGATA.png`, 1024 × 1024, sin cambios de forma/color. No apareció un vector auténtico. La palabra MANGATA a su lado es tipografía de interfaz, no un nuevo logo aprobado.
- `BrandSignature` reutiliza símbolo/nombre en home, ficha, bolsa, checkout y páginas de error. Logo renderizado a 32–40 CSS px; el original cubre holgadamente DPR 1/2/3.
- Favicon 64 × 64: 2566 bytes; Apple icon 180 × 180: 10845 bytes. Se derivan reproduciblemente con `npm run images:brand`, sin borrar el original.
- Preview social existente conservado y revisado: 1200 × 630, símbolo auténtico, nombre y descriptor. No se añadió ®.

## Cobertura de densidad: cálculo, no emulación ficticia

El navegador disponible se inspeccionó a DPR 1. La herramienta de viewport sólo cambia ancho/alto: no se afirma una prueba física ni emulación DPR 2/3.

| Uso de campaña | DPR 1 | DPR 2 | DPR 3 |
| --- | --- | --- | --- |
| 320 CSS px | 320 px requeridos | 640 px | 960 px |
| 390 CSS px | 390 px | 780 px | 1170 px |
| 430 CSS px | 430 px | 860 px | 1290 px: supera ligeramente el máster |
| 720 CSS px | 720 px | 1440 px: supera el máster | 2160 px: supera el máster |

Los derivados nunca inventan detalle. Para pantallas grandes a DPR alto sigue siendo necesario un máster genuinamente mayor; es un límite de material, no una promesa de nitidez 4K. Verificar visualmente en dispositivos físicos antes de aprobar campaña final.

## Prompt ejecutado con la herramienta integrada

Modo: generación de una composición nueva; la campaña v1 fue sólo referencia de estilo. No se usó CLI/API ni se solicitaron credenciales.

> Use case: ads-marketing. Asset type: new square editorial campaign image for the materials story section of MANGATA, an independent recovered streetwear brand in Córdoba Argentina. Input image 1: STYLE REFERENCE ONLY — earlier conceptual denim/metal campaign, NOT a product being sold, NOT a photograph of the actual workshop. Generate a fresh composition, not a sharpened upscale of the reference. Primary request: a refined photorealistic materials still life of one broad piece of reclaimed deep-indigo denim draped over a single bent brushed-steel hoop above a small dark concrete block. Strong visible denim weave, worn seams, naturally frayed threads, finely textured cool metal and restrained shadow detail. Composition: SQUARE composition, subject visually centered with breathing room at all edges, fills the central 75% of the frame. Keep every important fabric edge and the whole steel arc visible in both square and a slight 4:5 crop. No giant empty left half. Request high native resolution around 2880x2880 if supported, prioritize genuine fine woven detail. Lighting: tactile fashion editorial studio light from upper left, deep charcoal background with only a subtle desaturated violet edge glow; grounded physical shadows, crisp fabric, quiet premium mood. Constraints: conceptual material study only; no models, no hands, no clothes presented as catalog products, no tools suggesting an actual workshop. No text, no logo, no watermark, no sci-fi neon, no fog covering the fabric, no plastic fabric, no aggressive sharpening halos. Use the supplied reference palette and materials, not its landscape layout.
