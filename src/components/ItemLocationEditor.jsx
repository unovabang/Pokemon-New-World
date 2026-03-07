import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const ItemLocationEditor = ({ onSave }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: null });

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/config/item-location?t=${Date.now()}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.config?.entries)) {
        setEntries(data.config.entries.map((e) => ({ zone: e.zone || '', item: e.item || '', obtention: e.obtention || '' })));
      } else {
        setEntries([]);
      }
    } catch (e) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showMessage = (title, message, type = 'info') => {
    setModalConfig({ title, message, type, onConfirm: null });
    setShowModal(true);
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({ title, message, type: 'confirm', onConfirm });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalConfig({ title: '', message: '', type: 'info', onConfirm: null });
  };

  const updateRow = (index, field, value) => {
    setEntries((prev) => {
      const next = [...prev];
      if (!next[index]) return next;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRow = () => {
    setEntries((prev) => [...prev, { zone: '', item: '', obtention: '' }]);
  };

  const removeRow = (index) => {
    showConfirm('Supprimer la ligne', 'Supprimer cette entrée ?', () => {
      setEntries((prev) => prev.filter((_, i) => i !== index));
      showMessage('Succès', 'Entrée supprimée.', 'success');
    });
  };

  const moveRow = (index, dir) => {
    if (dir === 'up' && index <= 0) return;
    if (dir === 'down' && index >= entries.length - 1) return;
    setEntries((prev) => {
      const next = [...prev];
      const swap = dir === 'up' ? index - 1 : index + 1;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = { entries: entries.map((e) => ({ zone: e.zone.trim(), item: e.item.trim(), obtention: e.obtention.trim() })) };
      const res = await fetch(`${API_BASE}/config/item-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      const data = await res.json();
      if (data?.success) {
        onSave?.(config);
        showMessage('Sauvegardé', 'Item Location mis à jour.', 'success');
      } else {
        throw new Error(data?.error || 'Erreur');
      }
    } catch (e) {
      showMessage('Erreur', e.message || 'Impossible de sauvegarder.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="item-location-editor">
      <div className="item-location-editor-head">
        <h2><i className="fa-solid fa-location-dot" /> Item Location</h2>
        <div className="item-location-editor-actions">
          <button type="button" className="btn btn-primary" onClick={addRow}>
            <i className="fa-solid fa-plus" /> Ajouter une ligne
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement…</> : <><i className="fa-solid fa-save" /> Sauvegarder</>}
          </button>
        </div>
      </div>

      <p className="item-location-editor-desc">
        Les entrées sont affichées sur la page publique par zone. Même zone = même bloc ; l’ordre des lignes est conservé.
      </p>

      {loading ? (
        <div className="item-location-editor-loading">
          <i className="fa-solid fa-spinner fa-spin" /> Chargement…
        </div>
      ) : (
        <div className="item-location-editor-table-wrap">
          <table className="item-location-editor-table">
            <thead>
              <tr>
                <th className="th-ordre" style={{ width: '90px' }}>Ordre</th>
                <th style={{ width: '18%' }}>Zone</th>
                <th style={{ width: '22%' }}>Objet</th>
                <th style={{ width: '32%' }}>Obtention</th>
                <th className="th-actions" style={{ width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="item-location-editor-empty">
                    Aucune entrée. Cliquez sur « Ajouter une ligne ».
                  </td>
                </tr>
              ) : (
                entries.map((row, index) => (
                  <tr key={index}>
                    <td className="td-ordre">
                      <div className="item-location-editor-order">
                        <button type="button" onClick={() => moveRow(index, 'up')} disabled={index === 0} title="Monter"><i className="fa-solid fa-chevron-up" /></button>
                        <span>{index + 1}</span>
                        <button type="button" onClick={() => moveRow(index, 'down')} disabled={index === entries.length - 1} title="Descendre"><i className="fa-solid fa-chevron-down" /></button>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.zone}
                        onChange={(e) => updateRow(index, 'zone', e.target.value)}
                        placeholder="ex. Liora"
                        className="item-location-editor-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => updateRow(index, 'item', e.target.value)}
                        placeholder="ex. Pokéball x5"
                        className="item-location-editor-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.obtention}
                        onChange={(e) => updateRow(index, 'obtention', e.target.value)}
                        placeholder="ex. Item au sol"
                        className="item-location-editor-input"
                      />
                    </td>
                    <td className="td-actions">
                      <button type="button" className="item-location-editor-delete" onClick={() => removeRow(index)} title="Supprimer">
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="admin-pokedex-modal-overlay" onClick={closeModal}>
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#fff' }}>{modalConfig.title}</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.85)' }}>{modalConfig.message}</p>
            <div className="admin-modal-buttons" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {modalConfig.type === 'confirm' ? (
                <>
                  <button type="button" className="btn btn-danger" onClick={() => { closeModal(); modalConfig.onConfirm?.(); }}>Confirmer</button>
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>Annuler</button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={closeModal}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemLocationEditor;
