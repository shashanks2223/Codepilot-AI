import React from "react";
import { useAuthStore } from "../store/authStore";
import { LogOut, User as UserIcon, Github, Sparkles } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 border-b border-slate-800 bg-[#070b19]/80 backdrop-blur-md flex items-center justify-between px-8 text-slate-300 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
        <span className="text-xs text-slate-400 font-medium bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
          Google Gemini 1.5 Flash Active
        </span>
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-white leading-none">{user.username}</p>
                <p className="text-[10px] text-slate-500">{user.email || "No email synchronized"}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Github className="w-4 h-4" />
            <span>Not Connected</span>
          </div>
        )}
      </div>
    </header>
  );
}
