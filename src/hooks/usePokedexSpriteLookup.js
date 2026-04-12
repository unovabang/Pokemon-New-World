import { useEffect, useState, useMemo } from "react";
import { buildPokedexLookup, mergeLookupPreferFirst } from "../utils/pokedexSpriteLookup";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

/**
 * Map nom normalisé → imageUrl pour résoudre les sprites des lignes patch (Nerf/Buff).
 * @param {boolean} enabled Passer false pour ne pas requêter (ex. modal fermée).
 */
export function usePokedexSpriteLookup(enabled = true) {
  const [pokedexEntries, setPokedexEntries] = useState([]);
  const [extradexEntries, setExtradexEntries] = useState([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const t = Date.now();
    Promise.all([
      fetch(`${API_BASE}/pokedex?t=${t}`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/extradex?t=${t}`).then((r) => r.json()).catch(() => null),
    ]).then(([pdx, ext]) => {
      if (cancelled) return;
      if (pdx?.success && Array.isArray(pdx?.pokedex?.entries)) {
        setPokedexEntries(pdx.pokedex.entries);
      } else {
        setPokedexEntries([]);
      }
      if (ext?.success && Array.isArray(ext?.extradex?.entries)) {
        setExtradexEntries(ext.extradex.entries);
      } else {
        setExtradexEntries([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return useMemo(() => {
    const base = buildPokedexLookup(pokedexEntries);
    return mergeLookupPreferFirst(base, extradexEntries);
  }, [pokedexEntries, extradexEntries]);
}
