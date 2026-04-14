from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Boolean, DateTime, inspect, text
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/spotify_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class Artist(Base):
    __tablename__ = "artists"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    bio = Column(Text, nullable=True)
    image_path = Column(String(255), nullable=True)

class Track(Base):
    __tablename__ = "tracks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    artist_id = Column(Integer, ForeignKey("artists.id", ondelete="CASCADE"))
    file_path = Column(String(255), nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    genre = Column(String(50), nullable=True)
    play_count = Column(Integer, nullable=False, default=0, server_default="0")

class Playlist(Base):
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    is_public = Column(Boolean, default=True)

class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"
    
    playlist_id = Column(Integer, ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True)

class TrackPlayEvent(Base):
    __tablename__ = "track_play_events"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    listened_seconds = Column(Integer, nullable=False, default=0, server_default="0")
    played_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_runtime_columns()


def _ensure_runtime_columns():
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    if 'tracks' in table_names:
        track_columns = {column['name'] for column in inspector.get_columns('tracks')}
        if 'play_count' not in track_columns:
            with engine.begin() as connection:
                connection.execute(
                    text('ALTER TABLE tracks ADD COLUMN play_count INTEGER NOT NULL DEFAULT 0')
                )

    if 'users' in table_names:
        user_columns = {column['name'] for column in inspector.get_columns('users')}
        if 'created_at' not in user_columns:
            with engine.begin() as connection:
                connection.execute(
                    text('ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
                )

    if 'track_play_events' in table_names:
        event_columns = {column['name'] for column in inspector.get_columns('track_play_events')}
        with engine.begin() as connection:
            if 'user_id' not in event_columns:
                connection.execute(
                    text('ALTER TABLE track_play_events ADD COLUMN user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL')
                )
            if 'listened_seconds' not in event_columns:
                connection.execute(
                    text('ALTER TABLE track_play_events ADD COLUMN listened_seconds INTEGER NOT NULL DEFAULT 0')
                )
