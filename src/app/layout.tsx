// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import BackToTop from "@/components/BackToTop"; // 🆕 ➊ import del botón

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
  themeColor: "#000000",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

/* =========================
 * SEO global (App Router)
 * ========================= */
export const metadata: Metadata = {
  metadataBase: new URL("https://www.tu-dominio.com"),
  title: {
    default: "MANGATA — Upcycling Streetwear",
    template: "%s · MANGATA",
  },
  description:
    "Upcycling de alto diseño. Piezas únicas y tiradas cortas hechas en Argentina. Creatividad, rebeldía y sostenibilidad.",
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
    url: "https://www.tu-dominio.com/",
    title: "MANGATA — Upcycling Streetwear",
    description:
      "Piezas únicas y tiradas cortas. Redefinimos la moda con creatividad, rebeldía y sostenibilidad.",
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
    title: "MANGATA — Upcycling Streetwear",
    description:
      "Upcycling de alto diseño desde Córdoba, Argentina. Piezas únicas y tiradas cortas.",
    images: ["/og/og-default.jpg"],
    creator: "@mangata_upcycling",
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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  category: "fashion",
};

/* =========================
 * RootLayout — aplica las fuentes y estilos base
 * ========================= */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      dir="ltr"
      className={`${display.variable} ${body.variable}`}
      style={{ textRendering: "optimizeLegibility" }}
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
              url: "https://www.tu-dominio.com",
              logo: "https://www.tu-dominio.com/og/og-default.jpg",
              sameAs: ["https://www.instagram.com/mangata.upcycling"],
            }),
          }}
        />
      </head>

      <body className="font-[family-name:var(--font-body)] bg-neutral-50 text-neutral-900 antialiased">
        {/* Contenido de cada página */}
        {children}

        {/* 🆕 Botón global "Volver arriba" */}
        <BackToTop />
      </body>
    </html>
  );
}
