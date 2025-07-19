import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import AppRouter from "./routes/AppRouter";
import "./App.css";
import { Toaster } from 'react-hot-toast';

function AppSimple() {
  console.log('[DEBUG] AppSimple component loaded');
  
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export default AppSimple;