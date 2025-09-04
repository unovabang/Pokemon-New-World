import { useAuth0 } from "@auth0/auth0-react";

const LoginButton = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) {
    return null;
  }

  return (
    <button 
      className="btn btn-primary" 
      onClick={() => loginWithRedirect()}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}
    >
      <i className="fa-solid fa-user"></i> Admin
    </button>
  );
};

export default LoginButton;