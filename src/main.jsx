import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter } from "react-router-dom"; // vetem njehere!

import "./index.css";

console.log('[DEBUG] main.jsx loaded');
console.log('[DEBUG] React version:', React.version);
console.log('[DEBUG] ReactDOM version:', ReactDOM.version);

try {
  const root = document.getElementById("root");
  console.log('[DEBUG] Root element found:', !!root);
  
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
    console.log('[DEBUG] React app rendered successfully');
  } else {
    console.error('[DEBUG] Root element not found!');
  }
} catch (error) {
  console.error('[DEBUG] Error rendering React app:', error);
}
