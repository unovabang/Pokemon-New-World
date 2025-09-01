import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Bind to all interfaces
    allowedHosts: [
      "a91a3d78-96f9-48f7-9a47-6a49c0b5ab55-00-1j6p6bhipkvaw.janeway.replit.dev",
    ],
  },
});
