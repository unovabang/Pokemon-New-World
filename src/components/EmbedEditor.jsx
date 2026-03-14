import { useState, useMemo, useRef } from "react";

const DEFAULT_COLOR_HEX = "#5865F2";

function hexToDecimal(hex) {
  if (!hex || typeof hex !== "string") return null;
  const cleaned = hex.replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  return parseInt(cleaned, 16);
}

const emptyEmbed = () => ({
  title: "",
  description: "",
  url: "",
  color: DEFAULT_COLOR_HEX,
  author: { name: "", icon_url: "", url: "" },
  footer: { text: "", icon_url: "" },
  image: "",
  thumbnail: "",
  fields: [],
});

const MARKDOWN_BUTTONS = [
  { label: "Gras", before: "**", after: "**", icon: "fa-bold", title: "Gras (**texte**)" },
  { label: "Italique", before: "*", after: "*", icon: "fa-italic", title: "Italique (*texte*)" },
  { label: "Souligné", before: "__", after: "__", icon: "fa-underline", title: "Souligné (__texte__)" },
  { label: "Barré", before: "~~", after: "~~", icon: "fa-strikethrough", title: "Barré (~~texte~~)" },
  { label: "Code", before: "`", after: "`", icon: "fa-code", title: "Code (`texte`)" },
  { label: "Bloc de code", before: "```\n", after: "\n```", icon: "fa-square-code", title: "Bloc de code" },
  { label: "Lien", before: "[", after: "](https://)", icon: "fa-link", title: "Lien [texte](url)" },
];

export default function EmbedEditor() {
  const [content, setContent] = useState("");
  const [embed, setEmbed] = useState(emptyEmbed());
  const [showJson, setShowJson] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const descRef = useRef(null);

  const updateEmbed = (key, value) => setEmbed((prev) => ({ ...prev, [key]: value }));
  const updateAuthor = (key, value) => setEmbed((prev) => ({ ...prev, author: { ...prev.author, [key]: value } }));
  const updateFooter = (key, value) => setEmbed((prev) => ({ ...prev, footer: { ...prev.footer, [key]: value } }));
  const addField = () => setEmbed((prev) => ({ ...prev, fields: [...prev.fields, { name: "", value: "", inline: false }] }));
  const updateField = (index, key, value) =>
    setEmbed((prev) => ({ ...prev, fields: prev.fields.map((f, i) => (i === index ? { ...f, [key]: value } : f)) }));
  const removeField = (index) => setEmbed((prev) => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));

  const insertMarkdown = (before, after) => {
    const ta = descRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = embed.description || "";
    const selected = text.slice(start, end);
    const newText = text.slice(0, start) + before + selected + after + text.slice(end);
    updateEmbed("description", newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length + selected.length, start + before.length + selected.length);
    }, 0);
  };

  const payload = useMemo(() => {
    const e = {};
    if (embed.title?.trim()) e.title = embed.title.trim();
    if (embed.description?.trim()) e.description = embed.description.trim();
    if (embed.url?.trim()) e.url = embed.url.trim();
    const colorNum = hexToDecimal(embed.color);
    if (colorNum != null) e.color = colorNum;
    if (embed.author?.name?.trim()) {
      e.author = {
        name: embed.author.name.trim(),
        ...(embed.author.icon_url?.trim() && { icon_url: embed.author.icon_url.trim() }),
        ...(embed.author.url?.trim() && { url: embed.author.url.trim() }),
      };
    }
    if (embed.footer?.text?.trim()) {
      e.footer = {
        text: embed.footer.text.trim(),
        ...(embed.footer.icon_url?.trim() && { icon_url: embed.footer.icon_url.trim() }),
      };
    }
    if (embed.image?.trim()) e.image = { url: embed.image.trim() };
    if (embed.thumbnail?.trim()) e.thumbnail = { url: embed.thumbnail.trim() };
    if (embed.fields?.length) {
      e.fields = embed.fields
        .filter((f) => (f.name || "").trim() || (f.value || "").trim())
        .map((f) => ({
          name: (f.name || "").trim() || "—",
          value: (f.value || "").trim() || "—",
          inline: !!f.inline,
        }));
    }
    const body = {};
    if (content.trim()) body.content = content.trim();
    if (Object.keys(e).length) body.embeds = [e];
    return body;
  }, [embed, content]);

  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const copyJson = () => {
    navigator.clipboard.writeText(payloadJson).then(() => {
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    });
  };

  const sendToWebhook = async () => {
    const url = webhookUrl.trim();
    if (!url) {
      setSendResult({ ok: false, message: "Indiquez l'URL du webhook." });
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setSendResult(res.ok ? { ok: true, message: "Message envoyé avec succès." } : { ok: false, message: `Erreur ${res.status}` });
    } catch (err) {
      setSendResult({ ok: false, message: err.message || "Erreur réseau." });
    } finally {
      setSending(false);
    }
  };

  const resetEmbed = () => {
    setContent("");
    setEmbed(emptyEmbed());
    setSendResult(null);
  };

  const hasPreview = embed.title || embed.description || embed.author?.name || embed.footer?.text || embed.image || embed.thumbnail || (embed.fields?.length && embed.fields.some((f) => f.name || f.value));

  return (
    <div className="embed-editor">
      <header className="embed-editor-header">
        <h2 className="embed-editor-title">Embed Discord</h2>
        <p className="embed-editor-intro">Créez un embed, prévisualisez-le et envoyez-le à un webhook.</p>
      </header>

      <div className="embed-editor-layout">
        <div className="embed-editor-form">
          <section className="embed-section">
            <h3 className="embed-section-title">Message & contenu</h3>
            <div className="embed-field">
              <label className="embed-label">Message (au-dessus de l&apos;embed)</label>
              <input type="text" className="embed-input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Texte optionnel" />
            </div>
            <div className="embed-field">
              <label className="embed-label">Titre</label>
              <input type="text" className="embed-input" value={embed.title} onChange={(e) => updateEmbed("title", e.target.value)} placeholder="Titre de l'embed" />
            </div>
            <div className="embed-field">
              <label className="embed-label">URL du titre</label>
              <input type="url" className="embed-input" value={embed.url} onChange={(e) => updateEmbed("url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="embed-field embed-field-description">
              <label className="embed-label">Description</label>
              <div className="embed-description-toolbar">
                {MARKDOWN_BUTTONS.map((btn) => (
                  <button
                    key={btn.icon}
                    type="button"
                    className="embed-md-btn"
                    onClick={() => insertMarkdown(btn.before, btn.after)}
                    title={btn.title}
                    aria-label={btn.label}
                  >
                    <i className={`fa-solid ${btn.icon}`} aria-hidden />
                  </button>
                ))}
              </div>
              <textarea
                ref={descRef}
                className="embed-textarea"
                value={embed.description}
                onChange={(e) => updateEmbed("description", e.target.value)}
                placeholder="Description (Markdown accepté)"
                rows={5}
              />
            </div>
          </section>

          <section className="embed-section">
            <h3 className="embed-section-title">Apparence</h3>
            <div className="embed-field embed-field-color">
              <label className="embed-label">Couleur de la barre</label>
              <div className="embed-color-row">
                <input type="color" value={embed.color} onChange={(e) => updateEmbed("color", e.target.value)} className="embed-color-picker" />
                <input type="text" className="embed-input" value={embed.color} onChange={(e) => updateEmbed("color", e.target.value)} placeholder="#5865F2" style={{ width: "120px" }} />
              </div>
            </div>
          </section>

          <section className="embed-section">
            <h3 className="embed-section-title">Auteur</h3>
            <div className="embed-field">
              <label className="embed-label">Nom</label>
              <input type="text" className="embed-input" value={embed.author?.name ?? ""} onChange={(e) => updateAuthor("name", e.target.value)} placeholder="Nom de l'auteur" />
            </div>
            <div className="embed-field">
              <label className="embed-label">Icône (URL)</label>
              <input type="url" className="embed-input" value={embed.author?.icon_url ?? ""} onChange={(e) => updateAuthor("icon_url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="embed-field">
              <label className="embed-label">Lien (URL)</label>
              <input type="url" className="embed-input" value={embed.author?.url ?? ""} onChange={(e) => updateAuthor("url", e.target.value)} placeholder="https://..." />
            </div>
          </section>

          <section className="embed-section">
            <h3 className="embed-section-title">Médias</h3>
            <div className="embed-field">
              <label className="embed-label">Image principale</label>
              <p className="embed-hint">Grande image affichée dans l&apos;embed.</p>
              <input type="url" className="embed-input" value={embed.image} onChange={(e) => updateEmbed("image", e.target.value)} placeholder="https://..." />
            </div>
            <div className="embed-field">
              <label className="embed-label">Miniature (thumbnail)</label>
              <p className="embed-hint">Petite image en haut à droite de l&apos;embed.</p>
              <input type="url" className="embed-input" value={embed.thumbnail} onChange={(e) => updateEmbed("thumbnail", e.target.value)} placeholder="https://..." />
            </div>
          </section>

          <section className="embed-section">
            <h3 className="embed-section-title">Pied de page</h3>
            <div className="embed-field">
              <label className="embed-label">Texte</label>
              <input type="text" className="embed-input" value={embed.footer?.text ?? ""} onChange={(e) => updateFooter("text", e.target.value)} placeholder="Texte du footer" />
            </div>
            <div className="embed-field">
              <label className="embed-label">Icône (URL)</label>
              <input type="url" className="embed-input" value={embed.footer?.icon_url ?? ""} onChange={(e) => updateFooter("icon_url", e.target.value)} placeholder="https://..." />
            </div>
          </section>

          <section className="embed-section">
            <h3 className="embed-section-title">Champs</h3>
            <button type="button" onClick={addField} className="embed-btn embed-btn-secondary">
              <i className="fa-solid fa-plus" aria-hidden /> Ajouter un champ
            </button>
            {embed.fields.map((field, i) => (
              <div key={i} className="embed-field-row">
                <input type="text" className="embed-input" value={field.name} onChange={(e) => updateField(i, "name", e.target.value)} placeholder="Nom" />
                <input type="text" className="embed-input" value={field.value} onChange={(e) => updateField(i, "value", e.target.value)} placeholder="Valeur" />
                <label className="embed-checkbox">
                  <input type="checkbox" checked={!!field.inline} onChange={(e) => updateField(i, "inline", e.target.checked)} />
                  Inline
                </label>
                <button type="button" onClick={() => removeField(i)} className="embed-btn embed-btn-icon" title="Supprimer" aria-label="Supprimer">
                  <i className="fa-solid fa-trash" aria-hidden />
                </button>
              </div>
            ))}
          </section>

          <section className="embed-section">
            <h3 className="embed-section-title">Actions</h3>
            <div className="embed-actions">
              <button type="button" onClick={() => setShowJson((s) => !s)} className="embed-btn embed-btn-secondary">
                <i className="fa-solid fa-code" aria-hidden /> {showJson ? "Masquer" : "Voir"} le JSON
              </button>
              <button type="button" onClick={copyJson} className="embed-btn embed-btn-secondary">
                <i className="fa-solid fa-copy" aria-hidden /> {jsonCopied ? "Copié" : "Copier le JSON"}
              </button>
              <button type="button" onClick={resetEmbed} className="embed-btn embed-btn-secondary">
                <i className="fa-solid fa-rotate-left" aria-hidden /> Réinitialiser
              </button>
            </div>
            {showJson && <pre className="embed-json">{payloadJson}</pre>}
          </section>

          <section className="embed-section embed-section-help">
            <button type="button" className="embed-help-toggle" onClick={() => setShowHelp((h) => !h)} aria-expanded={showHelp}>
              <i className="fa-solid fa-circle-info" aria-hidden /> Aide : Markdown & icônes
              <i className={`fa-solid fa-chevron-${showHelp ? "up" : "down"}`} aria-hidden />
            </button>
            {showHelp && (
              <div className="embed-help-content">
                <div className="embed-help-block">
                  <h4>Markdown dans la description</h4>
                  <ul>
                    <li><code>**texte**</code> → gras</li>
                    <li><code>*texte*</code> → italique</li>
                    <li><code>__texte__</code> → souligné</li>
                    <li><code>~~texte~~</code> → barré</li>
                    <li><code>`code`</code> → code</li>
                    <li><code>[texte](url)</code> → lien</li>
                  </ul>
                </div>
                <div className="embed-help-block">
                  <h4>Icônes du formulaire</h4>
                  <ul className="embed-help-icons">
                    <li><i className="fa-solid fa-heading" aria-hidden /> Titre — cliquable si URL renseignée</li>
                    <li><i className="fa-solid fa-user" aria-hidden /> Auteur — nom, icône, lien en haut de l&apos;embed</li>
                    <li><i className="fa-solid fa-image" aria-hidden /> Image principale — grande image</li>
                    <li><i className="fa-solid fa-crop" aria-hidden /> Miniature — en haut à droite</li>
                    <li><i className="fa-solid fa-align-left" aria-hidden /> Pied de page — texte + icône en bas</li>
                    <li><i className="fa-solid fa-list" aria-hidden /> Champs — paires nom / valeur</li>
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="embed-editor-aside">
          <div className="embed-preview-card">
            <h3 className="embed-preview-card-title">Aperçu</h3>
            <div className="embed-preview-inner">
              {content.trim() && <p className="embed-preview-content">{content.trim()}</p>}
              {hasPreview ? (
                <div className={`embed-preview-box${embed.thumbnail?.trim() ? " embed-preview-box--with-thumbnail" : ""}`} style={{ borderLeftColor: embed.color || DEFAULT_COLOR_HEX }}>
                  {embed.thumbnail?.trim() && (
                    <div className="embed-preview-thumbnail-wrap">
                      <img src={embed.thumbnail} alt="" className="embed-preview-thumbnail" onError={(e) => (e.target.style.display = "none")} />
                    </div>
                  )}
                  <div className="embed-preview-body">
                    {embed.author?.name?.trim() && (
                      <div className="embed-preview-author">
                        {embed.author?.icon_url?.trim() && (
                          <img src={embed.author.icon_url} alt="" className="embed-preview-author-icon" onError={(e) => (e.target.style.display = "none")} />
                        )}
                        {embed.author?.url?.trim() ? (
                          <a href={embed.author.url} target="_blank" rel="noopener noreferrer" className="embed-preview-author-name">{embed.author.name}</a>
                        ) : (
                          <span className="embed-preview-author-name">{embed.author.name}</span>
                        )}
                      </div>
                    )}
                    {embed.title?.trim() && (
                      <div className="embed-preview-title">
                        {embed.url?.trim() ? (
                          <a href={embed.url} target="_blank" rel="noopener noreferrer">{embed.title}</a>
                        ) : (
                          embed.title
                        )}
                      </div>
                    )}
                    {embed.description?.trim() && <div className="embed-preview-description">{embed.description}</div>}
                    {embed.image?.trim() && (
                      <div className="embed-preview-image-wrap">
                        <img src={embed.image} alt="" className="embed-preview-image" onError={(e) => (e.target.style.display = "none")} />
                      </div>
                    )}
                    {embed.fields?.filter((f) => f.name?.trim() || f.value?.trim()).length > 0 && (
                      <div className="embed-preview-fields">
                        {embed.fields.filter((f) => f.name?.trim() || f.value?.trim()).map((f, i) => (
                          <div key={i} className={`embed-preview-field ${f.inline ? "embed-preview-field--inline" : ""}`}>
                            <div className="embed-preview-field-name">{(f.name || "").trim() || "—"}</div>
                            <div className="embed-preview-field-value">{(f.value || "").trim() || "—"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {(embed.footer?.text?.trim() || embed.footer?.icon_url?.trim()) && (
                    <div className="embed-preview-footer-row">
                      {embed.footer?.icon_url?.trim() && (
                        <img src={embed.footer.icon_url} alt="" className="embed-preview-footer-icon" onError={(e) => (e.target.style.display = "none")} />
                      )}
                      {embed.footer?.text?.trim() && <span className="embed-preview-footer-text">{embed.footer.text}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="embed-preview-empty">Remplissez au moins un champ pour voir l&apos;aperçu.</p>
              )}
            </div>
          </div>

          <div className="embed-webhook-card">
            <h3 className="embed-preview-card-title">Envoyer au webhook</h3>
            <div className="embed-field">
              <label className="embed-label">URL du webhook</label>
              <input type="url" className="embed-input" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
            </div>
            <button type="button" onClick={sendToWebhook} disabled={sending} className="embed-btn embed-btn-primary">
              {sending ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Envoi…</> : <><i className="fa-solid fa-paper-plane" aria-hidden /> Envoyer</>}
            </button>
            {sendResult && (
              <p className={`embed-send-result ${sendResult.ok ? "embed-send-result--ok" : "embed-send-result--err"}`}>
                {sendResult.ok ? <i className="fa-solid fa-check" aria-hidden /> : <i className="fa-solid fa-exclamation-triangle" aria-hidden />} {sendResult.message}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
