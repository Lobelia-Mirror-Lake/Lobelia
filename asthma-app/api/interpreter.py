"""Send risk scores to Claude and return plain-English advice."""

import os

from dotenv import load_dotenv

load_dotenv()


def interpret_risk(risk_score: float, context: dict | None = None) -> str:
    """Translate a model risk score into personalized plain-English advice."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set")
    raise NotImplementedError
