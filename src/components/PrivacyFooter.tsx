import Link from "next/link";
import { CookiePreferencesButton } from "@/components/privacy/ConsentProvider";

export function PrivacyFooter() {
  return <footer className="privacy-footer" aria-label="Privacidad y preferencias">
    <Link href="/privacidad">Privacidad</Link>
    <CookiePreferencesButton />
  </footer>;
}
