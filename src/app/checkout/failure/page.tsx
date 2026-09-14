// src/app/checkout/failure/page.tsx
import CheckoutStatus from "@/components/CheckoutStatus";

export const metadata = {
  title: "Pago no completado · Checkout",
};

export default function FailurePage() {
  return (
    <CheckoutStatus
      state="failure"
      eyebrow="PAGO NO COMPLETADO"
      title="No pudimos completar el pago."
      description="Podés volver a la bolsa para revisar tu selección. Si ya te cobraron, no repitas la operación: escribinos y te ayudamos a verificarla."
    />
  );
}
