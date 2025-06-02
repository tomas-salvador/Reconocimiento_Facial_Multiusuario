# backend/Dockerfile

FROM python:3.11-slim

# Evitar buffering de logs
ENV PYTHONUNBUFFERED=1

# Instalamos CMake y build-essential para compilar dlib
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    pkg-config \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos únicamente requirements para aprovechar cache de Docker
COPY requirements.txt ./

# Instalamos deps Python (incluye dlib, face-recognition, etc.)
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código
COPY . .

# Arrancamos uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
