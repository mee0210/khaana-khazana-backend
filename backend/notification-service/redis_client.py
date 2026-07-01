import os
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Singleton Redis client
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def check_and_set_deduplication(event_id: str, status: str) -> bool:
    """
    Returns True if the event was successfully set (meaning it is new).
    Returns False if the event already exists (meaning it's a duplicate).
    """
    key = f"notification:{event_id}:{status}"
    # SETNX equivalent, with expiry of 86400 seconds (24 hours)
    result = await redis_client.set(key, "1", ex=86400, nx=True)
    return result is not None
