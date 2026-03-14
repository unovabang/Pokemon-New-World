import { useState, useMemo, useRef } from "react";

/** Couleur par défaut style Discord (bleu) */
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
  const [showHelp, setShowHelp] = useState(true);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const descRef = useRef(null);

  const updateEmbed = (key, value) => {
    setEmbed((prev) => ({ ...prev, [key]: value }));
  };

  const updateAuthor = (key, value) => {
    setEmbed((prev) => ({
      ...prev,
      author: { ...prev.author, [key]: value },
    }));
  };

  const updateFooter = (key, value) => {
    setEmbed((prev) => ({
      ...prev,
      footer: { ...prev.footer, [key]: value },
    }));
  };

  const addField = () => {
    setEmbed((prev) => ({
      ...prev,
      fields: [...prev.fields, { name: "", value: "", inline: false }],
    }));
  };

  const updateField = (index, key, value) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) =>
        i === index ? { ...f, [key]: value } : f
      ),
    }));
  };

  const removeField = (index) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

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
      const newCursor = start + before.length + selected.length;
      ta.setSelectionRange(newCursor, newCursor);
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
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSendResult({ ok: true, message: "Message envoyé avec succès." });
      } else {
        const text = await res.text();
        setSendResult({ ok: false, message: `Erreur ${res.status}: ${text.slice(0, 200)}` });
      }
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
    <div className="admin-pokedex embed-editor">
      <section className="admin-pokedex-card">
        <h3><i className="fa-solid fa-palette" aria-hidden /> Créateur d&apos;embed Discord</h3>
        <p style={{ margin: "0 0 1rem 0", opacity: 0.9, fontSize: "0.9rem" }}>
          Remplissez les champs et prévisualisez l&apos;embed. Vous pouvez copier le JSON ou envoyer directement à un webhook.
        </p>

        <div className="embed-editor-layout">
          <div className="embed-editor-form">
            <div>
              <label className="admin-pokedex-label">Message (au-dessus de l&apos;embed)</label>
              <input
                type="text"
                className="admin-pokedex-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Texte optionnel..."
              />
            </div>
            <div>
              <label className="admin-pokedex-label">Titre</label>
              <input
                type="text"
                className="admin-pokedex-input"
                value={embed.title}
                onChange={(e) => updateEmbed("title", e.target.value)}
                placeholder="Titre de l'embed"
              />
            </div>
            <div>
              <label className="admin-pokedex-label">URL (lien du titre)</label>
              <input
                type="url"
                className="admin-pokedex-input"
                value={embed.url}
                onChange={(e) => updateEmbed("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="admin-pokedex-label">Description</label>
              <textarea
                className="admin-pokedex-textarea"
                value={embed.description}
                onChange={(e) => updateEmbed("description", e.target.value)}
                placeholder="Description (supporte le Markdown basique)"
                rows={4}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <label className="admin-pokedex-label" style={{ marginBottom: 0 }}>Couleur de la barre</label>
              <input
                type="color"
                value={embed.color}
                onChange={(e) => updateEmbed("color", e.target.value)}
                style={{ width: 48, height: 36, padding: 2, borderRadius: 8, border: "1px solid rgba(255,255,255,.2)", cursor: "pointer" }}
                title={embed.color}
              />
              <input
                type="text"
                className="admin-pokedex-input"
                value={embed.color}
                onChange={(e) => updateEmbed("color", e.target.value)}
                placeholder="#5865F2"
                style={{ width: 100 }}
              />
            </div>

            <div className="embed-editor-block">
              <span className="admin-pokedex-label"><i className="fa-solid fa-user" aria-hidden /> Auteur</span>
              <input
                type="text"
                className="admin-pokedex-input"
                value={embed.author?.name ?? ""}
                onChange={(e) => updateAuthor("name", e.target.value)}
                placeholder="Nom"
              />
              <input
                type="url"
                className="admin-pokedex-input"
                value={embed.author?.icon_url ?? ""}
                onChange={(e) => updateAuthor("icon_url", e.target.value)}
                placeholder="URL icône"
              />
              <input
                type="url"
                className="admin-pokedex-input"
                value={embed.author?.url ?? ""}
                onChange={(e) => updateAuthor("url", e.target.value)}
                placeholder="URL (lien du nom)"
              />
            </div>

            <div className="embed-editor-block">
              <span className="admin-pokedex-label"><i className="fa-solid fa-image" aria-hidden /> Image dans l&apos;embed</span>
              <p className="embed-editor-hint">URL de l&apos;image principale affichée dans l&apos;embed (grande image en bas de la description).</p>
              <input
                type="url"
                className="admin-pokedex-input"
                value={embed.image}
                onChange={(e) => updateEmbed("image", e.target.value)}
                placeholder="https://exemple.com/image.png"
              />
            </div>
            <div className="embed-editor-block">
              <span className="admin-pokedex-label"><i className="fa-solid fa-crop" aria-hidden /> Miniature (thumbnail)</span>
              <p className="embed-editor-hint">Petite image en haut à droite de l&apos;embed.</p>
              <input
                type="url"
                className="admin-pokedex-input"
                value={embed.thumbnail}
                onChange={(e) => updateEmbed("thumbnail", e.target.value)}
                placeholder="https://exemple.com/thumb.png"
              />
            </div>

            <div className="embed-editor-block">
              <span className="admin-pokedex-label"><i className="fa-solid fa-align-left" aria-hidden /> Pied de page</span>
              <input
                type="text"
                className="admin-pokedex-input"
                value={embed.footer?.text ?? ""}
                onChange={(e) => updateFooter("text", e.target.value)}
                placeholder="Texte"
              />
              <input
                type="url"
                className="admin-pokedex-input"
                value={embed.footer?.icon_url ?? ""}
                onChange={(e) => updateFooter("icon_url", e.target.value)}
                placeholder="URL icône"
              />
            </div>

            <div className="embed-editor-block">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span className="admin-pokedex-label"><i className="fa-solid fa-list" aria-hidden /> Champs</span>
                <button type="button" onClick={addField} className="admin-pokedex-btn admin-pokedex-btn-primary" style={{ padding: "0.4rem 0.75rem" }}>
                  <i className="fa-solid fa-plus" /> Ajouter
                </button>
              </div>
              {embed.fields.map((field, i) => (
                <div key={i} className="embed-editor-field-row">
                  <input
                    type="text"
                    className="admin-pokedex-input"
                    value={field.name}
                    onChange={(e) => updateField(i, "name", e.target.value)}
                    placeholder="Nom"
                  />
                  <input
                    type="text"
                    className="admin-pokedex-input"
                    value={field.value}
                    onChange={(e) => updateField(i, "value", e.target.value)}
                    placeholder="Valeur"
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
                    <input
                      type="checkbox"
                      checked={!!field.inline}
                      onChange={(e) => updateField(i, "inline", e.target.checked)}
                    />
                    Inline
                  </label>
                  <button type="button" onClick={() => removeField(i)} className="admin-pokedex-btn admin-pokedex-btn-ghost" title="Supprimer" style={{ padding: "0.4rem" }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <button type="button" onClick={() => setShowJson((s) => !s)} className="admin-pokedex-btn admin-pokedex-btn-ghost">
                <i className="fa-solid fa-code" /> {showJson ? "Masquer" : "Voir"} le JSON
              </button>
              <button type="button" onClick={copyJson} className="admin-pokedex-btn admin-pokedex-btn-ghost">
                <i className="fa-solid fa-copy" /> {jsonCopied ? "Copié !" : "Copier le JSON"}
              </button>
              <button type="button" onClick={resetEmbed} className="admin-pokedex-btn admin-pokedex-btn-ghost">
                <i className="fa-solid fa-rotate-left" /> Réinitialiser
              </button>
            </div>

            <section className="embed-editor-help">
              <button
                type="button"
                className="embed-editor-help-toggle"
                onClick={() => setShowHelp((h) => !h)}
                aria-expanded={showHelp}
              >
                <i className="fa-solid fa-circle-info" aria-hidden /> Aide : Markdown & icônes
                <i className={`fa-solid fa-chevron-${showHelp ? "up" : "down"}`} aria-hidden />
              </button>
              {showHelp && (
                <div className="embed-editor-help-content">
                  <div className="embed-editor-help-block">
                    <h4><i className="fa-solid fa-font" aria-hidden /> Markdown dans la description</h4>
                    <ul>
                      <li><code>**texte**</code> → <strong>gras</strong></li>
                      <li><code>*texte*</code> → <em>italique</em></li>
                      <li><code>__texte__</code> → souligné</li>
                      <li><code>~~texte~~</code> → <s>barré</s></li>
                      <li><code>`code`</code> → code inline</li>
                      <li><code>[texte](url)</code> → lien cliquable</li>
                    </ul>
                  </div>
                  <div className="embed-editor-help-block">
                    <h4><i className="fa-solid fa-icons" aria-hidden /> Icônes du formulaire</h4>
                    <ul className="embed-editor-help-icons">
                      <li><i className="fa-solid fa-heading" aria-hidden /> Titre — titre de l&apos;embed (cliquable si URL renseignée)</li>
                      <li><i className="fa-solid fa-user" aria-hidden /> Auteur — nom + icône + lien optionnels en haut de l&apos;embed</li>
                      <li><i className="fa-solid fa-image" aria-hidden /> Image — grande image dans l&apos;embed</li>
                      <li><i className="fa-solid fa-crop" aria-hidden /> Miniature — petite image en haut à droite</li>
                      <li><i className="fa-solid fa-align-left" aria-hidden /> Pied de page — texte + icône en bas</li>
                      <li><i className="fa-solid fa-list" aria-hidden /> Champs — paires nom/valeur (inline ou bloc)</li>
                      <li><i className="fa-solid fa-palette" aria-hidden /> Couleur — barre verticale à gauche de l&apos;embed</li>
                      <li><i className="fa-solid fa-paper-plane" aria-hidden /> Webhook — envoi direct vers Discord</li>
                    </ul>
                  </div>
                </div>
              )}
            </section>

            {showJson && (
              <pre className="embed-editor-json" style={{ marginTop: "0.75rem", padding: "1rem", borderRadius: 12, background: "rgba(0,0,0,.35)", fontSize: "0.8rem", overflow: "auto", maxHeight: 280 }}>
                {payloadJson}
              </pre>
            )}
          </div>

          <div className="embed-editor-preview-wrap">
            <span className="admin-pokedex-label" style={{ marginBottom: "0.5rem", display: "block" }}>
              <i className="fa-solid fa-eye" aria-hidden /> Aperçu (style Discord)
            </span>
            <div className="embed-editor-preview">
              {content.trim() && <p className="embed-preview-content">{content.trim()}</p>}
              {hasPreview ? (
                <div
                  className="embed-preview-box"
                  style={{
                    borderLeftColor: embed.color || DEFAULT_COLOR_HEX,
                  }}
                >
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
                  {(embed.thumbnail?.trim() || embed.footer?.text?.trim()) && (
                    <div className="embed-preview-footer-row">
                      {embed.thumbnail?.trim() && (
                        <img src={embed.thumbnail} alt="" className="embed-preview-thumbnail" onError={(e) => (e.target.style.display = "none")} />
                      )}
                      {embed.footer?.text?.trim() && <span className="embed-preview-footer-text">{embed.footer.text}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="embed-preview-empty">Remplissez au moins un champ pour voir l&apos;aperçu.</p>
              )}
            </div>

            <div className="embed-editor-webhook">
              <label className="admin-pokedex-label"><i className="fa-solid fa-paper-plane" aria-hidden /> Envoyer à un webhook</label>
              <input
                type="url"
                className="admin-pokedex-input"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <button type="button" onClick={sendToWebhook} disabled={sending} className="admin-pokedex-btn admin-pokedex-btn-primary" style={{ marginTop: "0.5rem" }}>
                {sending ? <><i className="fa-solid fa-spinner fa-spin" /> Envoi…</> : <><i className="fa-solid fa-paper-plane" /> Envoyer</>}
              </button>
              {sendResult && (
                <p style={{ marginTop: "0.5rem", color: sendResult.ok ? "#86efac" : "#fca5a5", fontSize: "0.9rem" }}>
                  {sendResult.ok ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-exclamation-triangle" />} {sendResult.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
