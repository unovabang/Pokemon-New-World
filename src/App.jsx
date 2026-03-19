import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import content from "./config/index.js";
import HeroVideo from "./components/HeroVideo";
import Carousel from "./components/Carousel";
import Modal from "./components/Modal";
import YouTubeAudio from "./components/YouTubeAudio";
import NewsBanner from "./components/NewsBanner";
import LanguageSelector from "./components/LanguageSelector";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./pages/AdminPanel";
import HomePage from "./pages/HomePage";
import PatchNotesPage from "./pages/PatchNotesPage";
import PokedexPage from "./pages/PokedexPage";
import ExtradexPage from "./pages/ExtradexPage";
import GuidePage from "./pages/GuidePage";
import LorePage from "./pages/LorePage";
import LoreStoryPage from "./pages/LoreStoryPage";
import BSTPage from "./pages/BSTPage";
import NerfsAndBuffsPage from "./pages/NerfsAndBuffsPage";
import ItemLocationPage from "./pages/ItemLocationPage";
import EVsLocationPage from "./pages/EVsLocationPage";
import TeamPage from "./pages/TeamPage";
import UnderConstructionPage from "./pages/UnderConstructionPage";
import LoginAdmin from "./pages/LoginAdmin";
import ContactPage from "./pages/ContactPage";
import DownloadPage from "./pages/DownloadPage";
import Page404 from "./pages/Page404";
import SecretPage from "./pages/SecretPage";
import { useLanguage } from "./contexts/LanguageContext";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/patchnotes" element={<PatchNotesPage />} />
        <Route path="/pokedex" element={<PokedexPage />} />
        <Route path="/extradex" element={<ExtradexPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/lore" element={<LorePage />} />
        <Route path="/lore/:slug" element={<LoreStoryPage />} />
        <Route path="/bst" element={<BSTPage />} />
        <Route path="/item-location" element={<ItemLocationPage />} />
        <Route path="/equipe" element={<TeamPage />} />
        <Route path="/evs-location" element={<EVsLocationPage />} />
        <Route path="/nerfs-and-buffs" element={<NerfsAndBuffsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/telechargement" element={<DownloadPage />} />
        <Route path="/la-lune-brille-ce-soir" element={<SecretPage />} />
        <Route path="/chemin-des-larmes" element={<Navigate to="/la-lune-brille-ce-soir" replace />} />
        <Route path="/admin-login" element={<LoginAdmin />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />
        {/* Route catch-all pour les pages inexistantes */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </Router>
  );
}