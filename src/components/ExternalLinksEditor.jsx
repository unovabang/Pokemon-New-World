import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const ExternalLinksEditor = ({ onSave }) => {
  const [discordUrl, setDiscordUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [redditUrl, setRedditUrl] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  useEffect(() => {
    loadExternalConfig();
  }, []);

  const loadExternalConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/config/external?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.config) {
        const config = data.config;
        setDiscordUrl(config.discord || '');
        setTiktokUrl(config.tiktok || '');
        setYoutubeUrl(config.youtube || '');
        setTwitterUrl(config.twitter || '');
        setInstagramUrl(config.instagram || '');
        setFacebookUrl(config.facebook || '');
        setGithubUrl(config.github || '');
        setRedditUrl(config.reddit || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des liens externes:', error);
      showMessage('Erreur', 'Impossible de charger les liens externes', 'error');
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

  const handleSave = () => {
    showConfirm(
      'Confirmer la sauvegarde',
      'Êtes-vous sûr de vouloir sauvegarder les liens externes ?',
      async () => {
        try {
          setSaving(true);
          
          const externalConfig = {
            discord: discordUrl,
            tiktok: tiktokUrl,
            youtube: youtubeUrl,
            twitter: twitterUrl,
            instagram: instagramUrl,
            facebook: facebookUrl,
            github: githubUrl,
            reddit: redditUrl
          };
          
          const response = await fetch(`${API_BASE}/config/external`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config: externalConfig })
          });
          
          const data = await response.json();
          
          if (data.success) {
            onSave(externalConfig);
            showMessage('Succès !', 'Liens externes sauvegardés avec succès !', 'success');
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

  const testUrl = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      showMessage('Aucun lien', 'Aucun lien à tester', 'info');
    }
  };

  const socialLinks = [
    { 
      key: 'discord', 
      label: 'Discord', 
      icon: 'fa-brands fa-discord', 
      color: '#5865F2',
      value: discordUrl, 
      setValue: setDiscordUrl,
      placeholder: 'https://discord.gg/votreinvite'
    },
    { 
      key: 'tiktok', 
      label: 'TikTok', 
      icon: 'fa-brands fa-tiktok', 
      color: '#ff0050',
      value: tiktokUrl, 
      setValue: setTiktokUrl,
      placeholder: 'https://www.tiktok.com/@votrecompte'
    },
    { 
      key: 'youtube', 
      label: 'YouTube', 
      icon: 'fa-brands fa-youtube', 
      color: '#FF0000',
      value: youtubeUrl, 
      setValue: setYoutubeUrl,
      placeholder: 'https://www.youtube.com/@votrechaine'
    },
    { 
      key: 'twitter', 
      label: 'Twitter / X', 
      icon: 'fa-brands fa-x-twitter', 
      color: '#1DA1F2',
      value: twitterUrl, 
      setValue: setTwitterUrl,
      placeholder: 'https://twitter.com/votrecompte'
    },
    { 
      key: 'instagram', 
      label: 'Instagram', 
      icon: 'fa-brands fa-instagram', 
      color: '#E4405F',
      value: instagramUrl, 
      setValue: setInstagramUrl,
      placeholder: 'https://www.instagram.com/votrecompte'
    },
    { 
      key: 'facebook', 
      label: 'Facebook', 
      icon: 'fa-brands fa-facebook', 
      color: '#1877F2',
      value: facebookUrl, 
      setValue: setFacebookUrl,
      placeholder: 'https://www.facebook.com/votrepage'
    },
    { 
      key: 'github', 
      label: 'GitHub', 
      icon: 'fa-brands fa-github', 
      color: '#333333',
      value: githubUrl, 
      setValue: setGithubUrl,
      placeholder: 'https://github.com/votrecompte'
    },
    { 
      key: 'reddit', 
      label: 'Reddit', 
      icon: 'fa-brands fa-reddit', 
      color: '#FF4500',
      value: redditUrl, 
      setValue: setRedditUrl,
      placeholder: 'https://www.reddit.com/r/votresubreddit'
    }
  ];

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
        <span>Chargement des liens externes...</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <h2>
          <i className="fa-solid fa-external-link"></i> Liens Externes
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

      <div style={{ display: 'grid', gap: '1rem' }}>
        {socialLinks.map((social) => (
          <div 
            key={social.key}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '10px', 
              padding: '1.5rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: social.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: 'white'
              }}>
                <i className={social.icon}></i>
              </div>
              <div>
                <h4 style={{ margin: 0, color: 'white' }}>{social.label}</h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                  {social.value ? '✅ Configuré' : '❌ Non configuré'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                value={social.value}
                onChange={(e) => social.setValue(e.target.value)}
                placeholder={social.placeholder}
                style={{
                  flex: 1,
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
              <button
                onClick={() => testUrl(social.value)}
                className="btn btn-ghost"
                style={{ 
                  padding: '1rem',
                  minWidth: 'auto'
                }}
                title={`Tester ${social.label}`}
              >
                <i className="fa-solid fa-external-link-alt"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Aperçu des liens configurés */}
      <div style={{ 
        marginTop: '2rem',
        background: 'rgba(59, 130, 246, 0.1)', 
        borderRadius: '10px', 
        padding: '2rem',
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
        <h3 style={{ 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#3b82f6'
        }}>
          <i className="fa-solid fa-eye"></i> Aperçu des Liens Configurés
        </h3>
        
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          {socialLinks
            .filter(social => social.value)
            .map((social) => (
              <div
                key={social.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: social.color,
                  borderRadius: '25px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                <i className={social.icon}></i>
                {social.label}
              </div>
            ))
          }
          
          {socialLinks.filter(social => social.value).length === 0 && (
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '2rem'
            }}>
              Aucun lien configuré. Ajoutez vos liens de réseaux sociaux ci-dessus.
            </div>
          )}
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

export default ExternalLinksEditor;