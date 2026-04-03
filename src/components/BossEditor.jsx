import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const STORAGE_KEY = "admin_boss_data";

const KNOWN_TYPES = [
  "acier", "aspic", "combat", "dragon", "eau", "electr", "fee", "feu", "glace",
  "insecte", "malice", "normal", "plante", "poison", "psy", "roche", "sol",
  "spectre", "tenebres", "vol"
];

const DIFFICULTIES = [
  { value: "facile", label: "Facile" },
  { value: "moyen", label: "Moyen" },
  { value: "difficile", label: "Difficile" },
  { value: "extreme", label: "Extrême" },
];

const EV_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const EV_LABELS = { hp: "PV", atk: "Atk", def: "Déf", spa: "Atk Spé", spd: "Déf Spé", spe: "Vit" };

const emptyPokemon = () => ({
  name: "", imageUrl: "", level: 50, types: [], ability: "",
  moves: ["", "", "", ""],
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
});

const emptyForm = () => ({
  name: "", class: "", difficulty: "moyen", artworkUrl: "", description: "",
  showReward: false, reward: "",
  showTips: false, tips: [""],
  team: [emptyPokemon()],
});

export default function BossEditor({ onSave }) {
  const [bosses, setBosses] = useState([]);
  const [background, setBackground] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const skipAutoSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/boss?t=${Date.now()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.boss) {
          setBosses(data.boss.bosses || []);
          setBackground(data.boss.background || "");
        }
      } catch {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setBosses(parsed.bosses || []);
            setBackground(parsed.background || "");
          } catch { /* ignore */ }
        }
      } finally {
        if (!cancelled) { setLoading(false); skipAutoSave.current = false; }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const saveToApi = async (newBosses, newBg) => {
    const payload = {
      title: "Boss du jeu",
      subtitle: "Affrontez les dresseurs les plus redoutables de Pokémon New World",
      background: newBg ?? background,
      bosses: newBosses ?? bosses,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (skipAutoSave.current) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE}/boss`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSaveMessage(data.success ? "Sauvegardé !" : "Erreur de sauvegarde");
    } catch {
      setSaveMessage("Erreur réseau");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const openAdd = () => {
    setForm(emptyForm());
    setEditingIndex(null);
    setShowModal(true);
  };

  const openEdit = (index) => {
    const b = bosses[index];
    setForm({
      name: b.name || "",
      class: b.class || "",
      difficulty: b.difficulty || "moyen",
      artworkUrl: b.artworkUrl || "",
      description: b.description || "",
      showReward: !!b.reward,
      reward: b.reward || "",
      showTips: !!(b.tips && b.tips.length > 0),
      tips: b.tips && b.tips.length > 0 ? [...b.tips] : [""],
      team: (b.team || []).map((p) => ({
        name: p.name || "",
        imageUrl: p.imageUrl || "",
        level: p.level || 50,
        types: Array.isArray(p.types) ? [...p.types] : [],
        ability: p.ability || "",
        moves: [...(p.moves || []), "", "", "", ""].slice(0, 4),
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...(p.evs || {}) },
      })),
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) return;
    const boss = {
      name: form.name.trim(),
      class: form.class.trim(),
      difficulty: form.difficulty,
      artworkUrl: form.artworkUrl.trim() || "",
      description: form.description.trim(),
      reward: form.showReward ? form.reward.trim() : "",
      tips: form.showTips ? form.tips.map((t) => t.trim()).filter(Boolean) : [],
      team: form.team.map((p) => ({
        name: p.name.trim(),
        imageUrl: p.imageUrl.trim(),
        level: Number(p.level) || 50,
        types: p.types.filter(Boolean),
        ability: p.ability.trim(),
        moves: p.moves.map((m) => m.trim()).filter(Boolean),
        evs: Object.fromEntries(EV_KEYS.map((k) => [k, Number(p.evs[k]) || 0])),
      })).filter((p) => p.name),
    };
    let next;
    if (editingIndex !== null) {
      next = [...bosses];
      next[editingIndex] = boss;
    } else {
      next = [...bosses, boss];
    }
    setBosses(next);
    saveToApi(next);
    setShowModal(false);
  };

  const confirmDelete = (index) => {
    const next = bosses.filter((_, i) => i !== index);
    setBosses(next);
    saveToApi(next);
    setDeleteConfirm(null);
  };

  // Form helpers
  const updateForm = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const updatePokemon = (idx, key, val) => setForm((f) => {
    const team = [...f.team];
    team[idx] = { ...team[idx], [key]: val };
    return { ...f, team };
  });
  const updatePokemonMove = (pIdx, mIdx, val) => setForm((f) => {
    const team = [...f.team];
    const moves = [...team[pIdx].moves];
    moves[mIdx] = val;
    team[pIdx] = { ...team[pIdx], moves };
    return { ...f, team };
  });
  const updatePokemonEv = (pIdx, key, val) => setForm((f) => {
    const team = [...f.team];
    const evs = { ...team[pIdx].evs, [key]: val === "" ? "" : Number(val) };
    team[pIdx] = { ...team[pIdx], evs };
    return { ...f, team };
  });
  const togglePokemonType = (pIdx, type) => setForm((f) => {
    const team = [...f.team];
    const types = team[pIdx].types.includes(type)
      ? team[pIdx].types.filter((t) => t !== type)
      : [...team[pIdx].types, type].slice(0, 2);
    team[pIdx] = { ...team[pIdx], types };
    return { ...f, team };
  });
  const addPokemon = () => setForm((f) => ({ ...f, team: [...f.team, emptyPokemon()] }));
  const removePokemon = (idx) => setForm((f) => ({ ...f, team: f.team.filter((_, i) => i !== idx) }));
  const addTip = () => setForm((f) => ({ ...f, tips: [...f.tips, ""] }));
  const removeTip = (idx) => setForm((f) => ({ ...f, tips: f.tips.filter((_, i) => i !== idx) }));
  const updateTip = (idx, val) => setForm((f) => {
    const tips = [...f.tips];
    tips[idx] = val;
    return { ...f, tips };
  });

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div className="boss-editor">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: ".75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.3rem" }}><i className="fa-solid fa-crown" style={{ color: "rgba(251,191,36,.8)", marginRight: ".5rem" }} />Boss du jeu ({bosses.length})</h2>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          {saveMessage && <span style={{ fontSize: ".8rem", color: saving ? "var(--muted)" : "rgba(74,222,128,.9)" }}>{saveMessage}</span>}
          <button type="button" onClick={openAdd} className="admin-pokedex-btn admin-pokedex-btn-primary">
            <i className="fa-solid fa-plus" /> Ajouter un boss
          </button>
        </div>
      </div>

      {bosses.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Aucun boss. Cliquez sur "Ajouter un boss".</p>
      ) : (
        <div className="admin-dex-grid">
          {bosses.map((b, i) => (
            <div
              key={`${b.name}-${i}`}
              className="admin-dex-card"
              role="button"
              tabIndex={0}
              onClick={() => openEdit(i)}
              onKeyDown={(e) => e.key === "Enter" && openEdit(i)}
            >
              <button
                type="button"
                className="admin-dex-card-delete"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(i); }}
                title="Supprimer"
              >
                <i className="fa-solid fa-trash" />
              </button>
              <div className="admin-dex-card-sprite">
                {b.artworkUrl ? (
                  <img src={b.artworkUrl} alt="" onError={(e) => (e.target.style.display = "none")} />
                ) : (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,.3)", fontSize: "1.5rem" }}><i className="fa-solid fa-crown" /></span>
                )}
              </div>
              <span className="admin-dex-card-name">{b.class} {b.name}</span>
              <span className="admin-dex-card-types">{b.team?.length || 0} Pokémon • {(b.difficulty || "moyen").charAt(0).toUpperCase() + (b.difficulty || "moyen").slice(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout / édition */}
      {showModal && createPortal(
        <div className="admin-pokedex-modal-overlay" onClick={() => setShowModal(false)} role="dialog" aria-modal="true">
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "750px", maxHeight: "90vh", overflow: "auto" }}>
            <div className="admin-pokedex-modal-header">
              <h2 className="admin-pokedex-modal-title">
                {editingIndex !== null ? "Modifier le boss" : "Ajouter un boss"}
              </h2>
              <button type="button" className="admin-pokedex-modal-close" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="admin-pokedex-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Nom + Classe */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <div>
                  <label className="admin-pokedex-label">Nom *</label>
                  <input type="text" className="admin-pokedex-input" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Vice" />
                </div>
                <div>
                  <label className="admin-pokedex-label">Classe *</label>
                  <input type="text" className="admin-pokedex-input" value={form.class} onChange={(e) => updateForm("class", e.target.value)} placeholder="Archéologue" />
                </div>
              </div>

              {/* Difficulté */}
              <div>
                <label className="admin-pokedex-label">Difficulté</label>
                <select className="admin-pokedex-input" value={form.difficulty} onChange={(e) => updateForm("difficulty", e.target.value)} style={{ cursor: "pointer" }}>
                  {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              {/* Artwork URL */}
              <div>
                <label className="admin-pokedex-label">URL Artwork</label>
                <input type="url" className="admin-pokedex-input" value={form.artworkUrl} onChange={(e) => updateForm("artworkUrl", e.target.value)} placeholder="https://..." />
                {form.artworkUrl?.trim() && (
                  <div style={{ marginTop: ".5rem", width: "80px", height: "80px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,.2)", background: "rgba(0,0,0,.2)" }}>
                    <img src={form.artworkUrl.trim()} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => (e.target.style.display = "none")} />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="admin-pokedex-label">Description</label>
                <textarea className="admin-pokedex-textarea" value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Description du boss..." rows={2} />
              </div>

              {/* Récompense (optionnel) */}
              <div>
                <label className="admin-pokedex-label" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <input type="checkbox" checked={form.showReward} onChange={(e) => updateForm("showReward", e.target.checked)} />
                  Afficher récompense
                </label>
                {form.showReward && (
                  <input type="text" className="admin-pokedex-input" value={form.reward} onChange={(e) => updateForm("reward", e.target.value)} placeholder="9720 ₱" style={{ marginTop: ".35rem" }} />
                )}
              </div>

              {/* Astuces (optionnel) */}
              <div>
                <label className="admin-pokedex-label" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <input type="checkbox" checked={form.showTips} onChange={(e) => updateForm("showTips", e.target.checked)} />
                  Afficher astuces
                </label>
                {form.showTips && (
                  <div style={{ marginTop: ".35rem", display: "flex", flexDirection: "column", gap: ".3rem" }}>
                    {form.tips.map((tip, idx) => (
                      <div key={idx} style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                        <input type="text" className="admin-pokedex-input" style={{ flex: 1, marginBottom: 0 }} value={tip} onChange={(e) => updateTip(idx, e.target.value)} placeholder={`Astuce ${idx + 1}`} />
                        {form.tips.length > 1 && (
                          <button type="button" className="admin-pokedex-btn admin-pokedex-btn-danger" style={{ padding: ".4rem .6rem", fontSize: ".8rem" }} onClick={() => removeTip(idx)}><i className="fa-solid fa-xmark" /></button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: ".3rem .7rem", fontSize: ".8rem", marginTop: ".2rem", width: "fit-content" }} onClick={addTip}>
                      <i className="fa-solid fa-plus" /> Ajouter une astuce
                    </button>
                  </div>
                )}
              </div>

              {/* Équipe */}
              <div>
                <label className="admin-pokedex-label" style={{ fontSize: ".85rem", fontWeight: 700 }}>
                  <i className="fa-solid fa-users" style={{ marginRight: ".35rem" }} /> Équipe ({form.team.length})
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", marginTop: ".5rem" }}>
                  {form.team.map((poke, pIdx) => (
                    <div key={pIdx} style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "12px", padding: ".85rem", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
                        <span style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--muted)" }}>Pokémon {pIdx + 1}</span>
                        {form.team.length > 1 && (
                          <button type="button" className="admin-pokedex-btn admin-pokedex-btn-danger" style={{ padding: ".3rem .5rem", fontSize: ".75rem" }} onClick={() => removePokemon(pIdx)}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        )}
                      </div>

                      {/* Nom + Niveau */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: ".5rem", marginBottom: ".5rem" }}>
                        <input type="text" className="admin-pokedex-input" value={poke.name} onChange={(e) => updatePokemon(pIdx, "name", e.target.value)} placeholder="Nom du Pokémon" style={{ marginBottom: 0 }} />
                        <input type="number" className="admin-pokedex-input" value={poke.level} onChange={(e) => updatePokemon(pIdx, "level", e.target.value)} placeholder="Nv" style={{ marginBottom: 0 }} />
                      </div>

                      {/* URL image */}
                      <input type="url" className="admin-pokedex-input" value={poke.imageUrl} onChange={(e) => updatePokemon(pIdx, "imageUrl", e.target.value)} placeholder="URL sprite (optionnel)" style={{ marginBottom: ".5rem" }} />

                      {/* Types */}
                      <div style={{ marginBottom: ".5rem" }}>
                        <span style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Types (max 2)</span>
                        <div className="admin-pokedex-type-chips" style={{ marginTop: ".25rem" }}>
                          {KNOWN_TYPES.map((t) => (
                            <button key={t} type="button" onClick={() => togglePokemonType(pIdx, t)} className={`admin-pokedex-type-chip ${poke.types.includes(t) ? "selected" : ""}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Talent */}
                      <input type="text" className="admin-pokedex-input" value={poke.ability} onChange={(e) => updatePokemon(pIdx, "ability", e.target.value)} placeholder="Talent (ex: Intimidation)" style={{ marginBottom: ".5rem" }} />

                      {/* Attaques */}
                      <div style={{ marginBottom: ".5rem" }}>
                        <span style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Attaques</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".35rem", marginTop: ".25rem" }}>
                          {poke.moves.map((m, mIdx) => (
                            <input key={mIdx} type="text" className="admin-pokedex-input" value={m} onChange={(e) => updatePokemonMove(pIdx, mIdx, e.target.value)} placeholder={`Attaque ${mIdx + 1}`} style={{ marginBottom: 0 }} />
                          ))}
                        </div>
                      </div>

                      {/* EVs */}
                      <div>
                        <span style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>EVs</span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: ".3rem", marginTop: ".25rem" }}>
                          {EV_KEYS.map((k) => (
                            <div key={k} style={{ textAlign: "center" }}>
                              <span style={{ fontSize: ".65rem", color: "var(--muted)", display: "block" }}>{EV_LABELS[k]}</span>
                              <input type="number" className="admin-pokedex-input" value={poke.evs[k]} onChange={(e) => updatePokemonEv(pIdx, k, e.target.value)} style={{ marginBottom: 0, textAlign: "center", padding: ".35rem .2rem", fontSize: ".8rem" }} min={0} max={252} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ width: "fit-content" }} onClick={addPokemon}>
                    <i className="fa-solid fa-plus" /> Ajouter un Pokémon
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-pokedex-modal-footer">
              <button type="button" onClick={() => setShowModal(false)} className="admin-pokedex-btn admin-pokedex-btn-ghost">Annuler</button>
              <button type="button" onClick={saveForm} className="admin-pokedex-btn admin-pokedex-btn-primary">
                <i className="fa-solid fa-check" /> {editingIndex !== null ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation suppression */}
      {deleteConfirm !== null && createPortal(
        <div className="admin-pokedex-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-pokedex-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: "0 0 1.25rem 0", color: "rgba(255,255,255,.9)", fontSize: "1rem" }}>
              Supprimer « {bosses[deleteConfirm]?.name} » ?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="admin-pokedex-btn admin-pokedex-btn-ghost">Annuler</button>
              <button type="button" onClick={() => confirmDelete(deleteConfirm)} className="admin-pokedex-btn admin-pokedex-btn-danger">
                <i className="fa-solid fa-trash" /> Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
