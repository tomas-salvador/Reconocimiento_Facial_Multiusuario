from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from db import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from config import get_settings

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def current_user(token: str = Depends(oauth2_scheme),
                       db: AsyncSession = Depends(get_session)) -> User:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user = await db.get(User, int(payload["sub"]))
    except Exception:
        user = None
    if not user:
        raise HTTPException(401, "Credenciales inválidas")
    return user
