from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

import database
from app.config import ALLOWED_IMAGE_EXTENSIONS, IMAGES_DIR, TRACKS_DIR
from app.deps import get_db
from app.schemas import ArtistOut
from app.services import ensure_artist_exists, remove_stored_file, save_upload

router = APIRouter(prefix='/artists', tags=['artists'])


@router.get('', response_model=list[ArtistOut])
def get_artists(db: Session = Depends(get_db)):
    return db.query(database.Artist).order_by(database.Artist.id).all()


@router.get('/{artist_id}', response_model=ArtistOut)
def get_artist(artist_id: int, db: Session = Depends(get_db)):
    return ensure_artist_exists(db, artist_id)


@router.post('', response_model=ArtistOut)
def create_artist(
    name: str = Form(...),
    bio: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    image_path = None
    if image and image.filename:
        image_name = save_upload(image, IMAGES_DIR, ALLOWED_IMAGE_EXTENSIONS, name)
        image_path = f'/images/{image_name}'

    artist = database.Artist(name=name.strip(), bio=bio, image_path=image_path)
    db.add(artist)
    db.commit()
    db.refresh(artist)
    return artist


@router.put('/{artist_id}/image')
def update_artist_image(
    artist_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    artist = ensure_artist_exists(db, artist_id)

    if artist.image_path:
        old_image = IMAGES_DIR / Path(artist.image_path).name
        if old_image.exists():
            old_image.unlink()

    image_name = save_upload(image, IMAGES_DIR, ALLOWED_IMAGE_EXTENSIONS, artist.name)
    artist.image_path = f'/images/{image_name}'
    db.commit()

    return {'status': 'success', 'image_path': artist.image_path}


@router.delete('/{artist_id}')
def delete_artist(artist_id: int, db: Session = Depends(get_db)):
    artist = ensure_artist_exists(db, artist_id)

    tracks = db.query(database.Track).filter(database.Track.artist_id == artist_id).all()
    track_ids = [track.id for track in tracks]

    if track_ids:
        (
            db.query(database.PlaylistTrack)
            .filter(database.PlaylistTrack.track_id.in_(track_ids))
            .delete(synchronize_session=False)
        )

    for track in tracks:
        db.delete(track)
        remove_stored_file(TRACKS_DIR, track.file_path)

    remove_stored_file(IMAGES_DIR, artist.image_path)
    db.delete(artist)
    db.commit()

    return {'status': 'ok', 'deleted_tracks': len(track_ids)}
