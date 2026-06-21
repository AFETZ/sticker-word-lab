from __future__ import annotations

import argparse
import hmac
import html
import hashlib
import ipaddress
import json
import math
import mimetypes
import os
import re
import socket
import threading
import time
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = 4_000_000

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "backend" / "data"
CACHE_DIR = DATA_DIR / "cache"
PRESET_DIR = DATA_DIR / "presets"
LEADS_DIR = DATA_DIR / "leads"
EVENTS_DIR = DATA_DIR / "events"
STICKERS_CACHE = CACHE_DIR / "stickers_en.json"
PRICE_CACHE = CACHE_DIR / "prices.json"
VISION_CACHE = CACHE_DIR / "vision.json"
LEADS_LOG = LEADS_DIR / "leads.jsonl"
CLICKS_LOG = EVENTS_DIR / "affiliate_clicks.jsonl"
MONETIZATION_LOCAL = ROOT_DIR / "backend" / "monetization.local.json"
MONETIZATION_EXAMPLE = ROOT_DIR / "backend" / "monetization.example.json"

STICKERS_URL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json"
STEAM_PRICE_URL = "https://steamcommunity.com/market/priceoverview/"

STICKERS_TTL_SECONDS = 12 * 60 * 60
PRICE_TTL_SECONDS = 6 * 60 * 60
VISION_TTL_SECONDS = 14 * 24 * 60 * 60
MAX_PRICE_BATCH = 30
MAX_VISION_BATCH = 60
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 160
MAX_JSON_BODY_BYTES = 128 * 1024
MAX_IMAGE_BYTES = int(os.environ.get("SWL_MAX_IMAGE_BYTES", str(5 * 1024 * 1024)))

BODY_LIMITS = {
  "/api/leads": 16 * 1024,
  "/api/checkout": 24 * 1024,
  "/api/presets": 64 * 1024,
  "/api/vision": 96 * 1024,
  "/api/craft-insights": 128 * 1024,
  "/api/prices": 16 * 1024,
}

RATE_LIMITS = {
  "/api/vision": 20,
  "/api/craft-insights": 30,
  "/api/leads": 5,
  "/api/checkout": 8,
  "/api/presets": 25,
}

DEFAULT_ALLOWED_ORIGINS = {
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
}

ALLOWED_IMAGE_HOSTS = {
  "community.akamai.steamstatic.com",
  "steamcommunity-a.akamaihd.net",
  "steamcdn-a.akamaihd.net",
  "raw.githubusercontent.com",
  *[host.strip().lower() for host in os.environ.get("SWL_ALLOWED_IMAGE_HOSTS", "").split(",") if host.strip()],
}

PUBLIC_STATIC_PATHS = {"/index.html", "/app.js", "/styles.css", "/robots.txt", "/sitemap.xml"}


class PayloadTooLarge(ValueError):
  pass

USER_AGENT = "StickerWordLab/0.2 (+https://afetz.github.io/sticker-word-lab/)"

write_lock = threading.Lock()
rate_lock = threading.Lock()
rate_buckets: dict[str, list[float]] = {}


def now() -> float:
  return time.time()


def ensure_dirs() -> None:
  CACHE_DIR.mkdir(parents=True, exist_ok=True)
  PRESET_DIR.mkdir(parents=True, exist_ok=True)
  LEADS_DIR.mkdir(parents=True, exist_ok=True)
  EVENTS_DIR.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default: Any) -> Any:
  try:
    return json.loads(path.read_text(encoding="utf-8"))
  except FileNotFoundError:
    return default
  except json.JSONDecodeError:
    return default


def write_json(path: Path, data: Any) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  tmp = path.with_suffix(path.suffix + ".tmp")
  tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
  tmp.replace(path)


def append_jsonl(path: Path, item: dict[str, Any]) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  line = json.dumps(item, ensure_ascii=False, separators=(",", ":"))
  with write_lock:
    with path.open("a", encoding="utf-8") as handle:
      handle.write(line + "\n")


def text_field(value: Any, limit: int = 240) -> str:
  return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]+", " ", str(value or "")).strip()[:limit]


def read_jsonl(path: Path, limit: int = 5000) -> list[dict[str, Any]]:
  if not path.exists():
    return []
  rows = []
  try:
    with path.open("r", encoding="utf-8") as handle:
      for line in handle:
        if len(rows) >= limit:
          break
        try:
          item = json.loads(line)
          if isinstance(item, dict):
            rows.append(item)
        except json.JSONDecodeError:
          continue
  except FileNotFoundError:
    return []
  return rows


def fetch_bytes(url: str, timeout: int = 30, max_bytes: int = 20 * 1024 * 1024) -> bytes:
  request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
  with urllib.request.urlopen(request, timeout=timeout) as response:
    declared_length = response.headers.get("Content-Length")
    if declared_length and int(declared_length) > max_bytes:
      raise ValueError("remote response is too large")
    data = response.read(max_bytes + 1)
    if len(data) > max_bytes:
      raise ValueError("remote response is too large")
    return data


def fetch_json(url: str, timeout: int = 30, max_bytes: int = 50 * 1024 * 1024) -> Any:
  return json.loads(fetch_bytes(url, timeout=timeout, max_bytes=max_bytes).decode("utf-8"))


def post_form_json(url: str, fields: dict[str, str], headers: dict[str, str] | None = None, timeout: int = 30) -> Any:
  data = urllib.parse.urlencode(fields).encode("utf-8")
  request = urllib.request.Request(
    url,
    data=data,
    headers={
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      **(headers or {}),
    },
    method="POST",
  )
  with urllib.request.urlopen(request, timeout=timeout) as response:
    return json.loads(response.read().decode("utf-8"))


def cache_age(path: Path) -> float | None:
  if not path.exists():
    return None
  return max(0, now() - path.stat().st_mtime)


def is_fresh(path: Path, ttl: int) -> bool:
  age = cache_age(path)
  return age is not None and age < ttl


def is_sensitive_static_path(path: str) -> bool:
  clean = urllib.parse.unquote(path)
  return (
    clean == "/.git"
    or clean.startswith("/.git/")
    or clean == "/backend"
    or clean.startswith("/backend/")
    or clean.endswith(".env")
  )


def is_public_static_path(path: str) -> bool:
  clean = urllib.parse.unquote(path)
  return clean in PUBLIC_STATIC_PATHS


def configured_allowed_origins() -> set[str]:
  configured = {item.strip() for item in os.environ.get("SWL_ALLOWED_ORIGINS", "").split(",") if item.strip()}
  return configured or set(DEFAULT_ALLOWED_ORIGINS)


def is_loopback_address(value: str) -> bool:
  try:
    return ipaddress.ip_address(value).is_loopback
  except ValueError:
    return value in {"localhost"}


def client_ip(handler: SimpleHTTPRequestHandler) -> str:
  forwarded = handler.headers.get("X-Forwarded-For", "").split(",", 1)[0].strip()
  if os.environ.get("SWL_TRUST_PROXY") == "1" and forwarded:
    return forwarded
  host, *_ = handler.client_address
  return host


def ip_fingerprint(ip: str) -> str:
  salt = os.environ.get("SWL_PRIVACY_SALT") or "dev-sticker-word-lab"
  return hmac.new(salt.encode("utf-8"), ip.encode("utf-8"), hashlib.sha256).hexdigest()[:16]


def check_rate_limit(identifier: str, max_requests: int = RATE_LIMIT_MAX_REQUESTS, window_seconds: int = RATE_LIMIT_WINDOW_SECONDS) -> bool:
  current = now()
  with rate_lock:
    hits = rate_buckets.get(identifier, [])
    hits = [value for value in hits if current - value < window_seconds]
    if len(hits) >= max_requests:
      rate_buckets[identifier] = hits
      return False
    hits.append(current)
    rate_buckets[identifier] = hits
    return True


def rate_limit_key(handler: SimpleHTTPRequestHandler, path: str) -> str:
  return f"{client_ip(handler)}:{path}"


def route_rate_limit(path: str) -> int:
  return RATE_LIMITS.get(path, RATE_LIMIT_MAX_REQUESTS)


def validate_remote_image_url(url: str) -> str:
  parsed = urllib.parse.urlparse(str(url or ""))
  if parsed.scheme not in {"https", "http"} or not parsed.hostname:
    raise ValueError("image URL must be http(s)")
  hostname = parsed.hostname.lower()
  if not any(hostname == allowed or hostname.endswith(f".{allowed}") for allowed in ALLOWED_IMAGE_HOSTS):
    raise ValueError("image host is not allowed")

  try:
    infos = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
  except socket.gaierror as exc:
    raise ValueError("image host cannot be resolved") from exc

  for info in infos:
    address = info[4][0]
    ip = ipaddress.ip_address(address)
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
      raise ValueError("image host resolves to a non-public address")
  return urllib.parse.urlunparse(parsed)


def get_stickers(force: bool = False) -> tuple[list[dict[str, Any]], dict[str, Any]]:
  ensure_dirs()
  source = "cache"
  if force or not is_fresh(STICKERS_CACHE, STICKERS_TTL_SECONDS):
    try:
      items = fetch_json(STICKERS_URL, timeout=45)
      if isinstance(items, list):
        with write_lock:
          write_json(STICKERS_CACHE, items)
        source = "live"
      else:
        raise ValueError("stickers response is not a list")
    except Exception:
      items = read_json(STICKERS_CACHE, [])
      source = "stale-cache"
  else:
    items = read_json(STICKERS_CACHE, [])

  valid = [item for item in items if item.get("name") and item.get("image")]
  return valid, {
    "count": len(valid),
    "source": source,
    "cached_at": STICKERS_CACHE.stat().st_mtime if STICKERS_CACHE.exists() else None,
  }


def default_monetization() -> dict[str, Any]:
  config = read_json(MONETIZATION_EXAMPLE, {})
  if not config:
    config = {
      "owner": "AFETZ",
      "currency": "USD",
      "contact_url": "",
      "community_url": "",
      "trade_url": "",
      "donation_url": "",
      "affiliate_disclosure": "Craft prices and resale scores are estimates, not profit guarantees.",
      "plans": [],
      "affiliate_links": [],
    }
  return config


def raw_monetization_config() -> dict[str, Any]:
  config = default_monetization()
  local = read_json(MONETIZATION_LOCAL, {})
  if isinstance(local, dict):
    config.update({key: value for key, value in local.items() if value not in (None, "")})
    if isinstance(local.get("plans"), list):
      config["plans"] = local["plans"]
    if isinstance(local.get("affiliate_links"), list):
      config["affiliate_links"] = local["affiliate_links"]

  env_plan_urls = {
    "pro": os.environ.get("SWL_PRO_PAYMENT_URL", ""),
    "audit": os.environ.get("SWL_AUDIT_PAYMENT_URL", ""),
    "creator": os.environ.get("SWL_CREATOR_PAYMENT_URL", ""),
  }
  for plan in config.get("plans", []):
    env_url = env_plan_urls.get(str(plan.get("id") or ""))
    if env_url:
      plan["payment_url"] = env_url

  for key, env_key in {
    "contact_url": "SWL_CONTACT_URL",
    "community_url": "SWL_COMMUNITY_URL",
    "trade_url": "SWL_TRADE_URL",
    "donation_url": "SWL_DONATION_URL",
  }.items():
    if os.environ.get(env_key):
      config[key] = os.environ[env_key]

  stripe_ready = bool(os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("SWL_STRIPE_SECRET_KEY"))
  config["payment_ready"] = any(plan.get("payment_url") or (stripe_ready and plan.get("stripe_price_id")) for plan in config.get("plans", []))
  config["lead_capture_ready"] = True
  return config


def monetization_config() -> dict[str, Any]:
  config = raw_monetization_config()
  return sanitize_monetization(config)


def sanitize_monetization(config: dict[str, Any]) -> dict[str, Any]:
  stripe_ready = bool(os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("SWL_STRIPE_SECRET_KEY"))
  allowed_top = {
    "owner",
    "currency",
    "contact_url",
    "community_url",
    "trade_url",
    "donation_url",
    "affiliate_disclosure",
    "payment_ready",
    "lead_capture_ready",
    "plans",
    "affiliate_links",
  }
  public = {key: config.get(key) for key in allowed_top if key in config}
  public["plans"] = [
    {
      "id": text_field(plan.get("id"), 40),
      "name": text_field(plan.get("name"), 80),
      "price": text_field(plan.get("price"), 40),
      "interval": text_field(plan.get("interval"), 40),
      "tagline": text_field(plan.get("tagline"), 180),
      "features": [text_field(feature, 90) for feature in (plan.get("features") or [])[:5]],
      "payment_url": text_field(plan.get("payment_url"), 500),
      "checkout_ready": bool(plan.get("payment_url") or (stripe_ready and plan.get("stripe_price_id"))),
      "amount": float(plan.get("amount") or parse_price_value(plan.get("price")) or 0),
    }
    for plan in config.get("plans", [])[:6]
    if isinstance(plan, dict)
  ]
  public["affiliate_links"] = [
    {
      "id": text_field(link.get("id"), 40),
      "label": text_field(link.get("label"), 80),
    }
    for link in config.get("affiliate_links", [])[:8]
    if isinstance(link, dict) and link.get("id") and link.get("url")
  ]
  return public


def find_plan(plan_id: str, config: dict[str, Any]) -> dict[str, Any] | None:
  for plan in config.get("plans", []):
    if str(plan.get("id") or "") == plan_id:
      return plan
  return None


def create_stripe_checkout(plan: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
  secret_key = os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("SWL_STRIPE_SECRET_KEY")
  price_id = text_field(plan.get("stripe_price_id"), 120)
  if not secret_key or not price_id:
    raise ValueError("Stripe is not configured for this plan")

  public_url = (os.environ.get("SWL_PUBLIC_URL") or os.environ.get("PUBLIC_URL") or "http://127.0.0.1:8000").rstrip("/")
  mode = "subscription" if str(plan.get("interval") or "").lower() in {"month", "monthly", "subscription"} else "payment"
  fields = {
    "mode": mode,
    "line_items[0][price]": price_id,
    "line_items[0][quantity]": "1",
    "success_url": f"{public_url}/?checkout=success&plan={urllib.parse.quote(str(plan.get('id') or ''))}",
    "cancel_url": f"{public_url}/?checkout=cancel&plan={urllib.parse.quote(str(plan.get('id') or ''))}",
    "allow_promotion_codes": "true",
    "metadata[plan]": text_field(plan.get("id"), 40),
    "metadata[word]": text_field(body.get("word"), 40),
  }
  contact = text_field(body.get("email") or body.get("contact"), 160)
  if "@" in contact:
    fields["customer_email"] = contact

  payload = post_form_json(
    "https://api.stripe.com/v1/checkout/sessions",
    fields,
    headers={"Authorization": f"Bearer {secret_key}"},
    timeout=20,
  )
  return {
    "provider": "stripe_checkout",
    "session_id": payload.get("id"),
    "redirect_url": payload.get("url"),
  }


def checkout_response(body: dict[str, Any], handler: SimpleHTTPRequestHandler) -> dict[str, Any]:
  plan_id = text_field(body.get("plan"), 40)
  config = raw_monetization_config()
  plan = find_plan(plan_id, config)
  if not plan:
    raise ValueError("unknown plan")

  lead = None
  if any(body.get(key) for key in ("contact", "email", "discord", "steam")):
    lead = save_lead({**body, "source": "checkout"}, handler)

  if plan.get("stripe_price_id") and (os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("SWL_STRIPE_SECRET_KEY")):
    checkout = create_stripe_checkout(plan, body)
  elif plan.get("payment_url"):
    checkout = {
      "provider": "payment_link",
      "redirect_url": plan.get("payment_url"),
    }
  else:
    checkout = {
      "provider": "lead_only",
      "redirect_url": "",
      "message": "Payment is not configured yet. Lead was saved.",
    }

  public_plan = {
    "id": text_field(plan.get("id"), 40),
    "name": text_field(plan.get("name"), 80),
    "price": text_field(plan.get("price"), 40),
  }
  return {"plan": public_plan, "lead": lead, "checkout": checkout}


def lead_score(body: dict[str, Any]) -> int:
  score = 20
  plan = text_field(body.get("plan"), 40)
  message = text_field(body.get("message"), 700).lower()
  if plan == "creator":
    score += 35
  elif plan == "audit":
    score += 24
  elif plan == "pro":
    score += 14
  if body.get("email"):
    score += 12
  if body.get("steam"):
    score += 12
  if body.get("discord") or body.get("contact"):
    score += 10
  if any(token in message for token in ("urgent", "today", "сегодня", "срочно", "buy", "куплю", "budget", "бюджет")):
    score += 14
  if len(message) >= 80:
    score += 8
  return min(100, score)


def save_lead(body: dict[str, Any], handler: SimpleHTTPRequestHandler) -> dict[str, Any]:
  plan = text_field(body.get("plan"), 40) or "unknown"
  contact = text_field(body.get("contact"), 160)
  email = text_field(body.get("email"), 160)
  discord = text_field(body.get("discord"), 160)
  honeypot = text_field(body.get("website") or body.get("company_url"), 160)
  if honeypot:
    raise ValueError("spam rejected")
  if not any([contact, email, discord]):
    raise ValueError("contact, email, or discord is required")

  lead = {
    "id": hashlib.sha256(f"{now()}:{client_ip(handler)}:{contact}:{email}:{discord}".encode("utf-8")).hexdigest()[:12],
    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "ip_hash": ip_fingerprint(client_ip(handler)),
    "plan": plan,
    "word": text_field(body.get("word"), 40),
    "contact": contact,
    "email": email,
    "discord": discord,
    "steam": text_field(body.get("steam"), 180),
    "budget": text_field(body.get("budget"), 80),
    "message": text_field(body.get("message"), 700),
    "score": lead_score(body),
    "craft_title": text_field((body.get("craft") or {}).get("title") if isinstance(body.get("craft"), dict) else "", 120),
    "craft_score": (body.get("craft") or {}).get("score") if isinstance(body.get("craft"), dict) else None,
    "source": text_field(body.get("source"), 80) or "site",
  }
  append_jsonl(LEADS_LOG, lead)
  return {"id": lead["id"], "created_at": lead["created_at"], "plan": lead["plan"], "score": lead["score"]}


def affiliate_link(link_id: str, config: dict[str, Any]) -> dict[str, Any] | None:
  for link in config.get("affiliate_links", []):
    if str(link.get("id") or "") == link_id:
      return link
  return None


def track_affiliate_click(link_id: str, handler: SimpleHTTPRequestHandler, query: dict[str, list[str]]) -> dict[str, Any]:
  config = raw_monetization_config()
  link = affiliate_link(link_id, config)
  if not link or not link.get("url"):
    raise ValueError("affiliate link is not configured")
  click = {
    "id": hashlib.sha256(f"{now()}:{client_ip(handler)}:{link_id}".encode("utf-8")).hexdigest()[:12],
    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "ip_hash": ip_fingerprint(client_ip(handler)),
    "link_id": text_field(link_id, 40),
    "label": text_field(link.get("label"), 80),
    "word": text_field((query.get("word") or [""])[0], 40),
    "craft": text_field((query.get("craft") or [""])[0], 120),
    "expected_value": float(link.get("expected_value_per_click") or (config.get("economics") or {}).get("affiliate_value_per_click") or 0),
    "url": text_field(link.get("url"), 500),
  }
  append_jsonl(CLICKS_LOG, click)
  return click


def admin_allowed(handler: SimpleHTTPRequestHandler, query: dict[str, list[str]]) -> bool:
  token = os.environ.get("SWL_ADMIN_TOKEN", "")
  auth = handler.headers.get("Authorization", "")
  bearer = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
  supplied = handler.headers.get("X-Admin-Token", "") or bearer
  if token:
    return hmac.compare_digest(supplied, token)
  host = (handler.headers.get("Host") or "").split(":", 1)[0]
  return is_loopback_address(client_ip(handler)) and is_loopback_address(host)


def amount_for_plan(plan: dict[str, Any]) -> float:
  return float(plan.get("amount") or parse_price_value(plan.get("price")) or 0)


def revenue_dashboard() -> dict[str, Any]:
  config = raw_monetization_config()
  plans = {str(plan.get("id") or ""): plan for plan in config.get("plans", []) if isinstance(plan, dict)}
  economics = config.get("economics") if isinstance(config.get("economics"), dict) else {}
  close_rate = float(economics.get("lead_to_paid_rate") or 0.12)
  fee_rate = float(economics.get("payment_fee_rate") or 0.039)
  refund_rate = float(economics.get("refund_rate") or 0.03)
  fixed_cost = float(economics.get("monthly_fixed_cost") or 0)
  support_cost = float(economics.get("support_cost_per_paid") or 0)
  default_click_value = float(economics.get("affiliate_value_per_click") or 0)

  leads = read_jsonl(LEADS_LOG)
  clicks = read_jsonl(CLICKS_LOG)
  plan_counts: dict[str, int] = {}
  weighted_pipeline = 0.0
  expected_cogs = 0.0
  expected_paid = 0.0

  for lead in leads:
    plan_id = str(lead.get("plan") or "unknown")
    plan_counts[plan_id] = plan_counts.get(plan_id, 0) + 1
    plan = plans.get(plan_id, {})
    amount = amount_for_plan(plan)
    probability = close_rate * (0.75 + min(100, float(lead.get("score") or 0)) / 100)
    probability = clamp(probability, 0.02, 0.65)
    weighted_pipeline += amount * probability
    expected_paid += probability
    expected_cogs += (float(plan.get("unit_cogs") or 0) + support_cost) * probability

  affiliate_revenue = sum(float(click.get("expected_value") or default_click_value) for click in clicks)
  gross_revenue = weighted_pipeline + affiliate_revenue
  payment_fees = weighted_pipeline * fee_rate
  refunds = weighted_pipeline * refund_rate
  ebitda = gross_revenue - expected_cogs - payment_fees - refunds - fixed_cost
  margin = ebitda / gross_revenue if gross_revenue > 0 else 0

  top_leads = sorted(leads, key=lambda item: (int(item.get("score") or 0), item.get("created_at", "")), reverse=True)[:12]
  return {
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "assumptions": {
      "lead_to_paid_rate": close_rate,
      "payment_fee_rate": fee_rate,
      "refund_rate": refund_rate,
      "monthly_fixed_cost": fixed_cost,
      "support_cost_per_paid": support_cost,
      "affiliate_value_per_click": default_click_value,
    },
    "summary": {
      "leads": len(leads),
      "affiliate_clicks": len(clicks),
      "expected_paid_orders": round(expected_paid, 2),
      "weighted_pipeline": round(weighted_pipeline, 2),
      "affiliate_revenue": round(affiliate_revenue, 2),
      "gross_revenue": round(gross_revenue, 2),
      "expected_cogs": round(expected_cogs, 2),
      "payment_fees": round(payment_fees, 2),
      "refund_reserve": round(refunds, 2),
      "fixed_cost": round(fixed_cost, 2),
      "ebitda": round(ebitda, 2),
      "ebitda_margin": round(margin * 100, 1),
    },
    "plan_counts": plan_counts,
    "top_leads": [
      {
        "id": lead.get("id"),
        "created_at": lead.get("created_at"),
        "plan": lead.get("plan"),
        "score": lead.get("score"),
        "word": lead.get("word"),
        "contact": lead.get("contact") or lead.get("email") or lead.get("discord"),
        "steam": lead.get("steam"),
        "message": lead.get("message"),
      }
      for lead in top_leads
    ],
  }


def normalize_query(value: str) -> str:
  return re.sub(r"[^a-z0-9]+", "", value.lower())


def filter_stickers(items: list[dict[str, Any]], query: str, limit: int) -> list[dict[str, Any]]:
  if not query:
    return [public_sticker(item) for item in items[:limit]]
  q = normalize_query(query)
  output = []
  for item in items:
    haystack = normalize_query(" ".join(str(item.get(key) or "") for key in ("name", "effect", "type", "market_hash_name")))
    if q in haystack:
      output.append(public_sticker(item))
      if len(output) >= limit:
        break
  return output


def public_sticker(item: dict[str, Any]) -> dict[str, Any]:
  return {
    "id": item.get("id"),
    "name": item.get("name"),
    "market_hash_name": item.get("market_hash_name") or item.get("name"),
    "image": item.get("image"),
    "type": item.get("type"),
    "effect": item.get("effect"),
    "tournament": item.get("tournament"),
  }


def parse_json_body(handler: SimpleHTTPRequestHandler, path: str) -> dict[str, Any]:
  length = int(handler.headers.get("Content-Length") or "0")
  if length <= 0:
    return {}
  max_length = BODY_LIMITS.get(path, MAX_JSON_BODY_BYTES)
  if length > max_length:
    raise PayloadTooLarge(f"Request body exceeds {max_length} bytes")
  raw = handler.rfile.read(length)
  return json.loads(raw.decode("utf-8"))


def price_cache_key(name: str, currency: str) -> str:
  return f"{currency}:{name}"


def fetch_steam_price(name: str, currency: str = "1") -> dict[str, Any]:
  params = urllib.parse.urlencode({
    "currency": currency,
    "appid": "730",
    "market_hash_name": name,
  })
  payload = fetch_json(f"{STEAM_PRICE_URL}?{params}", timeout=15, max_bytes=128 * 1024)
  if not isinstance(payload, dict):
    raise ValueError("unexpected Steam price response")
  payload["source"] = "steam"
  payload["fetched_at"] = now()
  return payload


def get_prices(names: list[str], currency: str = "1") -> dict[str, Any]:
  names = [name.strip() for name in names if name and name.strip()][:MAX_PRICE_BATCH]
  cache = read_json(PRICE_CACHE, {})
  prices: dict[str, Any] = {}
  changed = False

  for name in names:
    key = price_cache_key(name, currency)
    cached = cache.get(key)
    if cached and now() - float(cached.get("fetched_at", 0)) < PRICE_TTL_SECONDS:
      prices[name] = cached
      continue

    try:
      price = fetch_steam_price(name, currency=currency)
      prices[name] = price
      cache[key] = price
      changed = True
      time.sleep(0.15)
    except Exception as exc:
      error_text = str(exc)
      prices[name] = cached or {
        "success": False,
        "source": "steam",
        "error": error_text,
        "temporary": True,
        "retry_after": 60,
        "fetched_at": now(),
      }

  if changed:
    with write_lock:
      write_json(PRICE_CACHE, cache)
  return prices


def image_cache_key(url: str, angle: float = 0) -> str:
  normalized_angle = int(round(angle)) % 360
  return hashlib.sha256(f"{url}|angle:{normalized_angle}".encode("utf-8")).hexdigest()


def clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
  return max(min_value, min(max_value, value))


def analyze_image(url: str, angle: float = 0) -> dict[str, Any]:
  url = validate_remote_image_url(url)
  normalized_angle = int(round(angle)) % 360
  cache_key = image_cache_key(url, normalized_angle)
  cache = read_json(VISION_CACHE, {})
  cached = cache.get(cache_key)
  if cached and now() - float(cached.get("fetched_at", 0)) < VISION_TTL_SECONDS:
    return cached

  image_bytes = fetch_bytes(url, timeout=25, max_bytes=MAX_IMAGE_BYTES)
  with Image.open(BytesIO(image_bytes)) as image:
    rgba = image.convert("RGBA").resize((96, 96), Image.Resampling.LANCZOS)
    if normalized_angle:
      rgba = rgba.rotate(-normalized_angle, expand=False, resample=Image.Resampling.BICUBIC)
  arr = np.asarray(rgba).astype(np.float32)
  alpha = arr[:, :, 3]
  mask = alpha > 12
  count = int(mask.sum())
  if count == 0:
    raise ValueError("empty alpha mask")

  ys, xs = np.where(mask)
  min_x = int(xs.min())
  max_x = int(xs.max())
  min_y = int(ys.min())
  max_y = int(ys.max())
  rgb = arr[:, :, :3]
  lum = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
  visible_lum = lum[mask]

  left_alpha = float(alpha[:, :48].sum())
  right_alpha = float(alpha[:, 48:].sum())
  top_alpha = float(alpha[:48, :].sum())
  bottom_alpha = float(alpha[48:, :].sum())

  density = count / float(96 * 96)
  bbox_width = (max_x - min_x + 1) / 96.0
  bbox_height = (max_y - min_y + 1) / 96.0
  aspect = bbox_width / max(0.01, bbox_height)
  contrast = clamp(float(visible_lum.std()) / 96.0)
  horizontal_balance = 1 - abs(left_alpha - right_alpha) / max(1, left_alpha + right_alpha)
  vertical_balance = 1 - abs(top_alpha - bottom_alpha) / max(1, top_alpha + bottom_alpha)
  scrape_tolerance = clamp(0.24 + (1 - density) * 0.22 + contrast * 0.34 + horizontal_balance * 0.12)

  result = {
    "ok": True,
    "density": density,
    "bbox_width": bbox_width,
    "bbox_height": bbox_height,
    "aspect": aspect,
    "contrast": contrast,
    "horizontal_balance": horizontal_balance,
    "vertical_balance": vertical_balance,
    "scrape_tolerance": scrape_tolerance,
    "angle": normalized_angle,
    "fetched_at": now(),
  }
  cache[cache_key] = result
  with write_lock:
    write_json(VISION_CACHE, cache)
  return result


def vision_fit(metrics: dict[str, Any], token: str, scrape: float) -> dict[str, Any]:
  if not metrics.get("ok"):
    return {"score": 0, "note": "CV недоступен"}

  desired_aspect = clamp(len(token) * 0.72, 1.15, 2.8) if len(token) >= 2 else 1.0
  aspect_score = clamp(1 - abs(float(metrics["aspect"]) - desired_aspect) / max(desired_aspect, 1))
  density_score = clamp(1 - abs(float(metrics["density"]) - 0.28) / 0.36)
  contrast_score = float(metrics["contrast"])
  balance_score = float(metrics["horizontal_balance"]) if len(token) == 1 else (
    float(metrics["horizontal_balance"]) + float(metrics["vertical_balance"])
  ) / 2
  scrape_score = clamp(float(metrics["scrape_tolerance"]) - max(0, scrape - 0.15) * 0.45)
  score = round((aspect_score * 0.28 + density_score * 0.2 + contrast_score * 0.24 + balance_score * 0.12 + scrape_score * 0.16) * 100)
  note = (
    f"bbox {round(float(metrics['bbox_width']) * 100)}x{round(float(metrics['bbox_height']) * 100)}; "
    f"density {round(float(metrics['density']) * 100)}%; contrast {round(float(metrics['contrast']) * 100)}%"
  )
  return {"score": score, "note": note}


def analyze_segments(segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
  output = []
  for segment in segments[:MAX_VISION_BATCH]:
    sticker = segment.get("sticker") or {}
    image_url = sticker.get("image") or segment.get("image")
    token = str(segment.get("token") or "")
    scrape = float(segment.get("scrape") or 0)
    angle = float(segment.get("angle") or 0)
    if not image_url:
      output.append({"ok": False, "error": "missing image"})
      continue
    try:
      metrics = analyze_image(image_url, angle=angle)
      output.append({
        "ok": True,
        "sticker_id": sticker.get("id") or segment.get("sticker_id"),
        "token": token,
        "angle": angle,
        "metrics": metrics,
        "fit": vision_fit(metrics, token, scrape),
      })
    except Exception as exc:
      output.append({
        "ok": False,
        "sticker_id": sticker.get("id") or segment.get("sticker_id"),
        "token": token,
        "error": str(exc),
      })
  return output


def market_name_for_segment(segment: dict[str, Any]) -> str:
  sticker = segment.get("sticker") or {}
  return str(
    sticker.get("market_hash_name")
    or sticker.get("marketHashName")
    or sticker.get("name")
    or segment.get("marketHashName")
    or segment.get("sticker")
    or ""
  ).strip()


def parse_price_value(value: Any) -> float | None:
  if not value:
    return None
  text = str(value)
  match = re.search(r"([0-9][0-9,\s]*\.?[0-9]*)", text)
  if not match:
    return None
  normalized = match.group(1).replace(",", "").replace(" ", "")
  try:
    return round(float(normalized), 2)
  except ValueError:
    return None


def parse_volume_value(value: Any) -> int:
  if not value:
    return 0
  text = re.sub(r"[^0-9]", "", str(value))
  return int(text) if text else 0


def price_amount(price: dict[str, Any] | None) -> float | None:
  if not price or not price.get("success"):
    return None
  return parse_price_value(price.get("lowest_price")) or parse_price_value(price.get("median_price"))


def effect_value(sticker: dict[str, Any]) -> int:
  effect = str(sticker.get("effect") or "").lower()
  name = str(sticker.get("name") or "").lower()
  if "gold" in effect or "(gold)" in name:
    return 34
  if "holo" in effect or "(holo)" in name:
    return 26
  if "foil" in effect or "(foil)" in name:
    return 20
  if "glitter" in effect or "(glitter)" in name:
    return 14
  return 8


def tournament_value(sticker: dict[str, Any]) -> int:
  name = str(sticker.get("name") or "")
  if "Katowice 2014" in name:
    return 44
  if "Katowice 2015" in name:
    return 34
  if any(year in name for year in ("2014", "2015", "2016", "2017")):
    return 24
  if any(year in name for year in ("2018", "2019")):
    return 18
  if any(year in name for year in ("2024", "2025", "2026")):
    return 12
  return 10


def craft_row(
  segment: dict[str, Any],
  price: dict[str, Any] | None,
  vision: dict[str, Any] | None,
  index: int,
) -> dict[str, Any]:
  sticker = segment.get("sticker") or {}
  amount = price_amount(price)
  fit = (vision or {}).get("fit") or {}
  cv_score = int(fit.get("score") or 0)
  volume = parse_volume_value((price or {}).get("volume"))
  return {
    "index": index,
    "segment_index": segment.get("segment_index", index),
    "token": segment.get("token") or "",
    "visible": segment.get("visible") or str(segment.get("token") or "").upper(),
    "sticker_id": sticker.get("id") or segment.get("sticker_id"),
    "sticker": sticker.get("name") or segment.get("sticker") or "",
    "market_hash_name": market_name_for_segment(segment),
    "image": sticker.get("image") or segment.get("image"),
    "scrape": float(segment.get("scrape") or 0),
    "price": amount,
    "price_label": (price or {}).get("lowest_price") or (price or {}).get("median_price") or "n/a",
    "volume": volume,
    "cv_score": cv_score,
    "cv_note": fit.get("note") or (vision or {}).get("error") or "",
    "rarity_score": min(100, effect_value(sticker) + tournament_value(sticker)),
    "market_ok": bool(price and price.get("success")),
  }


def score_liquidity(volumes: list[int]) -> int:
  if not volumes:
    return 0
  normalized = [clamp(math.log10(max(1, volume)) / 3.2) for volume in volumes]
  return round(sum(normalized) / len(normalized) * 100)


def sticker_category(row: dict[str, Any]) -> str:
  name = row.get("sticker", "")
  if "Katowice 2014" in name:
    return "grail"
  if "Gold" in name or "Holo" in name:
    return "premium"
  if row.get("price") is not None and row["price"] <= 0.2:
    return "budget"
  return "standard"


def build_opportunities(current_rows: list[dict[str, Any]], alternative_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
  current_by_index = {int(row["segment_index"]): row for row in current_rows}
  output = []

  for alt in alternative_rows:
    segment_index = int(alt.get("segment_index") or 0)
    current = current_by_index.get(segment_index)
    if not current or alt.get("sticker_id") == current.get("sticker_id"):
      continue
    current_price = current.get("price")
    alt_price = alt.get("price")
    current_cv = int(current.get("cv_score") or 0)
    alt_cv = int(alt.get("cv_score") or 0)

    price_delta = None if current_price is None or alt_price is None else round(alt_price - current_price, 2)
    cv_delta = alt_cv - current_cv
    kind = None
    reason = ""

    if alt_price is None:
      continue
    if current_price is not None and alt_price <= current_price * 0.72 and cv_delta >= -6:
      kind = "margin"
      reason = "cheaper with similar readability"
    elif cv_delta >= 10 and (current_price is None or alt_price <= current_price + 3):
      kind = "readability"
      reason = "readability upgrade without a big premium"
    elif alt.get("volume", 0) >= max(80, current.get("volume", 0) * 2) and cv_delta >= -8:
      kind = "liquidity"
      reason = "higher Steam volume, easier to source"
    elif alt.get("rarity_score", 0) >= current.get("rarity_score", 0) + 16 and cv_delta >= -10:
      kind = "premium"
      reason = "rarer visual tier for collector positioning"

    if not kind:
      continue

    price_edge = 0 if alt_price is None else max(0, (current_price or alt_price) - alt_price) * 8
    edge = round((max(0, cv_delta) * 1.5) + price_edge + min(18, alt.get("volume", 0) / 20))
    output.append({
      "kind": kind,
      "edge": edge,
      "reason": reason,
      "segment_index": segment_index,
      "token": alt.get("token"),
      "visible": alt.get("visible"),
      "sticker_id": alt.get("sticker_id"),
      "sticker": alt.get("sticker"),
      "image": alt.get("image"),
      "price": alt_price,
      "price_label": alt.get("price_label"),
      "price_delta": price_delta,
      "cv_score": alt_cv,
      "cv_delta": cv_delta,
      "volume": alt.get("volume", 0),
      "rarity_score": alt.get("rarity_score", 0),
    })

  return sorted(output, key=lambda item: (item["edge"], item["cv_score"], -(item["price"] or 9999)), reverse=True)[:8]


def craft_insights(body: dict[str, Any]) -> dict[str, Any]:
  craft = body.get("craft") or {}
  segments = (body.get("segments") or craft.get("segments") or [])[:10]
  alternatives = (body.get("alternatives") or [])[:56]
  combined = segments + alternatives
  names = []
  for segment in combined:
    name = market_name_for_segment(segment)
    if name and name not in names:
      names.append(name)

  prices = get_prices(names, currency=str(body.get("currency") or "1"))
  vision_rows = analyze_segments(combined[:MAX_VISION_BATCH])
  rows = [
    craft_row(segment, prices.get(market_name_for_segment(segment)), vision_rows[index] if index < len(vision_rows) else None, index)
    for index, segment in enumerate(combined[:MAX_VISION_BATCH])
  ]
  current_rows = rows[:len(segments)]
  alternative_rows = rows[len(segments):]

  known_prices = [row["price"] for row in current_rows if row.get("price") is not None]
  total_cost = round(sum(known_prices), 2)
  unknown_prices = len(current_rows) - len(known_prices)
  cv_scores = [int(row.get("cv_score") or 0) for row in current_rows]
  avg_cv = round(sum(cv_scores) / max(1, len(cv_scores)))
  volumes = [int(row.get("volume") or 0) for row in current_rows if row.get("volume")]
  liquidity = score_liquidity(volumes)
  rarity = round(sum(row.get("rarity_score", 0) for row in current_rows) / max(1, len(current_rows)))
  max_scrape = max([float(row.get("scrape") or 0) for row in current_rows] or [0])
  scrape_risk = round(max_scrape * 100)
  budget_score = round((1 - clamp(total_cost / 25.0)) * 100) if known_prices else 0
  unique_names = len({normalize_query(row.get("sticker", "")) for row in current_rows})
  novelty = round(clamp(0.42 + unique_names / max(1, len(current_rows)) * 0.32 + len(current_rows) / 10) * 100)
  resale_score = round(clamp(
    avg_cv / 100 * 0.34
    + liquidity / 100 * 0.18
    + rarity / 100 * 0.16
    + budget_score / 100 * 0.14
    + novelty / 100 * 0.12
    - max_scrape * 0.14
    - unknown_prices * 0.08
  ) * 100)

  risks = []
  if unknown_prices:
    risks.append(f"{unknown_prices} стикер(а) без цены Steam: считаем недоступными на ТП или third-party only")
  if max_scrape >= 0.5:
    risks.append("Высокий scrape: цена перепродажи может просесть даже при читаемом слове")
  if avg_cv < 65:
    risks.append("Средняя читаемость: проверь в CSInspect перед покупкой")
  if liquidity < 35:
    risks.append("Низкий объём Steam: покупка или перепродажа может занять время")

  category_counts: dict[str, int] = {}
  for row in current_rows:
    category = sticker_category(row)
    category_counts[category] = category_counts.get(category, 0) + 1

  word = str(body.get("word") or craft.get("word") or "").upper()
  title = str(craft.get("title") or word or "Sticker craft")
  price_text = f"${total_cost:.2f}" if known_prices else "Steam price missing"
  pitch = (
    f"{title}: {len(current_rows)}-sticker word craft for {word or title}. "
    f"Sticker cost {price_text}, readability {avg_cv}/100, liquidity {liquidity}/100, resale edge {resale_score}/100. "
    f"Best angle: {'budget viral nickname' if total_cost < 2 else 'premium collector nickname' if rarity >= 45 else 'clean custom identity craft'}."
  )

  return {
    "summary": {
      "word": word,
      "title": title,
      "total_cost": total_cost,
      "unknown_prices": unknown_prices,
      "avg_cv": avg_cv,
      "liquidity": liquidity,
      "rarity": rarity,
      "novelty": novelty,
      "budget_score": budget_score,
      "scrape_risk": scrape_risk,
      "resale_score": resale_score,
      "categories": category_counts,
    },
    "rows": current_rows,
    "opportunities": build_opportunities(current_rows, alternative_rows),
    "risks": risks,
    "pitch": pitch,
    "prices": prices,
  }


def preset_id_for(preset: dict[str, Any]) -> str:
  canonical = json.dumps(preset, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
  return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:12]


def save_preset(preset: dict[str, Any]) -> dict[str, Any]:
  if not isinstance(preset, dict) or not preset.get("segments"):
    raise ValueError("preset must include segments")
  preset = dict(preset)
  preset.setdefault("saved_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
  preset_id = preset_id_for(preset)
  path = PRESET_DIR / f"{preset_id}.json"
  with write_lock:
    write_json(path, preset)
  return {"id": preset_id, "preset": preset}


def load_preset(preset_id: str) -> dict[str, Any] | None:
  if not re.fullmatch(r"[a-f0-9]{8,64}", preset_id):
    return None
  path = PRESET_DIR / f"{preset_id}.json"
  if not path.exists():
    return None
  return read_json(path, None)


class StickerWordHandler(SimpleHTTPRequestHandler):
  server_version = "StickerWordLabBackend/0.2"

  def end_headers(self) -> None:
    origin = self.headers.get("Origin", "")
    allowed_origins = configured_allowed_origins()
    if origin in allowed_origins and not self.path.startswith("/api/admin/"):
      self.send_header("Access-Control-Allow-Origin", origin)
      self.send_header("Vary", "Origin")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token")
    self.send_header("Access-Control-Max-Age", "600")
    self.send_header("X-Content-Type-Options", "nosniff")
    self.send_header("X-Frame-Options", "DENY")
    self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
    self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    self.send_header(
      "Content-Security-Policy",
      "default-src 'self'; "
      "script-src 'self'; "
      "style-src 'self' 'unsafe-inline'; "
      "img-src 'self' data: https:; "
      "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 https://raw.githubusercontent.com https://steamcommunity.com https://images.weserv.nl; "
      "frame-ancestors 'none'; "
      "base-uri 'self'; "
      "form-action 'self'",
    )
    if os.environ.get("SWL_ENABLE_HSTS") == "1":
      self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    super().end_headers()

  def do_OPTIONS(self) -> None:
    self.send_response(HTTPStatus.NO_CONTENT)
    self.end_headers()

  def do_GET(self) -> None:
    parsed = urllib.parse.urlparse(self.path)
    path = parsed.path
    query = urllib.parse.parse_qs(parsed.query)

    if is_sensitive_static_path(path):
      self.error_response(HTTPStatus.NOT_FOUND, "not_found", "Not found")
      return
    if path.startswith("/api/") and not check_rate_limit(rate_limit_key(self, path), route_rate_limit(path)):
      self.error_response(HTTPStatus.TOO_MANY_REQUESTS, "rate_limit_exceeded", "Too many requests")
      return

    try:
      if path == "/api/health":
        self.json_response({
          "data": {
            "ok": True,
            "name": "Sticker Word Lab Backend",
            "features": [
              "stickers-cache",
              "steam-prices",
              "server-vision",
              "preset-share",
              "craft-insights",
              "monetization",
              "lead-capture",
              "checkout",
              "affiliate-tracking",
              "ebitda-cockpit",
            ],
          },
        })
        return
      if path == "/robots.txt":
        self.serve_robots()
        return
      if path == "/sitemap.xml":
        self.serve_sitemap()
        return
      if path == "/api/monetization":
        self.json_response({"data": monetization_config()})
        return
      if path == "/api/admin/revenue":
        if not admin_allowed(self, query):
          self.error_response(HTTPStatus.FORBIDDEN, "forbidden", "Admin token required")
          return
        self.json_response({"data": revenue_dashboard()})
        return
      if path.startswith("/out/"):
        link_id = path.rsplit("/", 1)[-1]
        click = track_affiliate_click(link_id, self, query)
        self.redirect_response(click["url"])
        return
      if path == "/api/stickers":
        can_refresh = query.get("refresh") == ["1"] and admin_allowed(self, query)
        stickers, meta = get_stickers(force=can_refresh)
        limit = int(query.get("limit", [str(len(stickers))])[0])
        q = query.get("q", [""])[0]
        self.json_response({"data": filter_stickers(stickers, q, limit), "meta": meta})
        return
      if path == "/api/prices":
        names = query.get("name") or query.get("names") or []
        if len(names) == 1 and "," in names[0]:
          names = [name for name in names[0].split(",")]
        currency = query.get("currency", ["1"])[0]
        self.json_response({"data": get_prices(names, currency=currency), "meta": {"currency": currency}})
        return
      if path.startswith("/api/presets/"):
        preset_id = path.rsplit("/", 1)[-1]
        preset = load_preset(preset_id)
        if not preset:
          self.error_response(HTTPStatus.NOT_FOUND, "not_found", "Preset not found")
          return
        self.json_response({"data": {"id": preset_id, "preset": preset}})
        return
      if path.startswith("/p/") and path.rsplit("/", 1)[-1] in {"app.js", "styles.css"}:
        self.path = f"/{path.rsplit('/', 1)[-1]}"
        return super().do_GET()
      if path.startswith("/p/"):
        preset_id = path.rsplit("/", 1)[-1]
        self.serve_index(load_preset(preset_id))
        return
    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
      return
    except Exception as exc:
      print(f"GET {path} failed: {exc}")
      self.error_response(HTTPStatus.INTERNAL_SERVER_ERROR, "internal_error", "Internal server error")
      return

    if path == "/":
      self.serve_index()
      return
    return super().do_GET()

  def do_POST(self) -> None:
    parsed = urllib.parse.urlparse(self.path)
    path = parsed.path

    if path.startswith("/api/") and not check_rate_limit(rate_limit_key(self, path), route_rate_limit(path)):
      self.error_response(HTTPStatus.TOO_MANY_REQUESTS, "rate_limit_exceeded", "Too many requests")
      return

    try:
      body = parse_json_body(self, path)
      if path == "/api/prices":
        names = body.get("names") or []
        currency = str(body.get("currency") or "1")
        self.json_response({"data": get_prices(names, currency=currency), "meta": {"currency": currency}})
        return
      if path == "/api/vision":
        segments = body.get("segments") or []
        self.json_response({"data": analyze_segments(segments), "meta": {"count": len(segments[:MAX_VISION_BATCH])}})
        return
      if path == "/api/craft-insights":
        self.json_response({"data": craft_insights(body)})
        return
      if path == "/api/leads":
        self.json_response({"data": save_lead(body, self)}, status=HTTPStatus.CREATED)
        return
      if path == "/api/checkout":
        self.json_response({"data": checkout_response(body, self)})
        return
      if path == "/api/presets":
        saved = save_preset(body.get("preset") or body)
        self.json_response({
          "data": {
            **saved,
            "url": f"/?preset={saved['id']}",
            "short_url": f"/p/{saved['id']}",
          },
        }, status=HTTPStatus.CREATED)
        return
    except json.JSONDecodeError:
      self.error_response(HTTPStatus.BAD_REQUEST, "invalid_json", "Request body must be valid JSON")
      return
    except PayloadTooLarge as exc:
      self.error_response(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "payload_too_large", str(exc))
      return
    except ValueError as exc:
      self.error_response(HTTPStatus.UNPROCESSABLE_ENTITY, "validation_error", str(exc))
      return
    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
      return
    except Exception as exc:
      print(f"POST {path} failed: {exc}")
      self.error_response(HTTPStatus.INTERNAL_SERVER_ERROR, "internal_error", "Internal server error")
      return

    self.error_response(HTTPStatus.NOT_FOUND, "not_found", "Endpoint not found")

  def translate_path(self, path: str) -> str:
    parsed = urllib.parse.urlparse(path)
    clean_path = parsed.path
    if is_sensitive_static_path(clean_path):
      return str(ROOT_DIR / "__blocked__")
    if clean_path == "/":
      clean_path = "/index.html"
    if not is_public_static_path(clean_path):
      return str(ROOT_DIR / "__blocked__")
    candidate = (ROOT_DIR / clean_path.lstrip("/")).resolve()
    if not str(candidate).startswith(str(ROOT_DIR)):
      return str(ROOT_DIR / "index.html")
    return str(candidate)

  def serve_index(self, preset: dict[str, Any] | None = None) -> None:
    path = ROOT_DIR / "index.html"
    content = path.read_text(encoding="utf-8")
    if preset:
      title = text_field(preset.get("title") or preset.get("word") or "Sticker craft", 80)
      word = text_field(preset.get("word"), 40).upper()
      score = text_field(preset.get("score"), 10)
      description = f"{title}: CS2 sticker craft"
      if word:
        description += f" для {word}"
      if score:
        description += f", совпадение {score}%"
      description += ". Открой ссылку, чтобы увидеть стикеры, scrape и порядок нанесения."
      safe_title = html.escape(f"{title} | Sticker Word Lab", quote=True)
      safe_description = html.escape(description, quote=True)
      content = content.replace("<title>Sticker Word Lab</title>", f"<title>{safe_title}</title>")
      content = re.sub(r'<meta\b(?=[^>]*\bname="description")[^>]*>', f'<meta name="description" content="{safe_description}" />', content, flags=re.S)
      content = re.sub(r'<meta\b(?=[^>]*\bproperty="og:title")[^>]*>', f'<meta property="og:title" content="{safe_title}" />', content, flags=re.S)
      content = re.sub(r'<meta\b(?=[^>]*\bproperty="og:description")[^>]*>', f'<meta property="og:description" content="{safe_description}" />', content, flags=re.S)
      content = re.sub(r'<meta\b(?=[^>]*\bname="twitter:card")[^>]*>', '<meta name="twitter:card" content="summary_large_image" />', content, flags=re.S)
    data = content.encode("utf-8")
    self.send_response(HTTPStatus.OK)
    self.send_header("Content-Type", "text/html; charset=utf-8")
    self.send_header("Content-Length", str(len(data)))
    self.end_headers()
    self.safe_write(data)

  def public_base_url(self) -> str:
    configured = os.environ.get("SWL_PUBLIC_URL") or os.environ.get("PUBLIC_URL")
    if configured:
      return configured.rstrip("/")
    scheme = "https" if self.headers.get("X-Forwarded-Proto") == "https" else "http"
    host = self.headers.get("Host") or "127.0.0.1:8000"
    return f"{scheme}://{host}".rstrip("/")

  def serve_robots(self) -> None:
    base = self.public_base_url()
    self.text_response(f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n", content_type="text/plain; charset=utf-8")

  def serve_sitemap(self) -> None:
    base = self.public_base_url()
    body = (
      '<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      f"  <url><loc>{base}/</loc><priority>1.0</priority></url>\n"
      "</urlset>\n"
    )
    self.text_response(body, content_type="application/xml; charset=utf-8")

  def text_response(self, body: str, content_type: str = "text/plain; charset=utf-8", status: HTTPStatus = HTTPStatus.OK) -> None:
    data = body.encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", content_type)
    self.send_header("Cache-Control", "public, max-age=3600")
    self.send_header("Content-Length", str(len(data)))
    self.end_headers()
    self.safe_write(data)

  def json_response(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Cache-Control", "no-store")
    self.send_header("Content-Length", str(len(data)))
    self.end_headers()
    self.safe_write(data)

  def safe_write(self, data: bytes) -> None:
    try:
      self.wfile.write(data)
    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
      return

  def redirect_response(self, url: str) -> None:
    self.send_response(HTTPStatus.FOUND)
    self.send_header("Location", url)
    self.send_header("Cache-Control", "no-store")
    self.end_headers()

  def error_response(self, status: HTTPStatus, code: str, message: str) -> None:
    self.json_response({"error": {"code": code, "message": message}}, status=status)

  def guess_type(self, path: str) -> str:
    if path.endswith(".js"):
      return "application/javascript"
    if path.endswith(".css"):
      return "text/css"
    return mimetypes.guess_type(path)[0] or "application/octet-stream"


def main() -> None:
  parser = argparse.ArgumentParser(description="Sticker Word Lab local backend")
  parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
  parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
  args = parser.parse_args()

  ensure_dirs()
  server = ThreadingHTTPServer((args.host, args.port), StickerWordHandler)
  print(f"Sticker Word Lab backend: http://{args.host}:{args.port}")
  try:
    server.serve_forever()
  except KeyboardInterrupt:
    pass
  finally:
    server.server_close()


if __name__ == "__main__":
  main()
