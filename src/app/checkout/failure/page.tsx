// src/app/checkout/failure/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Pago rechazado · Checkout",
};

export default function FailurePage() {
  return (
    <main className="min-h-[70vh] bg-neutral-950 text-neutral-100 grid place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="inline-block text-sm text-rose-400/90">Error</span>
        <h1 className="mt-1 text-2xl md:text-3xl font-[family-name:var(--font-display)]">
          No pudimos procesar el pago
        </h1>
        <p className="mt-3 text-white/70">
          Puede haber sido rechazado por la tarjeta o un error de conexión.
          Probá nuevamente, elegí otro medio de pago o escribinos por WhatsApp.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-white/25 px-5 py-2 text-white/85 hover:bg-white/10"
          >
            Volver a la tienda
          </Link>
          <a
            href="https://wa.me/5493885195631?text=Hola%20Mangata,%20tuve%20un%20error%20con%20mi%20pago.%20%F0%9F%98%94"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-emerald-500/90 hover:bg-emerald-500 px-5 py-2 text-white"
          >
            Ayuda por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
