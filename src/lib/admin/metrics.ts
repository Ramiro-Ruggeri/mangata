import type { Pool } from "pg";

export const COUNTED = ["page_view", "product_view", "add_to_cart", "begin_checkout", "whatsapp_click", "announcement_click"] as const;
export type CountedEvent = (typeof COUNTED)[number];

const TODAY = "(now() AT TIME ZONE 'America/Argentina/Cordoba')::date";

/** Reduces a referring site to a family. The address itself is never stored. */
export function trafficSource(referrerHost: string, ownHost: string) {
  const host = referrerHost.toLowerCase().replace(/^www\./, "");
  if (!host) return "directo";
  if (host === ownHost.toLowerCase().replace(/^www\./, "")) return "interna";
  if (/(^|\.)instagram\.com$|^l\.instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)(facebook\.com|fb\.com)$/.test(host)) return "facebook";
  if (/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/.test(host)) return "ia";
  if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com)$/.test(host)) return "buscadores";
  return "otros";
}

export async function countEvent(db: Pool, event: CountedEvent, dimension: string) {
  // A product counter only exists for a real piece, so forged requests cannot grow the table.
  await db.query(`INSERT INTO metrics_daily(day,metric,dimension,count)
    SELECT ${TODAY},$1,$2,1 WHERE $2='' OR $1='page_view' OR EXISTS (SELECT 1 FROM inventory WHERE sku=$2)
    ON CONFLICT(day,metric,dimension) DO UPDATE SET count=metrics_daily.count+1`, [event, dimension]);
}

const salesTotals = (from: string, to: string) => `SELECT
  (SELECT COALESCE(sum(amount_cents),0)::float8 FROM orders o WHERE o.status='paid' AND (o.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date BETWEEN ${from} AND ${to}) AS web_cents,
  (SELECT count(*)::int FROM orders o WHERE o.status='paid' AND (o.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date BETWEEN ${from} AND ${to}) AS web_count,
  (SELECT COALESCE(sum(amount_cents),0)::float8 FROM manual_sales m WHERE m.voided_at IS NULL AND (m.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date BETWEEN ${from} AND ${to}) AS manual_cents,
  (SELECT count(*)::int FROM manual_sales m WHERE m.voided_at IS NULL AND (m.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date BETWEEN ${from} AND ${to}) AS manual_count`;

/** Every number is a sum of stored rows, over whole days in Argentina. Nothing is estimated. */
export async function metricsReport(db: Pool, days: number) {
  const from = `(${TODAY}-($1::int-1))`, previousFrom = `(${TODAY}-(2*$1::int-1))`, previousTo = `(${TODAY}-$1::int)`;
  const [current, previous, counters, sources, pieces, firstDay] = await Promise.all([
    db.query(salesTotals(from, TODAY), [days]),
    db.query(salesTotals(previousFrom, previousTo), [days]),
    db.query(`SELECT metric,sum(count)::int AS total FROM metrics_daily WHERE day>=${from} GROUP BY 1`, [days]),
    db.query(`SELECT dimension,sum(count)::int AS total FROM metrics_daily WHERE metric='page_view' AND dimension<>'interna' AND day>=${from} GROUP BY 1 ORDER BY 2 DESC`, [days]),
    db.query(`WITH sold AS (
        SELECT item->>'sku' AS sku,(item->>'unitPrice')::numeric*100 AS cents FROM orders o, jsonb_array_elements(o.items) item
          WHERE o.status='paid' AND (o.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date>=${from}
        UNION ALL
        SELECT item->>'sku',(item->>'unitPrice')::numeric*100 FROM manual_sales m JOIN checkout_intents ci USING(reference), jsonb_array_elements(ci.items) item
          WHERE m.voided_at IS NULL AND (m.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date>=${from}
      ), views AS (
        SELECT dimension AS sku,sum(count) FILTER (WHERE metric='product_view')::int AS viewed,sum(count) FILTER (WHERE metric='add_to_cart')::int AS added
          FROM metrics_daily WHERE day>=${from} AND metric IN ('product_view','add_to_cart') GROUP BY 1
      )
      SELECT i.sku,i.name,i.state,COALESCE(v.viewed,0) AS viewed,COALESCE(v.added,0) AS added,
        (SELECT count(*)::int FROM sold s WHERE s.sku=i.sku) AS sold,
        (SELECT COALESCE(sum(s.cents),0)::float8 FROM sold s WHERE s.sku=i.sku) AS sold_cents,c.cost_cents::float8 AS cost_cents
      FROM inventory i JOIN catalog_products c USING(sku) LEFT JOIN views v USING(sku)
      WHERE i.active ORDER BY sold DESC,viewed DESC,i.name LIMIT 40`, [days]),
    db.query("SELECT min(day)::text AS first FROM metrics_daily"),
  ]);
  const total = (metric: CountedEvent) => (counters.rows.find(row => row.metric === metric)?.total ?? 0) as number;
  const row = pieces.rows as Array<{ sku: string; name: string; state: string; viewed: number; added: number; sold: number; sold_cents: number; cost_cents: number | null }>;
  const withCost = row.filter(piece => piece.sold > 0 && piece.cost_cents != null);
  return {
    current: current.rows[0], previous: previous.rows[0],
    funnel: { page_view: total("page_view"), product_view: total("product_view"), add_to_cart: total("add_to_cart"), begin_checkout: total("begin_checkout"), whatsapp_click: total("whatsapp_click"), announcement_click: total("announcement_click") },
    sources: sources.rows as Array<{ dimension: string; total: number }>,
    pieces: row,
    // Only pieces whose cost was loaded: the screen says how many that covers.
    margin: { cents: withCost.reduce((sum, piece) => sum + piece.sold_cents - piece.sold * piece.cost_cents!, 0), covered: withCost.length, sold: row.filter(piece => piece.sold > 0).length },
    countingSince: firstDay.rows[0].first as string | null,
  };
}
