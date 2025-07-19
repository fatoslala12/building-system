import React from "react";
import ReactDOM from "react-dom/client";
import AppSimple from "./AppSimple";
import "./index.css";

console.log('[DEBUG] mainSimple.jsx loaded');

try {
  const root = document.getElementById("root");
  console.log('[DEBUG] Root element found:', !!root);
  
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <AppSimple />
      </React.StrictMode>
    );
    console.log('[DEBUG] Simple React app rendered successfully');
  } else {
    console.error('[DEBUG] Root element not found!');
  }
} catch (error) {
  console.error('[DEBUG] Error rendering simple React app:', error);
}