import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const CATEGORIES = [
  { id: "bug", label: "Bug / Problème technique", labelEn: "Bug / Technical issue", icon: "fa-bug", color: "#e74c3c" },
  { id: "suggestion", label: "Suggestion", labelEn: "Suggestion", icon: "fa-lightbulb", color: "#f1c40f" },
  { id: "recrutement", label: "Recrutement", labelEn: "Recruitment", icon: "fa-user-plus", color: "#3498db" },
  { id: "question", label: "Question générale", labelEn: "General question", icon: "fa-circle-question", color: "#9b59b6" },
  { id: "autre", label: "Autre", labelEn: "Other", icon: "fa-ellipsis", color: "#95a5a6" },
];

export default function ContactPage() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [bgImage, setBgImage] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/config/contact-webhook?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => { if (d?.backgroundImage) setBgImage(d.backgroundImage); })
      .catch(() => {});
  }, []);

  const canSubmit = category && contact.trim() && subject.trim() && message.trim() && !sending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, contact: contact.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (data?.success) {
        setResult({ type: "success", text: isEn ? "Your message has been sent. Thank you!" : "Votre message a bien été envoyé. Merci !" });
        setCategory("");
        setContact("");
        setSubject("");
        setMessage("");
      } else {
        setResult({ type: "error", text: data?.error || (isEn ? "An error occurred." : "Une erreur est survenue.") });
      }
    } catch {
      setResult({ type: "error", text: isEn ? "Unable to reach the server." : "Impossible de joindre le serveur." });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="page page-with-sidebar contact-page" style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}>
      <Sidebar />
      <div className="contact-page-inner">
        <LanguageSelector className="contact-lang" />
        <header className="contact-hero">
          <div className="contact-hero-icon">
            <i className="fa-solid fa-envelope" />
          </div>
          <h1 className="contact-hero-title">
            {isEn ? "Contact the Team" : "Contacter l'équipe"}
          </h1>
          <p className="contact-hero-subtitle">
            {isEn
              ? "A bug, a suggestion, or just a question? We're here to help."
              : "Un bug, une suggestion, ou une simple question ? Nous sommes là pour vous aider."}
          </p>
        </header>

        <form className="contact-form" onSubmit={handleSubmit}>
          {/* Catégorie */}
          <div className="contact-field">
            <span className="contact-label">
              {isEn ? "Category" : "Catégorie"} <span className="contact-required">*</span>
            </span>
            <div className="contact-categories">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`contact-cat-btn${category === cat.id ? " contact-cat-btn--active" : ""}`}
                  onClick={() => setCategory(cat.id)}
                  style={category === cat.id ? { borderColor: cat.color, background: `${cat.color}18` } : undefined}
                >
                  <i className={`fa-solid ${cat.icon}`} style={category === cat.id ? { color: cat.color } : undefined} />
                  <span>{isEn ? cat.labelEn : cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <label className="contact-field">
            <span className="contact-label">
              {isEn ? "Your email or Discord" : "Votre email ou Discord"} <span className="contact-required">*</span>
            </span>
            <input
              type="text"
              className="contact-input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={isEn ? "email@example.com or Username#1234" : "email@exemple.com ou Pseudo#1234"}
              required
            />
          </label>

          {/* Sujet */}
          <label className="contact-field">
            <span className="contact-label">
              {isEn ? "Subject" : "Sujet"} <span className="contact-required">*</span>
            </span>
            <input
              type="text"
              className="contact-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isEn ? "Brief summary of your request" : "Résumé bref de votre demande"}
              required
            />
          </label>

          {/* Message */}
          <label className="contact-field">
            <span className="contact-label">
              {isEn ? "Message" : "Message"} <span className="contact-required">*</span>
            </span>
            <textarea
              className="contact-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={isEn ? "Describe your request in detail..." : "Décrivez votre demande en détail..."}
              required
            />
          </label>

          {result && (
            <div className={`contact-result contact-result--${result.type}`}>
              <i className={result.type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation"} />
              {result.text}
            </div>
          )}

          <button type="submit" className="contact-submit" disabled={!canSubmit}>
            {sending ? (
              <><i className="fa-solid fa-spinner fa-spin" /> {isEn ? "Sending..." : "Envoi..."}</>
            ) : (
              <><i className="fa-solid fa-paper-plane" /> {isEn ? "Send message" : "Envoyer le message"}</>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
