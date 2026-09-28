import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseRegion, parseResults } from "./parse.mjs";

// Fixture: a real response of Redfin's map-search API (/stingray/api/gis, Austin TX, for sale), 2026-09-28.
const read = (n) => fs.readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const CORE = ["propertyId", "url", "address", "city", "state", "zip", "price", "beds", "latitude", "longitude", "photo", "propertyType", "status"];

test("redfin: 25 homes with core fields, MLS id and photo", () => {
  const r = parseResults(read("gis-sale.txt"));
  assert.equal(r.homes.length, 25);
  // "Coming Soon" early-access homes carry no price yet; everything else is always filled.
  for (const h of r.homes.filter((x) => x.status !== "Coming Soon")) for (const k of CORE) assert.ok(h[k] != null, `${h.url} ${k}`);
  const f = r.homes[0];
  assert.deepEqual(
    [f.mlsId, f.address, f.city, f.state, f.zip, f.price, f.beds, f.baths, f.sqft, f.lotSize, f.yearBuilt, f.pricePerSqft, f.daysOnMarket, f.propertyType, f.status],
    ["7865173", "8329 Fathom Cir Unit A & B", "Austin", "TX", "78750", 490000, 6, 4, 2382, 9099, 1977, 206, 1, "Multi-Family", "Active"],
  );
  assert.equal(f.url, "https://www.redfin.com/TX/Austin/8329-Fathom-Cir-78750/unit-A/home/186122877");
  assert.equal(f.photo, "https://ssl.cdn-redfin.com/photo/92/bigphoto/173/7865173_0.jpg");
  assert.ok(f.description.length > 100 && f.keyFacts.length === 3);
});

test("redfin: block pages and the {}&& prefix", () => {
  assert.equal(parseResults("<html>403 ERROR The request could not be satisfied</html>"), null);
  assert.deepEqual(parseResults('{}&&{"resultCode":0,"payload":{"homes":[]}}'), { homes: [] });
  assert.equal(parseResults('{}&&{"resultCode":1,"errorMessage":"bad"}'), null);
});

test("redfin: regions from URLs and ids", () => {
  assert.deepEqual(parseRegion("https://www.redfin.com/city/30818/TX/Austin"), { regionId: "30818", regionType: 6, name: "Austin, TX" });
  assert.deepEqual(parseRegion("https://redfin.com/county/118/WA/King-County/filter/max-price=1M"), { regionId: "118", regionType: 5, name: "King County, WA" });
  assert.deepEqual(parseRegion("city:16163"), { regionId: "16163", regionType: 6, name: "city:16163" });
  assert.equal(parseRegion("https://www.redfin.com/zipcode/78704"), null);
  assert.equal(parseRegion("https://www.zillow.com/city/1/TX/x"), null);
  assert.equal(parseRegion("Austin, TX"), null);
});
