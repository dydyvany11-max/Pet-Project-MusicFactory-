from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import database
from app.config import ALLOWED_AUDIO_EXTENSIONS, TRACKS_DIR
from app.deps import get_db
from app.schemas import TrackListenIn, TrackOut, TrackPlayIn, TrackWithArtistOut
from app.services import ensure_artist_exists, remove_stored_file, save_upload

router = APIRouter(tags=['tracks'])


@router.get('/tracks', response_model=list[TrackWithArtistOut])
def get_tracks(
    artist_id: int | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = (
        db.query(database.Track, database.Artist.name.label('artist_name'))
        .join(database.Artist, database.Track.artist_id == database.Artist.id)
        .order_by(database.Track.id.desc())
    )

    if artist_id is not None:
        query = query.filter(database.Track.artist_id == artist_id)
    if search:
        pattern = f'%{search.strip()}%'
        query = query.filter(database.Track.title.ilike(pattern) | database.Artist.name.ilike(pattern))

    rows = query.limit(limit).all()
    return [
        TrackWithArtistOut(
            id=track.id,
            title=track.title,
            artist_id=track.artist_id,
            file_path=track.file_path,
            duration_seconds=track.duration_seconds,
            genre=track.genre,
            play_count=track.play_count or 0,
            artist_name=artist_name,
        )
        for track, artist_name in rows
    ]


@router.get('/tracks/{artist_id}', response_model=list[TrackOut])
def get_artist_tracks(artist_id: int, db: Session = Depends(get_db)):
    ensure_artist_exists(db, artist_id)
    return (
        db.query(database.Track)
        .filter(database.Track.artist_id == artist_id)
        .order_by(database.Track.id.desc())
        .all()
    )


@router.post('/tracks/upload', response_model=TrackOut)
def upload_track(
    title: str = Form(...),
    artist_id: int = Form(...),
    genre: str | None = Form(None),
    duration: int | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    artist = ensure_artist_exists(db, artist_id)
    audio_name = save_upload(file, TRACKS_DIR, ALLOWED_AUDIO_EXTENSIONS, f'{artist.name}_{title}')

    new_track = database.Track(
        title=title.strip(),
        artist_id=artist_id,
        genre=genre,
        duration_seconds=duration,
        file_path=f'/tracks/{audio_name}',
        play_count=0,
    )
    db.add(new_track)
    db.commit()
    db.refresh(new_track)
    return new_track


@router.post('/upload_track', response_model=TrackOut)
def upload_track_legacy(
    title: str = Form(...),
    artist_id: int = Form(...),
    genre: str | None = Form(None),
    duration: int | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return upload_track(title, artist_id, genre, duration, file, db)


@router.get('/play/{filename:path}')
def play_audio(filename: str):
    requested = TRACKS_DIR / Path(filename).name
    if not requested.exists():
        raise HTTPException(status_code=404, detail='Audio file not found')
    return FileResponse(requested, media_type='audio/mpeg')


@router.post('/tracks/{track_id}/play')
def register_track_play(track_id: int, payload: TrackPlayIn | None = None, db: Session = Depends(get_db)):
    track = db.query(database.Track).filter(database.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail='Track not found')

    user_id = payload.user_id if payload else None
    if user_id is not None:
        user_exists = db.query(database.User.id).filter(database.User.id == user_id).first()
        if not user_exists:
            raise HTTPException(status_code=404, detail='User not found')

    track.play_count = (track.play_count or 0) + 1
    db.add(database.TrackPlayEvent(track_id=track_id, user_id=user_id, listened_seconds=0))
    db.commit()
    return {'status': 'ok', 'track_id': track_id, 'play_count': track.play_count}


@router.post('/tracks/{track_id}/listen')
def register_track_listen(track_id: int, payload: TrackListenIn, db: Session = Depends(get_db)):
    track = db.query(database.Track).filter(database.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail='Track not found')

    if payload.user_id is not None:
        user_exists = db.query(database.User.id).filter(database.User.id == payload.user_id).first()
        if not user_exists:
            raise HTTPException(status_code=404, detail='User not found')

    db.add(
        database.TrackPlayEvent(
            track_id=track_id,
            user_id=payload.user_id,
            listened_seconds=payload.listened_seconds,
        )
    )
    db.commit()
    return {'status': 'ok', 'track_id': track_id, 'listened_seconds': payload.listened_seconds}


@router.put('/tracks/{track_id}', response_model=TrackOut)
def update_track(
    track_id: int,
    title: str | None = Form(None),
    artist_id: int | None = Form(None),
    genre: str | None = Form(None),
    duration: int | None = Form(None),
    db: Session = Depends(get_db),
):
    track = db.query(database.Track).filter(database.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail='Track not found')

    if title is not None:
        normalized_title = title.strip()
        if not normalized_title:
            raise HTTPException(status_code=400, detail='Track title must not be empty')
        track.title = normalized_title

    if artist_id is not None:
        ensure_artist_exists(db, artist_id)
        track.artist_id = artist_id

    if genre is not None:
        track.genre = genre.strip() or None

    if duration is not None:
        if duration < 0:
            raise HTTPException(status_code=400, detail='Duration must be non-negative')
        track.duration_seconds = duration

    db.commit()
    db.refresh(track)
    return track


@router.delete('/tracks/{track_id}')
def delete_track(track_id: int, db: Session = Depends(get_db)):
    track = db.query(database.Track).filter(database.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail='Track not found')

    (
        db.query(database.PlaylistTrack)
        .filter(database.PlaylistTrack.track_id == track_id)
        .delete(synchronize_session=False)
    )
    db.delete(track)
    db.commit()
    remove_stored_file(TRACKS_DIR, track.file_path)

    return {'status': 'ok'}
