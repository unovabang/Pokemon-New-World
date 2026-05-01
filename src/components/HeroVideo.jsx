import { useEffect, useState } from "react";

/**
 * Hero video YouTube avec chargement différé de l'iframe.
 *
 * - Au mount : affiche immédiatement le poster YouTube (image légère ~30-80 KB)
 *   en `fetchpriority="high"` → c'est ce que LCP mesurera (rapide).
 * - Après le load complet de la page (+ ~600 ms de marge), on remplace le poster
 *   par l'iframe avec `autoplay=1` → la vidéo démarre automatiquement, l'utilisateur
 *   ne perd rien en perception (continuité visuelle entre poster et premier frame).
 *
 * Permet de garder l'autoplay tout en sortant l'iframe YouTube (~250 KB de scripts)
 * du chemin critique du LCP / FCP.
 */
export default function HeroVideo({ videoId, children }) {
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    let raf, idleHandle, timer;
    const trigger = () => setShowIframe(true);
    const schedule = () => {
      // Ajoute un petit buffer après load pour laisser le LCP se mesurer sur le poster.
      timer = setTimeout(trigger, 600);
    };
    if (document.readyState === "complete") {
      // Page déjà chargée : programme l'iframe en idle / next tick.
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(schedule, { timeout: 2500 });
      } else {
        raf = requestAnimationFrame(schedule);
      }
    } else {
      window.addEventListener("load", schedule, { once: true });
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      if (idleHandle && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      window.removeEventListener("load", schedule);
    };
  }, [videoId]);

  if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
    return (
      <div className="hero-video">
        <div className="overlay" />
        <div className="copy">{children}</div>
      </div>
    );
  }

  const id = videoId.trim();
  const posterUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  const posterFallback = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  const iframeSrc = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1`;

  return (
    <div className="hero-video">
      <div className="video">
        {showIframe ? (
          <iframe
            src={iframeSrc}
            title="Trailer Pokémon New World"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
          />
        ) : (
          <img
            src={posterUrl}
            alt=""
            className="hero-video-poster"
            fetchpriority="high"
            decoding="async"
            onError={(e) => {
              if (e.currentTarget.src !== posterFallback) {
                e.currentTarget.src = posterFallback;
              }
            }}
          />
        )}
      </div>
      <div className="overlay" />
      <div className="copy">{children}</div>
    </div>
  );
}
