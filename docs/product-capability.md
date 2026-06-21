# Product Capability: Craft Intelligence

## Capability

Sticker Word Lab moves from a word generator to a craft intelligence product: a CS2 creator can enter a nickname, generate sticker-word crafts, and understand whether the craft is readable, affordable, liquid enough to source, risky to resell, and worth pitching to buyers.

The monetization lane adds a direct paid conversion path: visitors can buy Pro Craft Intel, request a custom nickname audit, or leave a lead when checkout is not configured.

## Constraints

- The app must keep working as a static frontend when backend is unavailable.
- Backend-only features can use Steam priceoverview, but every price must be treated as volatile and cache-backed.
- The product can recommend sticker substitutions, but it must not promise profit or guaranteed resale.
- CV scores are visual heuristics, not final in-game validation.
- Shared presets must not require login during prototype stage.
- Payment collection must never depend on client-side secrets.
- The app can support Payment Links immediately and Stripe Checkout Sessions when server secrets are configured.

## Implementation Contract

- Actors: craft creator, buyer/friend opening a shared link, future paid user.
- Surfaces: main craft preview, candidate replacements, Money Lab, shared `/p/{id}` pages.
- Backend interfaces:
  - `POST /api/craft-insights` accepts current segments plus alternatives.
  - The response returns cost, readability, liquidity, rarity, novelty, scrape risk, resale edge, risks, pitch, and opportunities.
  - `GET /api/monetization` returns public plans and payment readiness.
  - `POST /api/leads` stores buyer intent.
  - `POST /api/checkout` creates server-side checkout or falls back to configured payment links.
- Frontend behavior:
  - Money Lab refreshes whenever the selected craft changes.
  - Opportunity cards can replace a segment in one click.
  - Sell pitch is copyable and designed for Discord, Telegram, Steam comments, or marketplace listings.

## Issue: Budget-Aware Sticker Filtering

Tester feedback: users think in terms of “how much can I spend on this whole craft”, while the generator also needs a cheap performance guard to avoid rare stickers with no Steam price. A per-sticker max price is simpler for candidate filtering, but a max craft budget is more natural at the product level.

Acceptance criteria:

- The user can set a maximum price for one sticker.
- The user can set a maximum total budget for the whole craft.
- Stickers without a usable Steam price are treated as unavailable when “only with Steam price” is enabled.
- Price checks are batched and cached; the generator must not call Steam once per DP step.
- If prices arrive after initial render, the craft is reranked or cleared without showing rare/third-party-only stickers as valid picks.
- Candidate replacements follow the same price and budget policy.

## Non-Goals

- No guaranteed investment advice.
- No automatic Steam purchasing.
- No account-level billing portal or auth in this prototype.
- No recurring entitlement enforcement until auth exists.
- No true OCR model until we have labeled sticker-letter data.

## Open Questions

- Which paid wedge is strongest: price alerts, creator profiles, marketplace affiliate routing, or private craft packs?
- Which host/storage stack should store shared presets and future watchlists?
- Do we want Telegram/Discord bot distribution before a full hosted web backend?

## Handoff

Next implementation lane: deploy backend with persistent storage, then add watchlists and price alert notifications as the first monetizable loop.
