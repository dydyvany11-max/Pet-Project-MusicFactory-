from pathlib import Path
import hashlib
import re
import shutil
import time

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

import database


def sanitize_filename(value: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9._-]+', '_', value or '')
    cleaned = cleaned.strip('._')
    return cleaned or f'file_{int(time.time())}'


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


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
