// src/lib/products.ts
export type Category = "Prendas" | "Accesorios";

export type Product = {
  id: number;
  sku?: string;
  name: string;
  price: number; // ARS
  img?: string;
  images?: string[];
  description?: string;
  inStock?: boolean;
  transferDiscount?: number;
  category: Category;
  isNew?: boolean;
  order?: number;
};

// Reconciled against the client's Drive inventory on 2026-09-14.
// Removed IDs are never recycled; history is preserved in docs/catalog-retired-2026-09.json.
export const products: Product[] = [
  {
    id: 32,
    name: "Bandoo Moñito",
    price: 10000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/bandoo-monito.webp",
    images: [
      "/catalog/2026-09/bandoo-monito.webp"
    ],
    description: "Bandoo negro con moñito y terminación de encaje.",
    order: 5
  },
  {
    id: 33,
    name: "Bermuda Oscuridad",
    price: 17000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/bermuda-oscuridad.webp",
    images: [
      "/catalog/2026-09/bermuda-oscuridad.webp"
    ],
    description: "Bermuda de denim gris, con ruedo desflecado y apliques negros.",
    order: 6
  },
  {
    id: 34,
    name: "Camisa Jappon",
    price: 12000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/camisa-jappon.webp",
    images: [
      "/catalog/2026-09/camisa-jappon.webp"
    ],
    description: "Camisa corta azul, con textura marcada y mangas largas.",
    order: 7
  },
  {
    id: 1,
    name: "Vaquero Tribal",
    price: 50000,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    isNew: true,
    img: "/catalog/2026-09/vaquero-tribal.webp",
    images: [
      "/catalog/2026-09/vaquero-tribal.webp"
    ],
    description: "Jean azul con dibujo tribal bordado en una pierna.",
    order: 10
  },
  {
    id: 3,
    name: "Pantalón Foil",
    price: 55900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/pant-foil-delante.webp",
    images: [
      "/catalog/2026-09/pant-foil-delante.webp",
      "/catalog/2026-09/pant-foil-atras.webp"
    ],
    description: "Pantalón negro con paneles de denim y detalles de foil.",
    order: 30
  },
  {
    id: 4,
    name: "Pantalón Canesú",
    price: 69900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/pantalon-con-canesu.webp",
    images: [
      "/catalog/2026-09/pantalon-con-canesu.webp"
    ],
    description: "Pantalón negro de pierna ancha, con canesú y botones a la vista.",
    order: 40
  },
  {
    id: 5,
    name: "Mini Foil",
    price: 58900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/mini-foil-delante.webp",
    images: [
      "/catalog/2026-09/mini-foil-delante.webp",
      "/catalog/2026-09/mini-foil-atras.webp"
    ],
    description: "Mini negra con volado y detalles de foil.",
    order: 50
  },
  {
    id: 6,
    name: "Buzo Alitas",
    price: 17000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/buzo-alitas-delante.webp",
    images: [
      "/catalog/2026-09/buzo-alitas-delante.webp",
      "/catalog/2026-09/buzo-alitas-atras.webp"
    ],
    description: "Buzo corto de mangas largas, con tiras y recortes.",
    order: 60
  },
  {
    id: 7,
    name: "Campera Rituales",
    price: 95900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/campera-corderoy-corregida.webp",
    images: [
      "/catalog/2026-09/campera-corderoy-corregida.webp"
    ],
    description: "Campera de corderoy color caramelo, con parches negros y dibujos tribales en la espalda.",
    order: 70
  },
  {
    id: 8,
    name: "Campera Deseos",
    price: 97900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/campera-deseos.webp",
    images: [
      "/catalog/2026-09/campera-deseos.webp"
    ],
    description: "Campera corta de jean con detalles aplicados en el frente.",
    order: 80
  },
  {
    id: 9,
    name: "Blazer Cuadrillé",
    price: 25000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/blazer-cuadrille.webp",
    images: [
      "/catalog/2026-09/blazer-cuadrille.webp",
      "/catalog/2026-09/blazer-atras.webp"
    ],
    description: "Blazer cuadrillé en tonos ladrillo, con detalles aplicados en el frente.",
    order: 90
  },
  {
    id: 11,
    name: "Bermuda Tribal",
    price: 17000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/bermuda-tribal-azul-delante.webp",
    images: [
      "/catalog/2026-09/bermuda-tribal-azul-delante.webp",
      "/catalog/2026-09/bermuda-tribal-azul-atras.webp"
    ],
    description: "Bermuda denim con apliques tribales.",
    order: 110
  },
  {
    id: 12,
    name: "Mono Black",
    price: 109900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/mono-black.webp",
    images: [
      "/catalog/2026-09/mono-black.webp"
    ],
    description: "Mono negro minimal con ajuste cómodo.",
    order: 120
  },
  {
    id: 22,
    name: "Cartera Crocco",
    price: 69900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Accesorios",
    img: "/catalog/2026-09/cartera-crocco.webp",
    images: [
      "/catalog/2026-09/cartera-crocco.webp"
    ],
    description: "Bolso textura croco upcycled. Compacto y robusto.",
    order: 220
  },
  {
    id: 14,
    name: "Top Cruz",
    price: 45900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/top-cruz.webp",
    images: [
      "/catalog/2026-09/top-cruz.webp"
    ],
    description: "Top cruzado con recortes y ajuste firme.",
    order: 140
  },
  {
    id: 16,
    name: "Vestido Microtul",
    price: 95900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/vestido-microtul.webp",
    images: [
      "/catalog/2026-09/vestido-microtul.webp"
    ],
    description: "Vestido etéreo de microtul. Capas y movimiento.",
    order: 160
  },
  {
    id: 17,
    name: "Camisa Crop Cuadrillé",
    price: 12000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/camisa-crop-cuadrille.webp",
    images: [
      "/catalog/2026-09/camisa-crop-cuadrille.webp"
    ],
    description: "Camisa recortada con patrón cuadrillé.",
    order: 170
  },
  {
    id: 20,
    name: "Top Óxido",
    price: 44900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/top-oxido.webp",
    images: [
      "/catalog/2026-09/top-oxido.webp"
    ],
    description: "Top de denim con tiras finas y detalles en tonos óxido.",
    order: 200
  },
  {
    id: 21,
    name: "Top Cute",
    price: 38900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/top-cute.webp",
    images: [
      "/catalog/2026-09/top-cute.webp"
    ],
    description: "Top claro con terminaciones de encaje negro y detalles aplicados.",
    order: 210
  },
  {
    id: 25,
    name: "Boxy Black",
    price: 10000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/boxy.webp",
    images: [
      "/catalog/2026-09/boxy.webp"
    ],
    description: "Remera negra de corte boxy y manga corta.",
    order: 250
  },
  {
    id: 26,
    name: "Top Picos",
    price: 46900,
    inStock: true,
    transferDiscount: 0.1,
    category: "Prendas",
    img: "/catalog/2026-09/top-picos.webp",
    images: [
      "/catalog/2026-09/top-picos.webp"
    ],
    description: "Top con picos y recortes geométricos.",
    order: 260
  }
];
