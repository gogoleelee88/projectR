from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str


class SessionRequest(BaseModel):
    preset_id: str = Field(alias="presetId")


class SessionResponse(BaseModel):
    id: str
    email: str | None = None
    name: str
    role: str
    membership: str
    sparks: int
    focus: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "player"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthSessionResponse(BaseModel):
    token: str
    expires_at: str = Field(alias="expiresAt")
    user: SessionResponse


class StoryAdvanceRequest(BaseModel):
    episode_id: str = Field(alias="episodeId")
    choice_id: str = Field(alias="choiceId")
    trust_score: int = Field(alias="trustScore")
    hype_score: int = Field(alias="hypeScore")


class StoryAdvanceResponse(BaseModel):
    title: str
    detail: str
    trust_score: int = Field(alias="trustScore")
    hype_score: int = Field(alias="hypeScore")
    next_episode_id: str = Field(alias="nextEpisodeId")


class ChatRequest(BaseModel):
    character_id: str = Field(alias="characterId")
    message: str
    turn_index: int = Field(alias="turnIndex")


class ChatResponse(BaseModel):
    character_id: str = Field(alias="characterId")
    character_name: str = Field(alias="characterName")
    reply: str
    tone: str


class PartyResolveRequest(BaseModel):
    scenario_id: str = Field(alias="scenarioId")
    action: str
    turn_index: int = Field(alias="turnIndex")


class PartyResolveResponse(BaseModel):
    scenario_id: str = Field(alias="scenarioId")
    summary: str


class ImageGenerateRequest(BaseModel):
    prompt: str
    style_id: str = Field(alias="styleId")
    index: int = 0


class ImageGenerateResponse(BaseModel):
    title: str
    prompt: str
    style_id: str = Field(alias="styleId")
    tagline: str
    gradient: str


class ReleaseCreateRequest(BaseModel):
    title: str
    module: str
    pitch: str
    price: int


class ReleaseResponse(BaseModel):
    id: str
    title: str
    module: str
    pitch: str
    price: int
    projection: str
    status: str
    created_at: str = Field(alias="createdAt")


class BillingPlanResponse(BaseModel):
    id: str
    name: str
    price: int
    billing_interval: str = Field(alias="billingInterval")
    perks: list[str]


class SubscriptionResponse(BaseModel):
    id: str
    user_id: str = Field(alias="userId")
    plan_id: str = Field(alias="planId")
    plan_name: str = Field(alias="planName")
    price: int
    status: str
    renewal_at: str = Field(alias="renewalAt")
    created_at: str = Field(alias="createdAt")


class CheckoutRequest(BaseModel):
    user_id: str = Field(alias="userId")
    plan_id: str = Field(alias="planId")
    sku: str
    category: str = "subscription"
    amount: int
    currency: str = "KRW"


class CheckoutResponse(BaseModel):
    purchase_id: str = Field(alias="purchaseId")
    subscription_id: str = Field(alias="subscriptionId")
    status: str
    plan_id: str = Field(alias="planId")
    renewal_at: str = Field(alias="renewalAt")
