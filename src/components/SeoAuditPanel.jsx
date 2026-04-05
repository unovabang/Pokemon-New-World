import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

function ScoreGauge({ label, score, icon }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="seo-gauge">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize="22" fontWeight="700">{score}</text>
      </svg>
      <span className="seo-gauge-label">
        <i className={`fa-solid ${icon}`} aria-hidden /> {label}
      </span>
    </div>
  );
}

function VitalCard({ label, value, score }) {
  const status = score >= 0.9 ? "good" : score >= 0.5 ? "needs" : "poor";
  const statusLabel = status === "good" ? "Bon" : status === "needs" ? "Moyen" : "Faible";
  return (
    <div className={`seo-vital seo-vital--${status}`}>
      <span className="seo-vital-label">{label}</span>
      <span className="seo-vital-value">{value}</span>
      <span className={`seo-vital-badge seo-vital-badge--${status}`}>{statusLabel}</span>
    </div>
  );
}

function CheckItem({ label, ok, detail }) {
  return (
    <div className={`seo-check ${ok ? "seo-check--ok" : "seo-check--fail"}`}>
      <i className={`fa-solid ${ok ? "fa-circle-check" : "fa-circle-xmark"}`} />
      <span>{label}</span>
      {detail && <span className="seo-check-detail">{detail}</span>}
    </div>
  );
}

export default function SeoAuditPanel() {
  const [pagespeed, setPagespeed] = useState(null);
  const [audit, setAudit] = useState(null);
  const [gsc, setGsc] = useState(null);
  const [loadingPS, setLoadingPS] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingGSC, setLoadingGSC] = useState(false);
  const [strategy, setStrategy] = useState("mobile");
  const [gscDays, setGscDays] = useState(28);
  const [errorPS, setErrorPS] = useState(null);
  const [errorAudit, setErrorAudit] = useState(null);
  const [errorGSC, setErrorGSC] = useState(null);

  const runPageSpeed = async () => {
    setLoadingPS(true);
    setErrorPS(null);
    try {
      const r = await fetch(`${API_BASE}/seo/pagespeed?strategy=${strategy}&t=${Date.now()}`);
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Reponse serveur invalide"); }
      if (data.success) setPagespeed(data);
      else setErrorPS(data.error || "Erreur inconnue");
    } catch (e) {
      setErrorPS(e.message);
    } finally {
      setLoadingPS(false);
    }
  };

  const runAudit = async () => {
    setLoadingAudit(true);
    setErrorAudit(null);
    try {
      const r = await fetch(`${API_BASE}/seo/audit?t=${Date.now()}`);
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Reponse serveur invalide"); }
      if (data.success) setAudit(data);
      else setErrorAudit(data.error || "Erreur inconnue");
    } catch (e) {
      setErrorAudit(e.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  const runGSC = async () => {
    setLoadingGSC(true);
    setErrorGSC(null);
    try {
      const r = await fetch(`${API_BASE}/seo/search-console?days=${gscDays}&t=${Date.now()}`);
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Reponse serveur invalide"); }
      if (data.success) setGsc(data);
      else setErrorGSC(data.error || "Erreur inconnue");
    } catch (e) {
      setErrorGSC(e.message);
    } finally {
      setLoadingGSC(false);
    }
  };

  const totalIssues = audit?.pages?.reduce((sum, p) => sum + (p.issues?.length || 0), 0) || 0;

  return (
    <div className="seo-audit-panel">
      {/* === SEARCH CONSOLE === */}
      <div className="admin-panel-card">
        <div className="seo-section-header">
          <h2 className="admin-panel-card-title">
            <i className="fa-solid fa-chart-line" aria-hidden /> Google Search Console
          </h2>
          <div className="seo-section-actions">
            <div className="seo-strategy-toggle">
              {[7, 28, 90].map(d => (
                <button key={d} type="button"
                  className={`seo-strategy-btn ${gscDays === d ? "active" : ""}`}
                  onClick={() => setGscDays(d)}
                >{d}j</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={runGSC} disabled={loadingGSC}>
              {loadingGSC ? <><i className="fa-solid fa-spinner fa-spin" /> Chargement...</> : <><i className="fa-solid fa-chart-simple" /> Charger les donnees</>}
            </button>
          </div>
        </div>

        {errorGSC && <div className="seo-error"><i className="fa-solid fa-triangle-exclamation" /> {errorGSC}</div>}

        {loadingGSC && (
          <div className="seo-loading"><i className="fa-solid fa-spinner fa-spin" /><span>Chargement Search Console...</span></div>
        )}

        {gsc && !loadingGSC && (
          <>
            {/* Totaux */}
            <div className="seo-summary">
              <div className="seo-summary-stat">
                <span className="seo-summary-num seo-summary-num--ok">{gsc.totals.clicks.toLocaleString()}</span>
                <span className="seo-summary-label">Clics</span>
              </div>
              <div className="seo-summary-stat">
                <span className="seo-summary-num">{gsc.totals.impressions.toLocaleString()}</span>
                <span className="seo-summary-label">Impressions</span>
              </div>
              <div className="seo-summary-stat">
                <span className="seo-summary-num">{gsc.totals.ctr}%</span>
                <span className="seo-summary-label">CTR moyen</span>
              </div>
            </div>

            {/* Top requêtes */}
            {gsc.queries?.length > 0 && (
              <>
                <h3 className="seo-subtitle"><i className="fa-solid fa-magnifying-glass" /> Top requetes</h3>
                <div className="admin-panel-table-wrap">
                  <table className="admin-panel-table seo-table">
                    <thead>
                      <tr><th>Requete</th><th>Clics</th><th>Impressions</th><th>CTR</th><th>Position</th></tr>
                    </thead>
                    <tbody>
                      {gsc.queries.slice(0, 15).map((q, i) => (
                        <tr key={i}>
                          <td className="seo-td-page">{q.query}</td>
                          <td><strong>{q.clicks}</strong></td>
                          <td>{q.impressions}</td>
                          <td>{q.ctr}%</td>
                          <td><span className={`seo-vital-badge seo-vital-badge--${q.position <= 10 ? "good" : q.position <= 20 ? "needs" : "poor"}`}>{q.position}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Top pages */}
            {gsc.pages?.length > 0 && (
              <>
                <h3 className="seo-subtitle"><i className="fa-solid fa-file" /> Top pages</h3>
                <div className="admin-panel-table-wrap">
                  <table className="admin-panel-table seo-table">
                    <thead>
                      <tr><th>Page</th><th>Clics</th><th>Impressions</th><th>CTR</th><th>Position</th></tr>
                    </thead>
                    <tbody>
                      {gsc.pages.map((p, i) => (
                        <tr key={i}>
                          <td className="seo-td-page">{p.page || '/'}</td>
                          <td><strong>{p.clicks}</strong></td>
                          <td>{p.impressions}</td>
                          <td>{p.ctr}%</td>
                          <td><span className={`seo-vital-badge seo-vital-badge--${p.position <= 10 ? "good" : p.position <= 20 ? "needs" : "poor"}`}>{p.position}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {gsc.queries?.length === 0 && gsc.pages?.length === 0 && (
              <p className="seo-placeholder">Aucune donnee pour cette periode. Google met quelques jours a collecter les premieres donnees.</p>
            )}
          </>
        )}

        {!gsc && !loadingGSC && !errorGSC && (
          <p className="seo-placeholder">Cliquez sur "Charger les donnees" pour voir les statistiques Google Search Console (clics, impressions, requetes).</p>
        )}
      </div>

      {/* === PAGESPEED === */}
      <div className="admin-panel-card">
        <div className="seo-section-header">
          <h2 className="admin-panel-card-title">
            <i className="fa-solid fa-gauge-high" aria-hidden /> PageSpeed Insights
          </h2>
          <div className="seo-section-actions">
            <div className="seo-strategy-toggle">
              <button type="button" className={`seo-strategy-btn ${strategy === "mobile" ? "active" : ""}`} onClick={() => setStrategy("mobile")}>
                <i className="fa-solid fa-mobile-screen" /> Mobile
              </button>
              <button type="button" className={`seo-strategy-btn ${strategy === "desktop" ? "active" : ""}`} onClick={() => setStrategy("desktop")}>
                <i className="fa-solid fa-desktop" /> Desktop
              </button>
            </div>
            <button className="btn btn-primary" onClick={runPageSpeed} disabled={loadingPS}>
              {loadingPS ? <><i className="fa-solid fa-spinner fa-spin" /> Analyse...</> : <><i className="fa-solid fa-play" /> Lancer l'analyse</>}
            </button>
          </div>
        </div>

        {errorPS && <div className="seo-error"><i className="fa-solid fa-triangle-exclamation" /> {errorPS}</div>}

        {loadingPS && (
          <div className="seo-loading"><i className="fa-solid fa-spinner fa-spin" /><span>Analyse PageSpeed en cours... (~30s)</span></div>
        )}

        {pagespeed && !loadingPS && (
          <>
            <div className="seo-gauges">
              <ScoreGauge label="Performance" score={pagespeed.scores.performance} icon="fa-bolt" />
              <ScoreGauge label="SEO" score={pagespeed.scores.seo} icon="fa-magnifying-glass" />
              <ScoreGauge label="Accessibilite" score={pagespeed.scores.accessibility} icon="fa-universal-access" />
              <ScoreGauge label="Bonnes pratiques" score={pagespeed.scores.bestPractices} icon="fa-shield-halved" />
            </div>
            <h3 className="seo-subtitle"><i className="fa-solid fa-heart-pulse" /> Core Web Vitals</h3>
            <div className="seo-vitals">
              <VitalCard label="LCP" value={pagespeed.webVitals.lcp.value} score={pagespeed.webVitals.lcp.score} />
              <VitalCard label="FCP" value={pagespeed.webVitals.fcp.value} score={pagespeed.webVitals.fcp.score} />
              <VitalCard label="CLS" value={pagespeed.webVitals.cls.value} score={pagespeed.webVitals.cls.score} />
              <VitalCard label="TBT" value={pagespeed.webVitals.fid.value} score={pagespeed.webVitals.fid.score} />
              <VitalCard label="SI" value={pagespeed.webVitals.si.value} score={pagespeed.webVitals.si.score} />
              <VitalCard label="TTFB" value={pagespeed.webVitals.ttfb.value} score={pagespeed.webVitals.ttfb.score} />
            </div>
          </>
        )}

        {!pagespeed && !loadingPS && !errorPS && (
          <p className="seo-placeholder">Cliquez sur "Lancer l'analyse" pour obtenir les scores PageSpeed de votre site.</p>
        )}
      </div>

      {/* === AUDIT INTERNE === */}
      <div className="admin-panel-card">
        <div className="seo-section-header">
          <h2 className="admin-panel-card-title">
            <i className="fa-solid fa-clipboard-check" aria-hidden /> Audit SEO interne
          </h2>
          <button className="btn btn-primary" onClick={runAudit} disabled={loadingAudit}>
            {loadingAudit ? <><i className="fa-solid fa-spinner fa-spin" /> Audit...</> : <><i className="fa-solid fa-search" /> Lancer l'audit</>}
          </button>
        </div>

        {errorAudit && <div className="seo-error"><i className="fa-solid fa-triangle-exclamation" /> {errorAudit}</div>}

        {loadingAudit && (
          <div className="seo-loading"><i className="fa-solid fa-spinner fa-spin" /><span>Audit en cours...</span></div>
        )}

        {audit && !loadingAudit && (
          <>
            {/* Fichiers SEO */}
            <h3 className="seo-subtitle"><i className="fa-solid fa-file-circle-check" /> Fichiers SEO</h3>
            <div className="seo-checks">
              <CheckItem label="robots.txt" ok={audit.checks.robotsTxt} />
              <CheckItem label="sitemap.xml" ok={audit.checks.sitemap} detail={audit.checks.sitemap ? `${audit.checks.sitemapPages} pages` : null} />
              <CheckItem label="manifest.webmanifest" ok={audit.checks.manifest} />
            </div>

            {/* Checks index.html */}
            {audit.indexChecks && (
              <>
                <h3 className="seo-subtitle"><i className="fa-solid fa-code" /> Balises index.html</h3>
                <div className="seo-checks">
                  <CheckItem label="og:url" ok={audit.indexChecks.hasOgUrl} />
                  <CheckItem label="og:image" ok={audit.indexChecks.hasOgImage} />
                  <CheckItem label="Twitter Card" ok={audit.indexChecks.hasTwitterCard} />
                  <CheckItem label="hreflang" ok={audit.indexChecks.hasHreflang} />
                  <CheckItem label="JSON-LD" ok={audit.indexChecks.hasJsonLd} />
                  <CheckItem label="Preload" ok={audit.indexChecks.hasPreload} />
                  <CheckItem label="Apple Touch Icon" ok={audit.indexChecks.hasAppleTouchIcon} />
                </div>
              </>
            )}

            {/* Résumé */}
            <div className="seo-summary">
              <div className="seo-summary-stat">
                <span className="seo-summary-num">{audit.pages.length}</span>
                <span className="seo-summary-label">Pages analysees</span>
              </div>
              <div className="seo-summary-stat">
                <span className={`seo-summary-num ${totalIssues === 0 ? "seo-summary-num--ok" : "seo-summary-num--warn"}`}>{totalIssues}</span>
                <span className="seo-summary-label">Problemes</span>
              </div>
              <div className="seo-summary-stat">
                <span className="seo-summary-num seo-summary-num--ok">{audit.pages.filter(p => p.issues?.length === 0).length}</span>
                <span className="seo-summary-label">Pages OK</span>
              </div>
            </div>

            {/* Tableau des pages */}
            <h3 className="seo-subtitle"><i className="fa-solid fa-table-list" /> Meta par page</h3>
            <div className="admin-panel-table-wrap">
              <table className="admin-panel-table seo-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Title</th>
                    <th>Titre</th>
                    <th>Description</th>
                    <th>Problemes</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.pages.map((p) => (
                    <tr key={p.page} className={p.issues?.length ? "seo-row--issues" : ""}>
                      <td className="seo-td-page">{p.page}</td>
                      <td className="seo-td-title">{p.title ? (p.title.length > 35 ? p.title.slice(0, 35) + "..." : p.title) : <span className="seo-missing">Manquant</span>}</td>
                      <td><span className={p.titleLen <= 60 ? "seo-badge-ok" : "seo-badge-warn"}>{p.titleLen}</span></td>
                      <td><span className={p.descLen >= 120 && p.descLen <= 160 ? "seo-badge-ok" : "seo-badge-warn"}>{p.descLen}</span></td>
                      <td>
                        {p.issues?.length ? (
                          <div className="seo-issues">
                            {p.issues.map((issue, i) => (
                              <span key={i} className="seo-issue-tag">{issue}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="seo-badge-ok"><i className="fa-solid fa-check" /> OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!audit && !loadingAudit && !errorAudit && (
          <p className="seo-placeholder">Cliquez sur "Lancer l'audit" pour analyser les meta tags et la structure SEO de chaque page.</p>
        )}
      </div>
    </div>
  );
}
