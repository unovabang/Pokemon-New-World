import { useState, useEffect, useMemo } from "react";
import { NerfBuffGrid, NerfBuffModal, NERFBUFF_DISPLAY_SECTIONS } from "../pages/NerfsAndBuffsPage";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

function normalizeNerfsBuffs(nb) {
  if (!nb || typeof nb !== "object") {
    return { nerfs: [], buffs: [], ajustements: [] };
  }
  return {
    nerfs: Array.isArray(nb.nerfs) ? nb.nerfs : [],
    buffs: Array.isArray(nb.buffs) ? nb.buffs : [],
    ajustements: Array.isArray(nb.ajustements) ? nb.ajustements : [],
  };
}

/**
 * Affiche les blocs Nerf / Buff / Ajustement (grille + modale) dans une note de patch,
 * comme sur la page publique Équilibrage.
 */
export default function PatchNotesNerfsBuffsSection({ nerfsBuffs, idPrefix = "patch-nb" }) {
  const [pokedexList, setPokedexList] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const data = useMemo(() => normalizeNerfsBuffs(nerfsBuffs), [nerfsBuffs]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/pokedex?t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res?.pokedex && Array.isArray(res.pokedex.entries)) {
          setPokedexList(res.pokedex.entries);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const totalCount =
    data.nerfs.length + data.buffs.length + data.ajustements.length;

  return (
    <div className="patchnotes-nerfbuff-block">
      {totalCount > 0 && (
        <p className="patchnotes-nerfbuff-count">
          <i className="fa-solid fa-list-check" aria-hidden />
          {totalCount} Pokémon concerné{totalCount !== 1 ? "s" : ""}
        </p>
      )}
      <div className="nerfbuff-sections-wrap patchnotes-nerfbuff-sections-wrap">
        {NERFBUFF_DISPLAY_SECTIONS.map((s) => (
          <NerfBuffGrid
            key={s.id}
            id={s.id}
            title={s.title}
            icon={s.icon}
            entries={data[s.id]}
            pokedexList={pokedexList}
            onSelect={setSelectedEntry}
            idPrefix={idPrefix}
          />
        ))}
      </div>
      {selectedEntry && (
        <NerfBuffModal
          entry={selectedEntry}
          pokedexList={pokedexList}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
