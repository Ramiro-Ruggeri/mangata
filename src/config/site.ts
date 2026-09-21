// src/config/site.ts
export const SITE = {
  brand: "MANGATA",
  email: "mangataclothing777@gmail.com", // ← cámbialo si hará falta
  whatsapp: "5492920559780",
  whatsappDisplay: "+54 9 2920 55-9780",
  instagram: "https://instagram.com/mangata.upcy",
  tiktok: "https://www.tiktok.com/@mangata.upcycling", // opcional
  location: "Córdoba, Argentina",

  // Si usas Mercado Pago más adelante, deja preparado el enlace general
  // o link a tu Link de Pago/Flow/Checkout:
  shopLink: "https://linktr.ee/mangata", // temporal para centralizar
};

// Keep the business contact consistent across catalog, bag, support and payment results.
export function whatsappHref(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const PURCHASE_POLICY = {
  withdrawal: "En compras online podés arrepentirte dentro de los 10 días corridos desde que recibís la pieza. Te devolvemos el dinero y los gastos de devolución quedan a cargo de MANGATA, conforme a la normativa aplicable.",
  uniquePieces: "Fuera del derecho de arrepentimiento y de las garantías legales aplicables, por tratarse de piezas únicas no realizamos devoluciones de dinero.",
  exchanges: "Los cambios pueden realizarse por otra prenda disponible de igual valor o podés abonar la diferencia para encargar una pieza a medida.",
  customOrders: "En prendas realizadas a medida o por encargo, se solicita una seña del 50% al iniciar el trabajo y el saldo se abona al finalizar. Las piezas personalizadas o hechas según tus indicaciones pueden estar exceptuadas del derecho de arrepentimiento.",
} as const;

export const WITHDRAWAL_HREF = whatsappHref("Hola MANGATA, quiero ejercer el derecho de arrepentimiento de una compra online. Mi referencia de pago o pedido es: ");
