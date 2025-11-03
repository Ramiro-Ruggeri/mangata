// src/app/checkout/success/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Pago aprobado · Checkout",
};

export default function SuccessPage() {
  return (
    <main className="min-h-[70vh] bg-neutral-950 text-neutral-100 grid place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="inline-block text-sm text-emerald-400/90">Éxito</span>
        <h1 className="mt-1 text-2xl md:text-3xl font-[family-name:var(--font-display)]">
          ¡Pago aprobado! 🎉
        </h1>
        <p className="mt-3 text-white/70">
          Gracias por tu compra. Te vamos a escribir por WhatsApp/Email para
          coordinar envío o retiro. Guardá este comprobante.
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
