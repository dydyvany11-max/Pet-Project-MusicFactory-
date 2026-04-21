export async function apiRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const hasJson = contentType.includes('application/json');
  const payload = hasJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.detail || payload?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export function fetchDashboard(baseUrl, userId) {
  const query = userId ? `?user_id=${userId}` : '';
  return apiRequest(baseUrl, `/dashboard${query}`);
}

export function fetchArtistDailyMetrics(baseUrl, days = 14) {
  return apiRequest(baseUrl, `/metrics/artists/daily?days=${days}`);
}

export function registerUser(baseUrl, body) {
  return apiRequest(baseUrl, '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function loginUser(baseUrl, body) {
  return apiRequest(baseUrl, '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function createPlaylist(baseUrl, body) {
  return apiRequest(baseUrl, '/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function addTrackToPlaylist(baseUrl, playlistId, trackId) {
  return apiRequest(baseUrl, `/playlists/${playlistId}/tracks/${trackId}`, {
    method: 'POST',
  });
}

export function fetchPlaylistDetails(baseUrl, playlistId) {
  return apiRequest(baseUrl, `/playlists/${playlistId}`);
}

export function createArtist(baseUrl, { name, bio, image }) {
  const formData = new FormData();
  formData.append('name', name);
  if (bio) {
    formData.append('bio', bio);
  }
  if (image) {
    formData.append('image', image);
  }
  return apiRequest(baseUrl, '/artists', {
    method: 'POST',
    body: formData,
  });
}

export function updateArtist(baseUrl, artistId, { name, bio, image }) {
  const formData = new FormData();
  if (name !== undefined) {
    formData.append('name', name);
  }
  if (bio !== undefined) {
    formData.append('bio', bio);
  }
  if (image) {
    formData.append('image', image);
  }

  return apiRequest(baseUrl, `/artists/${artistId}`, {
    method: 'PUT',
    body: formData,
  });
}

export function uploadTrack(baseUrl, { title, artistId, genre, duration, file }) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist_id', String(artistId));
  if (genre) {
    formData.append('genre', genre);
  }
  if (duration !== null && duration !== undefined && duration !== '') {
    formData.append('duration', String(duration));
  }
  formData.append('file', file);

  return apiRequest(baseUrl, '/tracks/upload', {
    method: 'POST',
    body: formData,
  });
}

export function updateTrack(baseUrl, trackId, { title, artistId, genre, duration }) {
  const formData = new FormData();
  if (title !== undefined) {
    formData.append('title', title);
  }
  if (artistId !== undefined && artistId !== null && artistId !== '') {
    formData.append('artist_id', String(artistId));
  }
  if (genre !== undefined) {
    formData.append('genre', genre);
  }
  if (duration !== undefined && duration !== null && duration !== '') {
    formData.append('duration', String(duration));
  }

  return apiRequest(baseUrl, `/tracks/${trackId}`, {
    method: 'PUT',
    body: formData,
  });
}

export function deleteArtist(baseUrl, artistId) {
  return apiRequest(baseUrl, `/artists/${artistId}`, {
    method: 'DELETE',
  });
}

export function deleteTrack(baseUrl, trackId) {
  return apiRequest(baseUrl, `/tracks/${trackId}`, {
    method: 'DELETE',
  });
}

export function registerTrackPlay(baseUrl, trackId, userId = null) {
  const body = userId ? { user_id: userId } : {};
  return apiRequest(baseUrl, `/tracks/${trackId}/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function registerTrackListen(baseUrl, trackId, listenedSeconds, userId = null) {
  const body = {
    listened_seconds: Math.max(1, Math.round(Number(listenedSeconds) || 0)),
    user_id: userId || null,
  };

  return apiRequest(baseUrl, `/tracks/${trackId}/listen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
