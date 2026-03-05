import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import database
from app.config import IMAGES_DIR, TRACKS_DIR
from app.routers import auth, artists, playlists, system, tracks


TRACKS_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)
database.init_db()

app = FastAPI(title='MusicFactory API', version='1.2.0')

raw_cors_origins = os.getenv('CORS_ORIGINS', '*')
allow_origins = [origin.strip() for origin in raw_cors_origins.split(',')] if raw_cors_origins else ['*']

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(system.router)
app.include_router(auth.router)
app.include_router(artists.router)
app.include_router(tracks.router)
app.include_router(playlists.router)

app.mount('/tracks', StaticFiles(directory=TRACKS_DIR), name='tracks')
app.mount('/images', StaticFiles(directory=IMAGES_DIR), name='images')
