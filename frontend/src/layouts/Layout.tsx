import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";

export default function Layout() {
  const { isAuthenticated } = useAuthStore();

  // Route guard redirect to login if unauthorized
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#030712] flex">
      {/* Navigation Drawer */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col pl-64 min-h-screen">
        <Navbar />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
