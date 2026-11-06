import { redirect } from "next/navigation";
import { secondFactor } from "../../actions";
import { Notice } from "../../ui";
import { pendingToken } from "@/lib/admin/server";

export default async function Code({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!await pendingToken()) redirect("/admin/ingresar");
  const { error } = await searchParams;
  return <main className="adm-auth">
    <i className="mangata-mark" aria-hidden="true" />
    <h1>Código de seguridad</h1>
    <p>Escribí los 6 números de tu app de códigos. Si perdiste el celular, usá un código de recuperación.</p>
    <Notice error={error} />
    <form action={secondFactor} className="adm-form">
      <label>Código<input name="code" autoComplete="one-time-code" autoFocus required maxLength={40} /></label>
      <button className="adm-primary">Entrar</button>
    </form>
  </main>;
}
