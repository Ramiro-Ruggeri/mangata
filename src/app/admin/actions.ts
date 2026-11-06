"use server";

import { renderSVG } from "uqr";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MAX_CENTS, pesosToCents } from "@/lib/admin/money";
import { AdminError, FULFILLMENT, type ProductInput, type SaleChannel } from "@/lib/admin/store";
import { adminAuth, adminStore, clientIp, endSession, pendingToken, requireAdmin, setPendingCookie, setSessionCookie } from "@/lib/admin/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
function storeChanged(id?: number) {
  revalidatePath("/");
  if (id) revalidatePath(`/producto/${id}`);
  revalidatePath("/admin", "layout");
}

async function guarded(back: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof AdminError) redirect(`${back}?error=${error.code}`);
    throw error;
  }
}

/* Access */

export async function login(form: FormData) {
  const token = await adminAuth().login(text(form, "email"), String(form.get("password") ?? ""), await clientIp());
  if (!token) redirect("/admin/ingresar?error=login");
  await setPendingCookie(token);
  redirect("/admin/ingresar/codigo");
}

export async function secondFactor(form: FormData) {
  const pending = await pendingToken();
  if (!pending) redirect("/admin/ingresar");
  const session = await adminAuth().verifySecondFactor(pending, text(form, "code"));
  if (!session) {
    if (!await adminAuth().pendingSessionValid(pending)) redirect("/admin/ingresar?error=login");
    redirect("/admin/ingresar/codigo?error=code");
  }
  await setSessionCookie(session);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/ingresar");
}

export type ActivationState =
  | { step: "password"; error?: string }
  | { step: "code"; email: string; key: string; qr: string; error?: string }
  | { step: "done"; recoveryCodes: string[] };

export async function activate(state: ActivationState, form: FormData): Promise<ActivationState> {
  const token = text(form, "token");
  if (state.step === "password") {
    const result = await adminAuth().beginActivation(token, String(form.get("password") ?? ""));
    if ("error" in result) return { step: "password", error: result.error === "password" ? result.problem : "Esta invitación ya no sirve. Pedí una nueva." };
    return { step: "code", email: result.email, key: result.key, qr: renderSVG(result.uri) };
  }
  if (state.step === "code") {
    const result = await adminAuth().confirmActivation(token, text(form, "code"));
    if ("error" in result) return { ...state, error: result.error === "code" ? "Ese código no coincide. Probá con el que se ve ahora." : "Esta invitación ya no sirve. Pedí una nueva." };
    return { step: "done", recoveryCodes: result.recoveryCodes };
  }
  return state;
}

/* Products */

const productSchema = z.object({
  name: z.string().min(1).max(120),
  priceCents: z.number().int().positive().max(MAX_CENTS),
  description: z.string().max(2000),
  category: z.string().min(1).max(40),
  images: z.array(z.string().regex(/^\/(media\/[0-9a-f-]{36}|(catalog|products)\/(?!.*\.\.)[\w./-]+)$/)).max(12),
  costCents: z.number().int().nonnegative().nullable(),
});

function readProduct(form: FormData): ProductInput | null {
  let images: unknown = [];
  try { images = JSON.parse(String(form.get("images") ?? "[]")); } catch { return null; }
  const cost = text(form, "cost");
  const parsed = productSchema.safeParse({ name: text(form, "name"), priceCents: pesosToCents(text(form, "price")), description: text(form, "description"),
    category: text(form, "category"), images, costCents: cost ? pesosToCents(cost) : null });
  if (!parsed.success) return null;
  const measurements = text(form, "measurements").split("\n").map(line => line.split(":")).filter(parts => parts.length === 2 && parts[0].trim() && parts[1].trim())
    .slice(0, 20).map(([label, value]) => ({ label: label.trim().slice(0, 40), value: value.trim().slice(0, 40) }));
  return { ...parsed.data, measurements, isNew: form.get("isNew") === "on" };
}

export async function createProduct(form: FormData) {
  const admin = await requireAdmin();
  const input = readProduct(form);
  if (!input) redirect("/admin/productos/nuevo?error=invalid");
  const id = await adminStore().createProduct(admin, input);
  storeChanged();
  redirect(`/admin/productos/${id}?ok=creado`);
}

export async function saveProduct(id: number, version: string, form: FormData) {
  const admin = await requireAdmin();
  const back = `/admin/productos/${id}`;
  const input = readProduct(form);
  if (!input) redirect(`${back}?error=invalid`);
  await guarded(back, () => adminStore().updateProduct(admin, id, version, input));
  storeChanged(id);
  redirect(`${back}?ok=guardado`);
}

export async function publishProduct(id: number) {
  const admin = await requireAdmin();
  const back = `/admin/productos/${id}`;
  await guarded(back, () => adminStore().publish(admin, id));
  storeChanged(id);
  redirect(`${back}?ok=publicado`);
}

export async function archiveProduct(id: number) {
  const admin = await requireAdmin();
  const back = `/admin/productos/${id}`;
  await guarded(back, () => adminStore().archive(admin, id));
  storeChanged(id);
  redirect(`${back}?ok=archivado`);
}

export async function duplicateProduct(id: number) {
  const admin = await requireAdmin();
  const copy = await adminStore().duplicateProduct(admin, id);
  redirect(`/admin/productos/${copy}?ok=duplicado`);
}

/* Stock */

const CHANNELS: SaleChannel[] = ["whatsapp", "transferencia", "efectivo", "otro"];

export async function recordSale(id: number, form: FormData) {
  const admin = await requireAdmin();
  const back = `/admin/productos/${id}`;
  const amountCents = pesosToCents(text(form, "amount"));
  const channel = text(form, "channel") as SaleChannel;
  if (!(amountCents > 0) || !CHANNELS.includes(channel)) redirect(`${back}?error=invalid`);
  await guarded(back, async () => { await adminStore().recordManualSale(admin, id, { amountCents, channel, note: text(form, "note").slice(0, 500) }); });
  storeChanged(id);
  redirect(`${back}?ok=vendida`);
}

export async function putBackOnSale(id: number, form: FormData) {
  const admin = await requireAdmin();
  const back = `/admin/productos/${id}`;
  const reason = text(form, "reason").slice(0, 300);
  if (!reason) redirect(`${back}?error=reason`);
  await guarded(back, () => adminStore().returnToSale(admin, id, reason));
  storeChanged(id);
  redirect(`${back}?ok=disponible`);
}

/* Orders */

export async function updateOrder(reference: string, form: FormData) {
  const admin = await requireAdmin();
  const fulfillment = text(form, "fulfillment") as (typeof FULFILLMENT)[number];
  if (!FULFILLMENT.includes(fulfillment)) redirect("/admin/pedidos?error=invalid");
  await guarded("/admin/pedidos", () => adminStore().setFulfillment(admin, reference, fulfillment, text(form, "note").slice(0, 500)));
  revalidatePath("/admin", "layout");
  redirect("/admin/pedidos?ok=guardado");
}
