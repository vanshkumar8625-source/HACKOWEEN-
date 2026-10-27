import socketio
import logging

logger = logging.getLogger(__name__)

# Socket.IO ASGI server with open CORS for the command center
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    logger.info(f"Command Center client connected: {sid}")
    await sio.emit("connection_status", {"status": "connected", "sid": sid}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Command Center client disconnected: {sid}")

@sio.event
async def join_incident_room(sid, data):
    room = f"incident_{data.get('incident_id')}"
    sio.enter_room(sid, room)
    await sio.emit("room_joined", {"room": room}, to=sid)

async def broadcast_event(event_name: str, payload: dict):
    """
    Broadcasts real-time events to all connected clients.
    """
    try:
        await sio.emit(event_name, payload)
    except Exception as e:
        logger.error(f"Error broadcasting {event_name}: {e}")
