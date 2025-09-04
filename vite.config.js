import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Bind to all interfaces
    port: 5000,
    strictPort: true, // Force use of port 5000
    allowedHosts: true, // Allow all hosts for Replit proxy
  },
  define: {
    'import.meta.env.VITE_AUTH0_DOMAIN': JSON.stringify(process.env.AUTH0_DOMAIN)
  }
});
