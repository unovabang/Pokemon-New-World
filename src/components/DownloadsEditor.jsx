import { useState, useEffect, useRef, useCallback } from 'react';
import AdvancedModal from './AdvancedModal';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const CHUNK_SIZE = 100 * 1024 * 1024; // 100 MB per part

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function useR2Upload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const abortRef = useRef(false);

  const upload = useCallback(async (file) => {
    abortRef.current = false;
    setUploading(true);
    setProgress(0);
    setStatus('Initialisation...');

    try {
      const startRes = await fetch(`${API_BASE}/r2/start-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error || 'Échec initialisation upload');

      const { uploadId, key } = startData;
      const totalParts = Math.ceil(file.size / CHUNK_SIZE);
      const parts = [];

      for (let i = 0; i < totalParts; i++) {
        if (abortRef.current) {
          await fetch(`${API_BASE}/r2/abort-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, uploadId }),
          });
          throw new Error('Upload annulé');
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partNum = i + 1;

        setStatus(`Envoi partie ${partNum}/${totalParts} (${formatFileSize(end - start)})...`);

        const partRes = await fetch(`${API_BASE}/r2/upload-part`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            key,
            uploadid: uploadId,
            partnum: String(partNum),
          },
          body: chunk,
        });
        const partData = await partRes.json();
        if (!partData.success) throw new Error(partData.error || `Échec partie ${partNum}`);

        parts.push({ partNumber: partNum, etag: partData.etag });
        setProgress(Math.round(((i + 1) / totalParts) * 100));
      }

      setStatus('Finalisation...');
      const completeRes = await fetch(`${API_BASE}/r2/complete-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId, parts }),
      });
      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error(completeData.error || 'Échec finalisation');

      setProgress(100);
      setStatus('Upload terminé !');
      return completeData.url;
    } catch (error) {
      setStatus(`Erreur: ${error.message}`);
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  const abort = useCallback(() => { abortRef.current = true; }, []);

  return { upload, abort, progress, uploading, status };
}

const UploadZone = ({ label, icon, iconColor, currentLink, onLinkChange, onUploadComplete, infoText }) => {
  const fileInputRef = useRef(null);
  const { upload, abort, progress, uploading, status } = useR2Upload();
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const url = await upload(file);
      onUploadComplete(url);
    } catch {
      // error already in status
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="downloads-editor-card">
      <h3 className="downloads-editor-card-title">
        <i className={icon} style={{ color: iconColor }}></i>
        {label}
      </h3>

      {/* Zone de drop / upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#007bff' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: '10px',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          background: dragOver ? 'rgba(0,123,255,0.1)' : 'rgba(255,255,255,0.03)',
          transition: 'all 0.2s ease',
          marginBottom: '1rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".exe,.zip,.rar,.7z"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />

        {uploading ? (
          <div>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
              <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: '0.5rem', color: '#007bff' }}></i>
              {status}
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '0.5rem',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: progress === 100 ? '#28a745' : 'linear-gradient(90deg, #007bff, #0056b3)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7 }}>
              <span>{progress}%</span>
              <button
                onClick={(e) => { e.stopPropagation(); abort(); }}
                style={{
                  background: 'rgba(220,53,69,0.2)',
                  border: '1px solid rgba(220,53,69,0.5)',
                  color: '#dc3545',
                  padding: '0.2rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                <i className="fa-solid fa-xmark"></i> Annuler
              </button>
            </div>
          </div>
        ) : (
          <div>
            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', display: 'block' }}></i>
            <p style={{ margin: '0 0 0.3rem', fontWeight: '500' }}>
              Glisser-déposer un fichier ici
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>
              ou cliquer pour parcourir (.exe, .zip, .rar, .7z)
            </p>
          </div>
        )}
      </div>

      {/* Lien manuel */}
      <div className="downloads-editor-field">
        <label>
          <i className="fa-solid fa-link"></i> Lien de téléchargement:
        </label>
        <div className="downloads-editor-input-row">
          <input
            type="url"
            value={currentLink}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="https://exemple.com/fichier.zip"
            className="downloads-editor-input"
          />
          <button
            onClick={() => currentLink && window.open(currentLink, '_blank')}
            className="btn btn-ghost downloads-editor-test-btn"
            disabled={!currentLink}
          >
            <i className="fa-solid fa-external-link-alt"></i> Tester
          </button>
        </div>
      </div>

      <div className="downloads-editor-info">
        <i className="fa-solid fa-info-circle"></i> {infoText}
      </div>
    </div>
  );
};

const DownloadsEditor = ({ onSave }) => {
  const [windowsLink, setWindowsLink] = useState('');
  const [patchLink, setPatchLink] = useState('');
  const [launcherLink, setLauncherLink] = useState('');
  const [patchVideo, setPatchVideo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [r2Objects, setR2Objects] = useState([]);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  useEffect(() => {
    loadDownloads();
    loadR2Objects();
  }, []);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/downloads?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.downloads) {
        setWindowsLink(data.downloads.windows || '');
        setPatchLink(data.downloads.patch || '');
        setLauncherLink(data.downloads.launcher || '');
        setPatchVideo(data.downloads.patchVideo || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des téléchargements:', error);
      showMessage('Erreur', 'Impossible de charger les téléchargements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadR2Objects = async () => {
    try {
      const res = await fetch(`${API_BASE}/r2/list`);
      const data = await res.json();
      if (data.success) setR2Objects(data.objects || []);
    } catch { /* R2 non configuré, on ignore */ }
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

  const handleSave = async () => {
    showConfirm(
      'Confirmer la sauvegarde',
      'Êtes-vous sûr de vouloir sauvegarder les modifications des téléchargements ?',
      async () => {
        try {
          setSaving(true);
          const downloadsConfig = {
            windows: windowsLink,
            patch: patchLink,
            launcher: launcherLink,
            patchVideo: patchVideo
          };
          
          const response = await fetch(`${API_BASE}/downloads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ downloads: downloadsConfig })
          });
          
          const data = await response.json();
          
          if (data.success) {
            onSave(downloadsConfig);
            showMessage('Succès !', 'Liens de téléchargement sauvegardés avec succès !', 'success');
          } else {
            throw new Error(data.error || 'Erreur lors de la sauvegarde');
          }
        } catch (error) {
          console.error('Erreur lors de la sauvegarde:', error);
          showMessage('Erreur', `Impossible de sauvegarder: ${error.message}`, 'error');
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const handleDeleteR2Object = (key) => {
    showConfirm(
      'Supprimer le fichier',
      `Êtes-vous sûr de vouloir supprimer "${key}" du stockage R2 ? Cette action est irréversible.`,
      async () => {
        try {
          const res = await fetch(`${API_BASE}/r2/object/${encodeURIComponent(key)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showMessage('Succès', `Fichier "${key}" supprimé.`, 'success');
            loadR2Objects();
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          showMessage('Erreur', `Impossible de supprimer: ${error.message}`, 'error');
        }
      }
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px',
        gap: '1rem'
      }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
        <span>Chargement des téléchargements...</span>
      </div>
    );
  }

  return (
    <div className="downloads-editor">
      <div className="downloads-editor-header">
        <h2>
          <i className="fa-solid fa-download"></i> Gestion des Téléchargements
        </h2>
        <button 
          onClick={handleSave} 
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? (
            <><i className="fa-solid fa-spinner fa-spin"></i> Sauvegarde...</>
          ) : (
            <><i className="fa-solid fa-save"></i> Sauvegarder</>
          )}
        </button>
      </div>

      <div className="downloads-editor-grid">
        {/* Jeu Principal */}
        <UploadZone
          label="Jeu Principal (Windows)"
          icon="fa-brands fa-windows"
          iconColor="#0078d4"
          currentLink={windowsLink}
          onLinkChange={setWindowsLink}
          onUploadComplete={(url) => { setWindowsLink(url); loadR2Objects(); }}
          infoText='Ce lien sera utilisé pour le bouton "Télécharger le jeu" sur votre site.'
        />

        {/* Patch */}
        <UploadZone
          label="Patch / Mise à jour"
          icon="fa-solid fa-file-arrow-up"
          iconColor="#28a745"
          currentLink={patchLink}
          onLinkChange={setPatchLink}
          onUploadComplete={(url) => { setPatchLink(url); loadR2Objects(); }}
          infoText='Ce lien sera utilisé pour le bouton "Télécharger le patch" sur votre site.'
        />

        {/* Launcher */}
        <UploadZone
          label="Launcher (.exe)"
          icon="fa-solid fa-rocket"
          iconColor="#9b59b6"
          currentLink={launcherLink}
          onLinkChange={setLauncherLink}
          onUploadComplete={(url) => { setLauncherLink(url); loadR2Objects(); }}
          infoText='Ce lien sera utilisé pour le bouton "Télécharger le Launcher" sur votre site.'
        />

        {/* Vidéo tutoriel */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fa-solid fa-play-circle" style={{ color: '#dc3545' }}></i>
            Vidéo Tutoriel (Optionnel)
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              <i className="fa-solid fa-video"></i> Lien YouTube (embed):
            </label>
            <input
              type="url"
              value={patchVideo}
              onChange={(e) => setPatchVideo(e.target.value)}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '5px',
            fontSize: '0.9rem',
            opacity: 0.8
          }}>
            <i className="fa-solid fa-info-circle"></i>{' '}
            Lien YouTube pour le tutoriel d'installation. Utilisez le format "embed" : 
            https://www.youtube.com/embed/ID_VIDEO
          </div>
        </div>

        {/* Fichiers sur R2 */}
        {r2Objects.length > 0 && (
          <div style={{
            background: 'rgba(155, 89, 182, 0.1)',
            borderRadius: '10px',
            padding: '2rem',
            border: '1px solid rgba(155, 89, 182, 0.3)',
          }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9b59b6' }}>
              <i className="fa-solid fa-cloud"></i>
              Fichiers sur le stockage R2
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {r2Objects.map((obj) => (
                <div key={obj.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{ fontWeight: '500', wordBreak: 'break-all' }}>{obj.key}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{formatFileSize(obj.size)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(obj.url).then(() => showMessage('Copié !', 'Lien copié dans le presse-papier.', 'success'))}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    >
                      <i className="fa-solid fa-copy"></i> Copier le lien
                    </button>
                    <button
                      onClick={() => handleDeleteR2Object(obj.key)}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', color: '#dc3545' }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aperçu */}
        <div style={{ 
          background: 'rgba(0, 123, 255, 0.1)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(0, 123, 255, 0.3)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#007bff'
          }}>
            <i className="fa-solid fa-eye"></i>
            Aperçu des boutons
          </h3>
          
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-download"></i> Télécharger le jeu
              </button>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                {windowsLink ? '✅ Lien configuré' : '❌ Lien manquant'}
              </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-file-arrow-up"></i> Télécharger le patch
              </button>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                {patchLink ? '✅ Lien configuré' : '❌ Lien manquant'}
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ marginBottom: '0.5rem', background: '#9b59b6' }}>
                <i className="fa-solid fa-rocket"></i> Télécharger le Launcher
              </button>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                {launcherLink ? '✅ Lien configuré' : '❌ Lien manquant'}
              </p>
            </div>
            
            {patchVideo && (
              <div style={{ textAlign: 'center' }}>
                <button className="btn btn-ghost" style={{ marginBottom: '0.5rem' }}>
                  <i className="fa-solid fa-play"></i> Voir le tutoriel
                </button>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                  ✅ Vidéo configurée
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AdvancedModal
        open={showModal}
        onClose={closeModal}
        title={modalConfig.title}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      >
        {modalConfig.message}
      </AdvancedModal>
    </div>
  );
};

export default DownloadsEditor;
