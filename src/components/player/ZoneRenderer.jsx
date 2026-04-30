import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import MediaRenderer from './MediaRenderer';
import NewsTicker from './NewsTicker';

const ZoneRenderer = ({ 
  zone, 
  canvasWidth, 
  canvasHeight, 
  isOfflineMode, 
  screenRef,
  onPlaybackEvent 
}) => {
  const [playlist, setPlaylist] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [media, setMedia] = useState(null);
  const lastRenderAtRef = useRef(null);

  // Load zone content
  useEffect(() => {
    const loadZoneContent = async () => {
      try {
        if (zone.type === 'playlist' && zone.assigned_playlist_id) {
          const pl = await base44.entities.Playlist.get(zone.assigned_playlist_id);
          if (pl.media_items && pl.media_items.length > 0) {
            const mediaIds = pl.media_items.map(item => item.media_id);
            const mediaItems = await base44.entities.Media.filter({ id: { '$in': mediaIds } });
            pl.media_items = pl.media_items.map(item => ({
              ...item,
              ...mediaItems.find(m => m.id === item.media_id)
            })).filter(Boolean);
            setPlaylist(pl);
          }
        } else if (zone.type === 'media' && zone.assigned_media_id) {
          const m = await base44.entities.Media.get(zone.assigned_media_id);
          setMedia(m);
        }
      } catch (error) {
        console.error(`Error loading zone ${zone.name}:`, error);
      }
    };

    if (!isOfflineMode || !zone.online_only) {
      loadZoneContent();
    }
  }, [zone, isOfflineMode]);

  // Advance to next media in zone playlist
  const advanceToNextMedia = useCallback(() => {
    if (playlist && playlist.media_items.length > 0) {
      setActiveMediaIndex(prevIndex => (prevIndex + 1) % playlist.media_items.length);
      lastRenderAtRef.current = Date.now();
    }
  }, [playlist]);

  // Handle image duration timer
  useEffect(() => {
    if (!playlist || playlist.media_items.length === 0) return;
    const currentMediaItem = playlist.media_items[activeMediaIndex];
    if (!currentMediaItem) return;

    lastRenderAtRef.current = Date.now();

    if (currentMediaItem.type === 'image') {
      const duration = (currentMediaItem.duration_seconds || 10) * 1000;
      const timer = setTimeout(() => {
        advanceToNextMedia();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [playlist, activeMediaIndex, advanceToNextMedia]);

  // Log playback events for this zone
  useEffect(() => {
    if (!playlist || !screenRef.current || isOfflineMode) return;
    const currentMediaItem = playlist.media_items[activeMediaIndex];
    if (!currentMediaItem) return;

    if (onPlaybackEvent) {
      onPlaybackEvent({
        zone_id: zone.id,
        playlist_id: playlist.id,
        media_id: currentMediaItem.media_id,
        duration_seconds: currentMediaItem.duration_seconds || 0
      });
    }
  }, [playlist, activeMediaIndex, zone, screenRef, isOfflineMode, onPlaybackEvent]);

  // Calculate zone position as percentage
  const zoneStyle = {
    position: 'absolute',
    left: `${(zone.x / canvasWidth) * 100}%`,
    top: `${(zone.y / canvasHeight) * 100}%`,
    width: `${(zone.width / canvasWidth) * 100}%`,
    height: `${(zone.height / canvasHeight) * 100}%`,
    zIndex: zone.z_index || 1,
    transform: zone.rotation ? `rotate(${zone.rotation}deg)` : 'none',
    backgroundColor: zone.background_color || 'transparent',
    overflow: 'hidden'
  };

  // Hide online-only zones when offline
  if (zone.online_only && isOfflineMode) {
    return null;
  }

  // Render based on zone type
  if (zone.type === 'playlist' && playlist && playlist.media_items.length > 0) {
    const activeMedia = playlist.media_items[activeMediaIndex];
    return (
      <div style={zoneStyle}>
        {activeMedia && (
          <MediaRenderer
            mediaItem={activeMedia}
            isOnline={!isOfflineMode}
            onNext={advanceToNextMedia}
            screenRef={screenRef}
            muted={screenRef.current?.muted !== false}
          />
        )}
      </div>
    );
  }

  if (zone.type === 'media' && media) {
    return (
      <div style={zoneStyle}>
        <MediaRenderer
          mediaItem={media}
          isOnline={!isOfflineMode}
          onNext={() => {}}
          screenRef={screenRef}
          muted={screenRef.current?.muted !== false}
        />
      </div>
    );
  }

  if (zone.type === 'live_news' && !isOfflineMode) {
    const settings = zone.settings_json ? JSON.parse(zone.settings_json) : {};
    const feedUrl = settings.rss_url || screenRef.current?.group?.news_feed_url;
    
    if (feedUrl) {
      return (
        <div style={zoneStyle}>
          <NewsTicker feedUrl={feedUrl} />
        </div>
      );
    }
  }

  if (zone.type === 'live_weather' && !isOfflineMode) {
    // Weather widget placeholder (to be implemented)
    return (
      <div style={{...zoneStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px'}}>
        Weather Widget
      </div>
    );
  }

  // Empty zone
  return <div style={zoneStyle} />;
};

export default ZoneRenderer;