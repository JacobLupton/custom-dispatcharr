import React, { useEffect, useRef, useState } from 'react';
import mpegts from 'mpegts.js';
import Hls from 'hls.js';
import { ActionIcon, Loader, Text, Tooltip } from '@mantine/core';
import { Copy, Maximize2, Minimize2, PictureInPicture2, X } from 'lucide-react';
import {
  useAuthStore,
  useVideoStore,
  getPlayerPrefs,
  savePlayerPrefs,
  getLivePlayerErrorMessage,
  showNotification,
} from '@core/upstream';

const absolute = (url) =>
  url?.startsWith('/') ? `${window.location.origin}${url}` : url;

const withRecordingToken = (url) => {
  if (!url?.includes('/api/channels/recordings/')) return url;
  const token = useAuthStore.getState().accessToken;
  if (!token) return url;
  const [base, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  params.set('token', token);
  return `${base}?${params}`;
};

const isHlsUrl = (url) =>
  typeof url === 'string' && (url.includes('.m3u8') || url.includes('/hls/index'));

/**
 * Touch-first player that replaces upstream's draggable FloatingVideo.
 * Driven by upstream's useVideoStore, so every upstream component that calls
 * showVideo() (VOD modal, recordings, program details...) plays here too.
 *
 * Phones: full-screen sheet. Desktop: docked mini player that can expand.
 */
export default function Player() {
  const { isVisible, streamUrl, contentType, metadata, hideVideo } = useVideoStore();
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!isVisible || !streamUrl || !video) return undefined;
    setLoading(true);
    setError(null);

    const prefs = getPlayerPrefs();
    if (typeof prefs.volume === 'number') video.volume = prefs.volume;
    if (typeof prefs.muted === 'boolean') video.muted = prefs.muted;
    const saveVolume = () => savePlayerPrefs({ volume: video.volume, muted: video.muted });
    const ready = () => setLoading(false);
    const fail = () => {
      setLoading(false);
      setError('Playback failed. Your browser may not support this format.');
    };
    video.addEventListener('volumechange', saveVolume);
    video.addEventListener('canplay', ready);
    video.addEventListener('playing', ready);
    video.addEventListener('error', fail);

    let cleanup = () => {};
    const token = useAuthStore.getState().accessToken;

    if (contentType === 'live' && mpegts.getFeatureList().mseLivePlayback) {
      const player = mpegts.createPlayer(
        { type: 'mpegts', url: absolute(streamUrl), isLive: true, cors: true },
        {
          enableWorker: true,
          enableStashBuffer: false,
          liveBufferLatencyChasing: false,
          liveSync: false,
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: 120,
          autoCleanupMinBackwardDuration: 60,
          reuseRedirectedURL: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      player.attachMediaElement(video);
      player.on(mpegts.Events.ERROR, (type, detail) => {
        setLoading(false);
        setError(getLivePlayerErrorMessage(type, detail));
      });
      player.load();
      Promise.resolve(player.play()).catch(() => {});
      cleanup = () => {
        try {
          player.pause();
          player.unload();
          player.detachMediaElement();
          player.destroy();
        } catch {
          /* already torn down */
        }
      };
    } else if (contentType === 'live') {
      // iOS Safari has no MSE live support; try native and offer the URL.
      video.src = absolute(streamUrl);
      video.play().catch(() => {});
      cleanup = () => {
        video.removeAttribute('src');
        video.load();
      };
    } else if (isHlsUrl(streamUrl) && Hls.isSupported()) {
      const hls = new Hls({
        startPosition: 0,
        backBufferLength: 90 * 60,
        enableWorker: true,
        xhrSetup: (xhr) => {
          const t = useAuthStore.getState().accessToken;
          if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
        },
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else setError(`HLS error: ${data.details}`);
      });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(streamUrl));
      video.play().catch(() => {});
      cleanup = () => hls.destroy();
    } else {
      video.src = withRecordingToken(streamUrl);
      video.play().catch(() => {});
      cleanup = () => {
        video.removeAttribute('src');
        video.load();
      };
    }

    return () => {
      video.removeEventListener('volumechange', saveVolume);
      video.removeEventListener('canplay', ready);
      video.removeEventListener('playing', ready);
      video.removeEventListener('error', fail);
      cleanup();
    };
  }, [isVisible, streamUrl, contentType]);

  // Back button / swipe-back closes the player instead of leaving the page.
  useEffect(() => {
    if (!isVisible) return undefined;
    window.history.pushState({ dmPlayer: true }, '');
    const onPop = () => hideVideo();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.dmPlayer) window.history.back();
    };
  }, [isVisible, hideVideo]);

  if (!isVisible) return null;

  const title = metadata?.name || metadata?.title || (contentType === 'live' ? 'Live TV' : 'Video');

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(absolute(streamUrl));
      showNotification({ title: 'Stream URL copied', message: 'Paste it into VLC or another player.' });
    } catch {
      showNotification({ title: 'Stream URL', message: absolute(streamUrl), autoClose: false });
    }
  };

  const pip = async () => {
    const v = videoRef.current;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v?.requestPictureInPicture) await v.requestPictureInPicture();
      else if (v?.webkitSetPresentationMode) v.webkitSetPresentationMode('picture-in-picture');
    } catch {
      /* not supported */
    }
  };

  return (
    <div className={`dm-player ${expanded ? 'dm-player--expanded' : ''}`}>
      <div className="dm-player__bar">
        <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
          {title}
        </Text>
        <Tooltip label="Copy stream URL">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={copyUrl} aria-label="Copy stream URL">
            <Copy size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Picture in picture">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={pip} aria-label="Picture in picture">
            <PictureInPicture2 size={18} />
          </ActionIcon>
        </Tooltip>
        <ActionIcon
          className="dm-desktop-only"
          variant="subtle"
          color="gray"
          size="lg"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Shrink player' : 'Expand player'}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={hideVideo} aria-label="Close player">
          <X size={20} />
        </ActionIcon>
      </div>
      <div className="dm-player__stage">
        <video ref={videoRef} controls playsInline autoPlay className="dm-player__video" />
        {loading && !error && (
          <div className="dm-player__overlay">
            <Loader color="gray" />
          </div>
        )}
        {error && (
          <div className="dm-player__overlay">
            <Text c="red.4" ta="center" size="sm" px="md">
              {error}
            </Text>
            <Text c="dimmed" ta="center" size="xs" mt="xs" px="md">
              Tap the copy icon to open this stream in VLC or another player.
            </Text>
          </div>
        )}
      </div>
      {metadata?.description && (
        <Text className="dm-player__desc" size="sm" c="dimmed">
          {metadata.description}
        </Text>
      )}
    </div>
  );
}
