#!/usr/bin/env node
// Redfin Scraper: homes for sale in a Redfin city, county, neighborhood or state as structured JSON.
// Results come from Redfin's own map-search API through the public Unbrowse tool, sent from this machine.
import { fileURLToPath } from "node:url";
import { cli, readPage } from "./lib/read-page.mjs";
import { MAX_ITEMS, PAGE_SIZE, parseRegion, parseResults } from "./parse.mjs";

const CAPABILITY = "public.redfin_com.get_stingray_gis";
const HOSTS = ["redfin.com"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Fields the shared record shape keeps for rentals; always empty for homes for sale.
const RENTAL_ONLY = ["priceMax", "bedsMax", "bathsMax", "sqftMax", "propertyName", "availableUnits", "phone", "availableFrom", "updatedAt"];
const SORTS = { recommended: "redfin-recommended-asc", newest: "days-on-redfin-asc", "price-asc": "price-asc", "price-desc": "price-desc" };

async function page(region, start, count, sort) {
  const input = {
    region_id: region.regionId,
    region_type: String(region.regionType),
    market: "x", // Redfin ignores it; the tool requires a value
    num_homes: String(count),
    start: String(start),
    ord: SORTS[sort] ?? SORTS.recommended,
  };
  const p = await readPage(CAPABILITY, input, { hosts: HOSTS, minBytes: 50 });
  const r = parseResults(p.body);
  if (!r) throw new Error(`Redfin did not return results for ${region.name}`);
  return r.homes;
}

/**
 * Homes for sale in a region: a Redfin search URL (https://www.redfin.com/city/30818/TX/Austin) or "city:30818".
 * Options: max (default 100, 350 per request), sort (recommended|newest|price-asc|price-desc),
 * minPrice, maxPrice, minBeds, minBaths (applied to the results).
 */
export async function scrape(where, { max = 100, sort = "recommended", minPrice, maxPrice, minBeds, minBaths, log = () => {} } = {}) {
  const region = parseRegion(where);
  if (!region) throw new Error(`Use a Redfin city, county or neighborhood URL (e.g. https://www.redfin.com/city/30818/TX/Austin) or "city:30818", got "${where}"`);
  const limit = Math.max(1, Math.min(Number(max) || 100, MAX_ITEMS));
  const n = (x) => (x === undefined || x === null || x === "" ? null : Number(x));
  const keep = (h) =>
    (n(minPrice) == null || (h.price ?? -1) >= n(minPrice)) &&
    (n(maxPrice) == null || (h.price != null && h.price <= n(maxPrice))) &&
    (n(minBeds) == null || (h.beds ?? -1) >= n(minBeds)) &&
    (n(minBaths) == null || (h.baths ?? -1) >= n(minBaths));
  const seen = new Set();
  const out = [];
  const now = new Date().toISOString();
  for (let start = 0; out.length < limit && start < MAX_ITEMS; start += PAGE_SIZE) {
    if (start) await sleep(800 + Math.random() * 800);
    const homes = await page(region, start, PAGE_SIZE, sort);
    let fresh = 0;
    for (const h of homes) {
      const key = h.propertyId ?? h.url;
      if (seen.has(key)) continue;
      seen.add(key);
      fresh++;
      if (!keep(h) || out.length >= limit) continue;
      const rec = { ...h, searchQuery: String(where), region: region.name, scrapedAt: now };
      for (const k of RENTAL_ONLY) delete rec[k];
      out.push(rec);
    }
    log(`${region.name}: ${homes.length} homes at ${start}, ${out.length} kept`);
    if (homes.length < PAGE_SIZE || !fresh) break;
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli(
    async (pos, f) => {
      const out = [];
      for (const q of pos) out.push(...(await scrape(q, { max: f.max, sort: f.sort, minPrice: f["min-price"], maxPrice: f["max-price"], minBeds: f["min-beds"], minBaths: f["min-baths"], log: (m) => process.stderr.write(`${m}\n`) })));
      return out;
    },
    `
Usage: node index.mjs <redfin region URL | city:<id> | county:<id>>... [options]

  https://www.redfin.com/city/30818/TX/Austin   https://www.redfin.com/county/118/WA/King-County   city:16163
  --max N            homes per region (default 100, 350 per request)
  --sort             recommended (default), newest, price-asc, price-desc
  --min-price N --max-price N --min-beds N --min-baths N

Needs UNBROWSE_API_KEY (free at https://unbrowse.ai).`,
  );
}
