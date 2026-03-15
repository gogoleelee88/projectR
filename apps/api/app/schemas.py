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


class UserProfileResponse(BaseModel):
    id: str
    email: str | None = None
    name: str
    role: str
    membership: str
    sparks: int
    focus: str
    handle: str
    bio: str
    location: str
    avatar_gradient: str = Field(alias="avatarGradient")
    favorite_genres: list[str] = Field(alias="favoriteGenres")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class UserProfileUpdateRequest(BaseModel):
    name: str
    focus: str
    handle: str
    bio: str
    location: str
    avatar_gradient: str = Field(alias="avatarGradient")
    favorite_genres: list[str] = Field(alias="favoriteGenres")


class SavedItemCreateRequest(BaseModel):
    item_kind: str = Field(alias="itemKind")
    item_id: str = Field(alias="itemId")


class SavedItemResponse(BaseModel):
    id: str
    user_id: str = Field(alias="userId")
    item_kind: str = Field(alias="itemKind")
    item_id: str = Field(alias="itemId")
    title: str
    summary: str
    href: str
    meta: str
    chips: list[str]
    created_at: str = Field(alias="createdAt")


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


class StoryProgressLogEntryPayload(BaseModel):
    episode_id: str = Field(alias="episodeId")
    episode_title: str = Field(alias="episodeTitle")
    choice_id: str = Field(alias="choiceId")
    choice_label: str = Field(alias="choiceLabel")
    result_title: str = Field(alias="resultTitle")
    result_detail: str = Field(alias="resultDetail")
    impact_tags: list[str] = Field(alias="impactTags")
    trust_score: int = Field(alias="trustScore")
    hype_score: int = Field(alias="hypeScore")
    created_at: str = Field(alias="createdAt")


class StoryRunCompletionPayload(BaseModel):
    run_id: str = Field(alias="runId")
    ending_id: str = Field(alias="endingId")
    ending_title: str = Field(alias="endingTitle")
    ending_class: str = Field(alias="endingClass")
    reward: str
    trust_score: int = Field(alias="trustScore")
    hype_score: int = Field(alias="hypeScore")
    visited_count: int = Field(alias="visitedCount")
    choice_count: int = Field(alias="choiceCount")
    duration_minutes: int = Field(alias="durationMinutes")
    highlight_tags: list[str] = Field(alias="highlightTags")
    created_at: str = Field(alias="createdAt")


class StoryProgressSyncRequest(BaseModel):
    work_id: str = Field(alias="workId")
    current_episode_id: str = Field(alias="currentEpisodeId")
    trust_score: int = Field(alias="trustScore")
    hype_score: int = Field(alias="hypeScore")
    visited_episode_ids: list[str] = Field(alias="visitedEpisodeIds")
    ending_id: str | None = Field(default=None, alias="endingId")
    log: list[StoryProgressLogEntryPayload]
    started_at: str = Field(alias="startedAt")
    updated_at: str = Field(alias="updatedAt")
    completion: StoryRunCompletionPayload | None = None


class StoryProgressStateResponse(BaseModel):
    current_episode_id: str = Field(alias="currentEpisodeId")
    trust_score: int = Field(alias="trustScore")
    hype_score: int = Field(alias="hypeScore")
    visited_episode_ids: list[str] = Field(alias="visitedEpisodeIds")
    ending_id: str | None = Field(default=None, alias="endingId")
    log: list[StoryProgressLogEntryPayload]
    started_at: str = Field(alias="startedAt")
    updated_at: str = Field(alias="updatedAt")


class StoryRunSummaryResponse(BaseModel):
    id: str
    work_id: str = Field(alias="workId")
    ending_id: str = Field(alias="endingId")
    ending_title: str = Field(alias="endingTitle")
    ending_class: str = Field(alias="endingClass")
    reward: str
    trust_score: int = Field(alias="trustScore")
    hype_score: int = Field(alias="hypeScore")
    visited_count: int = Field(alias="visitedCount")
    choice_count: int = Field(alias="choiceCount")
    duration_minutes: int = Field(alias="durationMinutes")
    created_at: str = Field(alias="createdAt")
    highlight_tags: list[str] = Field(alias="highlightTags")


class StoryEndingRewardResponse(BaseModel):
    id: str
    work_id: str = Field(alias="workId")
    ending_id: str = Field(alias="endingId")
    ending_title: str = Field(alias="endingTitle")
    ending_class: str = Field(alias="endingClass")
    reward: str
    clear_count: int = Field(alias="clearCount")
    sparks_awarded_total: int = Field(alias="sparksAwardedTotal")
    first_cleared_at: str = Field(alias="firstClearedAt")
    last_cleared_at: str = Field(alias="lastClearedAt")


class StoryRewardGrantResponse(BaseModel):
    awarded: bool
    sparks_awarded: int = Field(alias="sparksAwarded")
    reward: str
    tier: str
    clear_count: int = Field(alias="clearCount")
    granted_at: str = Field(alias="grantedAt")


class StoryProgressSyncResponse(BaseModel):
    work_id: str = Field(alias="workId")
    progress: StoryProgressStateResponse | None = None
    run_history: list[StoryRunSummaryResponse] = Field(alias="runHistory")
    ending_rewards: list[StoryEndingRewardResponse] = Field(alias="endingRewards")
    total_sparks: int = Field(alias="totalSparks")
    latest_reward_grant: StoryRewardGrantResponse | None = Field(
        default=None,
        alias="latestRewardGrant",
    )
    synced_at: str = Field(alias="syncedAt")


class ChatRequest(BaseModel):
    character_id: str = Field(alias="characterId")
    message: str
    turn_index: int = Field(alias="turnIndex")


class ChatResponse(BaseModel):
    character_id: str = Field(alias="characterId")
    character_name: str = Field(alias="characterName")
    reply: str
    tone: str


class CharacterChatMessageResponse(BaseModel):
    id: str
    sender: str
    text: str
    tone: str
    created_at: str = Field(alias="createdAt")


class CharacterRewardUnlockResponse(BaseModel):
    id: str
    reward_id: str = Field(alias="rewardId")
    title: str
    summary: str
    affinity_threshold: int = Field(alias="affinityThreshold")
    sparks_awarded: int = Field(alias="sparksAwarded")
    unlocked_at: str = Field(alias="unlockedAt")


class CharacterNextRewardResponse(BaseModel):
    reward_id: str = Field(alias="rewardId")
    title: str
    summary: str
    affinity_threshold: int = Field(alias="affinityThreshold")
    remaining_affinity: int = Field(alias="remainingAffinity")
    sparks_awarded: int = Field(alias="sparksAwarded")


class CharacterRewardGrantResponse(BaseModel):
    awarded: bool
    reward_id: str = Field(alias="rewardId")
    title: str
    summary: str
    sparks_awarded: int = Field(alias="sparksAwarded")
    affinity_threshold: int = Field(alias="affinityThreshold")
    granted_at: str = Field(alias="grantedAt")


class CharacterChatStateResponse(BaseModel):
    character_id: str = Field(alias="characterId")
    character_name: str = Field(alias="characterName")
    role: str
    vibe: str
    opener: str
    affinity_score: int = Field(alias="affinityScore")
    bond_level: str = Field(alias="bondLevel")
    conversation_count: int = Field(alias="conversationCount")
    streak_count: int = Field(alias="streakCount")
    last_tone: str = Field(alias="lastTone")
    last_message_at: str = Field(alias="lastMessageAt")
    messages: list[CharacterChatMessageResponse]
    unlocked_rewards: list[CharacterRewardUnlockResponse] = Field(alias="unlockedRewards")
    next_reward: CharacterNextRewardResponse | None = Field(default=None, alias="nextReward")
    total_sparks: int = Field(alias="totalSparks")
    latest_reward_grant: CharacterRewardGrantResponse | None = Field(
        default=None,
        alias="latestRewardGrant",
    )
    synced_at: str = Field(alias="syncedAt")


class CharacterChatSendRequest(BaseModel):
    character_id: str = Field(alias="characterId")
    message: str


class CharacterChatSendResponse(BaseModel):
    character_id: str = Field(alias="characterId")
    character_name: str = Field(alias="characterName")
    reply: str
    tone: str
    affinity_delta: int = Field(alias="affinityDelta")
    state: CharacterChatStateResponse
    latest_reward_grant: CharacterRewardGrantResponse | None = Field(
        default=None,
        alias="latestRewardGrant",
    )


class PartyResolveRequest(BaseModel):
    scenario_id: str = Field(alias="scenarioId")
    action: str
    turn_index: int = Field(alias="turnIndex")


class PartyResolveResponse(BaseModel):
    scenario_id: str = Field(alias="scenarioId")
    summary: str


class PartySessionCreateRequest(BaseModel):
    scenario_id: str = Field(alias="scenarioId")
    participant_name: str = Field(alias="participantName")
    user_id: str | None = Field(default=None, alias="userId")


class PartySessionJoinRequest(BaseModel):
    invite_code: str = Field(alias="inviteCode")
    participant_name: str = Field(alias="participantName")
    user_id: str | None = Field(default=None, alias="userId")


class PartySessionActionRequest(BaseModel):
    participant_id: str = Field(alias="participantId")
    action: str


class PartyParticipantResponse(BaseModel):
    id: str
    name: str
    role: str


class PartyLogEntryResponse(BaseModel):
    id: str
    actor_name: str = Field(alias="actorName")
    action: str
    summary: str
    created_at: str = Field(alias="createdAt")


class PartySessionResponse(BaseModel):
    session_id: str = Field(alias="sessionId")
    invite_code: str = Field(alias="inviteCode")
    scenario_id: str = Field(alias="scenarioId")
    scenario_title: str = Field(alias="scenarioTitle")
    status: str
    participant_id: str | None = Field(default=None, alias="participantId")
    participants: list[PartyParticipantResponse]
    log: list[PartyLogEntryResponse]


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
    checkout_url: str | None = Field(default=None, alias="checkoutUrl")
    provider: str | None = None


class EconomyUnlockResponse(BaseModel):
    item_id: str = Field(alias="itemId")
    category: str
    title: str
    summary: str
    quantity: int


class EconomyOfferResponse(BaseModel):
    id: str
    offer_type: str = Field(alias="offerType")
    category: str
    name: str
    headline: str
    summary: str
    price: int
    currency: str
    badge: str
    recurring: bool
    grant_sparks: int = Field(alias="grantSparks")
    bonus_sparks: int = Field(alias="bonusSparks")
    highlight: str
    tags: list[str]
    plan_id: str | None = Field(default=None, alias="planId")
    included_unlocks: list[EconomyUnlockResponse] = Field(alias="includedUnlocks")


class EconomyRedemptionResponse(BaseModel):
    id: str
    category: str
    title: str
    summary: str
    sparks_cost: int = Field(alias="sparksCost")
    badge: str
    repeatable: bool
    tags: list[str]
    grant: EconomyUnlockResponse


class WalletLedgerEntryResponse(BaseModel):
    id: str
    currency: str
    amount_delta: int = Field(alias="amountDelta")
    balance_after: int = Field(alias="balanceAfter")
    source_kind: str = Field(alias="sourceKind")
    source_id: str = Field(alias="sourceId")
    title: str
    summary: str
    created_at: str = Field(alias="createdAt")


class EconomyInventoryItemResponse(BaseModel):
    id: str
    item_id: str = Field(alias="itemId")
    source_kind: str = Field(alias="sourceKind")
    source_id: str = Field(alias="sourceId")
    category: str
    title: str
    summary: str
    quantity: int
    metadata: dict[str, object]
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class EconomyCatalogResponse(BaseModel):
    offers: list[EconomyOfferResponse]
    redemptions: list[EconomyRedemptionResponse]


class EconomyStateResponse(BaseModel):
    wallet_balance: int = Field(alias="walletBalance")
    membership: str
    offers: list[EconomyOfferResponse]
    redemptions: list[EconomyRedemptionResponse]
    inventory: list[EconomyInventoryItemResponse]
    ledger: list[WalletLedgerEntryResponse]
    active_subscription: SubscriptionResponse | None = Field(
        default=None,
        alias="activeSubscription",
    )
    synced_at: str = Field(alias="syncedAt")


class EconomyCheckoutResponse(BaseModel):
    purchase_id: str = Field(alias="purchaseId")
    subscription_id: str | None = Field(default=None, alias="subscriptionId")
    offer: EconomyOfferResponse
    status: str
    wallet_balance: int = Field(alias="walletBalance")
    latest_entry: WalletLedgerEntryResponse | None = Field(
        default=None,
        alias="latestEntry",
    )
    granted_unlocks: list[EconomyInventoryItemResponse] = Field(alias="grantedUnlocks")
    active_subscription: SubscriptionResponse | None = Field(
        default=None,
        alias="activeSubscription",
    )
    checkout_url: str | None = Field(default=None, alias="checkoutUrl")
    provider: str | None = None
    synced_at: str = Field(alias="syncedAt")


class EconomyRedeemResponse(BaseModel):
    redemption: EconomyRedemptionResponse
    wallet_balance: int = Field(alias="walletBalance")
    latest_entry: WalletLedgerEntryResponse = Field(alias="latestEntry")
    granted_item: EconomyInventoryItemResponse = Field(alias="grantedItem")
    synced_at: str = Field(alias="syncedAt")
