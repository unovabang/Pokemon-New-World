import { useNavigate } from "react-router-dom";

const CONSTRUCTION_BG = "https://media.discordapp.net/attachments/1480351076065480836/1480357413986242672/snorlax-sleeping-pokemon-minimalist-4k-wallpaper-uhdpaper.com-2615d.png?ex=69af61c7&is=69ae1047&hm=9a5732227af46ca51926bc4da60ad9b6765094843cf220d92db178572fc934ef&=&format=webp&quality=lossless&width=1522&height=856";

const UnderConstructionPage = ({ title = "En construction", backLabel = "Retour à l'accueil", onBack, embedded = false }) => {
  const navigate = useNavigate();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const handleBack = onBack ?? (() => navigate("/"));

  return (
    <div
      style={{
        position: embedded ? "relative" : undefined,
        minHeight: embedded ? "min(80vh, 600px)" : "100vh",
        backgroundImage: `url(${CONSTRUCTION_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: embedded ? "scroll" : "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        borderRadius: embedded ? "12px" : undefined,
        overflow: "hidden",
      }}
    >
      {/* Overlay sombre pour lisibilité (ambiance Snorlax / bleu nuit) */}
      <div
        style={{
          position: embedded ? "absolute" : "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: embedded ? "100%" : undefined,
          height: embedded ? "100%" : undefined,
          background: "linear-gradient(135deg, rgba(30, 58, 95, 0.72) 0%, rgba(15, 30, 55, 0.85) 50%, rgba(0, 0, 0, 0.82) 100%)",
          backdropFilter: "blur(2px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          maxWidth: "560px",
          background: "linear-gradient(160deg, rgba(88, 28, 135, 0.4) 0%, rgba(30, 0, 50, 0.6) 100%)",
          borderRadius: "24px",
          padding: isMobile ? "2rem" : "3rem",
          border: "1px solid rgba(200, 160, 255, 0.25)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 60px rgba(126, 34, 206, 0.15)",
        }}
      >
        {/* Icône / emoji */}
        <div
          style={{
            fontSize: isMobile ? "3.5rem" : "4.5rem",
            marginBottom: "1rem",
            lineHeight: "1",
            filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))",
          }}
        >
          🚧
        </div>

        <h1
          style={{
            fontSize: isMobile ? "1.75rem" : "2.25rem",
            fontWeight: "700",
            color: "white",
            marginBottom: "0.5rem",
            lineHeight: "1.2",
            textShadow: "0 2px 20px rgba(0,0,0,0.4)",
          }}
        >
          {title}
        </h1>

        <p
          style={{
            fontSize: isMobile ? "1.05rem" : "1.2rem",
            color: "rgba(255,255,255,0.85)",
            marginBottom: "2rem",
            lineHeight: "1.6",
            fontWeight: "500",
          }}
        >
          En construction
        </p>

        <p
          style={{
            fontSize: isMobile ? "0.9rem" : "1rem",
            color: "rgba(255,255,255,0.65)",
            marginBottom: "2rem",
            lineHeight: "1.5",
          }}
        >
          Cette section arrive bientôt. Revenez plus tard !
        </p>

        <button
          onClick={handleBack}
          style={{
            padding: isMobile ? "0.8rem 2rem" : "1rem 2.5rem",
            background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50px",
            color: "white",
            fontSize: isMobile ? "1rem" : "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 10px 25px rgba(124, 58, 237, 0.35)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            textTransform: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 14px 32px rgba(124, 58, 237, 0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(124, 58, 237, 0.35)";
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🏠</span>
          {backLabel}
        </button>
      </div>
    </div>
  );
};

export default UnderConstructionPage;
