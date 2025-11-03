// src/app/checkout/pending/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Pago en revisión · Checkout",
};

export default function PendingPage() {
  return (
    <main className="min-h-[70vh] bg-neutral-950 text-neutral-100 grid place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="inline-block text-sm text-amber-300/90">
          Pendiente
        </span>
        <h1 className="mt-1 text-2xl md:text-3xl font-[family-name:var(--font-display)]">
          Tu pago está en revisión
        </h1>
        <p className="mt-3 text-white/70">
          Mercado Pago está validando la operación. Te notificaremos el estado
          por email/WhatsApp. No dupliques el pago.
        </p>

        <Link
          href="/"
          className="inline-block mt-6 rounded-full border border-white/25 px-5 py-2 text-white/85 hover:bg-white/10"
        >
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
