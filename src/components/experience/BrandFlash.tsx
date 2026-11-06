import { BrandSignature } from "@/components/brand/BrandSignature";

/** Brief brand punctuation on the first page of a session. Hidden by the boot script after that: it must never delay a purchase. */
export function BrandFlash() {
  return <div className="brand-flash" aria-hidden="true"><BrandSignature /></div>;
}
