import { lazy, Suspense, useState, useEffect } from "react";
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

function MaintenanceGuard({ children }) {
  const { admin, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const [maintenance, setMaintenance] = useState(null);
  const [discord, setDiscord] = useState("#");

  useEffect(() => {
    fetch(`${API_BASE}/config/site?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.config) {
          setMaintenance(data.config.maintenance || null);
          setDiscord(data.config.discord?.invite || "#");
        }
      })
      .catch(() => {});
  }, []);

  // Toujours laisser passer admin et login admin
  const isAdminRoute = pathname.startsWith("/admin");
  if (isAdminRoute) return children;

  // Attendre le chargement auth + config avant de bloquer
  if (authLoading || maintenance === null) return children;

  // Admin connecte : jamais bloquer
  if (admin) return children;

  // Maintenance active : afficher la page maintenance
  if (maintenance?.enabled) {
    return <MaintenancePage config={maintenance} discord={discord} />;
  }

  return children;
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
            <Route path="/la-lune-brillera-ce-soir" element={<SecretPage />} />
            <Route path="/chemin-des-larmes" element={<Navigate to="/la-lune-brillera-ce-soir" replace />} />
            <Route path="/admin-login" element={<LoginAdmin />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />
            {/* Route catch-all pour les pages inexistantes */}
            <Route path="*" element={<Page404 />} />
          </Routes>
        </Suspense>
      </MaintenanceGuard>
    </Router>
  );
}
