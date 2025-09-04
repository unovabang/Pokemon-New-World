import React from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import { LanguageProvider } from "./contexts/LanguageContext";

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = "KbXOZtQjIqsNeZwPzF2T8csuCTQ6LcoE";

createRoot(document.getElementById("root")).render(
        <React.StrictMode>
                <Auth0Provider
                        domain={domain}
                        clientId={clientId}
                        authorizationParams={{
                                redirect_uri: `${window.location.origin}/admin-login`
                        }}
                >
                        <LanguageProvider>
                                <App />
                        </LanguageProvider>
                </Auth0Provider>
        </React.StrictMode>,
);
