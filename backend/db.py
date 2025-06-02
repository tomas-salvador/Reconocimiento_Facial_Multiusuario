# Conexión a PostgreSQL y helper de sesiones
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from config import get_settings

settings = get_settings()

engine = create_async_engine(settings.db_uri, echo=False, pool_pre_ping=True)
AsyncLocalSession = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()


async def init_db() -> None:
    # Crea las tablas si no existen
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with AsyncLocalSession() as session:
        yield session
