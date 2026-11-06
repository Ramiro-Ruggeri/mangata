# ADR: tribales sin física

**Decisión:** los tribales son gráficos grandes y fijos, sin motor de física. El único movimiento es un sello de 300 ms al sumar a la bolsa.

## Por qué cambió

El prompt pedía Matter.js y se construyó la escena, con 60 fps medidos y piezas que se apilaban. Ramiro la probó y dijo que se sentía rara, aunque le encantaron las formas. Esa impresión pesa más que las mediciones de fluidez.

La investigación de marcas de moda (06/11/2026, solo el código de sus páginas de inicio, no resultados de venta) no encontró Matter.js en ninguna. Fear of God, Our Legacy, Stüssy, Aimé Leon Dore, Bode y Rick Owens usan fundidos, transiciones de vista o carruseles. KidSuper es el extremo lúdico, con canvas y 4,8 MB transferidos.

No hay un test público serio que aísle el efecto del movimiento en las ventas. La evidencia medida es sobre velocidad, y esto quita peso de la página.

## Efecto

- Matter.js sale de las dependencias. La escena con física queda en el historial, en el commit 04ea4ab.
- Sin bucle de animación ni gesto especial en celular: el scroll queda libre.
- Con movimiento reducido, el sello no aparece.

## Tribales

Solo 3 siluetas cumplen la exigencia de provenir de apliques reales: las de la Bermuda Tribal, trazadas con `scripts/trace-tribals.mjs`. La cruz bordada de la Campera Rituales y los motivos de la Bermuda Oscuridad se probaron y se descartaron porque el trazo no era fiel.

potrace tiene licencia GPL. Se usa como herramienta externa, fuera de las dependencias del proyecto.

## Pendiente

- Aprobación de las siluetas por parte de Emilia.
- Administrar los tribales desde el panel.
- Comparar la conversión cuando haya métricas y tráfico suficiente.
