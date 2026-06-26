import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Github, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, skip straight to app shell dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Check URL params for GitHub callback code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code) {
      exchangeOAuthCode(code);
    }
  }, []);

  const exchangeOAuthCode = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        throw new Error("Authentication handshake failed");
      }
      
      const data = await response.json();
      
      // Fetch user profile info
      const meResponse = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${data.access_token}`,
        }
      });
      
      if (!meResponse.ok) {
        throw new Error("Failed to fetch user metadata");
      }
      
      const meData = await meResponse.json();
      login(data.access_token, data.refresh_token, meData);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in via GitHub OAuth");
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    // Generate GitHub redirect authorization URL dynamically
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "PLACEHOLDER_GITHUB_CLIENT_ID"; 
    const redirectUri = encodeURIComponent(window.location.origin + "/login");
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;
    window.location.href = githubUrl;
  };

  const handleMockLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await exchangeOAuthCode("mock_development_code");
    } catch (err: any) {
      setError(err.message || "Mock login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      {/* Main Login Frame */}
      <div className="w-full max-w-md space-y-8 relative z-10">
        
        {/* Branding Logo */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/10 border border-blue-400/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight font-outfit">CodePilot AI</h1>
            <p className="text-sm text-slate-400 font-sans max-w-sm mx-auto">
              Automated Pull Request Code Review platform powered by Google Gemini.
            </p>
          </div>
        </div>

        {/* Action card */}
        <div className="glass-panel p-8 rounded-2xl border-slate-800 space-y-6 shadow-2xl relative">
          
          <div className="absolute -top-3 right-4 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold py-1 px-2.5 rounded-full select-none">
            <Sparkles className="w-3 h-3 text-yellow-400 animate-spin" />
            <span>GEMINI 1.5 FLASH ACTIVE</span>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-white font-outfit">Connect Your Account</h3>
            <p className="text-xs text-slate-400 font-sans">
              Connect your GitHub account to sync repositories and audit Pull Requests automatically.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Primary GitHub Login button */}
            <button
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-slate-100 hover:bg-white text-slate-950 font-semibold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Github className="w-5 h-5 text-slate-950" />
              <span>{loading ? "Connecting..." : "Continue with GitHub"}</span>
            </button>

            {/* Developer sandbox bypass button */}
            <button
              onClick={handleMockLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-900 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Developer Sandbox (Mock login)</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-500 text-center font-sans">
            By connecting, you authorize CodePilot AI to read repository code metadata to run reviews.
          </div>
        </div>

      </div>
    </div>
  );
}
