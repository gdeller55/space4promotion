import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const CACHE_NAME = 'space4promotion-content-cache-v1';

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

const MessageDisplay = ({ title, details, loader = false }) => (
  <div style={styles.messageContainer}>
    {loader && <div style={styles.loader} />}
    <p style={styles.messageTitle}>{title}</p>
    {details && <p style={styles.messageDetails}>{details}</p>}
  </div>
);

const MediaRenderer = ({ mediaItem, isOnline, onNext, screenRef, muted = true }) => {
  const [source, setSource] = useState(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadTimeoutRef = useRef(null);

  const logMediaError = useCallback(async (reason) => {
    const screen = screenRef.current;
    if (!screen?.id) return;
    
    const errorMsg = `Media failed: ${mediaItem?.title || 'unknown'} - ${reason}`;
    console.error(errorMsg);
    
    retryWithBackoff(() => 
      base44.entities.Screen.update(screen.id, {
        last_error: errorMsg,
        last_error_at: new Date().toISOString()
      })
    ).catch(err => console.warn('Failed to log media error after retries:', err));
  }, [screenRef, mediaItem]);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    const loadSource = async () => {
      setError(false);
      setSource(null);
      setIsLoading(true);
      
      if (!mediaItem || !mediaItem.file_url) {
        console.warn("Media item or file_url is missing.");
        if (isMounted) {
          setError(true);
          setIsLoading(false);
          logMediaError('missing file_url');
        }
        return;
      }

      const timeout = mediaItem.type === 'video' ? 12000 : 8000;
      loadTimeoutRef.current = setTimeout(() => {
        if (isMounted && isLoading) {
          console.warn(`Load timeout for ${mediaItem.title}`);
          setError(true);
          setIsLoading(false);
          logMediaError('load timeout');
        }
      }, timeout);

      if (isOnline) {
        if (isMounted) {
          setSource(mediaItem.file_url);
          setIsLoading(false);
        }
      } else {
        try {
          const cache = await window.caches.open(CACHE_NAME);
          const response = await cache.match(mediaItem.file_url);
          
          if (response) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setSource(objectUrl);
              setIsLoading(false);
            }
          } else {
            console.warn(`Media ${mediaItem.title} not found in cache for offline playback.`);
            if (isMounted) {
              setError(true);
              setIsLoading(false);
              logMediaError('not in cache');
            }
          }
        } catch (err) {
          console.error("Error loading from cache:", err);
          if (isMounted) {
            setError(true);
            setIsLoading(false);
            logMediaError('cache error');
          }
        }
      }
    };

    loadSource();

    return () => {
      isMounted = false;
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaItem, isOnline, isLoading, logMediaError]);

  useEffect(() => {
    if (error) {
      console.log(`Error displaying ${mediaItem?.title || 'media'}, skipping...`);
      const errorTimer = setTimeout(() => {
        onNext();
      }, 1000);
      return () => clearTimeout(errorTimer);
    }
  }, [error, onNext, mediaItem]);

  const handleMediaLoad = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
  };

  const handleMediaError = (reason) => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setError(true);
    logMediaError(reason || 'media error');
  };

  if (isLoading || !source) {
    return <MessageDisplay title="Loading..." details={`Preparing: ${mediaItem?.title || 'media'}`} loader />;
  }

  if (mediaItem.type === 'image') {
    return (
      <img 
        src={source} 
        style={styles.media} 
        alt={mediaItem.title}
        onLoad={handleMediaLoad}
        onError={() => handleMediaError('image load failed')}
      />
    );
  }

  if (mediaItem.type === 'video') {
    return (
      <video 
        key={source}
        src={source} 
        style={styles.media} 
        autoPlay 
        muted={muted}
        loop={false}
        onEnded={onNext}
        onError={() => handleMediaError('video error')}
        onLoadedData={handleMediaLoad}
        onCanPlay={handleMediaLoad}
      />
    );
  }

  return <MessageDisplay title="Unsupported" details={`Media type "${mediaItem.type}" not supported.`} />;
};

const styles = {
  media: {
    width: '100%', height: '100%', objectFit: 'contain'
  },
  messageContainer: {
    backgroundColor: 'rgba(30,30,30,0.8)', padding: '40px 60px',
    borderRadius: '15px', textAlign: 'center'
  },
  messageTitle: { fontSize: '40px', fontWeight: 'bold', margin: '0 0 10px 0' },
  messageDetails: { fontSize: '20px', margin: 0, color: '#ccc' },
  loader: {
    border: '4px solid #f3f3f3', borderTop: '4px solid #3498db',
    borderRadius: '50%', width: '40px', height: '40px',
    animation: 'spin 1s linear infinite', margin: '0 auto 20px auto'
  }
};

export default MediaRenderer;