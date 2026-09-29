---
name: redfin-scraper
description: Get Redfin homes for sale in a US city, county or neighborhood as JSON with price, beds, baths, sqft, year built, days on market, coordinates, MLS id and photo. Use when the user asks about homes for sale, listing prices or inventory in a US area and has (or can find) the Redfin region URL.
---

# Redfin scraper

## When to use
- "Homes for sale in Austin on Redfin", "the most expensive listings in King County", "3-bed homes under $900k in Seattle".
- For sale only (no sold or rentals). Needs a Redfin region URL (`/city/<id>/...`, `/county/<id>/...`, `/neighborhood/<id>/...`) or `city:<id>`; a bare place name is not resolved.

## Run
Uses `UNBROWSE_API_KEY` when set (free at https://unbrowse.ai); without it, requests go straight to the site. From the repo root:

```bash
node index.mjs https://www.redfin.com/city/30818/TX/Austin --max 500 > out.json
node index.mjs https://www.redfin.com/county/118/WA/King-County --sort price-desc --max 50 > out.json
node index.mjs city:16163 --min-beds 3 --max-price 900000 > out.json
```

Options: `--max N` (350 per request), `--sort recommended|newest|price-asc|price-desc`, `--min-price`, `--max-price`, `--min-beds`, `--min-baths`.
Progress goes to stderr, the JSON array to stdout. Exit 1 on error, 2 on zero results.

## Output
Array of homes: `propertyId, listingId, mlsId, url, listingType, status, propertyType, address, unit, city, state, zip, fullAddress, neighborhood, price, currency, beds, baths, fullBaths, partialBaths, sqft, lotSize, yearBuilt, pricePerSqft, hoa, stories, daysOnMarket, latitude, longitude, lastSoldDate, photo, photoCount, description, keyFacts[], tags[], listingAgent, listingBroker, openHouse, isNewConstruction, has3DTour, searchQuery, region, scrapedAt`.

## Notes
- No region URL? Ask the user to search the place on redfin.com and paste the address bar.
- Filters are applied after the request; `--max` counts kept homes.
