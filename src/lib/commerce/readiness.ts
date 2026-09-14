import type { CommerceMode } from "./types";
import { assertCheckoutConfigured } from "./order-service";
import { secureServiceUrl } from "./http-security";

// Configuration readiness only. Runtime payment and stock checks remain authoritative.
// The browser receives this boolean, never credentials or configuration details.
export function getCheckoutReady(mode: CommerceMode): boolean {
  try {
    if (mode === "local") {
      assertCheckoutConfigured();
      secureServiceUrl(process.env.NEXT_PUBLIC_SITE_URL);
      return true;
    }
    const base = secureServiceUrl(process.env.EVERSHOP_BASE_URL);
    const checkout = new URL(process.env.EVERSHOP_CHECKOUT_URL ?? "");
    return base.protocol === "https:" && checkout.protocol === "https:" &&
      base.origin === checkout.origin && !base.username && !base.password && !checkout.username && !checkout.password;
  } catch { return false; }
}
