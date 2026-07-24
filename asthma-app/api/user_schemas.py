"""Shared user profile schemas."""

from __future__ import annotations

from datetime import date as Date
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserProfileFields(BaseModel):
    name: Optional[str] = None
    profile_image_url: Optional[str] = Field(
        default=None,
        max_length=2048,
        description="HTTPS URL for the profile image (e.g. Cloudinary secure_url)",
    )
    date_of_birth: Optional[Date] = None
    emergency_contact: Optional[str] = None
    preferred_reminder: Optional[str] = None
    contact_method: Optional[str] = None
    preferred_environment: Optional[str] = None
    care_goal: Optional[str] = None
    accessibility_needs: Optional[str] = None
    trigger_preferences: List[str] = Field(default_factory=list)
    trigger_sensitivities: Dict[str, float] = Field(default_factory=dict)


class UserProfile(UserProfileFields):
    id: str
    email: EmailStr

    model_config = {"from_attributes": True}


class UserProfileUpdate(UserProfileFields):
    """All fields optional for PATCH."""

    name: Optional[str] = None
    profile_image_url: Optional[str] = Field(default=None, max_length=2048)
    date_of_birth: Optional[Date] = None
    emergency_contact: Optional[str] = None
    preferred_reminder: Optional[str] = None
    contact_method: Optional[str] = None
    preferred_environment: Optional[str] = None
    care_goal: Optional[str] = None
    accessibility_needs: Optional[str] = None
    trigger_preferences: Optional[List[str]] = None
    trigger_sensitivities: Optional[Dict[str, float]] = None
