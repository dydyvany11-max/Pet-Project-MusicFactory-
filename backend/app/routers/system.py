from datetime import date, datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import and_, case, distinct, func
from sqlalchemy.orm import Session

import database
from app.config import IMAGES_DIR
from app.deps import get_db
from app.schemas import ArtistDailyMetricOut, ArtistMetricOut, ArtistOut, ServiceMetricsOut
from app.services import get_playlist_cover_image

router = APIRouter()


def _round_metric(value: float | int | None, digits: int = 1) -> float:
    if value is None:
        return 0.0
    return round(float(value), digits)


def _get_service_metrics(db: Session):
    start_7_days = date.today() - timedelta(days=6)

    total_users = db.query(func.count(database.User.id)).scalar() or 0
    new_users_last_7_days = (
        db.query(func.count(database.User.id))
        .filter(func.date(database.User.created_at) >= start_7_days)
        .scalar()
        or 0
    )
    avg_listen_seconds = (
        db.query(func.avg(database.TrackPlayEvent.listened_seconds))
        .filter(database.TrackPlayEvent.listened_seconds > 0)
        .scalar()
    )

    return {
        'total_users': int(total_users),
        'new_users_last_7_days': int(new_users_last_7_days),
        'avg_listen_seconds': _round_metric(avg_listen_seconds),
    }


def _get_artist_metrics(db: Session):
    start_7_days_dt = datetime.combine(date.today() - timedelta(days=6), datetime.min.time())

    base_rows = (
        db.query(
            database.Artist.id.label('artist_id'),
            database.Artist.name.label('artist_name'),
            func.count(distinct(database.Track.id)).label('tracks_count'),
            func.coalesce(func.sum(database.Track.play_count), 0).label('total_plays'),
        )
        .outerjoin(database.Track, database.Track.artist_id == database.Artist.id)
        .group_by(database.Artist.id, database.Artist.name)
        .all()
    )

    event_rows = (
        db.query(
            database.Track.artist_id.label('artist_id'),
            func.coalesce(
                func.avg(
                    case(
                        (database.TrackPlayEvent.listened_seconds > 0, database.TrackPlayEvent.listened_seconds),
                        else_=None,
                    )
                ),
                0,
            ).label('avg_listen_seconds'),
            func.count(distinct(database.TrackPlayEvent.user_id)).label('listeners_count'),
            func.count(
                distinct(
                    case(
                        (
                            and_(
                                database.TrackPlayEvent.user_id.isnot(None),
                                database.User.created_at >= start_7_days_dt,
                                database.TrackPlayEvent.played_at >= start_7_days_dt,
                            ),
                            database.TrackPlayEvent.user_id,
                        ),
                        else_=None,
                    )
                )
            ).label('new_users_last_7_days'),
        )
        .join(database.TrackPlayEvent, database.TrackPlayEvent.track_id == database.Track.id)
        .outerjoin(database.User, database.User.id == database.TrackPlayEvent.user_id)
        .group_by(database.Track.artist_id)
        .all()
    )

    event_by_artist = {
        int(row.artist_id): {
            'avg_listen_seconds': _round_metric(row.avg_listen_seconds),
            'listeners_count': int(row.listeners_count or 0),
            'new_users_last_7_days': int(row.new_users_last_7_days or 0),
        }
        for row in event_rows
    }

    metrics = []
    for row in base_rows:
        artist_id = int(row.artist_id)
        event_info = event_by_artist.get(artist_id, {})
        metrics.append(
            {
                'artist_id': artist_id,
                'artist_name': row.artist_name,
                'tracks_count': int(row.tracks_count or 0),
                'total_plays': int(row.total_plays or 0),
                'listeners_count': int(event_info.get('listeners_count', 0)),
                'new_users_last_7_days': int(event_info.get('new_users_last_7_days', 0)),
                'avg_listen_seconds': float(event_info.get('avg_listen_seconds', 0.0)),
            }
        )

    metrics.sort(key=lambda item: (-item['total_plays'], item['artist_id']))
    return metrics


def _get_artist_daily_metrics(db: Session, days: int):
    days = max(1, min(days, 90))
    start_day = date.today() - timedelta(days=days - 1)

    rows = (
        db.query(
            database.Artist.id.label('artist_id'),
            database.Artist.name.label('artist_name'),
            func.date(database.TrackPlayEvent.played_at).label('day'),
            func.count(database.TrackPlayEvent.id).label('plays'),
        )
        .join(database.Track, database.Track.artist_id == database.Artist.id)
        .join(database.TrackPlayEvent, database.TrackPlayEvent.track_id == database.Track.id)
        .filter(func.date(database.TrackPlayEvent.played_at) >= start_day)
        .group_by(
            database.Artist.id,
            database.Artist.name,
            func.date(database.TrackPlayEvent.played_at),
        )
        .order_by(func.date(database.TrackPlayEvent.played_at).asc(), database.Artist.id.asc())
        .all()
    )

    return [
        {
            'artist_id': int(row.artist_id),
            'artist_name': row.artist_name,
            'day': row.day.isoformat() if hasattr(row.day, 'isoformat') else str(row.day),
            'plays': int(row.plays or 0),
        }
        for row in rows
    ]


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
                'play_count': track.play_count or 0,
            }
        )

    playlists = [
        {
            'id': row.id,
            'title': row.title,
            'user_id': row.user_id,
            'is_public': row.is_public,
            'tracks_count': int(row.tracks_count or 0),
            'cover_image_path': get_playlist_cover_image(db, row.id),
        }
        for row in playlist_rows
    ]

    return {
        'artists': [ArtistOut.model_validate(artist).model_dump() for artist in artists],
        'tracks_by_artist': tracks_by_artist,
        'playlists': playlists,
        'service_metrics': _get_service_metrics(db),
        'artist_metrics': _get_artist_metrics(db),
        'artist_daily_metrics': _get_artist_daily_metrics(db, days=14),
    }


@router.get('/metrics/artists', response_model=list[ArtistMetricOut])
def get_artist_metrics(db: Session = Depends(get_db)):
    rows = _get_artist_metrics(db)
    return [ArtistMetricOut(**row) for row in rows]


@router.get('/metrics/service', response_model=ServiceMetricsOut)
def get_service_metrics(db: Session = Depends(get_db)):
    return ServiceMetricsOut(**_get_service_metrics(db))


@router.get('/metrics/artists/daily', response_model=list[ArtistDailyMetricOut])
def get_artist_daily_metrics(days: int = Query(14, ge=1, le=90), db: Session = Depends(get_db)):
    raw = _get_artist_daily_metrics(db, days=days)
    return [ArtistDailyMetricOut(**item) for item in raw]


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
