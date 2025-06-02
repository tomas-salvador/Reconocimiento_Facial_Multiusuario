import io, os, zipfile, json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models   import Person, Face
from db       import get_session
from security import current_user, User

router = APIRouter(prefix="/persons", tags=["persons"])

class PersonCreate(BaseModel):
    name: str

class ExportMeta(BaseModel):
    persons: List[dict]  # cada dict: { name: str, images: List[str] }

# Crear persona
@router.post("/")
async def create_person(
    data: PersonCreate = Body(...),
    user: User         = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    person = Person(name=data.name, user_id=user.id)
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

# Exportar ZIP
@router.get("/export-zip")
async def export_zip(
    user: User         = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    buf = io.BytesIO()
    meta = {"persons": []}

    # Traer todas las personas
    result = await db.execute(select(Person).where(Person.user_id == user.id))
    persons = [p for p, in result]

    with zipfile.ZipFile(buf, "w") as z:
        for person in persons:
            pmeta = {"name": person.name, "images": []}
            faces = await db.execute(select(Face).where(Face.person_id == person.id))
            for f, in faces:
                img_path = f.image_path
                if os.path.isfile(img_path):
                    arc = f"{person.name}/{os.path.basename(img_path)}"
                    z.write(img_path, arcname=arc)
                    pmeta["images"].append(arc)
            meta["persons"].append(pmeta)

        # ensure_ascii=False para que las tildes sean reales
        z.writestr(
            "export.json",
            json.dumps(meta, ensure_ascii=False)
        )

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=persons_export.zip"},
    )

# Importar ZIP
@router.post("/import-zip")
async def import_zip(
    file: UploadFile = File(...),
    user: User       = Depends(current_user),
    db:   AsyncSession = Depends(get_session),
):
    content = await file.read()
    buf = io.BytesIO(content)
    with zipfile.ZipFile(buf) as z:
        meta = json.loads(z.read("export.json"))
        imported = []
        for p in meta["persons"]:
            # Crear persona
            person = Person(name=p["name"], user_id=user.id)
            db.add(person)
            await db.flush()  # Para tener person.id
            # Guardar cada imagen
            for arc in p["images"]:
                data = z.read(arc)
                save_dir = "/tmp"
                os.makedirs(save_dir, exist_ok=True)
                dest = os.path.join(save_dir, os.path.basename(arc))
                with open(dest, "wb") as f_out:
                    f_out.write(data)
                face = Face(person_id=person.id, image_path=dest)
                db.add(face)
            imported.append(p["name"])
        await db.commit()

    return {"imported": imported}

# Rostros de persona
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
        dict(
            id=f.id,
            name=f.image_path.split("/")[-1],
            created=f.created_at.isoformat(),
        )
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
