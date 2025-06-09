import io, os, zipfile, json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models   import Person, Face, Embedding
from db       import get_session
from security import current_user, User
from utils    import get_embedding
import numpy as np

router = APIRouter(prefix="/persons", tags=["persons"])


# Esquemas Pydantic
class PersonCreate(BaseModel):
    name: str


class ExportMeta(BaseModel):
    persons: List[dict]  # { name: str, images: List[str] }


# Utilidad: Buscar el siguiente nombre libre (Paula, Paula1, Paula2...)
async def next_free_name(db: AsyncSession, user_id: int, base: str) -> str:
    idx, name = 0, base
    while True:
        row = await db.execute(
            select(Person).where(Person.user_id == user_id, Person.name == name)
        )
        if not row.scalars().first():
            return name
        idx += 1
        name = f"{base}{idx}"


# Crear persona vía API
@router.post("/")
async def create_person(
    data: PersonCreate = Body(...),
    user: User         = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    free = await next_free_name(db, user.id, data.name)
    person = Person(name=free, user_id=user.id)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return {"id": person.id, "name": person.name}


# Listar personas
@router.get("/")
async def list_persons(
    user: User         = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    rows = await db.execute(select(Person).where(Person.user_id == user.id))
    return [dict(id=p.id, name=p.name) for p, in rows]


# Exportar base en formato FROST 1.0
@router.get("/export-zip")
async def export_zip(
    user: User         = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    buf  = io.BytesIO()
    meta = {"persons": []}

    result = await db.execute(select(Person).where(Person.user_id == user.id))
    persons = [p for p, in result]

    with zipfile.ZipFile(buf, "w") as z:
        for person in persons:
            pmeta = {"name": person.name, "images": []}
            faces = await db.execute(select(Face).where(Face.person_id == person.id))
            for f, in faces:
                if os.path.isfile(f.image_path):
                    arc = f"{person.name}/{os.path.basename(f.image_path)}"
                    z.write(f.image_path, arcname=arc)
                    pmeta["images"].append(arc)
            meta["persons"].append(pmeta)

        z.writestr("export.json", json.dumps(meta, ensure_ascii=False))

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=persons_export.zip"},
    )


# Importar ZIP y generar embeddings
@router.post("/import-zip")
async def import_zip(
    file: UploadFile = File(...),
    user: User       = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    content = await file.read()
    buf = io.BytesIO(content)

    with zipfile.ZipFile(buf) as z:
        meta      = json.loads(z.read("export.json"))
        imported  = []

        for p in meta["persons"]:
            # Nombre único por usuario
            free_name = await next_free_name(db, user.id, p["name"])

            person = Person(name=free_name, user_id=user.id)
            db.add(person)
            await db.flush()

            for arc in p["images"]:
                data = z.read(arc)

                # Guardar imagen en /tmp
                os.makedirs("/tmp", exist_ok=True)
                dest = os.path.join("/tmp", os.path.basename(arc))
                with open(dest, "wb") as f_out:
                    f_out.write(data)

                # Crear registro Face
                face = Face(person_id=person.id, image_path=dest)
                db.add(face)
                await db.flush()

                # 3) Generar embedding
                try:
                    vec = get_embedding(io.BytesIO(data))
                    db.add(
                        Embedding(
                            face_id=face.id,
                            vector=vec.tobytes(),
                            model="dlib",
                            version="1.0",
                        )
                    )
                except ValueError:
                    # Imagen sin rostro válido
                    pass

            imported.append(free_name)

        await db.commit()

    return {"imported": imported}


# Listar rostros de una persona
@router.get("/{person_id}/faces")
async def list_faces(
    person_id: int,
    user: User         = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    person = await db.get(Person, person_id)
    if not person or person.user_id != user.id:
        raise HTTPException(404, "Persona no encontrada")

    rows = await db.execute(select(Face).where(Face.person_id == person_id))
    return [
        dict(id=f.id,
             name=os.path.basename(f.image_path),
             created=f.created_at.isoformat())
        for f, in rows
    ]


# Eliminar persona
@router.delete("/{person_id}")
async def delete_person(
    person_id: int,
    user: User         = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    person = await db.get(Person, person_id)
    if not person or person.user_id != user.id:
        raise HTTPException(404, "Persona no encontrada")
    await db.delete(person)
    await db.commit()
    return {"deleted": person_id}
