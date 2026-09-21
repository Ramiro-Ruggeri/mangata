import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PURCHASE_POLICY, SITE, WITHDRAWAL_HREF, whatsappHref } from "@/config/site";
import "@/components/privacy/privacy.css";

export const metadata: Metadata = {
  title: "Cambios y derecho de arrepentimiento",
  description: "Condiciones de cambios, encargos y derecho de arrepentimiento de MANGATA.",
  alternates: { canonical: "/cambios" },
};

export default function ExchangesPage() {
  return (
    <main id="contenido" className="privacy-page">
      <Link href="/" className="privacy-back"><ArrowLeft size={17} aria-hidden="true" /> Volver a MANGATA</Link>
      <header><span className="privacy-eyebrow">Información antes de comprar</span><h1>Cambios y<br /><em>encargos.</em></h1><p>Estas condiciones distinguen los cambios comerciales del derecho legal de arrepentimiento en compras online.</p></header>
      <section>
        <h2>Compras online</h2>
        <p>{PURCHASE_POLICY.withdrawal}</p>
        <p>No necesitás registrarte ni completar otro trámite para iniciar la solicitud. Escribinos desde el acceso directo y te enviaremos un código de identificación dentro de las 24 horas.</p>
        <a className="privacy-page-button" href={WITHDRAWAL_HREF} target="_blank" rel="noopener noreferrer">BOTÓN DE ARREPENTIMIENTO <ArrowUpRight size={16} aria-hidden="true" /></a>
      </section>
      <section>
        <h2>Cambios</h2>
        <p>{PURCHASE_POLICY.uniquePieces}</p>
        <p>{PURCHASE_POLICY.exchanges}</p>
      </section>
      <section>
        <h2>Piezas a medida o por encargo</h2>
        <p>{PURCHASE_POLICY.customOrders}</p>
        <p>Antes de iniciar el trabajo confirmamos por escrito la pieza, las medidas, el precio y los tiempos.</p>
      </section>
      <aside className="privacy-review-note"><strong>¿Necesitás ayuda?</strong><p>Escribinos al <a href={whatsappHref("Hola MANGATA, tengo una consulta sobre cambios o encargos.")} target="_blank" rel="noopener noreferrer">{SITE.whatsappDisplay}</a> antes de enviar la pieza.</p></aside>
      <section>
        <h2>Normativa aplicable</h2>
        <p>Podés consultar la <a href="https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto" target="_blank" rel="noopener noreferrer">Disposición 954/2025</a> y la <a href="https://www.argentina.gob.ar/normativa/nacional/638/actualizacion" target="_blank" rel="noopener noreferrer">Ley 24.240 de Defensa del Consumidor</a>. Esta información no limita otros derechos y garantías que correspondan.</p>
      </section>
      <footer><Link href="/">Volver a la colección</Link><a href={WITHDRAWAL_HREF} target="_blank" rel="noopener noreferrer">BOTÓN DE ARREPENTIMIENTO</a></footer>
    </main>
  );
}
