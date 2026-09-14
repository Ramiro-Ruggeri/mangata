import Link from "next/link";
import { BrandSignature } from "@/components/brand/BrandSignature";
import { ArrowUpRight } from "lucide-react";

export default function NotFound() {
  return <main className="store-state"><Link className="store-state-brand" href="/" aria-label="MANGATA, inicio"><BrandSignature /></Link><div className="store-state-content"><span>Esta dirección no está disponible</span><h1>Por acá no<br />está la pieza.</h1><p>Puede que el enlace haya cambiado. Volvé a la colección para ver las prendas publicadas.</p><Link className="store-state-action" href="/#coleccion">Ver la colección <ArrowUpRight size={20} /></Link></div></main>;
}
