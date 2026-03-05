import React, { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import NowPlaying from './components/NowPlaying';
import { addTrackToPlaylist, fetchPlaylistDetails } from './api/client';
import { useAuth } from './hooks/useAuth';
import { useDashboardData } from './hooks/useDashboardData';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const fallbackRecommended = [
  { id: 101, title: 'Fresh Radar', tracks_count: 32 },
  { id: 102, title: 'Bassline Heat', tracks_count: 24 },
  { id: 103, title: 'Cloud Rap Picks', tracks_count: 18 },
  { id: 104, title: 'Late Night Mix', tracks_count: 28 },
];

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [activeView, setActiveView] = useState('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  const {
    currentUser,
    authMode,
    setAuthMode,
    authError,
    authForm,
    setAuthForm,
    submitAuth,
    logout,
  } = useAuth(API_BASE_URL);

  const {
    artists,
    tracksByArtist,
    myPlaylists,
    setMyPlaylists,
    loading,
    error,
    setError,
    addPlaylist,
  } = useDashboardData(API_BASE_URL, currentUser);

  const allTracks = useMemo(() => {
    const result = [];

    Object.keys(tracksByArtist).forEach((artistId) => {
      const artist = artists.find((item) => item.id === Number(artistId));
      const artistTracks = tracksByArtist[artistId] || [];

      artistTracks.forEach((track) => {
        result.push({
          ...track,
          artistName: track.artist_name || artist?.name || 'Unknown Artist',
          artistImagePath: artist?.image_path || null,
        });
      });
    });

    return result;
  }, [artists, tracksByArtist]);

  const filteredTracks = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return allTracks;
    }

    return allTracks.filter((track) => {
      const haystack = `${track.title} ${track.artistName} ${track.genre || ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [allTracks, searchQuery]);

  const currentTrack = useMemo(
    () => allTracks.find((track) => track.id === currentTrackId) || null,
    [allTracks, currentTrackId]
  );

  const currentIndex = useMemo(
    () => allTracks.findIndex((track) => track.id === currentTrackId),
    [allTracks, currentTrackId]
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allTracks.length - 1;

  const getAudioUrl = (filePath) => {
    const fileName = filePath.split('/').pop();
    return `${API_BASE_URL}/play/${encodeURIComponent(fileName)}`;
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80';
    }

    const fileName = imagePath.split('/').pop();
    return `${API_BASE_URL}/image/${encodeURIComponent(fileName)}`;
  };

  const openPlaylist = async (playlistId) => {
    setActiveView('library');
    setPlaylistLoading(true);
    try {
      const payload = await fetchPlaylistDetails(API_BASE_URL, playlistId);
      setSelectedPlaylist(payload);
      setSelectedPlaylistTracks(
        (payload.tracks || []).map((track) => ({
          ...track,
          artistName: track.artist_name,
        }))
      );
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPlaylistLoading(false);
    }
  };

  const onCreatePlaylist = async () => {
    const title = window.prompt('Playlist name:');
    if (!title || !title.trim()) {
      return;
    }

    try {
      const created = await addPlaylist(title.trim());
      await openPlaylist(created.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const onAddTrackToPlaylist = async (track) => {
    if (!currentUser) {
      setError('Login first to add tracks into playlists');
      setActiveView('library');
      return;
    }

    if (myPlaylists.length === 0) {
      setError('Create a playlist first in Library');
      setActiveView('library');
      return;
    }

    const playlistHint = myPlaylists.map((p) => `${p.id}: ${p.title}`).join('\n');
    const selectedRaw = window.prompt(`Select playlist id:\n${playlistHint}`);
    if (!selectedRaw) {
      return;
    }

    const playlistId = Number(selectedRaw);
    if (!Number.isFinite(playlistId)) {
      setError('Invalid playlist id');
      return;
    }

    try {
      const response = await addTrackToPlaylist(API_BASE_URL, playlistId, track.id);
      if (response?.message?.includes('already')) {
        setError('Track is already in this playlist');
        return;
      }

      setMyPlaylists((prev) =>
        prev.map((item) =>
          item.id === playlistId ? { ...item, tracks_count: (item.tracks_count || 0) + 1 } : item
        )
      );

      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylistTracks((prev) => [track, ...prev]);
        setSelectedPlaylist((prev) => (prev ? { ...prev, tracks_count: (prev.tracks_count || 0) + 1 } : prev));
      }

      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const onLogout = () => {
    logout();
    setMyPlaylists([]);
    setSelectedPlaylist(null);
    setSelectedPlaylistTracks([]);
  };

  return (
    <div className="app-shell">
      <div className="app-bg-orb app-bg-orb-left" />
      <div className="app-bg-orb app-bg-orb-right" />

      <div className="app-layout">
        <Sidebar
          currentUser={currentUser}
          activeView={activeView}
          onNavigate={setActiveView}
          onLogout={onLogout}
          myPlaylists={myPlaylists}
          recommendedPlaylists={fallbackRecommended}
          onOpenPlaylist={openPlaylist}
          selectedPlaylistId={selectedPlaylist?.id}
        />

        <MainContent
          loading={loading}
          error={error}
          artists={artists}
          tracks={tracksByArtist}
          allTracks={filteredTracks}
          totalTracks={allTracks.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          recommendedPlaylists={fallbackRecommended}
          getImageUrl={getImageUrl}
          onTrackSelect={(track) => setCurrentTrackId(track.id)}
          onAddTrackToPlaylist={onAddTrackToPlaylist}
          currentUser={currentUser}
          activeView={activeView}
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          authError={authError}
          onAuthSubmit={submitAuth}
          myPlaylists={myPlaylists}
          onCreatePlaylist={onCreatePlaylist}
          onOpenPlaylist={openPlaylist}
          selectedPlaylist={selectedPlaylist}
          selectedPlaylistTracks={selectedPlaylistTracks}
          playlistLoading={playlistLoading}
        />
      </div>

      {currentTrack ? (
        <NowPlaying
          track={currentTrack}
          getAudioUrl={getAudioUrl}
          getImageUrl={getImageUrl}
          onNext={() => hasNext && setCurrentTrackId(allTracks[currentIndex + 1].id)}
          onPrevious={() => hasPrevious && setCurrentTrackId(allTracks[currentIndex - 1].id)}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      ) : null}
    </div>
  );
}

export default App;
