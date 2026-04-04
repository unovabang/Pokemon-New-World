import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';
import { authHeaders } from "../utils/authHeaders";

/** Extrait l'ID d'une vidéo YouTube depuis une URL (watch, youtu.be, embed) ou retourne la chaîne si c'est déjà un ID. */
function extractYoutubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const s = urlOrId.trim();
  const watchMatch = s.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = s.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = s.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return '';
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const SiteEditor = ({ onSave }) => {
  // États pour tous les champs de configuration
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteKeywords, setSiteKeywords] = useState('');
  const [siteAuthor, setSiteAuthor] = useState('');
  const [siteLang, setSiteLang] = useState('fr');
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundBlur, setBackgroundBlur] = useState(0.5);
  const [backgroundDim, setBackgroundDim] = useState(0.01);
  const [heroVideoUrl, setHeroVideoUrl] = useState('');

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
    loadSiteConfig();
  }, []);

  const loadSiteConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/config/site?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.config) {
        const config = data.config;
        setSiteTitle(config.seo?.title || '');
        setSiteDescription(config.seo?.description || '');
        setSiteKeywords(config.seo?.keywords || '');
        setSiteAuthor(config.seo?.author || '');
        setSiteLang(config.seo?.lang || 'fr');
        setPrimaryColor(config.theme?.primary || '#3b82f6');
        setAccentColor(config.theme?.accent || '#06b6d4');
        setLogoUrl(config.branding?.logo || '');
        setFaviconUrl(config.branding?.favicon || '');
        setBackgroundUrl(config.backgrounds?.home || '');
        setBackgroundBlur(config.backgrounds?.blur || 0.5);
        setBackgroundDim(config.backgrounds?.dim || 0.01);
        setHeroVideoUrl(config.heroVideo?.youtubeId ? `https://www.youtube.com/watch?v=${config.heroVideo.youtubeId}` : '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la config site:', error);
      showMessage('Erreur', 'Impossible de charger la configuration du site', 'error');
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
      'Êtes-vous sûr de vouloir sauvegarder la configuration du site ?',
      async () => {
        try {
          setSaving(true);
          
          const siteConfig = {
            seo: {
              title: siteTitle,
              description: siteDescription,
              keywords: siteKeywords,
              author: siteAuthor,
              lang: siteLang
            },
            theme: {
              primary: primaryColor,
              accent: accentColor
            },
            branding: {
              logo: logoUrl,
              favicon: faviconUrl
            },
            backgrounds: {
              home: backgroundUrl,
              blur: backgroundBlur,
              dim: backgroundDim
            },
            heroVideo: {
              youtubeId: extractYoutubeId(heroVideoUrl)
            },
            audio: { enabled: false },
            game: {
              title: "Pokémon New World",
              description: "Explorez la région de Bélamie"
            },
            carousel: {
              images: []
            },
            discord: {
              invite: "#"
            }
          };
          
          const response = await fetch(`${API_BASE}/config/site`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders(),
            },
            body: JSON.stringify({ config: siteConfig })
          });
          
          const data = await response.json();
          
          if (data.success) {
            onSave(siteConfig);
            showMessage('Succès !', 'Configuration du site sauvegardée avec succès !', 'success');
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
        <span>Chargement de la configuration...</span>
      </div>
    );
  }

  return (
    <div className="site-editor">
      <div className="site-editor-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <h2>
          <i className="fa-solid fa-cog"></i> Configuration du Site
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

      <div className="site-editor-grid" style={{ display: 'grid', gap: '2rem' }}>
        {/* Logo global : une seule URL pour tout le site public qui affiche le logo */}
        <div
          className="site-editor-section"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(255,255,255,0.06) 100%)',
            borderRadius: '10px',
            padding: '2rem',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
        >
          <h3
            style={{
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#fbbf24',
            }}
          >
            <i className="fa-solid fa-image"></i> Logo du site (URL globale)
          </h3>
          <p style={{ margin: '0 0 1.25rem', color: 'rgba(255,255,255,0.82)', fontSize: '0.95rem', lineHeight: 1.55 }}>
            Collez ici le <strong>lien direct vers votre image</strong> (PNG, WebP ou SVG recommandés), hébergée où vous voulez (CDN, Imgur, votre domaine…).
            Ce logo est utilisé <strong>partout où le site en a besoin</strong> : accueil (hero), pied de page, page téléchargement, menu latéral.
            Vous pouvez aussi utiliser un fichier du site au format <code style={{ background: 'rgba(0,0,0,0.25)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>public/mon-logo.png</code> → enregistré comme chemin commençant par <code style={{ background: 'rgba(0,0,0,0.25)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>public/</code>.
          </p>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            <i className="fa-solid fa-link"></i> URL du logo
          </label>
          <input
            type="text"
            inputMode="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://exemple.com/chemin/vers/logo.png ou public/logo.png"
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '1rem',
            }}
          />
          {logoUrl?.trim() ? (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <span style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>Aperçu</span>
              <img
                src={logoUrl.trim().startsWith('public/') ? `/${logoUrl.trim().slice(7)}` : logoUrl.trim()}
                alt=""
                style={{
                  maxWidth: '220px',
                  maxHeight: '110px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          ) : null}
        </div>

        {/* SEO et Métadonnées */}
        <div className="site-editor-section" style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#3b82f6'
          }}>
            <i className="fa-solid fa-search"></i> SEO et Métadonnées
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-heading"></i> Titre du site :
              </label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                placeholder="Pokémon New World • Site officiel"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-align-left"></i> Description du site :
              </label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder="Site officiel du fangame Pokémon New World..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="site-editor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}>
                  <i className="fa-solid fa-tags"></i> Mots-clés :
                </label>
                <input
                  type="text"
                  value={siteKeywords}
                  onChange={(e) => setSiteKeywords(e.target.value)}
                  placeholder="pokemon, fangame, bélamie, aspic, malice"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}>
                  <i className="fa-solid fa-user"></i> Auteur :
                </label>
                <input
                  type="text"
                  value={siteAuthor}
                  onChange={(e) => setSiteAuthor(e.target.value)}
                  placeholder="Équipe Pokémon New World"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <div style={{ width: '200px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-globe"></i> Langue :
              </label>
              <select
                value={siteLang}
                onChange={(e) => setSiteLang(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Thème et Couleurs */}
        <div className="site-editor-section" style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#06b6d4'
          }}>
            <i className="fa-solid fa-palette"></i> Thème et Couleurs
          </h3>
          
          <div className="site-editor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                <i className="fa-solid fa-circle" style={{ color: primaryColor }}></i> Couleur principale :
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
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
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-circle" style={{ color: accentColor }}></i> Couleur d'accent :
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#06b6d4"
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
              </div>
            </div>
          </div>
        </div>

        {/* Images et Branding */}
        <div className="site-editor-section" style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#f59e0b'
          }}>
            <i className="fa-solid fa-image"></i> Favicon & fond d’accueil
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-bookmark"></i> Favicon :
              </label>
              <input
                type="url"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="/favicon.ico ou https://exemple.com/favicon.png"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
              {faviconUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img 
                    src={faviconUrl} 
                    alt="Aperçu favicon" 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '3px'
                    }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <span style={{ marginLeft: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                    Taille recommandée: 32x32px
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-mountain-city"></i> Image de fond :
              </label>
              <p style={{ marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                Chemin local (/image.jpg) ou URL complète (https://…). Si l’image ne s’affiche pas, le site source peut bloquer l’affichage externe (hotlink) — essayez un hébergeur d’images qui l’autorise (ex. postimg.cc, imgur).
              </p>
              <input
                type="url"
                value={backgroundUrl}
                onChange={(e) => setBackgroundUrl(e.target.value)}
                placeholder="https://exemple.com/background.png"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
              {backgroundUrl && (
                <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                  <img 
                    src={backgroundUrl} 
                    alt="Aperçu fond" 
                    style={{ 
                      maxWidth: '300px', 
                      maxHeight: '150px', 
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '5px',
                      objectFit: 'cover'
                    }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            <div className="site-editor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}>
                  <i className="fa-solid fa-eye-dropper"></i> Flou du fond ({backgroundBlur}px) :
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={backgroundBlur}
                  onChange={(e) => setBackgroundBlur(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}>
                  <i className="fa-solid fa-adjust"></i> Opacité du fond ({Math.round(backgroundDim * 100)}%) :
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={backgroundDim}
                  onChange={(e) => setBackgroundDim(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Médias et Contenu */}
        <div className="site-editor-section" style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ef4444'
          }}>
            <i className="fa-solid fa-play-circle"></i> Médias et Contenu
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-brands fa-youtube"></i> Lien vidéo YouTube (Hero)
              </label>
              <input
                type="url"
                value={heroVideoUrl}
                onChange={(e) => setHeroVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
              <small style={{ color: 'rgba(255,255,255,0.6)' }}>
                Collez le lien direct (sans son sur le site). Ex. <code>https://www.youtube.com/watch?v=jgclYWhhQak</code> ou <code>https://youtu.be/jgclYWhhQak</code>
              </small>
            </div>
          </div>
        </div>

        {/* Aperçu */}
        <div style={{ 
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
            <i className="fa-solid fa-eye"></i> Aperçu
          </h3>
          
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ color: primaryColor, margin: '0 0 0.5rem 0' }}>{siteTitle || 'Titre du site'}</h4>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>
                {siteDescription || 'Description du site'}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ 
                background: primaryColor, 
                padding: '0.5rem 1rem', 
                borderRadius: '5px',
                fontSize: '0.9rem'
              }}>
                Couleur principale
              </div>
              <div style={{ 
                background: accentColor, 
                padding: '0.5rem 1rem', 
                borderRadius: '5px',
                fontSize: '0.9rem'
              }}>
                Couleur d'accent
              </div>
            </div>
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

export default SiteEditor;