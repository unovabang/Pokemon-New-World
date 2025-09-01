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
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    if (window.YT && window.YT.Player) resolve(window.YT);
  });
  return ytPromise;
}

/** Lecteur audio discret (bouton play/pause + volume au survol) */
export default function YouTubeAudio({
  videoId,
  autoplay = true,
  startVolume = 1,
  show = true,
}) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState("paused"); // 'playing' | 'paused'
  const [volume, setVolume] = useState(startVolume);
  const [ready, setReady] = useState(false);

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
        },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
            try {
              e.target.setVolume(startVolume);
            } catch {}
            setReady(true);
            if (autoplay) {
              const p = e.target.playVideo();
              if (p?.catch) {
                p.catch(() => setStatus("paused"));
              }
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
    if (!playerRef.current) return;
    const st = playerRef.current.getPlayerState?.();
    if (st === 1) {
      playerRef.current.pauseVideo();
      setStatus("paused");
    } else {
      playerRef.current.playVideo();
      setStatus("playing");
    }
  };

  const onVol = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    try {
      playerRef.current?.setVolume(v);
    } catch {}
  };

  if (!show) return null;

  return (
    <div className="audio">
      {/* IFRAME caché */}
      <div ref={containerRef} aria-hidden="true" />
      {/* Contrôles minimaux */}
      <div className="card panel">
        <button
          className="icon"
          onClick={toggle}
          disabled={!ready}
          title={status === "playing" ? "Pause" : "Lecture"}
        >
          <i
            className={`fa-solid ${status === "playing" ? "fa-pause" : "fa-play"}`}
            aria-hidden="true"
          ></i>
        </button>
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
    </div>
  );
}
