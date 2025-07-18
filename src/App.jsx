import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./components/ui/Toast";
import AppRouter from "./routes/AppRouter";
import "./App.css";
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppRouter />
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </>
  );
}

export default App;