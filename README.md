# Open Facial Recognition Platform

A self‑hosted, **open‑source** web application that lets individuals and organisations keep full control over their biometric data.  
Built with **FastAPI**, **React 18**, **PostgreSQL** and the Python **face_recognition** library.


## Features

* Multi‑user management — each account has its own isolated face database.
* Register faces from file or live webcam, embeddings generated on‑the‑fly.
* Real‑time identification with cosine distance and configurable threshold.
* Import/Export in **FROST 1.0** ZIP format (images + metadata) for full portability.
* Docker Compose stack: Frontend (Nginx + static build), Backend (FastAPI), DB (PostgreSQL 15).
* Demo accounts pre‑seeded:  
  * `admin@example.com` / `admin`  
  * `demo@example.com`  /  `demo`
* JWT auth, bcrypt password hashing.
* Automatic logout & redirect when token expires.
* REST API documented with the built‑in `/docs` (Swagger UI).


## Prerequisites

* Docker 20.10+ and Docker Compose v2
* At least 2 GB RAM (CPU only).  
  Optional: Nvidia GPU + CUDA for faster inference.


## Quick Start

```bash
git clone https://github.com/your‑org/open‑facial‑rec.git
cd open‑facial‑rec
cp .env.sample .env                     # edit DB password & secret key if desired
docker compose up -d --build            # first build
```

Visit:

* **Frontend** – <http://localhost:3000>  
* **API**      – <http://localhost:8000/docs>

Log in with one of the demo accounts or create a new user from the UI.


## Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | `postgres` | DB superuser password |
| `POSTGRES_USER` | `postgres` | DB superuser |
| `POSTGRES_DB` | `faces` | Main database |
| `SECRET_KEY` | `changeme‑please` | JWT signing key |
| `VITE_API_URL` | `http://localhost:8000` | URL that the SPA calls |


## File Structure

```
backend/
  ├── Dockerfile
  ├── requirements.txt
  ├── app.py
  ├── config.py
  ├── db.py
  ├── models.py
  ├── security.py
  ├── utils.py
  ├── routes/
  │   ├── auth.py
  │   ├── faces.py
  │   └── persons.py
frontend/
  ├── src/
  │   ├── components/
  │   │   ├── CameraCapture.jsx
  │   │   └── CropModal.jsx
  │   ├── pages/
  │   │   ├── Dashboard.jsx
  │   │   ├── Gallery.jsx
  │   │   ├── Identify.jsx
  │   │   ├── Login.jsx
  │   │   └── PersonWizard.jsx
  │   ├── utils/
  │   │   └── crop.js
  │   ├── api.js
  │   ├── App.jsx
  │   └── main.jsx
  ├── Dockerfile
  ├── index.html
  ├── package.json
  └── vite.config.js
.env
docker-compose.yml
README.md
```


## Main API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login`    | Obtain JWT |
| GET  | `/persons/`      | List persons (current user) |
| POST | `/persons/`      | Create person |
| GET  | `/persons/export-zip` | Export whole DB (FROST 1.0) |
| POST | `/persons/import-zip` | Import FROST ZIP |
| POST | `/faces/identify`     | Identify a face |

Full interactive docs at `/docs`.


## Upgrading

```bash
git pull
docker-compose pull
docker-compose up -d --build
```

Database migrations are automatic. Embeddings are regenerated on import to stay forward‑compatible with new models.


## License

[MIT](LICENSE)

*Face data remain **yours** — host it on‑prem or on your private cloud.*
