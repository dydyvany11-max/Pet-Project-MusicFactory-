# -*- coding: utf-8 -*-
import os
from pathlib import Path
import hashlib
import re
import shutil
import time

from fastapi import HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

import database


def sanitize_filename(value: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9._-]+', '_', value or '')
    cleaned = cleaned.strip('._')
    return cleaned or f'file_{int(time.time())}'


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def is_admin_user(username: str, email: str) -> bool:
    admin_usernames = {
        item.strip().lower()
        for item in os.getenv('ADMIN_USERNAMES', 'admin').split(',')
        if item.strip()
    }
    admin_emails = {
        item.strip().lower()
        for item in os.getenv('ADMIN_EMAILS', '').split(',')
        if item.strip()
    }
    return username.strip().lower() in admin_usernames or email.strip().lower() in admin_emails


def save_upload(upload: UploadFile, target_dir: Path, allowed_extensions: set[str], stem_prefix: str) -> str:
    if not upload.filename:
        raise HTTPException(status_code=400, detail='File name is empty')

    suffix = Path(upload.filename).suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f'Unsupported file extension: {suffix}')

    safe_stem = sanitize_filename(stem_prefix)
    final_name = f'{safe_stem}_{int(time.time())}{suffix}'
    final_path = target_dir / final_name

    with final_path.open('wb') as buffer:
        shutil.copyfileobj(upload.file, buffer)

    return final_name


def ensure_artist_exists(db: Session, artist_id: int) -> database.Artist:
    artist = db.query(database.Artist).filter(database.Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail='Artist not found')
    return artist


def get_playlist_cover_image(db: Session, playlist_id: int) -> str | None:
    # Обложка — это изображение артиста, у которого больше всего треков в плейлисте.
    row = (
        db.query(
            database.Artist.image_path.label('image_path'),
            func.count(database.Track.id).label('tracks_count'),
        )
        .join(database.Track, database.Track.artist_id == database.Artist.id)
        .join(database.PlaylistTrack, database.PlaylistTrack.track_id == database.Track.id)
        .filter(database.PlaylistTrack.playlist_id == playlist_id)
        .group_by(database.Artist.id, database.Artist.image_path)
        .order_by(func.count(database.Track.id).desc(), database.Artist.id.asc())
        .first()
    )
    return row.image_path if row and row.image_path else None


def remove_stored_file(base_dir: Path, stored_path: str | None) -> None:
    if not stored_path:
        return
    target = base_dir / Path(stored_path).name
    if target.exists():
        target.unlink()
