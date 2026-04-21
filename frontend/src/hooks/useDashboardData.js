import { useEffect, useState } from 'react';
import { createPlaylist, fetchArtistDailyMetrics, fetchDashboard } from '../api/client';

export function useDashboardData(apiBaseUrl, currentUser) {
  const [artists, setArtists] = useState([]);
  const [tracksByArtist, setTracksByArtist] = useState({});
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [serviceMetrics, setServiceMetrics] = useState({
    total_users: 0,
    new_users_last_7_days: 0,
    avg_listen_seconds: 0,
  });
  const [artistMetrics, setArtistMetrics] = useState([]);
  const [artistDailyMetrics, setArtistDailyMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mergeDailyMetrics = (dashboardData, dailyData) => {
    if (Array.isArray(dailyData) && dailyData.length > 0) {
      return dailyData;
    }
    return dashboardData?.artist_daily_metrics || [];
  };

  const reloadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [data, daily] = await Promise.all([
        fetchDashboard(apiBaseUrl, currentUser?.id),
        fetchArtistDailyMetrics(apiBaseUrl, 14).catch(() => []),
      ]);

      const resolvedDaily = mergeDailyMetrics(data, daily);

      setArtists(data.artists || []);
      setTracksByArtist(data.tracks_by_artist || {});
      setMyPlaylists(data.playlists || []);
      setServiceMetrics(
        data.service_metrics || {
          total_users: 0,
          new_users_last_7_days: 0,
          avg_listen_seconds: 0,
        }
      );
      setArtistMetrics(data.artist_metrics || []);
      setArtistDailyMetrics(resolvedDaily);
      return { ...data, artist_daily_metrics: resolvedDaily };
    } catch (err) {
      setError(err.message || 'Dashboard loading failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [data, daily] = await Promise.all([
          fetchDashboard(apiBaseUrl, currentUser?.id),
          fetchArtistDailyMetrics(apiBaseUrl, 14).catch(() => []),
        ]);

        if (cancelled) {
          return;
        }

        const resolvedDaily = mergeDailyMetrics(data, daily);

        setArtists(data.artists || []);
        setTracksByArtist(data.tracks_by_artist || {});
        setMyPlaylists(data.playlists || []);
        setServiceMetrics(
          data.service_metrics || {
            total_users: 0,
            new_users_last_7_days: 0,
            avg_listen_seconds: 0,
          }
        );
        setArtistMetrics(data.artist_metrics || []);
        setArtistDailyMetrics(resolvedDaily);
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
    serviceMetrics,
    artistMetrics,
    artistDailyMetrics,
    loading,
    error,
    setError,
    addPlaylist,
    reloadDashboard,
  };
}
