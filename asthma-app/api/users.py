"""User profile routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.deps import get_current_user
from api.user_schemas import UserProfile, UserProfileUpdate
from db.database import get_db
from db.models import User

router = APIRouter(prefix="/users", tags=["users"])

_PROFILE_COLUMNS = (
    "name",
    "profile_image_url",
    "date_of_birth",
    "emergency_contact",
    "preferred_reminder",
    "contact_method",
    "preferred_environment",
    "care_goal",
    "accessibility_needs",
    "trigger_preferences",
    "trigger_sensitivities",
)


def _to_profile(user: User) -> UserProfile:
    return UserProfile(
        id=str(user.id),
        email=user.email,
        name=user.name,
        profile_image_url=user.profile_image_url,
        date_of_birth=user.date_of_birth,
        emergency_contact=user.emergency_contact,
        preferred_reminder=user.preferred_reminder,
        contact_method=user.contact_method,
        preferred_environment=user.preferred_environment,
        care_goal=user.care_goal,
        accessibility_needs=user.accessibility_needs,
        trigger_preferences=user.trigger_preferences or [],
        trigger_sensitivities=user.trigger_sensitivities or {},
    )


def apply_profile_fields(user: User, data: UserProfileUpdate | dict) -> None:
    """Apply non-null profile fields onto a User row."""
    if isinstance(data, UserProfileUpdate):
        payload = data.model_dump(exclude_unset=True)
    else:
        payload = {k: v for k, v in data.items() if v is not None}
    for key in _PROFILE_COLUMNS:
        if key in payload and payload[key] is not None:
            setattr(user, key, payload[key])


@router.get("/me", response_model=UserProfile)
def get_me(user: User = Depends(get_current_user)) -> UserProfile:
    return _to_profile(user)


@router.patch("/me", response_model=UserProfile)
def update_me(
    body: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    apply_profile_fields(user, body)
    db.commit()
    db.refresh(user)
    return _to_profile(user)
