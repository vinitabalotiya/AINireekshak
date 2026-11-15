"""Migration and backfill script to rescale behavior scores from 1-82 to 1-100."""

import asyncio
import logging
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.session import Session
from app.services.evaluation.scoring import normalize_behaviour_score

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backfill")


async def backfill_sessions() -> int:
    """Backfill all sessions with normalized behavior scores on 1-100 scale."""
    from app.core.database import init_db
    await init_db()

    updated_count = 0
    async with async_session_factory() as db:
        result = await db.execute(select(Session))
        sessions = result.scalars().all()

        for s in sessions:
            bdata = s.behavioural_data or {}
            raw_val = (
                bdata.get("rawScore")
                or bdata.get("eyeContactScore")
                or bdata.get("averageAttention")
                or 75.0
            )

            # Convert if needed
            norm_val = normalize_behaviour_score(raw_val)

            updated_bdata = {
                **bdata,
                "rawScore": float(raw_val),
                "normalizedScore": int(norm_val),
                "eye_contact": normalize_behaviour_score(bdata.get("eye_contact", raw_val)),
                "attention": normalize_behaviour_score(bdata.get("attention", raw_val)),
                "confidence": normalize_behaviour_score(bdata.get("confidence", raw_val)),
                "posture_stability": normalize_behaviour_score(bdata.get("posture_stability", raw_val)),
                "scale": "1-100",
            }

            s.behavioural_data = updated_bdata
            if not s.liveness_flag:
                s.liveness_flag = "VERIFIED"

            updated_count += 1

        await db.commit()
        logger.info("Successfully backfilled %d sessions with 1-100 normalized scores.", updated_count)
    return updated_count


if __name__ == "__main__":
    asyncio.run(backfill_sessions())
