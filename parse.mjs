// Redfin for-sale search results from the site's own map-search JSON (Stingray gis API). Pure: text in, plain objects out.

export const BASE = "https://www.redfin.com";
export const PAGE_SIZE = 350; // Redfin's own page size for map search
export const MAX_ITEMS = 10000;
const PHOTO = "https://ssl.cdn-redfin.com/photo";

const UI_TYPE = { 1: "Single Family", 2: "Condo", 3: "Townhouse", 4: "Multi-Family", 5: "Land", 6: "Other", 7: "Manufactured", 8: "Co-op" };
const TYPE = { 3: "Condo", 4: "Multi-Family", 5: "Apartment", 6: "Single Family", 8: "Land", 13: "Townhouse" };

const v = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x.value ?? null : x ?? null);
const num = (x) => {
  const n = v(x);
  return typeof n === "number" && Number.isFinite(n) ? n : typeof n === "string" && /^-?\d+(\.\d+)?$/.test(n) ? Number(n) : null;
};
const iso = (ms) => (typeof ms === "number" && ms > 0 ? new Date(ms).toISOString().slice(0, 10) : null);
const abs = (u) => (!u ? null : u.startsWith("http") ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`);
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : null);

/** Stingray bodies start with `{}&&` (anti-JSON-hijacking prefix). Returns the parsed object or null. */
export function parseBody(text) {
  let t = String(text ?? "").trim();
  if (t.startsWith("{}&&")) t = t.slice(4);
  if (!t.startsWith("{")) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** Version of photo 0 from a gis `photos.value` like "0-39:0", "0-1:A,2-37:1" or "0:6". */
function firstPhotoVersion(value) {
  const first = String(value ?? "").split(",")[0];
  const m = first.match(/^0(?:-\d+)?:([0-9A-Za-z]+)$/);
  return m ? m[1] : null;
}

/** Primary photo of an MLS listing on Redfin's image CDN. */
export function listingPhoto(h) {
  const mls = String(v(h.mlsId) ?? "");
  const ds = h.dataSourceId;
  const ver = firstPhotoVersion(v(h.photos));
  if (!mls || ds == null || ver == null || !(h.numPictures > 0 || v(h.photos))) return null;
  const dir = mls.slice(-3);
  return `${PHOTO}/${ds}/bigphoto/${dir}/${mls}_${ver}.jpg`;
}

const STATUS = { Closed: "Sold", Sold: "Sold" };

/** One gis home (for sale or sold) → a flat record. */
export function parseGisHome(h, listingType = "FOR_SALE") {
  if (!h || typeof h !== "object" || !h.url) return null;
  const ll = v(h.latLong) ?? {};
  const street = clean(v(h.streetLine));
  const zip = clean(v(h.postalCode)) ?? clean(h.zip);
  const mlsStatus = clean(h.mlsStatus);
  const status = STATUS[mlsStatus] ?? mlsStatus ?? (listingType === "SOLD" ? "Sold" : null);
  const sold = status === "Sold" || listingType === "SOLD";
  const price = num(h.price);
  const agent = h.listingAgent ?? null;
  const sashDate = (h.sashes ?? []).map((x) => Date.parse(`${x?.lastSaleDate ?? ""} UTC`)).find((t) => Number.isFinite(t));
  const saleDate = iso(h.soldDate) ?? iso(sashDate);
  return {
    propertyId: h.propertyId != null ? String(h.propertyId) : null,
    listingId: h.listingId != null ? String(h.listingId) : null,
    mlsId: clean(String(v(h.mlsId) ?? "")),
    url: abs(h.url),
    listingType,
    status,
    propertyType: UI_TYPE[h.uiPropertyType] ?? TYPE[h.propertyType] ?? null,
    address: street,
    unit: clean(v(h.unitNumber)),
    city: clean(h.city),
    state: clean(h.state),
    zip,
    fullAddress: street ? [street, h.city, [h.state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null,
    neighborhood: clean(v(h.location)),
    price,
    priceMax: null,
    currency: "USD",
    beds: num(h.beds),
    baths: num(h.baths),
    fullBaths: num(h.fullBaths),
    partialBaths: num(h.partialBaths),
    sqft: num(h.sqFt),
    lotSize: num(h.lotSize),
    yearBuilt: num(h.yearBuilt),
    pricePerSqft: num(h.pricePerSqFt),
    hoa: num(h.hoa),
    stories: num(h.stories),
    daysOnMarket: num(h.dom),
    latitude: num(ll.latitude),
    longitude: num(ll.longitude),
    soldDate: sold ? saleDate : null,
    soldPrice: sold && !h.hideSalePrice ? price : null,
    lastSoldDate: saleDate,
    photo: listingPhoto(h),
    photoCount: num(h.numPictures),
    description: clean(h.listingRemarks),
    keyFacts: (h.keyFacts ?? []).map((k) => k?.description).filter(Boolean),
    tags: (h.listingTags ?? []).filter((t) => typeof t === "string"),
    listingAgent: clean(agent?.name) ?? null,
    listingBroker: clean(agent?.brokerName ?? h.listingBroker?.name) ?? null,
    openHouse: clean(h.openHouseStartFormatted) ?? null,
    isNewConstruction: !!h.isNewConstruction,
    has3DTour: !!(h.has3DTour || h.hasVirtualTour),
    // Rentals only
    bedsMax: null,
    bathsMax: null,
    sqftMax: null,
    propertyName: null,
    availableUnits: null,
    phone: null,
    availableFrom: null,
    updatedAt: null,
  };
}

/** One gis API page → { homes }. Null when the body is not a results payload (block page, error). */
export function parseResults(text) {
  const j = parseBody(text);
  if (!j || (j.resultCode !== 0 && j.resultCode !== undefined)) return null;
  const homes = j.payload?.homes;
  if (!Array.isArray(homes)) return null;
  return { homes: homes.map((h) => parseGisHome(h, "FOR_SALE")).filter(Boolean) };
}

// Redfin region types, as its search URLs name them.
export const REGION_TYPES = { neighborhood: 1, zipcode: 2, state: 4, county: 5, city: 6 };

/**
 * A region from a Redfin search URL (https://www.redfin.com/city/30818/TX/Austin, /county/118/WA/King-County,
 * /neighborhood/<id>/...) or "city:30818" → { regionId, regionType, name }. ZIP URLs (/zipcode/78704) carry no id: null.
 */
export function parseRegion(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(city|county|neighborhood|state)\s*:\s*(\d+)$/i);
  if (m) return { regionId: m[2], regionType: REGION_TYPES[m[1].toLowerCase()], name: s };
  let u;
  try {
    u = new URL(s.startsWith("/") ? `${BASE}${s}` : s);
  } catch {
    return null;
  }
  if (!/(^|\.)redfin\.com$/.test(u.hostname)) return null;
  const seg = u.pathname.split("/").filter(Boolean);
  const type = REGION_TYPES[seg[0]];
  if (!type || type === REGION_TYPES.zipcode || !/^\d+$/.test(seg[1] ?? "")) return null;
  const [st, place] = seg.slice(2).map((x) => decodeURIComponent(x).replace(/-/g, " "));
  return { regionId: seg[1], regionType: type, name: place ? `${place}, ${st}` : st ?? seg[1] };
}
