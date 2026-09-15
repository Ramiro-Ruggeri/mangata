"use client";

import Link from "next/link";
import { BrandSignature } from "@/components/brand/BrandSignature";
import { RotateCcw } from "lucide-react";
import { whatsappHref } from "@/config/site";

export default function StoreError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="store-state"><Link className="store-state-brand" href="/" aria-label="MANGATA, inicio"><BrandSignature /></Link><div className="store-state-content"><span>No pudimos cargar esta página</span><h1>Probemos<br />de nuevo.</h1><p>Hubo un problema al mostrar la tienda. Podés volver a intentarlo o consultarnos por WhatsApp.</p><button className="store-state-action" onClick={() => retry()}>Volver a intentar <RotateCcw size={18} /></button><a className="store-state-help" href={whatsappHref("Hola MANGATA, necesito ayuda con la tienda.")} target="_blank" rel="noreferrer">Hablar con MANGATA</a></div></main>;
}
