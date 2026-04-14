from pydantic import BaseModel, ConfigDict, Field
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
    play_count: int = 0


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
    is_admin: bool = False


class ArtistMetricOut(BaseModel):
    artist_id: int
    artist_name: str
    tracks_count: int
    total_plays: int
    listeners_count: int = 0
    new_users_last_7_days: int = 0
    avg_listen_seconds: float = 0.0


class ServiceMetricsOut(BaseModel):
    total_users: int
    new_users_last_7_days: int
    avg_listen_seconds: float


class ArtistDailyMetricOut(BaseModel):
    artist_id: int
    artist_name: str
    day: str
    plays: int


class RegisterIn(BaseModel):
    username: str
    email: str
    password: str


class LoginIn(BaseModel):
    login: str
    password: str


class TrackPlayIn(BaseModel):
    user_id: Optional[int] = None


class TrackListenIn(BaseModel):
    user_id: Optional[int] = None
    listened_seconds: int = Field(ge=1, le=86400)
