"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, X } from "lucide-react";
import { useExperience } from "@/components/experience/ExperienceProvider";
import { clearCommerceAnalytics } from "@/lib/analytics";
import { parseConsent } from "@/lib/privacy/consent";
import { savePrivacyChoice } from "@/lib/privacy/actions";
import { getConsentSnapshot, getServerConsentSnapshot, hasAnalyticsConsent, refreshConsent, subscribeConsent } from "@/lib/privacy/store";
import "./privacy.css";

const PrivacyContext = createContext<{ openPreferences: () => void } | null>(null);

function PreferencesDialog({ analytics, onSave, onClose }: { analytics: boolean; onSave: (allowed: boolean) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [allowAnalytics, setAllowAnalytics] = useState(analytics);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return (
    <dialog ref={dialogRef} className="privacy-dialog" aria-labelledby="privacy-title" aria-describedby="privacy-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="privacy-dialog-inner">
        <header className="privacy-dialog-header">
          <div><span className="privacy-eyebrow">Tu navegación, tu elección</span><h2 id="privacy-title" ref={headingRef} tabIndex={-1}>Preferencias de cookies</h2></div>
          <button type="button" className="privacy-close" onClick={onClose} aria-label="Cerrar preferencias de cookies"><X size={21} /></button>
        </header>
        <p id="privacy-description">Podés usar la tienda y tu bolsa sin activar la medición opcional. Cambiá esta elección cuando quieras desde el pie de página.</p>
        <section className="privacy-category" aria-labelledby="privacy-required-title">
          <div className="privacy-category-heading"><h3 id="privacy-required-title">Funcionamiento de la tienda</h3><span><Check size={14} aria-hidden="true" /> Siempre activo</span></div>
          <p>Guardamos tu selección en la bolsa y esta preferencia en tu navegador. Cuando está habilitado el pago, las cookies operativas vinculan el carrito y la confirmación de compra. No se usan para publicidad.</p>
        </section>
        <section className="privacy-category" aria-labelledby="privacy-analytics-title">
          <label className="privacy-toggle" htmlFor="privacy-analytics"><span><strong id="privacy-analytics-title">Medición de uso</strong><small>Opcional · MANGATA</small></span>
            <input id="privacy-analytics" type="checkbox" checked={allowAnalytics} onChange={(event) => setAllowAnalytics(event.target.checked)} aria-describedby="privacy-analytics-description" />
          </label>
          <p id="privacy-analytics-description">Registra en este navegador acciones como ver una pieza o agregarla a la bolsa. Hoy no hay un proveedor externo de analítica conectado ni píxeles publicitarios. No guardamos el texto de tus búsquedas.</p>
          <p>Al desactivarla, detenemos los eventos y borramos la medición local que controla MANGATA. Tu bolsa se conserva.</p>
        </section>
        <p className="privacy-duration">Recordamos tu decisión durante 180 días, o hasta que cambie esta configuración. <Link href="/privacidad" onClick={onClose}>Ver privacidad y almacenamiento</Link>.</p>
        <div className="privacy-dialog-actions">
          <button type="button" className="privacy-action" onClick={() => onSave(false)}>Rechazar opcionales</button>
          <button type="button" className="privacy-action" onClick={() => onSave(true)}>Aceptar opcionales</button>
          <button type="button" className="privacy-action privacy-save" onClick={() => onSave(allowAnalytics)}>Guardar mi selección</button>
        </div>
      </div>
    </dialog>
  );
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const { activeOverlay, openOverlay, closeOverlay } = useExperience();
  const raw = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
  const consent = parseConsent(raw);
  const ready = raw !== "";
  const showBanner = ready && !consent && !activeOverlay;
  const [message, setMessage] = useState("");
  const [memoryOnly, setMemoryOnly] = useState(false);
  const bannerRef = useRef<HTMLElement>(null);
  const preferencesTrigger = useRef<HTMLElement | null>(null);
  const focusFrame = useRef<number | null>(null);
  const expiresAt = consent?.expiresAt;

  useEffect(() => {
    const enforce = () => { if (!hasAnalyticsConsent()) clearCommerceAnalytics(); };
    enforce();
    return subscribeConsent(enforce);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    // Avoid setTimeout's 32-bit delay overflow; re-check long-lived tabs daily.
    const interval = window.setInterval(refreshConsent, Math.min(86_400_000, Math.max(1000, expiresAt - Date.now())));
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    const root = document.documentElement;
    const banner = bannerRef.current;
    if (!banner || !showBanner) { root.style.setProperty("--consent-banner-height", "0px"); return; }
    const update = () => root.style.setProperty("--consent-banner-height", `${Math.ceil(banner.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(banner);
    return () => { observer.disconnect(); root.style.setProperty("--consent-banner-height", "0px"); };
  }, [showBanner]);

  useEffect(() => () => { if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current); }, []);

  function openPreferences() {
    preferencesTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openOverlay("privacy");
  }

  function closePreferences() {
    closeOverlay("privacy");
    if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = window.requestAnimationFrame(() => {
      if (document.documentElement.dataset.activeOverlay) return;
      const previous = preferencesTrigger.current;
      const target = previous?.isConnected ? previous :
        document.querySelector<HTMLElement>("[data-privacy-configure]") ?? document.querySelector<HTMLElement>("[data-cookie-preferences]");
      target?.focus({ preventScroll: true });
      focusFrame.current = null;
    });
  }

  function save(allowed: boolean) {
    const persisted = savePrivacyChoice(allowed);
    setMemoryOnly(!persisted);
    setMessage(allowed ? "Preferencia guardada: medición opcional activada." : "Preferencia guardada: medición opcional desactivada.");
    if (activeOverlay === "privacy") closePreferences();
  }

  return (
    <PrivacyContext.Provider value={{ openPreferences }}>
      {children}
      <div className="privacy-bottom-space" aria-hidden="true" />
      {showBanner && <section ref={bannerRef} className="privacy-banner" aria-labelledby="privacy-banner-title">
        <div className="privacy-banner-copy"><h2 id="privacy-banner-title">Sobre tus cookies</h2><p>La medición de uso es opcional. <Link href="/privacidad">Privacidad</Link>.</p></div>
        <button type="button" className="privacy-configure" data-privacy-configure onClick={openPreferences}>Configurar</button>
        <div className="privacy-banner-actions">
          <button type="button" className="privacy-action" onClick={() => save(false)}>Rechazar opcionales</button>
          <button type="button" className="privacy-action" onClick={() => save(true)}>Aceptar opcionales</button>
        </div>
      </section>}
      {activeOverlay === "privacy" && <PreferencesDialog analytics={consent?.analytics ?? false} onSave={save} onClose={closePreferences} />}
      <p className="privacy-announcement" role="status" aria-live="polite">{message}</p>
      {memoryOnly && <div className="privacy-memory-note" role="status" inert={!!activeOverlay} aria-hidden={!!activeOverlay}><p>Tu navegador no permite guardar esta elección. Se aplica durante esta visita; al volver se usará la última preferencia que pudo guardar.</p><button type="button" onClick={() => setMemoryOnly(false)} aria-label="Cerrar aviso de almacenamiento"><X size={18} /></button></div>}
    </PrivacyContext.Provider>
  );
}

export function CookiePreferencesButton({ className }: { className?: string }) {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error("CookiePreferencesButton requires ConsentProvider");
  return <button type="button" className={className} data-cookie-preferences onClick={context.openPreferences}>Preferencias de cookies</button>;
}
