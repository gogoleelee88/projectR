from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlite3 import IntegrityError

from .db import (
    advance_story,
    authenticate_user,
    bootstrap_database,
    build_chat_reply,
    continue_character_chat,
    create_auth_session,
    create_checkout,
    create_preset_session,
    create_release,
    create_user,
    fetch_bootstrap_payload,
    generate_image_shot,
    get_character_chat_state,
    get_feed_item,
    get_story_progress_state,
    get_user_profile,
    get_user_by_token,
    list_characters,
    list_creator_templates,
    list_feed,
    list_image_styles,
    list_ops_signals,
    list_party_scenarios,
    list_plans,
    list_releases,
    list_saved_items,
    list_story_episodes,
    list_subscriptions,
    remove_saved_item,
    revoke_auth_session,
    resolve_party_action,
    save_item,
    sync_story_progress,
    update_user_profile,
)
from .party import party_sessions
from .runtime import request_live_chat, request_live_checkout, request_live_image
from .schemas import (
    AuthSessionResponse,
    BillingPlanResponse,
    CharacterChatSendRequest,
    CharacterChatSendResponse,
    CharacterChatStateResponse,
    ChatRequest,
    ChatResponse,
    CheckoutRequest,
    CheckoutResponse,
    HealthResponse,
    ImageGenerateRequest,
    ImageGenerateResponse,
    LoginRequest,
    PartySessionActionRequest,
    PartySessionCreateRequest,
    PartySessionJoinRequest,
    PartySessionResponse,
    PartyResolveRequest,
    PartyResolveResponse,
    RegisterRequest,
    ReleaseCreateRequest,
    ReleaseResponse,
    SavedItemCreateRequest,
    SavedItemResponse,
    SessionRequest,
    SessionResponse,
    StoryAdvanceRequest,
    StoryAdvanceResponse,
    StoryProgressSyncRequest,
    StoryProgressSyncResponse,
    SubscriptionResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
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


def _require_session_user(authorization: str | None) -> dict:
    token = _resolve_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    user = get_user_by_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user


def _serialize_character_chat_state(payload: dict) -> CharacterChatStateResponse:
    return CharacterChatStateResponse.model_validate(
        {
            "characterId": payload["character_id"],
            "characterName": payload["character_name"],
            "role": payload["role"],
            "vibe": payload["vibe"],
            "opener": payload["opener"],
            "affinityScore": payload["affinity_score"],
            "bondLevel": payload["bond_level"],
            "conversationCount": payload["conversation_count"],
            "streakCount": payload["streak_count"],
            "lastTone": payload["last_tone"],
            "lastMessageAt": payload["last_message_at"],
            "messages": [
                {
                    "id": message["id"],
                    "sender": message["sender"],
                    "text": message["text"],
                    "tone": message["tone"],
                    "createdAt": message["created_at"],
                }
                for message in payload["messages"]
            ],
            "unlockedRewards": [
                {
                    "id": reward["id"],
                    "rewardId": reward["reward_id"],
                    "title": reward["title"],
                    "summary": reward["summary"],
                    "affinityThreshold": reward["affinity_threshold"],
                    "sparksAwarded": reward["sparks_awarded"],
                    "unlockedAt": reward["unlocked_at"],
                }
                for reward in payload["unlocked_rewards"]
            ],
            "nextReward": None
            if payload["next_reward"] is None
            else {
                "rewardId": payload["next_reward"]["reward_id"],
                "title": payload["next_reward"]["title"],
                "summary": payload["next_reward"]["summary"],
                "affinityThreshold": payload["next_reward"]["affinity_threshold"],
                "remainingAffinity": payload["next_reward"]["remaining_affinity"],
                "sparksAwarded": payload["next_reward"]["sparks_awarded"],
            },
            "totalSparks": payload["total_sparks"],
            "latestRewardGrant": None
            if payload["latest_reward_grant"] is None
            else {
                "awarded": payload["latest_reward_grant"]["awarded"],
                "rewardId": payload["latest_reward_grant"]["reward_id"],
                "title": payload["latest_reward_grant"]["title"],
                "summary": payload["latest_reward_grant"]["summary"],
                "sparksAwarded": payload["latest_reward_grant"]["sparks_awarded"],
                "affinityThreshold": payload["latest_reward_grant"]["affinity_threshold"],
                "grantedAt": payload["latest_reward_grant"]["granted_at"],
            },
            "syncedAt": payload["synced_at"],
        }
    )


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
    user = _require_session_user(authorization)
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


@app.delete("/auth/session")
def delete_session(authorization: str | None = Header(default=None)) -> dict[str, str]:
    token = _resolve_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    if not revoke_auth_session(token):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "revoked"}


@app.get("/profile/me", response_model=UserProfileResponse)
def profile_me(authorization: str | None = Header(default=None)) -> UserProfileResponse:
    user = _require_session_user(authorization)
    profile = get_user_profile(user["id"])
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return UserProfileResponse.model_validate(
        {
            "id": profile["id"],
            "email": profile["email"],
            "name": profile["name"],
            "role": profile["role"],
            "membership": profile["membership"],
            "sparks": profile["sparks"],
            "focus": profile["focus"],
            "handle": profile["handle"],
            "bio": profile["bio"],
            "location": profile["location"],
            "avatarGradient": profile["avatar_gradient"],
            "favoriteGenres": profile["favorite_genres"],
            "createdAt": profile["created_at"],
            "updatedAt": profile["updated_at"],
        }
    )


@app.patch("/profile/me", response_model=UserProfileResponse)
def profile_update(
    payload: UserProfileUpdateRequest,
    authorization: str | None = Header(default=None),
) -> UserProfileResponse:
    user = _require_session_user(authorization)
    try:
        profile = update_user_profile(
            user["id"],
            name=payload.name,
            focus=payload.focus,
            handle=payload.handle,
            bio=payload.bio,
            location=payload.location,
            avatar_gradient=payload.avatar_gradient,
            favorite_genres=payload.favorite_genres,
        )
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Handle already exists") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    return UserProfileResponse.model_validate(
        {
            "id": profile["id"],
            "email": profile["email"],
            "name": profile["name"],
            "role": profile["role"],
            "membership": profile["membership"],
            "sparks": profile["sparks"],
            "focus": profile["focus"],
            "handle": profile["handle"],
            "bio": profile["bio"],
            "location": profile["location"],
            "avatarGradient": profile["avatar_gradient"],
            "favoriteGenres": profile["favorite_genres"],
            "createdAt": profile["created_at"],
            "updatedAt": profile["updated_at"],
        }
    )


@app.get("/library/saves", response_model=list[SavedItemResponse])
def library_saves(authorization: str | None = Header(default=None)) -> list[SavedItemResponse]:
    user = _require_session_user(authorization)
    items = list_saved_items(user["id"])
    return [
        SavedItemResponse.model_validate(
            {
                "id": item["id"],
                "userId": item["user_id"],
                "itemKind": item["item_kind"],
                "itemId": item["item_id"],
                "title": item["title"],
                "summary": item["summary"],
                "href": item["href"],
                "meta": item["meta"],
                "chips": item["chips"],
                "createdAt": item["created_at"],
            }
        )
        for item in items
    ]


@app.post("/library/saves", response_model=SavedItemResponse)
def library_save(
    payload: SavedItemCreateRequest,
    authorization: str | None = Header(default=None),
) -> SavedItemResponse:
    user = _require_session_user(authorization)
    try:
        item = save_item(user["id"], payload.item_kind, payload.item_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return SavedItemResponse.model_validate(
        {
            "id": item["id"],
            "userId": item["user_id"],
            "itemKind": item["item_kind"],
            "itemId": item["item_id"],
            "title": item["title"],
            "summary": item["summary"],
            "href": item["href"],
            "meta": item["meta"],
            "chips": item["chips"],
            "createdAt": item["created_at"],
        }
    )


@app.delete("/library/saves/{item_kind}/{item_id}")
def library_remove(
    item_kind: str,
    item_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    user = _require_session_user(authorization)
    removed = remove_saved_item(user["id"], item_kind, item_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Saved item not found")
    return {"status": "removed"}


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


@app.get("/story/progress", response_model=StoryProgressSyncResponse)
def story_progress(
    work_id: str = Query(alias="workId"),
    authorization: str | None = Header(default=None),
) -> StoryProgressSyncResponse:
    user = _require_session_user(authorization)
    payload = get_story_progress_state(user["id"], work_id)
    return StoryProgressSyncResponse.model_validate(
        {
            "workId": payload["work_id"],
            "progress": None
            if payload["progress"] is None
            else {
                "currentEpisodeId": payload["progress"]["current_episode_id"],
                "trustScore": payload["progress"]["trust_score"],
                "hypeScore": payload["progress"]["hype_score"],
                "visitedEpisodeIds": payload["progress"]["visited_episode_ids"],
                "endingId": payload["progress"]["ending_id"],
                "log": [
                    {
                        "episodeId": entry["episode_id"],
                        "episodeTitle": entry["episode_title"],
                        "choiceId": entry["choice_id"],
                        "choiceLabel": entry["choice_label"],
                        "resultTitle": entry["result_title"],
                        "resultDetail": entry["result_detail"],
                        "impactTags": entry["impact_tags"],
                        "trustScore": entry["trust_score"],
                        "hypeScore": entry["hype_score"],
                        "createdAt": entry["created_at"],
                    }
                    for entry in payload["progress"]["log"]
                ],
                "startedAt": payload["progress"]["started_at"],
                "updatedAt": payload["progress"]["updated_at"],
            },
            "runHistory": [
                {
                    "id": run["id"],
                    "workId": run["work_id"],
                    "endingId": run["ending_id"],
                    "endingTitle": run["ending_title"],
                    "endingClass": run["ending_class"],
                    "reward": run["reward"],
                    "trustScore": run["trust_score"],
                    "hypeScore": run["hype_score"],
                    "visitedCount": run["visited_count"],
                    "choiceCount": run["choice_count"],
                    "durationMinutes": run["duration_minutes"],
                    "createdAt": run["created_at"],
                    "highlightTags": run["highlight_tags"],
                }
                for run in payload["run_history"]
            ],
            "endingRewards": [
                {
                    "id": reward["id"],
                    "workId": reward["work_id"],
                    "endingId": reward["ending_id"],
                    "endingTitle": reward["ending_title"],
                    "endingClass": reward["ending_class"],
                    "reward": reward["reward"],
                    "clearCount": reward["clear_count"],
                    "sparksAwardedTotal": reward["sparks_awarded_total"],
                    "firstClearedAt": reward["first_cleared_at"],
                    "lastClearedAt": reward["last_cleared_at"],
                }
                for reward in payload["ending_rewards"]
            ],
            "totalSparks": payload["total_sparks"],
            "latestRewardGrant": None
            if payload["latest_reward_grant"] is None
            else {
                "awarded": payload["latest_reward_grant"]["awarded"],
                "sparksAwarded": payload["latest_reward_grant"]["sparks_awarded"],
                "reward": payload["latest_reward_grant"]["reward"],
                "tier": payload["latest_reward_grant"]["tier"],
                "clearCount": payload["latest_reward_grant"]["clear_count"],
                "grantedAt": payload["latest_reward_grant"]["granted_at"],
            },
            "syncedAt": payload["synced_at"],
        }
    )


@app.put("/story/progress", response_model=StoryProgressSyncResponse)
def story_progress_sync(
    payload: StoryProgressSyncRequest,
    authorization: str | None = Header(default=None),
) -> StoryProgressSyncResponse:
    user = _require_session_user(authorization)
    try:
        result = sync_story_progress(
            user["id"],
            work_id=payload.work_id,
            current_episode_id=payload.current_episode_id,
            trust_score=payload.trust_score,
            hype_score=payload.hype_score,
            visited_episode_ids=payload.visited_episode_ids,
            ending_id=payload.ending_id,
            log=[entry.model_dump(by_alias=False) for entry in payload.log],
            started_at=payload.started_at,
            updated_at=payload.updated_at,
            completion=None
            if payload.completion is None
            else payload.completion.model_dump(by_alias=False),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StoryProgressSyncResponse.model_validate(
        {
            "workId": result["work_id"],
            "progress": None
            if result["progress"] is None
            else {
                "currentEpisodeId": result["progress"]["current_episode_id"],
                "trustScore": result["progress"]["trust_score"],
                "hypeScore": result["progress"]["hype_score"],
                "visitedEpisodeIds": result["progress"]["visited_episode_ids"],
                "endingId": result["progress"]["ending_id"],
                "log": [
                    {
                        "episodeId": entry["episode_id"],
                        "episodeTitle": entry["episode_title"],
                        "choiceId": entry["choice_id"],
                        "choiceLabel": entry["choice_label"],
                        "resultTitle": entry["result_title"],
                        "resultDetail": entry["result_detail"],
                        "impactTags": entry["impact_tags"],
                        "trustScore": entry["trust_score"],
                        "hypeScore": entry["hype_score"],
                        "createdAt": entry["created_at"],
                    }
                    for entry in result["progress"]["log"]
                ],
                "startedAt": result["progress"]["started_at"],
                "updatedAt": result["progress"]["updated_at"],
            },
            "runHistory": [
                {
                    "id": run["id"],
                    "workId": run["work_id"],
                    "endingId": run["ending_id"],
                    "endingTitle": run["ending_title"],
                    "endingClass": run["ending_class"],
                    "reward": run["reward"],
                    "trustScore": run["trust_score"],
                    "hypeScore": run["hype_score"],
                    "visitedCount": run["visited_count"],
                    "choiceCount": run["choice_count"],
                    "durationMinutes": run["duration_minutes"],
                    "createdAt": run["created_at"],
                    "highlightTags": run["highlight_tags"],
                }
                for run in result["run_history"]
            ],
            "endingRewards": [
                {
                    "id": reward["id"],
                    "workId": reward["work_id"],
                    "endingId": reward["ending_id"],
                    "endingTitle": reward["ending_title"],
                    "endingClass": reward["ending_class"],
                    "reward": reward["reward"],
                    "clearCount": reward["clear_count"],
                    "sparksAwardedTotal": reward["sparks_awarded_total"],
                    "firstClearedAt": reward["first_cleared_at"],
                    "lastClearedAt": reward["last_cleared_at"],
                }
                for reward in result["ending_rewards"]
            ],
            "totalSparks": result["total_sparks"],
            "latestRewardGrant": None
            if result["latest_reward_grant"] is None
            else {
                "awarded": result["latest_reward_grant"]["awarded"],
                "sparksAwarded": result["latest_reward_grant"]["sparks_awarded"],
                "reward": result["latest_reward_grant"]["reward"],
                "tier": result["latest_reward_grant"]["tier"],
                "clearCount": result["latest_reward_grant"]["clear_count"],
                "grantedAt": result["latest_reward_grant"]["granted_at"],
            },
            "syncedAt": result["synced_at"],
        }
    )


@app.get("/characters")
def characters() -> list[dict]:
    return list_characters()


@app.get("/chat/state", response_model=CharacterChatStateResponse)
def chat_state(
    character_id: str = Query(alias="characterId"),
    authorization: str | None = Header(default=None),
) -> CharacterChatStateResponse:
    user = _require_session_user(authorization)
    try:
        payload = get_character_chat_state(user["id"], character_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _serialize_character_chat_state(payload)


@app.post("/chat/respond", response_model=ChatResponse)
def chat_respond(payload: ChatRequest) -> ChatResponse:
    characters = {character["id"]: character for character in list_characters()}
    active_character = characters.get(payload.character_id)
    live_response = None
    if active_character is not None:
        live_response = request_live_chat(
            character_id=payload.character_id,
            character_name=active_character["name"],
            message=payload.message,
            turn_index=payload.turn_index,
        )

    if live_response is not None:
        return ChatResponse.model_validate(
            {
                "characterId": payload.character_id,
                "characterName": active_character["name"],
                "reply": live_response["reply"],
                "tone": live_response["tone"],
            }
        )

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


@app.post("/chat/sessions/respond", response_model=CharacterChatSendResponse)
def chat_session_respond(
    payload: CharacterChatSendRequest,
    authorization: str | None = Header(default=None),
) -> CharacterChatSendResponse:
    user = _require_session_user(authorization)
    characters = {character["id"]: character for character in list_characters()}
    active_character = characters.get(payload.character_id)
    live_response = None
    if active_character is not None:
        try:
            state_payload = get_character_chat_state(user["id"], payload.character_id)
        except ValueError:
            state_payload = None
        live_response = request_live_chat(
            character_id=payload.character_id,
            character_name=active_character["name"],
            message=payload.message,
            turn_index=0 if state_payload is None else state_payload["conversation_count"],
        )

    try:
        result = continue_character_chat(
            user["id"],
            character_id=payload.character_id,
            message=payload.message,
            live_response=live_response,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return CharacterChatSendResponse.model_validate(
        {
            "characterId": result["character_id"],
            "characterName": result["character_name"],
            "reply": result["reply"],
            "tone": result["tone"],
            "affinityDelta": result["affinity_delta"],
            "state": _serialize_character_chat_state(result["state"]).model_dump(
                by_alias=True
            ),
            "latestRewardGrant": None
            if result["latest_reward_grant"] is None
            else {
                "awarded": result["latest_reward_grant"]["awarded"],
                "rewardId": result["latest_reward_grant"]["reward_id"],
                "title": result["latest_reward_grant"]["title"],
                "summary": result["latest_reward_grant"]["summary"],
                "sparksAwarded": result["latest_reward_grant"]["sparks_awarded"],
                "affinityThreshold": result["latest_reward_grant"]["affinity_threshold"],
                "grantedAt": result["latest_reward_grant"]["granted_at"],
            },
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


@app.post("/party/sessions", response_model=PartySessionResponse)
async def party_create_session(payload: PartySessionCreateRequest) -> PartySessionResponse:
    session = party_sessions.create_session(
        scenario_id=payload.scenario_id,
        participant_name=payload.participant_name,
        user_id=payload.user_id,
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return PartySessionResponse.model_validate(session)


@app.post("/party/sessions/join", response_model=PartySessionResponse)
async def party_join_session(payload: PartySessionJoinRequest) -> PartySessionResponse:
    session = party_sessions.join_session(
        invite_code=payload.invite_code,
        participant_name=payload.participant_name,
        user_id=payload.user_id,
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Party session not found")
    await party_sessions.broadcast_snapshot(session["sessionId"])
    return PartySessionResponse.model_validate(session)


@app.get("/party/sessions/{session_id}", response_model=PartySessionResponse)
def party_get_session(session_id: str) -> PartySessionResponse:
    session = party_sessions.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Party session not found")
    return PartySessionResponse.model_validate(session)


@app.post("/party/sessions/{session_id}/actions", response_model=PartySessionResponse)
async def party_session_action(
    session_id: str,
    payload: PartySessionActionRequest,
) -> PartySessionResponse:
    session = party_sessions.add_action(
        session_id=session_id,
        participant_id=payload.participant_id,
        action=payload.action,
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Party session not found")
    await party_sessions.broadcast_snapshot(session_id)
    return PartySessionResponse.model_validate(session)


@app.websocket("/party/ws/{session_id}")
async def party_socket(websocket: WebSocket, session_id: str) -> None:
    connected = await party_sessions.connect(session_id, websocket)
    if not connected:
        return

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        party_sessions.disconnect(session_id, websocket)


@app.get("/studio/styles")
def studio_styles() -> list[dict]:
    return list_image_styles()


@app.post("/studio/generate", response_model=ImageGenerateResponse)
def studio_generate(payload: ImageGenerateRequest) -> ImageGenerateResponse:
    styles = {style["id"]: style for style in list_image_styles()}
    active_style = styles.get(payload.style_id)
    live_response = None
    if active_style is not None:
        live_response = request_live_image(
            prompt=payload.prompt,
            style_id=payload.style_id,
            style_name=active_style["name"],
            index=payload.index,
        )

    if live_response is not None:
        return ImageGenerateResponse.model_validate(
            {
                "title": live_response["title"],
                "prompt": live_response["prompt"],
                "styleId": live_response["style_id"],
                "tagline": live_response["tagline"],
                "gradient": live_response["gradient"] or active_style["gradient"],
            }
        )

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
    live_checkout = request_live_checkout(
        user_id=payload.user_id,
        plan_id=payload.plan_id,
        sku=payload.sku,
        category=payload.category,
        amount=payload.amount,
        currency=payload.currency,
    )

    try:
        result = create_checkout(
            user_id=payload.user_id,
            plan_id=payload.plan_id,
            sku=payload.sku,
            category=payload.category,
            amount=payload.amount,
            currency=payload.currency,
            status="paid" if live_checkout is None else live_checkout["status"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return CheckoutResponse.model_validate(
        {
            "purchaseId": result["purchase_id"],
            "subscriptionId": result["subscription_id"],
            "status": live_checkout["status"] if live_checkout is not None else result["status"],
            "planId": result["plan_id"],
            "renewalAt": result["renewal_at"],
            "checkoutUrl": None if live_checkout is None else live_checkout["checkout_url"],
            "provider": None if live_checkout is None else live_checkout["provider"],
        }
    )


@app.get("/ops/signals")
def ops_signals() -> list[dict]:
    return list_ops_signals()


@app.get("/bootstrap")
def bootstrap_payload(user_id: str | None = Query(default=None, alias="userId")) -> dict:
    return fetch_bootstrap_payload(user_id)
