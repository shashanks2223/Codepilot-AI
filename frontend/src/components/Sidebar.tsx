import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  GitPullRequest, 
  Settings, 
  History, 
  Terminal, 
  Award,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const path = location.pathname;

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Connected Repos", path: "/repositories", icon: Terminal },
    { name: "Review History", path: "/history", icon: History },
    { name: "Repository Insights", path: "/insights", icon: Award },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070b19] flex flex-col h-screen fixed left-0 top-0 text-slate-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg font-outfit tracking-wide leading-none">CodePilot AI</h1>
          <span className="text-[10px] text-blue-500 font-medium tracking-widest uppercase">PR Auditor</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = path === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all group ${
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                  : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span>{item.name}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all ${isActive ? "text-blue-400 opacity-100" : "text-slate-600"}`} />
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/20">
        <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Engine Status: Online</span>
        </div>
      </div>
    </aside>
  );
}
