from __future__ import annotations

import json
import secrets
from dataclasses import dataclass, field
from threading import Lock
from uuid import uuid4

from fastapi import WebSocket

from .db import list_party_scenarios, resolve_party_action, utc_now


@dataclass
class PartyParticipant:
    id: str
    name: str
    role: str
    user_id: str | None = None


@dataclass
class PartyLogEntry:
    id: str
    actor_name: str
    action: str
    summary: str
    created_at: str


@dataclass
class PartySession:
    id: str
    invite_code: str
    scenario_id: str
    scenario_title: str
    status: str = "live"
    participants: list[PartyParticipant] = field(default_factory=list)
    log: list[PartyLogEntry] = field(default_factory=list)


class PartySessionStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._sessions: dict[str, PartySession] = {}
        self._invite_index: dict[str, str] = {}
        self._connections: dict[str, set[WebSocket]] = {}

    def _scenario_payload(self, scenario_id: str) -> dict | None:
        return next(
            (scenario for scenario in list_party_scenarios() if scenario["id"] == scenario_id),
            None,
        )

    def _serialize_session(
        self,
        session: PartySession,
        participant_id: str | None = None,
    ) -> dict:
        return {
            "sessionId": session.id,
            "inviteCode": session.invite_code,
            "scenarioId": session.scenario_id,
            "scenarioTitle": session.scenario_title,
            "status": session.status,
            "participantId": participant_id,
            "participants": [
                {
                    "id": participant.id,
                    "name": participant.name,
                    "role": participant.role,
                }
                for participant in session.participants
            ],
            "log": [
                {
                    "id": entry.id,
                    "actorName": entry.actor_name,
                    "action": entry.action,
                    "summary": entry.summary,
                    "createdAt": entry.created_at,
                }
                for entry in session.log
            ],
        }

    def create_session(
        self,
        scenario_id: str,
        participant_name: str,
        user_id: str | None = None,
    ) -> dict | None:
        scenario = self._scenario_payload(scenario_id)
        if scenario is None:
            return None

        session_id = str(uuid4())
        invite_code = secrets.token_hex(3).upper()
        host_role = scenario["player_roles"][0]
        participant = PartyParticipant(
            id=str(uuid4()),
            name=participant_name,
            role=host_role,
            user_id=user_id,
        )
        session = PartySession(
            id=session_id,
            invite_code=invite_code,
            scenario_id=scenario_id,
            scenario_title=scenario["title"],
            participants=[participant],
        )

        with self._lock:
            self._sessions[session_id] = session
            self._invite_index[invite_code] = session_id

        return self._serialize_session(session, participant.id)

    def join_session(
        self,
        invite_code: str,
        participant_name: str,
        user_id: str | None = None,
    ) -> dict | None:
        with self._lock:
            session_id = self._invite_index.get(invite_code.upper())
            if session_id is None:
                return None

            session = self._sessions.get(session_id)
            if session is None:
                return None

            scenario = self._scenario_payload(session.scenario_id)
            if scenario is None:
                return None

            role_index = len(session.participants) % max(len(scenario["player_roles"]), 1)
            participant = PartyParticipant(
                id=str(uuid4()),
                name=participant_name,
                role=scenario["player_roles"][role_index],
                user_id=user_id,
            )
            session.participants.append(participant)

        return self._serialize_session(session, participant.id)

    def get_session(self, session_id: str) -> dict | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            return self._serialize_session(session)

    def add_action(
        self,
        session_id: str,
        participant_id: str,
        action: str,
    ) -> dict | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None

            participant = next(
                (entry for entry in session.participants if entry.id == participant_id),
                None,
            )
            if participant is None:
                return None

            resolution = resolve_party_action(session.scenario_id, action, len(session.log))
            summary = (
                resolution["summary"]
                if resolution is not None
                else f'{participant.name}님이 "{action}" 액션을 실행했습니다.'
            )
            session.log.append(
                PartyLogEntry(
                    id=str(uuid4()),
                    actor_name=participant.name,
                    action=action,
                    summary=summary,
                    created_at=utc_now(),
                )
            )

        return self._serialize_session(session, participant_id)

    async def connect(self, session_id: str, websocket: WebSocket) -> bool:
        await websocket.accept()

        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                await websocket.close(code=4404)
                return False

            sockets = self._connections.setdefault(session_id, set())
            sockets.add(websocket)
            payload = self._serialize_session(session)

        await websocket.send_text(json.dumps({"type": "snapshot", "session": payload}))
        return True

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        with self._lock:
            sockets = self._connections.get(session_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._connections.pop(session_id, None)

    async def broadcast_snapshot(self, session_id: str) -> None:
        with self._lock:
            session = self._sessions.get(session_id)
            sockets = list(self._connections.get(session_id, set()))
            if session is None or not sockets:
                return
            message = json.dumps(
                {"type": "session.updated", "session": self._serialize_session(session)}
            )

        stale_sockets: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_text(message)
            except Exception:
                stale_sockets.append(socket)

        if stale_sockets:
            with self._lock:
                live_sockets = self._connections.get(session_id)
                if live_sockets is None:
                    return
                for socket in stale_sockets:
                    live_sockets.discard(socket)
                if not live_sockets:
                    self._connections.pop(session_id, None)


party_sessions = PartySessionStore()
