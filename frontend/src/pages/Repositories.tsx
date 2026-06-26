import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  Plus, 
  Trash2, 
  Shield, 
  ShieldOff, 
  ExternalLink, 
  GitBranch, 
  Search,
  CheckCircle,
  RefreshCw,
  GitPullRequest
} from "lucide-react";
import { api } from "../services/api";

interface Repository {
  id: number;
  github_id: number;
  name: string;
  full_name: string;
  clone_url: string;
  is_active: boolean;
  created_at: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export default function Repositories() {
  const [connectedRepos, setConnectedRepos] = useState<Repository[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingConnected, setLoadingConnected] = useState(true);
  const [loadingGitHub, setLoadingGitHub] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoadingConnected(true);
    try {
      const connected = await api.get("/repositories");
      setConnectedRepos(connected);
    } catch (err) {
      console.error("Failed to load connected repositories:", err);
    } finally {
      setLoadingConnected(false);
    }

    setLoadingGitHub(true);
    try {
      const gitRepos = await api.get("/repositories/github");
      setGithubRepos(gitRepos);
    } catch (err) {
      console.error("Failed to load GitHub repositories:", err);
    } finally {
      setLoadingGitHub(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnect = async (repo: GitHubRepo) => {
    setConnectingId(repo.id);
    try {
      await api.post("/repositories/connect", {
        github_id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        clone_url: repo.clone_url
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to connect repository:", err);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (repoId: number) => {
    setDisconnectingId(repoId);
    try {
      await api.delete(`/repositories/${repoId}`);
      await fetchData();
    } catch (err) {
      console.error("Failed to disconnect repository:", err);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleToggleActive = async (repo: Repository) => {
    try {
      if (repo.is_active) {
        await api.post(`/repositories/${repo.id}/disable`);
      } else {
        await api.post("/repositories/connect", {
          github_id: repo.github_id,
          name: repo.name,
          full_name: repo.full_name,
          clone_url: repo.clone_url
        });
      }
      await fetchData();
    } catch (err) {
      console.error("Failed to toggle repository active state:", err);
    }
  };

  const filteredGitHubRepos = githubRepos.filter((repo) => {
    const isAlreadyConnected = connectedRepos.some((c) => c.github_id === repo.id);
    const matchesSearch = repo.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadyConnected && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-outfit">Connected Repositories</h2>
          <p className="text-slate-400 text-sm">Manage connected repositories and configure automated code reviews.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg hover:text-white transition-all text-xs font-semibold select-none"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Repos</span>
        </button>
      </div>

      {/* Connected Repositories Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-500" />
          <span>Active Connections ({connectedRepos.length})</span>
        </h3>

        {loadingConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        ) : connectedRepos.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-500 rounded-xl border-slate-800/80 text-sm">
            No repositories connected. Connect a repository below to enable automated reviews.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {connectedRepos.map((repo) => (
              <div key={repo.id} className="glass-panel p-6 rounded-xl border-slate-800 flex flex-col justify-between hover:border-slate-700/60 transition-all group">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-white font-outfit">{repo.name}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{repo.full_name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(repo)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold transition-all select-none ${
                          repo.is_active 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" 
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        }`}
                        title={repo.is_active ? "Reviews Active (Click to Pause)" : "Reviews Paused (Click to Resume)"}
                      >
                        {repo.is_active ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDisconnect(repo.id)}
                        disabled={disconnectingId === repo.id}
                        className="p-1.5 bg-slate-900/60 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-500/20 transition-all select-none disabled:opacity-50"
                        title="Disconnect Repo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 select-none">
                    <div className="flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>default branch: main</span>
                    </div>
                    <span>•</span>
                    <span>Connected {new Date(repo.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between select-none">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    REVIEWS: {repo.is_active ? "ENABLED" : "PAUSED"}
                  </span>
                  
                  <a 
                    href={`https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
                  >
                    <span>Open GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GitHub Repositories Sync Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            <span>Connect Repositories from GitHub</span>
          </h3>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search GitHub repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070b19] border border-slate-800 focus:border-blue-500/50 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-sans"
            />
          </div>
        </div>

        {loadingGitHub ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        ) : filteredGitHubRepos.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-500 rounded-xl border-slate-800/80 text-sm font-sans">
            No additional repositories found matching search query.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/10">
            {filteredGitHubRepos.map((repo) => (
              <div key={repo.id} className="p-4 flex items-center justify-between hover:bg-slate-900/20 transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-6 h-6 rounded-md border border-slate-700 object-cover"
                  />
                  <div>
                    <h5 className="text-sm font-bold text-slate-200 font-outfit">{repo.name}</h5>
                    <p className="text-[10px] text-slate-500 font-mono">{repo.full_name}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleConnect(repo)}
                  disabled={connectingId === repo.id}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] select-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{connectingId === repo.id ? "Connecting..." : "Connect"}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
