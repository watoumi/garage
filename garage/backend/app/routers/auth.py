from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.models import GarageProfile, User, UserRole
from app.schemas import LoginRequest, RegisterRequest, Token
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute;20/hour")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a garage account and its profile in one step (pending admin approval)."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.garage,
    )
    user.garage = GarageProfile(
        name=payload.name,
        phone=payload.phone,
        city=payload.city,
        address=payload.address,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_approved=settings.auto_approve_garages,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    return Token(access_token=token, role=user.role)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute;50/hour")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token = create_access_token(subject=user.id, role=user.role.value)
    return Token(access_token=token, role=user.role)
