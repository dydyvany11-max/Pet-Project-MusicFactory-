import React, { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import NowPlaying from './components/NowPlaying';
import PlaylistModal from './components/PlaylistModal';
import ArtistModal from './components/ArtistModal';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import { addTrackToPlaylist, fetchPlaylistDetails } from './api/client';
import { useAuth } from './hooks/useAuth';
import { useDashboardData } from './hooks/useDashboardData';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [activeView, setActiveView] = useState('home');

  const [playlistModal, setPlaylistModal] = useState({
    playlist: null,
    tracks: [],
    loading: false,
  });
  const [artistModal, setArtistModal] = useState({
    artist: null,
    tracks: [],
  });
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null);

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

  const recommendedPlaylists = useMemo(
    () => [...myPlaylists].sort((a, b) => (b.tracks_count || 0) - (a.tracks_count || 0)).slice(0, 6),
    [myPlaylists]
  );

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

  const openPlaylistModal = async (playlist) => {
    if (!playlist?.id) {
      return;
    }

    setPlaylistModal({ playlist, tracks: [], loading: true });

    try {
      const payload = await fetchPlaylistDetails(API_BASE_URL, playlist.id);
      const modalTracks = (payload.tracks || []).map((track) => ({
        ...track,
        artistName: track.artist_name,
      }));

      setPlaylistModal({ playlist: payload, tracks: modalTracks, loading: false });
      setError('');
    } catch (err) {
      setPlaylistModal({ playlist, tracks: [], loading: false });
      setError(err.message);
    }
  };

  const openArtistModal = (artist) => {
    const artistTracks = tracksByArtist[artist.id] || tracksByArtist[String(artist.id)] || [];
    setArtistModal({ artist, tracks: artistTracks });
  };

  const onCreatePlaylist = async () => {
    const title = window.prompt('Playlist name:');
    if (!title || !title.trim()) {
      return;
    }

    try {
      const created = await addPlaylist(title.trim());
      await openPlaylistModal(created);
    } catch (err) {
      setError(err.message);
    }
  };

  const onAddTrackToPlaylist = (track) => {
    if (!currentUser) {
      setError('Login first to add tracks into playlists');
      setActiveView('library');
      return;
    }

    setAddToPlaylistTrack(track);
  };

  const onConfirmAddToPlaylist = async (playlist) => {
    if (!addToPlaylistTrack) {
      return;
    }

    try {
      const response = await addTrackToPlaylist(API_BASE_URL, playlist.id, addToPlaylistTrack.id);
      if (response?.message?.includes('already')) {
        setError('Track is already in this playlist');
        setAddToPlaylistTrack(null);
        return;
      }

      setMyPlaylists((prev) =>
        prev.map((item) => {
          if (item.id !== playlist.id) {
            return item;
          }

          return {
            ...item,
            tracks_count: (item.tracks_count || 0) + 1,
            cover_image_path: item.cover_image_path || addToPlaylistTrack.artistImagePath || null,
          };
        })
      );

      if (playlistModal.playlist?.id === playlist.id) {
        setPlaylistModal((prev) => ({
          ...prev,
          tracks: [addToPlaylistTrack, ...prev.tracks],
          playlist: {
            ...prev.playlist,
            tracks_count: (prev.playlist?.tracks_count || 0) + 1,
            cover_image_path: prev.playlist?.cover_image_path || addToPlaylistTrack.artistImagePath || null,
          },
        }));
      }

      setAddToPlaylistTrack(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const onLogout = () => {
    logout();
    setMyPlaylists([]);
    setPlaylistModal({ playlist: null, tracks: [], loading: false });
    setArtistModal({ artist: null, tracks: [] });
    setAddToPlaylistTrack(null);
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
          recommendedPlaylists={recommendedPlaylists}
          onOpenPlaylist={openPlaylistModal}
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
          recommendedPlaylists={recommendedPlaylists}
          getImageUrl={getImageUrl}
          onTrackSelect={(track) => setCurrentTrackId(track.id)}
          onAddTrackToPlaylist={onAddTrackToPlaylist}
          onOpenPlaylist={openPlaylistModal}
          onOpenArtist={openArtistModal}
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

      <PlaylistModal
        playlist={playlistModal.playlist}
        tracks={playlistModal.tracks}
        loading={playlistModal.loading}
        onTrackSelect={(track) => setCurrentTrackId(track.id)}
        onClose={() => setPlaylistModal({ playlist: null, tracks: [], loading: false })}
        getImageUrl={getImageUrl}
      />

      <ArtistModal
        artist={artistModal.artist}
        tracks={artistModal.tracks}
        getImageUrl={getImageUrl}
        onTrackSelect={(track) => setCurrentTrackId(track.id)}
        onAddTrackToPlaylist={onAddTrackToPlaylist}
        onClose={() => setArtistModal({ artist: null, tracks: [] })}
      />

      <AddToPlaylistModal
        track={addToPlaylistTrack}
        playlists={myPlaylists}
        onSelect={onConfirmAddToPlaylist}
        onClose={() => setAddToPlaylistTrack(null)}
      />
    </div>
  );
}

export default App;
