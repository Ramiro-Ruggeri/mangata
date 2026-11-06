"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { activate, type ActivationState } from "../actions";

export default function Activate({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token = "" } = use(searchParams);
  const [state, action, pending] = useActionState<ActivationState, FormData>(activate, { step: "password" });
  return <main className="adm-auth">
    <i className="mangata-mark" aria-hidden="true" />
    {state.step === "password" && <>
      <h1>Creá tu acceso</h1>
      <p>Elegí una contraseña de al menos 12 caracteres. Puede ser una frase.</p>
      {state.error && <p className="adm-notice adm-notice-error" role="alert">{state.error}</p>}
      <form action={action} className="adm-form">
        <input type="hidden" name="token" value={token} />
        <label>Contraseña<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
        <button className="adm-primary" disabled={pending}>Seguir</button>
      </form>
    </>}
    {state.step === "code" && <>
      <h1>Sumá el doble factor</h1>
      <p>Abrí una app de códigos, como Google Authenticator, y escaneá esto. Desde el mismo celular, copiá la clave.</p>
      <div className="adm-qr" dangerouslySetInnerHTML={{ __html: state.qr }} />
      <code className="adm-key">{state.key}</code>
      {state.error && <p className="adm-notice adm-notice-error" role="alert">{state.error}</p>}
      <form action={action} className="adm-form">
        <input type="hidden" name="token" value={token} />
        <label>Código de 6 números<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
        <button className="adm-primary" disabled={pending}>Activar</button>
      </form>
    </>}
    {state.step === "done" && <>
      <h1>Guardá estos códigos</h1>
      <p>Sirven para entrar si perdés el celular. Cada uno funciona una vez y no se vuelven a mostrar.</p>
      <ul className="adm-codes">{state.recoveryCodes.map(code => <li key={code}><code>{code}</code></li>)}</ul>
      <Link className="adm-primary" href="/admin/ingresar">Ya los guardé</Link>
    </>}
  </main>;
}
