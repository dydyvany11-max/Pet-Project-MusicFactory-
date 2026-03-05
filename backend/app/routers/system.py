from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

import database
from app.config import IMAGES_DIR
from app.deps import get_db
from app.schemas import ArtistOut

router = APIRouter()


@router.get('/')
def home():
    return {'status': 'online', 'service': 'MusicFactory API'}


@router.get('/health')
def health_check(db: Session = Depends(get_db)):
    db.execute(func.now().select())
    return {'status': 'ok'}


@router.get('/dashboard')
def dashboard(user_id: int | None = Query(None), db: Session = Depends(get_db)):
    artists = db.query(database.Artist).all()
    tracks = db.query(database.Track).all()

    playlist_query = (
        db.query(
            database.Playlist.id,
            database.Playlist.title,
            database.Playlist.user_id,
            database.Playlist.is_public,
            func.count(database.PlaylistTrack.track_id).label('tracks_count'),
        )
        .outerjoin(database.PlaylistTrack, database.Playlist.id == database.PlaylistTrack.playlist_id)
        .group_by(database.Playlist.id)
        .order_by(database.Playlist.id)
    )
    if user_id is not None:
        playlist_query = playlist_query.filter(database.Playlist.user_id == user_id)
    playlist_rows = playlist_query.all()

    tracks_by_artist: dict[int, list[dict]] = {}
    artist_names = {artist.id: artist.name for artist in artists}
    for track in tracks:
        tracks_by_artist.setdefault(track.artist_id, []).append(
            {
                'id': track.id,
                'title': track.title,
                'artist_id': track.artist_id,
                'artist_name': artist_names.get(track.artist_id, 'Unknown'),
                'file_path': track.file_path,
                'duration_seconds': track.duration_seconds,
                'genre': track.genre,
            }
        )

    playlists = [
        {
            'id': row.id,
            'title': row.title,
            'user_id': row.user_id,
            'is_public': row.is_public,
            'tracks_count': int(row.tracks_count or 0),
        }
        for row in playlist_rows
    ]

    return {
        'artists': [ArtistOut.model_validate(artist).model_dump() for artist in artists],
        'tracks_by_artist': tracks_by_artist,
        'playlists': playlists,
    }


@router.get('/image/{filename:path}')
def get_image(filename: str):
    requested = IMAGES_DIR / Path(filename).name
    if not requested.exists():
        raise HTTPException(status_code=404, detail='Image not found')

    suffix = requested.suffix.lower()
    media_type = 'image/jpeg'
    if suffix == '.png':
        media_type = 'image/png'
    elif suffix == '.webp':
        media_type = 'image/webp'
    return FileResponse(requested, media_type=media_type)
