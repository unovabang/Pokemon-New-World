import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';

const API_BASE = `${window.location.protocol}//${window.location.hostname.replace(/:\d+$/, '')}:3001/api`;

const ConfigEditor = ({ 
  configName, 
  title, 
  icon, 
  onSave, 
  description = '',
  multilingual = false 
}) => {
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });
  const [jsonError, setJsonError] = useState(null);
  const [currentLang, setCurrentLang] = useState('fr');

  useEffect(() => {
    loadConfig();
  }, [configName, currentLang]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setJsonError(null);
      
      const configFile = multilingual && currentLang === 'en' 
        ? `${configName}-en` 
        : configName;
        
      const response = await fetch(`${API_BASE}/config/${configFile}?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.config) {
        setConfig(data.config);
        setOriginalConfig(JSON.parse(JSON.stringify(data.config))); // Deep copy
      } else {
        throw new Error(data.error || 'Configuration non trouvée');
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de ${configName}:`, error);
      showMessage('Erreur', `Impossible de charger la configuration: ${error.message}`, 'error');
      setConfig(null);
    } finally {
      setLoading(false);
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

  const validateJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      setJsonError(null);
      return parsed;
    } catch (error) {
      setJsonError(`Erreur JSON: ${error.message}`);
      return null;
    }
  };

  const handleConfigChange = (newJsonString) => {
    const parsed = validateJSON(newJsonString);
    if (parsed) {
      setConfig(parsed);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  const handleSave = () => {
    if (!config) {
      showMessage('Erreur', 'Configuration invalide', 'error');
      return;
    }

    if (jsonError) {
      showMessage('Erreur', 'Veuillez corriger les erreurs JSON avant de sauvegarder', 'error');
      return;
    }

    showConfirm(
      'Confirmer la sauvegarde',
      `Êtes-vous sûr de vouloir sauvegarder les modifications de ${title.toLowerCase()} ${multilingual ? `(${currentLang.toUpperCase()})` : ''} ?`,
      async () => {
        try {
          setSaving(true);
          
          const configFile = multilingual && currentLang === 'en' 
            ? `${configName}-en` 
            : configName;
          
          const response = await fetch(`${API_BASE}/config/${configFile}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config })
          });
          
          const data = await response.json();
          
          if (data.success) {
            setOriginalConfig(JSON.parse(JSON.stringify(config))); // Update original
            onSave(config);
            showMessage(
              'Succès !', 
              `${title} ${multilingual ? `(${currentLang.toUpperCase()})` : ''} sauvegardé avec succès !`, 
              'success'
            );
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

  const handleReset = () => {
    showConfirm(
      'Réinitialiser les modifications',
      'Êtes-vous sûr de vouloir annuler tous les changements non sauvegardés ?',
      () => {
        setConfig(JSON.parse(JSON.stringify(originalConfig)));
        setJsonError(null);
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
        <span>Chargement de {title.toLowerCase()}...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px',
        gap: '1rem',
        color: 'rgba(255,255,255,0.6)'
      }}>
        <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#ef4444' }}></i>
        <p>Impossible de charger la configuration</p>
        <button onClick={loadConfig} className="btn btn-primary">
          <i className="fa-solid fa-refresh"></i> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <i className={icon}></i> {title}
          </h2>
          {description && (
            <p style={{ margin: '0.5rem 0 0 2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              {description}
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {multilingual && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentLang('fr')}
                className={`btn ${currentLang === 'fr' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                🇫🇷 FR
              </button>
              <button
                onClick={() => setCurrentLang('en')}
                className={`btn ${currentLang === 'en' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                🇺🇸 EN
              </button>
            </div>
          )}
          
          {hasChanges() && (
            <button 
              onClick={handleReset} 
              className="btn btn-ghost"
              title="Annuler les modifications"
            >
              <i className="fa-solid fa-undo"></i> Annuler
            </button>
          )}
          
          <button 
            onClick={handleSave} 
            className="btn btn-primary"
            disabled={saving || !!jsonError}
          >
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Sauvegarde...</>
            ) : (
              <><i className="fa-solid fa-save"></i> Sauvegarder</>
            )}
          </button>
        </div>
      </div>

      {/* JSON Editor */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '10px', 
        border: `1px solid ${jsonError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
        overflow: 'hidden'
      }}>
        {jsonError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '1rem',
            color: '#ef4444'
          }}>
            <i className="fa-solid fa-exclamation-triangle"></i> {jsonError}
          </div>
        )}
        
        <textarea
          value={JSON.stringify(config, null, 2)}
          onChange={(e) => handleConfigChange(e.target.value)}
          style={{
            width: '100%',
            minHeight: '500px',
            padding: '1.5rem',
            background: 'rgba(0,0,0,0.3)',
            border: 'none',
            color: 'white',
            fontSize: '0.9rem',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", consolas, "source-code-pro", monospace',
            lineHeight: '1.6',
            resize: 'vertical'
          }}
          placeholder="Configuration JSON..."
        />
      </div>

      {/* Tips */}
      <div style={{
        marginTop: '1.5rem',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        padding: '1rem',
        fontSize: '0.9rem'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-lightbulb"></i> Conseils
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'rgba(255,255,255,0.8)' }}>
          <li>Utilisez un JSON válide pour éviter les erreurs</li>
          <li>Les modifications sont surlignées automatiquement</li>
          <li>Pensez à sauvegarder régulièrement vos changements</li>
          {multilingual && (
            <li>Gérez séparément les versions française (FR) et anglaise (EN)</li>
          )}
        </ul>
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

export default ConfigEditor;