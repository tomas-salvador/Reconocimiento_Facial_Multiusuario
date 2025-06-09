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

# Schemas
class LoginReq(BaseModel):
    email: EmailStr
    password: str


class RegisterReq(LoginReq):
    pass


# Usuarios
DEMO_ACCOUNTS = [
    ("admin@example.com", "admin"),
    ("demo@example.com",  "demo"),
    # Se pueden añadir más
]


async def ensure_demo(db: AsyncSession):
    for email, pwd in DEMO_ACCOUNTS:
        exists = await db.scalar(select(User).where(User.email == email))
        if not exists:
            db.add(User(email=email, hashed_password=crypt.hash(pwd)))
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
