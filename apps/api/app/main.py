from __future__ import annotations

from datetime import datetime, UTC
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .data import (
    CHARACTERS,
    CREATOR_TEMPLATES,
    FEATURED_WORKS,
    IMAGE_STYLES,
    OPS_SIGNALS,
    PARTY_SCENARIOS,
    STORY_EPISODES,
    USER_PRESETS,
    advance_story,
    build_chat_reply,
    generate_image_shot,
    get_feed_item,
    list_feed,
    resolve_party_action,
)
from .db import bootstrap_database, create_release, list_releases
from .schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    ImageGenerateRequest,
    ImageGenerateResponse,
    PartyResolveRequest,
    PartyResolveResponse,
    ReleaseCreateRequest,
    ReleaseResponse,
    SessionRequest,
    SessionResponse,
    StoryAdvanceRequest,
    StoryAdvanceResponse,
)


app = FastAPI(title="Project R API", version="0.1.0")
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


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="projectr-api")


@app.post("/auth/session", response_model=SessionResponse)
def create_session(payload: SessionRequest) -> SessionResponse:
    preset = next((entry for entry in USER_PRESETS if entry["id"] == payload.preset_id), None)
    if preset is None:
        raise HTTPException(status_code=404, detail="Preset not found")
    return SessionResponse.model_validate(preset)


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
    return STORY_EPISODES


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
    return list(CHARACTERS.values())


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
    return list(PARTY_SCENARIOS.values())


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
    return IMAGE_STYLES


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
    return CREATOR_TEMPLATES


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


@app.get("/ops/signals")
def ops_signals() -> list[dict]:
    return OPS_SIGNALS


@app.get("/bootstrap")
def bootstrap_payload() -> dict:
    return {
        "presets": USER_PRESETS,
        "feed": FEATURED_WORKS,
        "episodes": STORY_EPISODES,
        "characters": list(CHARACTERS.values()),
        "partyScenarios": list(PARTY_SCENARIOS.values()),
        "styles": IMAGE_STYLES,
        "creatorTemplates": CREATOR_TEMPLATES,
        "opsSignals": OPS_SIGNALS,
    }
