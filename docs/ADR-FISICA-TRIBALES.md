# ADR: motor de física para los tribales

**Decisión:** Matter.js 0.20, configurado para esta escena. Se carga recién al llegar a la sección.

## Medición

Misma escena en cada motor: 10 cuerpos compuestos que caen en una caja de 900×420 a 60 Hz. Medido en Node el 06/11/2026.

| Motor | Peso comprimido | Se asienta en | Residuo al final | Licencia |
|---|---|---|---|---|
| Matter.js, valores por defecto | 25 KB | 3,67 s | 0 px/s, 10 de 10 dormidos | MIT |
| **Matter.js, 12 y 8 iteraciones** | **25 KB** | **2,75 s** | **0 px/s, 10 de 10 dormidos** | MIT |
| Planck.js 1.5 | 54 KB | 3,03 s | 0 px/s | MIT |
| Rapier 2D 0.21 (WASM) | 1.253 KB | 4,43 s | 0 px/s | Apache-2.0 |

Las cifras de Matter usan `sleepThreshold: 30` y no cuentan cuerpos dormidos. Una primera corrida contaba la velocidad guardada de los dormidos y lo hacía parecer inestable: era un error de la medición.

Esta prueba usa formas compactas. Con los tribales reales los brazos se traban y las piezas no llegaban a dormirse solas, así que la escena fuerza el reposo: duerme lo que casi no se mueve después de 2,5 s y todo después de 6 s sin interacción.

## Descartados

- **Flutter Web:** es un framework de aplicaciones completas, con un motor gráfico propio. Agrega megas de descarga y no aporta física. Tu prompt ya lo excluía.
- **Rapier:** 50 veces más pesado, sin ventaja visible para pocas piezas.
- **Planck:** muy buen motor, pero duplica el peso y exigía reescribir sin mejorar el resultado medido.
- **Mantenimiento de Matter:** su última publicación es de 2024. Es un riesgo menor porque la escena es opcional, no toca la compra y puede quitarse sin afectar la tienda.

## Lo que da la sensación

La calidad no sale del motor sino de estos ajustes:

- Paso de simulación fijo, igual a 30, 60 o 120 Hz.
- Cuerpos de hasta 16 círculos, calculados desde la silueta y con cobertura en los brazos.
- Fricción alta, rebote mínimo y arrastre con resorte suave.
- En pantalla táctil, el arrastre empieza solo tras mantener apretado 240 ms. Un deslizamiento normal sigue siendo scroll.

## Tribales

Solo 3 siluetas cumplen la exigencia de provenir de apliques reales: las de la Bermuda Tribal, trazadas con `scripts/trace-tribals.mjs`. La cruz bordada de la Campera Rituales y los motivos de la Bermuda Oscuridad se probaron y se descartaron porque el trazo no era fiel. Más formas requieren originales de Emilia o fotos con más detalle.

potrace tiene licencia GPL. Se usa como herramienta externa, fuera de las dependencias del proyecto.

## Pendiente

- Aprobación de las siluetas por parte de Emilia.
- Administrar la escena desde el panel: activar, elegir tribales, cantidad, producto enlazado y texto.
- Microinteracción al sumar a la bolsa.
- Medir en un Android de gama media y comparar la conversión con la escena activa e inactiva.
