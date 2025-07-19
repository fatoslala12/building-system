import React from "react";
import ReactDOM from "react-dom/client";
import AppMinimal from "./AppMinimal";
import "./index.css";

console.log('[DEBUG] mainMinimal.jsx loaded');

try {
  const root = document.getElementById("root");
  console.log('[DEBUG] Root element found:', !!root);
  
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <AppMinimal />
      </React.StrictMode>
    );
    console.log('[DEBUG] Minimal React app rendered successfully');
  } else {
    console.error('[DEBUG] Root element not found!');
  }
} catch (error) {
  console.error('[DEBUG] Error rendering minimal React app:', error);
}