# Redfin Scraper (Node.js): homes for sale in any city or county as JSON

Scrape Redfin's homes for sale in a city, county or neighbourhood into structured JSON: price, beds, baths, square feet, lot size, year built, price per square foot, HOA, days on market, full address with ZIP and neighbourhood, latitude and longitude, MLS number, listing status (Active, Coming Soon, Pending...), property type, key facts ("Pool", "Garage"), last sale date, the listing description and the main photo. Up to 350 homes per request and thousands per region, sorted the way Redfin sorts them or by price or newest.

The scraper calls Redfin's own map-search API (the JSON its website loads) through a public [Unbrowse](https://unbrowse.ai) tool. The request is sent from your machine and parsed locally, so there is no browser to run and no page layout to break.

## Quick start

```bash
git clone https://github.com/unbrowse-ai/redfin-scraper && cd redfin-scraper && npm install
export UNBROWSE_API_KEY=ub_live_...        # free key: https://unbrowse.ai

node index.mjs https://www.redfin.com/city/30818/TX/Austin --max 500 > austin.json
node index.mjs https://www.redfin.com/county/118/WA/King-County --sort price-desc --max 50 > king-top.json
node index.mjs city:16163 --min-beds 3 --max-price 900000 > seattle-3bed.json
```

Find a region's URL by searching the place on redfin.com and copying the address bar (`/city/<id>/...`, `/county/<id>/...`, `/neighborhood/<id>/...`).

| Option | Default | Meaning |
|---|---|---|
| `<region>...` | | Redfin city, county or neighbourhood URL, or `city:<id>` / `county:<id>` |
| `--max N` | 100 | Homes per region (350 per request) |
| `--sort` | recommended | `recommended`, `newest`, `price-asc`, `price-desc` |
| `--min-price`, `--max-price`, `--min-beds`, `--min-baths` | | Applied to the results |

From code:

```js
import { scrape } from "./index.mjs";
const homes = await scrape("https://www.redfin.com/city/30818/TX/Austin", { max: 200, minBeds: 3 });
```

## Output

```json
{
  "propertyId": "31071505",
  "mlsId": "2180998139890850489",
  "url": "https://www.redfin.com/TX/Austin/312-Horseback-Holw-78732/home/31071505",
  "status": "Coming Soon",
  "propertyType": "Single Family",
  "fullAddress": "312 Horseback Holw, Austin, TX 78732",
  "neighborhood": "Steiner Ranch",
  "price": 1050000, "currency": "USD",
  "beds": 4, "baths": 4, "sqft": 3619, "lotSize": 10236, "yearBuilt": 2008, "pricePerSqft": 290,
  "daysOnMarket": 1,
  "latitude": 30.3492835, "longitude": -97.9038045,
  "lastSoldDate": "2022-03-22",
  "photo": "https://ssl.cdn-redfin.com/photo/641/bigphoto/489/2180998139890850489_0.jpg",
  "photoCount": 79,
  "keyFacts": ["0.23 acre lot", "Garage", "Pool"],
  "region": "Austin, TX"
}
```

## Fields

| Field | Notes |
|---|---|
| `propertyId`, `listingId`, `mlsId`, `url` | Redfin ids, MLS number, home page |
| `status`, `listingType`, `propertyType` | Active, Coming Soon, Pending...; Single Family, Condo, Townhouse, Multi-Family, Land |
| `address`, `unit`, `city`, `state`, `zip`, `fullAddress`, `neighborhood` | |
| `price`, `currency`, `pricePerSqft`, `hoa` | USD |
| `beds`, `baths`, `fullBaths`, `partialBaths`, `sqft`, `lotSize`, `yearBuilt`, `stories` | |
| `daysOnMarket`, `lastSoldDate`, `openHouse` | Some MLSs hide days on market |
| `latitude`, `longitude` | |
| `photo`, `photoCount`, `has3DTour` | Main photo URL |
| `description`, `keyFacts[]`, `tags[]`, `isNewConstruction` | Listing remarks and highlights |
| `listingAgent`, `listingBroker` | When the MLS allows it |
| `searchQuery`, `region`, `scrapedAt` | Context |

## FAQ

**Why a region URL and not "Austin, TX"?** Redfin's place search refuses most addresses outside the US, so the scraper takes the region id straight from a Redfin URL, which works from anywhere.

**ZIP codes?** Redfin's ZIP URLs (`/zipcode/78704`) do not carry the region id. Use the city or county, then filter by `zip`.

**Sold homes and rentals?** Not yet: the public tool covers homes for sale. Contributions welcome.

**Why a key?** The search is sent through Unbrowse's public Redfin tool, which tells your machine which request to send. The key is free; the request leaves from your IP.

---

Part of [open-scrapers](https://github.com/unbrowse-ai/open-scrapers): more scrapers and a catalog of 2,400+ websites callable as APIs or MCP servers.
