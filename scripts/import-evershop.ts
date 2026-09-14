import { products } from "../src/lib/products";

type RemoteProduct = { uuid?: string; sku?: string };

const args = new Set(process.argv.slice(2));
const commit = args.has("--commit");
const update = args.has("--update");
const baseUrl = process.env.EVERSHOP_BASE_URL?.replace(/\/$/, "");
const adminToken = process.env.EVERSHOP_ADMIN_TOKEN;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

if (!baseUrl) throw new Error("Falta EVERSHOP_BASE_URL");
if (commit && !adminToken) throw new Error("Falta EVERSHOP_ADMIN_TOKEN para ejecutar cambios");

const catalogQuery = `
  query ImportAudit($filters: [FilterInput]) {
    products(filters: $filters) { items { uuid sku } }
  }
`;

async function remoteCatalog() {
  const response = await fetch(`${baseUrl}/api/graphql`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      query: catalogQuery,
      variables: { filters: [{ key: "limit", operation: "eq", value: "200" }] },
    }),
  });
  if (!response.ok) throw new Error(`No se pudo auditar EverShop (${response.status})`);
  const payload = (await response.json()) as {
    data?: { products?: { items?: RemoteProduct[] } };
    errors?: Array<{ message?: string }>;
  };
  if (payload.errors?.length) throw new Error(payload.errors.map((item) => item.message).join("; "));
  return new Map(
    (payload.data?.products?.items ?? [])
      .filter((item) => item.sku)
      .map((item) => [item.sku!, item]),
  );
}

function productPayload(product: (typeof products)[number]) {
  const sku = product.sku ?? `MNGT-${String(product.id).padStart(3, "0")}`;
  const localImages = product.images?.length
    ? product.images
    : [product.img || `/products/${product.id}/cover.png`];
  const optimizedImages = localImages.map((image) =>
    image.replace(/\.(png|jpe?g)$/i, ".webp"),
  );
  return {
    name: product.name,
    sku,
    url_key: `${product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${product.id}`,
    short_description: product.description,
    meta_title: `${product.name} · MANGATA`,
    meta_description: product.description,
    status: 1,
    visibility: 1,
    price: product.price,
    weight: 0.5,
    qty: product.inStock === false ? 0 : 1,
    manage_stock: 1,
    stock_availability: product.inStock === false ? 0 : 1,
    ...(siteUrl ? { images: optimizedImages.map((image) => `${siteUrl}${image}`) } : {}),
  };
}

async function writeProduct(path: string, method: "PATCH" | "POST", body: object) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} falló (${response.status}): ${payload}`);
}

const existing = await remoteCatalog();
let creates = 0;
let updates = 0;
let skips = 0;

for (const product of products) {
  const payload = productPayload(product);
  const remote = existing.get(payload.sku);
  if (remote && !update) {
    skips += 1;
    process.stdout.write(`SKIP   ${payload.sku} ${payload.name}\n`);
    continue;
  }
  if (remote?.uuid) {
    updates += 1;
    process.stdout.write(`${commit ? "UPDATE" : "PLAN  "} ${payload.sku} ${payload.name}\n`);
    if (commit) await writeProduct(`/api/products/${remote.uuid}`, "PATCH", payload);
  } else {
    creates += 1;
    process.stdout.write(`${commit ? "CREATE" : "PLAN  "} ${payload.sku} ${payload.name}\n`);
    if (commit) await writeProduct("/api/products", "POST", payload);
  }
}

process.stdout.write(`\n${commit ? "Aplicado" : "Dry-run"}: ${creates} altas, ${updates} actualizaciones, ${skips} sin cambios.\n`);
if (!commit) process.stdout.write("Para aplicar: npm run evershop:import -- --commit\n");
