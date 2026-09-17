import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  preview: {
    // Railway (y otras plataformas) asignan un dominio propio
    // (*.up.railway.app) y le mandan ese Host al servidor de "vite
    // preview" — sin esto, Vite lo rechaza con "Blocked request. This
    // host is not allowed." porque por defecto solo confía en localhost.
    host: true,
    allowedHosts: true,
  },
})