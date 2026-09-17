import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);

// El service worker (PWA) solo se registra en producción: en desarrollo
// (npm run dev) interferiría con el recargado en caliente de Vite, ya que
// interceptaría las mismas peticiones que Vite necesita para actualizar
// los módulos al vuelo.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("⚠️ No se pudo registrar el service worker:", error);
    });
  });
}