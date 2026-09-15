// src/app/layout.tsx
import "./globals.css";
import "@/components/ui/interface-actions.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { CartProvider } from "@/components/commerce/CartProvider";
import { ExperienceProvider } from "@/components/experience/ExperienceProvider";
import { ScrollReturnControl } from "@/components/experience/ScrollReturnControl";
import { ConsentProvider } from "@/components/privacy/ConsentProvider";
import { PrivacyFooter } from "@/components/PrivacyFooter";
import { getCommerceMode } from "@/lib/commerce/catalog";
import { getCheckoutReady } from "@/lib/commerce/readiness";
import { getSiteUrl } from "@/config/site-url";

/* =========================
 * Fuentes (next/font) — swap para evitar FOIT
 * ========================= */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

/* =========================
 * Viewport / PWA hints
 * ========================= */
export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* =========================
 * SEO global (App Router)
 * ========================= */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "MANGATA — Streetwear recuperado en Córdoba",
    template: "%s · MANGATA",
  },
  description:
    "Upcycling streetwear hecho en Córdoba, Argentina. Piezas únicas recuperadas, intervenidas y terminadas a mano.",
  applicationName: "MANGATA",
  generator: "Next.js",
  keywords: [
    "mangata",
    "upcycling",
    "streetwear",
    "moda sustentable",
    "diseño argentino",
    "prendas únicas",
  ],
  authors: [{ name: "MANGATA" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "MANGATA — Streetwear recuperado en Córdoba",
    description:
      "Piezas recuperadas, intervención manual y una sola unidad. Upcycling streetwear desde Córdoba.",
    siteName: "MANGATA",
    locale: "es_AR",
    images: [
      {
        url: "/og/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "MANGATA — Upcycling Streetwear",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MANGATA — Streetwear recuperado en Córdoba",
    description:
      "Prendas recuperadas e intervenidas a mano en Córdoba, Argentina. Cada pieza tiene una sola unidad.",
    images: ["/og/og-default.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  category: "fashion",
};

/* =========================
 * RootLayout — aplica las fuentes y estilos base
 * ========================= */
// Runtime-only commerce configuration and stock must never be frozen into build HTML.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const commerceMode = getCommerceMode();
  return (
    <html
      lang="es"
      dir="ltr"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable}`}
    >
      <head>
        {/* JSON-LD Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "MANGATA",
              url: getSiteUrl(),
              logo: `${getSiteUrl()}/icon.png`,
              sameAs: ["https://www.instagram.com/mangata.upcy"],
            }).replace(/</g, "\\u003c"),
          }}
        />
      </head>

      <body>
        <ExperienceProvider>
          <ConsentProvider>
            <CartProvider mode={commerceMode} checkoutReady={getCheckoutReady(commerceMode)}>
              {children}
              <PrivacyFooter />
            </CartProvider>
            <ScrollReturnControl />
          </ConsentProvider>
        </ExperienceProvider>
      </body>
    </html>
  );
}
