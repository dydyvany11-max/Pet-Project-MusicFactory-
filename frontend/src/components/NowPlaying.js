import React, { useCallback, useEffect, useRef, useState } from 'react';

function formatTime(rawSeconds) {
  const seconds = Number.isFinite(rawSeconds) ? rawSeconds : 0;
  const mins = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${mins}:${rest.toString().padStart(2, '0')}`;
}

function NowPlaying({
  track,
  getAudioUrl,
  getImageUrl,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onTrackPlay,
  onTrackListen,
}) {
  const audioRef = useRef(null);
  const onTrackListenRef = useRef(onTrackListen);
  const onTrackPlayRef = useRef(onTrackPlay);
  const trackRef = useRef(track || null);
  const volumeRef = useRef(0.35);
  const reportedSecondsRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.35);

  useEffect(() => {
    onTrackListenRef.current = onTrackListen;
  }, [onTrackListen]);

  useEffect(() => {
    onTrackPlayRef.current = onTrackPlay;
  }, [onTrackPlay]);

  useEffect(() => {
    trackRef.current = track || null;
  }, [track]);

  useEffect(() => {
    volumeRef.current = volume;
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  const flushListenChunk = useCallback(() => {
    if (!onTrackListenRef.current || !trackRef.current?.id) {
      return;
    }

    const audio = audioRef.current;
    const current = Math.floor(audio?.currentTime || 0);
    const delta = current - reportedSecondsRef.current;
    if (delta > 0) {
      onTrackListenRef.current(trackRef.current, delta);
      reportedSecondsRef.current = current;
    }
  }, []);

  useEffect(() => {
    flushListenChunk();

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    reportedSecondsRef.current = 0;
    audio.currentTime = 0;
    audio.volume = volumeRef.current;
    setCurrentTime(0);
    setIsPlaying(true);

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => setIsPlaying(false));
    }
  }, [track?.id, flushListenChunk]);

  useEffect(() => {
    if (!track?.id || !onTrackPlayRef.current || !trackRef.current) {
      return;
    }
    onTrackPlayRef.current(trackRef.current);
  }, [track?.id]);

  useEffect(
    () => () => {
      flushListenChunk();
    },
    [flushListenChunk]
  );

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      flushListenChunk();
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
          <button className="icon-btn play" type="button" onClick={togglePlay} title="Play / Stop">
            {isPlaying ? '■' : '▶'}
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
        <span className="volume-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M3 9v6h4l5 4V5L7 9H3z" />
            <path d="M14.5 8.5a1 1 0 0 1 1.4 0 5 5 0 0 1 0 7 1 1 0 1 1-1.4-1.4 3 3 0 0 0 0-4.2 1 1 0 0 1 0-1.4z" />
            <path d="M17.8 5.2a1 1 0 0 1 1.4 0 9 9 0 0 1 0 12.8 1 1 0 1 1-1.4-1.4 7 7 0 0 0 0-10 1 1 0 0 1 0-1.4z" />
          </svg>
        </span>
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
        onEnded={() => {
          flushListenChunk();
          onNext();
        }}
      />
    </section>
  );
}

export default NowPlaying;