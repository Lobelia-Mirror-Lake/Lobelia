"""Send risk scores to Claude and return plain-English advice."""

import os
from pathlib import Path

from anthropic import AsyncAnthropic
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

SYSTEM_PROMPT = (
    "You are an asthma care assistant. You receive structured risk "
    "assessment data and explain it to the patient in 2-3 sentences. "
    "Be warm, clear, and actionable. Never say 'consult a doctor' "
    "as the only advice."
)

MODEL = "claude-3-5-haiku-latest"


def _build_user_message(risk_dict: dict) -> str:
    inputs = risk_dict.get("inputs", {})
    lines = [
        f"Risk level: {risk_dict.get('risk_level')}",
        f"Triggered rules: {', '.join(risk_dict.get('triggered_rules', []))}",
        f"Nighttime symptoms: {inputs.get('night_symp')}",
        f"AQI: {inputs.get('aqi')}",
        f"Pollen: {inputs.get('pollen')}",
    ]

    pef_am = inputs.get("pef_am")
    pef_personal_best = inputs.get("pef_personal_best", 0)
    if pef_personal_best and pef_personal_best > 0:
        pef_ratio = pef_am / pef_personal_best
        lines.append(f"PEF ratio (morning reading / personal best): {pef_ratio:.0%}")

    return "\n".join(lines)


async def interpret_risk(risk_dict: dict) -> str:
    """Translate risk engine output into personalized plain-English advice."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set")

    client = AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=MODEL,
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_user_message(risk_dict)}],
    )

    return message.content[0].text
