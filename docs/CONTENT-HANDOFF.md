# MANGATA · Entrega de contenido para Emilia

Fuente: `src/lib/products.ts` y la normalización de `src/lib/commerce/catalog.ts`. El catálogo declara 31 SKU y 39 archivos de imagen distintos dentro de sus fichas: 24 productos tienen uno, seis tienen dos y uno tiene tres. Contamos archivos únicos; un collage puede contener varios detalles sin equivaler a fotografías independientes. Los sufijos de archivo no permiten afirmar qué ángulo representa cada imagen. Esta entrega no modifica fotos ni datos comerciales.

## Inventario de imágenes declaradas

| SKU | Producto | Archivos únicos en ficha |
| --- | --- | ---: |
| MNGT-001 | Baggy Denim Custom | 1 |
| MNGT-002 | Baggy Denim Custom | 1 |
| MNGT-003 | Baggy Foil | 2 |
| MNGT-004 | Canesú | 2 |
| MNGT-005 | Pollera Foil | 2 |
| MNGT-006 | Buzo Alitas | 2 |
| MNGT-007 | Campera Corderoy | 2 |
| MNGT-008 | Campera de Jean | 3 |
| MNGT-009 | Blazer Cuadrillé | 2 |
| MNGT-010 | Sastrero Baggy Black | 1 |
| MNGT-011 | Bermuda Tribal | 1 |
| MNGT-012 | Mono Black | 1 |
| MNGT-013 | Corbata Corazón | 1 |
| MNGT-014 | Top Cruz | 1 |
| MNGT-015 | Musculosa Red | 1 |
| MNGT-016 | Vestido Microtul | 1 |
| MNGT-017 | Camisa Crop Cuadrillé | 1 |
| MNGT-018 | Choker Metalizado | 1 |
| MNGT-019 | Mini Volado | 1 |
| MNGT-020 | Corpiño Óxido | 1 |
| MNGT-021 | Musculosa Cute | 1 |
| MNGT-022 | Bag Croco | 1 |
| MNGT-023 | Baggy Tribal | 1 |
| MNGT-024 | Hood Denim | 1 |
| MNGT-025 | Boxy Black | 1 |
| MNGT-026 | Top Picos | 1 |
| MNGT-027 | Cinto Utilitario | 1 |
| MNGT-028 | Falda Red Plata | 1 |
| MNGT-029 | Micro Mini | 1 |
| MNGT-030 | Musculosa Trash | 1 |
| MNGT-031 | Pasamontañas Friza | 1 |

Los archivos declarados usan extensiones originales; la web los normaliza a WebP. Una portada repetida en `img` e `images` se cuenta una sola vez.

## Protocolo por SKU

Emilia debe revisar las imágenes actuales y marcar cada cobertura como “cubierta”, “falta” o “no aplica”, asociando el archivo que la demuestra. No dar por cubierta una toma por su nombre o por la cantidad de imágenes de la ficha.

- Frente: prenda completa, sin cortar bordes ni deformar proporciones.
- Espalda: vista completa con distancia y encuadre comparables al frente.
- Intervención: acercamiento donde se vea el trabajo específico de esa pieza.
- Textura: detalle enfocado con luz que conserve el color real.
- Terminaciones: costuras, bordes, cierres y marcas de uso relevantes.
- Escala: referencia física o toma que ayude a entender dimensiones, sin reemplazar las medidas escritas.
- Calce auténtico: fotografía de esa misma pieza sobre una persona, cuando exista. Registrar medidas de referencia con consentimiento; nunca simular un calce o cuerpo con IA.

Conservar originales; nombrar las nuevas tomas con SKU y contenido real, por ejemplo `MNGT-003-espalda`. Usar luz estable, fondo sencillo y encuadre consistente. Exportar versiones optimizadas para la web. No corregir digitalmente defectos, costuras, desgaste, color o silueta que formen parte del artículo vendido.

La campaña generada es contenido conceptual de marca. No debe asignarse como evidencia de un producto ni como foto del taller.

## Medidas y ficha

Registrar siempre SKU, fecha, responsable, medida en centímetros y método. Medir la prenda extendida sin estirarla e indicar si el dato es ancho plano o contorno; no mezclar ambos. Anotar elasticidad sólo después de comprobarla.

| Tipo de pieza | Medidas a relevar cuando apliquen |
| --- | --- |
| Pantalón / bermuda | Cintura, cadera, tiro, entrepierna, largo total y abertura de pierna |
| Top / camisa / buzo / campera | Pecho, hombros, manga y largo total |
| Pollera / vestido / mono | Cintura, cadera, largo total y pecho o tiro según construcción |
| Accesorio | Alto, ancho, profundidad, largo o rango de ajuste según el artículo |

Agregar composición verificable, intervención realizada, estado, marcas conservadas e instrucciones de cuidado confirmadas. Si falta un dato, mantener la consulta por medidas y evitar equivalencias de talle inventadas. Verificar también que los nombres diferencien productos con el mismo título.

**Revisión de Emilia: MNGT-024, Hood Denim.** La descripción actual dice “Hoodie intervenido con denim”; la fotografía inspeccionada parece mostrar una capucha independiente. Confirmar qué artículo se vende, nombre, categoría, dimensiones y contenido de la compra antes de destacarlo. La observación visual no sustituye su validación y no se modificó el producto.

## Hipótesis CRO pendientes de probar

Estas propuestas no son pruebas ejecutadas ni resultados de ventas. Antes de iniciar, registrar variante, unidad de asignación, muestra necesaria según tráfico y conversión de base, duración, criterio de decisión y métricas. Conservar la asignación por visitante y comparar períodos y fuentes equivalentes. No detener una prueba al aparecer un resultado favorable temprano. Si el tráfico es insuficiente, declarar el resultado inconcluso y complementar con observación de tareas de compra.

| Fricción | Variante | Métrica principal | Guardrails | Mantener / descartar |
| --- | --- | --- | --- | --- |
| El mensaje editorial puede retrasar el acceso a piezas concretas. | Una prenda real protagonista, nombre/precio enlazados y CTA “Ver las piezas”, frente a la apertura de referencia conservada. | Visitantes que seleccionan un producto / visitantes expuestos al hero. | LCP, abandono y avance posterior a bolsa/checkout; distribución de disponibilidad equivalente. | Mantener si mejora la selección con evidencia suficiente según el criterio previo y no perjudica el avance comercial ni la carga. Descartar si genera clics sin intención o deteriora esos controles. |
| El beneficio por transferencia puede pasar inadvertido en mobile o confundirse con el precio general. | Precio general y precio de transferencia visibles juntos, con método explícito, frente a la presentación de referencia. | Visitantes que inician checkout / visitantes de ficha mobile. | Consultas por precio, fallos de pago, abandono en checkout y mezcla de métodos; descuentos y precios deben ser idénticos entre variantes. | Mantener si mejora el inicio de checkout sin aumentar confusión o fallos. Descartar si la jerarquía induce a interpretar un precio condicionado como universal. |
| La falta de medidas obliga a salir a WhatsApp antes de decidir. | Medidas reales y método de medición junto a la información de compra, conservando ayuda por WhatsApp. | Visitantes que agregan una pieza / visitantes de fichas elegibles. | Cambios por talle, consultas no resueltas, abandono y disponibilidad. Las mismas fichas deben tener datos verificados en ambas variantes; comparar ubicación visible frente a acceso en acordeón. | Mantener si la ubicación visible facilita agregar y no aumenta errores de talle. Descartar la presentación si empeora comprensión; conservar siempre los datos reales, aunque cambie su ubicación. |

Registrar SKU y origen en los eventos, sin teléfonos, nombres ni mensajes privados. El stock de unidad única puede agotar productos durante una prueba; excluir comparaciones sin disponibilidad equivalente y documentar el efecto antes de atribuirlo al diseño.
