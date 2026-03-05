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
