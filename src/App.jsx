import { lazy, Suspense, useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import RouteSeo from "./components/RouteSeo";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import MaintenancePage from "./pages/MaintenancePage";
import SiteChatWidget from "./components/SiteChatWidget";

// Lazy-loaded pages (code splitting)
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PatchNotesPage = lazy(() => import("./pages/PatchNotesPage"));
const PokedexPage = lazy(() => import("./pages/PokedexPage"));
const ExtradexPage = lazy(() => import("./pages/ExtradexPage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const BossPage = lazy(() => import("./pages/BossPage"));
const LorePage = lazy(() => import("./pages/LorePage"));
const LoreStoryPage = lazy(() => import("./pages/LoreStoryPage"));
const BSTPage = lazy(() => import("./pages/BSTPage"));
const NerfsAndBuffsPage = lazy(() => import("./pages/NerfsAndBuffsPage"));
const ItemLocationPage = lazy(() => import("./pages/ItemLocationPage"));
const EVsLocationPage = lazy(() => import("./pages/EVsLocationPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const LoginAdmin = lazy(() => import("./pages/LoginAdmin"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const Page404 = lazy(() => import("./pages/Page404"));
const SecretPage = lazy(() => import("./pages/SecretPage"));

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

// Context pour les easter eggs (accessible partout)
const EasterEggsContext = createContext({ runicEnigma: true, secretPage: true, gighaston: true });
export function useEasterEggs() { return useContext(EasterEggsContext); }

function MaintenanceGuard({ children }) {
  const { admin, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const [maintenance, setMaintenance] = useState(null);
  const [discord, setDiscord] = useState("#");
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [easterEggs, setEasterEggs] = useState({ runicEnigma: true, secretPage: true, gighaston: true });

  useEffect(() => {
    const safeFetch = (url) => fetch(url).then((r) => r.json()).catch(() => null);
    Promise.all([
      safeFetch(`${API_BASE}/config/site?t=${Date.now()}`),
      safeFetch(`${API_BASE}/config/external?t=${Date.now()}`),
    ]).then(([siteData, externalData]) => {
      if (siteData?.success && siteData?.config) {
        setMaintenance(siteData.config.maintenance || null);
        setDiscord(siteData.config.discord?.invite || "#");
        if (siteData.config.branding?.logo) setLogoUrl(siteData.config.branding.logo);
        if (siteData.config.easterEggs) setEasterEggs(siteData.config.easterEggs);
      }
      if (externalData?.success && externalData?.config) {
        const ext = externalData.config;
        const d = typeof ext.discord === "string" ? ext.discord : ext.discord?.invite;
        if (d && d !== "#") setDiscord(d);
      }
    });
  }, []);

  const isAdminRoute = pathname.startsWith("/admin");
  if (isAdminRoute) return <EasterEggsContext.Provider value={easterEggs}>{children}</EasterEggsContext.Provider>;

  if (authLoading || maintenance === null) return <EasterEggsContext.Provider value={easterEggs}>{children}</EasterEggsContext.Provider>;

  if (admin) return <EasterEggsContext.Provider value={easterEggs}>{children}</EasterEggsContext.Provider>;

  if (maintenance?.enabled) {
    return <MaintenancePage config={maintenance} discord={discord} logoUrl={logoUrl} />;
  }

  return <EasterEggsContext.Provider value={easterEggs}>{children}</EasterEggsContext.Provider>;
}

function SecretRoute() {
  const ee = useEasterEggs();
  if (ee.secretPage === false) return <Navigate to="/" replace />;
  return <SecretPage />;
}

export default function App() {
  return (
    <Router>
      <RouteSeo />
      <SiteChatWidget />
      <MaintenanceGuard>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/patchnotes" element={<PatchNotesPage />} />
            <Route path="/pokedex" element={<PokedexPage />} />
            <Route path="/extradex" element={<ExtradexPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/boss" element={<BossPage />} />
            <Route path="/lore" element={<LorePage />} />
            <Route path="/lore/:slug" element={<LoreStoryPage />} />
            <Route path="/bst" element={<BSTPage />} />
            <Route path="/item-location" element={<ItemLocationPage />} />
            <Route path="/equipe" element={<TeamPage />} />
            <Route path="/evs-location" element={<EVsLocationPage />} />
            <Route path="/nerfs-and-buffs" element={<NerfsAndBuffsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/telechargement" element={<DownloadPage />} />
            <Route path="/la-lune-brillera-ce-soir" element={<SecretRoute />} />
            <Route path="/chemin-des-larmes" element={<Navigate to="/la-lune-brillera-ce-soir" replace />} />
            <Route path="/admin-login" element={<LoginAdmin />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Page404 />} />
          </Routes>
        </Suspense>
      </MaintenanceGuard>
    </Router>
  );
}
