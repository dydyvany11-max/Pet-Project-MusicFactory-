import React, { useEffect, useRef, useState } from 'react';

function formatTime(rawSeconds) {
  const seconds = Number.isFinite(rawSeconds) ? rawSeconds : 0;
  const mins = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${mins}:${rest.toString().padStart(2, '0')}`;
}

function NowPlaying({ track, getAudioUrl, getImageUrl, onNext, onPrevious, hasNext, hasPrevious }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.35);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    audio.volume = volume;
    setCurrentTime(0);

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
    }
  }, [track]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const onSeek = (event) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const onVolumeChange = (event) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const value = Number(event.target.value);
    audio.volume = value;
    setVolume(value);
  };

  return (
    <section className="player">
      <div className="player-track">
        <img
          className="player-cover"
          src={getImageUrl(track.artistImagePath)}
          alt={track.artistName || track.title}
        />
        <div>
          <h4>{track.title}</h4>
          <p>{track.artistName}</p>
        </div>
      </div>

      <div className="player-controls">
        <div className="player-buttons">
          <button className="icon-btn" type="button" onClick={onPrevious} disabled={!hasPrevious}>
            {'<'}
          </button>
          <button className="icon-btn play" type="button" onClick={togglePlay} title="Track">
            {isPlaying ? '♪' : '♫'}
          </button>
          <button className="icon-btn" type="button" onClick={onNext} disabled={!hasNext}>
            {'>'}
          </button>
        </div>

        <input
          className="range"
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          step="1"
          onChange={onSeek}
        />

        <div className="player-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-volume">
        <span className="muted">Volume</span>
        <input
          className="range-volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={onVolumeChange}
        />
      </div>

      <audio
        ref={audioRef}
        src={getAudioUrl(track.file_path)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={onNext}
      />
    </section>
  );
}

export default NowPlaying;
