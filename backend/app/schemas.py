from pydantic import BaseModel, ConfigDict
from typing import Optional


class ArtistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    bio: Optional[str] = None
    image_path: Optional[str] = None


class TrackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    artist_id: int
    file_path: str
    duration_seconds: Optional[int] = None
    genre: Optional[str] = None


class TrackWithArtistOut(TrackOut):
    artist_name: Optional[str] = None


class PlaylistOut(BaseModel):
    id: int
    title: str
    user_id: Optional[int] = None
    is_public: bool
    tracks_count: int
    cover_image_path: Optional[str] = None


class CreatePlaylistIn(BaseModel):
    title: str
    user_id: Optional[int] = None
    is_public: bool = True


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str


class RegisterIn(BaseModel):
    username: str
    email: str
    password: str


class LoginIn(BaseModel):
    login: str
    password: str
