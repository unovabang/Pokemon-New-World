
import { useEffect, useRef, useState } from "react";

// Charge l'API IFrame de YouTube une seule fois
let ytPromise;
function loadYT() {
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.id = "yt-iframe-api";
      document.body.appendChild(tag);
    }
    const ready = () => resolve(window.YT);
    if (window.YT && window.YT.Player) ready();
    else window.onYouTubeIframeAPIReady = ready;
  });
  return ytPromise;
}

/**
 * Lecteur audio discret pour bande-son YouTube
 * - play/pause
 * - volume (0–100) avec menu burger expandable
 */
export default function YouTubeAudio({
  videoId,
  autoplay = true,
  startVolume = 50,
  show = true,
}) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState("paused"); // 'playing' | 'paused'
  const [volume, setVolume] = useState(startVolume);
  const [ready, setReady] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  // Init du player
  useEffect(() => {
    if (!show) return;
    let player;
    loadYT().then((YT) => {
      if (!containerRef.current) return;
      player = new YT.Player(containerRef.current, {
        height: "0",
        width: "0",
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          loop: 1,
          playlist: videoId,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
            try {
              e.target.setVolume(startVolume);
            } catch {}
            setReady(true);
            if (autoplay) {
              const p = e.target.playVideo?.();
              if (p?.catch) p.catch(() => setStatus("paused"));
            }
          },
          onStateChange: (e) => {
            if (e.data === 1) setStatus("playing");
            if (e.data === 2) setStatus("paused");
          },
        },
      });
    });
    return () => {
      try {
        player?.destroy();
      } catch {}
    };
  }, [videoId, autoplay, startVolume, show]);

  const toggle = () => {
    const p = playerRef.current;
    if (!p) return;
    const st = p.getPlayerState?.();
    if (st === 1) {
      p.pauseVideo();
      setStatus("paused");
    } else {
      try {
        p.unMute?.();
      } catch {}
      p.playVideo?.();
      setStatus("playing");
    }
  };

  const toggleVolumeMenu = () => {
    setIsVolumeOpen(!isVolumeOpen);
  };

  const onVol = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    const p = playerRef.current;
    if (!p) return;
    try {
      p.unMute?.();
      p.setVolume?.(v);
      if (p.getPlayerState?.() !== 1) p.playVideo?.();
      setStatus("playing");
    } catch {}
  };

  if (!show) return null;

  return (
    <div className="audio" role="group" aria-label="Lecteur audio">
      {/* iframe caché */}
      <div ref={containerRef} aria-hidden="true" />
      {/* UI */}
      <div className="card panel">
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggle}
          disabled={!ready}
          title={status === "playing" ? "Pause" : "Lecture"}
        >
          <i
            className={`fa-solid ${status === "playing" ? "fa-pause" : "fa-play"}`}
            aria-hidden="true"
          />
          <span className="sr-only">
            {status === "playing" ? "Pause" : "Lecture"}
          </span>
        </button>
        
        {/* Bouton burger pour le volume */}
        <button
          className="btn btn-ghost btn-icon volume-burger"
          onClick={toggleVolumeMenu}
          disabled={!ready}
          title="Volume"
        >
          <i className="fa-solid fa-bars" aria-hidden="true" />
          <span className="sr-only">Volume</span>
        </button>

        {/* Menu volume expandable */}
        {isVolumeOpen && (
          <div className="volume-menu">
            <i className="fa-solid fa-volume-low" aria-hidden="true"></i>
            <input
              className="vol"
              type="range"
              min="0"
              max="100"
              step="1"
              value={volume}
              onChange={onVol}
              aria-label="Volume"
            />
          </div>
        )}
      </div>
    </div>
  );
}
