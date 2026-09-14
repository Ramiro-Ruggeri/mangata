import { CommerceError } from "./one-of-one";

export const STORE_BODY_LIMIT = 32_768;

// Content-Length is only an early check: chunked requests must obey the same byte limit.
export async function readStoreJson(request: Request): Promise<Record<string, unknown>> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > STORE_BODY_LIMIT)) {
    throw new CommerceError("invalid_cart", 413);
  }
  const encoding = request.headers.get("content-encoding")?.trim().toLowerCase();
  if (encoding && encoding !== "identity") throw new CommerceError("invalid_cart", 415);
  if (!request.body) throw new CommerceError("invalid_cart", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > STORE_BODY_LIMIT) {
        await reader.cancel();
        throw new CommerceError("invalid_cart", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }

  try {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid JSON object");
    return value as Record<string, unknown>;
  } catch { throw new CommerceError("invalid_cart", 400); }
}

// Configuration is server-owned; never follow redirects while sending bearer credentials.
export function secureServiceUrl(value: string | undefined): URL {
  try {
    const url = new URL(value?.trim() ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("invalid URL");
    return url;
  } catch { throw new CommerceError("checkout_unavailable", 503); }
}
