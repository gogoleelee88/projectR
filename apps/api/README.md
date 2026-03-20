# Project R API

FastAPI backend for Project R. It currently provides:

- session bootstrap for preset logins
- feed and content detail endpoints
- story progression endpoint
- character chat reply endpoint
- party chat resolution endpoint
- image studio generation endpoint
- creator release queue backed by SQLite
- ops signal endpoint
- payment intents, Stripe checkout/webhooks, App Store verification, and Google Play verification

## Run

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload
```

## Provider env

- Stripe: `PROJECTR_STRIPE_SECRET_KEY`, `PROJECTR_STRIPE_PUBLISHABLE_KEY`, `PROJECTR_STRIPE_WEBHOOK_SECRET`
- App Store: `PROJECTR_APPLE_ISSUER_ID`, `PROJECTR_APPLE_KEY_ID`, `PROJECTR_APPLE_BUNDLE_ID`, `PROJECTR_APPLE_PRIVATE_KEY` or `PROJECTR_APPLE_PRIVATE_KEY_PATH`
- Google Play: `PROJECTR_GOOGLE_SERVICE_ACCOUNT_JSON` or `PROJECTR_GOOGLE_SERVICE_ACCOUNT_JSON_PATH`, `PROJECTR_GOOGLE_PACKAGE_NAME`
