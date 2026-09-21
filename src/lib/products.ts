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
  measurements?: Array<{ label: string; value: string }>;
  inStock?: boolean;
  transferDiscount?: number;
  category: Category;
  isNew?: boolean;
  order?: number;
};

// Reconciled against the client's Drive inventory on 2026-09-14.
// All 26 opening prices are final ARS amounts confirmed by the client.
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
    measurements: [
      { label: "Ancho", value: "67 cm (contiene elástico)" },
      { label: "Largo", value: "36 cm" }
    ],
    order: 5
  },
  {
    id: 33,
    name: "Bermuda Oscuridad",
    price: 25000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/bermuda-oscuridad.webp",
    images: [
      "/catalog/2026-09/bermuda-oscuridad.webp"
    ],
    description: "Bermuda de denim gris, con ruedo desflecado y apliques negros.",
    measurements: [
      { label: "Ancho", value: "97 cm" },
      { label: "Largo", value: "50 cm" }
    ],
    order: 6
  },
  {
    id: 34,
    name: "Camisa Jappon",
    price: 15000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/camisa-jappon.webp",
    images: [
      "/catalog/2026-09/camisa-jappon.webp"
    ],
    description: "Camisa corta azul, con textura marcada y mangas largas.",
    measurements: [
      { label: "Ancho de pecho", value: "102 cm" },
      { label: "Largo de prenda", value: "47 cm" },
      { label: "Largo de manga", value: "60 cm" }
    ],
    order: 7
  },
  {
    id: 1,
    name: "Vaquero Tribal",
    price: 25000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/vaquero-tribal.webp",
    images: [
      "/catalog/2026-09/vaquero-tribal.webp"
    ],
    description: "Jean azul con dibujo tribal bordado en una pierna.",
    measurements: [
      { label: "Ancho de cadera/cintura", value: "88 cm" },
      { label: "Largo de prenda", value: "107 cm" }
    ],
    order: 10
  },
  {
    id: 3,
    name: "Pantalón Foil",
    price: 25000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/pant-foil-delante.webp",
    images: [
      "/catalog/2026-09/pant-foil-delante.webp",
      "/catalog/2026-09/pant-foil-atras.webp"
    ],
    description: "Pantalón negro con paneles de denim y detalles de foil.",
    measurements: [
      { label: "Ancho de cintura/cadera", value: "85 cm" },
      { label: "Largo de prenda", value: "96 cm" }
    ],
    order: 30
  },
  {
    id: 4,
    name: "Pantalón Canesú",
    price: 25000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/pantalon-con-canesu.webp",
    images: [
      "/catalog/2026-09/pantalon-con-canesu.webp"
    ],
    description: "Pantalón negro de pierna ancha, con canesú y botones a la vista.",
    measurements: [
      { label: "Ancho de cintura", value: "75 cm" },
      { label: "Largo de prenda", value: "102 cm" }
    ],
    order: 40
  },
  {
    id: 5,
    name: "Mini Foil",
    price: 17000,
    inStock: true,
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
    measurements: [
      { label: "Ancho", value: "120 cm" },
      { label: "Largo de prenda", value: "34 cm" }
    ],
    order: 60
  },
  {
    id: 7,
    name: "Campera Rituales",
    price: 30000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/campera-rituales-frente.webp",
    images: [
      "/catalog/2026-09/campera-rituales-frente.webp",
      "/catalog/2026-09/campera-rituales-dorso.webp"
    ],
    description: "Campera de corderoy color caramelo, con parches negros y dibujos tribales en la espalda.",
    measurements: [
      { label: "Ancho de pecho", value: "108 cm" },
      { label: "Largo de prenda", value: "63 cm" }
    ],
    order: 70
  },
  {
    id: 8,
    name: "Campera Deseos",
    price: 30000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/campera-deseos.webp",
    images: [
      "/catalog/2026-09/campera-deseos.webp"
    ],
    description: "Campera corta de jean con detalles aplicados en el frente.",
    measurements: [
      { label: "Ancho", value: "102 cm" },
      { label: "Largo", value: "44 cm" }
    ],
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
    price: 25000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/bermuda-tribal-azul-delante.webp",
    images: [
      "/catalog/2026-09/bermuda-tribal-azul-delante.webp",
      "/catalog/2026-09/bermuda-tribal-azul-atras.webp"
    ],
    description: "Bermuda denim con apliques tribales.",
    measurements: [
      { label: "Ancho de cadera/cintura", value: "84 cm" },
      { label: "Largo de prenda", value: "64 cm" }
    ],
    order: 110
  },
  {
    id: 12,
    name: "Mono Black",
    price: 15000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/mono-black.webp",
    images: [
      "/catalog/2026-09/mono-black.webp"
    ],
    description: "Mono negro minimal con ajuste cómodo.",
    measurements: [
      { label: "Ancho de pecho", value: "90 cm" },
      { label: "Largo de prenda", value: "80 cm" }
    ],
    order: 120
  },
  {
    id: 22,
    name: "Cartera Crocco",
    price: 15000,
    inStock: true,
    category: "Accesorios",
    img: "/catalog/2026-09/cartera-crocco.webp",
    images: [
      "/catalog/2026-09/cartera-crocco.webp"
    ],
    description: "Bolso textura croco upcycled. Compacto y robusto.",
    measurements: [
      { label: "Dimensiones", value: "26 × 18 cm" }
    ],
    order: 220
  },
  {
    id: 14,
    name: "Top Cruz",
    price: 10000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/top-cruz.webp",
    images: [
      "/catalog/2026-09/top-cruz.webp"
    ],
    description: "Top cruzado con recortes y ajuste firme.",
    measurements: [
      { label: "Largo de la pieza que rodea el cuello", value: "70 cm" }
    ],
    order: 140
  },
  {
    id: 16,
    name: "Vestido Microtul",
    price: 15000,
    inStock: true,
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
    price: 15000,
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
    price: 10000,
    inStock: true,
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
    price: 12000,
    inStock: true,
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
    measurements: [
      { label: "Ancho de pecho", value: "102 cm" },
      { label: "Largo de prenda", value: "60 cm" }
    ],
    order: 250
  },
  {
    id: 26,
    name: "Top Picos",
    price: 12000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/top-picos.webp",
    images: [
      "/catalog/2026-09/top-picos.webp"
    ],
    description: "Top con picos y recortes geométricos.",
    order: 260
  },
  {
    id: 35,
    name: "Campera Reverso",
    price: 30000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/campera-corderoy-2.webp",
    images: ["/catalog/2026-09/campera-corderoy-2.webp"],
    description: "Campera de corderoy caramelo, con parches negros en el frente y un panel tribal en la espalda.",
    measurements: [
      { label: "Ancho de pecho", value: "108 cm" },
      { label: "Largo de prenda", value: "63 cm" }
    ],
    order: 75
  },
  {
    id: 36,
    name: "Corbata Pistolera",
    price: 7000,
    inStock: true,
    category: "Accesorios",
    img: "/catalog/2026-09/corbata-1.webp",
    images: ["/catalog/2026-09/corbata-1.webp"],
    description: "Corbata oscura intervenida con alfileres, dijes de pistolas y detalles metálicos.",
    measurements: [
      { label: "Largo", value: "102 cm" }
    ],
    order: 225
  },
  {
    id: 37,
    name: "Corbata Religiones",
    price: 7000,
    inStock: true,
    category: "Accesorios",
    img: "/catalog/2026-09/corbata-2.webp",
    images: ["/catalog/2026-09/corbata-2.webp"],
    description: "Corbata oscura con cruces, alfileres y apliques metálicos.",
    order: 226
  },
  {
    id: 38,
    name: "Mini Print",
    price: 20000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/mini-print-delante.webp",
    images: ["/catalog/2026-09/mini-print-delante.webp", "/catalog/2026-09/mini-print-atras.webp"],
    description: "Mini de jean con estrellas de animal print, tachas y encaje negro en el ruedo.",
    order: 55
  },
  {
    id: 39,
    name: "Short Brishitos",
    price: 10000,
    inStock: true,
    category: "Prendas",
    img: "/catalog/2026-09/short-brishitos.webp",
    images: ["/catalog/2026-09/short-brishitos.webp"],
    description: "Short negro con pequeños brillos sobre toda la tela.",
    order: 115
  }
];
