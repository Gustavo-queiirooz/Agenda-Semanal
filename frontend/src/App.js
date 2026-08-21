import React from "react";
import "@/App.css";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import AgendaPage from "@/pages/AgendaPage";
import AdminPage from "@/pages/AdminPage";

function App() {
  return (
    <div className="App">
    <HashRouter>
      <AuthProvider>
         <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </HashRouter>>
    </div>
  );
}

export default App;
