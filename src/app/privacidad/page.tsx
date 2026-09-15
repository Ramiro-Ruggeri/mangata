import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CookiePreferencesButton } from "@/components/privacy/ConsentProvider";
import { SITE, whatsappHref } from "@/config/site";
import "@/components/privacy/privacy.css";

export const metadata: Metadata = {
  title: "Privacidad y almacenamiento",
  description: "Qué guarda esta versión de MANGATA en tu navegador y cómo elegir la medición opcional.",
  alternates: { canonical: "/privacidad" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main id="contenido" className="privacy-page">
      <Link href="/" className="privacy-back"><ArrowLeft size={17} aria-hidden="true" /> Volver a MANGATA</Link>
      <header><span className="privacy-eyebrow">Información de esta versión · 14 de septiembre de 2026</span><h1>Privacidad y<br /><em>almacenamiento.</em></h1><p>Acá explicamos qué guarda esta tienda en tu navegador y qué podés elegir.</p></header>
      <aside className="privacy-review-note"><strong>MANGATA · Emilia Jazmín Morán</strong><p>Para consultar sobre una compra o el tratamiento de tus datos, escribinos al <a href={whatsappHref("Hola Emilia, tengo una consulta sobre mis datos en MANGATA.")} target="_blank" rel="noopener noreferrer">{SITE.whatsappDisplay}</a>. No te vamos a pedir claves de Mercado Pago ni datos completos de tu tarjeta por este canal.</p></aside>
      <section><h2>Tu elección</h2><p>Podés explorar la colección, usar tu bolsa y consultar una pieza sin permitir medición opcional. Aceptar, rechazar o configurar no cambia los precios ni la disponibilidad.</p><p>Guardamos tu elección en este navegador durante 180 días. Es un intervalo de revisión de esta implementación, no un plazo legal que estemos atribuyendo a la normativa. Si cambian las finalidades o proveedores, se debe actualizar la configuración y volver a consultar.</p><CookiePreferencesButton className="privacy-page-button" /></section>
      <section><h2>Lo que queda en tu navegador</h2><dl className="privacy-storage-list">
        <div><dt>Bolsa</dt><dd><code>mangata_cart_v2</code> · Almacenamiento local con las piezas elegidas. Se mantiene entre visitas hasta que vacíes la bolsa o borres los datos del sitio. No reserva stock. Una clave anterior, <code>mngt_cart_v1</code>, se elimina al guardar la versión actual.</dd></div>
        <div><dt>Preferencias</dt><dd><code>mangata_privacy_v1</code> · Almacenamiento local con tu decisión, versión y fechas. Se considera vencido a los 180 días. Si el navegador bloquea este almacenamiento, la decisión sólo dura durante la visita.</dd></div>
        <div><dt>Carrito conectado</dt><dd><code>mangata_evershop_cart</code> · Cookie operativa de hasta 30 días, sólo cuando EverShop está conectado y se crea un carrito. Su contenido no es accesible al JavaScript de la página.</dd></div>
        <div><dt>Confirmación de pago</dt><dd><code>mangata_checkout_intent</code> · Cookie operativa firmada de hasta 48 horas, sólo al iniciar un pago habilitado. Permite verificar que la confirmación corresponde a esa compra. No es una cookie de publicidad.</dd></div>
        <div><dt>Medición opcional</dt><dd>Sólo después de aceptar, las acciones comerciales se registran en memoria del navegador. Los marcadores <code>mangata_purchase_…</code> del almacenamiento de sesión evitan contar una misma compra verificada dos veces. Se eliminan al retirar el permiso; la sesión también termina al cerrar la pestaña.</dd></div>
      </dl></section>
      <section><h2>Qué mide esta versión</h2><p>Con permiso, la instrumentación local registra acciones como ver productos, agregar a la bolsa, consultar medidas o iniciar una compra. Puede incluir el código de la pieza, precio, cantidad y referencia de una compra verificada. En búsquedas sólo se registra la longitud y cantidad de resultados, no el texto que escribís.</p><p>Hoy no hay Google Analytics, Google Tag Manager, Meta Pixel ni otro recolector de analítica conectado. Los eventos quedan en una memoria local limitada; no se envían a un servidor de medición. No hay una categoría de marketing activa.</p><p>Al rechazar o retirar el permiso, se detiene la medición y se eliminan los eventos y marcadores locales que controla MANGATA. No se recuperan acciones anteriores para registrarlas más tarde. Esto no elimina pedidos ni pagos operativos.</p></section>
      <section><h2>Servicios y enlaces externos</h2><p>La tienda se aloja en un servidor de Hostinger, con DNS administrado en Cloudflare. Las imágenes y tipografías se sirven desde el sitio. Los registros técnicos de acceso y errores permiten mantener su funcionamiento y seguridad; no dependen del permiso de medición opcional.</p><p>Al iniciar un pago habilitado, se envían a Mercado Pago las piezas, el importe en pesos y una referencia de compra. Completás allí tus datos de pago: MANGATA no recibe ni guarda el número completo de tu tarjeta ni su código de seguridad. El servidor conserva las referencias, piezas, importes y estados necesarios para registrar y atender el pedido, con copias de respaldo privadas.</p><p>WhatsApp, Instagram y el correo se abren sólo cuando usás sus enlaces. Al salir del sitio se aplican las condiciones del servicio elegido. Podés consultar las <a href="https://www.mercadopago.com.ar/privacidad" target="_blank" rel="noopener noreferrer">condiciones de privacidad de Mercado Pago</a>.</p></section>
      <section><h2>Consultas sobre tus datos</h2><p>El contacto comercial que figura actualmente en la tienda es <a href="mailto:mangataclothing777@gmail.com">mangataclothing777@gmail.com</a>. Podés usarlo para consultar; la responsable de la marca debe confirmar que también será el canal formal para solicitudes de privacidad.</p><p>La legislación argentina contempla información sobre el tratamiento y derechos de acceso, rectificación y supresión. Podés consultar la <a href="https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion" target="_blank" rel="noopener noreferrer">Ley 25.326</a> y la <a href="https://www.argentina.gob.ar/aaip/datospersonales/derechos" target="_blank" rel="noopener noreferrer">orientación oficial de la AAIP</a>. La aplicación concreta al negocio y sus mercados requiere validación legal.</p></section>
      <footer><Link href="/">Volver a la colección</Link><CookiePreferencesButton className="privacy-text-button" /></footer>
    </main>
  );
}
