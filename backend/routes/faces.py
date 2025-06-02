from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from tempfile import NamedTemporaryFile
import io, base64, numpy as np, face_recognition
from PIL import Image
from models   import Face, Embedding, Person
from db       import get_session
from security import current_user, User
from utils    import cosine_dist

router = APIRouter(prefix="/faces", tags=["faces"])

# Detect
@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    data = await file.read()
    img  = face_recognition.load_image_file(io.BytesIO(data))
    boxes = face_recognition.face_locations(img)
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, format="JPEG", quality=92)
    img_b64 = base64.b64encode(buf.getvalue()).decode()
    return {"image": img_b64, "boxes": boxes}

# Bulk upload
@router.post("/bulk")
async def bulk_upload(
    person_id: int               = Form(...),
    files:      list[UploadFile] = File(...),
    user:       User             = Depends(current_user),
    db:         AsyncSession     = Depends(get_session),
):
    person = await db.get(Person, person_id)
    if not person or person.user_id != user.id:
        raise HTTPException(404, "Persona no encontrada")

    saved = []
    for upl in files:
        data = await upl.read()
        tmp = NamedTemporaryFile(delete=False, suffix=".jpg")
        tmp.write(data); tmp.close()

        img  = face_recognition.load_image_file(tmp.name)
        encs = face_recognition.face_encodings(img)
        if not encs:
            continue

        face_row = Face(person_id=person.id, image_path=tmp.name)
        db.add(face_row); await db.flush()
        db.add(Embedding(
            face_id = face_row.id,
            vector  = np.asarray(encs[0], np.float32).tobytes(),
            model   = "dlib", version="1.0"))
        saved.append(face_row.id)

    await db.commit()
    if not saved:
        raise HTTPException(422, "Ninguna imagen contenía rostro")
    return {"faces_saved": saved}

# Identify
@router.post("/identify")
async def identify(
    model: str        = Form("dlib"),
    file:  UploadFile = File(...),
    user:  User       = Depends(current_user),
    db:    AsyncSession = Depends(get_session),
):
    data = await file.read()
    img  = face_recognition.load_image_file(io.BytesIO(data))
    encs = face_recognition.face_encodings(img)
    if not encs:
        raise HTTPException(422, "No se detectó rostro")
    query = encs[0]

    rows = await db.execute(
        select(Embedding, Person)
        .join(Embedding.face).join(Face.person)
        .where(Person.user_id == user.id, Embedding.model == model)
    )

    best_name, best_dist = None, 10.0
    for emb, person in rows:
        dist = cosine_dist(query, np.frombuffer(emb.vector, np.float32))
        if dist < best_dist:
            best_name, best_dist = person.name, dist

    if best_name is None or best_dist > 0.40:
        return {"match": None}
    return {"match": best_name, "distance": round(float(best_dist), 4)}

# Delete face
@router.delete("/{face_id}")
async def delete_face(face_id: int,
                      user: User = Depends(current_user),
                      db:   AsyncSession = Depends(get_session)):
    face = await db.get(Face, face_id)
    if not face:
        raise HTTPException(404, "No existe")
    person = await db.get(Person, face.person_id)
    if person.user_id != user.id:
        raise HTTPException(403, "Prohibido")
    await db.execute(delete(Embedding).where(Embedding.face_id == face_id))
    await db.delete(face); await db.commit()
    return {"deleted": face_id}
