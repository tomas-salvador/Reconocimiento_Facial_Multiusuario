import numpy as np, face_recognition

# Devuelve un embedding con el modelo indicado (por ahora solo dlib)
def get_embedding(image_bytes: bytes, model: str = "dlib") -> np.ndarray:
    img = face_recognition.load_image_file(image_bytes)
    encs = face_recognition.face_encodings(img)
    if not encs:
        raise ValueError("No se detectó rostro")
    return np.asarray(encs[0], np.float32)

# Distancia coseno (1 - similitud)
def cosine_dist(a: np.ndarray, b: np.ndarray) -> float:
    return 1 - float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
