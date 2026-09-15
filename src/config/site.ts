// src/config/site.ts
export const SITE = {
  brand: "MANGATA",
  email: "mangataclothing777@gmail.com", // ← cámbialo si hará falta
  whatsapp: "5492920559780",
  whatsappDisplay: "+54 9 2920 55-9780",
  contactName: "Emilia",
  instagram: "https://instagram.com/mangata.upcy",
  tiktok: "https://www.tiktok.com/@mangata.upcycling", // opcional
  location: "Córdoba, Argentina",

  // Si usas Mercado Pago más adelante, deja preparado el enlace general
  // o link a tu Link de Pago/Flow/Checkout:
  shopLink: "https://linktr.ee/mangata", // temporal para centralizar
};

// Keep the owner contact consistent across catalog, bag, support and payment results.
export function whatsappHref(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}
