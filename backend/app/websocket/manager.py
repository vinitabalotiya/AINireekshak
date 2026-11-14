"""WebSocket connection manager for real-time judging and admin monitoring."""

import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages active WebSockets segmented by session_id and role."""

    def __init__(self) -> None:
        # Maps session_id -> list of connected WebSockets
        self.session_connections: dict[str, list[WebSocket]] = {}
        # Maps session_id -> list of admin monitor WebSockets
        self.admin_monitors: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, client_type: str = "participant") -> None:
        """Accept connection and register under session."""
        await websocket.accept()
        sess_str = str(session_id)

        if client_type == "admin":
            if sess_str not in self.admin_monitors:
                self.admin_monitors[sess_str] = []
            self.admin_monitors[sess_str].append(websocket)
        else:
            if sess_str not in self.session_connections:
                self.session_connections[sess_str] = []
            self.session_connections[sess_str].append(websocket)

        logger.info("WebSocket connected: session=%s, client_type=%s", sess_str, client_type)

    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """Remove disconnected socket."""
        sess_str = str(session_id)
        if sess_str in self.session_connections and websocket in self.session_connections[sess_str]:
            self.session_connections[sess_str].remove(websocket)
            if not self.session_connections[sess_str]:
                del self.session_connections[sess_str]

        if sess_str in self.admin_monitors and websocket in self.admin_monitors[sess_str]:
            self.admin_monitors[sess_str].remove(websocket)
            if not self.admin_monitors[sess_str]:
                del self.admin_monitors[sess_str]

        logger.info("WebSocket disconnected from session=%s", sess_str)

    async def broadcast_to_session(self, session_id: str, message: dict[str, Any]) -> None:
        """Send message to all participants and admin monitors of a session."""
        sess_str = str(session_id)
        payload = json.dumps(message)

        # Send to participants
        targets = list(self.session_connections.get(sess_str, [])) + list(self.admin_monitors.get(sess_str, []))
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning("Failed to send message to socket in session %s: %s", sess_str, e)

    async def send_caption(self, session_id: str, caption_data: dict[str, Any]) -> None:
        """Broadcast live caption update."""
        message = {
            "type": "caption",
            "data": caption_data,
        }
        await self.broadcast_to_session(session_id, message)

    async def send_ai_message(self, session_id: str, ai_data: dict[str, Any]) -> None:
        """Broadcast AI question, avatar state, or judging response."""
        message = {
            "type": "ai_message",
            "data": ai_data,
        }
        await self.broadcast_to_session(session_id, message)
