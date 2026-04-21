import React, { useEffect, useMemo, useRef, useState } from 'react';

function lastDaysIso(days) {
  const result = [];
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - index);
    result.push(d.toISOString().slice(0, 10));
  }

  return result;
}

function shortDay(day) {
  if (!day || day.length < 10) {
    return day;
  }
  return `${day.slice(5, 7)}.${day.slice(8, 10)}`;
}

function formatDurationShort(secondsRaw) {
  const seconds = Math.max(0, Math.round(Number(secondsRaw) || 0));
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (mins <= 0) {
    return `${rest}s`;
  }
  return `${mins}m ${rest.toString().padStart(2, '0')}s`;
}

function PrettySelect({ value, placeholder, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const activeOption = options.find((item) => String(item.value) === String(value));
  const triggerLabel = activeOption?.label || placeholder;

  return (
    <div className="pretty-select" ref={rootRef}>
      <button
        className={`pretty-select-trigger ${open ? 'open' : ''}`}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{triggerLabel}</span>
        <span className="pretty-select-caret" aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="pretty-select-menu">
          {options.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                key={option.value || '__empty'}
                type="button"
                className={`pretty-select-option ${active ? 'active' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AdminPanel({
  artists,
  tracksByArtist,
  serviceMetrics,
  artistMetrics,
  artistDailyMetrics,
  getImageUrl,
  onCreateArtist,
  onUploadTrack,
  onUpdateArtist,
  onUpdateTrack,
  onDeleteArtist,
  onDeleteTrack,
}) {
  const [artistForm, setArtistForm] = useState({
    name: '',
    bio: '',
    image: null,
  });
  const [trackForm, setTrackForm] = useState({
    title: '',
    artistId: '',
    genre: '',
    duration: '',
    file: null,
  });
  const [submittingArtist, setSubmittingArtist] = useState(false);
  const [submittingTrack, setSubmittingTrack] = useState(false);
  const [submittingArtistUpdate, setSubmittingArtistUpdate] = useState(false);
  const [submittingTrackUpdate, setSubmittingTrackUpdate] = useState(false);
  const [deleteArtistFilter, setDeleteArtistFilter] = useState('');
  const [metricsArtistId, setMetricsArtistId] = useState('');
  const [editArtistId, setEditArtistId] = useState('');
  const [editTrackId, setEditTrackId] = useState('');
  const [artistEditForm, setArtistEditForm] = useState({
    name: '',
    bio: '',
    image: null,
  });
  const [trackEditForm, setTrackEditForm] = useState({
    title: '',
    artistId: '',
    genre: '',
    duration: '',
  });

  const artistById = useMemo(() => {
    const map = {};
    artists.forEach((artist) => {
      map[artist.id] = artist;
    });
    return map;
  }, [artists]);

  const trackArtistOptions = useMemo(
    () => [
      { value: '', label: 'Select artist' },
      ...artists.map((artist) => ({ value: artist.id, label: artist.name })),
    ],
    [artists]
  );

  const filterArtistOptions = useMemo(
    () => [
      { value: '', label: 'All artists' },
      ...artists.map((artist) => ({ value: artist.id, label: artist.name })),
    ],
    [artists]
  );

  const metricArtistOptions = useMemo(
    () => [
      { value: '', label: 'All artists (daily)' },
      ...artists.map((artist) => ({ value: artist.id, label: artist.name })),
    ],
    [artists]
  );

  const allTracks = useMemo(() => {
    const result = [];
    Object.keys(tracksByArtist || {}).forEach((artistIdKey) => {
      const artistTracks = tracksByArtist[artistIdKey] || [];
      const artistId = Number(artistIdKey);
      const artist = artistById[artistId];

      artistTracks.forEach((track) => {
        result.push({
          ...track,
          artistName: track.artist_name || artist?.name || 'Unknown',
          artistImagePath: artist?.image_path || null,
        });
      });
    });

    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [tracksByArtist, artistById]);

  const editArtistOptions = useMemo(
    () => [
      { value: '', label: 'Select artist to edit' },
      ...artists.map((artist) => ({ value: artist.id, label: artist.name })),
    ],
    [artists]
  );

  const editTrackOptions = useMemo(
    () => [
      { value: '', label: 'Select track to edit' },
      ...allTracks.map((track) => ({
        value: track.id,
        label: `${track.title} - ${track.artistName}`,
      })),
    ],
    [allTracks]
  );

  const filteredTracks = useMemo(() => {
    if (!deleteArtistFilter) {
      return allTracks;
    }
    return allTracks.filter((track) => String(track.artist_id) === String(deleteArtistFilter));
  }, [allTracks, deleteArtistFilter]);

  const visibleMetrics = useMemo(() => {
    if (!metricsArtistId) {
      return artistMetrics || [];
    }
    return (artistMetrics || []).filter((item) => String(item.artist_id) === String(metricsArtistId));
  }, [artistMetrics, metricsArtistId]);

  const dailyChart = useMemo(() => {
    const days = lastDaysIso(14);
    const sums = {};
    days.forEach((day) => {
      sums[day] = 0;
    });

    (artistDailyMetrics || []).forEach((row) => {
      if (metricsArtistId && String(row.artist_id) !== String(metricsArtistId)) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(sums, row.day)) {
        sums[row.day] += Number(row.plays || 0);
      }
    });

    const points = days.map((day) => ({ day, plays: sums[day] || 0 }));
    const max = Math.max(1, ...points.map((item) => item.plays));
    return { points, max };
  }, [artistDailyMetrics, metricsArtistId]);

  const submitArtist = async (event) => {
    event.preventDefault();
    if (!artistForm.name.trim()) {
      return;
    }

    setSubmittingArtist(true);
    try {
      await onCreateArtist({
        name: artistForm.name.trim(),
        bio: artistForm.bio.trim(),
        image: artistForm.image,
      });
      setArtistForm({ name: '', bio: '', image: null });
    } finally {
      setSubmittingArtist(false);
    }
  };

  const submitTrack = async (event) => {
    event.preventDefault();
    if (!trackForm.title.trim() || !trackForm.artistId || !trackForm.file) {
      return;
    }

    setSubmittingTrack(true);
    try {
      await onUploadTrack({
        title: trackForm.title.trim(),
        artistId: Number(trackForm.artistId),
        genre: trackForm.genre.trim(),
        duration: trackForm.duration,
        file: trackForm.file,
      });
      setTrackForm({
        title: '',
        artistId: '',
        genre: '',
        duration: '',
        file: null,
      });
    } finally {
      setSubmittingTrack(false);
    }
  };

  useEffect(() => {
    if (!editArtistId) {
      setArtistEditForm({ name: '', bio: '', image: null });
      return;
    }

    const artist = artists.find((item) => String(item.id) === String(editArtistId));
    if (!artist) {
      return;
    }

    setArtistEditForm({
      name: artist.name || '',
      bio: artist.bio || '',
      image: null,
    });
  }, [editArtistId, artists]);

  useEffect(() => {
    if (!editTrackId) {
      setTrackEditForm({ title: '', artistId: '', genre: '', duration: '' });
      return;
    }

    const track = allTracks.find((item) => String(item.id) === String(editTrackId));
    if (!track) {
      return;
    }

    setTrackEditForm({
      title: track.title || '',
      artistId: track.artist_id || '',
      genre: track.genre || '',
      duration: track.duration_seconds || '',
    });
  }, [editTrackId, allTracks]);

  const submitArtistUpdate = async (event) => {
    event.preventDefault();
    if (!editArtistId || !artistEditForm.name.trim()) {
      return;
    }

    setSubmittingArtistUpdate(true);
    try {
      await onUpdateArtist(Number(editArtistId), {
        name: artistEditForm.name.trim(),
        bio: artistEditForm.bio.trim(),
        image: artistEditForm.image,
      });
      setArtistEditForm((prev) => ({ ...prev, image: null }));
    } finally {
      setSubmittingArtistUpdate(false);
    }
  };

  const submitTrackUpdate = async (event) => {
    event.preventDefault();
    if (!editTrackId || !trackEditForm.title.trim()) {
      return;
    }

    setSubmittingTrackUpdate(true);
    try {
      await onUpdateTrack(Number(editTrackId), {
        title: trackEditForm.title.trim(),
        artistId: trackEditForm.artistId,
        genre: trackEditForm.genre.trim(),
        duration: trackEditForm.duration,
      });
    } finally {
      setSubmittingTrackUpdate(false);
    }
  };

  return (
    <section className="section">
      <h3>Admin Panel</h3>

      <div className="card-grid admin-forms">
        <form className="artist-card admin-card" onSubmit={submitArtist}>
          <h4 className="playlist-name">Add Artist</h4>
          <div className="track-stack">
            <input
              className="search-input"
              placeholder="Artist name"
              value={artistForm.name}
              onChange={(event) => setArtistForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="search-input"
              placeholder="Bio (optional)"
              value={artistForm.bio}
              onChange={(event) => setArtistForm((prev) => ({ ...prev, bio: event.target.value }))}
            />
            <label className="file-input-btn" htmlFor="artist-image-input">
              <span className="admin-mini-icon">IMG</span>
              <span>{artistForm.image ? `File: ${artistForm.image.name}` : 'Choose artist image'}</span>
            </label>
            <input
              id="artist-image-input"
              className="file-input-hidden"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(event) => setArtistForm((prev) => ({ ...prev, image: event.target.files?.[0] || null }))}
            />
            <button className="action-btn" type="submit" disabled={submittingArtist}>
              {submittingArtist ? 'Saving...' : 'Create artist'}
            </button>
          </div>
        </form>

        <form className="artist-card admin-card" onSubmit={submitArtistUpdate}>
          <h4 className="playlist-name">Edit Artist</h4>
          <div className="track-stack">
            <PrettySelect
              value={editArtistId}
              placeholder="Select artist to edit"
              options={editArtistOptions}
              onChange={(value) => setEditArtistId(value)}
            />

            <input
              className="search-input"
              placeholder="Artist name"
              value={artistEditForm.name}
              onChange={(event) => setArtistEditForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="search-input"
              placeholder="Bio (optional)"
              value={artistEditForm.bio}
              onChange={(event) => setArtistEditForm((prev) => ({ ...prev, bio: event.target.value }))}
            />
            <label className="file-input-btn" htmlFor="artist-edit-image-input">
              <span className="admin-mini-icon">IMG</span>
              <span>{artistEditForm.image ? `File: ${artistEditForm.image.name}` : 'Change artist image (optional)'}</span>
            </label>
            <input
              id="artist-edit-image-input"
              className="file-input-hidden"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(event) => setArtistEditForm((prev) => ({ ...prev, image: event.target.files?.[0] || null }))}
            />

            <button className="action-btn" type="submit" disabled={submittingArtistUpdate || !editArtistId}>
              {submittingArtistUpdate ? 'Saving...' : 'Update artist'}
            </button>
          </div>
        </form>

        <form className="artist-card admin-card" onSubmit={submitTrack}>
          <h4 className="playlist-name">Add Track</h4>
          <div className="track-stack">
            <input
              className="search-input"
              placeholder="Track title"
              value={trackForm.title}
              onChange={(event) => setTrackForm((prev) => ({ ...prev, title: event.target.value }))}
            />

            <PrettySelect
              value={trackForm.artistId}
              placeholder="Select artist"
              options={trackArtistOptions}
              onChange={(value) => setTrackForm((prev) => ({ ...prev, artistId: value }))}
            />

            <input
              className="search-input"
              placeholder="Genre (optional)"
              value={trackForm.genre}
              onChange={(event) => setTrackForm((prev) => ({ ...prev, genre: event.target.value }))}
            />
            <input
              className="search-input"
              type="number"
              placeholder="Duration in seconds"
              value={trackForm.duration}
              onChange={(event) => setTrackForm((prev) => ({ ...prev, duration: event.target.value }))}
            />
            <label className="file-input-btn" htmlFor="track-file-input">
              <span className="admin-mini-icon">AUD</span>
              <span>{trackForm.file ? `File: ${trackForm.file.name}` : 'Choose track file'}</span>
            </label>
            <input
              id="track-file-input"
              className="file-input-hidden"
              type="file"
              accept=".mp3,.wav,.ogg"
              onChange={(event) => setTrackForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
            />
            <button className="action-btn" type="submit" disabled={submittingTrack}>
              {submittingTrack ? 'Uploading...' : 'Upload track'}
            </button>
          </div>
        </form>

        <form className="artist-card admin-card" onSubmit={submitTrackUpdate}>
          <h4 className="playlist-name">Edit Track</h4>
          <div className="track-stack">
            <PrettySelect
              value={editTrackId}
              placeholder="Select track to edit"
              options={editTrackOptions}
              onChange={(value) => setEditTrackId(value)}
            />

            <input
              className="search-input"
              placeholder="Track title"
              value={trackEditForm.title}
              onChange={(event) => setTrackEditForm((prev) => ({ ...prev, title: event.target.value }))}
            />

            <PrettySelect
              value={trackEditForm.artistId}
              placeholder="Select artist"
              options={trackArtistOptions}
              onChange={(value) => setTrackEditForm((prev) => ({ ...prev, artistId: value }))}
            />

            <input
              className="search-input"
              placeholder="Genre (optional)"
              value={trackEditForm.genre}
              onChange={(event) => setTrackEditForm((prev) => ({ ...prev, genre: event.target.value }))}
            />
            <input
              className="search-input"
              type="number"
              placeholder="Duration in seconds"
              value={trackEditForm.duration}
              onChange={(event) => setTrackEditForm((prev) => ({ ...prev, duration: event.target.value }))}
            />

            <button className="action-btn" type="submit" disabled={submittingTrackUpdate || !editTrackId}>
              {submittingTrackUpdate ? 'Saving...' : 'Update track'}
            </button>
          </div>
        </form>
      </div>

      <div className="card-grid admin-lists">
        <div className="artist-card admin-card">
          <h4 className="playlist-name">Delete Artist</h4>
          <div className="playlist-picker-list">
            {artists.map((artist) => (
              <button
                key={artist.id}
                className="playlist-picker-item admin-picker-item"
                type="button"
                onClick={() => onDeleteArtist(artist)}
              >
                <span className="admin-item-main">
                  <img className="admin-thumb" src={getImageUrl(artist.image_path)} alt={artist.name} />
                  <span>{artist.name}</span>
                </span>
              </button>
            ))}
            {artists.length === 0 ? <div className="empty-box">No artists.</div> : null}
          </div>
        </div>

        <div className="artist-card admin-card">
          <h4 className="playlist-name">Delete Track</h4>

          <PrettySelect
            value={deleteArtistFilter}
            placeholder="All artists"
            options={filterArtistOptions}
            onChange={(value) => setDeleteArtistFilter(value)}
          />

          <div className="playlist-picker-list admin-list-space">
            {filteredTracks.map((track) => (
              <button
                key={track.id}
                className="playlist-picker-item"
                type="button"
                onClick={() => onDeleteTrack(track)}
              >
                <span className="admin-item-main">
                  <img className="admin-thumb" src={getImageUrl(track.artistImagePath)} alt={track.artistName} />
                  <span>{track.title}</span>
                </span>
                <span className="muted">{track.artistName}</span>
              </button>
            ))}
            {filteredTracks.length === 0 ? <div className="empty-box">No tracks.</div> : null}
          </div>
        </div>
      </div>

      <div className="artist-card admin-card admin-metrics">
        <h4 className="playlist-name">Artist Metrics</h4>

        <div className="admin-service-grid">
          <div className="admin-service-item">
            <span className="muted">Users total</span>
            <strong>{serviceMetrics?.total_users || 0}</strong>
          </div>
          <div className="admin-service-item">
            <span className="muted">New users (7d)</span>
            <strong>{serviceMetrics?.new_users_last_7_days || 0}</strong>
          </div>
          <div className="admin-service-item">
            <span className="muted">Avg listen</span>
            <strong>{formatDurationShort(serviceMetrics?.avg_listen_seconds)}</strong>
          </div>
        </div>

        <PrettySelect
          value={metricsArtistId}
          placeholder="All artists (daily)"
          options={metricArtistOptions}
          onChange={(value) => setMetricsArtistId(value)}
        />

        <div className="metrics-chart">
          {dailyChart.points.map((point) => (
            <div key={point.day} className="metrics-chart-col">
              <div className="metrics-chart-tip">{`${shortDay(point.day)}: ${point.plays} plays`}</div>
              <div
                className="metrics-chart-bar"
                style={{ height: `${Math.max(6, Math.round((point.plays / dailyChart.max) * 120))}px` }}
              />
              <span className="metrics-chart-label">{shortDay(point.day)}</span>
            </div>
          ))}
        </div>

        {visibleMetrics.length === 0 ? (
          <div className="empty-box">No metrics yet.</div>
        ) : (
          <div className="search-list">
            {visibleMetrics.map((metric) => {
              const artist = artistById[metric.artist_id];
              return (
                <div key={metric.artist_id} className="search-track">
                  <span className="admin-item-main">
                    <img className="admin-thumb" src={getImageUrl(artist?.image_path)} alt={metric.artist_name} />
                    <strong>{metric.artist_name}</strong>
                  </span>
                  <span className="pill">{metric.tracks_count} tracks</span>
                  <span className="pill">{metric.total_plays} plays</span>
                  <span className="pill">{metric.listeners_count || 0} listeners</span>
                  <span className="pill">+{metric.new_users_last_7_days || 0} new (7d)</span>
                  <span className="pill">avg {formatDurationShort(metric.avg_listen_seconds)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminPanel;
