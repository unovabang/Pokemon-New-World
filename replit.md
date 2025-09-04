# Pokémon New World - Official Website

## Overview

This is the official website for the Pokémon New World fangame, built as a modern React single-page application. The site showcases the fan-made Pokémon game set in the Bélamie region, featuring new Pokémon types (Aspic & Malice), innovative mechanics, and an engaging storyline. The website serves as the primary hub for game information, downloads, news updates, and community engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### 2025-09-04: Panneau d'Administration Sécurisé
- **Ajout d'un système d'authentification complet** avec Auth0 pour sécuriser l'accès administrateur
- **Implémentation d'un panneau d'administration** accessible via `/admin` avec triple authentification :
  1. Connexion Auth0 (OAuth)
  2. Vérification email/mot de passe administrateur (`admin@pokemonnewworld.com` / `AdminPNW2024!`)
  3. Code d'accès à 4 chiffres (`1234`)
- **Interface d'édition JSON** permettant de modifier tous les fichiers de configuration directement depuis l'interface web
- **Gestion multi-onglets** pour éditer séparément : actualités, téléchargements, notes de patch, configuration site, sections, Patreon, footer, et liens externes
- **Protection des routes** avec composants sécurisés pour empêcher l'accès non autorisé
- **Routing** ajouté avec React Router DOM pour la navigation entre page principale et administration
- **Bouton d'accès admin** visible en haut à droite de la page d'accueil pour les utilisateurs non connectés

## System Architecture

### Frontend Architecture
- **React 18** with modern hooks and functional components for component-based UI development
- **Vite** as the build tool and development server for fast development experience and optimized production builds
- **React Router DOM** for client-side routing and navigation (though currently appears to be a single-page layout)
- **CSS Custom Properties** for consistent theming with a dark gaming aesthetic featuring blue/cyan accent colors
- **Component-based structure** with reusable UI elements (HeroVideo, Carousel, Modal, NewsBanner, YouTubeAudio)

### Content Management System
- **JSON-based configuration** system for easy content updates without code changes
- Centralized configuration files for different aspects:
  - `site.json` - Global site settings, SEO metadata, and visual configuration
  - `sections.json` - Content sections and their structure
  - `news.json` - News banners and announcements with auto-loading image capability
  - `downloads.json` - Game download links and patch information
  - `patchnotes.json` - Detailed patch notes with versioning system
  - `footer.json` - Footer content and social media links
  - `external.json` - Third-party service integrations
  - `patreon.json` - Crowdfunding campaign configuration

### Visual Design System
- **Glass morphism UI** with backdrop blur effects and translucent cards
- **Custom CSS theming** using CSS variables for consistent color palette
- **Responsive design** with container-based layout system
- **Font Awesome icons** for consistent iconography
- **Google Fonts (Outfit)** for modern typography
- **Fixed navigation bar** with animated logo and hover effects

### Media Integration
- **YouTube video embedding** for trailers and promotional content
- **YouTube audio player** for background music with autoplay capabilities
- **Image carousel system** for showcasing game screenshots
- **Automatic image loading** from designated folders for news content

### Internationalization Support
- **Multi-language configuration** with French as the primary language
- Translation system ready for expansion with `translations.json`
- SEO optimization for different languages

## External Dependencies

### Core Technologies
- **React & React DOM** - Frontend framework and rendering
- **React Router DOM** - Client-side routing
- **Vite** - Build tool and development server

### External Services
- **YouTube** - Video hosting and embedding for trailers and background audio
- **Discord** - Community platform integration with invite links
- **TikTok** - Social media presence and content sharing
- **Patreon** - Crowdfunding platform for project support

### CDN Resources
- **Font Awesome** - Icon library loaded from CDN
- **Google Fonts** - Typography (Outfit font family)
- **Image hosting** - External image hosting service (ibb.co) for background assets

### Development Tools
- **TypeScript configuration** - Type checking and modern JavaScript features
- **Semgrep** - Static analysis tool for security scanning
- **ESNext compilation** - Modern JavaScript feature support

The architecture prioritizes maintainability through JSON-based configuration, allowing content updates without developer intervention, while providing a rich multimedia experience optimized for gaming community engagement.