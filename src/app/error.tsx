"use client";

import Link from "next/link";
import { BrandSignature } from "@/components/brand/BrandSignature";
import { RotateCcw } from "lucide-react";

export default function StoreError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="store-state"><Link className="store-state-brand" href="/" aria-label="MANGATA, inicio"><BrandSignature /></Link><div className="store-state-content"><span>No pudimos cargar esta página</span><h1>Probemos<br />de nuevo.</h1><p>Hubo un problema al mostrar la tienda. Podés volver a intentarlo o consultarnos por WhatsApp.</p><button className="store-state-action" onClick={() => retry()}>Volver a intentar <RotateCcw size={18} /></button><a className="store-state-help" href="https://wa.me/5493885195631?text=Hola%20MANGATA%2C%20necesito%20ayuda%20con%20la%20tienda." target="_blank" rel="noreferrer">Hablar con MANGATA</a></div></main>;
}
