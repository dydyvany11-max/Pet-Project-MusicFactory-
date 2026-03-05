from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

import database
from app.deps import get_db
from app.schemas import CreatePlaylistIn, PlaylistOut

router = APIRouter(prefix='/playlists', tags=['playlists'])


@router.get('', response_model=list[PlaylistOut])
def get_playlists(user_id: int | None = Query(None), db: Session = Depends(get_db)):
    query = (
        db.query(
            database.Playlist.id,
            database.Playlist.title,
            database.Playlist.user_id,
            database.Playlist.is_public,
            func.count(database.PlaylistTrack.track_id).label('tracks_count'),
        )
        .outerjoin(database.PlaylistTrack, database.Playlist.id == database.PlaylistTrack.playlist_id)
        .group_by(database.Playlist.id)
        .order_by(database.Playlist.id.desc())
    )
    if user_id is not None:
        query = query.filter(database.Playlist.user_id == user_id)

    rows = query.all()
    return [
        PlaylistOut(
            id=row.id,
            title=row.title,
            user_id=row.user_id,
            is_public=row.is_public,
            tracks_count=int(row.tracks_count or 0),
        )
        for row in rows
    ]


@router.post('', response_model=PlaylistOut)
def create_playlist(payload: CreatePlaylistIn, db: Session = Depends(get_db)):
    playlist = database.Playlist(
        title=payload.title.strip(),
        user_id=payload.user_id,
        is_public=payload.is_public,
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return PlaylistOut(
        id=playlist.id,
        title=playlist.title,
        user_id=playlist.user_id,
        is_public=playlist.is_public,
        tracks_count=0,
    )


@router.get('/{playlist_id}')
def get_playlist_details(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.query(database.Playlist).filter(database.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail='Playlist not found')

    track_rows = (
        db.query(database.Track, database.Artist.name.label('artist_name'))
        .join(database.PlaylistTrack, database.PlaylistTrack.track_id == database.Track.id)
        .join(database.Artist, database.Artist.id == database.Track.artist_id)
        .filter(database.PlaylistTrack.playlist_id == playlist_id)
        .order_by(database.Track.id.desc())
        .all()
    )

    tracks = [
        {
            'id': track.id,
            'title': track.title,
            'artist_id': track.artist_id,
            'artist_name': artist_name,
            'file_path': track.file_path,
            'duration_seconds': track.duration_seconds,
            'genre': track.genre,
        }
        for track, artist_name in track_rows
    ]

    return {
        'id': playlist.id,
        'title': playlist.title,
        'user_id': playlist.user_id,
        'is_public': playlist.is_public,
        'tracks_count': len(tracks),
        'tracks': tracks,
    }


@router.post('/{playlist_id}/tracks/{track_id}')
def add_track_to_playlist(playlist_id: int, track_id: int, db: Session = Depends(get_db)):
    playlist = db.query(database.Playlist).filter(database.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail='Playlist not found')

    track = db.query(database.Track).filter(database.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail='Track not found')

    existing = (
        db.query(database.PlaylistTrack)
        .filter(
            database.PlaylistTrack.playlist_id == playlist_id,
            database.PlaylistTrack.track_id == track_id,
        )
        .first()
    )
    if existing:
        return {'status': 'ok', 'message': 'Track already in playlist'}

    link = database.PlaylistTrack(playlist_id=playlist_id, track_id=track_id)
    db.add(link)
    db.commit()
    return {'status': 'ok'}


@router.delete('/{playlist_id}/tracks/{track_id}')
def remove_track_from_playlist(playlist_id: int, track_id: int, db: Session = Depends(get_db)):
    link = (
        db.query(database.PlaylistTrack)
        .filter(
            database.PlaylistTrack.playlist_id == playlist_id,
            database.PlaylistTrack.track_id == track_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail='Track not found in playlist')

    db.delete(link)
    db.commit()
    return {'status': 'ok'}
