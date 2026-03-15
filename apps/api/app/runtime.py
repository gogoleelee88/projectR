from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _post_json(url: str, payload: dict) -> dict | None:
    request = Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None


def request_live_chat(
    character_id: str,
    character_name: str,
    message: str,
    turn_index: int,
) -> dict | None:
    url = os.getenv("PROJECTR_CHAT_WEBHOOK_URL")
    if not url:
        return None

    payload = _post_json(
        url,
        {
            "characterId": character_id,
            "characterName": character_name,
            "message": message,
            "turnIndex": turn_index,
        },
    )
    if payload is None or "reply" not in payload:
        return None

    return {
        "reply": payload["reply"],
        "tone": payload.get("tone", "live"),
        "source": "webhook",
    }


def request_live_image(
    prompt: str,
    style_id: str,
    style_name: str,
    index: int,
) -> dict | None:
    url = os.getenv("PROJECTR_STUDIO_WEBHOOK_URL")
    if not url:
        return None

    payload = _post_json(
        url,
        {
            "prompt": prompt,
            "styleId": style_id,
            "styleName": style_name,
            "index": index,
        },
    )
    if payload is None:
        return None

    title = payload.get("title")
    tagline = payload.get("tagline")
    if not title or not tagline:
        return None

    return {
        "title": title,
        "prompt": payload.get("prompt", prompt),
        "style_id": payload.get("styleId", style_id),
        "tagline": tagline,
        "gradient": payload.get("gradient", ""),
        "source": "webhook",
    }


def request_live_checkout(
    user_id: str,
    plan_id: str,
    sku: str,
    category: str,
    amount: int,
    currency: str,
) -> dict | None:
    url = os.getenv("PROJECTR_BILLING_WEBHOOK_URL")
    if not url:
        return None

    payload = _post_json(
        url,
        {
            "userId": user_id,
            "planId": plan_id,
            "sku": sku,
            "category": category,
            "amount": amount,
            "currency": currency,
        },
    )
    if payload is None:
        return None

    return {
        "provider": payload.get("provider", "webhook"),
        "checkout_url": payload.get("checkoutUrl"),
        "status": payload.get("status", "paid"),
    }


def request_live_receipt_verification(
    *,
    intent_id: str,
    user_id: str,
    offer_id: str,
    provider: str,
    platform: str,
    amount: int,
    currency: str,
    receipt_token: str | None,
    client_secret: str,
) -> dict | None:
    url = os.getenv("PROJECTR_PAYMENT_VERIFY_WEBHOOK_URL")
    if not url:
        return None

    payload = _post_json(
        url,
        {
            "intentId": intent_id,
            "userId": user_id,
            "offerId": offer_id,
            "provider": provider,
            "platform": platform,
            "amount": amount,
            "currency": currency,
            "receiptToken": receipt_token,
            "clientSecret": client_secret,
        },
    )
    if payload is None:
        return None

    return {
        "status": payload.get("status", "paid"),
        "provider": payload.get("provider", provider),
        "provider_reference": payload.get("providerReference"),
        "verification": payload.get("verification", payload),
    }
