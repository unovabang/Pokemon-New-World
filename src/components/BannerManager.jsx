import { useState, useEffect } from 'react';
import { authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const BannerManager = ({ onSave }) => {
  const [banners, setBanners] = useState([]);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [bannerMaxHeight, setBannerMaxHeight] = useState(400);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  const loadNewsConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/config/news?t=${Date.now()}`);
      const data = await res.json();
      if (data?.success && data?.config) {
        const cfg = data.config;
        const list = Array.isArray(cfg.banners) ? cfg.banners : [];
        setBanners(list.map(b => ({ url: b.url || b.image || '', position: b.position ?? list.indexOf(b) + 1 })));
        setIntervalMs(typeof cfg.interval === 'number' ? cfg.interval : 5000);
        setBannerMaxHeight(typeof cfg.bannerMaxHeight === 'number' ? Math.max(150, Math.min(1200, cfg.bannerMaxHeight)) : 400);
      }
    } catch (e) {
      console.error('Erreur chargement config news:', e);
      setBanners([]);
      setIntervalMs(5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewsConfig();
  }, []);

  const addBanner = () => {
    const url = (newUrl || '').trim();
    if (!url) {
      showMessage('URL requise', 'Indiquez une URL d’image (https://…).', 'info');
      return;
    }
    const nextPos = banners.length ? Math.max(...banners.map(b => b.position), 0) + 1 : 1;
    const next = [...banners, { url, position: nextPos }];
    setBanners(next);
    setNewUrl('');
    saveConfig({ banners: next, intervalMs });
  };

  const removeBanner = (index) => {
    showConfirm(
      'Supprimer la bannière',
      'Retirer cette bannière de la rotation ?',
      () => {
        const next = banners.filter((_, i) => i !== index).map((b, i) => ({ ...b, position: i + 1 }));
        setBanners(next);
        showMessage('Succès', 'Bannière supprimée.', 'success');
        saveConfig({ banners: next, intervalMs });
      }
    );
  };

  const moveBanner = (index, direction) => {
    if (direction === 'up' && index <= 0) return;
    if (direction === 'down' && index >= banners.length - 1) return;
    const next = [...banners];
    const swap = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[swap]] = [next[swap], next[index]];
    const reordered = next.map((b, i) => ({ ...b, position: i + 1 }));
    setBanners(reordered);
    saveConfig({ banners: reordered, intervalMs });
  };

  const saveConfig = async (payload) => {
    const list = payload?.banners ?? banners;
    const interval = payload?.intervalMs ?? intervalMs;
    const maxH = payload?.bannerMaxHeight ?? bannerMaxHeight;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/config/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          config: {
            banners: (Array.isArray(list) ? list : banners).map((b, i) => ({ url: b.url, position: i + 1 })),
            interval: interval,
            bannerMaxHeight: typeof maxH === 'number' ? Math.max(150, Math.min(1200, maxH)) : 400
          }
        })
      });
      const data = await res.json();
      if (data?.success) {
        onSave?.();
        showMessage('Sauvegardé', 'Les bannières ont été enregistrées.', 'success');
      } else {
        throw new Error(data?.error || 'Erreur sauvegarde');
      }
    } catch (e) {
      showMessage('Erreur', e.message || 'Impossible de sauvegarder.', 'error');
    } finally {
      setSaving(false);
    }
  };

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

  const sortedBanners = [...banners].sort((a, b) => (a.position || 0) - (b.position || 0));

  return (
    <div className="banner-manager">
      <header className="banner-manager-header">
        <h2><i className="fa-solid fa-images"></i> Bannières d’actualités</h2>
        <button type="button" onClick={saveConfig} disabled={saving} className="btn btn-primary">
          {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Enregistrement…</> : <><i className="fa-solid fa-save"></i> Sauvegarder</>}
        </button>
      </header>

      <div className="banner-manager-info">
        <div className="banner-manager-info-icon"><i className="fa-solid fa-link"></i></div>
        <div>
          <h3>Liens externes uniquement</h3>
          <p>Ajoutez des bannières via des <strong>URLs d’images</strong> (hébergement externe). Aucun upload sur le serveur.</p>
          <ul>
            <li>Format recommandé : <strong>1200×300 px</strong>, PNG ou JPG</li>
            <li>Utilisez des hébergeurs autorisant l’affichage externe (ex. postimg.cc, imgur)</li>
            <li>Les bannières défilent en rotation sur la page d’accueil</li>
          </ul>
        </div>
      </div>

      <div className="banner-manager-add">
        <label className="banner-manager-add-label">Nouvelle bannière (URL)</label>
        <div className="banner-manager-add-row">
          <input
            type="url"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBanner())}
            placeholder="https://exemple.com/image.png"
            className="banner-manager-add-input"
          />
          <button type="button" onClick={addBanner} className="btn btn-primary">
            <i className="fa-solid fa-plus"></i> Ajouter
          </button>
        </div>
      </div>

      <div className="banner-manager-interval">
        <label>Intervalle de rotation (ms)</label>
        <input
          type="number"
          min={2000}
          max={30000}
          step={1000}
          value={intervalMs}
          onChange={e => {
          const v = Number(e.target.value) || 5000;
          setIntervalMs(v);
          saveConfig({ banners, intervalMs: v, bannerMaxHeight });
        }}
        />
      </div>

      <div className="banner-manager-max-height">
        <label>Hauteur max des bannières (px)</label>
        <input
          type="number"
          min={150}
          max={1200}
          step={50}
          value={bannerMaxHeight}
          onChange={e => {
            const v = Math.max(150, Math.min(1200, Number(e.target.value) || 400));
            setBannerMaxHeight(v);
            saveConfig({ banners, intervalMs, bannerMaxHeight: v });
          }}
        />
        <span className="banner-manager-max-height-hint">Les images seront rognées à cette hauteur sur le site.</span>
      </div>

      <section className="banner-manager-list">
        <h3><i className="fa-solid fa-list"></i> Bannières ({sortedBanners.length})</h3>

        {loading ? (
          <div className="banner-manager-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Chargement…</span>
          </div>
        ) : sortedBanners.length === 0 ? (
          <div className="banner-manager-empty">
            <i className="fa-solid fa-image"></i>
            <p>Aucune bannière. Ajoutez une URL ci‑dessus.</p>
          </div>
        ) : (
          <ul className="banner-manager-cards">
            {sortedBanners.map((banner, index) => (
              <li key={`${banner.url}-${index}`} className="banner-manager-card">
                <div
                  className="banner-manager-card-preview"
                  style={{ backgroundImage: banner.url ? `url(${banner.url})` : undefined }}
                />
                <div className="banner-manager-card-body">
                  <span className="banner-manager-card-url" title={banner.url}>{banner.url || '—'}</span>
                  <div className="banner-manager-card-actions">
                    <div className="banner-manager-card-order">
                      <button
                        type="button"
                        onClick={() => moveBanner(index, 'up')}
                        disabled={index === 0}
                        title="Monter"
                        aria-label="Monter"
                      ><i className="fa-solid fa-chevron-up"></i></button>
                      <span>#{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => moveBanner(index, 'down')}
                        disabled={index === sortedBanners.length - 1}
                        title="Descendre"
                        aria-label="Descendre"
                      ><i className="fa-solid fa-chevron-down"></i></button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBanner(index)}
                      className="banner-manager-card-delete"
                      title="Supprimer"
                    >
                      <i className="fa-solid fa-trash"></i> Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {sortedBanners.length > 0 && (
          <div className="banner-manager-rotation-preview">
            <span className="banner-manager-rotation-label">Ordre de rotation</span>
            <div className="banner-manager-rotation-dots">
              {sortedBanners.map((b, i) => (
                <span key={i} className="banner-manager-rotation-dot">{i + 1}</span>
              ))}
              <span className="banner-manager-rotation-loop"><i className="fa-solid fa-repeat"></i></span>
            </div>
          </div>
        )}
      </section>

      {showModal && (
        <div className="banner-manager-modal-overlay" onClick={closeModal}>
          <div className="banner-manager-modal" onClick={e => e.stopPropagation()}>
            <div className="banner-manager-modal-icon">
              {modalConfig.type === 'success' && <i className="fa-solid fa-check-circle"></i>}
              {modalConfig.type === 'error' && <i className="fa-solid fa-exclamation-triangle"></i>}
              {modalConfig.type === 'confirm' && <i className="fa-solid fa-question-circle"></i>}
              {modalConfig.type === 'info' && <i className="fa-solid fa-info-circle"></i>}
            </div>
            <h3>{modalConfig.title}</h3>
            <p>{modalConfig.message}</p>
            <div className="banner-manager-modal-buttons">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button type="button" className="btn btn-danger" onClick={() => { closeModal(); modalConfig.onConfirm?.(); }}>
                    <i className="fa-solid fa-check"></i> Confirmer
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>
                    <i className="fa-solid fa-times"></i> Annuler
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={closeModal}>
                  <i className="fa-solid fa-check"></i> OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .banner-manager { --bm-accent: #3b82f6; --bm-bg: rgba(255,255,255,0.05); --bm-border: rgba(255,255,255,0.12); }
        .banner-manager-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .banner-manager-header h2 { margin: 0; font-size: 1.35rem; display: flex; align-items: center; gap: 0.5rem; color: #fff; }
        .banner-manager-info { display: flex; gap: 1rem; padding: 1.25rem 1.5rem; background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06)); border: 1px solid rgba(59,130,246,0.25); border-radius: 12px; margin-bottom: 1.5rem; }
        .banner-manager-info-icon { width: 48px; height: 48px; border-radius: 10px; background: rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--bm-accent); flex-shrink: 0; }
        .banner-manager-info h3 { margin: 0 0 0.35rem 0; font-size: 1rem; color: #e2e8f0; }
        .banner-manager-info p { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: rgba(255,255,255,0.8); line-height: 1.4; }
        .banner-manager-info ul { margin: 0; padding-left: 1.25rem; font-size: 0.85rem; color: rgba(255,255,255,0.75); }
        .banner-manager-add { margin-bottom: 1.5rem; }
        .banner-manager-add-label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; color: #e2e8f0; }
        .banner-manager-add-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .banner-manager-add-input { flex: 1; min-width: 200px; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--bm-border); background: rgba(255,255,255,0.08); color: #fff; font-size: 0.95rem; }
        .banner-manager-add-input::placeholder { color: rgba(255,255,255,0.4); }
        .banner-manager-interval { margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
        .banner-manager-interval label { font-size: 0.9rem; color: rgba(255,255,255,0.85); }
        .banner-manager-interval input { width: 100px; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--bm-border); background: rgba(255,255,255,0.08); color: #fff; }
        .banner-manager-max-height { margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
        .banner-manager-max-height label { font-size: 0.9rem; color: rgba(255,255,255,0.85); }
        .banner-manager-max-height input { width: 100px; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--bm-border); background: rgba(255,255,255,0.08); color: #fff; }
        .banner-manager-max-height-hint { width: 100%; font-size: 0.8rem; color: rgba(255,255,255,0.55); margin-top: -0.25rem; }
        .banner-manager-list { background: var(--bm-bg); border: 1px solid var(--bm-border); border-radius: 12px; padding: 1.5rem; }
        .banner-manager-list h3 { margin: 0 0 1rem 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem; color: #e2e8f0; }
        .banner-manager-loading, .banner-manager-empty { text-align: center; padding: 2.5rem; color: rgba(255,255,255,0.6); }
        .banner-manager-loading i, .banner-manager-empty i { font-size: 2rem; display: block; margin-bottom: 0.75rem; opacity: 0.7; }
        .banner-manager-cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
        .banner-manager-card { display: grid; grid-template-columns: 180px 1fr auto; gap: 1rem; align-items: center; background: rgba(255,255,255,0.06); border: 1px solid var(--bm-border); border-radius: 10px; padding: 1rem; }
        .banner-manager-card-preview { width: 180px; height: 52px; border-radius: 8px; background: rgba(255,255,255,0.1); background-size: cover; background-position: center; }
        .banner-manager-card-body { min-width: 0; }
        .banner-manager-card-url { display: block; font-size: 0.8rem; color: rgba(255,255,255,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .banner-manager-card-actions { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .banner-manager-card-order { display: flex; align-items: center; gap: 0.35rem; }
        .banner-manager-card-order button { padding: 0.35rem 0.5rem; border: none; border-radius: 6px; background: rgba(59,130,246,0.25); color: #fff; cursor: pointer; }
        .banner-manager-card-order button:disabled { opacity: 0.4; cursor: not-allowed; }
        .banner-manager-card-order span { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0.25rem; }
        .banner-manager-card-delete { padding: 0.4rem 0.75rem; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.15); color: #f87171; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
        .banner-manager-card-delete:hover { background: rgba(239,68,68,0.25); }
        .banner-manager-rotation-preview { margin-top: 1.25rem; padding: 1rem; background: rgba(59,130,246,0.08); border-radius: 8px; border: 1px solid rgba(59,130,246,0.2); }
        .banner-manager-rotation-label { font-size: 0.85rem; color: rgba(255,255,255,0.8); margin-right: 0.75rem; }
        .banner-manager-rotation-dots { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
        .banner-manager-rotation-dot { background: rgba(255,255,255,0.2); padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
        .banner-manager-rotation-loop { margin-left: 0.5rem; opacity: 0.6; font-size: 0.9rem; }
        .banner-manager-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .banner-manager-modal { background: linear-gradient(135deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98)); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 2rem; max-width: 420px; width: 90%; text-align: center; }
        .banner-manager-modal-icon { font-size: 2.5rem; margin-bottom: 1rem; }
        .banner-manager-modal-icon .fa-check-circle { color: #22c55e; }
        .banner-manager-modal-icon .fa-exclamation-triangle { color: #ef4444; }
        .banner-manager-modal-icon .fa-question-circle { color: #eab308; }
        .banner-manager-modal-icon .fa-info-circle { color: #3b82f6; }
        .banner-manager-modal h3 { margin: 0 0 0.5rem 0; font-size: 1.2rem; color: #fff; }
        .banner-manager-modal p { margin: 0 0 1.25rem 0; color: rgba(255,255,255,0.85); font-size: 0.95rem; }
        .banner-manager-modal-buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      `}</style>
    </div>
  );
};

export default BannerManager;
