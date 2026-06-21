# Revenue Setup

This app is revenue-ready, but it cannot receive money until you connect real payment destinations.

## Fastest Path: Payment Links

1. Create Stripe Payment Links for each product:
   - Pro Craft Intel
   - Custom Nick Audit
   - Creator Pack
2. Copy `backend/monetization.example.json` to `backend/monetization.local.json`.
3. Paste the URLs into each plan's `payment_url`.
4. Restart the backend.

`backend/monetization.local.json` is ignored by git.

## Full Server Checkout

Use this if the server can hold secrets.

1. Create Stripe Products and Prices.
2. Put each Stripe `price_...` id into the matching plan's `stripe_price_id`.
3. Set environment variables:

```powershell
$env:STRIPE_SECRET_KEY="sk_live_..."
$env:SWL_PUBLIC_URL="https://your-domain.example"
python backend/server.py --host 0.0.0.0 --port 8000
```

The app calls `POST /api/checkout`; the backend creates a Stripe Checkout Session and redirects the user.

## Lead Capture

Even without payments, `POST /api/leads` saves buyer intent to:

```text
backend/data/leads/leads.jsonl
```

Use this for manual sales until payments are live.

## EBITDA Cockpit

The owner dashboard is available locally, or publicly with an admin token:

```powershell
$env:SWL_ADMIN_TOKEN="long-random-token"
```

Open:

```text
https://your-domain.example/?operator=1
```

It calls `GET /api/admin/revenue` and calculates:

- lead counts and plan mix
- expected paid orders
- weighted pipeline
- affiliate click revenue
- COGS, payment fees, refund reserve, fixed cost
- estimated EBITDA and EBITDA margin

Assumptions live in `economics` inside `backend/monetization.local.json`.

## Affiliate Revenue

Add affiliate URLs to `affiliate_links`. The frontend routes clicks through:

```text
/out/{affiliate_id}
```

The backend logs clicks to:

```text
backend/data/events/affiliate_clicks.jsonl
```

## Immediate Offers

- `$9` Pro Craft Intel: export, Money Lab report, sell pitch.
- `$19` Custom Nick Audit: manual review for one nickname.
- `$49` Creator Pack: 10 crafts for a trader/creator.

No page should promise guaranteed profit. Sell better discovery, faster craft building, and commercial packaging.
