import { useEffect, useState } from 'react';
import { createPlaylist, fetchDashboard } from '../api/client';

export function useDashboardData(apiBaseUrl, currentUser) {
  const [artists, setArtists] = useState([]);
  const [tracksByArtist, setTracksByArtist] = useState({});
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchDashboard(apiBaseUrl, currentUser?.id);
        if (cancelled) {
          return;
        }

        setArtists(data.artists || []);
        setTracksByArtist(data.tracks_by_artist || {});
        setMyPlaylists(data.playlists || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Dashboard loading failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, currentUser]);

  const addPlaylist = async (title) => {
    if (!currentUser) {
      throw new Error('Login first to create playlists');
    }

    const playlist = await createPlaylist(apiBaseUrl, {
      title,
      user_id: currentUser.id,
      is_public: false,
    });

    setMyPlaylists((prev) => [playlist, ...prev]);
    return playlist;
  };

  return {
    artists,
    tracksByArtist,
    myPlaylists,
    setMyPlaylists,
    loading,
    error,
    setError,
    addPlaylist,
  };
}
