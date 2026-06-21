# Sticker Word Lab Backend

Local backend for Sticker Word Lab. It serves the static frontend and adds APIs that are not possible on GitHub Pages alone.

## Run

```powershell
python backend/server.py --port 8000
```

Open `http://127.0.0.1:8000`.

## API

- `GET /api/health` - backend capability check.
- `GET /api/stickers?q=&limit=` - cached ByMykel sticker database.
- `GET /api/prices?name=Sticker%20%7C%20Apeks%20%7C%20Copenhagen%202024` - Steam Market priceoverview proxy.
- `POST /api/prices` - batch prices, body `{ "names": ["..."], "currency": "1" }`.
- `POST /api/vision` - server-side PNG analysis, body `{ "segments": [...] }`.
- `POST /api/craft-insights` - commercial craft scoring with prices, CV, liquidity, risks, sell pitch, and replacement opportunities.
- `GET /api/monetization` - public pricing/payment configuration.
- `POST /api/leads` - save buyer intent to `backend/data/leads/leads.jsonl`.
- `POST /api/checkout` - create Stripe Checkout Session when configured, otherwise return a Payment Link or lead-only response.
- `POST /api/presets` - save shared preset.
- `GET /api/presets/{id}` - load shared preset.
- `GET /p/{id}` - static frontend route that loads a shared preset.

## Why Backend

GitHub Pages cannot bypass browser CORS, keep shared preset storage, safely cache Steam price requests, or run heavier OCR/CV jobs. This backend moves those jobs server-side while keeping the frontend static-compatible.

## Current Limits

- Steam prices use the public `steamcommunity.com/market/priceoverview` endpoint. It can rate-limit, return empty prices, or fail for rare items, so requests are batched and cached.
- Server CV is still heuristic. It measures alpha-mask density, bounding box, contrast, balance, and scrape tolerance; it does not yet perform true OCR.
- Shared presets are stored in `backend/data/presets` on local disk. For public hosting, use persistent storage or a small database.
- CORS is open for local testing. Restrict it to the real frontend origin before a public deployment.
- Static serving blocks `.git` and `backend/` paths; keep secrets out of the repo anyway.
- Payment collection requires either plan `payment_url` values or `STRIPE_SECRET_KEY` plus plan `stripe_price_id` values. See `docs/revenue-setup.md`.
