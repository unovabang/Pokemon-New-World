import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MarkdownToolbar from './MarkdownToolbar';
import {
  normalizePatchItem,
  normalizePatchSectionItems,
  patchItemToStored,
  resolveSectionBalanceKinds,
  PATCH_BALANCE_KINDS,
} from '../utils/patchNoteItem';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const PatchNotesEditor = ({ onSave }) => {
  const [currentLang, setCurrentLang] = useState('fr');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  const [allVersions, setAllVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [discordImageStyle, setDiscordImageStyle] = useState('thumbnail');
  const [discordWebhookSaving, setDiscordWebhookSaving] = useState(false);
  const [pageBackground, setPageBackground] = useState('');
  const [pageBackgroundSaving, setPageBackgroundSaving] = useState(false);
  const [currentPatch, setCurrentPatch] = useState({
    version: '',
    date: '',
    image: '',
    sections: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const itemTextareaRefs = useRef({});
  const getItemTextareaRef = (sectionIndex, itemIndex) => {
    const key = `${sectionIndex}-${itemIndex}`;
    if (!itemTextareaRefs.current[key]) itemTextareaRefs.current[key] = { current: null };
    return itemTextareaRefs.current[key];
  };

  const normalizeSection = (s) => ({
    title: s?.title || '',
    image: s?.image || '',
    icon: typeof s?.icon === 'string' ? s.icon : '',
    balanceKinds: s?.balanceKinds,
    items: normalizePatchSectionItems(s?.items),
  });
  const normalizePatch = (v) => ({
    version: v?.version || '',
    date: v?.date || '',
    image: typeof v?.image === 'string' ? v.image : '',
    sections: (v?.sections || []).map(normalizeSection)
  });

  useEffect(() => {
    loadPatchNotes();
  }, [currentLang]);

  const loadDiscordWebhook = async () => {
    try {
      const res = await fetch(`${API_BASE}/config/discord-webhook`);
      const data = await res.json();
      if (data.success) {
        if (typeof data.webhookUrl === 'string') setDiscordWebhookUrl(data.webhookUrl);
        if (data.imageStyle === 'banner' || data.imageStyle === 'thumbnail') setDiscordImageStyle(data.imageStyle);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDiscordWebhook();
  }, []);

  const saveDiscordWebhook = async () => {
    setDiscordWebhookSaving(true);
    try {
      const res = await fetch(`${API_BASE}/config/discord-webhook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: discordWebhookUrl.trim(), imageStyle: discordImageStyle })
      });
      const data = await res.json();
      if (data.success) showMessage('Succès', data.webhookUrl === 'cleared' ? 'Webhook supprimé.' : 'Webhook Discord enregistré. Un message sera envoyé à chaque nouveau patch.', 'success');
      else throw new Error(data.error);
    } catch (e) {
      showMessage('Erreur', e.message || 'Impossible d\'enregistrer le webhook.', 'error');
    } finally {
      setDiscordWebhookSaving(false);
    }
  };

  const savePageBackground = async () => {
    setPageBackgroundSaving(true);
    try {
      const res = await fetch(`${API_BASE}/patchnotes/background`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ background: pageBackground.trim() || null })
      });
      const data = await res.json();
      if (data.success) showMessage('Succès', 'Image de fond de la page Notes de patch (FR) enregistrée.', 'success');
      else throw new Error(data.error);
    } catch (e) {
      showMessage('Erreur', e.message || 'Impossible d\'enregistrer le fond.', 'error');
    } finally {
      setPageBackgroundSaving(false);
    }
  };

  const loadPatchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/patchnotes/${currentLang}?t=${Date.now()}`);
      const data = await response.json();
      if (data.success && data.patchnotes?.versions) {
        setAllVersions(data.patchnotes.versions);
        if (data.patchnotes.background !== undefined) setPageBackground(data.patchnotes.background ?? '');
        const versions = data.patchnotes.versions;
        if (selectedVersion !== null) {
          const v = versions.find(x => x.version === selectedVersion);
          if (v) setCurrentPatch(normalizePatch(v));
          else setSelectedVersion(versions[0]?.version ?? null);
        }
        if (versions.length > 0 && selectedVersion === null) {
          setSelectedVersion(versions[0].version);
          setCurrentPatch(normalizePatch(versions[0]));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour les modals
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

  const savePatch = async () => {
    if (!currentPatch.version?.trim() || !currentPatch.date?.trim()) {
      showMessage('Erreur', 'Veuillez remplir la version et la date.', 'error');
      return;
    }
    const sectionsToSave = currentPatch.sections.map((s) => {
      const balanceActive = resolveSectionBalanceKinds(s);
      const itemsOut = (s.items || [])
        .map((item) => patchItemToStored(normalizePatchItem(item), balanceActive))
        .filter((stored) =>
          (typeof stored === 'string' ? stored.trim() : (stored.text || '').trim()).length > 0
        );

      const out = {
        title: s.title || '',
        image: s.image || undefined,
        ...(typeof s.icon === 'string' && s.icon.trim() ? { icon: s.icon.trim() } : {}),
        items: itemsOut,
      };

      if (s.balanceKinds === false) out.balanceKinds = false;
      else if (s.balanceKinds === true) out.balanceKinds = true;
      else if (itemsOut.some((i) => typeof i === 'object' && i && PATCH_BALANCE_KINDS.includes(i.kind))) {
        out.balanceKinds = true;
      }

      return out;
    });

    try {
      if (selectedVersion === null) {
        const res = await fetch(`${API_BASE}/patchnotes/${currentLang}/version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: currentPatch.version.trim(),
            date: currentPatch.date.trim(),
            image: currentPatch.image?.trim() || undefined,
            sections: sectionsToSave
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setSelectedVersion(currentPatch.version.trim());
        setAllVersions(data.patchnotes.versions);
        showMessage('Succès', 'Nouveau patch créé.', 'success');
      } else {
        const res = await fetch(`${API_BASE}/patchnotes/${currentLang}/version/${encodeURIComponent(selectedVersion)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: currentPatch.version.trim(),
            date: currentPatch.date.trim(),
            image: currentPatch.image?.trim() || undefined,
            sections: sectionsToSave
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setAllVersions(data.patchnotes.versions);
        if (selectedVersion !== currentPatch.version.trim()) setSelectedVersion(currentPatch.version.trim());
        showMessage('Succès', 'Patch mis à jour.', 'success');
      }
      setIsEditing(false);
      loadPatchNotes();
    } catch (error) {
      showMessage('Erreur', error.message || 'Erreur lors de la sauvegarde.', 'error');
    }
  };

  // Mettre à jour les propriétés du patch
  const updatePatchProperty = (property, value) => {
    setCurrentPatch(prev => ({
      ...prev,
      [property]: value
    }));
  };

  // Commencer l'édition
  const startEditing = () => {
    setIsEditing(true);
  };

  // Annuler l'édition
  const cancelEditing = () => {
    setIsEditing(false);
    loadPatchNotes(); // Recharger les données originales
  };

  // Ajouter une section
  const addSection = () => {
    setCurrentPatch((prev) => ({
      ...prev,
      sections: [...prev.sections, { title: '', image: '', icon: '', balanceKinds: undefined, items: [{ text: '', kind: '' }] }],
    }));
  };

  const updateSectionImage = (sectionIndex, value) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex]) return;
    newSections[sectionIndex] = { ...newSections[sectionIndex], image: value };
    setCurrentPatch(prev => ({ ...prev, sections: newSections }));
  };

  // Mettre à jour le titre d'une section
  const updateSectionTitle = (sectionIndex, title) => {
    const newSections = [...currentPatch.sections];
    newSections[sectionIndex].title = title;
    setCurrentPatch(prev => ({ ...prev, sections: newSections }));
  };

  const updateSectionIcon = (sectionIndex, icon) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex]) return;
    newSections[sectionIndex] = { ...newSections[sectionIndex], icon };
    setCurrentPatch(prev => ({ ...prev, sections: newSections }));
  };

  // Ajouter un élément à une section
  const addItem = (sectionIndex) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex].items) {
      newSections[sectionIndex].items = [];
    }
    newSections[sectionIndex].items.push({ text: '', kind: '' });
    setCurrentPatch((prev) => ({ ...prev, sections: newSections }));
  };

  const updateItem = (sectionIndex, itemIndex, value) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex].items) {
      newSections[sectionIndex].items = [];
    }
    const prev = normalizePatchItem(newSections[sectionIndex].items[itemIndex]);
    newSections[sectionIndex].items[itemIndex] = { ...prev, text: value };
    setCurrentPatch((prev) => ({ ...prev, sections: newSections }));
  };

  const updateItemKind = (sectionIndex, itemIndex, kind) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex].items) return;
    const prev = normalizePatchItem(newSections[sectionIndex].items[itemIndex]);
    const k = PATCH_BALANCE_KINDS.includes(kind) ? kind : '';
    newSections[sectionIndex].items[itemIndex] = { ...prev, kind: k };
    setCurrentPatch((prev) => ({ ...prev, sections: newSections }));
  };

  const updateSectionBalanceKinds = (sectionIndex, checked) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex]) return;
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      balanceKinds: checked ? true : false,
    };
    setCurrentPatch((prev) => ({ ...prev, sections: newSections }));
  };

  // Supprimer un élément
  const deleteItem = (sectionIndex, itemIndex) => {
    const newSections = [...currentPatch.sections];
    if (newSections[sectionIndex].items) {
      newSections[sectionIndex].items.splice(itemIndex, 1);
      setCurrentPatch(prev => ({ ...prev, sections: newSections }));
    }
  };

  // Supprimer une section
  const deleteSection = (sectionIndex) => {
    showConfirm(
      'Supprimer la section',
      'Êtes-vous sûr de vouloir supprimer cette section ?',
      () => {
        setCurrentPatch(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== sectionIndex) }));
      }
    );
  };

  const openNewPatch = () => {
    setSelectedVersion(null);
    setCurrentPatch({ version: '', date: '', image: '', sections: [] });
    setIsEditing(true);
  };

  const openEditPatch = (v) => {
    setSelectedVersion(v.version);
    setCurrentPatch(normalizePatch(v));
    setIsEditing(true);
  };

  const deleteVersion = (version) => {
    showConfirm('Supprimer cette version', `Supprimer la version ${version} ?`, async () => {
      try {
        const res = await fetch(`${API_BASE}/patchnotes/${currentLang}/version/${version}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setAllVersions(data.patchnotes.versions);
          if (selectedVersion === version) {
            const next = data.patchnotes.versions[0];
            setSelectedVersion(next?.version ?? null);
            setCurrentPatch(next ? normalizePatch(next) : { version: '', date: '', image: '', sections: [] });
          }
          showMessage('Succès', 'Version supprimée.', 'success');
        } else throw new Error(data.error);
      } catch (e) {
        showMessage('Erreur', e.message || 'Impossible de supprimer.', 'error');
      }
    });
  };

  const moveVersion = async (index, dir) => {
    const versions = allVersions.map(v => v.version);
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= versions.length) return;
    [versions[index], versions[swap]] = [versions[swap], versions[index]];
    try {
      const res = await fetch(`${API_BASE}/patchnotes/${currentLang}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: versions })
      });
      const data = await res.json();
      if (data.success) {
        setAllVersions(data.patchnotes.versions);
        showMessage('Succès', 'Ordre mis à jour.', 'success');
      } else throw new Error(data.error);
    } catch (e) {
      showMessage('Erreur', e.message || 'Impossible de réordonner.', 'error');
    }
  };

  const commonQuickSections = currentLang === 'fr'
    ? [
        { icon: 'fa-solid fa-wand-magic-sparkles', title: 'Nouveautés' },
        { icon: 'fa-solid fa-wrench', title: 'Corrections' },
        { icon: 'fa-solid fa-scale-balanced', title: 'Équilibrage' },
        { icon: 'fa-solid fa-palette', title: 'Améliorations visuelles' },
        { icon: 'fa-solid fa-music', title: 'Audio' },
        { icon: 'fa-solid fa-box-open', title: 'Contenu' },
      ]
    : [
        { icon: 'fa-solid fa-wand-magic-sparkles', title: 'New Features' },
        { icon: 'fa-solid fa-wrench', title: 'Bug Fixes' },
        { icon: 'fa-solid fa-scale-balanced', title: 'Balance Changes' },
        { icon: 'fa-solid fa-palette', title: 'Visual Improvements' },
        { icon: 'fa-solid fa-music', title: 'Audio' },
        { icon: 'fa-solid fa-box-open', title: 'Content' },
      ];

  return (
    <div className="patchnotes-editor">
      <div className="patchnotes-editor-head">
        <div className="patchnotes-editor-title-wrap">
          <h2 className="patchnotes-editor-title"><i className="fa-solid fa-file-lines" /> Notes de patch</h2>
          <div className="patchnotes-editor-lang">
            <span className="patchnotes-editor-lang-label">Langue</span>
            <select value={currentLang} onChange={(e) => setCurrentLang(e.target.value)} className="patchnotes-editor-select">
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
        </div>
        <div className="patchnotes-editor-actions">
          {!isEditing && (
            selectedVersion ? (
              <button type="button" onClick={() => openEditPatch(allVersions.find(v => v.version === selectedVersion) || currentPatch)} className="btn btn-primary">
                <i className="fa-solid fa-pen" /> Modifier ce patch
              </button>
            ) : (
              <button type="button" onClick={openNewPatch} className="btn btn-primary">
                <i className="fa-solid fa-plus" /> Créer un patch
              </button>
            )
          )}
          {isEditing && (
            <>
              <button type="button" onClick={savePatch} className="btn btn-primary">
                <i className="fa-solid fa-save" /> Sauvegarder
              </button>
              <button type="button" onClick={cancelEditing} className="btn btn-ghost">
                <i className="fa-solid fa-times" /> Annuler
              </button>
            </>
          )}
        </div>
      </div>

      <p className="patchnotes-editor-desc">
        Modifiez le patch actuel (version, date, image, sections). Les changements sont enregistrés sur le serveur et visibles sur l’accueil et la page PatchNotes.
      </p>

      <div className="patchnotes-editor-webhook card">
        <h3 className="patchnotes-editor-webhook-title"><i className="fa-brands fa-discord" /> Webhook Discord</h3>
        <p className="patchnotes-editor-webhook-desc">
          À chaque <strong>nouveau</strong> patchnote créé, un message en embed sera envoyé sur ce webhook (titre, date, sections, lien vers le site).
        </p>
        <div className="patchnotes-editor-webhook-row">
          <input
            type="url"
            value={discordWebhookUrl}
            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="patchnotes-editor-input patchnotes-editor-webhook-input"
          />
          <button type="button" onClick={saveDiscordWebhook} disabled={discordWebhookSaving} className="btn btn-primary">
            {discordWebhookSaving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-save" />} Sauvegarder
          </button>
        </div>
        <div className="patchnotes-editor-webhook-image-option">
          <span className="patchnotes-editor-webhook-image-label">Image du patch (si présente) :</span>
          <select value={discordImageStyle} onChange={(e) => setDiscordImageStyle(e.target.value)} className="patchnotes-editor-select patchnotes-editor-webhook-select">
            <option value="thumbnail">Thumbnail (petite, en coin)</option>
            <option value="banner">Banner (grande image)</option>
          </select>
        </div>
      </div>

      <div className="patchnotes-editor-webhook card">
        <h3 className="patchnotes-editor-webhook-title"><i className="fa-solid fa-image" /> Image de fond de la page (FR)</h3>
        <p className="patchnotes-editor-webhook-desc">
          Fond d’écran de la page publique Notes de patch (version française).
        </p>
        <div className="patchnotes-editor-webhook-row">
          <input
            type="url"
            value={pageBackground}
            onChange={(e) => setPageBackground(e.target.value)}
            placeholder="https://… ou /image.jpg"
            className="patchnotes-editor-input patchnotes-editor-webhook-input"
          />
          <button type="button" onClick={savePageBackground} disabled={pageBackgroundSaving} className="btn btn-primary">
            {pageBackgroundSaving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-save" />} Sauvegarder
          </button>
        </div>
      </div>

      {allVersions.length > 0 && (
        <div className="patchnotes-editor-list card">
          <div className="patchnotes-editor-list-head">
            <h3><i className="fa-solid fa-list" /> Versions ({allVersions.length})</h3>
            <div className="patchnotes-editor-search-wrap">
              <i className="fa-solid fa-magnifying-glass patchnotes-editor-search-icon" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher (version, date)…" className="patchnotes-editor-search-input" />
            </div>
            <button type="button" onClick={openNewPatch} className="btn btn-primary">
              <i className="fa-solid fa-plus" /> Nouveau patch
            </button>
          </div>
          <ul className="patchnotes-editor-version-list">
            {allVersions
              .filter(v => !searchQuery.trim() || `${v.version} ${v.date || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
              .map((v) => {
                const realIndex = allVersions.findIndex(x => x.version === v.version);
                return (
                  <li key={v.version} className="patchnotes-editor-version-item">
                    <span className="patchnotes-editor-version-num">{realIndex + 1}.</span>
                    <span className="patchnotes-editor-version-label">Version {v.version} — {v.date || '—'}</span>
                    <div className="patchnotes-editor-version-actions">
                      <button type="button" onClick={() => moveVersion(realIndex, 'up')} disabled={realIndex === 0} className="btn btn-ghost patchnotes-editor-order-btn" title="Monter"><i className="fa-solid fa-chevron-up" /></button>
                      <button type="button" onClick={() => moveVersion(realIndex, 'down')} disabled={realIndex === allVersions.length - 1} className="btn btn-ghost patchnotes-editor-order-btn" title="Descendre"><i className="fa-solid fa-chevron-down" /></button>
                      <button type="button" onClick={() => openEditPatch(v)} className="btn btn-ghost" title="Modifier"><i className="fa-solid fa-pen" /></button>
                      <button type="button" onClick={() => deleteVersion(v.version)} className="patchnotes-editor-delete-btn" title="Supprimer"><i className="fa-solid fa-trash" /></button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      <div className="patchnotes-editor-card card">
        {loading ? (
          <div className="patchnotes-editor-loading">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>Chargement du patch…</span>
          </div>
        ) : (
          <div className="patchnotes-editor-body">
            <div className="patchnotes-editor-info card">
              <h3 className="patchnotes-editor-info-title"><i className="fa-solid fa-info-circle" /> Informations du patch</h3>
              <div className="patchnotes-editor-fields">
<label className="patchnotes-editor-field">
                      <span>Version</span>
                  <input type="text" value={currentPatch.version} onChange={(e) => updatePatchProperty('version', e.target.value)} placeholder="Ex: 0.6, 1.0" disabled={!!selectedVersion} className="patchnotes-editor-input" title={selectedVersion ? 'Clé de la version (non modifiable)' : ''} />
                </label>
                <label className="patchnotes-editor-field">
                  <span>Date</span>
                  <input type="text" value={currentPatch.date} onChange={(e) => updatePatchProperty('date', e.target.value)} placeholder="Ex: Janvier 2025" disabled={!isEditing} className="patchnotes-editor-input" />
                </label>
                <label className="patchnotes-editor-field">
                  <span>URL image</span>
                  <input type="text" value={currentPatch.image} onChange={(e) => updatePatchProperty('image', e.target.value)} placeholder="https://… (URL de l’image du patch)" disabled={!isEditing} className="patchnotes-editor-input" />
                </label>
              </div>
              {typeof currentPatch.image === "string" && currentPatch.image.trim() && (
                <div className="patchnotes-editor-preview">
                  <span>Aperçu</span>
                  <img src={currentPatch.image.trim()} alt="Aperçu patch" className="patchnotes-editor-preview-img" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>

            {isEditing && (
              <div className="patchnotes-editor-sections card">
                <h3 className="patchnotes-editor-sections-title"><i className="fa-solid fa-list" /> Sections</h3>
                <div className="patchnotes-editor-quick">
                  <span className="patchnotes-editor-quick-label">Sections rapides</span>
                  <div className="patchnotes-editor-quick-btns">
                    {commonQuickSections.map((sec, index) => (
                      <button
                        key={index}
                        type="button"
                        className="btn btn-ghost patchnotes-editor-quick-btn"
                        onClick={() =>
                          setCurrentPatch((prev) => ({
                            ...prev,
                            sections: [
                              ...prev.sections,
                              { title: sec.title, icon: sec.icon, image: '', balanceKinds: undefined, items: [{ text: '', kind: '' }] },
                            ],
                          }))
                        }
                      >
                        <i className={sec.icon} aria-hidden />
                        <span>{sec.title}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={addSection} className="btn btn-primary">
                    <i className="fa-solid fa-plus" /> Section personnalisée
                  </button>
                </div>
                {currentPatch.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="patchnotes-editor-section card">
                    <div className="patchnotes-editor-section-head">
                      <h4>Section {sectionIndex + 1}</h4>
                      <button type="button" onClick={() => deleteSection(sectionIndex)} className="btn btn-ghost patchnotes-editor-delete-btn">
                        <i className="fa-solid fa-trash" /> Supprimer
                      </button>
                    </div>
                    <label className="patchnotes-editor-field">
                      <span>Titre</span>
                      <input type="text" value={section.title || ''} onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)} placeholder="Ex: Nouveautés" className="patchnotes-editor-input" />
                    </label>
                    <label className="patchnotes-editor-field">
                      <span>Icône Font Awesome</span>
                      <input
                        type="text"
                        value={section.icon || ''}
                        onChange={(e) => updateSectionIcon(sectionIndex, e.target.value)}
                        placeholder="fa-solid fa-wand-magic-sparkles"
                        className="patchnotes-editor-input"
                        spellCheck={false}
                      />
                    </label>
                    <label className="patchnotes-editor-field">
                      <span>URL image (optionnel)</span>
                      <input type="text" value={section.image || ''} onChange={(e) => updateSectionImage(sectionIndex, e.target.value)} placeholder="/image.png ou https://…" className="patchnotes-editor-input" />
                    </label>
                    {section.image && (
                      <div className="patchnotes-editor-preview">
                        <img src={section.image} alt="" className="patchnotes-editor-preview-img" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    )}
                    <label className="patchnotes-editor-field patchnotes-editor-balance-toggle">
                      <span>{currentLang === 'en' ? 'Balance line tags' : 'Équilibrage : types par ligne'}</span>
                      <span className="patchnotes-editor-balance-toggle-row">
                        <input
                          type="checkbox"
                          checked={resolveSectionBalanceKinds(section)}
                          onChange={(e) => updateSectionBalanceKinds(sectionIndex, e.target.checked)}
                        />
                        <span className="patchnotes-editor-balance-toggle-label">
                          {currentLang === 'en'
                            ? 'Show nerf / buff / adjustment per line (for the balancing section or any custom block).'
                            : 'Afficher Nerf / Buff / Ajustement sur chaque ligne (section Équilibrage ou bloc personnalisé).'}
                        </span>
                      </span>
                    </label>
                    <div className="patchnotes-editor-items">
                      <div className="patchnotes-editor-items-head">
                        <span>Éléments</span>
                        <button type="button" onClick={() => addItem(sectionIndex)} className="btn btn-ghost"><i className="fa-solid fa-plus" /> Ajouter</button>
                      </div>
                      <p className="patchnotes-editor-md-hint">
                        Markdown : retours ligne, <code className="patchnotes-editor-md-code">**gras**</code>,{' '}
                        <code className="patchnotes-editor-md-code">*italique*</code>,{' '}
                        <code className="patchnotes-editor-md-code">[TITLE]…[/TITLE]</code>,                         listes <code className="patchnotes-editor-md-code">- </code> ou{' '}
                        <code className="patchnotes-editor-md-code">  - </code> (2 espaces pour sous-niveau) ; ligne suivante indentée (2+ espaces) = suite de la puce — ou les boutons ci‑dessous.
                        {resolveSectionBalanceKinds(section) ? (
                          <>
                            {' '}
                            {currentLang === 'en'
                              ? 'Use the dropdown on each line for nerf, buff, or adjustment.'
                              : 'Utilisez le menu sur chaque ligne pour Nerf, Buff ou Ajustement.'}
                          </>
                        ) : null}
                      </p>
                      {(section.items || []).map((item, itemIndex) => {
                        const taRef = getItemTextareaRef(sectionIndex, itemIndex);
                        const itemNorm = normalizePatchItem(item);
                        const showKinds = resolveSectionBalanceKinds(section);
                        return (
                          <div key={itemIndex} className="patchnotes-editor-item-row patchnotes-editor-item-row--md">
                            {showKinds ? (
                              <div className="patchnotes-editor-balance-kind-col">
                                <label className="patchnotes-editor-balance-kind-label">{currentLang === 'en' ? 'Type' : 'Type'}</label>
                                <select
                                  value={itemNorm.kind || ''}
                                  onChange={(e) => updateItemKind(sectionIndex, itemIndex, e.target.value)}
                                  className="patchnotes-editor-select patchnotes-editor-balance-select"
                                  aria-label={currentLang === 'en' ? 'Balance change type' : "Type d'équilibrage"}
                                >
                                  <option value="">—</option>
                                  <option value="nerf">Nerf</option>
                                  <option value="buff">Buff</option>
                                  <option value="ajustement">{currentLang === 'en' ? 'Adjustment' : 'Ajustement'}</option>
                                </select>
                              </div>
                            ) : null}
                            <div className="patchnotes-editor-item-md-wrap">
                              <MarkdownToolbar textareaRef={taRef} onUpdate={(v) => updateItem(sectionIndex, itemIndex, v)} />
                              <textarea
                                ref={(el) => { taRef.current = el; }}
                                value={itemNorm.text}
                                onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)}
                                rows={3}
                                placeholder="Texte… (**gras**, *italique*, Entrée = saut de ligne)"
                                className="patchnotes-editor-input patchnotes-editor-item-textarea"
                                spellCheck
                              />
                            </div>
                            <button type="button" onClick={() => deleteItem(sectionIndex, itemIndex)} className="patchnotes-editor-delete-btn" title="Supprimer"><i className="fa-solid fa-trash" /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="admin-pokedex-modal-overlay" onClick={closeModal}>
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#fff' }}>
              <i className={`fa-solid ${modalConfig.type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`} style={{ color: modalConfig.type === 'error' ? '#f87171' : 'var(--primary-2)', marginRight: '.5rem' }} />
              {modalConfig.title}
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.85)' }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {modalConfig.type === 'confirm' && (
                <button type="button" className="btn btn-primary" onClick={() => { modalConfig.onConfirm?.(); closeModal(); }}>
                  <i className="fa-solid fa-check" /> Confirmer
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                <i className="fa-solid fa-times" /> {modalConfig.type === 'confirm' ? 'Annuler' : 'OK'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PatchNotesEditor;