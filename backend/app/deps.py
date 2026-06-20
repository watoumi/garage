from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GarageProfile, User, UserRole
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise _CREDENTIALS_EXC
    except JWTError:
        raise _CREDENTIALS_EXC from None

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC
    return user


def get_current_garage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GarageProfile:
    if user.role != UserRole.garage:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Garage account required")
    garage = user.garage
    if garage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No garage profile found")
    if garage.is_disabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Garage account is disabled")
    return garage


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
