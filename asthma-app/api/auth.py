"""Authentication routes — register, login, refresh."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.errors import api_error
from api.user_schemas import UserProfileFields
from api.users import apply_profile_fields
from db.database import get_db
from db.models import User
from services.auth_service import create_access_token, hash_password, safe_decode_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(UserProfileFields):
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    access_token: Optional[str] = None


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.scalar(select(User).where(User.email == body.email.lower()))
    if existing:
        raise api_error(409, "Email already registered", "EMAIL_EXISTS")

    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
    )
    apply_profile_fields(user, body.model_dump(exclude={"email", "password"}))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise api_error(401, "Invalid email or password", "INVALID_CREDENTIALS")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/refresh")
def refresh(
    body: Optional[RefreshRequest] = None,
    db: Session = Depends(get_db),
) -> TokenResponse:
    token = body.access_token if body else None
    if not token:
        raise api_error(401, "Token required for refresh", "UNAUTHORIZED")

    payload = safe_decode_token(token)
    if not payload or "sub" not in payload:
        raise api_error(401, "Invalid or expired token", "UNAUTHORIZED")

    user = db.get(User, uuid.UUID(payload["sub"]))
    if not user:
        raise api_error(404, "User not found", "USER_NOT_FOUND")
    return TokenResponse(access_token=create_access_token(str(user.id)))
