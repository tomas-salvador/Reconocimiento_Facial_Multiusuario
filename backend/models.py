from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from db import Base

# Usuarios
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    persons = relationship("Person", back_populates="user", cascade="all,delete")

# Personas asociadas a un usuario
class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    user = relationship("User", back_populates="persons")
    faces = relationship("Face", back_populates="person", cascade="all,delete")

# Imágenes de caras vinculadas a personas
class Face(Base):
    __tablename__ = "faces"
    id = Column(Integer, primary_key=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"))
    image_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    person = relationship("Person", back_populates="faces")
    embeddings = relationship("Embedding", back_populates="face", cascade="all,delete")

# Vectores de embeddings generados para cada cara
class Embedding(Base):
    __tablename__ = "embeddings"
    id = Column(Integer, primary_key=True)
    face_id = Column(Integer, ForeignKey("faces.id", ondelete="CASCADE"))
    vector = Column(LargeBinary, nullable=False)
    model = Column(String, default="dlib")
    version = Column(String, default="1.0")
    face = relationship("Face", back_populates="embeddings")
