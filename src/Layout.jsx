import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Monitor, Loader2 } from "lucide-react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import { Toaster } from "@/components/ui/sonner";

const LoginPage = () => (
  <div className="flex items-center justify-center h-screen bg-slate-50">
    <div className="text-center p-8 bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200">
      <div className="flex justify-center items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
          <Monitor className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Space4Promotion</h2>
          <p className="text-sm text-slate-500">Screen Manager</p>
        </div>
      </div>
      <h1 className="text-xl font-semibold text-slate-800 mb-2">Welcome Back</h1>
      <p className="text-slate-600 mb-8">Please log in to manage your digital screens</p>
      <Button
        onClick={() => alert("Login system not connected yet")}
        className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-lg py-6 text-base"
      >
        Log In / Sign Up
      </Button>
    </div>
  </div>
);

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
  const checkUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  checkUser();
}, [location.pathname, currentPageName]);
  

  // Render Player page without layout chrome (fullscreen)
  if (currentPageName === 'Player' || location.pathname.includes('/Player')) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex h-screen bg-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={user} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}