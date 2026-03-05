# MusicFactory (Spotify-like pet project)

## What is implemented
- Frontend: React app with artists, tracks list, search, and player UI.
- Backend: FastAPI API for artists/tracks and static serving of audio/images.
- DB: PostgreSQL schema for users, artists, tracks, playlists.

## Quick start

### 1) Start PostgreSQL
From `backend/`:

```powershell
docker compose up -d
```

DB is expected at `localhost:5433` with:
- user: `user`
- password: `password`
- database: `spotify_db`

### 2) Start backend
From `backend/`:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Optional DB override:

```powershell
$env:DATABASE_URL="postgresql://user:password@localhost:5433/spotify_db"
```

### 3) Start frontend
From `frontend/`:

```powershell
npm install
$env:REACT_APP_API_URL="http://127.0.0.1:8000"
npm start
```

Open `http://localhost:3000`.

## Known next steps
- Add auth (register/login/JWT).
- Create real playlists in UI using backend tables.
- Add liked tracks and playback queue.
- Add upload forms in UI (artist image + track upload).
- Replace in-memory mock playlist data with API data.
- Add API validation and centralized error handling.
- Add E2E tests and CI workflow.
