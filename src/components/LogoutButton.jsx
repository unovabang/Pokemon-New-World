import { useAuth0 } from "@auth0/auth0-react";

const LogoutButton = () => {
  const { logout, isAuthenticated } = useAuth0();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button 
      className="btn btn-ghost" 
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
    >
      <i className="fa-solid fa-sign-out-alt"></i> Déconnexion
    </button>
  );
};

export default LogoutButton;