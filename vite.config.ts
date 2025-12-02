// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // In dev, talk to localhost:5000
  // In production, ALWAYS use VITE_API_BASE_URL
  const apiBase =
    mode === "development"
      ? "http://localhost:5000"
      : env.VITE_API_BASE_URL || "https://your-backend-url.example.com";

  return {
    plugins: [react()],

    server: {
      proxy: {
        "/api": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
    },

    // For Vercel/Vite SPA, base should be "/"
    base: "/",
  };
});
