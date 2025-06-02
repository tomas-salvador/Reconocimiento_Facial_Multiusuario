from sqlalchemy import select
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from models import User
from db import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from config import get_settings

router = APIRouter()
crypt = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

# JSON schemas
class LoginReq(BaseModel):
    email: EmailStr
    password: str

class RegisterReq(LoginReq):
    pass

# User demo se inserta si no existe
async def ensure_demo(db: AsyncSession):
    if not await db.scalar(select(User).where(User.email == "admin@example.com")):
        db.add(User(email="admin@example.com",
                    hashed_password=crypt.hash("admin")))
        await db.commit()

# Endpoints
@router.post("/register")
async def register(body: RegisterReq, db: AsyncSession = Depends(get_session)):
    if await db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "Email ya registrado")
    user = User(email=body.email, hashed_password=crypt.hash(body.password))
    db.add(user)
    await db.commit()
    return {"msg": "Usuario creado"}

@router.post("/login")
async def login(body: LoginReq, db: AsyncSession = Depends(get_session)):
    await ensure_demo(db)
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not crypt.verify(body.password, user.hashed_password):
        raise HTTPException(401, "Credenciales inválidas")
    token = jwt.encode(
        {"sub": str(user.id), "exp": datetime.utcnow() + timedelta(hours=12)},
        settings.secret_key,
        algorithm="HS256",
    )
    return {"access_token": token, "token_type": "bearer"}
