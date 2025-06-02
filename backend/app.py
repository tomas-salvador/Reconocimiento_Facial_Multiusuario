from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles     import StaticFiles

from routes import auth, faces, persons
from db     import init_db

app = FastAPI(title="Reconocimiento Facial Abierto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# Routers
app.include_router(auth.router,  prefix="/auth", tags=["auth"])
app.include_router(faces.router)
app.include_router(persons.router)

# Archivos estáticos (fotos en /tmp)
app.mount("/static", StaticFiles(directory="/tmp"), name="static")

@app.get("/")
async def root():
    return {"msg": "API OK"}

@app.on_event("startup")
async def on_startup():
    await init_db()
