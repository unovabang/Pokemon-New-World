import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Bind to all interfaces
    allowedHosts: [
      "8d5f5349-152f-4f1e-9c31-45cb5ac38433-00-1s870j288ij76.picard.replit.dev",
    ],
  },
});
