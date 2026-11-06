"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";

type Values = { name: string; price: string; description: string; category: string; measurements: string; isNew: boolean; cost: string; images: string[] };

const UPLOAD_ERRORS: Record<string, string> = { size: "Esa foto pesa más de 12 MB.", type: "Ese archivo no es una foto que podamos usar.", session: "Se cerró tu sesión. Volvé a entrar." };

/** The form posts to a server action; only the photos need the browser, one upload at a time so a bad connection loses one, not all. */
export function ProductForm({ action, values, categories, submit }: { action: (form: FormData) => void; values: Values; categories: string[]; submit: string }) {
  const [images, setImages] = useState(values.images);
  const [uploading, setUploading] = useState(0);
  const [problem, setProblem] = useState("");

  const upload = async (files: FileList | null) => {
    setProblem("");
    const list = Array.from(files ?? []);
    setUploading(list.length);
    for (const file of list) {
      try {
        const response = await fetch("/api/admin/photos", { method: "POST", body: file });
        const body = await response.json();
        if (response.ok) setImages(current => [...current, body.url]);
        else setProblem(UPLOAD_ERRORS[body.error] ?? "No pudimos subir esa foto. Probá de nuevo.");
      } catch { setProblem("No pudimos subir la foto. Revisá la conexión."); }
      setUploading(left => left - 1);
    }
  };
  const move = (index: number, by: number) => setImages(current => {
    const next = [...current];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    return next;
  });

  return <form action={action} className="adm-form">
    <fieldset className="adm-photos">
      <legend>Fotos</legend>
      <ul>{images.map((src, index) => <li key={src}>
        <Image src={src} alt={`Foto ${index + 1}`} fill sizes="110px" />
        {index === 0 && <span>Portada</span>}
        <div>
          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir foto ${index + 1}`}><ArrowUp size={16} /></button>
          <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label={`Bajar foto ${index + 1}`}><ArrowDown size={16} /></button>
          <button type="button" onClick={() => setImages(current => current.filter(item => item !== src))} aria-label={`Quitar foto ${index + 1}`}><X size={16} /></button>
        </div>
      </li>)}</ul>
      <label className="adm-secondary">{uploading ? `Subiendo ${uploading}…` : "Sumar fotos"}<input className="adm-file" type="file" accept="image/*" multiple disabled={uploading > 0} onChange={event => { void upload(event.target.files); event.target.value = ""; }} /></label>
      {problem && <p className="adm-notice adm-notice-error" role="alert">{problem}</p>}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
    </fieldset>
    <label>Nombre<input name="name" defaultValue={values.name} required maxLength={120} /></label>
    <label>Precio en pesos<input name="price" inputMode="numeric" defaultValue={values.price} required /></label>
    <label>Categoría<input name="category" list="adm-categories" defaultValue={values.category} required maxLength={40} /><datalist id="adm-categories">{categories.map(item => <option key={item} value={item} />)}</datalist></label>
    <label>Descripción<textarea name="description" rows={5} defaultValue={values.description} maxLength={2000} /></label>
    <label>Medidas, una por línea<textarea name="measurements" rows={3} defaultValue={values.measurements} placeholder={"Cintura: 80 cm\nLargo: 60 cm"} /></label>
    <label>Costo en pesos (solo lo ves vos)<input name="cost" inputMode="numeric" defaultValue={values.cost} /></label>
    <label className="adm-check"><input type="checkbox" name="isNew" defaultChecked={values.isNew} /> Marcar como recién intervenida</label>
    <button className="adm-primary" disabled={uploading > 0}>{submit}</button>
  </form>;
}
