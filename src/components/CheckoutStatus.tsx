"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandSignature } from "@/components/brand/BrandSignature";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Clock3, MessageCircle, RotateCcw, X } from "lucide-react";
import { useCart } from "@/components/commerce/CartProvider";
import { trackVerifiedPurchase } from "@/lib/analytics";
import { motionTokens } from "@/lib/experience/interaction";

const WHATSAPP_HELP =
  "https://wa.me/5493885195631?text=Hola%20MANGATA%2C%20tuve%20un%20inconveniente%20con%20mi%20pago.";

type CheckoutState = "failure" | "pending" | "success";

const statusIcon = {
  failure: X,
  pending: Clock3,
  success: Check,
};

export default function CheckoutStatus({
  state,
  eyebrow,
  title,
  description,
  purchase,
  reference,
}: {
  state: CheckoutState;
  eyebrow: string;
  title: string;
  description: string;
  purchase?: { transactionId: string; value: number; skus: string[] };
  reference?: string;
}) {
  const { clearPurchased, openCart } = useCart();
  const reducedMotion = useReducedMotion();
  const Icon = statusIcon[state];

  useEffect(() => {
    if (state !== "success" || !purchase) return;
    trackVerifiedPurchase(purchase.transactionId, purchase.value, purchase.skus.length);
    clearPurchased(purchase.skus);
  }, [clearPurchased, purchase, state]);

  return (
    <main className="checkout-status" data-state={state}>
      <div className="checkout-status-grid" aria-hidden="true" />
      <Link href="/" className="checkout-status-brand" aria-label="Volver a MANGATA">
        <BrandSignature />
      </Link>

      <motion.section
        className="checkout-status-card"
        initial={reducedMotion ? false : { opacity: 0, y: motionTokens.distance }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : motionTokens.overlay, ease: motionTokens.ease }}
      >
        <motion.div
          className="checkout-status-icon"
          initial={false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0 }}
        >
          <Icon size={26} strokeWidth={1.4} />
        </motion.div>
        <span className="micro-label">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {reference && <span className="checkout-reference">Referencia {reference}</span>}
        <div className="checkout-status-actions">
          {state === "failure" ? (
            <button onClick={openCart}><RotateCcw size={16} strokeWidth={1.4} /> Volver a mi bolsa</button>
          ) : (
            <Link href="/"><ArrowLeft size={16} strokeWidth={1.4} /> Volver a la tienda</Link>
          )}
          {state === "pending" && (
            <button onClick={() => window.location.reload()}><RotateCcw size={16} strokeWidth={1.4} /> Consultar estado</button>
          )}
          {state !== "success" && (
            <a href={WHATSAPP_HELP} target="_blank" rel="noreferrer">
              <MessageCircle size={16} strokeWidth={1.4} /> Pedir ayuda
            </a>
          )}
        </div>
      </motion.section>

      <span className="checkout-status-foot">CÓRDOBA · ARGENTINA / PIEZAS ÚNICAS</span>
    </main>
  );
}
