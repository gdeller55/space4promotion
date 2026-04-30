import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import NewsTicker from '../components/player/NewsTicker';
import ZoneRenderer from '../components/player/ZoneRenderer';
import MediaRenderer from '../components/player/MediaRenderer';

// --- Configuration ---
const CHECK_INTERVAL_SECONDS = 30; // Check for updates every 30 seconds
const CACHE_NAME = 'space4promotion-content-cache-v1';
const PLAYER_VERSION = '3.0.0'; // Player version for diagnostics
const STORAGE_KEY = 's4p_screen_id'; // Standardized localStorage key
const MAX_CONSECUTIVE_FAILURES = 5;
const DAILY_REFRESH_HOUR = 3; // 3am local time
const MAX_CACHE_SIZE_MB = 500;

// --- Helper to generate a random 6-character alphanumeric string ---
const generateCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// --- Helper to get device info ---
const getDeviceInfo = () => ({
  user_agent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  screen_width: window.screen.width,
  screen_height: window.screen.height,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  player_version: PLAYER_VERSION,
  is_online: navigator.onLine
});

// --- Retry helper with exponential backoff ---
const retryWithBackoff = async (fn, maxRetries = 3, delays = [500, 1000, 2000]) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = delays[attempt] || delays[delays.length - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// --- Cache cleanup helper ---
const cleanupOldCache = async () => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    if (keys.length > 100) {
      console.log(`Cleaning up cache (${keys.length} items)`);
      const toDelete = keys.slice(0, keys.length - 100);
      await Promise.all(toDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    console.warn('Cache cleanup failed:', error);
  }
};

// --- Check if daily refresh is needed ---
const shouldDailyRefresh = () => {
  const lastRefresh = localStorage.getItem('s4p_last_refresh');
  const now = new Date();
  const lastRefreshDate = lastRefresh ? new Date(lastRefresh) : null;
  
  if (!lastRefreshDate || now.getDate() !== lastRefreshDate.getDate()) {
    if (now.getHours() === DAILY_REFRESH_HOUR) {
      return true;
    }
  }
  return false;
};

// Improved offline detection: track last successful backend fetch
const isBackendOnline = (lastSuccessTimestamp) => {
  return (Date.now() - lastSuccessTimestamp) < 60000; // Within last 60 seconds
};


export default function Player() {
  // --- State Management ---
  const [playerStatus, setPlayerStatus] = useState('Initializing...');
  const [statusDetails, setStatusDetails] = useState('');
  const [pairingCode, setPairingCode] = useState(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState(null);
  const [screenInfo, setScreenInfo] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [layout, setLayout] = useState(null);
  const [zones, setZones] = useState([]);

  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Use a ref to hold the current screen record to avoid stale state in intervals
  const screenRef = useRef(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [playlistResolutionSource, setPlaylistResolutionSource] = useState(null);
  const lastLoggedMediaRef = useRef(null);
  const lastRenderAtRef = useRef(null);
  const watchdogRetryRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const lastSuccessfulSyncRef = useRef(Date.now());
  const dailyRefreshCheckRef = useRef(null);

  // Listen for online/offline events and update offline mode
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOfflineMode(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineMode(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor backend connectivity for true offline mode detection
  useEffect(() => {
    const checkBackendConnectivity = () => {
      const isBackendReachable = isBackendOnline(lastSuccessfulSyncRef.current);
      if (!isBackendReachable && !isOfflineMode) {
        console.log('[OFFLINE MODE] Backend unreachable, entering offline mode');
        setIsOfflineMode(true);
      } else if (isBackendReachable && isOfflineMode) {
        console.log('[ONLINE MODE] Backend reachable, exiting offline mode');
        setIsOfflineMode(false);
      }
    };

    const interval = setInterval(checkBackendConnectivity, 5000);
    return () => clearInterval(interval);
  }, [isOfflineMode]);

  // --- Process ScreenCommand Queue ---
  const processCommandQueue = async (screenId) => {
    try {
      const pendingCommands = await retryWithBackoff(() => 
        base44.entities.ScreenCommand.filter(
          { screen_id: screenId, status: 'pending' },
          'created_at',
          10
        )
      );

      for (const command of pendingCommands) {
        console.log(`Executing command: ${command.type}`);
        
        try {
          switch (command.type) {
            case 'refresh':
              // Force content refresh by clearing current playlist
              setCurrentPlaylist(null);
              setActiveMediaIndex(0);
              setStatusDetails('Refreshing content...');
              break;
              
            case 'clear_cache':
              // Clear the cache
              await window.caches.delete(CACHE_NAME);
              setCurrentPlaylist(null);
              setActiveMediaIndex(0);
              setStatusDetails('Cache cleared, reloading content...');
              break;
              
            case 'request_status':
              // Status update handled in heartbeat
              break;
              
            case 'reboot':
              // Simulate reboot by reloading the page
              window.location.reload();
              break;
              
            default:
              console.warn(`Unknown command type: ${command.type}`);
          }

          // Mark command as acknowledged
          await retryWithBackoff(() => 
            base44.entities.ScreenCommand.update(command.id, {
              status: 'acked',
              acked_at: new Date().toISOString()
            })
          );
          
        } catch (cmdError) {
          console.error(`Failed to execute command ${command.id}:`, cmdError);
          retryWithBackoff(() => 
            base44.entities.ScreenCommand.update(command.id, {
              status: 'failed',
              acked_at: new Date().toISOString()
            })
          ).catch(err => console.warn('Failed to update command status:', err));
        }
      }
    } catch (error) {
      console.error('Error processing command queue:', error);
    }
  };

  // --- Core Logic: Check for updates, download content, and set state ---
  const runStatusCheck = useCallback(async () => {
    let screenId = localStorage.getItem(STORAGE_KEY);
    setStatusDetails(`Last checked: ${new Date().toLocaleTimeString()}`);

    // If we're in offline mode and have content, just keep playing (skip backend checks)
    if (isOfflineMode && (currentPlaylist?.media_items?.length > 0 || zones.length > 0)) {
      setPlayerStatus('Offline Playback');
      setStatusDetails('No internet connection. Playing cached content.');
      return;
    }

    // Step 1: Ensure Screen is Initialized
    if (!screenId) {
      try {
        setPlayerStatus('Registering Screen...');
        const newScreenId = `scr-${generateCode()}-${Date.now()}`;
        const first6 = newScreenId.substring(4, 10);
        
        await base44.entities.Screen.create({
          name: `Screen ${first6}`,
          screen_id: newScreenId,
          is_paired: false,
          is_online: false,
          status: 'offline',
          player_version: PLAYER_VERSION,
          device_info: getDeviceInfo()
        });
        
        localStorage.setItem(STORAGE_KEY, newScreenId);
        screenId = newScreenId;
        setPlayerStatus('Ready to Pair');
        return;
      } catch (error) {
        console.error('Registration error:', error);
        setPlayerStatus('Error');
        setStatusDetails('Could not register screen. Check internet and refresh.');
        return;
      }
    }

    // Step 2: Fetch Latest Screen Record and Update Heartbeat
    let screen;
    try {
      const screens = await retryWithBackoff(() => 
        base44.entities.Screen.filter({ screen_id: screenId })
      );
      
      // SELF-HEALING: If the screen record is not found, assume it's a zombie ID.
      if (screens.length === 0) {
        console.warn(`Screen ID ${screenId} not found in database. Assuming zombie ID and resetting.`);
        localStorage.removeItem(STORAGE_KEY);
        setPlayerStatus('Configuration Error');
        setStatusDetails('Resetting player. It will refresh shortly...');
        setTimeout(() => runStatusCheck(), 3000); 
        return;
      }
      
      screen = screens[0];
      screenRef.current = screen;
      setScreenInfo(screen);

      // Update heartbeat and health status
      const now = new Date().toISOString();
      await retryWithBackoff(() => 
        base44.entities.Screen.update(screen.id, {
          last_seen_at: now,
          last_heartbeat: now,
          last_sync_at: now,
          is_online: true,
          status: 'online',
          player_version: PLAYER_VERSION,
          device_info: getDeviceInfo(),
          current_media_id: currentPlaylist?.media_items?.[activeMediaIndex]?.media_id || null,
          last_played_at: currentPlaylist ? now : screen.last_played_at
        })
      );

      // Mark successful backend communication
      lastSuccessfulSyncRef.current = Date.now();
      consecutiveFailuresRef.current = 0;

      // Fetch group info if it exists
      if (screen.group_id) {
        try {
          const group = await retryWithBackoff(() => 
            base44.entities.ScreenGroup.get(screen.group_id)
          );
          setGroupInfo(group);
        } catch (groupError) {
          console.warn("Could not fetch screen group:", groupError);
          setGroupInfo(null);
        }
      } else {
        setGroupInfo(null);
      }

      // Fetch layout and zones if layout_id is set
      if (screen.layout_id) {
        try {
          const layoutData = await retryWithBackoff(() => 
            base44.entities.Layout.get(screen.layout_id)
          );
          const zonesData = await retryWithBackoff(() =>
            base44.entities.LayoutZone.filter({ layout_id: screen.layout_id }, 'z_index')
          );
          setLayout(layoutData);
          setZones(zonesData);
          console.log(`[LAYOUT] Loaded layout: ${layoutData.name} with ${zonesData.length} zones`);
        } catch (layoutError) {
          console.warn("Could not fetch layout:", layoutError);
          setLayout(null);
          setZones([]);
        }
      } else {
        setLayout(null);
        setZones([]);
      }

      // Process command queue
      await processCommandQueue(screen.id);

      // Handle pairing workflow
      if (!screen.is_paired) {
        // Look for active PairingSession
        const now = new Date();
        const pairingSessions = await retryWithBackoff(() => 
          base44.entities.PairingSession.filter({
            screen_id: screenId,
            status: 'active'
          }, '-created_date', 1)
        );

        let activeSession = pairingSessions.find(ps => new Date(ps.expires_at) > now);

        // Create new session if none exists or expired
        if (!activeSession) {
          const code = generateCode();
          const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes
          
          activeSession = await base44.entities.PairingSession.create({
            pairing_code: code,
            screen_id: screenId,
            expires_at: expiresAt,
            status: 'active'
          });
        }

        setPairingCode(activeSession.pairing_code);
        setPairingExpiresAt(activeSession.expires_at);
        setPlayerStatus('Ready to Pair');
        return;
      }

      setPairingCode(null);
      setPairingExpiresAt(null);

    } catch (error) {
      console.error('Status check error:', error);
      
      // Increment failure counter
      consecutiveFailuresRef.current++;
      console.warn(`Status check failure: ${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES}`);

      // Hard reload if too many consecutive failures
      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        console.error('Too many status check failures. Hard reload in 5s...');
        setTimeout(() => {
          localStorage.setItem('s4p_last_refresh', new Date().toISOString());
          window.location.reload();
        }, 5000);
        return;
      }
      
      // Try to update screen with error info (best-effort, non-blocking)
      if (screen?.id) {
        retryWithBackoff(() => 
          base44.entities.Screen.update(screen.id, {
            is_online: false,
            status: 'offline',
            last_error: error.message || 'Unknown error',
            last_error_at: new Date().toISOString()
          })
        ).catch(updateError => {
          console.warn('Failed to log status check error:', updateError);
        });
      }

      // --- OFFLINE SCENARIO ---
      setIsOfflineMode(true);
      if (currentPlaylist && currentPlaylist.media_items.length > 0) {
        setPlayerStatus('Offline Playback');
        setStatusDetails('No internet connection. Playing cached content.');
      } else {
        setPlayerStatus('Connection Lost');
        setStatusDetails('No internet and no cached content available.');
      }
      return;
    }

    // Step 3: Determine which Playlist to Play (Online)
    // Skip if using multi-zone layout (zones handle their own playlists)
    if (!screen) return;
    if (screen.layout_id && zones.length > 0) {
      setPlayerStatus('Playing');
      setStatusDetails('Multi-zone layout active');
      return;
    }

    console.log('Screen data:', screen);
    console.log('Resolving playlist using new priority order...');

    let targetPlaylistId = null;
    let resolutionSource = null;

    try {
      const now = new Date();
      const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // 1) Check Active Schedules (highest priority, matching NOW)
      const allSchedules = await retryWithBackoff(() => 
        base44.entities.Schedule.list()
      );
      const matchingSchedules = allSchedules.filter(schedule => {
        // Check status
        if (schedule.status !== 'scheduled' && schedule.status !== 'active') return false;

        // Check date range
        const startDate = new Date(schedule.start_date);
        const endDate = new Date(schedule.end_date);
        if (now < startDate || now > endDate) return false;

        // Check day of week
        if (schedule.days_of_week && schedule.days_of_week.length > 0) {
          if (!schedule.days_of_week.includes(currentDay)) return false;
        }

        // Check time range
        if (schedule.start_time && schedule.end_time) {
          if (currentTime < schedule.start_time || currentTime > schedule.end_time) return false;
        }

        // Check if targets this screen or group
        if (schedule.target_type === 'screen') {
          return schedule.screen_id === screen.id;
        } else if (schedule.target_type === 'group') {
          return (schedule.target_group_id === screen.group_id || schedule.group_id === screen.group_id);
        }
        return false;
      });

      if (matchingSchedules.length > 0) {
        // Sort: screen > group, then priority desc, then updated_at desc
        matchingSchedules.sort((a, b) => {
          if (a.target_type === 'screen' && b.target_type === 'group') return -1;
          if (a.target_type === 'group' && b.target_type === 'screen') return 1;
          if (b.priority !== a.priority) return (b.priority || 0) - (a.priority || 0);
          return new Date(b.updated_at) - new Date(a.updated_at);
        });
        targetPlaylistId = matchingSchedules[0].playlist_id;
        resolutionSource = matchingSchedules[0].target_type === 'screen' ? 'schedule_screen' : 'schedule_group';
      }

      // 2) Active Assignment for this screen
      if (!targetPlaylistId) {
        const screenAssignments = await retryWithBackoff(() => 
          base44.entities.Assignment.filter({
            target_type: 'screen',
            target_id: screen.screen_id,
            active: true
          }, '-priority,-updated_at', 1)
        );

        if (screenAssignments.length > 0) {
          targetPlaylistId = screenAssignments[0].playlist_id;
          resolutionSource = 'assignment_screen';
        }
      }

      // 3) Active Assignment for this screen's group
      if (!targetPlaylistId && screen.group_id) {
        const groupAssignments = await retryWithBackoff(() => 
          base44.entities.Assignment.filter({
            target_type: 'group',
            target_id: screen.group_id,
            active: true
          }, '-priority,-updated_at', 1)
        );

        if (groupAssignments.length > 0) {
          targetPlaylistId = groupAssignments[0].playlist_id;
          resolutionSource = 'assignment_group';
        }
      }

      // 4) Fallbacks
      if (!targetPlaylistId && screen.current_playlist_id) {
        targetPlaylistId = screen.current_playlist_id;
        resolutionSource = 'fallback_screen';
      }

      if (!targetPlaylistId && screen.group_id) {
        try {
          const group = await retryWithBackoff(() => 
            base44.entities.ScreenGroup.get(screen.group_id)
          );
          if (group?.default_playlist_id) {
            targetPlaylistId = group.default_playlist_id;
            resolutionSource = 'fallback_group';
          }
        } catch (groupError) {
          console.warn('Could not fetch group for fallback:', groupError);
        }
      }

      if (!targetPlaylistId) {
        resolutionSource = 'none';
      }
      
      console.log(`[PLAYLIST RESOLUTION] playlist_id=${targetPlaylistId || 'null'} source=${resolutionSource}`);
      setPlaylistResolutionSource(resolutionSource);

      } catch (error) {
      console.error('Error resolving playlist:', error);
      setIsOfflineMode(true);
      if (currentPlaylist && currentPlaylist.media_items.length > 0) {
        setPlayerStatus('Offline Playback');
        setStatusDetails('Connection issue. Playing cached content.');
      } else {
        setStatusDetails('Error checking for content assignments.');
      }
      return;
    }

    // Step 4: Compare with current playlist and update if necessary
    if (!targetPlaylistId) {
      setPlayerStatus('Awaiting Content');
      // Don't clear currentPlaylist immediately - keep it for offline playback
      return;
    }

    // Check if playlist has changed or version has been updated
    const cachedVersionKey = `s4p_playlist_version:${targetPlaylistId}`;
    const cachedVersion = localStorage.getItem(cachedVersionKey);

    if (currentPlaylist && currentPlaylist.id === targetPlaylistId) {
      // Same playlist - check if version changed
      try {
        const latestPlaylist = await retryWithBackoff(() => 
          base44.entities.Playlist.get(targetPlaylistId)
        );
        if (cachedVersion && latestPlaylist.version && parseInt(cachedVersion) >= latestPlaylist.version) {
          // Version hasn't changed, keep playing
          setPlayerStatus('Playing');
          return;
        }
        // Version changed, continue to update
      } catch (error) {
        console.warn('Failed to check playlist version:', error);
        // On error, keep playing current content
        setPlayerStatus('Playing');
        return;
      }
    }

    // --- NEW PLAYLIST OR VERSION DETECTED ---
    try {
      setPlayerStatus('Downloading Content...');
      console.log('Downloading new playlist:', targetPlaylistId);

      const newPlaylist = await retryWithBackoff(() => 
        base44.entities.Playlist.get(targetPlaylistId)
      );
      const mediaIds = newPlaylist.media_items.map(item => item.media_id);

      if (mediaIds.length > 0) {
        const mediaItems = await retryWithBackoff(() => 
          base44.entities.Media.filter({ id: { '$in': mediaIds } })
        );

        // Add full media info to playlist items
        newPlaylist.media_items = newPlaylist.media_items.map(item => ({
          ...item,
          ...mediaItems.find(m => m.id === item.media_id)
        })).filter(Boolean);

        const urlsToCache = newPlaylist.media_items.map(item => item.file_url).filter(Boolean);

        // Cache the content
        if (urlsToCache.length > 0) {
          setStatusDetails(`Caching ${urlsToCache.length} items...`);
          const cache = await window.caches.open(CACHE_NAME);

          for (const url of urlsToCache) {
            try {
              const cachedResponse = await cache.match(url);
              if (!cachedResponse) {
                await cache.add(url);
              }
            } catch (error) {
              console.warn(`Failed to cache ${url}:`, error);
            }
          }
        }
      }

      // Store playlist version
      if (newPlaylist.version) {
        localStorage.setItem(cachedVersionKey, newPlaylist.version.toString());
      }

      // Update sync timestamp and clear errors
      await retryWithBackoff(() => 
        base44.entities.Screen.update(screen.id, {
          last_sync_at: new Date().toISOString(),
          last_error: null
        })
      );

      // Reset failure counter on success
      consecutiveFailuresRef.current = 0;
      lastSuccessfulSyncRef.current = Date.now();

      setCurrentPlaylist(newPlaylist);
      setActiveMediaIndex(0);
      setPlayerStatus('Playing');
      setStatusDetails('Content updated and playing.');
      console.log('Successfully loaded playlist:', newPlaylist);

    } catch (error) {
      console.error('Error downloading playlist:', error);

      // Increment failure counter
      consecutiveFailuresRef.current++;
      console.warn(`Consecutive failures: ${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES}`);

      // Hard reload if too many failures
      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        console.error('Too many consecutive failures. Hard reload in 5s...');
        setTimeout(() => {
          localStorage.setItem('s4p_last_refresh', new Date().toISOString());
          window.location.reload();
        }, 5000);
        return;
      }

      // Update screen with error (best-effort, non-blocking)
      retryWithBackoff(() => 
        base44.entities.Screen.update(screen.id, {
          last_error: error.message || 'Playlist download failed',
          last_error_at: new Date().toISOString()
        })
      ).catch(updateError => {
        console.warn('Failed to log playlist error:', updateError);
      });

      setIsOfflineMode(true);
      if (currentPlaylist && currentPlaylist.media_items.length > 0) {
        setPlayerStatus('Offline Playback');
        setStatusDetails('Failed to update content. Playing cached version.');
      } else {
        setPlayerStatus('Error');
        setStatusDetails(`Failed to download content: ${error.message}`);
      }
    }
  }, [currentPlaylist, isOnline, activeMediaIndex, isOfflineMode, zones]);

  // --- Daily refresh check ---
  useEffect(() => {
    dailyRefreshCheckRef.current = setInterval(() => {
      if (shouldDailyRefresh()) {
        console.log('Daily refresh triggered');
        localStorage.setItem('s4p_last_refresh', new Date().toISOString());
        window.location.reload();
      }
    }, 60000); // Check every minute

    return () => {
      if (dailyRefreshCheckRef.current) {
        clearInterval(dailyRefreshCheckRef.current);
      }
    };
  }, []);

  // --- Cache cleanup on mount ---
  useEffect(() => {
    cleanupOldCache();
  }, []);

  // --- Main Effect: Initialization and Update Loop ---
  useEffect(() => {
    runStatusCheck();

    const interval = setInterval(() => {
      runStatusCheck();
    }, CHECK_INTERVAL_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [runStatusCheck]);

  // --- Best-effort offline status update on page close/hide ---
  useEffect(() => {
    const updateOfflineStatus = () => {
      const screen = screenRef.current;
      if (!screen?.id) return;
      
      // Best-effort update with retry (fire and forget)
      retryWithBackoff(() => 
        base44.entities.Screen.update(screen.id, {
          is_online: false,
          status: 'offline',
          last_seen_at: new Date().toISOString()
        })
      ).catch(() => {}); // Ignore all failures after retries
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOfflineStatus();
      }
    };

    const handleBeforeUnload = () => {
      updateOfflineStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    }, []);

  // --- Watchdog: Detect Stuck Playback ---
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      const screen = screenRef.current;
      
      // Only run watchdog if screen is paired and playback should be running
      if (!screen?.is_paired) return;
      if (playerStatus !== 'Playing' && playerStatus !== 'Offline Playback') return;
      if (!currentPlaylist || currentPlaylist.media_items.length === 0) return;
      
      const now = Date.now();
      const lastRender = lastRenderAtRef.current;
      const timeSinceLastSync = now - lastSuccessfulSyncRef.current;
      const STUCK_THRESHOLD = 90000; // 90 seconds
      const SYNC_THRESHOLD = 600000; // 10 minutes
      
      // Check if playback is stuck (no render for 90+ seconds)
      if (lastRender && (now - lastRender) > STUCK_THRESHOLD) {
        console.error(`[WATCHDOG] Playback stuck (${Math.floor((now - lastRender) / 1000)}s). Reloading...`);
        localStorage.setItem('s4p_last_refresh', new Date().toISOString());
        window.location.reload();
        return;
      }

      // Check if we haven't synced successfully in a while
      if (timeSinceLastSync > SYNC_THRESHOLD) {
        console.error(`[WATCHDOG] No successful sync in ${Math.floor(timeSinceLastSync / 1000)}s. Reloading...`);
        localStorage.setItem('s4p_last_refresh', new Date().toISOString());
        window.location.reload();
        return;
      }

      // Reset retry flag if playback is healthy
      if (lastRender && (now - lastRender) < 60000) {
        watchdogRetryRef.current = false;
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(watchdogInterval);
  }, [playerStatus, currentPlaylist]);

    // --- Proof-of-Play Logging ---
    useEffect(() => {
    if (isOfflineMode || !currentPlaylist || !screenRef.current) return;
    if (playerStatus !== 'Playing' && playerStatus !== 'Offline Playback') return;

    const currentMediaItem = currentPlaylist.media_items[activeMediaIndex];
    if (!currentMediaItem) return;

    // Prevent duplicate logs for the same media item
    const mediaKey = `${currentPlaylist.id}-${currentMediaItem.media_id}-${activeMediaIndex}`;
    if (lastLoggedMediaRef.current === mediaKey) return;
    lastLoggedMediaRef.current = mediaKey;

    const screen = screenRef.current;
    const now = new Date().toISOString();

    // Log playback event with retry (fire and forget)
    retryWithBackoff(() => 
      base44.entities.PlaybackEvent.create({
        screen_id: screen.screen_id,
        playlist_id: currentPlaylist.id,
        media_id: currentMediaItem.media_id,
        played_at: now,
        duration_seconds: currentMediaItem.duration_seconds || 0,
        source: playlistResolutionSource,
        created_at: now
      })
    ).catch(err => {
      console.warn('Failed to log playback event after retries:', err);
    });

    // Update screen tracking with retry (fire and forget)
    retryWithBackoff(() => 
      base44.entities.Screen.update(screen.id, {
        current_media_id: currentMediaItem.media_id,
        last_played_at: now
      })
    ).catch(err => {
      console.warn('Failed to update screen playback tracking after retries:', err);
    });

    console.log(`[PROOF-OF-PLAY] Logged: media=${currentMediaItem.media_id} playlist=${currentPlaylist.id} source=${playlistResolutionSource}`);
    }, [currentPlaylist, activeMediaIndex, playerStatus, isOfflineMode, playlistResolutionSource]);

  // Handle playback events from zones
  const handleZonePlaybackEvent = useCallback((eventData) => {
    if (isOfflineMode || !screenRef.current) return;
    
    const screen = screenRef.current;
    const now = new Date().toISOString();

    retryWithBackoff(() => 
      base44.entities.PlaybackEvent.create({
        screen_id: screen.screen_id,
        zone_id: eventData.zone_id,
        playlist_id: eventData.playlist_id,
        media_id: eventData.media_id,
        played_at: now,
        duration_seconds: eventData.duration_seconds,
        source: 'zone',
        created_at: now
      })
    ).catch(err => {
      console.warn('Failed to log zone playback event:', err);
    });
  }, [isOfflineMode]);

  // --- Advance to Next Media Item ---
  const advanceToNextMedia = useCallback(() => {
      if(currentPlaylist && currentPlaylist.media_items.length > 0) {
        setActiveMediaIndex(prevIndex => (prevIndex + 1) % currentPlaylist.media_items.length);
        lastRenderAtRef.current = Date.now(); // Update watchdog timestamp
      }
  }, [currentPlaylist]);

  // --- Effect for Playlist Playback Logic (Handles image durations) ---
  useEffect(() => {
    if (!currentPlaylist || currentPlaylist.media_items.length === 0 || !(playerStatus === 'Playing' || playerStatus === 'Offline Playback')) {
      return;
    }

    const currentMediaItem = currentPlaylist.media_items[activeMediaIndex];
    if (!currentMediaItem) return;

    // Update render timestamp when media item starts
    lastRenderAtRef.current = Date.now();

    // Only set timer for images. Videos handle their own 'onEnded' event via MediaRenderer.
    if (currentMediaItem.type === 'image') {
        const duration = (currentMediaItem.duration_seconds || 10) * 1000;

        const timer = setTimeout(() => {
          advanceToNextMedia();
        }, duration);

        return () => clearTimeout(timer);
    }
  }, [playerStatus, currentPlaylist, activeMediaIndex, advanceToNextMedia]);


  // --- UI Components ---
  const renderContent = () => {
    // Show pairing code if not paired
    if (pairingCode) {
      return <PairingCodeDisplay code={pairingCode} expiresAt={pairingExpiresAt} />;
    }

    // Show status messages for various states
    if (playerStatus === 'Initializing...' || playerStatus === 'Registering Screen...') {
      return <MessageDisplay title={playerStatus} details={statusDetails} loader={true} />;
    }

    if (playerStatus === 'Awaiting Content' || playerStatus === 'Connection Lost' || playerStatus === 'Error') {
      return <MessageDisplay title={playerStatus} details={statusDetails} />;
    }

    // Multi-zone layout rendering
    if (layout && zones.length > 0) {
      return (
        <div style={styles.layoutContainer}>
          {zones.map(zone => (
            <ZoneRenderer
              key={zone.id}
              zone={zone}
              canvasWidth={layout.canvas_width}
              canvasHeight={layout.canvas_height}
              isOfflineMode={isOfflineMode}
              screenRef={screenRef}
              onPlaybackEvent={handleZonePlaybackEvent}
            />
          ))}
        </div>
      );
    }

    // Single-playlist rendering (legacy mode)
    if (currentPlaylist && currentPlaylist.media_items.length > 0) {
      const activeMedia = currentPlaylist.media_items[activeMediaIndex];
      if (activeMedia) {
        return (
          <>
            <MediaRenderer 
              mediaItem={activeMedia}
              isOnline={!isOfflineMode}
              onNext={advanceToNextMedia}
              screenRef={screenRef}
              muted={screenRef.current?.muted !== false}
            />
            {groupInfo && groupInfo.news_feed_url && !isOfflineMode && (
              <NewsTicker feedUrl={groupInfo.news_feed_url} />
            )}
          </>
        );
      }
    }

    // No content available - show blank screen
    return null;
  };

  return (
    <div style={styles.container}>
      {renderContent()}
    </div>
  );
}

// --- Reusable UI Components & Styles ---

const MessageDisplay = ({ title, details, loader = false }) => (
  <div style={styles.messageContainer}>
    {loader && <div style={styles.loader} />}
    <p style={styles.messageTitle}>{title}</p>
    {details && <p style={styles.messageDetails}>{details}</p>}
  </div>
);

const PairingCodeDisplay = ({ code, expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    if (!expiresAt) return;
    
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  return (
    <div style={styles.messageContainer}>
      <p style={styles.pairingLabel}>Enter this code in your dashboard:</p>
      <p style={styles.pairingCode}>{code}</p>
      {timeLeft && <p style={styles.messageDetails}>Expires in: {timeLeft}</p>}
    </div>
  );
};

const styles = {
  container: {
    width: '100vw', height: '100vh', backgroundColor: 'black', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Arial, sans-serif', overflow: 'hidden'
  },
  layoutContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: 'black'
  },
  media: {
    width: '100%', height: '100%', objectFit: 'contain'
  },
  messageContainer: {
    backgroundColor: 'rgba(30,30,30,0.8)', padding: '40px 60px',
    borderRadius: '15px', textAlign: 'center'
  },
  messageTitle: { fontSize: '40px', fontWeight: 'bold', margin: '0 0 10px 0' },
  messageDetails: { fontSize: '20px', margin: 0, color: '#ccc' },
  pairingLabel: { fontSize: '20px', margin: '0 0 10px 0', color: '#ccc' },
  pairingCode: { fontSize: '90px', fontWeight: 'bold', margin: '0', letterSpacing: '0.1em', fontFamily: 'monospace' },
  loader: {
    border: '4px solid #f3f3f3', borderTop: '4px solid #3498db',
    borderRadius: '50%', width: '40px', height: '40px',
    animation: 'spin 1s linear infinite', margin: '0 auto 20px auto'
  }
};

// Add keyframes for loader animation to the document head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);