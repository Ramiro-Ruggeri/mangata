import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { databasePool } from "@/lib/commerce/postgres-orders";
import { AdminAuth } from "./auth";
import { AdminStore } from "./store";

const SESSION = "__Host-mangata_admin";
const PENDING = "__Host-mangata_admin_pending";
const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict", path: "/" } as const;

export const adminAuth = () => new AdminAuth(databasePool(), process.env.MANGATA_ADMIN_SECRET ?? "");
export const adminStore = () => new AdminStore(databasePool());

export async function clientIp() {
  const list = await headers();
  return list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
}

export async function setPendingCookie(token: string) {
  (await cookies()).set(PENDING, token, { ...cookieOptions, maxAge: 600 });
}

export async function pendingToken() {
  return (await cookies()).get(PENDING)?.value ?? null;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.delete(PENDING);
  jar.set(SESSION, token, { ...cookieOptions, maxAge: 7 * 24 * 3600 });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION)?.value;
  if (token) await adminAuth().logout(token);
  jar.delete(SESSION);
}

export async function currentAdmin() {
  const token = (await cookies()).get(SESSION)?.value;
  return token ? adminAuth().identify(token) : null;
}

/** Called at the start of every panel page and every action, never only in a layout. */
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/ingresar");
  return admin;
}
