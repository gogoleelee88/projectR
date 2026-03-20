from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import UTC, datetime
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

try:
    import jwt
except ImportError:  # pragma: no cover - optional until provider deps are installed
    jwt = None


class ProviderConfigError(RuntimeError):
    pass


class ProviderVerificationError(RuntimeError):
    pass


def _json_request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: dict | None = None,
    form: dict[str, str] | None = None,
) -> dict:
    payload = None
    merged_headers = dict(headers or {})
    if body is not None:
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        merged_headers.setdefault("Content-Type", "application/json")
    elif form is not None:
        payload = urlencode(form).encode("utf-8")
        merged_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

    request = Request(url, data=payload, headers=merged_headers, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:  # pragma: no cover - network dependent
        detail = exc.read().decode("utf-8", errors="ignore")
        raise ProviderVerificationError(
            f"Provider request failed: {exc.code} {detail or exc.reason}"
        ) from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:  # pragma: no cover - network dependent
        raise ProviderVerificationError("Provider request failed") from exc


def _decode_unverified_jws_payload(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ProviderVerificationError("Invalid signed payload")
    padded = parts[1] + "=" * (-len(parts[1]) % 4)
    return json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))


def _load_private_key(raw_env: str, path_env: str) -> str:
    raw_value = os.getenv(raw_env)
    if raw_value:
        return raw_value.replace("\\n", "\n")
    path_value = os.getenv(path_env)
    if path_value and os.path.exists(path_value):
        with open(path_value, "r", encoding="utf-8") as handle:
            return handle.read()
    raise ProviderConfigError(f"Missing {raw_env} or {path_env}")


def _require_jwt() -> None:
    if jwt is None:
        raise ProviderConfigError("PyJWT[crypto] is required for Apple and Google provider wiring")


def _map_stripe_status(status: str) -> str:
    if status in {"succeeded", "paid", "complete"}:
        return "paid"
    if status in {"processing", "requires_capture"}:
        return "processing"
    if status in {"requires_payment_method", "requires_confirmation", "requires_action", "unpaid", "open"}:
        return "pending"
    if status in {"canceled", "expired"}:
        return "cancelled"
    return "failed"


def create_provider_payment(provider: str, *, intent: dict, offer: dict, user_id: str) -> dict | None:
    if provider != "stripe":
        return None

    secret_key = os.getenv("PROJECTR_STRIPE_SECRET_KEY")
    if not secret_key:
        raise ProviderConfigError("Missing PROJECTR_STRIPE_SECRET_KEY")

    payload = _json_request(
        "POST",
        "https://api.stripe.com/v1/checkout/sessions",
        headers={"Authorization": f"Bearer {secret_key}"},
        form={
            "mode": "subscription" if offer["offer_type"] == "subscription" else "payment",
            "success_url": os.getenv(
                "PROJECTR_STRIPE_SUCCESS_URL",
                "http://127.0.0.1:3013/store?checkout=success&session_id={CHECKOUT_SESSION_ID}",
            ),
            "cancel_url": os.getenv(
                "PROJECTR_STRIPE_CANCEL_URL",
                "http://127.0.0.1:3013/store?checkout=cancel",
            ),
            "client_reference_id": intent["id"],
            "metadata[projectrIntentId]": intent["id"],
            "metadata[userId]": user_id,
            "metadata[offerId]": offer["id"],
            "line_items[0][quantity]": "1",
            "line_items[0][price_data][currency]": str(offer["currency"]).lower(),
            "line_items[0][price_data][unit_amount]": str(offer["price"]),
            "line_items[0][price_data][product_data][name]": offer["name"],
            "line_items[0][price_data][product_data][description]": offer["summary"],
            **(
                {"line_items[0][price_data][recurring][interval]": "month"}
                if offer["offer_type"] == "subscription"
                else {}
            ),
        },
    )
    return {
        "provider_reference": payload.get("id"),
        "status": _map_stripe_status(payload.get("payment_status", payload.get("status", "open"))),
        "provider_payload": {
            "checkoutUrl": payload.get("url"),
            "checkoutSessionId": payload.get("id"),
            "publishableKey": os.getenv("PROJECTR_STRIPE_PUBLISHABLE_KEY"),
        },
        "verification": {
            "stripeStatus": payload.get("status"),
            "paymentStatus": payload.get("payment_status"),
        },
    }


def verify_provider_payment(
    provider: str,
    *,
    intent: dict,
    offer: dict,
    receipt_token: str | None,
    provider_reference: str | None,
    verification_payload: dict,
) -> dict | None:
    if provider == "stripe":
        return _verify_stripe_payment(
            provider_reference or verification_payload.get("checkoutSessionId")
        )
    if provider == "app-store":
        return _verify_apple_transaction(verification_payload)
    if provider == "play-billing":
        return _verify_google_play_purchase(offer, verification_payload)
    return None


def _verify_stripe_payment(provider_reference: str | None) -> dict:
    if not provider_reference:
        raise ProviderVerificationError("Missing Stripe checkout session reference")
    secret_key = os.getenv("PROJECTR_STRIPE_SECRET_KEY")
    if not secret_key:
        raise ProviderConfigError("Missing PROJECTR_STRIPE_SECRET_KEY")
    payload = _json_request(
        "GET",
        f"https://api.stripe.com/v1/checkout/sessions/{quote(provider_reference)}",
        headers={"Authorization": f"Bearer {secret_key}"},
    )
    return {
        "status": _map_stripe_status(payload.get("payment_status", payload.get("status", "open"))),
        "provider_reference": payload.get("id", provider_reference),
        "verification": {
            "stripeStatus": payload.get("status"),
            "paymentStatus": payload.get("payment_status"),
            "paymentIntentId": payload.get("payment_intent"),
            "subscriptionId": payload.get("subscription"),
        },
    }


def _verify_apple_transaction(verification_payload: dict) -> dict:
    transaction_id = str(
        verification_payload.get("transactionId")
        or verification_payload.get("originalTransactionId")
        or ""
    ).strip()
    if not transaction_id:
        raise ProviderVerificationError("Missing Apple transactionId or originalTransactionId")

    _require_jwt()
    issuer_id = os.getenv("PROJECTR_APPLE_ISSUER_ID")
    key_id = os.getenv("PROJECTR_APPLE_KEY_ID")
    bundle_id = os.getenv("PROJECTR_APPLE_BUNDLE_ID")
    if not issuer_id or not key_id or not bundle_id:
        raise ProviderConfigError(
            "Missing PROJECTR_APPLE_ISSUER_ID, PROJECTR_APPLE_KEY_ID, or PROJECTR_APPLE_BUNDLE_ID"
        )
    private_key = _load_private_key(
        "PROJECTR_APPLE_PRIVATE_KEY",
        "PROJECTR_APPLE_PRIVATE_KEY_PATH",
    )
    now = int(time.time())
    token = jwt.encode(
        {"iss": issuer_id, "iat": now, "exp": now + 300, "aud": "appstoreconnect-v1", "bid": bundle_id},
        private_key,
        algorithm="ES256",
        headers={"kid": key_id, "typ": "JWT"},
    )
    environment = str(verification_payload.get("environment") or os.getenv("PROJECTR_APPLE_ENVIRONMENT", "sandbox")).lower()
    base_url = (
        "https://api.storekit-sandbox.itunes.apple.com"
        if environment == "sandbox"
        else "https://api.storekit.itunes.apple.com"
    )
    response = _json_request(
        "GET",
        f"{base_url}/inApps/v1/transactions/{quote(transaction_id)}",
        headers={"Authorization": f"Bearer {token}"},
    )
    signed_info = response.get("signedTransactionInfo")
    if not signed_info:
        raise ProviderVerificationError("Apple transaction response missing signedTransactionInfo")
    transaction = _decode_unverified_jws_payload(signed_info)
    revoked = transaction.get("revocationDate") is not None
    expires_ms = transaction.get("expiresDate")
    expired = bool(expires_ms) and int(expires_ms) < int(time.time() * 1000)
    status = "failed" if revoked else "paid"
    if expired and transaction.get("type") == "Auto-Renewable Subscription":
        status = "cancelled"
    return {
        "status": status,
        "provider_reference": str(transaction.get("transactionId") or transaction_id),
        "verification": {
            "environment": environment,
            "productId": transaction.get("productId"),
            "originalTransactionId": transaction.get("originalTransactionId"),
            "transactionId": transaction.get("transactionId"),
            "expiresDate": transaction.get("expiresDate"),
        },
    }


def _verify_google_play_purchase(offer: dict, verification_payload: dict) -> dict:
    purchase_token = str(verification_payload.get("purchaseToken") or "").strip()
    package_name = str(
        verification_payload.get("packageName") or os.getenv("PROJECTR_GOOGLE_PACKAGE_NAME", "")
    ).strip()
    product_id = str(
        verification_payload.get("productId")
        or verification_payload.get("subscriptionId")
        or offer["id"]
    ).strip()
    if not purchase_token or not package_name:
        raise ProviderVerificationError("Missing Google Play purchaseToken or packageName")

    access_token = _google_access_token()
    is_subscription = offer.get("offer_type") == "subscription"
    if is_subscription:
        response = _json_request(
            "GET",
            f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{quote(package_name)}/purchases/subscriptionsv2/tokens/{quote(purchase_token)}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        subscription_state = str(response.get("subscriptionState", ""))
        status = "paid" if subscription_state in {"SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"} else "pending"
        if subscription_state in {"SUBSCRIPTION_STATE_EXPIRED", "SUBSCRIPTION_STATE_CANCELED"}:
            status = "cancelled"
        return {
            "status": status,
            "provider_reference": purchase_token,
            "verification": {"subscriptionState": subscription_state, "latestOrderId": response.get("latestOrderId")},
        }

    response = _json_request(
        "GET",
        f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{quote(package_name)}/purchases/products/{quote(product_id)}/tokens/{quote(purchase_token)}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    purchase_state = int(response.get("purchaseState", 1))
    if purchase_state == 0 and int(response.get("acknowledgementState", 1)) == 0:
        _json_request(
            "POST",
            f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{quote(package_name)}/purchases/products/{quote(product_id)}/tokens/{quote(purchase_token)}:acknowledge",
            headers={"Authorization": f"Bearer {access_token}"},
            body={"developerPayload": f"projectr:{offer['id']}"},
        )
    status = "paid" if purchase_state == 0 else "pending" if purchase_state == 2 else "failed"
    return {
        "status": status,
        "provider_reference": purchase_token,
        "verification": {
            "purchaseState": purchase_state,
            "orderId": response.get("orderId"),
            "acknowledgementState": response.get("acknowledgementState"),
        },
    }


def _google_access_token() -> str:
    _require_jwt()
    raw_credentials = os.getenv("PROJECTR_GOOGLE_SERVICE_ACCOUNT_JSON")
    if raw_credentials:
        credentials = json.loads(raw_credentials)
    else:
        path = os.getenv("PROJECTR_GOOGLE_SERVICE_ACCOUNT_JSON_PATH")
        if not path or not os.path.exists(path):
            raise ProviderConfigError(
                "Missing PROJECTR_GOOGLE_SERVICE_ACCOUNT_JSON or PROJECTR_GOOGLE_SERVICE_ACCOUNT_JSON_PATH"
            )
        with open(path, "r", encoding="utf-8") as handle:
            credentials = json.load(handle)

    now = int(time.time())
    assertion = jwt.encode(
        {
            "iss": credentials["client_email"],
            "scope": "https://www.googleapis.com/auth/androidpublisher",
            "aud": credentials.get("token_uri", "https://oauth2.googleapis.com/token"),
            "iat": now,
            "exp": now + 3600,
        },
        credentials["private_key"],
        algorithm="RS256",
    )
    payload = _json_request(
        "POST",
        credentials.get("token_uri", "https://oauth2.googleapis.com/token"),
        form={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
    )
    access_token = payload.get("access_token")
    if not access_token:
        raise ProviderVerificationError("Failed to obtain Google access token")
    return str(access_token)


def parse_stripe_webhook(signature_header: str | None, raw_body: bytes) -> dict | None:
    secret = os.getenv("PROJECTR_STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise ProviderConfigError("Missing PROJECTR_STRIPE_WEBHOOK_SECRET")
    if not signature_header:
        raise ProviderVerificationError("Missing Stripe-Signature header")

    timestamp = None
    signature = None
    for part in signature_header.split(","):
        key, _, value = part.partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            signature = value
    if not timestamp or not signature:
        raise ProviderVerificationError("Invalid Stripe-Signature header")

    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}"
    expected = hmac.new(secret.encode("utf-8"), signed_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise ProviderVerificationError("Invalid Stripe webhook signature")

    event = json.loads(raw_body.decode("utf-8"))
    event_type = event.get("type")
    obj = event.get("data", {}).get("object", {})
    metadata = obj.get("metadata", {})
    intent_id = metadata.get("projectrIntentId") or obj.get("client_reference_id")
    provider_reference = obj.get("id")
    if not intent_id or not provider_reference:
        return None

    status_map = {
        "checkout.session.completed": "paid",
        "checkout.session.async_payment_succeeded": "paid",
        "checkout.session.async_payment_failed": "failed",
        "checkout.session.expired": "cancelled",
    }
    if event_type not in status_map:
        return None
    return {
        "intent_id": intent_id,
        "provider_reference": provider_reference,
        "status": status_map[event_type],
        "verification": {
            "eventId": event.get("id"),
            "eventType": event_type,
            "stripeStatus": obj.get("status"),
            "paymentStatus": obj.get("payment_status"),
        },
    }
