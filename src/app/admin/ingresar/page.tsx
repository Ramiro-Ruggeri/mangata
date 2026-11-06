import { redirect } from "next/navigation";
import { login } from "../actions";
import { Notice } from "../ui";
import { currentAdmin } from "@/lib/admin/server";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return <main className="adm-auth">
    <i className="mangata-mark" aria-hidden="true" />
    <h1>Panel de MANGATA</h1>
    <Notice error={error} />
    <form action={login} className="adm-form">
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
      <button className="adm-primary">Seguir</button>
    </form>
  </main>;
}
