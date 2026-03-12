from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlite3 import IntegrityError

from .db import (
    advance_story,
    authenticate_user,
    bootstrap_database,
    build_chat_reply,
    create_auth_session,
    create_checkout,
    create_preset_session,
    create_release,
    create_user,
    fetch_bootstrap_payload,
    generate_image_shot,
    get_feed_item,
    get_user_by_token,
    list_characters,
    list_creator_templates,
    list_feed,
    list_image_styles,
    list_ops_signals,
    list_party_scenarios,
    list_plans,
    list_releases,
    list_story_episodes,
    list_subscriptions,
    resolve_party_action,
)
from .schemas import (
    AuthSessionResponse,
    BillingPlanResponse,
    ChatRequest,
    ChatResponse,
    CheckoutRequest,
    CheckoutResponse,
    HealthResponse,
    ImageGenerateRequest,
    ImageGenerateResponse,
    LoginRequest,
    PartyResolveRequest,
    PartyResolveResponse,
    RegisterRequest,
    ReleaseCreateRequest,
    ReleaseResponse,
    SessionRequest,
    SessionResponse,
    StoryAdvanceRequest,
    StoryAdvanceResponse,
    SubscriptionResponse,
)


app = FastAPI(title="Project R API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
bootstrap_database()


@app.on_event("startup")
def on_startup() -> None:
    bootstrap_database()


def _resolve_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    prefix = "Bearer "
    if authorization.startswith(prefix):
        return authorization[len(prefix) :]
    return authorization


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="projectr-api")


@app.post("/auth/register", response_model=AuthSessionResponse)
def auth_register(payload: RegisterRequest) -> AuthSessionResponse:
    try:
      user = create_user(
          name=payload.name,
          email=payload.email,
          password=payload.password,
          role=payload.role,
      )
    except IntegrityError as exc:
      raise HTTPException(status_code=409, detail="Email already exists") from exc

    session = create_auth_session(user["id"])
    return AuthSessionResponse.model_validate(
        {
            "token": session["token"],
            "expiresAt": session["expires_at"],
            "user": session["user"],
        }
    )


@app.post("/auth/login", response_model=AuthSessionResponse)
def auth_login(payload: LoginRequest) -> AuthSessionResponse:
    user = authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    session = create_auth_session(user["id"])
    return AuthSessionResponse.model_validate(
        {
            "token": session["token"],
            "expiresAt": session["expires_at"],
            "user": session["user"],
        }
    )


@app.get("/auth/me", response_model=SessionResponse)
def auth_me(authorization: str | None = Header(default=None)) -> SessionResponse:
    token = _resolve_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    user = get_user_by_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid session")
    return SessionResponse.model_validate(user)


@app.post("/auth/session", response_model=AuthSessionResponse)
def create_session(payload: SessionRequest) -> AuthSessionResponse:
    session = create_preset_session(payload.preset_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Preset not found")
    return AuthSessionResponse.model_validate(
        {
            "token": session["token"],
            "expiresAt": session["expires_at"],
            "user": session["user"],
        }
    )


@app.get("/catalog/feed")
def feed(query: str | None = Query(default=None, alias="q")) -> list[dict]:
    return list_feed(query)


@app.get("/catalog/feed/{work_id}")
def feed_item(work_id: str) -> dict:
    work = get_feed_item(work_id)
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


@app.get("/story/episodes")
def story_episodes() -> list[dict]:
    return list_story_episodes()


@app.post("/story/advance", response_model=StoryAdvanceResponse)
def story_advance(payload: StoryAdvanceRequest) -> StoryAdvanceResponse:
    response = advance_story(
        episode_id=payload.episode_id,
        choice_id=payload.choice_id,
        trust_score=payload.trust_score,
        hype_score=payload.hype_score,
    )
    if response is None:
        raise HTTPException(status_code=404, detail="Story branch not found")
    return StoryAdvanceResponse.model_validate(
        {
            "title": response["title"],
            "detail": response["detail"],
            "trustScore": response["trust_score"],
            "hypeScore": response["hype_score"],
            "nextEpisodeId": response["next_episode_id"],
        }
    )


@app.get("/characters")
def characters() -> list[dict]:
    return list_characters()


@app.post("/chat/respond", response_model=ChatResponse)
def chat_respond(payload: ChatRequest) -> ChatResponse:
    response = build_chat_reply(payload.character_id, payload.message, payload.turn_index)
    if response is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return ChatResponse.model_validate(
        {
            "characterId": response["character_id"],
            "characterName": response["character_name"],
            "reply": response["reply"],
            "tone": response["tone"],
        }
    )


@app.get("/party/scenarios")
def party_scenarios() -> list[dict]:
    return list_party_scenarios()


@app.post("/party/resolve", response_model=PartyResolveResponse)
def party_resolve(payload: PartyResolveRequest) -> PartyResolveResponse:
    response = resolve_party_action(payload.scenario_id, payload.action, payload.turn_index)
    if response is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return PartyResolveResponse.model_validate(
        {
            "scenarioId": response["scenario_id"],
            "summary": response["summary"],
        }
    )


@app.get("/studio/styles")
def studio_styles() -> list[dict]:
    return list_image_styles()


@app.post("/studio/generate", response_model=ImageGenerateResponse)
def studio_generate(payload: ImageGenerateRequest) -> ImageGenerateResponse:
    response = generate_image_shot(payload.prompt, payload.style_id, payload.index)
    if response is None:
        raise HTTPException(status_code=404, detail="Style not found")
    return ImageGenerateResponse.model_validate(
        {
            "title": response["title"],
            "prompt": response["prompt"],
            "styleId": response["style_id"],
            "tagline": response["tagline"],
            "gradient": response["gradient"],
        }
    )


@app.get("/creator/templates")
def creator_templates() -> list[dict]:
    return list_creator_templates()


@app.get("/creator/releases", response_model=list[ReleaseResponse])
def creator_releases() -> list[ReleaseResponse]:
    releases = list_releases()
    return [
        ReleaseResponse.model_validate(
            {
                "id": release["id"],
                "title": release["title"],
                "module": release["module"],
                "pitch": release["pitch"],
                "price": release["price"],
                "projection": release["projection"],
                "status": release["status"],
                "createdAt": release["created_at"],
            }
        )
        for release in releases
    ]


@app.post("/creator/releases", response_model=ReleaseResponse)
def creator_create_release(payload: ReleaseCreateRequest) -> ReleaseResponse:
    release = create_release(
        {
            "id": str(uuid4()),
            "title": payload.title,
            "module": payload.module,
            "pitch": payload.pitch,
            "price": payload.price,
            "projection": f"월 {payload.price * 1840:,}원 예상",
            "status": "심사 대기",
            "created_at": datetime.now(UTC).isoformat(),
        }
    )
    return ReleaseResponse.model_validate(
        {
            "id": release["id"],
            "title": release["title"],
            "module": release["module"],
            "pitch": release["pitch"],
            "price": release["price"],
            "projection": release["projection"],
            "status": release["status"],
            "createdAt": release["created_at"],
        }
    )


@app.get("/billing/plans", response_model=list[BillingPlanResponse])
def billing_plans() -> list[BillingPlanResponse]:
    plans = list_plans()
    return [
        BillingPlanResponse.model_validate(
            {
                "id": plan["id"],
                "name": plan["name"],
                "price": plan["price"],
                "billingInterval": plan["billing_interval"],
                "perks": plan["perks"],
            }
        )
        for plan in plans
    ]


@app.get("/billing/subscriptions", response_model=list[SubscriptionResponse])
def billing_subscriptions(
    user_id: str | None = Query(default=None, alias="userId"),
) -> list[SubscriptionResponse]:
    subscriptions = list_subscriptions(user_id)
    return [
        SubscriptionResponse.model_validate(
            {
                "id": subscription["id"],
                "userId": subscription["user_id"],
                "planId": subscription["plan_id"],
                "planName": subscription["plan_name"],
                "price": subscription["price"],
                "status": subscription["status"],
                "renewalAt": subscription["renewal_at"],
                "createdAt": subscription["created_at"],
            }
        )
        for subscription in subscriptions
    ]


@app.post("/billing/checkout", response_model=CheckoutResponse)
def billing_checkout(payload: CheckoutRequest) -> CheckoutResponse:
    try:
        result = create_checkout(
            user_id=payload.user_id,
            plan_id=payload.plan_id,
            sku=payload.sku,
            category=payload.category,
            amount=payload.amount,
            currency=payload.currency,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return CheckoutResponse.model_validate(
        {
            "purchaseId": result["purchase_id"],
            "subscriptionId": result["subscription_id"],
            "status": result["status"],
            "planId": result["plan_id"],
            "renewalAt": result["renewal_at"],
        }
    )


@app.get("/ops/signals")
def ops_signals() -> list[dict]:
    return list_ops_signals()


@app.get("/bootstrap")
def bootstrap_payload(user_id: str | None = Query(default=None, alias="userId")) -> dict:
    return fetch_bootstrap_payload(user_id)
